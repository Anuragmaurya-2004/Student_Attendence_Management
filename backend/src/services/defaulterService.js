const mongoose = require('mongoose');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Course = require('../models/Course');
const DefaulterLog = require('../models/DefaulterLog');

const DEFAULT_THRESHOLD = parseFloat(process.env.DEFAULTER_THRESHOLD_PERCENT || '75');

/**
 * Compute attendance % for one student, in one course, split by type (theory/practical).
 * Only counts sessions with status "held" (i.e. actually took place / QR was generated).
 * Holidays are naturally excluded because sessions are never created on holiday dates.
 */
async function computeStudentCourseAttendance(studentId, courseId) {
  const course = await Course.findById(courseId);
  if (!course) throw new Error('Course not found');

  const sessions = await Session.find({ course: courseId, status: 'held' });
  const totalHeldHours = sessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);

  const sessionIds = sessions.map((s) => s._id);
  const attendedRecords = await Attendance.find({
    session: { $in: sessionIds },
    student: studentId,
    status: { $in: ['present', 'late'] },
  }).populate('session');

  const attendedHours = attendedRecords.reduce((sum, a) => sum + (a.session?.durationHours || 0), 0);

  const attendancePercent = totalHeldHours > 0 ? (attendedHours / totalHeldHours) * 100 : 100;

  return {
    student: studentId,
    course: courseId,
    type: course.type,
    academicYear: course.academicYear,
    attendedHours,
    totalHeldHours,
    attendancePercent: Math.round(attendancePercent * 100) / 100,
    threshold: course.defaulterThresholdPercent || DEFAULT_THRESHOLD,
    isDefaulter: attendancePercent < (course.defaulterThresholdPercent || DEFAULT_THRESHOLD),
  };
}

/**
 * Compute attendance for ALL active students, ALL courses in their classBatch/department/semester,
 * split by theory vs practical. Returns array of results, and optionally logs defaulters.
 */
async function computeAllDefaulters({ academicYear, logResults = true } = {}) {
  const studentFilter = { status: 'active' };
  if (academicYear) studentFilter.currentAcademicYear = academicYear;
  const students = await Student.find(studentFilter).populate('classBatch');

  const courseFilter = {};
  if (academicYear) courseFilter.academicYear = academicYear;
  const courses = await Course.find(courseFilter);

  const results = [];

  for (const student of students) {
    // Match courses relevant to this student: same department + semester + academicYear
    const relevantCourses = courses.filter(
      (c) =>
        c.department.toString() === student.department.toString() &&
        c.semester === student.classBatch?.semester &&
        c.academicYear.toString() === student.currentAcademicYear.toString()
    );

    for (const course of relevantCourses) {
      const result = await computeStudentCourseAttendance(student._id, course._id);
      results.push({ ...result, studentName: student.name, rollNo: student.rollNo, courseName: course.name });

      if (logResults && result.isDefaulter) {
        await DefaulterLog.findOneAndUpdate(
          { student: student._id, course: course._id, type: course.type, academicYear: course.academicYear },
          {
            attendancePercent: result.attendancePercent,
            attendedHours: result.attendedHours,
            totalHeldHours: result.totalHeldHours,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }
  }

  return results;
}

module.exports = { computeStudentCourseAttendance, computeAllDefaulters, DEFAULT_THRESHOLD };
