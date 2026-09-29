const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const crypto = require('crypto');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const { importStudents, downloadTemplate } = require('../controllers/studentImportController');
const { sendStudentWelcomeEmail } = require('../services/mailService');
const { createNotification } = require('../utils/notificationService');

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
  gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').required().messages({
    'any.only': 'Gender must be one of Male, Female, Other, or Prefer not to say.',
    'any.required': 'Gender is required.',
  }),
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
  gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').optional(),
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

const { getDepartmentScope } = require('../utils/userScope');
const Faculty = require('../models/Faculty');

router.use(protect);

// List students (admin/faculty) - filter by classBatch, department, academicYear
router.get('/', authorize('admin', 'faculty'), async (req, res) => {
  const filter = {};
  const deptScope = getDepartmentScope(req);
  const ClassBatch = require('../models/ClassBatch');
  let deptBatchIds = [];

  if (deptScope) {
    const deptBatches = await ClassBatch.find({ department: deptScope }).select('_id');
    deptBatchIds = deptBatches.map((b) => b._id.toString());
    filter.department = deptScope;
    filter.classBatch = { $in: deptBatches.map((b) => b._id) };
  } else if (req.query.department) {
    filter.department = req.query.department;
  }

  if (req.user.role === 'faculty') {
    const faculty = await Faculty.findById(req.user.id);
    if (faculty) {
      const allowedBatches = [
        ...(faculty.classTeacherOf || []),
        ...(faculty.classBatchesAssigned || []),
      ].map((b) => b.toString());

      if (req.query.classBatch) {
        if (!allowedBatches.includes(req.query.classBatch.toString())) {
          return res.status(403).json({ message: 'Forbidden: You are not assigned to this class batch.' });
        }
        filter.classBatch = req.query.classBatch;
      } else {
        filter.classBatch = { $in: allowedBatches };
      }
    }
  } else if (req.query.classBatch) {
    if (deptScope && !deptBatchIds.includes(req.query.classBatch.toString())) {
      return res.status(403).json({ message: 'Forbidden: Class batch is outside your department scope.' });
    }
    filter.classBatch = req.query.classBatch;
  }

  if (req.query.academicYear) filter.currentAcademicYear = req.query.academicYear;
  if (req.query.status) filter.status = req.query.status;
  const students = await Student.find(filter).populate('department classBatch currentAcademicYear');
  res.json(students);
});

// Get single student
router.get('/:id', async (req, res) => {
  // students can only view themselves; faculty/admin can view anyone in scope
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const student = await Student.findById(req.params.id).populate('department classBatch currentAcademicYear');
  if (!student) return res.status(404).json({ message: 'Not found' });

  const deptScope = getDepartmentScope(req);
  if (deptScope && student.department?._id?.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: Student is outside your department scope.' });
  }

  if (req.user.role === 'faculty') {
    const faculty = await Faculty.findById(req.user.id);
    if (faculty) {
      const allowedBatches = [
        ...(faculty.classTeacherOf || []),
        ...(faculty.classBatchesAssigned || []),
      ].map((b) => b.toString());
      if (!allowedBatches.includes(student.classBatch?._id?.toString())) {
        return res.status(403).json({ message: 'Forbidden: You do not teach or manage this student\'s class.' });
      }
    }
  }

  res.json(student);
});

// Create student (admin only)
router.post('/', authorize('admin'), (req, res, next) => validateRequest(createStudentSchema, req, res, next), async (req, res) => {
  try {
    const deptScope = getDepartmentScope(req);
    const data = { ...req.body };
    if (deptScope) data.department = deptScope;

    const password = data.password || generatePassword();
    const student = await Student.create({
      ...data,
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

    await createNotification({
      title: 'Student Enrolled',
      message: `Student "${student.name}" (Roll No: ${student.rollNo}) was successfully registered.`,
      type: 'success',
      link: '/admin/students',
      recipient: req.user.id,
      recipientRole: 'admin',
    });
    await createNotification({
      title: 'Welcome to Attendance Pro',
      message: 'Your student portal is ready. Check your enrolled class sessions and attendance history.',
      type: 'success',
      link: '/student',
      recipient: student._id,
      recipientModel: 'Student',
      recipientRole: 'student',
    });

    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Bulk create students from raw JSON (admin only) - expects { students: [...] }
router.post('/bulk', authorize('admin'), (req, res, next) => validateRequest(bulkStudentsSchema, req, res, next), async (req, res) => {
  const { students } = req.body;
  const deptScope = getDepartmentScope(req);

  const results = { created: 0, failed: 0, rows: [] };
  for (const [idx, data] of students.entries()) {
    try {
      const studentData = { ...data };
      if (deptScope) studentData.department = deptScope;

      const password = studentData.password || generatePassword();
      const student = new Student({
        ...studentData,
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

  if (results.created > 0) {
    await createNotification({
      title: 'Bulk Students Ingested',
      message: `Successfully onboarded ${results.created} student(s) into class cohorts.`,
      type: 'success',
      link: '/admin/students',
      recipient: req.user.id,
      recipientRole: 'admin',
    });
  }

  res.status(207).json(results);
});

// Bulk import students from an uploaded Excel/CSV file (admin only).
router.post('/import', authorize('admin'), upload.single('file'), importStudents);
router.get('/import/template', authorize('admin'), downloadTemplate);

// Update student
router.put('/:id', authorize('admin'), (req, res, next) => validateRequest(updateStudentSchema, req, res, next), async (req, res) => {
  try {
    const deptScope = getDepartmentScope(req);
    const existing = await Student.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Student not found' });
    if (deptScope && existing.department.toString() !== deptScope) {
      return res.status(403).json({ message: 'Forbidden: You can only edit students in your department.' });
    }
    const updateData = { ...req.body };
    if (deptScope) updateData.department = deptScope;

    const student = await Student.findByIdAndUpdate(req.params.id, updateData, { new: true });

    await createNotification({
      title: 'Student Profile Updated',
      message: `Profile records for "${student.name}" (${student.rollNo}) were updated.`,
      type: 'info',
      link: '/admin/students',
      recipient: req.user.id,
      recipientRole: 'admin',
    });
    await createNotification({
      title: 'Profile Updated',
      message: 'Your academic profile details have been updated by administration.',
      type: 'info',
      link: '/student',
      recipient: student._id,
      recipientModel: 'Student',
      recipientRole: 'student',
    });

    res.json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete student
router.delete('/:id', authorize('admin'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const existing = await Student.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Student not found' });
  if (deptScope && existing.department.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: You can only delete students in your department.' });
  }
  await Student.findByIdAndDelete(req.params.id);

  await createNotification({
    title: 'Student Record Removed',
    message: `Student "${existing.name}" (${existing.rollNo}) was deleted from the roster.`,
    type: 'info',
    link: '/admin/students',
    recipient: req.user.id,
    recipientRole: 'admin',
  });

  res.json({ message: 'Deleted' });
});

module.exports = router;
