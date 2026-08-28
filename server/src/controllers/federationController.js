const Federation = require('../models/Federation');
const Cooperative = require('../models/Cooperative');
const Provider = require('../models/Provider');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

async function getFed(req) {
  const fed = await Federation.findOne({ adminId: req.user.userId });
  if (!fed) { const e = new Error('No federation linked to this admin'); e.status = 403; throw e; }
  return fed;
}

async function dashboard(req, res) {
  const fed = await getFed(req);

  const coops = await Cooperative.find({ federationId: fed._id }).lean();
  const coopIds = coops.map((c) => c._id);

  // single aggregate: provider counts per coop
  const provAgg = await Provider.aggregate([
    { $match: { cooperativeId: { $in: coopIds } } },
    { $group: { _id: '$cooperativeId', total: { $sum: 1 }, verified: { $sum: { $cond: ['$verified', 1, 0] } } } },
  ]);
  const provMap = Object.fromEntries(provAgg.map((r) => [r._id.toString(), r]));

  const totalProviders = provAgg.reduce((s, r) => s + r.total, 0);
  const verifiedProviders = provAgg.reduce((s, r) => s + r.verified, 0);

  // single aggregate: booking counts + disputes per coop
  const bookAgg = await Booking.aggregate([
    { $match: { cooperativeId: { $in: coopIds } } },
    {
      $group: {
        _id: '$cooperativeId',
        total: { $sum: 1 },
        disputes: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } },
      },
    },
  ]);
  const bookMap = Object.fromEntries(bookAgg.map((r) => [r._id.toString(), r]));
  const totalBookings = bookAgg.reduce((s, r) => s + r.total, 0);
  const activeDisputes = bookAgg.reduce((s, r) => s + r.disputes, 0);

  // single aggregate: revenue per coop from released payments
  const payAgg = await Payment.aggregate([
    { $match: { status: 'released' } },
    { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'b' } },
    { $unwind: '$b' },
    { $match: { 'b.cooperativeId': { $in: coopIds } } },
    {
      $group: {
        _id: '$b.cooperativeId',
        coopRevenue: { $sum: '$cooperativeCommission' },
        fedRevenue: { $sum: '$federationCommission' },
        providerPayout: { $sum: '$providerPayout' },
      },
    },
  ]);
  const payMap = Object.fromEntries(payAgg.map((r) => [r._id.toString(), r]));

  const totalRevenue = payAgg.reduce((s, r) => s + r.fedRevenue, 0);
  const totalCoopRevenue = payAgg.reduce((s, r) => s + r.coopRevenue, 0);
  const totalProviderPayout = payAgg.reduce((s, r) => s + r.providerPayout, 0);

  const coopStats = coops.map((coop) => {
    const id = coop._id.toString();
    return {
      id: coop._id,
      name: coop.name,
      region: coop.region,
      providers: provMap[id]?.total ?? 0,
      verifiedProviders: provMap[id]?.verified ?? 0,
      bookings: bookMap[id]?.total ?? 0,
      revenue: payMap[id]?.coopRevenue ?? 0,
    };
  });

  res.json({
    federationName: fed.name,
    totalCooperatives: coops.length,
    totalProviders,
    verifiedProviders,
    totalBookings,
    activeDisputes,
    totalRevenue,
    totalCoopRevenue,
    totalProviderPayout,
    coopStats,
  });
}

async function listCooperatives(req, res) {
  const fed = await getFed(req);
  const coops = await Cooperative.find({ federationId: fed._id });
  res.json(coops);
}

async function onboardCooperative(req, res) {
  const fed = await getFed(req);
  const { cooperativeId } = req.body;
  const coop = await Cooperative.findByIdAndUpdate(
    cooperativeId,
    { federationId: fed._id },
    { new: true }
  );
  if (!coop) return res.status(404).json({ message: 'Cooperative not found' });
  await Federation.findByIdAndUpdate(fed._id, { $addToSet: { cooperativeIds: coop._id } });
  res.json(coop);
}

async function updateCommission(req, res) {
  const fed = await getFed(req);
  fed.commissionRate = req.body.rate;
  await fed.save();
  res.json(fed);
}

async function getCooperativeDetail(req, res) {
  const { id } = req.params;
  const coop = await Cooperative.findById(id);
  if (!coop) return res.status(404).json({ message: "Cooperative not found" });

  const providers = await Provider.find({ 
    $or: [{ cooperativeId: coop._id }, { 'cooperative.name': coop.name }]
  }).populate('userId', 'name email phone avatarUrl').lean();

  const Payout = require('../models/Payout');
  const providerIds = providers.map(p => p._id);
  const payouts = await Payout.find({ 
    $or: [{ providerId: { $in: providerIds } }, { providerEmail: { $in: providers.map(p => p.email).filter(Boolean) } }]
  }).sort({ createdAt: -1 });

  const bookings = await Booking.find({ 
    $or: [{ cooperativeId: coop._id }, { providerId: { $in: providerIds } }]
  }).populate('householdId', 'name email').sort({ createdAt: -1 });

  res.json({
    cooperative: coop,
    providers,
    payouts,
    bookings
  });
}

async function updateCooperativeCommission(req, res) {
  const { id } = req.params;
  const { commissionRate } = req.body;
  const coop = await Cooperative.findByIdAndUpdate(id, { commissionRate: Number(commissionRate) }, { new: true });
  if (!coop) return res.status(404).json({ message: "Cooperative not found" });
  res.json(coop);
}

module.exports = { 
  dashboard, listCooperatives, onboardCooperative, updateCommission,
  getCooperativeDetail, updateCooperativeCommission
};
