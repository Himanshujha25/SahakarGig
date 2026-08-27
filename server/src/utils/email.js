const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return _transporter;
}

// Send an email. When SMTP is not configured, it still "works" by logging the
// message to the console (dev fallback) so OTP flows can be tested anywhere.
async function sendMail({ to, subject, text, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    const body = text || (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`\n[MAIL-DEV] → ${to}\n[MAIL-DEV] Subject: ${subject}\n[MAIL-DEV] Body: ${body}\n`);
    return { delivered: false, to, subject, body };
  }
  const info = await transporter.sendMail({
    from: `"SahakarGig" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: text || '',
    html: html || '',
  });
  return { delivered: true, to, subject, info };
}

const PURPOSE_LABEL = {
  signup: 'verify your email and complete your account registration',
  reset_password: 'reset your password',
  change_password: 'confirm the change to your password',
  verify_email: 'verify your email address',
  change_email: 'verify your new email address',
};

function otpTemplate({ code, purpose, name, minutes = 10 }) {
  const label = PURPOSE_LABEL[purpose] || 'verify your identity';
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
      <div style="background:#00288e;color:#fff;padding:22px 26px;font-size:18px;font-weight:700">SahakarGig</div>
      <div style="padding:26px">
        <p style="margin:0 0 12px;font-size:15px;color:#111827">Hi ${name || 'there'},</p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#374151">
          Use the one-time password below to <strong>${label}</strong>. It is valid for ${minutes} minutes.
        </p>
        <div style="background:#eef2ff;border:1px dashed #00288e;border-radius:10px;padding:18px;text-align:center;font-size:26px;font-weight:800;letter-spacing:6px;color:#00288e">${code}</div>
        <p style="margin:18px 0 0;font-size:12px;color:#6b7280">If you didn't request this, you can safely ignore this email.</p>
      </div>
    </div>
  `;
}

async function sendOtpEmail({ email, name, code, purpose, minutes = 10 }) {
  return sendMail({
    to: email,
    subject: `Your SahakarGig OTP — ${code}`,
    text: `Hi ${name || 'there'},\n\nYour SahakarGig OTP is ${code}. It is valid for ${minutes} minutes.\n\nIf you didn't request this, you can ignore this email.\n\n— SahakarGig Team`,
    html: otpTemplate({ code, purpose, name, minutes }),
  });
}

module.exports = { getTransporter, sendMail, sendOtpEmail };
