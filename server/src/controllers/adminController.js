const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const Payment = require('../models/Payment');
const { computeTrustScore } = require('../utils/helpers');

async function getCoop(req) {
  const coop = await Cooperative.findOne({ adminId: req.user.userId });
  if (!coop) {
    const e = new Error('No cooperative linked to this admin');
    e.status = 403;
    throw e;
  }
  return coop;
}

async function dashboard(req, res) {
  const coop = await getCoop(req);
  const providers = await Provider.find({ cooperativeId: coop._id });
  const providerIds = providers.map((p) => p._id);
  const bookings = await Booking.find({ providerId: { $in: providerIds } });
  const payments = await Payment.find({ bookingId: { $in: bookings.map((b) => b._id) }, status: 'released' });
  const revenue = payments.reduce((s, p) => s + p.cooperativeCommission, 0);
  res.json({
    totalBookings: bookings.length,
    revenue,
    pendingVerifications: providers.filter((p) => !p.verified).length,
    activeDisputes: bookings.filter((b) => b.status === 'disputed').length,
    providers: providers.length,
  });
}

async function pendingVerifications(req, res) {
  const coop = await getCoop(req);
  const p = await Provider.find({ cooperativeId: coop._id, verified: false }).populate('userId', 'name email phone');
  res.json(p);
}

async function verifyProvider(req, res) {
  const coop = await getCoop(req);
  const p = await Provider.findOneAndUpdate(
    { _id: req.params.providerId, cooperativeId: coop._id },
    { verified: true }, { new: true }
  );
  res.json(p);
}

async function disputes(req, res) {
  const coop = await getCoop(req);
  const providers = await Provider.find({ cooperativeId: coop._id });
  const b = await Booking.find({ providerId: { $in: providers.map((p) => p._id) }, status: 'disputed' })
    .populate('householdId', 'name');
  res.json(b);
}

async function resolveDispute(req, res) {
  const { outcome } = req.body; // 'refund' | 'provider'
  const b = await Booking.findById(req.params.bookingId);
  if (outcome === 'refund') {
    b.paymentStatus = 'refunded';
    const pay = await Payment.findOne({ bookingId: b._id });
    if (pay) { pay.status = 'refunded'; await pay.save(); }
  }
  b.status = 'completed';
  await b.save();
  res.json(b);
}

async function getCommission(req, res) {
  const coop = await getCoop(req);
  res.json({ commissionRate: coop.commissionRate });
}

async function updateCommission(req, res) {
  const coop = await getCoop(req);
  coop.commissionRate = req.body.rate;
  await coop.save();
  res.json(coop);
}

async function leaderboard(req, res) {
  const coop = await getCoop(req);
  const providers = await Provider.find({ cooperativeId: coop._id }).populate('userId', 'name');
  const out = [];
  for (const p of providers) {
    const score = await computeTrustScore(p._id);
    const pay = await Payment.aggregate([
      { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'b' } },
      { $match: { 'b.providerId': p._id, status: 'released' } },
      { $group: { _id: null, total: { $sum: '$providerPayout' } } },
    ]);
    out.push({ id: p._id, name: p.userId?.name, skill: p.skills[0], trustScore: score, earnings: pay[0]?.total || 0 });
  }
  out.sort((a, b) => b.trustScore - a.trustScore);
  res.json(out);
}

async function listProviders(req, res) {
  const coop = await getCoop(req);
  const p = await Provider.find({ cooperativeId: coop._id }).populate('userId', 'name');
  res.json(p);
}

module.exports = {
  dashboard, pendingVerifications, verifyProvider, disputes, resolveDispute,
  getCommission, updateCommission, leaderboard, listProviders,
};
