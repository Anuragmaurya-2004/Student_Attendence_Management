const Joi = require('joi');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const { generateToken } = require('../utils/generateToken');
const { sendPasswordChangedEmail } = require('../services/mailService');

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please enter a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().trim().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long.',
    'any.required': 'Password is required.',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().trim().min(8).required().messages({
    'string.min': 'Current password must be at least 8 characters long.',
    'any.required': 'Current password is required.',
  }),
  newPassword: Joi.string().trim().min(8).required().messages({
    'string.min': 'New password must be at least 8 characters long.',
    'any.required': 'New password is required.',
  }),
  confirmPassword: Joi.string().trim().min(8).required().valid(Joi.ref('newPassword')).messages({
    'string.min': 'Password confirmation must be at least 8 characters long.',
    'any.required': 'Password confirmation is required.',
    'any.only': 'New password and confirmation do not match.',
  }),
});

const validateRequest = (schema, req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return res.status(400).json({ message });
  }
  next();
};

// @desc Login for faculty/admin
// @route POST /api/auth/faculty/login
const facultyLogin = async (req, res) => {
  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
  }

  const { email, password } = req.body;
  const faculty = await Faculty.findOne({ email }).select('+password');
  if (!faculty || !(await faculty.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = generateToken({ id: faculty._id, role: faculty.role });
  res.json({
    token,
    user: { id: faculty._id, name: faculty.name, email: faculty.email, role: faculty.role, department: faculty.department },
  });
};

// @desc Login for students
// @route POST /api/auth/student/login
const studentLogin = async (req, res) => {
  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
  }

  const { email, password } = req.body;
  const student = await Student.findOne({ email }).select('+password');
  if (!student || !(await student.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = generateToken({ id: student._id, role: 'student' });
  res.json({
    token,
    user: { id: student._id, name: student.name, email: student.email, role: 'student', rollNo: student.rollNo },
    mustChangePassword: Boolean(student.mustChangePassword),
    message: student.mustChangePassword ? 'Password change required on first login.' : undefined,
  });
};

// @desc Allow a student to set a new password after first login
// @route POST /api/auth/student/change-password
const changeStudentPassword = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can change their own password.' });
    }

    const { error } = changePasswordSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;
    const student = await Student.findById(req.user.id).select('+password');
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const isValidCurrentPassword = await student.comparePassword(currentPassword);
    if (!isValidCurrentPassword) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    if (await student.comparePassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be different from your current password.' });
    }

    student.password = newPassword;
    student.mustChangePassword = false;
    student.passwordChangedAt = new Date();
    await student.save();

    try {
      await sendPasswordChangedEmail({
        studentName: student.name,
        email: student.email,
      });
    } catch (mailError) {
      console.error('[Auth] Password change email failed for student:', student.email, mailError.message);
    }

    return res.json({
      message: 'Password changed successfully.',
      mustChangePassword: false,
    });
  } catch (err) {
    console.error('[Auth] Change password error:', err);
    return res.status(500).json({ message: 'Could not change password.' });
  }
};

// @desc Get currently logged-in user's profile
// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ id: req.user.id, role: req.user.role, ...req.user.doc.toObject({ getters: true }), password: undefined });
};

module.exports = { facultyLogin, studentLogin, changeStudentPassword, getMe, validateRequest, loginSchema, changePasswordSchema };
