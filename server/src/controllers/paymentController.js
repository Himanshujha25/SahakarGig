const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Cooperative = require('../models/Cooperative');
const Invoice = require('../models/Invoice');
const Welfare = require('../models/Welfare');
const { invoiceNumber } = require('../utils/helpers');
const notify = require('../utils/notify');
const { emitTo } = require('../socket');

async function capturePayment(req, res) {
  const { bookingId } = req.body;
  const b = await Booking.findById(bookingId);
  if (!b) return res.status(404).json({ message: 'Booking not found' });

  const coop = await Cooperative.findById(b.cooperativeId);
  const rate = (coop?.commissionRate || 8) / 100;
  const amount = b.price || 0;
  const commission = Number((amount * rate).toFixed(2));
  const payout = Number((amount - commission).toFixed(2));

  const payment = await Payment.create({
    bookingId, amount, cooperativeCommission: commission, providerPayout: payout, status: 'released',
  });
  b.paymentStatus = 'paid';
  await b.save();

  const inv = await Invoice.create({
    invoiceNumber: invoiceNumber(),
    bookingId, paymentId: payment._id,
    householdId: b.householdId, providerId: b.providerId, cooperativeId: b.cooperativeId,
    items: [{ description: b.service, qty: 1, rate: amount, amount }],
    tax: 0, total: amount,
  });

  await Welfare.findOneAndUpdate(
    { providerId: b.providerId },
    { $inc: { totalEarnings: payout, daysWorked: 1 } },
    { upsert: true }
  );

  await notify(b.householdId.toString(), 'payment_released', 'Payment released', b._id);
  await notify(b.providerId.toString(), 'payment_released', 'You received a payout', b._id);
  emitTo(b.householdId.toString(), 'booking:updated', b);

  res.json({ payment, invoice: inv });
}

async function getInvoice(req, res) {
  const inv = await Invoice.findOne({ bookingId: req.params.bookingId });
  res.json(inv);
}

module.exports = { capturePayment, getInvoice };
