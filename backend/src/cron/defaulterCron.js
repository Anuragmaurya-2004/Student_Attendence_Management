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

    const html = defaulterEmailTemplate({
      studentName: student.name,
      courseName: d.courseName,
      type: d.type,
      attendancePercent: d.attendancePercent,
      threshold: d.threshold,
    });

    const recipients = [student.email, student.parentEmail].filter(Boolean).join(',');
    if (recipients) {
      try {
        await sendMail({ to: recipients, subject: `Attendance Alert: ${d.courseName} (${d.type})`, html });
        log.notifiedAt = new Date();
        log.channel = 'email';
        await log.save();
        console.log(`[Cron] Notified ${student.email} for ${d.courseName} (${d.type}) - ${d.attendancePercent}%`);
      } catch (err) {
        console.error(`[Cron] Failed to notify ${student.email}:`, err.message);
      }
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
