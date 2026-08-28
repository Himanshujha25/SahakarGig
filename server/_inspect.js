require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const open = await Booking.find({
    dispatchMode: 'broadcast',
    broadcastStatus: 'broadcasting',
    providerId: null,
    status: 'requested',
  }).sort('-createdAt');
  console.log('OPEN broadcast jobs (show on worker feed):', open.length);
  for (const b of open) {
    console.log(` - [${b.createdAt.toISOString().slice(0, 19)}] ${b.targetCategory} @ ${b.locationText || ''} (${b.price}/hr)`);
  }
  const total = await Booking.countDocuments({ dispatchMode: 'broadcast' });
  console.log('total broadcast bookings in DB:', total);
  await mongoose.disconnect();
})();