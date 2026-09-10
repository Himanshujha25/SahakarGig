const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true },
});

const certificationCourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, required: true }, // e.g. 'Carpentry', 'Electrical', 'Plumbing', 'AC Repair', 'Solar Energy', 'Professionalism'
    nicheSkill: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    durationMins: { type: Number, default: 20 },
    rating: { type: Number, default: 4.9 },
    badgeName: { type: String, required: true }, // e.g. 'Master Carpenter Level 1', 'Certified Electrician'
    trustScoreBonus: { type: Number, default: 10 },
    cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative' },
    createdByName: { type: String, default: 'National Cooperative Workforce Directorate' },
    quiz: [quizQuestionSchema],
    passingPercentage: { type: Number, default: 80 },
  },
  { timestamps: true }
);

certificationCourseSchema.index({ category: 1 });
certificationCourseSchema.index({ cooperativeId: 1 });

module.exports = mongoose.model('CertificationCourse', certificationCourseSchema);
