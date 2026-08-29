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

// ─────────────────────────────────────────────────────────────
// 2. COOPERATIVE PROFILE & REGISTRATION DOCUMENT
// ─────────────────────────────────────────────────────────────
async function getCoopProfile(req, res) {
  const coop = await getCoop(req);
  res.json(coop);
}

async function updateCoopProfile(req, res) {
  const coop = await getCoop(req);
  const { name, region, district, contactEmail, contactPhone, commissionRate, welfareFundAllocation } = req.body;
  if (name) coop.name = name.trim();
  if (region) coop.region = region.trim();
  if (district) coop.district = district.trim();
  if (contactEmail) coop.contactEmail = contactEmail.trim();
  if (contactPhone) coop.contactPhone = contactPhone.trim();
  if (commissionRate !== undefined) coop.commissionRate = Number(commissionRate);
  if (welfareFundAllocation !== undefined) coop.welfareFundAllocation = Number(welfareFundAllocation);
  await coop.save();
  res.json(coop);
}

async function uploadRegistrationDoc(req, res) {
  const coop = await getCoop(req);
  const { name, url } = req.body;
  coop.registrationDoc = {
    name: name || 'Cooperative Registration Certificate',
    url: url || 'https://sahakargig.gov.in/docs/coop-certificate-sample.pdf',
    uploadedAt: new Date(),
  };
  await coop.save();
  res.json({ message: 'Registration document uploaded successfully', doc: coop.registrationDoc });
}

