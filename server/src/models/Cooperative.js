const mongoose = require('mongoose');

const coopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    registrationId: { type: String, required: true },
    region: { type: String },
    district: { type: String },
    state: { type: String, default: 'Delhi' },
    contactEmail: { type: String },
    contactPhone: { type: String },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    memberProviderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Provider' }],
    commissionRate: { type: Number, default: 8 },
    federationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation' },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'active',
    },
    statusReason: { type: String, default: '' },
    inviteCode: { type: String },
    welfareFundAllocation: { type: Number, default: 10 },
    registrationDoc: {
      name: { type: String },
      url: { type: String },
      uploadedAt: { type: Date },
    },
    meetingMinutes: [
      {
        title: { type: String, required: true },
        date: { type: Date, default: Date.now },
        attendeesCount: { type: Number, default: 0 },
        summary: { type: String },
        docUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    grievances: [
      {
        complainantName: { type: String, required: true },
        providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
        category: { type: String, default: 'Service Quality' },
        description: { type: String, required: true },
        status: { type: String, enum: ['pending', 'in_review', 'resolved'], default: 'pending' },
        filedAt: { type: Date, default: Date.now },
        resolvedAt: { type: Date },
        resolutionNote: { type: String },
      },
    ],
    annualReturns: [
      {
        financialYear: { type: String, required: true },
        filingDate: { type: Date, default: Date.now },
        ackNumber: { type: String },
        status: { type: String, default: 'Filed' },
        docUrl: { type: String },
      },
    ],
    notices: [
      {
        title: { type: String, required: true },
        content: { type: String, required: true },
        category: { type: String, default: 'General' },
        priority: { type: String, enum: ['Normal', 'High', 'Urgent'], default: 'Normal' },
        postedAt: { type: Date, default: Date.now },
        postedBy: { type: String, default: 'Cooperative Admin' },
      },
    ],
    treasuryWithdrawals: [
      {
        amount: { type: Number, required: true },
        destinationBank: { type: String, default: 'State Bank of India (Cooperative Account)' },
        accountLast4: { type: String, default: '8821' },
        refNumber: { type: String },
        status: { type: String, default: 'Settled ✓' },
        initiatedAt: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
    welfareClaims: [
      {
        memberName: { type: String, required: true },
        providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
        claimType: { type: String, default: 'Medical Emergency' },
        amount: { type: Number, required: true },
        status: { type: String, default: 'Disbursed ✓' },
        grantedAt: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cooperative', coopSchema);
