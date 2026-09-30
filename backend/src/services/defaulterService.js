const mongoose = require('mongoose');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Course = require('../models/Course');
const DefaulterLog = require('../models/DefaulterLog');
const Faculty = require('../models/Faculty');

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
    status: { $in: ['present', 'late', 'on_duty'] },
  }).populate('session');

  const onDutyRecords = attendedRecords.filter((a) => a.status === 'on_duty');
  const onDutyHours = onDutyRecords.reduce((sum, a) => sum + (a.session?.durationHours || 0), 0);
  const attendedHours = attendedRecords.reduce((sum, a) => sum + (a.session?.durationHours || 0), 0);

  const attendancePercent = totalHeldHours > 0 ? (attendedHours / totalHeldHours) * 100 : 100;

  return {
    student: studentId,
    course: courseId,
    type: course.type,
    academicYear: course.academicYear,
    attendedHours,
    onDutyHours,
    totalHeldHours,
    attendancePercent: Math.round(attendancePercent * 100) / 100,
    threshold: course.defaulterThresholdPercent || DEFAULT_THRESHOLD,
    isDefaulter: attendancePercent < (course.defaulterThresholdPercent || DEFAULT_THRESHOLD),
  };
}

/**
 * Compute attendance for active students with optional filtering:
 * - academicYear: specific academic year
 * - department: restrict to a specific department (e.g. for HOD)
 * - classBatch: restrict to a specific class batch
 * - facultyId: if provided:
 *     - If faculty is Class Teacher of a student's classBatch: all subjects for that student are included.
 *     - If faculty is NOT Class Teacher: only the specific course(s) assigned to that faculty are included.
 */
async function computeAllDefaulters({ academicYear, department, classBatch, facultyId, logResults = true } = {}) {
  const ClassBatch = require('../models/ClassBatch');
  const studentFilter = { status: 'active' };
  if (academicYear) studentFilter.currentAcademicYear = academicYear;
  if (department) {
    studentFilter.department = department;
    const deptBatches = await ClassBatch.find({ department }).select('_id');
    studentFilter.classBatch = { $in: deptBatches.map((b) => b._id) };
  } else if (classBatch) {
    studentFilter.classBatch = classBatch;
  }

  let faculty = null;
  let teacherBatches = [];
  let assignedCourses = [];

  if (facultyId) {
    faculty = await Faculty.findById(facultyId);
    if (faculty) {
      teacherBatches = (faculty.classTeacherOf || []).map((b) => b.toString());
      assignedCourses = (faculty.coursesAssigned || []).map((c) => c.toString());
    }
  }

  const students = await Student.find(studentFilter).populate('classBatch');

  const courseFilter = {};
  if (academicYear) courseFilter.academicYear = academicYear;
  if (department) courseFilter.department = department;
  const courses = await Course.find(courseFilter);

  const results = [];

  for (const student of students) {
    if (!student.classBatch) continue;
    const studentBatchId = student.classBatch._id ? student.classBatch._id.toString() : student.classBatch.toString();
    const isClassTeacher = teacherBatches.includes(studentBatchId);

    // If viewing as faculty, and neither class teacher nor has assigned courses, skip
    if (facultyId && !isClassTeacher && assignedCourses.length === 0) {
      continue;
    }

    // Match courses relevant to this student: same department + semester + academicYear
    let relevantCourses = courses.filter(
      (c) =>
        c.department.toString() === student.department.toString() &&
        (student.classBatch?.department?.toString() === student.department.toString() ||
          !student.classBatch?.department) &&
        c.semester === student.classBatch?.semester &&
        c.academicYear.toString() === student.currentAcademicYear.toString()
    );

    // Faculty scoping rule:
    // - Class Teacher sees ALL courses of their class batch
    // - Non-class-teacher sees ONLY specifically assigned courses
    if (facultyId && !isClassTeacher) {
      relevantCourses = relevantCourses.filter((c) => assignedCourses.includes(c._id.toString()));
    }

    for (const course of relevantCourses) {
      const result = await computeStudentCourseAttendance(student._id, course._id);
      results.push({
        ...result,
        studentName: student.name,
        rollNo: student.rollNo,
        courseName: course.name,
        courseCode: course.code,
        classBatchId: studentBatchId,
        classBatchName: student.classBatch?.name,
        isClassTeacherView: isClassTeacher,
      });

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
