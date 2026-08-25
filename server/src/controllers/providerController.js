const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const User = require('../models/User');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { haversine, computeTrustScore } = require('../utils/helpers');

async function listProviders(req, res) {
  const { category, lat, lng, radius, cooperativeId } = req.query;
  let providers = await Provider.find(cooperativeId ? { cooperativeId } : {})
    .populate('userId', 'name')
    .populate('cooperativeId', 'name');

  if (category) {
    const cat = category.toLowerCase();
    providers = providers.filter((p) => p.skills.map((s) => s.toLowerCase()).includes(cat));
  }
  if (lat && lng) {
    const r = parseFloat(radius) || 10;
    providers = providers.filter((p) => haversine({ lat: +lat, lng: +lng }, p.geoLocation) <= r);
  }

  const out = [];
  for (const p of providers) {
    const score = await computeTrustScore(p._id);
    out.push({ ...p.toObject(), trustScore: score });
  }
  res.json(out);
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

async function me(req, res) {
  const p = await Provider.findOne({ userId: req.user.userId }).populate('cooperativeId', 'name');
  if (!p) return res.status(404).json({ message: 'Provider not found' });
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
  if (!req.file) return res.status(400).json({ message: 'No file' });
  const p = await Provider.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { $push: { documents: req.file.originalname } },
    { new: true }
  );
  res.json(p);
}

module.exports = { listProviders, listCooperatives, getProvider, me, updateProfile, uploadDoc };
