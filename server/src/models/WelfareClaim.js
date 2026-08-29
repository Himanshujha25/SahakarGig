const mongoose = require('mongoose');

const welfareClaimSchema = new mongoose.Schema(
  {
    schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'WelfareScheme', required: true },
    cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
    requestedAmount: { type: Number, required: true },
    approvedAmount: { type: Number, default: 0 },
    purposeDescription: { type: String, required: true },
    documentUrls: [{ type: String }],
    documentNames: [{ type: String }],
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'disbursed'],
      default: 'submitted',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String },
    rejectionReason: { type: String },
    disbursedAt: { type: Date },
    transactionRef: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WelfareClaim', welfareClaimSchema);
