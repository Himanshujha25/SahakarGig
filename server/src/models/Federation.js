const mongoose = require('mongoose');

const federationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    registrationId: { type: String, required: true },
    region: { type: String },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cooperativeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative' }],
    commissionRate: { type: Number, default: 2 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Federation', federationSchema);
