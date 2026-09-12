const mongoose = require('mongoose');
const dns = require('dns');

async function connect(uri) {
  const primaryUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sahakargig';
  const fallbackUri = 'mongodb://127.0.0.1:27017/sahakargig';

  // Only set custom DNS for SRV records if connecting to cloud Atlas
  if (primaryUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (err) {
      console.warn('[db] DNS configuration notice:', err.message);
    }
  }

  const options = {
    serverSelectionTimeoutMS: 4000, // 4s fast timeout instead of 30s hang
  };

  try {
    await mongoose.connect(primaryUri, options);
    console.log('[db] MongoDB connected successfully');
  } catch (primaryErr) {
    console.warn(`[db] Primary DB connection attempt failed (${primaryErr.message})`);
    
    if (primaryUri !== fallbackUri) {
      console.log(`[db] Fast-switching to local MongoDB fallback (${fallbackUri})...`);
      try {
        await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 3000 });
        console.log('[db] MongoDB connected to local database successfully');
      } catch (localErr) {
        throw new Error(`Cloud DB failed (${primaryErr.message}) and Local DB failed (${localErr.message})`);
      }
    } else {
      throw primaryErr;
    }
  }
}

module.exports = connect;
