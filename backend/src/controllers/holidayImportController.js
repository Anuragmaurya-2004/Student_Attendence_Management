const ExcelJS = require('exceljs');
const Joi = require('joi');
const { Readable } = require('stream');
const Holiday = require('../models/Holiday');
const AcademicYear = require('../models/AcademicYear');

const holidayImportRowSchema = Joi.object({
  date: Joi.string().trim().required().messages({
    'string.empty': 'Date is required.',
    'any.required': 'Date is required.',
  }),
  name: Joi.string().trim().min(2).required().messages({
    'string.min': 'Holiday name must be at least 2 characters long.',
    'any.required': 'Holiday name is required.',
  }),
  semester: Joi.number().min(1).allow('').optional().messages({
    'number.min': 'Semester must be at least 1.',
  }),
});

const COLUMN_ALIASES = {
  date: ['date', 'holiday date'],
  name: ['name', 'holiday name', 'reason'],
  semester: ['semester', 'sem'],
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

function parseDateValue(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

const MAX_ROWS = 2000;

async function importHolidays(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Attach an .xlsx, .xls or .csv file as "file".' });
  }

  const academicYearId = req.body.academicYear;
  const semester = req.body.semester && Number(req.body.semester) > 0 ? Number(req.body.semester) : null;
  if (!academicYearId) {
    return res.status(400).json({ message: 'Academic year is required for holiday import.' });
  }

  const academicYear = await AcademicYear.findById(academicYearId);
  if (!academicYear) {
    return res.status(400).json({ message: 'Selected academic year was not found.' });
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
    return res.status(400).json({ message: `Too many rows. Max ${MAX_ROWS} holidays per import - split into batches.` });
  }

  const columnMap = mapHeaders(worksheet.getRow(1));
  const requiredFields = ['date', 'name'];
  const missingColumns = requiredFields.filter((f) => columnMap[f] === undefined);
  if (missingColumns.length > 0) {
    return res.status(400).json({
      message: `Missing required column(s): ${missingColumns.join(', ')}. Download the template for the exact format.`,
    });
  }

  const results = { created: 0, failed: 0, rows: [] };

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowIsEmpty = row.values.length === 0 || row.values.every((v) => v === null || v === undefined || v === '');
    if (rowIsEmpty) continue;

    const dateValue = cellText(row, columnMap.date);
    const name = cellText(row, columnMap.name);
    const semesterValue = columnMap.semester !== undefined ? cellText(row, columnMap.semester) : '';
    const matchedSemester = semesterValue ? Number(semesterValue) : semester;
    const rowResult = { row: rowNum, date: dateValue, name, status: 'failed', message: '' };

    try {
      const parsedDate = parseDateValue(dateValue);
      if (!parsedDate) {
        throw new Error('Date is invalid. Use a valid date format like YYYY-MM-DD.');
      }

      const rowData = { date: dateValue, name, semester: matchedSemester || '' };
      const { error } = holidayImportRowSchema.validate(rowData, { abortEarly: false });
      if (error) {
        throw new Error(error.details.map((d) => d.message).join(', '));
      }

      const existingHoliday = await Holiday.findOne({
        academicYear: academicYearId,
        semester: matchedSemester || null,
        date: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()),
      });
      if (existingHoliday) {
        throw new Error(`Holiday already exists for ${parsedDate.toISOString().split('T')[0]}`);
      }

      const holiday = await Holiday.create({
        date: parsedDate,
        name,
        academicYear: academicYearId,
        semester: matchedSemester || null,
      });

      rowResult.status = 'created';
      rowResult.message = `Created holiday: ${holiday.name}`;
      results.created += 1;
    } catch (err) {
      rowResult.message = err.message;
      results.failed += 1;
    }

    results.rows.push(rowResult);
  }

  res.status(207).json(results);
}

async function downloadTemplate(req, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Holidays');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Semester', key: 'semester', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRow({
    date: '2026-08-15',
    name: 'Independence Day',
    semester: '',
  });

  sheet.addRow({});
  sheet.getCell(`A${sheet.rowCount + 1}`).value =
    'Notes: Use a valid date format like YYYY-MM-DD. Semester is optional; leave blank for a holiday that applies to all semesters in the selected academic year.';
  sheet.mergeCells(`A${sheet.rowCount}:C${sheet.rowCount}`);
  sheet.getCell(`A${sheet.rowCount}`).font = { italic: true, size: 9, color: { argb: 'FF888888' } };
  sheet.getCell(`A${sheet.rowCount}`).alignment = { wrapText: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=holiday_import_template.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { importHolidays, downloadTemplate };
