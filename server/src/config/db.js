const mongoose = require('mongoose');

async function connect(uri) {
  await mongoose.connect(uri || 'mongodb://127.0.0.1:27017/sahakargig');
  console.log('[db] MongoDB connected');
}

module.exports = connect;
