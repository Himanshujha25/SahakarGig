const Notification = require('../models/Notification');
const { emitTo } = require('../socket');
const nodemailer = require('nodemailer');

// Lazy-create transporter only when EMAIL_USER is configured
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

const TYPE_SUBJECT = {
  booking_request:  'New Booking Request — SahakarGig',
  booking_accepted: 'Booking Accepted — SahakarGig',
  booking_status:   'Booking Status Update — SahakarGig',
  booking_cancelled:'Booking Cancelled — SahakarGig',
  dispute:          'Dispute Raised — SahakarGig',
  payment_released: 'Payment Released — SahakarGig',
};

async function notify(userId, type, message, bookingId) {
  try {
    const n = await Notification.create({ userId, type, message, bookingId });
    emitTo(userId.toString(), 'notification', n);

    // Email — fire-and-forget, never block the main flow
    const transporter = getTransporter();
    if (transporter) {
      const User = require('../models/User');
      const user = await User.findById(userId).select('email name');
      if (user?.email) {
        transporter.sendMail({
          from: `"SahakarGig" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: TYPE_SUBJECT[type] || 'Notification — SahakarGig',
          text: `Hi ${user.name},\n\n${message}\n\n— SahakarGig Team`,
          html: `<p>Hi <strong>${user.name}</strong>,</p><p>${message}</p><p>— SahakarGig Team</p>`,
        }).catch((e) => console.error('[email] send failed:', e.message));
      }
    }

    return n;
  } catch (e) {
    console.error('notify error', e.message);
  }
}

module.exports = notify;
