const cron = require('node-cron');
const Student = require('../models/Student');
const DefaulterLog = require('../models/DefaulterLog');
const { computeAllDefaulters } = require('../services/defaulterService');
const { sendMail, defaulterEmailTemplate } = require('../services/mailService');

const NOTIFY_COOLDOWN_DAYS = 7; // don't spam - notify once per week per student+course

async function runDefaulterCheckAndNotify(options = {}) {
  const {
    department,
    classBatch,
    course,
    studentId,
    academicYear,
    viewType = 'subject',
    force = false, // If true, ignores 7-day cooldown (for manual HOD/Admin trigger)
    customNote = '',
    triggeredBy = '',
  } = options;

  console.log('[Defaulter Notification] Triggered @', new Date().toISOString(), {
    department,
    classBatch,
    course,
    studentId,
    viewType,
    force,
    triggeredBy,
  });

  const results = await computeAllDefaulters({
    academicYear,
    department,
    classBatch,
    course,
    viewType,
    logResults: true,
  });

  let defaulters = results.filter((r) => r.isDefaulter);
  if (studentId) {
    defaulters = defaulters.filter((d) => d.student?.toString() === studentId.toString());
  }

  let notifiedCount = 0;
  let emailsSent = 0;
  let skippedCount = 0;

  for (const d of defaulters) {
    let log = null;
    if (d.course && d.academicYear && ['theory', 'practical', 'project'].includes(d.type)) {
      log = await DefaulterLog.findOne({
        student: d.student,
        course: d.course,
        type: d.type,
        academicYear: d.academicYear,
      });
    }

    if (!force && log) {
      const alreadyNotifiedRecently =
        log.notifiedAt && Date.now() - log.notifiedAt.getTime() < NOTIFY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      if (alreadyNotifiedRecently) {
        skippedCount++;
        continue;
      }
    }

    const student = await Student.findById(d.student);
    if (!student) continue;

    const studentHtml = defaulterEmailTemplate({
      studentName: student.name,
      courseName: d.courseName,
      type: d.type,
      attendancePercent: d.attendancePercent,
      threshold: d.threshold,
      recipientType: 'student',
      isOverall: Boolean(d.isOverall),
      failingCoursesList: d.failingCoursesList,
      customNote,
      triggeredBy,
    });

    const parentHtml = student.parentEmail
      ? defaulterEmailTemplate({
          studentName: student.name,
          courseName: d.courseName,
          type: d.type,
          attendancePercent: d.attendancePercent,
          threshold: d.threshold,
          recipientType: 'parent',
          isOverall: Boolean(d.isOverall),
          failingCoursesList: d.failingCoursesList,
          customNote,
          triggeredBy,
        })
      : null;

    let studentEmailSuccess = false;
    let parentEmailSuccess = false;

    try {
      if (student.email) {
        const subject = d.isOverall
          ? `Overall Attendance Shortage Alert: ${student.name} (${d.attendancePercent}%)`
          : `Attendance Alert: ${d.courseName || 'Subject'} (${d.type || 'Theory'}) - ${d.attendancePercent}%`;
        await sendMail({
          to: student.email,
          subject,
          html: studentHtml,
        });
        emailsSent++;
        studentEmailSuccess = true;
      }

      if (student.parentEmail && parentHtml) {
        const parentSubject = d.isOverall
          ? `Attendance Alert for your child (${student.name}): Cumulative ${d.attendancePercent}%`
          : `Attendance alert for your child (${student.name}): ${d.courseName || 'Subject'} (${d.type || 'Theory'})`;
        await sendMail({
          to: student.parentEmail,
          subject: parentSubject,
          html: parentHtml,
        });
        emailsSent++;
        parentEmailSuccess = true;
      }

      if (studentEmailSuccess || parentEmailSuccess) {
        notifiedCount++;
      }

      if (log) {
        log.notifiedAt = new Date();
        log.channel = 'email';
        await log.save();
      }

      // Dispatch In-App notification to student
      try {
        const { createNotification } = require('../utils/notificationService');
        await createNotification({
          title: d.isOverall ? 'Cumulative Attendance Alert: Below 75%' : 'Attendance Alert: Below Threshold',
          message: d.isOverall
            ? `Your overall attendance is currently ${d.attendancePercent}%, below the required ${d.threshold}% threshold.${customNote ? ` Note: ${customNote}` : ''}`
            : `Your attendance in ${d.courseName || 'course'} (${d.type || 'Theory'}) is currently ${d.attendancePercent}%, below the required ${d.threshold}% threshold.${customNote ? ` Note: ${customNote}` : ''}`,
          type: 'warning',
          link: '/student',
          recipient: student._id,
          recipientModel: 'Student',
          recipientRole: 'student',
        });
      } catch (inAppErr) {
        console.error(`[Defaulter Notification] In-app notification failed for ${student.email}:`, inAppErr);
      }

      console.log(`[Defaulter Notification] Notified ${student.email} for ${d.courseName || 'Overall'} - ${d.attendancePercent}%`);
    } catch (err) {
      console.error(`[Defaulter Notification] Failed to notify ${student.email}:`, err.message);
    }
  }

  if (defaulters.length > 0) {
    try {
      const { createNotification } = require('../utils/notificationService');
      await createNotification({
        title: triggeredBy ? `Defaulter Notifications Sent by ${triggeredBy}` : 'Defaulter Review Triggered',
        message: `${notifiedCount} student(s) notified (${emailsSent} email(s) dispatched) out of ${defaulters.length} identified defaulters.`,
        type: 'info',
        link: '/admin/defaulters',
        recipientRole: 'admin',
      });
    } catch (adminNotifErr) {
      console.error('[Defaulter Notification] Failed to send admin summary notification:', adminNotifErr);
    }
  }

  const summary = {
    success: true,
    totalDefaulters: defaulters.length,
    notifiedCount,
    emailsSent,
    skippedCount,
    message: notifiedCount > 0
      ? `Email notifications successfully dispatched: ${notifiedCount} student(s) notified (${emailsSent} email(s) sent).`
      : (defaulters.length === 0
        ? 'No defaulters found matching the selected criteria.'
        : `All ${defaulters.length} defaulters were already notified within the last 7 days. Enable "Force Send" to re-notify them.`),
  };

  console.log(`[Defaulter Notification] Run complete:`, summary);
  return summary;
}

// Schedule: every day at 18:00 server time
function startCronJobs() {
  cron.schedule('0 18 * * *', () => {
    runDefaulterCheckAndNotify().catch((err) => console.error('[Cron] Error:', err));
  });
  console.log('[Cron] Defaulter check scheduled daily at 18:00');
}

module.exports = { startCronJobs, runDefaulterCheckAndNotify };
