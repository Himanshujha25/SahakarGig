const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    category: {
      type: String,
      enum: ['official', 'safety', 'scheme', 'bonus', 'general'],
      default: 'official',
    },
    federationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation' },
    cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', default: null },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: 'Federation Admin' },
    authorRole: { type: String, default: 'Federation Admin' },
    targetAudience: {
      type: String,
      enum: ['all', 'cooperatives', 'skills', 'specific_coop'],
      default: 'all',
    },
    targetCooperativeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative' }],
    targetSkills: [String],
    scheduledFor: { type: Date, default: Date.now },
    status: { type: String, enum: ['published', 'scheduled', 'archived'], default: 'published' },
    isPinned: { type: Boolean, default: false },
    attachments: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
