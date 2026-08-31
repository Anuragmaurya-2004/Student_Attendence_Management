const express = require('express');
const router = express.Router();
const { facultyLogin, studentLogin, changeStudentPassword, getMe } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/faculty/login', facultyLogin);
router.post('/student/login', studentLogin);
router.post('/student/change-password', protect, authorize('student'), changeStudentPassword);
router.get('/me', protect, getMe);

module.exports = router;