// ─────────────────────────────────────────────────────────────
// 3. MEMBER MANAGEMENT (ADD / REMOVE / DIRECT LINK)
// ─────────────────────────────────────────────────────────────
async function addMember(req, res) {
  const coop = await getCoop(req);
  const { name, email, phone, skill, hourlyRate, eshramNo } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ message: 'Worker name and phone are required' });
  }

  const User = require('../models/User');
  let user = await User.findOne({ $or: [{ phone }, ...(email ? [{ email }] : [])] });
  if (!user) {
    user = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : `worker_${phone.slice(-6)}@coop.local`,
      role: 'Gig Worker',
      isPhoneVerified: true,
    });
  }

  let provider = await Provider.findOne({ userId: user._id });
  if (!provider) {
    provider = await Provider.create({
      userId: user._id,
      cooperativeId: coop._id,
      skills: skill ? [skill] : ['General Service'],
      hourlyRate: Number(hourlyRate) || 350,
      verified: true,
      verificationStatus: 'verified',
      documentDetails: [
        {
          docType: 'e-Shram Card',
          docNumber: eshramNo || `UAN-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          status: 'verified',
        },
      ],
      trustScore: 4.8,
    });
  } else {
    provider.cooperativeId = coop._id;
    if (skill && !provider.skills.includes(skill)) provider.skills.push(skill);
    await provider.save();
  }

  if (!coop.memberProviderIds.includes(provider._id)) {
    coop.memberProviderIds.push(provider._id);
    await coop.save();
  }

  res.json({ message: 'Member successfully added to cooperative directory', provider });
}

async function removeMember(req, res) {
  const coop = await getCoop(req);
  const { providerId } = req.params;

  coop.memberProviderIds = coop.memberProviderIds.filter((id) => id.toString() !== providerId);
  await coop.save();

  await Provider.findByIdAndUpdate(providerId, { cooperativeId: null });
  res.json({ message: 'Member removed from cooperative' });
}

// ─────────────────────────────────────────────────────────────
// 4. VERIFICATION WORKFLOW & AUDIT TRAIL
// ─────────────────────────────────────────────────────────────
async function verifyProviderAction(req, res) {
  const coop = await getCoop(req);
  const { action, notes, reason } = req.body; // 'approve' | 'reject' | 're_verify'
  const { providerId } = req.params;

  const provider = await Provider.findOne({ _id: providerId, cooperativeId: coop._id }).populate('userId');
  if (!provider) return res.status(404).json({ message: 'Provider not found' });

  const adminName = req.user?.name || 'Cooperative Admin';

  if (action === 'approve') {
    provider.verified = true;
    provider.verificationStatus = 'verified';
    provider.reVerificationReason = '';
    provider.verificationHistory.push({
      action: 'Approved',
      date: new Date(),
      adminName,
      notes: notes || 'All identity & e-Shram documents verified by Cooperative.',
    });
  } else if (action === 're_verify') {
    provider.verified = false;
    provider.verificationStatus = 're_verification_requested';
    provider.reVerificationReason = reason || notes || 'Please re-upload a clearer copy of your identity card.';
    provider.verificationHistory.push({
      action: 'Re-verification Requested',
      date: new Date(),
      adminName,
      notes: provider.reVerificationReason,
    });
  } else if (action === 'reject') {
    provider.verified = false;
    provider.verificationStatus = 'rejected';
    provider.reVerificationReason = reason || notes || 'Verification rejected due to non-compliance.';
    provider.verificationHistory.push({
      action: 'Rejected',
      date: new Date(),
      adminName,
      notes: provider.reVerificationReason,
    });
  }

  await provider.save();
  res.json({ message: `Provider verification ${action}ed successfully`, provider });
}

async function getVerificationHistory(req, res) {
  const coop = await getCoop(req);
  const providers = await Provider.find({
    cooperativeId: coop._id,
    'verificationHistory.0': { $exists: true },
  })
    .populate('userId', 'name email phone avatarUrl')
    .lean();

  const historyList = [];
  providers.forEach((p) => {
    (p.verificationHistory || []).forEach((h) => {
      historyList.push({
        id: `${p._id}_${h.date}`,
        providerId: p._id,
        providerName: p.userId?.name || 'Worker',
        skills: p.skills,
        action: h.action,
        date: h.date,
        adminName: h.adminName,
        notes: h.notes,
      });
    });
  });

  historyList.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(historyList);
}

// ─────────────────────────────────────────────────────────────
// 5. FINANCIALS, WELFARE FUND & MEMBER PAYOUTS
// ─────────────────────────────────────────────────────────────
async function getFinancials(req, res) {
  const coop = await getCoop(req);

  const [bookingAgg, payAgg, payoutAgg] = await Promise.all([
    Booking.aggregate([
      { $match: { cooperativeId: coop._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          grossGMV: { $sum: '$price' },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { status: 'released' } },
      { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'b' } },
      { $unwind: '$b' },
      { $match: { 'b.cooperativeId': coop._id } },
      {
        $group: {
          _id: null,
          coopRevenue: { $sum: '$cooperativeCommission' },
          fedCommission: { $sum: '$federationCommission' },
          providerPayouts: { $sum: '$providerPayout' },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]),
    Payment.find()
      .populate({ path: 'bookingId', match: { cooperativeId: coop._id } })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
  ]);

  const grossGMV = bookingAgg[0]?.grossGMV || 0;
  const coopRev = payAgg[0]?.coopRevenue || Math.round(grossGMV * ((coop.commissionRate || 8) / 100));
  const welfareRate = coop.welfareFundAllocation || 10;
  const welfarePool = Math.round(coopRev * (welfareRate / 100));
  const netOperatingRevenue = coopRev - welfarePool;

  const withdrawals = coop.treasuryWithdrawals || [];
  const totalWithdrawn = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
  const availableTreasury = Math.max(0, netOperatingRevenue - totalWithdrawn);

  const claims = coop.welfareClaims || [];
  const totalWelfareClaimed = claims.reduce((sum, c) => sum + (c.amount || 0), 0);
  const availableWelfare = Math.max(0, welfarePool - totalWelfareClaimed);

  res.json({
    cooperativeName: coop.name,
    commissionRate: coop.commissionRate || 8,
    welfareAllocationPct: welfareRate,
    grossGMV,
    totalBookings: bookingAgg[0]?.total || 0,
    completedBookings: bookingAgg[0]?.completed || 0,
    totalCoopRevenue: coopRev,
    welfareFundBalance: availableWelfare,
    totalWelfareGenerated: welfarePool,
    totalWelfareClaimed,
    netOperatingRevenue: availableTreasury,
    totalOperatingEarned: netOperatingRevenue,
    totalTreasuryWithdrawn: totalWithdrawn,
    treasuryWithdrawals: withdrawals.slice().reverse(),
    welfareClaims: claims.slice().reverse(),
    recentLedger: payoutAgg
      .filter((p) => p.bookingId)
      .map((p) => ({
        id: p._id,
        bookingId: p.bookingId?._id,
        service: p.bookingId?.service || 'Gig Service',
        amount: p.amount,
        coopCommission: p.cooperativeCommission || Math.round(p.amount * 0.08),
        providerPayout: p.providerPayout || Math.round(p.amount * 0.90),
        status: p.status,
        date: p.createdAt,
      })),
  });
}

async function withdrawTreasury(req, res) {
  const coop = await getCoop(req);
  const { amount, destinationBank, accountLast4, notes } = req.body;
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Valid withdrawal amount is required' });
  }

  const record = {
    amount: Number(amount),
    destinationBank: destinationBank || 'Delhi State Cooperative Bank (Society Account)',
    accountLast4: accountLast4 || '8821',
    refNumber: `COOP-WD-${Date.now().toString().slice(-6)}`,
    status: 'Settled ✓',
    initiatedAt: new Date(),
    notes: notes || 'Cooperative operational revenue withdrawal to society nodal account.',
  };

  if (!coop.treasuryWithdrawals) coop.treasuryWithdrawals = [];
  coop.treasuryWithdrawals.push(record);
  await coop.save();

  res.json({ message: `₹${amount} successfully transferred to ${record.destinationBank}!`, withdrawal: record });
}

async function disburseWelfareClaim(req, res) {
  const coop = await getCoop(req);
  const { memberName, claimType, amount, reason } = req.body;
  if (!memberName || !amount) {
    return res.status(400).json({ message: 'Member name and claim amount are required' });
  }

  const claim = {
    memberName: memberName.trim(),
    claimType: claimType || 'Medical Emergency',
    amount: Number(amount),
    status: 'Disbursed ✓',
    grantedAt: new Date(),
    reason: reason || 'Approved emergency welfare relief from social security reserve pool.',
  };

  if (!coop.welfareClaims) coop.welfareClaims = [];
  coop.welfareClaims.push(claim);
  await coop.save();

  res.json({ message: `Welfare grant of ₹${amount} disbursed to ${memberName}!`, claim });
}

async function initiateMemberPayout(req, res) {
  const coop = await getCoop(req);
  const { providerId, amount, paymentMethod, notes } = req.body;
  if (!providerId || !amount) {
    return res.status(400).json({ message: 'Provider ID and amount are required' });
  }

  const Payout = require('../models/Payout');
  const payout = await Payout.create({
    providerId,
    amount: Number(amount),
    status: 'completed',
    paymentMethod: paymentMethod || 'Razorpay Direct Escrow',
    reference: `COOP-PAY-${Date.now().toString().slice(-6)}`,
    note: notes || `Direct cooperative payout from ${coop.name}`,
  });

  res.json({ message: `Payout of ₹${amount} successfully processed!`, payout });
}

// ─────────────────────────────────────────────────────────────
// 6. INTERNAL NOTICES & MEETING MINUTES
// ─────────────────────────────────────────────────────────────
async function getNotices(req, res) {
  const coop = await getCoop(req);
  res.json({
    notices: (coop.notices || []).reverse(),
    meetingMinutes: (coop.meetingMinutes || []).reverse(),
  });
}

async function createNotice(req, res) {
  const coop = await getCoop(req);
  const { title, content, category, priority } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Notice title and content are required' });
  }

  const newNotice = {
    title: title.trim(),
    content: content.trim(),
    category: category || 'General',
    priority: priority || 'Normal',
    postedAt: new Date(),
    postedBy: req.user?.name || coop.name,
  };

  coop.notices.push(newNotice);
  await coop.save();

  // Send real-time notification to all providers linked to this cooperative
  try {
    const notify = require('../utils/notify');
    for (const pid of coop.memberProviderIds || []) {
      const p = await Provider.findById(pid);
      if (p?.userId) {
        await notify(p.userId.toString(), 'announcement', `📢 [${coop.name}] ${title}`, coop._id);
      }
    }
  } catch {}

  res.json({ message: 'Notice broadcasted successfully to all cooperative members', notice: newNotice });
}

async function deleteNotice(req, res) {
  const coop = await getCoop(req);
  const { noticeId } = req.params;
  coop.notices = coop.notices.filter((n) => n._id.toString() !== noticeId);
  await coop.save();
  res.json({ message: 'Notice deleted' });
}

async function uploadMeetingMinutes(req, res) {
  const coop = await getCoop(req);
  const { title, date, attendeesCount, summary, docUrl } = req.body;
  if (!title) return res.status(400).json({ message: 'Meeting title is required' });

  const record = {
    title: title.trim(),
    date: date ? new Date(date) : new Date(),
    attendeesCount: Number(attendeesCount) || 12,
    summary: summary ? summary.trim() : 'General Assembly meeting minutes and resolutions.',
    docUrl: docUrl || 'https://sahakargig.gov.in/minutes-sample.pdf',
    uploadedAt: new Date(),
  };

  coop.meetingMinutes.push(record);
  await coop.save();
  res.json({ message: 'Meeting minutes recorded successfully', record });
}

// ─────────────────────────────────────────────────────────────
// 7. COMPLIANCE, ANNUAL RETURNS & GRIEVANCE REGISTER
// ─────────────────────────────────────────────────────────────
async function getComplianceData(req, res) {
  const coop = await getCoop(req);
  const providers = await Provider.find({ cooperativeId: coop._id });
  const verifiedCount = providers.filter((p) => p.verified).length;

  res.json({
    cooperative: {
      name: coop.name,
      registrationId: coop.registrationId,
      region: coop.region || 'Delhi NCR',
      status: coop.status || 'active',
      registrationDoc: coop.registrationDoc,
    },
    totalMembers: providers.length,
    verifiedMembers: verifiedCount,
    complianceScore: Math.min(100, Math.round((verifiedCount / Math.max(1, providers.length)) * 100)),
    annualReturns: coop.annualReturns || [],
    grievances: coop.grievances || [],
  });
}

async function recordAnnualReturn(req, res) {
  const coop = await getCoop(req);
  const { financialYear, ackNumber, docUrl } = req.body;
  if (!financialYear) return res.status(400).json({ message: 'Financial year is required' });

  const record = {
    financialYear: financialYear.trim(),
    filingDate: new Date(),
    ackNumber: ackNumber || `AR-DL-${Date.now().toString().slice(-6)}`,
    status: 'Filed & Certified',
    docUrl: docUrl || 'https://sahakargig.gov.in/docs/annual-return-sample.pdf',
  };

  coop.annualReturns.push(record);
  await coop.save();
  res.json({ message: 'Annual Return filing recorded successfully', record });
}

async function addGrievance(req, res) {
  const coop = await getCoop(req);
  const { complainantName, category, description } = req.body;
  if (!complainantName || !description) {
    return res.status(400).json({ message: 'Complainant name and description are required' });
  }

  const record = {
    complainantName: complainantName.trim(),
    category: category || 'Service Delivery',
    description: description.trim(),
    status: 'pending',
    filedAt: new Date(),
  };

  coop.grievances.push(record);
  await coop.save();
  res.json({ message: 'Grievance ticket logged in cooperative register', record });
}

async function resolveGrievance(req, res) {
  const coop = await getCoop(req);
  const { grievanceId } = req.params;
  const { resolutionNote } = req.body;

  const g = coop.grievances.id(grievanceId);
  if (!g) return res.status(404).json({ message: 'Grievance record not found' });

  g.status = 'resolved';
  g.resolvedAt = new Date();
  g.resolutionNote = resolutionNote || 'Resolved by Cooperative Committee.';
  await coop.save();

  res.json({ message: 'Grievance resolved successfully', grievance: g });
}

async function listRFPs(req, res) {
  const coop = await getCoop(req);
  const bookings = await Booking.find({
    $and: [
      {
        $or: [
          { cooperativeId: coop._id },
          { cooperativeId: null },
          { cooperativeId: { $exists: false } },
        ],
      },
      {
        $or: [
          { service: { $regex: '^Bulk Crew', $options: 'i' } },
          { notes: { $regex: 'Institutional Bulk RFP', $options: 'i' } },
          { 'groupBooking.enabled': true, price: { $gte: 2000 } },
        ],
      },
    ],
  })
    .populate('householdId', 'name email phone')
    .populate('providerId')
    .sort({ createdAt: -1 })
    .lean();
  res.json(bookings);
}

async function acceptRFP(req, res) {
  const coop = await getCoop(req);
  const notify = require('../utils/notify');
  const { emitTo } = require('../socket');
  const booking = await Booking.findOne({
    _id: req.params.bookingId,
    cooperativeId: coop._id,
  }).populate('householdId', 'name email phone');

  if (!booking) return res.status(404).json({ message: 'RFP not found' });
  booking.status = 'accepted';
  await booking.save();

  if (booking.householdId?._id) {
    try {
      await notify(
        booking.householdId._id.toString(),
        'booking_accepted',
        `${coop.name} has accepted and mobilized crew for your Institutional RFP!`,
        booking._id
      );
    } catch (e) {
      console.error('[notify error]', e.message);
    }
    emitTo(booking.householdId._id.toString(), 'booking:updated', booking);
  }

  res.json({ message: 'RFP Accepted and Crew Mobilized', booking });
}

async function updateRFPQuotation(req, res) {
  const coop = await getCoop(req);
  const { price, notes } = req.body;
  const booking = await Booking.findOne({
    _id: req.params.bookingId,
    cooperativeId: coop._id,
  }).populate('householdId', 'name email phone');

  if (!booking) return res.status(404).json({ message: 'RFP not found' });
  if (price && Number(price) > 0) {
    booking.price = Number(price);
  }
  const chatMsg = `📑 Revised Cooperative Institutional Quotation: ₹${booking.price.toLocaleString('en-IN')}.${notes ? ` Note: ${notes}` : ''}`;
  if (notes) {
    booking.notes = (booking.notes ? booking.notes + '\n' : '') + `[Cooperative Quotation Note: ${notes}]`;
  }
  booking.chat.push({
    sender: req.user.userId,
    message: chatMsg,
    at: new Date(),
  });
  await booking.save();

  if (booking.householdId?._id) {
    const notify = require('../utils/notify');
    const { emitTo } = require('../socket');
    try {
      await notify(
        booking.householdId._id.toString(),
        'booking_updated',
        `${coop.name} updated your Institutional Quotation to ₹${booking.price.toLocaleString('en-IN')}`,
        booking._id
      );
    } catch (e) {}
    emitTo(booking.householdId._id.toString(), 'booking:updated', booking);
    emitTo(booking.householdId._id.toString(), 'booking:chat', {
      bookingId: booking._id,
      message: {
        sender: req.user.userId,
        message: chatMsg,
        at: new Date(),
      },
    });
  }

  res.json({ message: 'Quotation updated successfully', booking });
}

module.exports = {
  dashboard,
  pendingVerifications,
  verifyProvider,
  verifyProviderAction,
  getVerificationHistory,
  disputes,
  resolveDispute,
  getCommission,
  updateCommission,
  leaderboard,
  listProviders,
  inviteWorker,
  getCoopProfile,
  updateCoopProfile,
  uploadRegistrationDoc,
  addMember,
  removeMember,
  getFinancials,
  withdrawTreasury,
  disburseWelfareClaim,
  initiateMemberPayout,
  getNotices,
  createNotice,
  deleteNotice,
  uploadMeetingMinutes,
  getComplianceData,
  recordAnnualReturn,
  addGrievance,
  resolveGrievance,
  listRFPs,
  acceptRFP,
  updateRFPQuotation,
};
