const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  checkIn,
  markManual,
  markBulk,
  getBySession,
  getByStudent,
} = require('../controllers/attendanceController');

router.use(protect);

router.post('/check-in', checkIn); // student self check-in via QR
router.post('/manual', authorize('admin', 'faculty'), markManual);
router.post('/bulk', authorize('admin', 'faculty'), markBulk);
router.get('/session/:sessionId', authorize('admin', 'faculty'), getBySession);
router.get('/student/:studentId', getByStudent);

module.exports = router;
