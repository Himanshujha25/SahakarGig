const mongoose = require('mongoose');
const User = require('../models/User');
const Provider = require('../models/Provider');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/favorites/ids — lightweight list of saved provider ids (for UI sync).
async function getFavoriteIds(req, res) {
  const user = req.user?.userId
    ? await User.findById(req.user.userId).select('favorites').lean()
    : null;
  res.json(user?.favorites || []);
}

// GET /api/favorites — populated list of saved providers.
async function getFavorites(req, res) {
  const user = await User.findById(req.user.userId).select('favorites').lean();
  const ids = user?.favorites || [];

  const list = [];
  for (const id of ids) {
    const p = await Provider.findById(id)
      .populate('cooperativeId', 'name district state')
      .populate('userId', 'name email phone');
    if (!p) continue;

    let base = 50;
    if (p.verified) base += 20;
    if (p.rating >= 4.5) base += 15;
    if (p.completedJobs >= 10) base += 15;
    list.push({
      ...p.toObject(),
      trustScore: Math.min(100, base),
      isFavorite: true,
    });
  }
  res.json(list);
}

// POST /api/favorites/:providerId
async function addFavorite(req, res) {
  const { providerId } = req.params;
  if (!isValidId(providerId)) {
    return res.status(400).json({ message: 'Invalid provider id' });
  }
  const provider = await Provider.findById(providerId);
  if (!provider) {
    return res.status(404).json({ message: 'Provider not found' });
  }
  await User.findByIdAndUpdate(req.user.userId, {
    $addToSet: { favorites: providerId },
  });
  res.json({ success: true, isFavorite: true });
}

// DELETE /api/favorites/:providerId
async function removeFavorite(req, res) {
  const { providerId } = req.params;
  if (!isValidId(providerId)) {
    return res.status(400).json({ message: 'Invalid provider id' });
  }
  await User.findByIdAndUpdate(req.user.userId, {
    $pull: { favorites: providerId },
  });
  res.json({ success: true, isFavorite: false });
}

module.exports = {
  getFavoriteIds,
  getFavorites,
  addFavorite,
  removeFavorite,
};