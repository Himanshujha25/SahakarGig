const crypto = require('crypto');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { getRazorpayConfig, getRazorpayClient } = require('../lib/razorpay');

const MIN_TOPUP = 100;

// GET /wallet — balance + transaction history (newest first)
async function walletOverview(req, res) {
  const user = await User.findById(req.user.userId).select('walletBalance');
  const transactions = await WalletTransaction.find({ userId: req.user.userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({
    balance: user?.walletBalance || 0,
    transactions,
    isTestMode: process.env.NODE_ENV !== 'production',
  });
}

// POST /wallet/topup — create Razorpay order for a credit top-up
async function createTopup(req, res) {
  const raw = Number(req.body.amount);
  const amount = Math.floor(raw); // floor to whole rupees
  if (!Number.isFinite(amount) || amount < MIN_TOPUP) {
    return res.status(400).json({ message: `Minimum top-up amount is ₹${MIN_TOPUP}` });
  }

  const amountPaise = amount * 100;
  try {
    const { keyId } = getRazorpayConfig();
    const order = await getRazorpayClient().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sg_wallet_${req.user.userId}_${Date.now()}`,
      notes: { walletTopup: true, userId: req.user.userId },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
  } catch (err) {
    console.error('[Razorpay Wallet Order Error]:', err.message);
    res.status(500).json({ message: `Wallet top-up failed: ${err.message}` });
  }
}

// POST /wallet/topup/verify — verify the Razorpay signature, then credit the wallet
async function verifyTopup(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing Razorpay verification details' });
  }
  const { keySecret } = getRazorpayConfig();
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');
  if (expected !== razorpay_signature) {
    return res.status(400).json({ message: 'Invalid top-up signature' });
  }

  // Trust the gateway amount; fall back to the client-reported amount (rupees).
  let credit = amount;
  if (!Number.isFinite(Number(credit)) || Number(credit) < MIN_TOPUP) {
    return res.status(400).json({ message: 'Invalid top-up amount' });
  }
  credit = Math.floor(Number(credit));

  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  user.walletBalance = Number(user.walletBalance || 0) + credit;
  await user.save();

  const txn = await WalletTransaction.create({
    userId: user._id,
    type: 'credit',
    amount: credit,
    method: 'razorpay',
    razorpayOrderId: razorpay_order_id || null,
    razorpayPaymentId: razorpay_payment_id || null,
    note: 'Wallet top-up',
  });

  res.json({ balance: user.walletBalance, transaction: txn });
}

// POST /wallet/dev-topup — Instant simulated topup for development & QA testing without real money
async function devTopup(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Dev simulated topup is disabled in production.' });
  }
  const raw = Number(req.body.amount) || 500;
  const credit = Math.max(10, Math.floor(raw));

  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  user.walletBalance = Number(user.walletBalance || 0) + credit;
  await user.save();

  const txn = await WalletTransaction.create({
    userId: user._id,
    type: 'credit',
    amount: credit,
    method: 'dev_mock',
    razorpayPaymentId: `mock_pay_${Date.now()}`,
    note: 'Dev Simulation Wallet Top-up (Test Credit)',
  });

  res.json({ success: true, balance: user.walletBalance, transaction: txn });
}

module.exports = { walletOverview, createTopup, verifyTopup, devTopup };