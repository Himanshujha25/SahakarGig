const mongoose = require('mongoose');

const welfareSchemeSchema = new mongoose.Schema(
  {
    cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['medical', 'equipment', 'emergency', 'education', 'insurance', 'general'],
      default: 'general',
    },
    description: { type: String, required: true },
    maxAmountPerMember: { type: Number, required: true },
    totalBudget: { type: Number, required: true },
    utilizedBudget: { type: Number, default: 0 },
    requiredDocs: [{ type: String }], // e.g. ['e-Shram UAN', 'Medical Bills / Prescription', 'Equipment Invoice']
    eligibility: {
      minCompletedJobs: { type: Number, default: 0 },
      minTrustScore: { type: Number, default: 0 },
      requireEshram: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'closed', 'depleted'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WelfareScheme', welfareSchemeSchema);
