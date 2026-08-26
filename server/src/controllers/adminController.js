const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const Payment = require('../models/Payment');

async function getCoop(req) {
  const coop = await Cooperative.findOne({ adminId: req.user.userId });
  if (!coop) {
    const e = new Error('No cooperative linked to this admin');
    e.status = 403;
    throw e;
  }
  return coop;
}

function buildRevenueSeries(payments, range = 'week') {
  const buckets = range === 'week' ? 7 : range === 'month' ? 30 : 12;
  const isMonthly = range === 'year';
  const now = Date.now();
  const series = [];

  for (let i = buckets - 1; i >= 0; i--) {
    let label;
    let from;
    if (isMonthly) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      label = d.toLocaleString('en-IN', { month: 'short' });
      from = new Date(d.getFullYear(), d.getMonth(), 1);
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      label = d.toLocaleString('en-IN', { day: 'numeric', month: 'short' });
      from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    series.push({ label, from: from.getTime(), value: 0 });
  }

  for (const p of payments) {
    const t = new Date(p.createdAt).getTime();
    if (t < series[0].from) continue;
    for (const b of series) {
      let inBucket;
      if (isMonthly) {
        const d = new Date(t);
        inBucket = d.getFullYear() === new Date(b.from).getFullYear() && d.getMonth() === new Date(b.from).getMonth();
      } else {
        inBucket = t >= b.from && t < b.from + 86400000;
      }
      if (inBucket) {
        b.value += p.cooperativeCommission || 0;
        break;
      }
    }
  }

  return series.map(({ label, value }) => ({ label, value }));
}

async function dashboard(req, res) {
  const coop = await getCoop(req);

  const [provAgg, bookAgg, payAgg] = await Promise.all([
    Provider.aggregate([
      { $match: { cooperativeId: coop._id } },
      { $group: { _id: null, total: { $sum: 1 }, verified: { $sum: { $cond: ['$verified', 1, 0] } }, pending: { $sum: { $cond: ['$verified', 0, 1] } } } },
    ]),
    Booking.aggregate([
      { $match: { cooperativeId: coop._id } },
      { $group: { _id: null, total: { $sum: 1 }, disputes: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'released' } },
      { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'b' } },
      { $unwind: '$b' },
      { $match: { 'b.cooperativeId': coop._id } },
      { $group: { _id: null, revenue: { $sum: '$cooperativeCommission' }, payments: { $push: '$$ROOT' } } },
    ]),
  ]);

  const payments = payAgg[0]?.payments ?? [];

  res.json({
    totalBookings: bookAgg[0]?.total ?? 0,
    revenue: payAgg[0]?.revenue ?? 0,
    pendingVerifications: provAgg[0]?.pending ?? 0,
    activeDisputes: bookAgg[0]?.disputes ?? 0,
    providers: provAgg[0]?.verified ?? 0,
    revenueSeries: buildRevenueSeries(payments, req.query.range),
    cooperativeName: coop.name,
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
  const b = await Booking.find({ cooperativeId: coop._id, status: 'disputed' })
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
  const agg = await Booking.aggregate([
    { $match: { cooperativeId: coop._id, status: 'completed' } },
    { $group: { _id: null, avg: { $avg: '$price' } } },
  ]);
  res.json({ commissionRate: coop.commissionRate, avgBookingValue: agg[0]?.avg ?? 0 });
}

async function updateCommission(req, res) {
  const coop = await getCoop(req);
  coop.commissionRate = req.body.rate;
  await coop.save();
  res.json(coop);
}

async function leaderboard(req, res) {
  const coop = await getCoop(req);

  const [providers, payAgg] = await Promise.all([
    Provider.find({ cooperativeId: coop._id }).populate('userId', 'name').lean(),
    Payment.aggregate([
      { $match: { status: 'released' } },
      { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'b' } },
      { $unwind: '$b' },
      { $match: { 'b.cooperativeId': coop._id } },
      { $group: { _id: '$b.providerId', total: { $sum: '$providerPayout' } } },
    ]),
  ]);

  const payMap = Object.fromEntries(payAgg.map((p) => [p._id.toString(), p.total]));
  const out = providers
    .map((p) => ({ id: p._id, name: p.userId?.name, skill: p.skills[0], trustScore: p.trustScore ?? 0, earnings: payMap[p._id.toString()] || 0 }))
    .sort((a, b) => b.trustScore - a.trustScore);
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
