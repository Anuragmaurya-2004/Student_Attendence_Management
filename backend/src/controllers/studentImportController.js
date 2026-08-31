const ExcelJS = require('exceljs');
const Joi = require('joi');
const { Readable } = require('stream');
const crypto = require('crypto');
const Student = require('../models/Student');
const Department = require('../models/Department');
const ClassBatch = require('../models/ClassBatch');
const AcademicYear = require('../models/AcademicYear');
const { sendStudentWelcomeEmail } = require('../services/mailService');

const studentImportRowSchema = Joi.object({
  name: Joi.string().trim().min(2).required().messages({
    'string.min': 'Name must be at least 2 characters long.',
    'any.required': 'Name is required.',
  }),
  rollNo: Joi.string().trim().min(2).required().messages({
    'string.min': 'Roll number must be at least 2 characters long.',
    'any.required': 'Roll number is required.',
  }),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Email must be a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().trim().min(8).allow('').optional().messages({
    'string.min': 'Password must be at least 8 characters long when provided.',
  }),
  phone: Joi.string().trim().allow('').optional(),
  parentEmail: Joi.string().trim().email().allow('').optional(),
  parentPhone: Joi.string().trim().allow('').optional(),
  departmentCode: Joi.string().trim().min(2).required().messages({
    'string.min': 'Department code must be at least 2 characters long.',
    'any.required': 'Department code is required.',
  }),
  classBatchName: Joi.string().trim().min(2).required().messages({
    'string.min': 'Class batch name must be at least 2 characters long.',
    'any.required': 'Class batch name is required.',
  }),
});

// Columns we look for in the uploaded sheet, matched case-insensitively and
// trimmed - lets admins export from Excel/Google Sheets without worrying
// about exact header casing.
const COLUMN_ALIASES = {
  name: ['name', 'full name', 'student name'],
  rollNo: ['rollno', 'roll no', 'roll number', 'roll_no'],
  email: ['email', 'student email'],
  password: ['password'], // optional - auto-generated if left blank
  phone: ['phone', 'mobile', 'phone number'],
  parentEmail: ['parentemail', 'parent email', 'guardian email'],
  parentPhone: ['parentphone', 'parent phone', 'guardian phone'],
  departmentCode: ['department', 'dept', 'department code', 'dept code'],
  classBatchName: ['classbatch', 'class batch', 'class', 'batch'],
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase();
}

// Builds a { fieldName: columnIndex } map from the header row, so row values
// can be read by meaning rather than by fixed column position.
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
  if (typeof val === 'object' && val.text) return String(val.text).trim(); // rich text cells
  return String(val).trim();
}

function generatePassword() {
  // 10-char readable random password (avoids ambiguous chars like 0/O, 1/l)
  return crypto.randomBytes(8).toString('base64').replace(/[+/=]/g, '').slice(0, 10);
}

// Loads the uploaded file (xlsx or csv) into an ExcelJS worksheet regardless
// of which format the admin exported from their spreadsheet tool.
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

const MAX_ROWS = 5000; // sane upper bound for one import to avoid runaway uploads

