const Welfare = require('../models/Welfare');
const Provider = require('../models/Provider');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const QRCode = require('qrcode');
const axios = require('axios');

// Call real e-Shram govt API when configured
// Returns: { verified: bool, name: string, dob: string, state: string, error?: string }
async function callEShramAPI(eShramId) {
  // If no API configured, return null (will stay as self_declared)
  if (!process.env.ESHRAM_API_URL || !process.env.ESHRAM_API_KEY) {
    return null;
  }

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
    console.error('[e-Shram API Error]', err.message);
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

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const jobsCompleted = completedBookings.length;
  const daysWorked = Math.max(jobsCompleted > 0 ? 1 : 0, Math.ceil(jobsCompleted * 0.8));
  
  const totalEarnings = completedBookings.reduce((sum, b) => sum + (Number(b.price) || 250), 0);
  const completedThisMonth = completedBookings.filter(b => new Date(b.updatedAt || b.createdAt) >= monthStart);
  const monthlyEarnings = completedThisMonth.reduce((sum, b) => sum + (Number(b.price) || 250), 0);

  const avgRating = reviews.length ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)) : 4.8;
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
  const body = { ...req.body };

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

module.exports = { getWelfare, upsertWelfare, calcWelfareScore, getWelfareQR, verifyEShram };
