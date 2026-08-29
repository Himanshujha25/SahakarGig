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

function payoutReceiptTemplate({ name, payout }) {
  const dateStr = new Date(payout.createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <!-- Emblem Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e6b65 100%); padding: 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #84cc16;">🏛️ SAHAKARGIG COOPERATIVE</div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #cbd5e1; margin-top: 4px;">Ministry of Cooperation Registered Federation</div>
      </div>

      <!-- Content Body -->
      <div style="padding: 28px;">
        <!-- Official Verification Stamp Badge -->
        <div style="border: 2px dashed #16a34a; background: #f0fdf4; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 14px; font-weight: 800; color: #15803d; letter-spacing: 0.5px;">🛡️ OFFICIAL COOPERATIVE PAYOUT DISBURSED</div>
          <div style="font-size: 11.5px; color: #166534; margin-top: 4px; font-family: monospace;">STAMP VERIFICATION ID: <strong>${payout.cooperativeStampId || 'DELHI-COOP-SECT-2026-STAMP-89412'}</strong></div>
        </div>

        <p style="font-size: 15px; color: #334155; margin-bottom: 16px; font-weight: 600;">Dear ${name || 'Cooperative Provider'},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Your requested payout has been successfully approved and transferred to your account via <strong>Razorpay Cooperative Escrow</strong>.
        </p>

        <!-- Receipt Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Receipt ID</td>
            <td style="padding: 10px 14px; color: #0f172a; font-weight: 700; text-align: right; font-family: monospace;">${payout.payoutId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Disbursed Amount</td>
            <td style="padding: 10px 14px; color: #16a34a; font-weight: 900; font-size: 20px; text-align: right;">₹${payout.amount}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Transaction Ref (Bank/UPI)</td>
            <td style="padding: 10px 14px; color: #0f172a; font-weight: 700; text-align: right; font-family: monospace;">${payout.transactionRef}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Payment Gateway</td>
            <td style="padding: 10px 14px; color: #0f172a; font-weight: 600; text-align: right;">${payout.paymentMethod || 'Razorpay Escrow (UPI)'}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Disbursed Timestamp</td>
            <td style="padding: 10px 14px; color: #0f172a; font-weight: 600; text-align: right;">${dateStr}</td>
          </tr>
        </table>

        <div style="background: #f1f5f9; border-radius: 10px; padding: 14px; font-size: 12px; color: #475569; line-height: 1.5;">
          ℹ️ <strong>Cooperative Policy Compliance:</strong> Daily instant payout limits (Max ₹5,000/day) are enforced to protect cooperative reserve funds. All payouts are verified against official government e-Shram identities.
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
        © 2026 SahakarGig Cooperative Federation • Govt of India Registered Escrow Protocol
      </div>
    </div>
  `;
}

async function sendPayoutReceiptEmail({ email, name, payout }) {
  return sendMail({
    to: email,
    subject: `Official Cooperative Payout Receipt [${payout.payoutId}] — Disbursed ₹${payout.amount}`,
    text: `Hi ${name},\n\nYour payout of ₹${payout.amount} has been successfully disbursed!\nReceipt ID: ${payout.payoutId}\nTxn Ref: ${payout.transactionRef}\n\n— SahakarGig Team`,
    html: payoutReceiptTemplate({ name, payout }),
  });
}

module.exports = { getTransporter, sendMail, sendOtpEmail, sendPayoutReceiptEmail };
