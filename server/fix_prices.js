require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Provider = require('./src/models/Provider');
const Booking = require('./src/models/Booking');

async function fixZeroPrices() {
  await mongoose.connect(process.env.MONGODB_URI);

  const provRes = await Provider.updateMany(
    { $or: [{ hourlyRate: { $exists: false } }, { hourlyRate: 0 }, { hourlyRate: null }] },
    { $set: { hourlyRate: 250 } }
  );
  console.log('Updated Providers with zero rate:', provRes.modifiedCount);

  const bookRes = await Booking.updateMany(
    { $or: [{ price: { $exists: false } }, { price: 0 }, { price: null }] },
    { $set: { price: 250 } }
  );
  console.log('Updated Bookings with zero price:', bookRes.modifiedCount);

  await mongoose.disconnect();
}

fixZeroPrices().catch((err) => {
  console.error(err);
  process.exit(1);
});
