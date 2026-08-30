const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { computeAllDefaulters, computeStudentCourseAttendance } = require('../services/defaulterService');
const { runDefaulterCheckAndNotify } = require('../cron/defaulterCron');
const DefaulterLog = require('../models/DefaulterLog');

router.use(protect);

// Live computation of all students' attendance (admin/faculty dashboard)
router.get('/all', authorize('admin', 'faculty'), async (req, res) => {
  const results = await computeAllDefaulters({ academicYear: req.query.academicYear, logResults: false });
  res.json(results);
});

// Only the defaulters (below threshold)
router.get('/defaulters', authorize('admin', 'faculty'), async (req, res) => {
  const results = await computeAllDefaulters({ academicYear: req.query.academicYear, logResults: false });
  res.json(results.filter((r) => r.isDefaulter));
});

// Single student's attendance in one course
router.get('/student/:studentId/course/:courseId', async (req, res) => {
  if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const result = await computeStudentCourseAttendance(req.params.studentId, req.params.courseId);
  res.json(result);
});

// Manually trigger the notification cron (admin only) - useful for testing
router.post('/run-notifications', authorize('admin'), async (req, res) => {
  await runDefaulterCheckAndNotify();
  res.json({ message: 'Defaulter check + notifications triggered' });
});

// Notification history
router.get('/logs', authorize('admin', 'faculty'), async (req, res) => {
  const filter = {};
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  const logs = await DefaulterLog.find(filter).populate('student course').sort('-updatedAt');
  res.json(logs);
});

module.exports = router;
