const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const { generateToken } = require('../utils/generateToken');

// @desc Login for faculty/admin
// @route POST /api/auth/faculty/login
const facultyLogin = async (req, res) => {
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
  const { email, password } = req.body;
  const student = await Student.findOne({ email }).select('+password');
  if (!student || !(await student.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = generateToken({ id: student._id, role: 'student' });
  res.json({
    token,
    user: { id: student._id, name: student.name, email: student.email, role: 'student', rollNo: student.rollNo },
  });
};

// @desc Get currently logged-in user's profile
// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ id: req.user.id, role: req.user.role, ...req.user.doc.toObject({ getters: true }), password: undefined });
};

module.exports = { facultyLogin, studentLogin, getMe };
