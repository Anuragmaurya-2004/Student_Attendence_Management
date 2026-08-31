const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const crypto = require('crypto');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const { importStudents, downloadTemplate } = require('../controllers/studentImportController');
const { sendStudentWelcomeEmail } = require('../services/mailService');

const objectIdSchema = Joi.string().pattern(/^[a-fA-F0-9]{24}$/);

const createStudentSchema = Joi.object({
  name: Joi.string().trim().min(2).required().messages({
    'string.min': 'Student name must be at least 2 characters long.',
    'any.required': 'Student name is required.',
  }),
  rollNo: Joi.string().trim().min(2).required().messages({
    'string.min': 'Roll number must be at least 2 characters long.',
    'any.required': 'Roll number is required.',
  }),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please enter a valid student email address.',
    'any.required': 'Student email is required.',
  }),
  password: Joi.string().trim().min(8).optional().messages({
    'string.min': 'Password must be at least 8 characters long.',
  }),
  phone: Joi.string().trim().allow('').optional(),
  parentEmail: Joi.string().trim().email().allow('').optional(),
  parentPhone: Joi.string().trim().allow('').optional(),
  department: objectIdSchema.required().messages({
    'string.pattern.base': 'Department ID is invalid.',
    'any.required': 'Department is required.',
  }),
  classBatch: objectIdSchema.required().messages({
    'string.pattern.base': 'Class batch ID is invalid.',
    'any.required': 'Class batch is required.',
  }),
  academicYearJoined: objectIdSchema.required().messages({
    'string.pattern.base': 'Academic year ID is invalid.',
    'any.required': 'Academic year joined is required.',
  }),
  currentAcademicYear: objectIdSchema.required().messages({
    'string.pattern.base': 'Current academic year ID is invalid.',
    'any.required': 'Current academic year is required.',
  }),
  status: Joi.string().valid('active', 'promoted', 'passed_out', 'dropped').optional(),
  role: Joi.string().valid('student').optional(),
});

const updateStudentSchema = Joi.object({
  name: Joi.string().trim().min(2).optional(),
  rollNo: Joi.string().trim().min(2).optional(),
  email: Joi.string().trim().email().optional(),
  password: Joi.string().trim().min(8).optional(),
  phone: Joi.string().trim().allow('').optional(),
  parentEmail: Joi.string().trim().email().allow('').optional(),
  parentPhone: Joi.string().trim().allow('').optional(),
  department: objectIdSchema.optional(),
  classBatch: objectIdSchema.optional(),
  academicYearJoined: objectIdSchema.optional(),
  currentAcademicYear: objectIdSchema.optional(),
  status: Joi.string().valid('active', 'promoted', 'passed_out', 'dropped').optional(),
  mustChangePassword: Joi.boolean().optional(),
  role: Joi.string().valid('student').optional(),
}).min(1);

const bulkStudentsSchema = Joi.object({
  students: Joi.array().items(createStudentSchema).min(1).required().messages({
    'array.min': 'At least one student is required.',
    'any.required': 'Students array is required.',
  }),
});

const validateRequest = (schema, req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
  }
  next();
};

function generatePassword() {
  return crypto.randomBytes(8).toString('base64').replace(/[+/=]/g, '').slice(0, 10);
}

// Memory storage - files are small (student lists) and only need to be
// parsed in-memory by ExcelJS, never written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(xlsx|xls|csv)$/i;
    if (!allowed.test(file.originalname)) {
      return cb(new Error('Only .xlsx, .xls or .csv files are allowed'));
    }
    cb(null, true);
  },
});

router.use(protect);

// List students (admin/faculty) - filter by classBatch, department, academicYear
router.get('/', authorize('admin', 'faculty'), async (req, res) => {
  const filter = {};
  if (req.query.classBatch) filter.classBatch = req.query.classBatch;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.academicYear) filter.currentAcademicYear = req.query.academicYear;
  if (req.query.status) filter.status = req.query.status;
  const students = await Student.find(filter).populate('department classBatch currentAcademicYear');
  res.json(students);
});

// Get single student
router.get('/:id', async (req, res) => {
  // students can only view themselves; faculty/admin can view anyone
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const student = await Student.findById(req.params.id).populate('department classBatch currentAcademicYear');
  if (!student) return res.status(404).json({ message: 'Not found' });
  res.json(student);
});

// Create student (admin only)
router.post('/', authorize('admin'), (req, res, next) => validateRequest(createStudentSchema, req, res, next), async (req, res) => {
  try {
    const password = req.body.password || generatePassword();
    const student = await Student.create({
      ...req.body,
      password,
      mustChangePassword: true,
    });

    try {
      await sendStudentWelcomeEmail({
        studentName: student.name,
        email: student.email,
        password,
        rollNo: student.rollNo,
      });
    } catch (mailError) {
      console.error('[Student] Manual create welcome email failed:', mailError.message);
    }

    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Bulk create students from raw JSON (admin only) - expects { students: [...] }
// NOTE: uses individual .save() calls, not insertMany. insertMany() skips
// Mongoose's pre('save') middleware, which is what hashes the password - an
// insertMany-based bulk insert would have stored every bulk-created
// student's password in PLAIN TEXT. .save() runs the hook correctly, and
// also lets one bad row fail without aborting the whole batch.
router.post('/bulk', authorize('admin'), (req, res, next) => validateRequest(bulkStudentsSchema, req, res, next), async (req, res) => {
  const { students } = req.body;

  const results = { created: 0, failed: 0, rows: [] };
  for (const [idx, data] of students.entries()) {
    try {
      const password = data.password || generatePassword();
      const student = new Student({
        ...data,
        password,
        mustChangePassword: true,
      });
      await student.save();

      try {
        await sendStudentWelcomeEmail({
          studentName: student.name,
          email: student.email,
          password,
          rollNo: student.rollNo,
        });
      } catch (mailError) {
        console.error('[Student] Bulk create welcome email failed:', mailError.message);
      }

      results.created += 1;
      results.rows.push({ index: idx, status: 'created', id: student._id });
    } catch (err) {
      results.failed += 1;
      results.rows.push({
        index: idx,
        status: 'failed',
        message: err.code === 11000 ? 'Duplicate roll number or email' : err.message,
      });
    }
  }
  res.status(207).json(results);
});

// Bulk import students from an uploaded Excel/CSV file (admin only).
// Lets a university onboard an entire class in one upload instead of
// adding students one by one.
router.post('/import', authorize('admin'), upload.single('file'), importStudents);
router.get('/import/template', authorize('admin'), downloadTemplate);

// Update student
router.put('/:id', authorize('admin'), (req, res, next) => validateRequest(updateStudentSchema, req, res, next), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete student
router.delete('/:id', authorize('admin'), async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
