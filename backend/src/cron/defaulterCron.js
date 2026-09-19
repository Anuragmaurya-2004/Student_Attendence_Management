const cron = require('node-cron');
const Student = require('../models/Student');
const DefaulterLog = require('../models/DefaulterLog');
const { computeAllDefaulters } = require('../services/defaulterService');
const { sendMail, defaulterEmailTemplate } = require('../services/mailService');

const NOTIFY_COOLDOWN_DAYS = 7; // don't spam - notify once per week per student+course

async function runDefaulterCheckAndNotify() {
  console.log('[Cron] Running defaulter check @', new Date().toISOString());
  const results = await computeAllDefaulters({ logResults: true });
  const defaulters = results.filter((r) => r.isDefaulter);

  for (const d of defaulters) {
    const log = await DefaulterLog.findOne({
      student: d.student,
      course: d.course,
      type: d.type,
      academicYear: d.academicYear,
    });
    if (!log) continue;

    const alreadyNotifiedRecently =
      log.notifiedAt && Date.now() - log.notifiedAt.getTime() < NOTIFY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (alreadyNotifiedRecently) continue;

    const student = await Student.findById(d.student);
    if (!student) continue;

    const studentHtml = defaulterEmailTemplate({
      studentName: student.name,
      courseName: d.courseName,
      type: d.type,
      attendancePercent: d.attendancePercent,
      threshold: d.threshold,
      recipientType: 'student',
    });

    const parentHtml = student.parentEmail
      ? defaulterEmailTemplate({
          studentName: student.name,
          courseName: d.courseName,
          type: d.type,
          attendancePercent: d.attendancePercent,
          threshold: d.threshold,
          recipientType: 'parent',
        })
      : null;

    try {
      if (student.email) {
        await sendMail({
          to: student.email,
          subject: `Your attendance alert: ${d.courseName} (${d.type})`,
          html: studentHtml,
        });
      }

      if (student.parentEmail && parentHtml) {
        await sendMail({
          to: student.parentEmail,
          subject: `Attendance alert for your child: ${d.courseName} (${d.type})`,
          html: parentHtml,
        });
      }

      log.notifiedAt = new Date();
      log.channel = 'email';
      await log.save();
      console.log(`[Cron] Notified ${student.email} and parent for ${d.courseName} (${d.type}) - ${d.attendancePercent}%`);
    } catch (err) {
      console.error(`[Cron] Failed to notify ${student.email}:`, err.message);
    }
  }
  console.log(`[Cron] Defaulter check complete. ${defaulters.length} defaulter records found.`);
}

// Schedule: every day at 18:00 server time
function startCronJobs() {
  cron.schedule('0 18 * * *', () => {
    runDefaulterCheckAndNotify().catch((err) => console.error('[Cron] Error:', err));
  });
  console.log('[Cron] Defaulter check scheduled daily at 18:00');
}

module.exports = { startCronJobs, runDefaulterCheckAndNotify };
