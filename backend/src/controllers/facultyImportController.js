const ExcelJS = require('exceljs');
const Joi = require('joi');
const { Readable } = require('stream');
const crypto = require('crypto');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const { sendFacultyWelcomeEmail } = require('../services/mailService');

const facultyImportRowSchema = Joi.object({
  name: Joi.string().trim().min(2).required().messages({
    'string.min': 'Name must be at least 2 characters long.',
    'any.required': 'Name is required.',
  }),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Email must be a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().trim().min(8).allow('').optional().messages({
    'string.min': 'Password must be at least 8 characters long when provided.',
  }),
  phone: Joi.string().trim().allow('').optional(),
  gender: Joi.string().trim().valid('Male', 'Female', 'Other', 'Prefer not to say').required().messages({
    'any.only': 'Gender must be one of Male, Female, Other, or Prefer not to say.',
    'any.required': 'Gender is required.',
  }),
  departmentCode: Joi.string().trim().min(2).required().messages({
    'string.min': 'Department code must be at least 2 characters long.',
    'any.required': 'Department code is required.',
  }),
  role: Joi.string().trim().valid('faculty', 'admin').default('faculty').messages({
    'any.only': 'Role must be either faculty or admin.',
  }),
});

const COLUMN_ALIASES = {
  name: ['name', 'full name', 'faculty name'],
  email: ['email', 'faculty email'],
  password: ['password'],
  phone: ['phone', 'mobile', 'phone number'],
  gender: ['gender', 'sex'],
  departmentCode: ['department', 'dept', 'department code', 'dept code'],
  role: ['role', 'designation'],
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

function generatePassword() {
  return crypto.randomBytes(8).toString('base64').replace(/[+/=]/g, '').slice(0, 10);
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

async function importFaculty(req, res) {
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
    return res.status(400).json({ message: `Too many rows. Max ${MAX_ROWS} faculty records per import - split into batches.` });
  }

  const columnMap = mapHeaders(worksheet.getRow(1));
  const requiredFields = ['name', 'email', 'departmentCode'];
  const missingColumns = requiredFields.filter((f) => columnMap[f] === undefined);
  if (missingColumns.length > 0) {
    return res.status(400).json({
      message: `Missing required column(s): ${missingColumns.join(', ')}. Download the template for the exact format.`,
    });
  }

  const deptCache = new Map();
  const results = { created: 0, failed: 0, rows: [] };

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowIsEmpty = row.values.length === 0 || row.values.every((v) => v === null || v === undefined || v === '');
    if (rowIsEmpty) continue;

    const name = cellText(row, columnMap.name);
    const email = cellText(row, columnMap.email).toLowerCase();
    const password = cellText(row, columnMap.password);
    const phone = cellText(row, columnMap.phone);
    const gender = cellText(row, columnMap.gender);
    const departmentCode = cellText(row, columnMap.departmentCode).toUpperCase();
    const role = (cellText(row, columnMap.role) || 'faculty').toLowerCase();

    const rowResult = { row: rowNum, email, name, status: 'failed', message: '' };

    try {
      const rowData = {
        name,
        email,
        password: password || '',
        phone: phone || '',
        gender,
        departmentCode,
        role,
      };

      const { error } = facultyImportRowSchema.validate(rowData, { abortEarly: false });
      if (error) {
        throw new Error(error.details.map((d) => d.message).join(', '));
      }

      let department = deptCache.get(departmentCode);
      if (department === undefined) {
        department = await Department.findOne({ code: departmentCode });
        deptCache.set(departmentCode, department || null);
      }
      if (!department) throw new Error(`Unknown department code "${departmentCode}"`);

      let generatedPassword = null;
      const finalPassword = password || generatePassword();
      if (!password) generatedPassword = finalPassword;

      const faculty = new Faculty({
        name,
        email,
        password: finalPassword,
        phone: phone || undefined,
        gender: gender || 'Prefer not to say',
        department: department._id,
        role: role === 'admin' ? 'admin' : 'faculty',
        mustChangePassword: true,
      });
      await faculty.save();

      let emailStatus = 'sent';
      try {
        const mailResult = await sendFacultyWelcomeEmail({
          facultyName: name,
          email,
          password: finalPassword,
        });
        if (mailResult && mailResult.skipped) {
          emailStatus = 'skipped';
        }
      } catch (mailError) {
        console.error(`[Faculty Import] Failed to email credentials for ${email}:`, mailError.message);
        emailStatus = 'failed';
      }

      rowResult.status = 'created';
      if (emailStatus === 'sent') {
        rowResult.message = generatedPassword
          ? `Created. Login credentials emailed to ${email}. Auto-generated password: ${generatedPassword}`
          : `Created. Login credentials emailed to ${email}.`;
      } else if (emailStatus === 'skipped') {
        rowResult.message = generatedPassword
          ? `Created. SMTP not configured, so the auto-generated password ${generatedPassword} was not emailed. Share it with the faculty manually.`
          : 'Created. SMTP not configured, so the faculty could not be emailed. Share credentials manually.';
      } else {
        rowResult.message = generatedPassword
          ? `Created. Faculty account saved, but the welcome email failed. Auto-generated password: ${generatedPassword}`
          : 'Created. Faculty account saved, but the welcome email failed.';
      }
      results.created += 1;
    } catch (err) {
      rowResult.message = err.code === 11000 ? 'Duplicate email address' : err.message;
      results.failed += 1;
    }

    results.rows.push(rowResult);
  }

  res.status(207).json(results);
}

async function downloadTemplate(req, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Faculty');

  sheet.columns = [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Password', key: 'password', width: 18 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Gender', key: 'gender', width: 16 },
    { header: 'Department', key: 'departmentCode', width: 16 },
    { header: 'Role', key: 'role', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRow({
    name: 'Amit Patil',
    email: 'amit@example.edu',
    password: '',
    phone: '9876543210',
    gender: 'Female',
    departmentCode: 'IT',
    role: 'faculty',
  });

  sheet.addRow({});
  sheet.getCell(`A${sheet.rowCount + 1}`).value =
    'Notes: Password may be left blank; a random password will be generated and emailed automatically. Department should match an existing department code. Role can be faculty or admin.';
  sheet.mergeCells(`A${sheet.rowCount}:F${sheet.rowCount}`);
  sheet.getCell(`A${sheet.rowCount}`).font = { italic: true, size: 9, color: { argb: 'FF888888' } };
  sheet.getCell(`A${sheet.rowCount}`).alignment = { wrapText: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=faculty_import_template.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { importFaculty, downloadTemplate };
