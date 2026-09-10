const mongoose = require('mongoose');

const federationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    registrationId: { type: String, required: true },
    // Jurisdiction / location
    region: { type: String },
    state: { type: String, default: 'Delhi' },
    district: { type: String, default: '' },
    address: { type: String, default: '' },
    // Governance
    presidentName: { type: String, default: '' },
    secretaryName: { type: String, default: '' },
    // Contact
    contactEmail: { type: String },
    contactPhone: { type: String },
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
