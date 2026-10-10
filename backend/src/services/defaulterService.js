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
 * Only counts sessions with status "held" or where attendance was recorded for that student's class batch.
 * Holidays are naturally excluded because sessions are never created on holiday dates.
 */
async function computeStudentCourseAttendance(studentId, courseId, classBatchId = null) {
  const course = await Course.findById(courseId);
  if (!course) throw new Error('Course not found');

  let batchId = classBatchId;
  if (!batchId) {
    const student = await Student.findById(studentId).select('classBatch');
    batchId = student?.classBatch?._id || student?.classBatch;
  }

  // Scoped to this course and student's batch
  const sessionQuery = {
    course: courseId,
    status: { $ne: 'cancelled' },
  };
  if (batchId) {
    sessionQuery.classBatch = batchId;
  }

  const candidateSessions = await Session.find(sessionQuery);
  const candidateIds = candidateSessions.map((s) => s._id);

  // A session is held if marked 'held' OR attendance records exist
  const sessionsWithAttendance = await Attendance.distinct('session', {
    session: { $in: candidateIds },
  });
  const attendedSessionIdSet = new Set(sessionsWithAttendance.map((id) => id.toString()));

  const heldSessions = candidateSessions.filter(
    (s) => s.status === 'held' || attendedSessionIdSet.has(s._id.toString())
  );

  const totalHeldHours = heldSessions.reduce((sum, s) => {
    const dur = s.durationHours && s.durationHours > 0 ? s.durationHours : 1;
    return sum + dur;
  }, 0);
  const heldSessionIds = heldSessions.map((s) => s._id);

  const attendedRecords = await Attendance.find({
    session: { $in: heldSessionIds },
    student: studentId,
    status: { $in: ['present', 'late', 'on_duty'] },
  }).populate('session');

  const onDutyRecords = attendedRecords.filter((a) => a.status === 'on_duty');
  const onDutyHours = onDutyRecords.reduce((sum, a) => {
    const dur = a.session?.durationHours && a.session.durationHours > 0 ? a.session.durationHours : 1;
    return sum + dur;
  }, 0);
  const attendedHours = attendedRecords.reduce((sum, a) => {
    const dur = a.session?.durationHours && a.session.durationHours > 0 ? a.session.durationHours : 1;
    return sum + dur;
  }, 0);

  const attendancePercent = totalHeldHours > 0 ? (attendedHours / totalHeldHours) * 100 : 0;

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
    hasSessions: totalHeldHours > 0,
    isDefaulter: totalHeldHours > 0 && attendancePercent < (course.defaulterThresholdPercent || DEFAULT_THRESHOLD),
  };
}

/**
 * Compute attendance for active students with flexible filtering:
 * - academicYear: specific academic year
 * - department: restrict to a specific department (e.g. for HOD)
 * - classBatch: restrict to a specific class batch
 * - course: restrict to a specific course
 * - viewType: 'subject' (default, course-level) or 'overall' (class cumulative)
 * - facultyId: if provided:
 *     - If teacher teaches multiple classes, shows defaulters of their assigned subject(s) only.
 *     - If teacher is Class Teacher, can also view overall defaulters for their class.
 *     - HOD and Admin can view overall defaulters across all batches.
 */
