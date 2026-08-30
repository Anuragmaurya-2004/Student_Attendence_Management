const express = require('express');
const router = express.Router();
const { facultyLogin, studentLogin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/faculty/login', facultyLogin);
router.post('/student/login', studentLogin);
router.get('/me', protect, getMe);

module.exports = router;
