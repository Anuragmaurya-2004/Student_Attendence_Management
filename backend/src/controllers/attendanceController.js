const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Student = require('../models/Student');
const { verifyStudentLocation } = require('../services/geofenceService');
const { createNotification } = require('../utils/notificationService');

// @desc Student scans QR to mark their own attendance
// @route POST /api/attendance/check-in
// body: { sessionId, token, location: { latitude, longitude, accuracy } }
const checkIn = async (req, res) => {
  const { sessionId, token, location } = req.body;
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can self check-in via QR' });
  }

  const session = await Session.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found' });

  // Enforce overall QR attendance window
  if (session.qrWindowExpiresAt && session.qrWindowExpiresAt.getTime() < Date.now()) {
    if (!session.absentMarkedAt) {
      const { markUnscannedStudentsAbsent } = require('./sessionController');
      await markUnscannedStudentsAbsent(session._id);
    }
    return res.status(400).json({
      message: 'Attendance check-in has closed. The QR window has expired.',
    });
  }

  const isCurrentToken = session.qrToken === token && session.qrExpiresAt?.getTime() >= Date.now();
  const isPreviousToken = session.qrPreviousToken === token && session.qrPreviousExpiresAt?.getTime() >= Date.now();
  // A short-lived rotating token limits screenshot replay; the previous token is accepted only
  // during the configured grace period so a scan crossing a rotation is still usable.
  if (!isCurrentToken && !isPreviousToken) {
    return res.status(400).json({ message: 'QR code has expired or is invalid. Please scan the latest code on screen.' });
  }

  // Ensure student belongs to this session's class batch
  const student = await Student.findById(req.user.id);
  if (!student) {
    return res.status(404).json({ message: 'Student record not found.' });
  }
  const studentBatchId = student.classBatch?._id?.toString() || student.classBatch?.toString();
  const sessionBatchId = session.classBatch?._id?.toString() || session.classBatch?.toString();
  if (!studentBatchId || studentBatchId !== sessionBatchId) {
    return res.status(403).json({ message: 'You are not enrolled in this session’s class batch.' });
  }

  // Geofencing applies only to student QR self check-in.
  await session.populate('classBatch');
  const locationCheck = verifyStudentLocation(session.classBatch?.classroom, location);
  if (!locationCheck.ok) return res.status(400).json({ message: locationCheck.message });

  try {
    let attendance = await Attendance.findOne({ session: sessionId, student: req.user.id });
    if (attendance) {
      if (attendance.status === 'present' || attendance.status === 'late') {
        return res.status(400).json({ message: 'Attendance already marked for this session' });
      }
      attendance.status = 'present';
      attendance.method = 'qr';
      attendance.markedAt = new Date();
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        session: sessionId,
        student: req.user.id,
        status: 'present',
        method: 'qr',
      });
    }

    try {
      const populated = await Session.findById(sessionId).populate('course');
      await createNotification({
        title: 'Attendance Verified',
        message: `You were marked present for ${populated?.course?.code || 'lecture'} via QR check-in.`,
        type: 'success',
        link: '/student',
        recipient: req.user.id,
        recipientModel: 'Student',
        recipientRole: 'student',
      });
    } catch (notifErr) {
      console.error('Check-in notification error:', notifErr);
    }

    res.status(201).json(attendance);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }
    throw err;
  }
};

