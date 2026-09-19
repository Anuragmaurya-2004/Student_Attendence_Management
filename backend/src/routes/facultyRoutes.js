const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Faculty = require('../models/Faculty');
const { importFaculty, downloadTemplate } = require('../controllers/facultyImportController');
const { sendFacultyWelcomeEmail } = require('../services/mailService');

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
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  const list = await Faculty.find(filter).populate('department coursesAssigned classBatchesAssigned');
  res.json(list);
});

router.get('/:id', async (req, res) => {
  if (req.user.role === 'faculty' && req.user.id !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const faculty = await Faculty.findById(req.params.id).populate('department coursesAssigned classBatchesAssigned');
  if (!faculty) return res.status(404).json({ message: 'Not found' });
  res.json(faculty);
});

router.post('/', authorize('admin'), (req, res, next) => validateRequest(createFacultySchema, req, res, next), async (req, res) => {
  try {
    const faculty = await Faculty.create({ ...req.body, mustChangePassword: true });

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
    res.status(201).json({ faculty, emailStatus, message: responseMessage });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/import', authorize('admin'), upload.single('file'), importFaculty);
router.get('/import/template', authorize('admin'), downloadTemplate);

router.put('/:id', authorize('admin'), (req, res, next) => validateRequest(updateFacultySchema, req, res, next), async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
    res.json(faculty);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  await Faculty.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
