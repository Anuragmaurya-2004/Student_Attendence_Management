const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Mail] SMTP not configured, skipping email to', to);
    return { skipped: true };
  }
  const info = await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  return info;
}

function defaulterEmailTemplate({ studentName, courseName, type, attendancePercent, threshold }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color:#c0392b;">Attendance Alert: ${courseName}</h2>
      <p>Dear ${studentName},</p>
      <p>Your <b>${type}</b> attendance in <b>${courseName}</b> has fallen below the required threshold.</p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding:4px 12px; border:1px solid #ddd;">Current Attendance</td><td style="padding:4px 12px; border:1px solid #ddd;"><b>${attendancePercent}%</b></td></tr>
        <tr><td style="padding:4px 12px; border:1px solid #ddd;">Required Minimum</td><td style="padding:4px 12px; border:1px solid #ddd;">${threshold}%</td></tr>
      </table>
      <p>Please ensure regular attendance to avoid being debarred from examinations. Contact your department office if you have concerns.</p>
      <p style="color:#888; font-size: 12px;">This is an automated message from the Attendance Management System.</p>
    </div>
  `;
}

function studentWelcomeEmailTemplate({ studentName, email, password, rollNo }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.6;">
      <h2 style="color:#1f6feb; margin-bottom: 12px;">Student Login Credentials</h2>
      <p>Dear ${studentName},</p>
      <p>Your student account has been created for the Attendance Management System.</p>
      <p><strong>Roll Number:</strong> ${rollNo}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> <span style="font-family: monospace; background:#f4f4f4; padding:4px 8px; border-radius:4px;">${password}</span></p>
      <p>Please log in using the email above and change your password after your first successful login.</p>
      <p style="color:#888; font-size: 12px;">This is an automated message from the Attendance Management System.</p>
    </div>
  `;
}

async function sendStudentWelcomeEmail({ studentName, email, password, rollNo }) {
  const html = studentWelcomeEmailTemplate({ studentName, email, password, rollNo });
  return sendMail({
    to: email,
    subject: 'Your student login credentials',
    html,
  });
}

module.exports = { sendMail, defaulterEmailTemplate, studentWelcomeEmailTemplate, sendStudentWelcomeEmail };
