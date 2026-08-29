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
  // Cooperative-scoped: an admin may only resolve disputes of their own society.
  const coop = await getCoop(req);
  const b = await Booking.findOne({ _id: req.params.bookingId, cooperativeId: coop._id });
  if (!b) return res.status(404).json({ message: 'Dispute not found in your cooperative' });
  if (outcome === 'refund') {
    b.paymentStatus = 'refunded';
    const pay = await Payment.findOne({ bookingId: b._id });
    if (pay) {
      pay.status = 'refunded';
      pay.refundedAt = new Date();
      await pay.save();
      // Real refund: credit the household's wallet ledger + notify them.
      const refundAmount = Number(pay.amount) || 0;
      if (refundAmount > 0) {
        const User = require('../models/User');
        const WalletTransaction = require('../models/WalletTransaction');
        const user = await User.findById(b.householdId);
        if (user) {
          user.walletBalance = Number(user.walletBalance || 0) + refundAmount;
          await user.save();
          await WalletTransaction.create({
            userId: user._id,
            type: 'credit',
            amount: refundAmount,
            method: 'refund',
            bookingId: b._id,
            note: `Refund for disputed ${b.service} booking`,
          });
          const notify = require('../utils/notify');
          await notify(b.householdId.toString(), 'payment_released', `₹${refundAmount} refunded to your wallet for the disputed booking`, b._id);
        }
      }
    }
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
  const providers = await Provider.find({ cooperativeId: coop._id }).populate('userId', 'name email phone avatarUrl profileImage role');
  
  let bookingAgg = [];
  try {
    const Booking = require('../models/Booking');
    const providerIds = providers.map((p) => p._id);
    bookingAgg = await Booking.aggregate([
      { $match: { providerId: { $in: providerIds } } },
      {
        $group: {
          _id: '$providerId',
          completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$price', 0] } },
        },
      },
    ]);
  } catch {}

  const statsMap = Object.fromEntries(bookingAgg.map((b) => [b._id.toString(), b]));

  const result = providers.map((p) => {
    const obj = p.toObject ? p.toObject() : p;
    const st = statsMap[p._id.toString()] || {};
    obj.completedJobs = st.completedJobs || 0;
    obj.totalEarnings = st.totalEarnings || 0;
    obj.eshramCardNo = p.eshramCardNo || null;
    obj.licenseNo = p.licenseNo || null;
    obj.trustScore = p.trustScore || 0;
    return obj;
  });

  res.json(result);
}

async function inviteWorker(req, res) {
  const { name, email, phone, skill, hourlyRate } = req.body;
  if (!email || !name) {
    return res.status(400).json({ message: "Name and email are required" });
  }

  let coopName = "Karol Bagh Labour Cooperative";
  try {
    const coop = await Cooperative.findOne({ adminId: req.user?.userId });
    if (coop && coop.name) coopName = coop.name;
  } catch {}

  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const queryStr = new URLSearchParams({
    name: name.trim(),
    email: email.trim(),
    phone: (phone || "").trim(),
    skill: skill || "Electrician",
    rate: String(hourlyRate || "350"),
    coopName: coopName
  }).toString();

  const inviteUrl = `${clientOrigin}/signup?${queryStr}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1e6b65; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">SahakarGig Cooperative Network</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Official Agency Workforce Invitation</p>
      </div>

      <div style="padding: 28px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hello ${name},</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          You have been officially invited by <strong>${coopName}</strong> to join our verified cooperative gig worker platform.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px; font-size: 14px; color: #1e6b65;">Pre-filled Account Profile:</h3>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Skill Category:</strong> ${skill || 'Electrician'}</p>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Base Rate:</strong> ₹${hourlyRate || 350}/hr</p>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Email:</strong> ${email}</p>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Phone:</strong> ${phone || 'N/A'}</p>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Cooperative Society:</strong> ${coopName}</p>
        </div>

        <p style="font-size: 14px; color: #334155;">
          Click the button below to claim your account and complete registration with 1 click!
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${inviteUrl}" style="background-color: #1e6b65; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(30,107,101,0.25);">
            🚀 Accept Invitation & Pre-fill Profile
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px;">
          Or copy and paste this URL into your browser:<br/>
          <a href="${inviteUrl}" style="color: #1e6b65;">${inviteUrl}</a>
        </p>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        © SahakarGig Cooperative Network • Empowering Gig Workers Nationally
      </div>
    </div>
  `;

  try {
    const { sendMail } = require('../utils/email');
    const mailResult = await sendMail({
      to: email,
      subject: `🎉 Official Invitation from ${coopName} — Claim Your SahakarGig Profile`,
      html: htmlContent,
      text: `Hello ${name},\n\nYou have been invited by ${coopName} to join SahakarGig.\n\nAccept your invitation and claim your profile here:\n${inviteUrl}\n\n— SahakarGig Team`
    });

    return res.json({
      success: true,
      message: `Real invitation email dispatched to ${email}`,
      mailResult,
      inviteUrl
    });
  } catch (err) {
    console.error("Email send error:", err);
    return res.status(500).json({ message: "Failed to send email", error: err.message });
  }
}

module.exports = {
  dashboard, pendingVerifications, verifyProvider, disputes, resolveDispute,
  getCommission, updateCommission, leaderboard, listProviders, inviteWorker
};
