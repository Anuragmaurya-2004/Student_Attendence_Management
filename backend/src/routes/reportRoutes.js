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
    course: req.query.course,
    viewType: req.query.viewType || 'subject',
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
    course: req.query.course,
    viewType: req.query.viewType || 'subject',
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

// Trigger defaulter email notifications (HOD, Admin, Class Teacher)
router.post('/run-notifications', authorize('admin', 'faculty'), async (req, res) => {
  const { isHOD } = require('../utils/userScope');
  const deptScope = getDepartmentScope(req);
  const isUserHod = Boolean(req.user.isHOD || isHOD(req.user) || (req.user.doc && req.user.doc.department && (req.user.role === 'admin' || (req.user.doc.designation || '').toLowerCase().includes('hod'))));
  const isClassTeacher = (req.user.doc?.classTeacherOf || []).length > 0;
  const isUserAdmin = req.user.role === 'admin';

  // Authorization: Must be an Admin, HOD, or Class Teacher
  if (req.user.role === 'faculty' && !isUserHod && !isClassTeacher) {
    return res.status(403).json({
      message: 'Forbidden: Only Department HODs, Administrators, and Class Teachers can trigger email notifications.',
    });
  }

  const { classBatch, course, studentId, viewType, force, customNote } = req.body || {};

  // If faculty is a class teacher (and not HOD/admin), enforce their class batch
  let targetClassBatch = classBatch;
  if (req.user.role === 'faculty' && !isUserHod && !isUserAdmin) {
    const teacherBatches = (req.user.doc?.classTeacherOf || []).map((b) => b.toString());
    if (classBatch && !teacherBatches.includes(classBatch.toString())) {
      return res.status(403).json({ message: 'Forbidden: You can only notify students in your designated class batch.' });
    }
    if (!classBatch) {
      targetClassBatch = { $in: teacherBatches };
    }
  }

  const userName = req.user.doc?.name || req.user.name || 'Authority';
  const triggeredBy = isUserHod
    ? `${userName} (HOD)`
    : isUserAdmin
    ? `${userName} (Admin)`
    : `${userName} (Class Teacher)`;

  const summary = await runDefaulterCheckAndNotify({
    department: deptScope || req.body.department,
    classBatch: targetClassBatch,
    course,
    studentId,
    viewType: viewType || 'subject',
    force: force !== undefined ? Boolean(force) : true, // manual trigger defaults to force=true
    customNote,
    triggeredBy,
  });

  res.json(summary);
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
