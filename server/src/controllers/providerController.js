const path = require('path');
const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { haversine, computeTrustScore } = require('../utils/helpers');

async function listProviders(req, res) {
  const { category, lat, lng, radius, cooperativeId } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);

  const filter = {};
  if (cooperativeId) filter.cooperativeId = cooperativeId;
  if (category) filter.skills = { $regex: new RegExp(`^${category}$`, 'i') };

  let providers = await Provider.find(filter)
    .populate('userId', 'name')
    .populate('cooperativeId', 'name')
    .lean();

  // geo filter (Haversine — must stay in-app, no 2dsphere index)
  if (lat && lng) {
    const r = parseFloat(radius) || 10;
    providers = providers.filter((p) => haversine({ lat: +lat, lng: +lng }, p.geoLocation) <= r);
  }

  const total = providers.length;
  const paginated = providers.slice((page - 1) * limit, page * limit);

  res.json({
    providers: paginated.map((p) => ({ ...p, trustScore: p.trustScore ?? 0 })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

async function listCooperatives(req, res) {
  const coops = await Cooperative.find().select('name region registrationId');
  res.json(coops);
}

async function getProvider(req, res) {
  const p = await Provider.findById(req.params.id)
    .populate('userId', 'name email phone')
    .populate('cooperativeId', 'name');
  if (!p) return res.status(404).json({ message: 'Not found' });
  const score = await computeTrustScore(p._id);
  const bookings = await Booking.find({ providerId: p._id });
  const reviews = await Review.find({ bookingId: { $in: bookings.map((b) => b._id) } })
    .populate('createdBy', 'name')
    .sort('-createdAt');
  res.json({ ...p.toObject(), trustScore: score, reviews });
}

async function getSlots(req, res) {
  const p = await Provider.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  // Upcoming active bookings — used to mark taken slots as unavailable.
  const bookings = await Booking.find({
    providerId: p._id,
    scheduledTime: { $ne: null },
    status: { $nin: ['cancelled', 'disputed'] },
  })
    .select('scheduledTime status service')
    .sort('scheduledTime');
  res.json({ availabilitySlots: p.availabilitySlots || [], bookings });
}

async function me(req, res) {
  const p = await Provider.findOne({ userId: req.user.userId }).populate('cooperativeId', 'name');
  if (!p) return res.status(401).json({ message: 'Provider record not found — please log in again' });
  const score = await computeTrustScore(p._id);
  res.json({ ...p.toObject(), trustScore: score });
}

async function updateProfile(req, res) {
  const { skills, hourlyRate, availabilitySlots, geoLocation } = req.body;
  const p = await Provider.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { skills, hourlyRate, availabilitySlots, geoLocation },
    { new: true }
  );
  if (!p) return res.status(404).json({ message: 'Provider not found' });
  res.json(p);
}

async function uploadDoc(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  // Store the URL path that can be served statically
  const fileUrl = `/uploads/${req.file.filename}`;
  const p = await Provider.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { $push: { documents: fileUrl } },
    { new: true }
  );
  if (!p) return res.status(404).json({ message: 'Provider not found' });
  res.json({ ...p.toObject(), uploadedUrl: fileUrl });
}

async function uploadAvatar(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  const avatarUrl = `/uploads/${req.file.filename}`;
  const p = await Provider.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { avatar: avatarUrl },
    { new: true }
  );
  if (!p) return res.status(404).json({ message: 'Provider not found' });
  res.json({ ...p.toObject(), avatar: avatarUrl });
}

module.exports = { listProviders, listCooperatives, getProvider, me, updateProfile, uploadDoc, uploadAvatar };
