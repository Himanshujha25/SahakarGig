const Subscription = require('../models/Subscription');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

// Plan catalogue — the app's real, persisted pricing.
const PLANS = {
  basic:   { monthlyPrice: 199, label: 'Sahakar Basic',  benefits: ['15% off every booking', 'Priority chat support'] },
  pro:     { monthlyPrice: 399, label: 'Sahakar Pro',    benefits: ['25% off every booking', 'Priority dispatch', 'Free pickups report'] },
  premium: { monthlyPrice: 699, label: 'Sahakar Premium', benefits: ['35% off every booking', 'Same-day guarantee', 'Dedicated cooperative manager'] },
};

const PLAN_DISCOUNTS = { basic: 0.15, pro: 0.25, premium: 0.35 };

function planCards() {
  return Object.keys(PLANS).map((k) => {
    const p = PLANS[k];
    const desc = {
      basic: 'Everyday savings for households.',
      pro: 'For busy homes that book regularly.',
      premium: 'Full-priority treatment & support.',
    }[k];
    return { plan: k, name: p.label, price: p.monthlyPrice, desc, perks: p.benefits };
  });
}

async function buildOverview(userId) {
  const sub = await Subscription.findOne({ householdId: userId, status: 'active' }).sort('-createdAt').lean();
  return {
    active: sub
      ? {
          plan: sub.plan,
          price: sub.monthlyPrice,
          startedAt: sub.startedAt,
          renewsAt: sub.renewsAt,
          discountPct: Math.round((PLAN_DISCOUNTS[sub.plan] || 0) * 100),
          autoRenew: true,
        }
      : null,
    plans: planCards(),
    walletBalance: Number((await User.findById(userId).select('walletBalance'))?.walletBalance || 0),
  };
}

// GET /subscriptions — current subscription + plan catalogue
async function overview(req, res) {
  res.json(await buildOverview(req.user.userId));
}

// POST /subscriptions/subscribe — { plan, fromWallet? }
// Wallet pays instantly when balance covers it; otherwise a Razorpay order is
// created (client completes it via /subscriptions/verify) so nothing is fake.
async function subscribe(req, res) {
  const { plan } = req.body;
  const p = PLANS[plan];
  if (!p) return res.status(400).json({ message: 'Choose a valid plan (basic / pro / premium).' });

  await Subscription.updateMany({ householdId: req.user.userId, status: 'active' }, { $set: { status: 'cancelled' } });

  const user = await User.findById(req.user.userId);
  const balance = Number(user?.walletBalance || 0);
  const renewsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  if (balance >= p.monthlyPrice) {
    const sub = await Subscription.create({
      householdId: user._id,
      plan,
      monthlyPrice: p.monthlyPrice,
      status: 'active',
      startedAt: new Date(),
      renewsAt,
    });
    user.walletBalance = Number((balance - p.monthlyPrice).toFixed(2));
    await user.save();
    await WalletTransaction.create({
      userId: user._id,
      type: 'debit',
      amount: p.monthlyPrice,
      method: 'subscription',
      note: `Subscription: ${p.label}`,
    });
    return res.json({ subscription: sub, walletBalance: user.walletBalance, paidFromWallet: true });
  }

  const Razorpay = require('razorpay');
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ message: 'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured on the server.' });
  }
  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  const amountPaise = p.monthlyPrice * 100;
  try {
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sg_sub_${user._id}_${Date.now()}`,
      notes: { subscription: plan, userId: user._id.toString() },
    });
    return res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, plan: p });
  } catch (err) {
    console.error('[Razorpay Subscription Order Error]:', err.message);
    return res.status(500).json({ message: `Could not create the subscription order: ${err.message}` });
  }
}

// POST /subscriptions/verify — confirm Razorpay payment, activate plan.
async function verifySubscription(req, res) {
  const { plan, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const p = PLANS[plan];
  if (!p) return res.status(400).json({ message: 'Invalid plan.' });
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing Razorpay verification details' });
  }

  const crypto = require('crypto');
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  if (expected !== razorpay_signature) return res.status(400).json({ message: 'Invalid subscription payment signature' });

  await Subscription.updateMany({ householdId: req.user.userId, status: 'active' }, { $set: { status: 'cancelled' } });
  const sub = await Subscription.create({
    householdId: req.user.userId,
    plan,
    monthlyPrice: p.monthlyPrice,
    status: 'active',
    startedAt: new Date(),
    renewsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });
  await NotificationCreate(req.user.userId, 'subscription_activated', `Your ${p.label} plan is active`, null);
  res.status(201).json({ subscription: sub });
}

async function NotificationCreate(userId, type, message, bookingId) {
  const notify = require('../utils/notify');
  return notify(userId, type, message, bookingId);
}

// POST /subscriptions/cancel — stop auto-renewal at next cycle.
async function cancel(req, res) {
  const r = await Subscription.updateOne(
    { householdId: req.user.userId, status: 'active' },
    { $set: { status: 'cancelled' } }
  );
  res.json(await buildOverview(req.user.userId));
}

// Renew due subscriptions from the household wallet; expire them if unfunded.
async function processRenewals() {
  const due = await Subscription.find({ status: 'active', renewsAt: { $lte: new Date() } }).lean();
  for (const sub of due) {
    const user = await User.findById(sub.householdId);
    const balance = Number(user?.walletBalance || 0);
    if (balance >= sub.monthlyPrice) {
      user.walletBalance = Number((balance - sub.monthlyPrice).toFixed(2));
      await user.save();
      await WalletTransaction.create({
        userId: user._id,
        type: 'debit',
        amount: sub.monthlyPrice,
        method: 'subscription',
        note: `Subscription renewal: ${PLANS[sub.plan]?.label || sub.plan}`,
      });
      await Subscription.updateOne({ _id: sub._id }, { $set: { renewsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) } });
    } else {
      await Subscription.updateOne({ _id: sub._id }, { $set: { status: 'expired' } });
      await NotificationCreate(sub.householdId.toString(), 'subscription_expired', 'Your subscription expired — top up wallet to renew.', null);
    }
  }
}

// Apply subscription discount to a final payable amount (used by payments).
async function discountedAmount(userId, amount) {
  const sub = await Subscription.findOne({ householdId: userId, status: 'active' }).lean();
  if (!sub || !PLAN_DISCOUNTS[sub.plan]) return amount;
  const disc = Math.round(amount * PLAN_DISCOUNTS[sub.plan]);
  return Math.max(1, Math.round(amount - disc));
}

module.exports = { PLANS, PLAN_DISCOUNTS, overview, subscribe, verifySubscription, cancel, processRenewals, discountedAmount, _NotificationCreate: NotificationCreate };