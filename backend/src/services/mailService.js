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
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error('Email webhook returned HTTP ' + response.status);
      const result = await response.json();
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

function defaulterEmailTemplate({
  studentName,
  courseName,
  type,
  attendancePercent,
  threshold,
  recipientType = 'student',
  isOverall = false,
  failingCoursesList,
  customNote,
  triggeredBy,
}) {
  const isParent = recipientType === 'parent';
  const greeting = isParent ? 'Dear Parent,' : `Dear ${studentName},`;

  const subjectTitle = isOverall
    ? 'Overall Cumulative Attendance Alert'
    : `Attendance Alert: ${courseName || 'Course'}`;

  let attendanceMessage = '';
  if (isOverall) {
    attendanceMessage = isParent
      ? `This is an official notice regarding the cumulative attendance of your child, <b>${studentName}</b>. Their overall attendance has fallen to <b>${attendancePercent}%</b>, which is below the mandatory <b>${threshold}%</b> threshold.`
      : `This is an official notice that your overall cumulative attendance has fallen to <b>${attendancePercent}%</b>, which is below the mandatory <b>${threshold}%</b> threshold.`;
  } else {
    attendanceMessage = isParent
      ? `This is to inform you that your child, <b>${studentName}</b>, has <b>${type || 'Theory'}</b> attendance in <b>${courseName}</b> below the required threshold.`
      : `Your <b>${type || 'Theory'}</b> attendance in <b>${courseName}</b> has fallen below the required threshold.`;
  }

  const failingCoursesSection = failingCoursesList
    ? `<div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:10px 14px; margin:12px 0;">
        <span style="color:#b91c1c; font-weight:bold; font-size:13px;">Subjects with attendance shortage:</span>
        <p style="margin:4px 0 0 0; color:#7f1d1d; font-size:13px;">${failingCoursesList}</p>
       </div>`
    : '';

  const noteSection = customNote
    ? `<div style="background:#fffbeb; border-left:4px solid #f59e0b; border-radius:4px; padding:10px 14px; margin:14px 0;">
        <span style="color:#92400e; font-weight:bold; font-size:13px;">Note from Department / HOD:</span>
        <p style="margin:4px 0 0 0; color:#78350f; font-size:13px; white-space:pre-wrap;">${customNote}</p>
       </div>`
    : '';

  const actionText = isParent
    ? 'Please discuss this matter with your child and contact the Head of Department (HOD) or class teacher immediately to prevent eligibility issues during semester examinations.'
    : 'Please ensure regular class attendance immediately to avoid being debarred from semester examinations. Contact your HOD or class teacher if you have any questions.';

  const signoff = triggeredBy
    ? `<p style="margin-top:16px; font-size:13px; color:#475569;"><b>Issued by:</b> ${triggeredBy}</p>`
    : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; padding: 20px 24px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">${subjectTitle}</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Mandatory Minimum Attendance Quota Notice</p>
      </div>
      <div style="padding: 24px;">
        <p style="margin-top: 0; font-size: 15px;">${greeting}</p>
        <p style="font-size: 14px;">${attendanceMessage}</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
          <tbody>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">Student Name</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: bold;">${studentName}</td>
            </tr>
            ${!isOverall && courseName ? `
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">Course / Subject</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;">${courseName} (${type || 'Theory'})</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">Recorded Attendance</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #dc2626; font-weight: 800;">${attendancePercent}%</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 600;">Required Threshold</td>
              <td style="padding: 10px 16px; font-size: 13px; color: #16a34a; font-weight: 700;">${threshold}%</td>
            </tr>
          </tbody>
        </table>

        ${failingCoursesSection}
        ${noteSection}

        <p style="font-size: 13px; color: #334155; margin-top: 16px;">${actionText}</p>
        ${signoff}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 11px; margin: 0; text-align: center;">This is an official automated notification from the Attendance Management Portal.</p>
      </div>
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
