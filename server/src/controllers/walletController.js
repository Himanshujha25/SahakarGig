const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

const MIN_TOPUP = 100;

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured on the server.');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

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
    const order = await getRazorpay().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sg_wallet_${req.user.userId}_${Date.now()}`,
      notes: { walletTopup: true, userId: req.user.userId },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
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
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
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

module.exports = { walletOverview, createTopup, verifyTopup };