// @desc  Bulk-import students from an uploaded .xlsx/.xls/.csv file.
// @route POST /api/students/import  (multipart/form-data, field name "file")
// Each row is validated and saved individually (via .save(), not insertMany)
// so passwords are correctly hashed by the pre-save hook and one bad row
// (duplicate roll no, missing department, etc.) doesn't abort the whole batch.
async function importStudents(req, res) {
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
    return res.status(400).json({ message: `Too many rows. Max ${MAX_ROWS} students per import - split into batches.` });
  }

  const columnMap = mapHeaders(worksheet.getRow(1));
  const requiredFields = ['name', 'rollNo', 'email', 'departmentCode', 'classBatchName'];
  const missingColumns = requiredFields.filter((f) => columnMap[f] === undefined);
  if (missingColumns.length > 0) {
    return res.status(400).json({
      message: `Missing required column(s): ${missingColumns.join(', ')}. Download the template for the exact format.`,
    });
  }

  if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
    return res.status(400).json({ message: 'Uploaded file is empty.' });
  }

  // Cache lookups so we hit the DB once per distinct department/classBatch/year,
  // not once per row.
  const deptCache = new Map();
  const batchCache = new Map();

  const activeYear = await AcademicYear.findOne({ isActive: true });

  const results = { created: 0, failed: 0, rows: [] };

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowIsEmpty = row.values.length === 0 || row.values.every((v) => v === null || v === undefined || v === '');
    if (rowIsEmpty) continue;

    const name = cellText(row, columnMap.name);
    const rollNo = cellText(row, columnMap.rollNo);
    const email = cellText(row, columnMap.email).toLowerCase();
    const deptCode = cellText(row, columnMap.departmentCode).toUpperCase();
    const classBatchName = cellText(row, columnMap.classBatchName);
    let password = cellText(row, columnMap.password);
    const phone = cellText(row, columnMap.phone);
    const parentEmail = cellText(row, columnMap.parentEmail).toLowerCase();
    const parentPhone = cellText(row, columnMap.parentPhone);

    const rowResult = { row: rowNum, rollNo, name, status: 'failed', message: '' };

    try {
      const rowData = {
        name,
        rollNo,
        email,
        password: password || '',
        phone: phone || '',
        parentEmail: parentEmail || '',
        parentPhone: parentPhone || '',
        departmentCode: deptCode,
        classBatchName,
      };

      const { error } = studentImportRowSchema.validate(rowData, { abortEarly: false });
      if (error) {
        throw new Error(error.details.map((d) => d.message).join(', '));
      }

      if (!activeYear) {
        throw new Error('No active academic year is set - create/activate one before importing students');
      }

      // Resolve department (cached)
      let department = deptCache.get(deptCode);
      if (department === undefined) {
        department = await Department.findOne({ code: deptCode });
        deptCache.set(deptCode, department || null);
      }
      if (!department) throw new Error(`Unknown department code "${deptCode}"`);

      // Resolve class batch (cached, scoped to active year)
      const batchKey = `${classBatchName}::${activeYear._id}`;
      let classBatch = batchCache.get(batchKey);
      if (classBatch === undefined) {
        classBatch = await ClassBatch.findOne({ name: classBatchName, academicYear: activeYear._id });
        batchCache.set(batchKey, classBatch || null);
      }
      if (!classBatch) throw new Error(`Unknown class batch "${classBatchName}" for the active academic year`);

      let generatedPassword = null;
      if (!password) {
        password = generatePassword();
        generatedPassword = password; // used to email the student and keep a temporary admin fallback message
      }

      const student = new Student({
        name,
        rollNo,
        email,
        password, // hashed by the pre-save hook when .save() runs below
        phone: phone || undefined,
        parentEmail: parentEmail || undefined,
        parentPhone: parentPhone || undefined,
        department: department._id,
        classBatch: classBatch._id,
        academicYearJoined: activeYear._id,
        currentAcademicYear: activeYear._id,
      });
      await student.save();

      const credentialPassword = generatedPassword || password;
      let emailStatus = 'sent';
      try {
        const mailResult = await sendStudentWelcomeEmail({
          studentName: name,
          email,
          password: credentialPassword,
          rollNo,
        });
        if (mailResult && mailResult.skipped) {
          emailStatus = 'skipped';
        }
      } catch (mailError) {
        console.error(`[Student Import] Failed to email login credentials for ${email}:`, mailError.message);
        emailStatus = 'failed';
      }

      rowResult.status = 'created';
      if (emailStatus === 'sent') {
        rowResult.message = generatedPassword
          ? `Created. Login credentials emailed to ${email}. Auto-generated password: ${generatedPassword}`
          : `Created. Login credentials emailed to ${email}.`;
      } else if (emailStatus === 'skipped') {
        rowResult.message = generatedPassword
          ? `Created. SMTP not configured, so the auto-generated password ${generatedPassword} was not emailed. Share it with the student manually.`
          : 'Created. SMTP not configured, so the student could not be emailed. Share credentials manually.';
      } else {
        rowResult.message = generatedPassword
          ? `Created. Student account saved, but the welcome email failed. Auto-generated password: ${generatedPassword}`
          : 'Created. Student account saved, but the welcome email failed.';
      }
      results.created += 1;
    } catch (err) {
      if (err.code === 11000) {
        rowResult.message = 'Duplicate roll number or email for this academic year';
      } else {
        rowResult.message = err.message;
      }
      results.failed += 1;
    }

    results.rows.push(rowResult);
  }

  res.status(207).json(results); // 207 Multi-Status: some rows may have succeeded, some failed
}

// @desc  Download a starter .xlsx template with the exact expected columns.
// @route GET /api/students/import/template
async function downloadTemplate(req, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Students');

  sheet.columns = [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'RollNo', key: 'rollNo', width: 14 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Password', key: 'password', width: 16 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'ParentEmail', key: 'parentEmail', width: 28 },
    { header: 'ParentPhone', key: 'parentPhone', width: 16 },
    { header: 'Department', key: 'departmentCode', width: 14 },
    { header: 'ClassBatch', key: 'classBatchName', width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRow({
    name: 'Anurag Sharma',
    rollNo: 'IT401',
    email: 'anurag@example.edu',
    password: '', // leave blank to auto-generate
    phone: '9876543210',
    parentEmail: 'parent@example.com',
    parentPhone: '9876500000',
    departmentCode: 'IT',
    classBatchName: 'IT-4A',
  });

  sheet.addRow({}); // spacer
  sheet.getCell(`A${sheet.rowCount + 1}`).value =
    'Notes: Password column can be left blank - a random password will be generated and emailed to the student automatically. Department must match an existing department code, ClassBatch must match an existing class batch name for the active academic year.';
  sheet.mergeCells(`A${sheet.rowCount}:I${sheet.rowCount}`);
  sheet.getCell(`A${sheet.rowCount}`).font = { italic: true, size: 9, color: { argb: 'FF888888' } };
  sheet.getCell(`A${sheet.rowCount}`).alignment = { wrapText: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { importStudents, downloadTemplate };
