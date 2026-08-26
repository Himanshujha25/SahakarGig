require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Cooperative = require('./src/models/Cooperative');
const Provider = require('./src/models/Provider');
const Booking = require('./src/models/Booking');
const Review = require('./src/models/Review');
const Payment = require('./src/models/Payment');
const Invoice = require('./src/models/Invoice');
const Welfare = require('./src/models/Welfare');
const { invoiceNumber, computeTrustScore } = require('./src/utils/helpers');
const { calcWelfareScore } = require('./src/controllers/welfareController');

const SKILLS = ['Plumber', 'Electrician', 'Tutor', 'Cook', 'Cleaner', 'Caregiver', 'Driver', 'Gardener'];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sahakargig');
  console.log('[seed] connected');

  await Promise.all([User, Cooperative, Provider, Booking, Review, Payment, Invoice, Welfare].map((m) => m.deleteMany({})));
  const hash = await bcrypt.hash('password123', 10);

  // 3 cooperatives
  const coops = [];
  for (let i = 0; i < 3; i++) {
    const admin = await User.create({
      name: `Coop Admin ${i + 1}`, email: `admin${i + 1}@coop.com`, passwordHash: hash, role: 'Cooperative Admin',
    });
    const coop = await Cooperative.create({
      name: `Labour Cooperative ${i + 1}`, registrationId: `REG-100${i}`,
      region: `Region ${i + 1}`, adminId: admin._id, commissionRate: 8,
    });
    coops.push(coop);
  }

  // 10 households
  const households = [];
  for (let i = 0; i < 10; i++) {
    const h = await User.create({
      name: `Household ${i + 1}`, email: `house${i + 1}@mail.com`, passwordHash: hash, role: 'Household',
      geoLocation: { lat: 28.6 + Math.random() * 0.1, lng: 77.2 + Math.random() * 0.1 },
    });
    households.push(h);
  }

  // 15 providers
  const providers = [];
  for (let i = 0; i < 15; i++) {
    const coop = coops[i % 3];
    const u = await User.create({
      name: `Provider ${i + 1}`, email: `prov${i + 1}@mail.com`, passwordHash: hash, role: 'Provider',
      geoLocation: { lat: 28.6 + Math.random() * 0.1, lng: 77.2 + Math.random() * 0.1 },
    });
    const p = await Provider.create({
      userId: u._id, cooperativeId: coop._id,
      skills: [SKILLS[i % SKILLS.length]], hourlyRate: 200 + Math.floor(Math.random() * 300),
      verified: i > 2,
      availabilitySlots: [{ day: 'Mon', from: '09:00', to: '17:00' }],
      geoLocation: { lat: 28.6 + Math.random() * 0.1, lng: 77.2 + Math.random() * 0.1 },
    });
    await Cooperative.findByIdAndUpdate(coop._id, { $push: { memberProviderIds: p._id } });
    providers.push(p);
  }

  // Bookings, reviews, payments, welfare
  for (const p of providers) {
    for (let k = 0; k < 3; k++) {
      const h = households[Math.floor(Math.random() * households.length)];
      const status = k === 0 ? 'completed' : k === 1 ? 'accepted' : 'requested';
      const price = p.hourlyRate * (2 + Math.floor(Math.random() * 3));
      const b = await Booking.create({
        householdId: h._id, providerId: p._id, cooperativeId: p.cooperativeId,
        service: p.skills[0], status, price, isEmergency: Math.random() < 0.2,
      });
      if (status === 'completed') {
        await Review.create({
          bookingId: b._id,
          rating: 4 + Math.floor(Math.random() * 2),
          comment: 'Good service',
          createdBy: h._id,
        });
        const coop = await Cooperative.findById(p.cooperativeId);
        const rate = (coop.commissionRate || 8) / 100;
        const commission = Number((price * rate).toFixed(2));
        const payout = Number((price - commission).toFixed(2));
        const pay = await Payment.create({
          bookingId: b._id, amount: price,
          cooperativeCommission: commission, providerPayout: payout, status: 'released',
        });
        await Invoice.create({
          invoiceNumber: invoiceNumber(), bookingId: b._id, paymentId: pay._id,
          householdId: h._id, providerId: p._id, cooperativeId: p.cooperativeId,
          items: [{ description: p.skills[0], qty: 1, rate: price, amount: price }], total: price,
        });
        await Welfare.findOneAndUpdate(
          { providerId: p._id },
          { $inc: { totalEarnings: payout, daysWorked: 1 } },
          { upsert: true }
        );
        const wDoc = await Welfare.findOne({ providerId: p._id });
        wDoc.welfareScore = calcWelfareScore(wDoc);
        await wDoc.save();
      }
    }
    // Compute and cache real trustScore for each provider
    await computeTrustScore(p._id);
  }

  // One disputed booking for demo
  const dp = providers[0];
  const dh = households[0];
  await Booking.create({
    householdId: dh._id, providerId: dp._id, cooperativeId: dp.cooperativeId,
    service: dp.skills[0], status: 'disputed', price: dp.hourlyRate * 2,
    issue: 'Provider did not show up at scheduled time',
  });

  console.log('[seed] complete: 3 coops, 15 providers, 10 households, bookings, reviews, welfare, trustScores.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
