const CertificationCourse = require('../models/CertificationCourse');
const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');

/**
 * Get all certification courses
 */
async function getCourses(req, res) {
  let query = {};
  if (req.user?.role === 'Provider') {
    const provider = await Provider.findOne({ userId: req.user.userId }).lean();
    if (provider?.cooperativeId) {
      query = { $or: [{ cooperativeId: provider.cooperativeId }, { cooperativeId: { $exists: false } }, { cooperativeId: null }] };
    }
  }

  const courses = await CertificationCourse.find(query)
    .populate('cooperativeId', 'name MSCS_Reg_ID district state')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ courses });
}

/**
 * Create a new certification course (Cooperative Admin or System Admin)
 */
async function createCourse(req, res) {
  const { title, description, category, nicheSkill, videoUrl, durationMins, badgeName, trustScoreBonus, quiz, passingPercentage } = req.body;

  if (!title || !category || !badgeName) {
    return res.status(400).json({ error: 'Title, category, and badge name are required' });
  }

  let cooperativeId = req.body.cooperativeId;
  let createdByName = 'National Cooperative Workforce Directorate';

  if (req.user?.role === 'Admin' || req.user?.role === 'CooperativeAdmin') {
    const coop = await Cooperative.findOne({ userId: req.user.userId }).lean();
    if (coop) {
      cooperativeId = coop._id;
      createdByName = coop.name;
    }
  }

  const course = await CertificationCourse.create({
    title,
    description: description || '',
    category,
    nicheSkill: nicheSkill || category,
    videoUrl: videoUrl || '',
    durationMins: Number(durationMins) || 20,
    badgeName,
    trustScoreBonus: Number(trustScoreBonus) || 10,
    cooperativeId,
    createdByName,
    quiz: Array.isArray(quiz) ? quiz : [],
    passingPercentage: Number(passingPercentage) || 80,
  });

  res.status(201).json({ message: 'Certification course created successfully', course });
}

/**
 * Submit quiz answers and complete certification
 */
async function submitQuiz(req, res) {
  const { courseId } = req.params;
  const { answers } = req.body; // Array of selected option indices e.g. [0, 1, 2]

  const course = await CertificationCourse.findById(courseId).populate('cooperativeId', 'name').lean();
  if (!course) {
    return res.status(404).json({ error: 'Certification course not found' });
  }

  const provider = await Provider.findOne({ userId: req.user.userId });
  if (!provider) {
    return res.status(404).json({ error: 'Provider record not found' });
  }

  const quiz = course.quiz || [];
  let correctCount = 0;

  quiz.forEach((q, idx) => {
    if (answers && answers[idx] === q.correctAnswerIndex) {
      correctCount++;
    }
  });

  const totalQuestions = quiz.length || 1;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  const passed = scorePercent >= (course.passingPercentage || 80);

  if (!passed) {
    return res.json({
      passed: false,
      scorePercent,
      correctCount,
      totalQuestions,
      message: `Score ${scorePercent}% is below passing threshold (${course.passingPercentage || 80}%). Please review the video and try again!`,
    });
  }

  // Check if already certified
  const alreadyCertified = (provider.completedCertifications || []).some(
    (c) => c.courseId?.toString() === course._id.toString() || c.title === course.title
  );

  let certificateNo = `CERT-${course.category.toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-6)}`;

  if (!alreadyCertified) {
    const certObj = {
      courseId: course._id,
      title: course.title,
      badgeName: course.badgeName,
      certifiedBy: course.createdByName || course.cooperativeId?.name || 'Cooperative Society',
      certificateNo,
      scorePercent,
      completedAt: new Date(),
    };

    provider.completedCertifications = provider.completedCertifications || [];
    provider.completedCertifications.push(certObj);

    // Boost trust score
    provider.trustScore = Math.min(100, (provider.trustScore || 50) + (course.trustScoreBonus || 10));
    await provider.save();
  }

  res.json({
    passed: true,
    scorePercent,
    correctCount,
    totalQuestions,
    badgeName: course.badgeName,
    certificateNo,
    trustScoreBoost: course.trustScoreBonus || 10,
    newTrustScore: provider.trustScore,
    message: `Congratulations! You scored ${scorePercent}% and earned the "${course.badgeName}" certification verified by ${course.createdByName}! 🎉`,
  });
}

/**
 * Directly issue / upload a skill certificate to a specific employee (Cooperative Admin)
 */
async function issueDirectCertificate(req, res) {
  const { providerId, title, badgeName, category, scorePercent } = req.body;

  if (!providerId || !title || !badgeName) {
    return res.status(400).json({ error: 'Provider ID, title, and badge name are required' });
  }

  const provider = await Provider.findById(providerId).populate('userId');
  if (!provider) {
    return res.status(404).json({ error: 'Employee / Provider record not found' });
  }

  let certifiedBy = 'Cooperative Society';
  if (req.user?.role === 'Cooperative Admin' || req.user?.role === 'Admin') {
    const coop = await Cooperative.findOne({ adminId: req.user.userId }).lean();
    if (coop) certifiedBy = coop.name;
  }

  const certificateNo = `PACS-CERT-${(category || 'SKILL').toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-6)}`;

  const certObj = {
    title,
    badgeName,
    certifiedBy,
    certificateNo,
    scorePercent: Number(scorePercent) || 100,
    completedAt: new Date(),
  };

  provider.completedCertifications = provider.completedCertifications || [];
  provider.completedCertifications.push(certObj);

  provider.trustScore = Math.min(100, (provider.trustScore || 50) + 15);
  await provider.save();

  res.status(201).json({
    message: `Dynamic certificate "${badgeName}" issued successfully to ${provider.userId?.name || 'Employee'}!`,
    certificate: certObj,
    employeeName: provider.userId?.name,
  });
}

module.exports = { getCourses, createCourse, submitQuiz, issueDirectCertificate };
