const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Faculty = require('../models/Faculty');

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
  department: objectIdSchema.messages({
    'string.pattern.base': 'Department ID is invalid.',
    'any.required': 'Department is required.',
  }),
  phone: Joi.string().trim().allow('').optional(),
  coursesAssigned: Joi.array().items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/)).optional(),
});

const updateFacultySchema = Joi.object({
  name: Joi.string().trim().min(2).optional(),
  email: Joi.string().trim().email().optional(),
  password: Joi.string().trim().min(8).optional(),
  department: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).optional(),
  phone: Joi.string().trim().allow('').optional(),
  coursesAssigned: Joi.array().items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/)).optional(),
}).min(1);

const validateRequest = (schema, req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
  }
  next();
};

router.use(protect);

router.get('/', authorize('admin'), async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  const list = await Faculty.find(filter).populate('department coursesAssigned');
  res.json(list);
});

router.get('/:id', async (req, res) => {
  if (req.user.role === 'faculty' && req.user.id !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const faculty = await Faculty.findById(req.params.id).populate('department coursesAssigned');
  if (!faculty) return res.status(404).json({ message: 'Not found' });
  res.json(faculty);
});

router.post('/', authorize('admin'), (req, res, next) => validateRequest(createFacultySchema, req, res, next), async (req, res) => {
  try {
    const faculty = await Faculty.create(req.body);
    res.status(201).json(faculty);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

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
