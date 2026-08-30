const Notification = require('../models/Notification');
const { emitTo } = require('../socket');

async function list(req, res) {
  const n = await Notification.find({ userId: req.user.userId }).sort('-createdAt').limit(50);
  res.json(n);
}

async function markRead(req, res) {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { read: true },
    { new: true }
  );
  res.json(n);
}

async function markAllRead(req, res) {
  await Notification.updateMany({ userId: req.user.userId, read: false }, { read: true });
  emitTo(String(req.user.userId), 'notifications:read-all');
  res.json({ ok: true });
}

async function clearAll(req, res) {
  await Notification.deleteMany({ userId: req.user.userId });
  emitTo(String(req.user.userId), 'notifications:cleared');
  res.json({ ok: true });
}

module.exports = { list, markRead, markAllRead, clearAll };
