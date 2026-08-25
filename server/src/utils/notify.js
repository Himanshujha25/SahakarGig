const Notification = require('../models/Notification');
const { emitTo } = require('../socket');

async function notify(userId, type, message, bookingId) {
  try {
    const n = await Notification.create({ userId, type, message, bookingId });
    emitTo(userId.toString(), 'notification', n);
    return n;
  } catch (e) {
    console.error('notify error', e.message);
  }
}

module.exports = notify;
