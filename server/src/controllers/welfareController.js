const mongoose = require('mongoose');
const Welfare = require('../models/Welfare');
const Provider = require('../models/Provider');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const QRCode = require('qrcode');
const axios = require('axios');

// Real govt e-Shram verification (no mock fallback — never fabricate a result).
// Returns: { verified: bool, name: string, dob: string, state: string, error?: string }
async function callEShramAPI(eShramId) {
  if (!process.env.ESHRAM_API_ENABLED || !process.env.ESHRAM_API_URL || !process.env.ESHRAM_API_KEY) {
    return { verified: false, error: 'e-Shram API is not configured on the server.' };
  }
  return callRealEShramAPI(eShramId);
}

// Real govt API call (DigiLocker/UMANG)
async function callRealEShramAPI(eShramId) {
  try {
    const response = await axios.post(
      process.env.ESHRAM_API_URL,
      { eShramId },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ESHRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.verified) {
      return {
        verified: true,
        name: response.data.name,
        dob: response.data.dob,
        state: response.data.state,
      };
    }
    return { verified: false, error: response.data?.message || 'Verification failed' };
  } catch (err) {
    console.error('[e-Shram Real API Error]', err.message);
    return { verified: false, error: err.message };
  }
}

function calcWelfareScore(w) {
  const days = Math.min((w.daysWorked || 0) / 100, 1) * 40;
  const ins = (w.insuranceOptIn ? 1 : 0) * 20;
  const eshram = w.eShramVerificationStatus === 'govt_verified' ? 30
    : w.eShramId ? 15 : 0;
  return Math.round(days + ins + eshram);
}

async function getWelfare(req, res) {
  const { providerId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(providerId)) {
    return res.status(404).json({ message: 'Invalid provider ID' });
  }

  const provider = await Provider.findById(providerId).populate('userId', 'name').populate('cooperativeId', 'name');
  const w = await Welfare.findOne({ providerId });

  // Match all bookings for this provider (by provider _id or user _id)
  const provUserObjId = provider?.userId?._id || provider?.userId;
  const matchFilter = provider
    ? { $or: [{ providerId: provider._id }, { providerId: provUserObjId }] }
    : { providerId };

  const allProviderBookings = await Booking.find(matchFilter);
  const completedBookings = allProviderBookings.filter(b => /^completed$/i.test(b.status || ''));
  const reviews = provider ? await Review.find({ providerId: provider._id }).catch(() => []) : [];

  // Net take-home payouts (after cooperative/federation commission) — never gross.
  const payments = await Payment.find({ status: 'released' }).select('bookingId providerPayout').lean();
  const payoutByBooking = new Map(payments.map((p) => [String(p.bookingId), p.providerPayout]));

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const jobsCompleted = completedBookings.length;
  const daysWorked = Math.max(jobsCompleted > 0 ? 1 : 0, Math.ceil(jobsCompleted * 0.8));

  const totalEarnings = completedBookings.reduce((sum, b) => {
    const net = payoutByBooking.get(String(b._id));
    const takeHome = b.fairWageBreakdown?.workerTakeHome != null
      ? Number(b.fairWageBreakdown.workerTakeHome)
      : (net != null ? Number(net) : (Number(b.price) || 0) * 0.85);
    return sum + takeHome;
  }, 0);
  const completedThisMonth = completedBookings.filter(b => new Date(b.updatedAt || b.createdAt) >= monthStart);
  const monthlyEarnings = completedThisMonth.reduce((sum, b) => {
    const net = payoutByBooking.get(String(b._id));
    const takeHome = b.fairWageBreakdown?.workerTakeHome != null
      ? Number(b.fairWageBreakdown.workerTakeHome)
      : (net != null ? Number(net) : (Number(b.price) || 0) * 0.85);
    return sum + takeHome;
  }, 0);

  const avgRating = reviews.length ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)) : 0;
  const reviewCount = reviews.length;

  // Compute dynamic Welfare Score (0 to 100)
  const eshramScore = (w?.eShramVerificationStatus === 'govt_verified' || w?.eShramId) ? 40 : 15;
  const insuranceScore = w?.insuranceOptIn ? 35 : 10;
  const jobsScore = Math.min(jobsCompleted * 5, 25);
  const welfareScore = Math.min(100, eshramScore + insuranceScore + jobsScore);

  // build alerts from real data
  const alerts = [];
  const vs = w?.eShramVerificationStatus || 'unregistered';
  if (vs === 'unregistered') {
    alerts.push({ type: 'warning', message: 'e-Shram ID not registered. Enter your ID and verify to unlock government schemes.', tag: 'Action Required' });
  } else if (vs === 'self_declared') {
    alerts.push({ type: 'warning', message: `e-Shram ID ${w?.eShramId || ''} saved. Govt. verification pending.`, tag: 'Pending Verification' });
  } else if (vs === 'govt_verified') {
    alerts.push({ type: 'success', message: `e-Shram ID ${w?.eShramId || ''} verified on Govt. Records.`, tag: 'Govt. Verified' });
  }
  if (!w?.insuranceOptIn) {
    alerts.push({ type: 'warning', message: 'Insurance not opted in. Enable cooperative insurance coverage.', tag: 'Action Required' });
  }
  if (jobsCompleted === 0) {
    alerts.push({ type: 'info', message: 'No completed jobs yet. Accept your first booking to start earning.', tag: 'Getting Started' });
  } else {
    alerts.push({ type: 'success', message: `Great work! You have completed ${jobsCompleted} job${jobsCompleted > 1 ? 's' : ''} and earned ₹${totalEarnings.toLocaleString('en-IN')}.`, tag: 'Earnings Active' });
  }
  if (w?.insuranceOptIn) {
    alerts.push({ type: 'success', message: 'Insurance coverage is active. You are protected under cooperative welfare.', tag: 'Active Protection' });
  }

  res.json({
    ...(w ? w.toObject() : {}),
    jobsCompleted,
    daysWorked,
    monthlyEarnings,
    totalEarnings,
    welfareScore,
    avgRating,
    reviewCount,
    alerts,
    providerName: provider?.userId?.name || '',
    cooperativeName: provider?.cooperativeId?.name || '',
    verified: provider?.verified || false,
    eShramVerificationStatus: w?.eShramVerificationStatus || 'unregistered',
  });
}

