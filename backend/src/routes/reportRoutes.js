const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { computeAllDefaulters, computeStudentCourseAttendance } = require('../services/defaulterService');
const { runDefaulterCheckAndNotify } = require('../cron/defaulterCron');
const DefaulterLog = require('../models/DefaulterLog');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { getDepartmentScope } = require('../utils/userScope');

router.use(protect);

// Live computation of all students' attendance (admin/faculty dashboard)
router.get('/all', authorize('admin', 'faculty'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const options = {
    academicYear: req.query.academicYear,
    department: deptScope || req.query.department,
    classBatch: req.query.classBatch,
    logResults: false,
  };
  if (req.user.role === 'faculty') {
    options.facultyId = req.user.id;
  }
  const results = await computeAllDefaulters(options);
  res.json(results);
});

// Only the defaulters (below threshold)
router.get('/defaulters', authorize('admin', 'faculty'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const options = {
    academicYear: req.query.academicYear,
    department: deptScope || req.query.department,
    classBatch: req.query.classBatch,
    logResults: false,
  };
  if (req.user.role === 'faculty') {
    options.facultyId = req.user.id;
  }
  const results = await computeAllDefaulters(options);
  res.json(results.filter((r) => r.isDefaulter));
});

// Single student's attendance in one course
router.get('/student/:studentId/course/:courseId', async (req, res) => {
  if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const student = await Student.findById(req.params.studentId);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const deptScope = getDepartmentScope(req);
  if (deptScope && student.department.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: Student is outside your department scope.' });
  }

  if (req.user.role === 'faculty') {
    const faculty = await Faculty.findById(req.user.id);
    if (faculty) {
      const isClassTeacher = (faculty.classTeacherOf || []).some(
        (b) => b.toString() === student.classBatch.toString()
      );
      const teachesCourse = (faculty.coursesAssigned || []).some(
        (c) => c.toString() === req.params.courseId
      );
      if (!isClassTeacher && !teachesCourse) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this student\'s course attendance.' });
      }
    }
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
  const deptScope = getDepartmentScope(req);

  let logs = await DefaulterLog.find(filter)
    .populate('student course')
    .sort('-updatedAt');

  if (deptScope) {
    logs = logs.filter((l) => l.student?.department?.toString() === deptScope);
  } else if (req.user.role === 'faculty') {
    const faculty = await Faculty.findById(req.user.id);
    if (faculty) {
      const teacherBatches = (faculty.classTeacherOf || []).map((b) => b.toString());
      const assignedCourses = (faculty.coursesAssigned || []).map((c) => c.toString());
      logs = logs.filter((l) => {
        const isClassTeacher = teacherBatches.includes(l.student?.classBatch?.toString());
        const isAssignedCourse = assignedCourses.includes(l.course?._id?.toString());
        return isClassTeacher || isAssignedCourse;
      });
    }
  }

  res.json(logs);
});

module.exports = router;