// @desc Faculty manually marks/updates attendance for a student in a session
// @route POST /api/attendance/manual
// body: { sessionId, studentId, status }
const markManual = async (req, res) => {
  const { sessionId, studentId, status } = req.body;
  const session = await Session.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (req.user.role === 'faculty' && session.faculty.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not your session' });
  }

  const attendance = await Attendance.findOneAndUpdate(
    { session: sessionId, student: studentId },
    { status: status || 'present', method: 'manual', markedBy: req.user.id, markedAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (session.status !== 'held') {
    session.status = 'held';
    await session.save();
  }

  try {
    const populated = await Session.findById(sessionId).populate('course');
    await createNotification({
      title: 'Attendance Status Updated',
      message: `Your attendance in ${populated?.course?.code || 'lecture'} was recorded as "${status || 'present'}" by instructor.`,
      type: status === 'present' ? 'success' : 'warning',
      link: '/student',
      recipient: studentId,
      recipientModel: 'Student',
      recipientRole: 'student',
    });
  } catch (notifErr) {
    console.error('Manual attendance notification error:', notifErr);
  }

  res.json(attendance);
};

// @desc Bulk mark attendance for a session (e.g. faculty marks whole class at once)
// @route POST /api/attendance/bulk
// body: { sessionId, records: [{ studentId, status }] }
const markBulk = async (req, res) => {
  const { sessionId, records } = req.body;
  const session = await Session.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (req.user.role === 'faculty' && session.faculty.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not your session' });
  }

  const ops = records.map((r) => ({
    updateOne: {
      filter: { session: sessionId, student: r.studentId },
      update: {
        $set: {
          status: r.status || 'present',
          method: 'manual',
          markedBy: req.user.id,
          markedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));
  const result = await Attendance.bulkWrite(ops);

  if (session.status !== 'held') {
    session.status = 'held';
    await session.save();
  }

  try {
    const populated = await Session.findById(sessionId).populate('course classBatch');
    await createNotification({
      title: 'Session Attendance Saved',
      message: `Master attendance marked for ${records.length} students in ${populated?.course?.code || 'session'} (${populated?.classBatch?.name || ''}).`,
      type: 'success',
      link: '/faculty',
      recipient: req.user.id,
      recipientRole: 'faculty',
    });
  } catch (notifErr) {
    console.error('Bulk attendance notification error:', notifErr);
  }

  res.json({ message: 'Bulk attendance saved', result });
};

const ClassBatch = require('../models/ClassBatch');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const { computeStudentCourseAttendance } = require('../services/defaulterService');
const { getDepartmentScope } = require('../utils/userScope');

// @desc Get attendance records for a session
// @route GET /api/attendance/session/:sessionId
const getBySession = async (req, res) => {
  const records = await Attendance.find({ session: req.params.sessionId }).populate('student', 'name rollNo email');
  res.json(records);
};

// @desc Get attendance history for a student
// @route GET /api/attendance/student/:studentId
const getByStudent = async (req, res) => {
  if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const student = await Student.findById(req.params.studentId);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const deptScope = getDepartmentScope(req);
  if (deptScope && student.department.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: Student is outside your department scope.' });
  }

  let records = await Attendance.find({ student: req.params.studentId })
    .populate({ path: 'session', populate: { path: 'course classBatch' } })
    .sort('-markedAt');

  // Faculty visibility logic:
  // - Class teacher sees ALL subject attendance
  // - Other faculty only sees attendance for their specifically assigned courses
  if (req.user.role === 'faculty') {
    const faculty = await Faculty.findById(req.user.id);
    if (faculty) {
      const isClassTeacher = (faculty.classTeacherOf || []).some(
        (b) => b.toString() === student.classBatch.toString()
      );
      if (!isClassTeacher) {
        const assignedCourses = (faculty.coursesAssigned || []).map((c) => c.toString());
        records = records.filter((r) => assignedCourses.includes(r.session?.course?._id?.toString()));
      }
    }
  }

  res.json(records);
};

// @desc Get multi-subject attendance matrix for a class batch (Class Teacher / HOD / Admin)
// @route GET /api/attendance/class-matrix/:classBatchId
const getClassBatchMatrix = async (req, res) => {
  const { classBatchId } = req.params;
  const batch = await ClassBatch.findById(classBatchId)
    .populate('department academicYear')
    .populate('classTeacher', 'name email designation');
  if (!batch) return res.status(404).json({ message: 'Class batch not found' });

  const deptScope = getDepartmentScope(req);
  if (deptScope && batch.department?._id?.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: Class batch is outside your department.' });
  }

  if (req.user.role === 'faculty') {
    const faculty = await Faculty.findById(req.user.id);
    const isClassTeacher =
      (faculty?.classTeacherOf || []).some((b) => b.toString() === batch._id.toString()) ||
      batch.classTeacher?._id?.toString() === req.user.id;

    if (!isClassTeacher) {
      return res.status(403).json({
        message: 'Forbidden: Only the designated Class Teacher or HOD/Admin can view the full class attendance matrix.',
      });
    }
  }

  const courseQuery = {
    department: batch.department?._id || batch.department,
    semester: batch.semester,
  };
  const batchYear = batch.academicYear?._id || batch.academicYear;
  if (batchYear) {
    courseQuery.academicYear = batchYear;
  }
  const courses = await Course.find(courseQuery).sort('code');

  const students = await Student.find({ classBatch: batch._id, status: 'active' }).sort('rollNo');

  const matrix = [];
  for (const student of students) {
    const courseStats = [];
    let studentTotalAttended = 0;
    let studentTotalHeld = 0;
    let studentOnDuty = 0;

    for (const course of courses) {
      const stats = await computeStudentCourseAttendance(student._id, course._id, batch._id);
      courseStats.push({
        courseId: course._id,
        courseName: course.name,
        courseCode: course.code,
        type: course.type,
        attendedHours: stats.attendedHours,
        onDutyHours: stats.onDutyHours,
        totalHeldHours: stats.totalHeldHours,
        attendancePercent: stats.attendancePercent,
        threshold: stats.threshold,
        isDefaulter: stats.isDefaulter,
      });
      studentTotalAttended += stats.attendedHours;
      studentTotalHeld += stats.totalHeldHours;
      studentOnDuty += stats.onDutyHours;
    }

    const overallPercent =
      studentTotalHeld > 0 ? Math.round((studentTotalAttended / studentTotalHeld) * 10000) / 100 : 100;
    const isOverallDefaulter = overallPercent < 75 || courseStats.some((c) => c.isDefaulter);

    matrix.push({
      student: {
        _id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        email: student.email,
        phone: student.phone,
        status: student.status,
      },
      courses: courseStats,
      overall: {
        totalAttendedHours: studentTotalAttended,
        totalHeldHours: studentTotalHeld,
        onDutyHours: studentOnDuty,
        overallPercent,
        isDefaulter: isOverallDefaulter,
      },
    });
  }

  res.json({
    classBatch: batch,
    courses,
    matrix,
  });
};

module.exports = {
  checkIn,
  markManual,
  markBulk,
  getBySession,
  getByStudent,
  getClassBatchMatrix,
};
