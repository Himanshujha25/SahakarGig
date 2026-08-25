const Notification = require('../models/Notification');

async function list(req, res) {
  const n = await Notification.find({ userId: req.user.userId }).sort('-createdAt');
  res.json(n);
}

async function markRead(req, res) {
  const n = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  res.json(n);
}

module.exports = { list, markRead };
