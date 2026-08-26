const Welfare = require('../models/Welfare');
const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const QRCode = require('qrcode');

function calcWelfareScore(w) {
  const days = Math.min((w.daysWorked || 0) / 100, 1) * 40;
  const ins = (w.insuranceOptIn ? 1 : 0) * 30;
  const eshram = (w.eShramId ? 1 : 0) * 30;
  return Math.round(days + ins + eshram);
}

async function getWelfare(req, res) {
  const w = await Welfare.findOne({ providerId: req.params.providerId });
  res.json(w || {});
}

async function upsertWelfare(req, res) {
  const w = await Welfare.findOneAndUpdate(
    { providerId: req.params.providerId },
    req.body,
    { new: true, upsert: true }
  );
  w.welfareScore = calcWelfareScore(w);
  await w.save();
  res.json(w);
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

module.exports = { getWelfare, upsertWelfare, calcWelfareScore, getWelfareQR };
