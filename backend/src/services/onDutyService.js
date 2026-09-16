const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Student = require('../models/Student');

/**
 * Apply On-Duty attendance records for a list of students across a multi-day date range.
 * Finds all sessions belonging to the students' class batches between fromDate (00:00:00) and toDate (23:59:59).
 */
async function applyOnDutyToSessions({ onDutyId, studentIds, fromDate, toDate, eventTitle, markedBy }) {
  // Normalize date boundaries for multi-day span
  const startOfDay = new Date(fromDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(toDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Retrieve students to know their class batches
  const students = await Student.find({ _id: { $in: studentIds } });
  if (!students.length) return { sessionsCount: 0, attendanceMarked: 0 };

  const classBatchIds = [...new Set(students.map((s) => s.classBatch.toString()))];

  // Find all held or scheduled sessions for these class batches in the multi-day range
  const sessions = await Session.find({
    classBatch: { $in: classBatchIds },
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  if (!sessions.length) {
    return { sessionsCount: 0, attendanceMarked: 0 };
  }

  let attendanceCount = 0;
  const bulkOps = [];

  for (const session of sessions) {
    // Find students who belong to this session's class batch
    const eligibleStudents = students.filter(
      (s) => s.classBatch.toString() === session.classBatch.toString()
    );

    for (const student of eligibleStudents) {
      bulkOps.push({
        updateOne: {
          filter: { session: session._id, student: student._id },
          update: {
            $set: {
              status: 'on_duty',
              method: 'on_duty',
              dutyReason: eventTitle,
              onDutyRef: onDutyId,
              markedAt: new Date(),
              markedBy: markedBy || undefined,
            },
          },
          upsert: true,
        },
      });
      attendanceCount++;
    }
  }

  if (bulkOps.length > 0) {
    await Attendance.bulkWrite(bulkOps);
  }

  return { sessionsCount: sessions.length, attendanceMarked: attendanceCount };
}

/**
 * Clean up / delete attendance records created for a specific OnDuty entry when deleted.
 */
async function removeOnDutyAttendance(onDutyId) {
  const result = await Attendance.deleteMany({ onDutyRef: onDutyId });
  return result;
}

module.exports = {
  applyOnDutyToSessions,
  removeOnDutyAttendance,
};
