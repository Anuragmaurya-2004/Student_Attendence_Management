const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Faculty = require('../models/Faculty');
const { importFaculty, downloadTemplate } = require('../controllers/facultyImportController');
const { sendFacultyWelcomeEmail } = require('../services/mailService');

const ClassBatch = require('../models/ClassBatch');
const { getDepartmentScope } = require('../utils/userScope');

const objectIdSchema = Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required();

const createFacultySchema = Joi.object({
  name: Joi.string().trim().min(2).required().messages({
    'string.min': 'Faculty name must be at least 2 characters long.',
    'any.required': 'Faculty name is required.',
  }),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please enter a valid faculty email address.',
    'any.required': 'Faculty email is required.',
  }),
  password: Joi.string().trim().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long.',
    'any.required': 'Password is required.',
  }),
  gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').required().messages({
    'any.only': 'Gender must be one of Male, Female, Other, or Prefer not to say.',
    'any.required': 'Gender is required.',
  }),
  department: objectIdSchema.messages({
    'string.pattern.base': 'Department ID is invalid.',
    'any.required': 'Department is required.',
  }),
  role: Joi.string().valid('faculty', 'admin').optional(),
  phone: Joi.string().trim().allow('').optional(),
  coursesAssigned: Joi.array().items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/)).optional(),
  classBatchesAssigned: Joi.array().items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/)).optional(),
  classTeacherOf: Joi.array().items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/)).optional(),
});

const updateFacultySchema = Joi.object({
  name: Joi.string().trim().min(2).optional(),
  email: Joi.string().trim().email().optional(),
  password: Joi.string().trim().min(8).optional(),
  gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').optional(),
  department: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).optional(),
  phone: Joi.string().trim().allow('').optional(),
  coursesAssigned: Joi.array().items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/)).optional(),
  classBatchesAssigned: Joi.array().items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/)).optional(),
  classTeacherOf: Joi.array().items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/)).optional(),
}).min(1);

const validateRequest = (schema, req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
  }
  next();
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(xlsx|xls|csv)$/i;
    if (!allowed.test(file.originalname)) {
      return cb(new Error('Only .xlsx, .xls or .csv files are allowed'));
    }
    cb(null, true);
  },
});

router.use(protect);

router.get('/', authorize('admin'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const filter = {};
  if (deptScope) {
    filter.department = deptScope;
  } else if (req.query.department) {
    filter.department = req.query.department;
  }
  const list = await Faculty.find(filter)
    .populate('department coursesAssigned classBatchesAssigned classTeacherOf');
  res.json(list);
});

router.get('/:id', async (req, res) => {
  if (req.user.role === 'faculty' && req.user.id !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const faculty = await Faculty.findById(req.params.id)
    .populate('department coursesAssigned classBatchesAssigned classTeacherOf');
  if (!faculty) return res.status(404).json({ message: 'Not found' });

  const deptScope = getDepartmentScope(req);
  if (deptScope && faculty.department?._id?.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: Faculty is outside your department scope.' });
  }

  res.json(faculty);
});

router.post('/', authorize('admin'), (req, res, next) => validateRequest(createFacultySchema, req, res, next), async (req, res) => {
  try {
    const deptScope = getDepartmentScope(req);
    const data = { ...req.body };
    if (deptScope) data.department = deptScope;

    const faculty = await Faculty.create({ ...data, mustChangePassword: true });

    if (faculty.classTeacherOf?.length > 0) {
      await ClassBatch.updateMany(
        { _id: { $in: faculty.classTeacherOf } },
        { classTeacher: faculty._id }
      );
    }

    // Keep account creation independent from SMTP availability: the new faculty can still
    // be given credentials manually if email delivery is skipped or fails.
    let emailStatus = 'sent';
    try {
      const mailResult = await sendFacultyWelcomeEmail({
        facultyName: faculty.name,
        email: faculty.email,
        password: req.body.password,
      });
      if (mailResult?.skipped) emailStatus = 'skipped';
    } catch (mailError) {
      console.error(`[Faculty] Failed to email credentials for ${faculty.email}:`, mailError.message);
      emailStatus = 'failed';
    }

    const responseMessage =
      emailStatus === 'sent'
        ? 'Faculty account created and login credentials emailed.'
        : emailStatus === 'skipped'
          ? 'Faculty account created, but SMTP is not configured. Share the password manually.'
          : 'Faculty account created, but the welcome email failed. Share the password manually.';

    const populated = await Faculty.findById(faculty._id)
      .populate('department coursesAssigned classBatchesAssigned classTeacherOf');
    res.status(201).json({ faculty: populated, emailStatus, message: responseMessage });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/import', authorize('admin'), upload.single('file'), importFaculty);
router.get('/import/template', authorize('admin'), downloadTemplate);

router.put('/:id', authorize('admin'), (req, res, next) => validateRequest(updateFacultySchema, req, res, next), async (req, res) => {
  try {
    const deptScope = getDepartmentScope(req);
    const existing = await Faculty.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Faculty not found' });
    if (deptScope && existing.department.toString() !== deptScope) {
      return res.status(403).json({ message: 'Forbidden: You can only edit faculty in your department.' });
    }

    const data = { ...req.body };
    if (deptScope) data.department = deptScope;

    if (req.body.classTeacherOf) {
      const prevBatches = (existing.classTeacherOf || []).map((b) => b.toString());
      const newBatches = req.body.classTeacherOf.map((b) => b.toString());
      const removed = prevBatches.filter((b) => !newBatches.includes(b));
      if (removed.length > 0) {
        await ClassBatch.updateMany(
          { _id: { $in: removed }, classTeacher: existing._id },
          { $unset: { classTeacher: '' } }
        );
      }
      if (newBatches.length > 0) {
        await ClassBatch.updateMany(
          { _id: { $in: newBatches } },
          { classTeacher: existing._id }
        );
      }
    }

    const faculty = await Faculty.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('department coursesAssigned classBatchesAssigned classTeacherOf');
    res.json(faculty);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const existing = await Faculty.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Faculty not found' });
  if (deptScope && existing.department.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: You can only delete faculty in your department.' });
  }
  await ClassBatch.updateMany({ classTeacher: existing._id }, { $unset: { classTeacher: '' } });
  await Faculty.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
