// Email is sent over HTTPS (port 443), bypassing blocked outbound SMTP ports (25/465/587) on Railway/Render.
// Supports:
// 1. Google Apps Script Webhook (free, sends from Gmail without domain verification)
// 2. Resend HTTPS API (fallback)
const { Resend } = require('resend');

let resendClient;

function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

async function sendMail({ to, subject, html }) {
  // 1. Primary: Google Apps Script Webhook (no custom domain required, works directly on Railway)
  if (process.env.GOOGLE_APPS_SCRIPT_URL) {
    try {
      const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          html,
          secret: process.env.GOOGLE_APPS_SCRIPT_SECRET || 'MY_CUSTOM_SECRET_KEY',
        }),
        redirect: 'follow',
      });

      const result = await response.json().catch(() => ({}));
      if (result.error) {
        console.error('[Mail] Google Apps Script webhook returned error:', result.error);
        throw new Error(result.error);
      }
      return { success: true, method: 'google_apps_script', ...result };
    } catch (err) {
      console.error('[Mail] Google Apps Script send failed:', err.message);
      if (!process.env.RESEND_API_KEY) {
        throw err;
      }
      console.warn('[Mail] Falling back to Resend API...');
    }
  }

  // 2. Fallback: Resend API
  if (process.env.RESEND_API_KEY) {
    const { data, error } = await getResendClient().emails.send({
      from: process.env.MAIL_FROM || 'onboarding@resend.dev',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[Mail] Resend send failed:', error);
      throw new Error(error.message || 'Failed to send email');
    }
    return data;
  }

  console.warn('[Mail] Neither GOOGLE_APPS_SCRIPT_URL nor RESEND_API_KEY is configured, skipping email to', to);
  return { skipped: true };
}

function defaulterEmailTemplate({ studentName, courseName, type, attendancePercent, threshold, recipientType = 'student' }) {
  const isParent = recipientType === 'parent';
  const greeting = isParent ? 'Dear Parent,' : `Dear ${studentName},`;
  const attendanceMessage = isParent
    ? `This is to inform you that your child, <b>${studentName}</b>, has <b>${type}</b> attendance in <b>${courseName}</b> below the required threshold.`
    : `Your <b>${type}</b> attendance in <b>${courseName}</b> has fallen below the required threshold.`;
  const actionText = isParent
    ? 'Please encourage your child to attend classes regularly and contact the department office for support if needed.'
    : 'Please ensure regular attendance to avoid being debarred from examinations. Contact your department office if you have concerns.';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color:#c0392b;">Attendance Alert: ${courseName}</h2>
      <p>${greeting}</p>
      <p>${attendanceMessage}</p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding:4px 12px; border:1px solid #ddd;">Current Attendance</td><td style="padding:4px 12px; border:1px solid #ddd;"><b>${attendancePercent}%</b></td></tr>
        <tr><td style="padding:4px 12px; border:1px solid #ddd;">Required Minimum</td><td style="padding:4px 12px; border:1px solid #ddd;">${threshold}%</td></tr>
      </table>
      <p>${actionText}</p>
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

function passwordChangedEmailTemplate({ studentName, email }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.6;">
      <h2 style="color:#27ae60; margin-bottom: 12px;">Password Changed Successfully</h2>
      <p>Dear ${studentName},</p>
      <p>Your password for the Attendance Management System has been updated successfully.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p>You can now log in with your new password.</p>
      <p style="color:#888; font-size: 12px;">This is an automated message from the Attendance Management System.</p>
    </div>
  `;
}

function facultyWelcomeEmailTemplate({ facultyName, email, password }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.6;">
      <h2 style="color:#1f6feb; margin-bottom: 12px;">Faculty Login Credentials</h2>
      <p>Dear ${facultyName},</p>
      <p>Your faculty account has been created for the Attendance Management System.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> <span style="font-family: monospace; background:#f4f4f4; padding:4px 8px; border-radius:4px;">${password}</span></p>
      <p>Please log in using the email above and change your password after your first successful login.</p>
      <p style="color:#888; font-size: 12px;">This is an automated message from the Attendance Management System.</p>
    </div>
  `;
}

async function sendPasswordChangedEmail({ studentName, email }) {
  const html = passwordChangedEmailTemplate({ studentName, email });
  return sendMail({
    to: email,
    subject: 'Your password has been changed',
    html,
  });
}

async function sendFacultyWelcomeEmail({ facultyName, email, password }) {
  const html = facultyWelcomeEmailTemplate({ facultyName, email, password });
  return sendMail({
    to: email,
    subject: 'Your faculty login credentials',
    html,
  });
}

module.exports = {
  sendMail,
  defaulterEmailTemplate,
  studentWelcomeEmailTemplate,
  sendStudentWelcomeEmail,
  passwordChangedEmailTemplate,
  sendPasswordChangedEmail,
  facultyWelcomeEmailTemplate,
  sendFacultyWelcomeEmail,
};