async function upsertWelfare(req, res) {
  const existing = await Welfare.findOne({ providerId: req.params.providerId });

  // Strict whitelist — financial counters (totalEarnings, daysWorked) can only
  // ever change via the payment webhook, never via the public API.
  const allowed = ['eShramId', 'insuranceOptIn', 'insuranceProvider'];
  const body = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) body[key] = req.body[key];
  }

  // If eShramId changed, reset verification to self_declared
  if (body.eShramId && body.eShramId !== existing?.eShramId) {
    body.eShramVerificationStatus = 'self_declared';
    body.eShramVerifiedAt = null;
    body.eShramVerifiedName = null;
    body.eShramDob = null;
    body.eShramState = null;
  }
  // If eShramId cleared, reset to unregistered
  if (body.eShramId === '' || body.eShramId === null) {
    body.eShramVerificationStatus = 'unregistered';
  }

  const w = await Welfare.findOneAndUpdate(
    { providerId: req.params.providerId },
    body,
    { new: true, upsert: true }
  );
  w.welfareScore = calcWelfareScore(w);
  await w.save();
  res.json(w);
}

// Stores the e-Shram ID after format validation.
// If real DigiLocker/UMANG API is configured in .env, calls it and sets govt_verified.
// Otherwise saves as self_declared (pending future API integration).
async function verifyEShram(req, res) {
  const { providerId } = req.params;
  const { eShramId } = req.body;

  if (!eShramId?.trim()) return res.status(400).json({ message: 'eShramId is required' });

  const clean = eShramId.trim().toUpperCase();
  // Accept UAN-XXXXXXXXXXXX (12 digits) or ES + 8-12 digits
  const isValidFormat = /^(UAN-?\d{12}|ES\d{8,12})$/i.test(clean);
  if (!isValidFormat) {
    return res.status(422).json({
      message: 'Invalid format. Use UAN-XXXXXXXXXXXX or ESXXXXXXXX',
      verified: false,
    });
  }

  // Try real govt API if configured
  const apiResult = await callEShramAPI(clean);

  let updateData = {
    eShramId: clean,
    eShramVerificationStatus: 'self_declared',
    eShramVerifiedAt: null,
    eShramVerifiedName: null,
  };

  // If real API returned verified result, upgrade to govt_verified
  if (apiResult?.verified) {
    updateData = {
      eShramId: clean,
      eShramVerificationStatus: 'govt_verified',
      eShramVerifiedAt: new Date(),
      eShramVerifiedName: apiResult.name,
      eShramDob: apiResult.dob,
      eShramState: apiResult.state,
    };
  }

  const w = await Welfare.findOneAndUpdate(
    { providerId },
    updateData,
    { new: true, upsert: true }
  );
  w.welfareScore = calcWelfareScore(w);
  await w.save();

  res.json({
    saved: true,
    eShramId: w.eShramId,
    eShramVerificationStatus: w.eShramVerificationStatus,
    eShramVerifiedAt: w.eShramVerifiedAt,
    eShramVerifiedName: w.eShramVerifiedName,
    welfareScore: w.welfareScore,
    message: w.eShramVerificationStatus === 'govt_verified'
      ? 'ID verified with govt. records!'
      : 'ID saved. Govt. verification will complete once the DigiLocker API is connected.',
  });
}

