const ExcelJS = require('exceljs');
const Joi = require('joi');
const { Readable } = require('stream');
const Course = require('../models/Course');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');

const courseImportRowSchema = Joi.object({
  name: Joi.string().trim().min(2).required().messages({
    'string.min': 'Course name must be at least 2 characters long.',
    'any.required': 'Course name is required.',
  }),
  code: Joi.string().trim().min(2).required().messages({
    'string.min': 'Course code must be at least 2 characters long.',
    'any.required': 'Course code is required.',
  }),
  departmentCode: Joi.string().trim().min(2).required().messages({
    'string.min': 'Department code must be at least 2 characters long.',
    'any.required': 'Department code is required.',
  }),
  semester: Joi.number().min(1).required().messages({
    'number.min': 'Semester must be at least 1.',
    'any.required': 'Semester is required.',
  }),
  type: Joi.string().trim().valid('theory', 'practical').required().messages({
    'any.required': 'Course type is required.',
    'any.only': 'Course type must be either theory or practical.',
  }),
  weeklyHours: Joi.number().min(1).required().messages({
    'number.min': 'Weekly hours must be at least 1.',
    'any.required': 'Weekly hours is required.',
  }),
  academicYearLabel: Joi.string().trim().min(2).required().messages({
    'string.min': 'Academic year must be at least 2 characters long.',
    'any.required': 'Academic year is required.',
  }),
});

const COLUMN_ALIASES = {
  name: ['name', 'course name', 'subject name'],
  code: ['code', 'course code', 'subject code'],
  departmentCode: ['department', 'dept', 'department code', 'dept code'],
  semester: ['semester', 'sem'],
  type: ['type', 'course type', 'subject type'],
  weeklyHours: ['weeklyhours', 'weekly hours', 'hours per week', 'hours/week'],
  academicYearLabel: ['academicyear', 'academic year', 'year'],
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase();
}

function mapHeaders(headerRow) {
  const headerCells = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headerCells[colNumber] = normalizeHeader(cell.value);
  });

  const columnMap = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const colIndex = headerCells.findIndex((h) => aliases.includes(h));
    if (colIndex !== -1) columnMap[field] = colIndex;
  }
  return columnMap;
}

function cellText(row, colIndex) {
  if (colIndex === undefined || colIndex === -1) return '';
  const val = row.getCell(colIndex).value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val.text) return String(val.text).trim();
  return String(val).trim();
}

function parseNumber(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

async function loadWorksheet(file) {
  const workbook = new ExcelJS.Workbook();
  const isCsv = file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');

  if (isCsv) {
    const stream = Readable.from(file.buffer);
    await workbook.csv.read(stream);
    return workbook.worksheets[0];
  }

  await workbook.xlsx.load(file.buffer);
  return workbook.worksheets[0];
}

const MAX_ROWS = 2000;

async function importCourses(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Attach an .xlsx, .xls or .csv file as "file".' });
  }

  let worksheet;
  try {
    worksheet = await loadWorksheet(req.file);
  } catch (err) {
    return res.status(400).json({ message: `Could not read file: ${err.message}` });
  }

  if (!worksheet || worksheet.rowCount < 2) {
    return res.status(400).json({ message: 'File has no data rows below the header.' });
  }

  if (worksheet.rowCount - 1 > MAX_ROWS) {
    return res.status(400).json({ message: `Too many rows. Max ${MAX_ROWS} courses per import - split into batches.` });
  }

  const columnMap = mapHeaders(worksheet.getRow(1));
  const requiredFields = ['name', 'code', 'departmentCode', 'semester', 'type', 'weeklyHours', 'academicYearLabel'];
  const missingColumns = requiredFields.filter((f) => columnMap[f] === undefined);
  if (missingColumns.length > 0) {
    return res.status(400).json({
      message: `Missing required column(s): ${missingColumns.join(', ')}. Download the template for the exact format.`,
    });
  }

  const deptCache = new Map();
  const yearCache = new Map();
  const results = { created: 0, failed: 0, rows: [] };

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowIsEmpty = row.values.length === 0 || row.values.every((v) => v === null || v === undefined || v === '');
    if (rowIsEmpty) continue;

    const name = cellText(row, columnMap.name);
    const code = cellText(row, columnMap.code).toUpperCase();
    const departmentCode = cellText(row, columnMap.departmentCode).toUpperCase();
    const semester = parseNumber(cellText(row, columnMap.semester));
    const type = (cellText(row, columnMap.type) || '').toLowerCase();
    const weeklyHours = parseNumber(cellText(row, columnMap.weeklyHours));
    const academicYearLabel = cellText(row, columnMap.academicYearLabel);

    const rowResult = { row: rowNum, code, name, status: 'failed', message: '' };

    try {
      const rowData = {
        name,
        code,
        departmentCode,
        semester,
        type,
        weeklyHours,
        academicYearLabel,
      };

      const { error } = courseImportRowSchema.validate(rowData, { abortEarly: false });
      if (error) {
        throw new Error(error.details.map((d) => d.message).join(', '));
      }

      let department = deptCache.get(departmentCode);
      if (department === undefined) {
        department = await Department.findOne({ code: departmentCode });
        deptCache.set(departmentCode, department || null);
      }
      if (!department) throw new Error(`Unknown department code "${departmentCode}"`);

      let academicYear = yearCache.get(academicYearLabel);
      if (academicYear === undefined) {
        academicYear = await AcademicYear.findOne({ label: academicYearLabel });
        yearCache.set(academicYearLabel, academicYear || null);
      }
      if (!academicYear) throw new Error(`Unknown academic year "${academicYearLabel}"`);

      const course = await Course.create({
        name,
        code,
        department: department._id,
        semester,
        type,
        weeklyHours,
        academicYear: academicYear._id,
      });

      rowResult.status = 'created';
      rowResult.message = `Created course ${course.code}`;
      results.created += 1;
    } catch (err) {
      rowResult.message = err.code === 11000 ? 'Duplicate course code for this academic year' : err.message;
      results.failed += 1;
    }

    results.rows.push(rowResult);
  }

  res.status(207).json(results);
}

async function downloadTemplate(req, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Courses');

  sheet.columns = [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Code', key: 'code', width: 14 },
    { header: 'Department', key: 'departmentCode', width: 16 },
    { header: 'Semester', key: 'semester', width: 10 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'WeeklyHours', key: 'weeklyHours', width: 12 },
    { header: 'AcademicYear', key: 'academicYearLabel', width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRow({
    name: 'Data Structures',
    code: 'CS201',
    departmentCode: 'CS',
    semester: 3,
    type: 'theory',
    weeklyHours: 4,
    academicYearLabel: '2026-2027',
  });

  sheet.addRow({});
  sheet.getCell(`A${sheet.rowCount + 1}`).value =
    'Notes: Type should be theory or practical. Department must match an existing department code and AcademicYear must match an existing academic year label.';
  sheet.mergeCells(`A${sheet.rowCount}:G${sheet.rowCount}`);
  sheet.getCell(`A${sheet.rowCount}`).font = { italic: true, size: 9, color: { argb: 'FF888888' } };
  sheet.getCell(`A${sheet.rowCount}`).alignment = { wrapText: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=course_import_template.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { importCourses, downloadTemplate };