async function computeAllDefaulters({
  academicYear,
  department,
  classBatch,
  course,
  facultyId,
  viewType = 'subject',
  logResults = true,
} = {}) {
  const ClassBatch = require('../models/ClassBatch');
  let faculty = null;
  let teacherBatches = [];
  let assignedBatches = [];
  let allFacultyBatches = [];
  let assignedCourses = [];

  if (facultyId) {
    faculty = await Faculty.findById(facultyId);
    if (faculty) {
      teacherBatches = (faculty.classTeacherOf || []).map((b) => b.toString());
      assignedBatches = (faculty.classBatchesAssigned || []).map((b) => b.toString());
      const sessionBatches = await Session.distinct('classBatch', { faculty: faculty._id });
      allFacultyBatches = Array.from(
        new Set([...teacherBatches, ...assignedBatches, ...sessionBatches.map((b) => b.toString())])
      );

      const assignedCourseList = (faculty.coursesAssigned || []).map((c) => c.toString());
      const sessionCourses = await Session.distinct('course', { faculty: faculty._id });
      assignedCourses = Array.from(
        new Set([...assignedCourseList, ...sessionCourses.map((c) => c.toString())])
      );
    }
  }

  const studentFilter = { status: 'active' };
  if (academicYear) studentFilter.currentAcademicYear = academicYear;

  if (classBatch) {
    if (facultyId && !allFacultyBatches.includes(classBatch.toString())) {
      return [];
    }
    studentFilter.classBatch = classBatch;
  } else if (facultyId) {
    if (allFacultyBatches.length === 0) {
      return [];
    }
    studentFilter.classBatch = { $in: allFacultyBatches };
  } else if (department) {
    studentFilter.department = department;
    const deptBatches = await ClassBatch.find({ department }).select('_id');
    studentFilter.classBatch = { $in: deptBatches.map((b) => b._id) };
  }

  const students = await Student.find(studentFilter).populate('classBatch').sort('rollNo');

  const courseFilter = {};
  if (academicYear) courseFilter.academicYear = academicYear;
  if (department) courseFilter.department = department;
  if (course) courseFilter._id = course;
  const directCourses = await Course.find(courseFilter);

  // Also include any courses that have sessions conducted or scheduled for any batches in scope
  const studentBatchIds = students.map((s) => s.classBatch?._id || s.classBatch).filter(Boolean);
  const sessionCourseIds = await Session.distinct('course', { classBatch: { $in: studentBatchIds } });
  const sessionCourseFilter = { _id: { $in: sessionCourseIds } };
  if (course) sessionCourseFilter._id = course;
  const sessionCourses = await Course.find(sessionCourseFilter);

  const courseMap = new Map();
  [...directCourses, ...sessionCourses].forEach((c) => {
    courseMap.set(c._id.toString(), c);
  });
  const courses = Array.from(courseMap.values());

  // Map each batch to the set of course IDs that have sessions for that batch
  const sessionPairs = await Session.find({ classBatch: { $in: studentBatchIds } }).select('classBatch course');
  const batchCourseMap = new Map();
  sessionPairs.forEach((sp) => {
    const bId = sp.classBatch.toString();
    if (!batchCourseMap.has(bId)) batchCourseMap.set(bId, new Set());
    if (sp.course) batchCourseMap.get(bId).add(sp.course.toString());
  });

  const results = [];

  if (viewType === 'overall') {
    // Overall cumulative defaulters view (Class Teacher & HOD / Admin)
    for (const student of students) {
      if (!student.classBatch) continue;
      const studentBatchId = student.classBatch._id
        ? student.classBatch._id.toString()
        : student.classBatch.toString();
      const isClassTeacher = teacherBatches.includes(studentBatchId);

      // Faculty can ONLY see overall defaulters for batches where they are designated Class Teacher
      if (facultyId && !isClassTeacher) {
        continue;
      }

      const relevantCourses = courses.filter((c) => {
        const cId = c._id.toString();
        const isSessionCourse = batchCourseMap.get(studentBatchId)?.has(cId);
        const isCurriculumCourse =
          c.department?.toString() === student.department?.toString() &&
          c.semester === student.classBatch?.semester;
        return isSessionCourse || isCurriculumCourse;
      });

      let totalAttended = 0;
      let totalHeld = 0;
      let totalOnDuty = 0;
      const failingCourses = [];

      for (const courseDoc of relevantCourses) {
        const stat = await computeStudentCourseAttendance(student._id, courseDoc._id, studentBatchId);
        totalAttended += stat.attendedHours;
        totalHeld += stat.totalHeldHours;
        totalOnDuty += stat.onDutyHours;
        if (stat.isDefaulter) {
          failingCourses.push({
            code: courseDoc.code,
            name: courseDoc.name,
            attendancePercent: stat.attendancePercent,
            threshold: stat.threshold,
          });
        }
      }

      const overallPercent = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 10000) / 100 : 0;
      const isDefaulter = totalHeld > 0 && (overallPercent < DEFAULT_THRESHOLD || failingCourses.length > 0);

      results.push({
        student: student._id,
        studentName: student.name,
        rollNo: student.rollNo,
        email: student.email,
        classBatchId: studentBatchId,
        classBatchName: student.classBatch?.name,
        attendedHours: totalAttended,
        onDutyHours: totalOnDuty,
        totalHeldHours: totalHeld,
        attendancePercent: overallPercent,
        threshold: DEFAULT_THRESHOLD,
        hasSessions: totalHeld > 0,
        isDefaulter,
        isOverall: true,
        isClassTeacherView: isClassTeacher,
        failingCoursesCount: failingCourses.length,
        failingCoursesList: failingCourses.map((f) => `${f.code} (${f.attendancePercent}%)`).join(', '),
      });
    }

    return results;
  }

  // viewType === 'subject'
  for (const student of students) {
    if (!student.classBatch) continue;
    const studentBatchId = student.classBatch._id
      ? student.classBatch._id.toString()
      : student.classBatch.toString();
    const isClassTeacher = teacherBatches.includes(studentBatchId);

    let relevantCourses = courses.filter((c) => {
      const cId = c._id.toString();
      const isSessionCourse = batchCourseMap.get(studentBatchId)?.has(cId);
      const isCurriculumCourse =
        c.department?.toString() === student.department?.toString() &&
        c.semester === student.classBatch?.semester;
      return isSessionCourse || isCurriculumCourse;
    });

    // Subject faculty scoping:
    // When a teacher teaches multiple classes, show defaulters of their assigned subject(s) only
    if (facultyId) {
      relevantCourses = relevantCourses.filter((c) => assignedCourses.includes(c._id.toString()));
    }

    for (const courseDoc of relevantCourses) {
      const result = await computeStudentCourseAttendance(student._id, courseDoc._id, studentBatchId);
      results.push({
        ...result,
        studentName: student.name,
        rollNo: student.rollNo,
        courseName: courseDoc.name,
        courseCode: courseDoc.code,
        classBatchId: studentBatchId,
        classBatchName: student.classBatch?.name,
        isClassTeacherView: isClassTeacher,
        isOverall: false,
      });

      if (logResults && result.isDefaulter) {
        await DefaulterLog.findOneAndUpdate(
          { student: student._id, course: courseDoc._id, type: courseDoc.type, academicYear: courseDoc.academicYear },
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