async function getWelfareQR(req, res) {
  const { providerId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(providerId)) {
    return res.status(404).json({ message: 'Invalid provider ID' });
  }
  const w = await Welfare.findOne({ providerId });
  const p = await Provider.findById(providerId).populate('userId', 'name').populate('cooperativeId', 'name');
  if (!p) return res.status(404).json({ message: 'Provider not found' });

  const payload = JSON.stringify({
    name: p.userId?.name,
    eShramId: w?.eShramId || 'Not registered',
    cooperative: p.cooperativeId?.name,
    skills: p.skills,
    welfareScore: w?.welfareScore || 0,
    verified: p.verified,
    issuedAt: new Date().toISOString(),
  });

  const qrDataUrl = await QRCode.toDataURL(payload, { width: 256, margin: 2 });
  res.json({ qr: qrDataUrl });
}

const WelfareScheme = require('../models/WelfareScheme');
const WelfareClaim = require('../models/WelfareClaim');
const Cooperative = require('../models/Cooperative');

// ── SCHEME CREATION & MANAGEMENT ──
async function createScheme(req, res) {
  const { title, category, description, maxAmountPerMember, totalBudget, requiredDocs, eligibility } = req.body;
  if (!title || !maxAmountPerMember || !totalBudget) {
    return res.status(400).json({ message: 'Title, max amount per member, and total budget are required.' });
  }

  let coopId = req.user?.cooperativeId;
  if (!coopId) {
    const firstCoop = await Cooperative.findOne();
    coopId = firstCoop?._id;
  }

  const scheme = await WelfareScheme.create({
    cooperativeId: coopId,
    title,
    category: category || 'general',
    description: description || '',
    maxAmountPerMember: Number(maxAmountPerMember),
    totalBudget: Number(totalBudget),
    requiredDocs: requiredDocs || ['e-Shram UAN', 'Expense / Medical Bill'],
    eligibility: eligibility || { minCompletedJobs: 0, minTrustScore: 0, requireEshram: true },
    status: 'active',
    createdBy: req.user?.userId,
  });

  res.status(201).json(scheme);
}

async function listSchemes(req, res) {
  const query = {};
  if (req.query.cooperativeId) {
    query.cooperativeId = req.query.cooperativeId;
  } else if (req.user?.role === 'CooperativeAdmin' && req.user?.cooperativeId) {
    query.cooperativeId = req.user.cooperativeId;
  }
  if (req.query.status) {
    query.status = req.query.status;
  }

  const schemes = await WelfareScheme.find(query)
    .populate('cooperativeId', 'name registrationId district')
    .sort({ createdAt: -1 })
    .lean();

  res.json(schemes);
}

async function updateScheme(req, res) {
  const { id } = req.params;
  const { title, category, description, maxAmountPerMember, totalBudget, status, eligibility, requiredDocs } = req.body;
  const scheme = await WelfareScheme.findByIdAndUpdate(
    id,
    { $set: { title, category, description, maxAmountPerMember, totalBudget, status, eligibility, requiredDocs } },
    { new: true }
  );
  if (!scheme) return res.status(404).json({ message: 'Scheme not found' });
  res.json(scheme);
}

// ── PROVIDER CLAIM APPLICATION & REVIEW ──
async function applyClaim(req, res) {
  const { schemeId, requestedAmount, purposeDescription, documentUrls, documentNames, providerId: passedProviderId } = req.body;
  if (!schemeId || !requestedAmount || !purposeDescription) {
    return res.status(400).json({ message: 'Scheme, requested amount, and purpose description are required.' });
  }

  let provider = null;
  if (passedProviderId) {
    provider = await Provider.findById(passedProviderId).populate('userId');
  } else if (req.user?.userId) {
    provider = await Provider.findOne({ userId: req.user.userId }).populate('userId');
  }

  if (!provider) {
    return res.status(404).json({ message: 'Worker profile not found.' });
  }

  const scheme = await WelfareScheme.findById(schemeId);
  if (!scheme) {
    return res.status(404).json({ message: 'Welfare scheme not found.' });
  }
  if (scheme.status !== 'active') {
    return res.status(400).json({ message: 'This welfare scheme is currently not accepting applications.' });
  }

  // Enforce 1 active claim constraint
  const existingActiveClaim = await WelfareClaim.findOne({
    providerId: provider._id,
    status: { $in: ['submitted', 'under_review', 'approved'] },
  });
  if (existingActiveClaim) {
    return res.status(400).json({
      message: 'You already have an active welfare claim in progress. Only 1 active claim is permitted at a time.',
    });
  }

  const claim = await WelfareClaim.create({
    schemeId: scheme._id,
    cooperativeId: scheme.cooperativeId || provider.cooperativeId,
    providerId: provider._id,
    requestedAmount: Math.min(Number(requestedAmount), scheme.maxAmountPerMember),
    purposeDescription,
    documentUrls: documentUrls || [],
    documentNames: documentNames || [],
    status: 'submitted',
  });

  const populated = await WelfareClaim.findById(claim._id)
    .populate({
      path: 'providerId',
      populate: { path: 'userId', select: 'name email phone avatarUrl' },
    })
    .populate('schemeId')
    .populate('cooperativeId', 'name registrationId')
    .lean();

  res.status(201).json(populated);
}

