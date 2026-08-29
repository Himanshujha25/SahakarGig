const mongoose = require('mongoose');

const federationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    registrationId: { type: String, required: true },
    region: { type: String },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cooperativeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative' }],
    commissionRate: { type: Number, default: 2 },
    categoryCommissions: [
      {
        category: { type: String, required: true },
        rate: { type: Number, required: true },
      },
    ],
    welfareFundAllocation: { type: Number, default: 10 }, // percentage of federation commission allocated to welfare fund
    tdsRate: { type: Number, default: 1 }, // 1% TDS under Section 194O
  },
  { timestamps: true }
);

module.exports = mongoose.model('Federation', federationSchema);
