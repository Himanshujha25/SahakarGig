const mongoose = require('mongoose');

const coopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    registrationId: { type: String, required: true },
    region: { type: String },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    memberProviderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Provider' }],
    commissionRate: { type: Number, default: 8 },
    federationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cooperative', coopSchema);