async function listClaims(req, res) {
  const query = {};
  if (req.query.cooperativeId) {
    query.cooperativeId = req.query.cooperativeId;
  } else if (req.user?.role === 'CooperativeAdmin' && req.user?.cooperativeId) {
    query.cooperativeId = req.user.cooperativeId;
  }
  if (req.query.status) {
    query.status = req.query.status;
  }
  if (req.query.providerId) {
    query.providerId = req.query.providerId;
  }

  const claims = await WelfareClaim.find(query)
    .populate({
      path: 'providerId',
      populate: { path: 'userId', select: 'name email phone avatarUrl' },
    })
    .populate('schemeId')
    .populate('cooperativeId', 'name registrationId')
    .sort({ createdAt: -1 })
    .lean();

  res.json(claims);
}

async function reviewClaim(req, res) {
  const { id } = req.params;
  const { status, approvedAmount, reviewNotes, rejectionReason } = req.body;

  if (!['approved', 'rejected', 'under_review'].includes(status)) {
    return res.status(400).json({ message: 'Invalid review status.' });
  }

  const claim = await WelfareClaim.findById(id).populate('schemeId');
  if (!claim) return res.status(404).json({ message: 'Claim not found.' });

  claim.status = status;
  claim.reviewedBy = req.user?.userId;
  claim.reviewNotes = reviewNotes || '';
  if (status === 'approved') {
    const max = claim.schemeId?.maxAmountPerMember || claim.requestedAmount;
    claim.approvedAmount = Math.min(Number(approvedAmount || claim.requestedAmount), max);
  } else if (status === 'rejected') {
    claim.rejectionReason = rejectionReason || 'Documentation insufficient.';
    claim.approvedAmount = 0;
  }

  await claim.save();
  const populated = await WelfareClaim.findById(claim._id)
    .populate({
      path: 'providerId',
      populate: { path: 'userId', select: 'name email phone avatarUrl' },
    })
    .populate('schemeId')
    .populate('cooperativeId', 'name registrationId')
    .lean();

  res.json(populated);
}

async function disburseClaim(req, res) {
  const { id } = req.params;
  const claim = await WelfareClaim.findById(id).populate('schemeId');
  if (!claim) return res.status(404).json({ message: 'Claim not found.' });
  if (claim.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved claims can be disbursed.' });
  }

  claim.status = 'disbursed';
  claim.disbursedAt = new Date();
  claim.transactionRef = `WLF-${Date.now().toString(36).toUpperCase()}`;
  await claim.save();

  // Debit scheme budget
  if (claim.schemeId) {
    await WelfareScheme.findByIdAndUpdate(claim.schemeId._id, {
      $inc: { utilizedBudget: claim.approvedAmount },
    });
  }

  const populated = await WelfareClaim.findById(claim._id)
    .populate({
      path: 'providerId',
      populate: { path: 'userId', select: 'name email phone avatarUrl' },
    })
    .populate('schemeId')
    .populate('cooperativeId', 'name registrationId')
    .lean();

  res.json(populated);
}

async function getFederationWelfareSummary(req, res) {
  const [schemes, claims] = await Promise.all([
    WelfareScheme.find().populate('cooperativeId', 'name registrationId').lean(),
    WelfareClaim.find().populate('cooperativeId', 'name').lean(),
  ]);

  const totalSchemes = schemes.length;
  const totalBudget = schemes.reduce((sum, s) => sum + (s.totalBudget || 0), 0);
  const totalDisbursed = claims
    .filter((c) => c.status === 'disbursed')
    .reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
  const totalBeneficiaries = new Set(
    claims.filter((c) => c.status === 'disbursed').map((c) => String(c.providerId))
  ).size;

  res.json({
    totalSchemes,
    totalBudget,
    totalDisbursed,
    totalBeneficiaries,
    schemes,
    recentClaims: claims.slice(0, 10),
  });
}

module.exports = {
  getWelfare,
  upsertWelfare,
  calcWelfareScore,
  getWelfareQR,
  verifyEShram,
  createScheme,
  listSchemes,
  updateScheme,
  applyClaim,
  listClaims,
  reviewClaim,
  disburseClaim,
  getFederationWelfareSummary,
};
