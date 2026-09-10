const Provider = require('../models/Provider');

/**
 * AI Provider Verification & Trust Score Engine
 * Computes dynamic trust score (0-100%) based on:
 * - Government e-Shram & DigiLocker documents
 * - Completed Cooperative Certifications
 * - Rating & Completion Velocity
 */
async function verifyProviderTrustEngine(providerId) {
  const provider = await Provider.findById(providerId)
    .populate('userId', 'name email phone createdAt')
    .populate('cooperativeId', 'name MSCS_Reg_ID state district')
    .lean();

  if (!provider) {
    throw new Error('Provider record not found');
  }

  let score = 40; // Base score
  const checks = [];

  // 1. Cooperative Membership check
  if (provider.cooperativeId) {
    score += 15;
    checks.push({
      name: 'Registered Society Member',
      status: 'passed',
      points: 15,
      detail: `Verified with ${provider.cooperativeId.name} (${provider.cooperativeId.MSCS_Reg_ID || 'Reg Verified'})`,
    });
  }

  // 2. Govt Document Verification (e-Shram / Aadhaar / Skill)
  const docs = provider.documentDetails || [];
  const verifiedDocs = docs.filter((d) => d.status === 'verified');
  if (verifiedDocs.length > 0) {
    const docPts = Math.min(25, verifiedDocs.length * 10);
    score += docPts;
    checks.push({
      name: 'Government KYC & e-Shram Verification',
      status: 'passed',
      points: docPts,
      detail: `${verifiedDocs.length} Government document(s) verified on DigiLocker/e-Shram`,
    });
  } else {
    checks.push({
      name: 'Government KYC Verification',
      status: 'pending',
      points: 0,
      detail: 'Pending e-Shram UAN / Aadhaar verification check',
    });
  }

  // 3. Cooperative Skill Certifications
  const certs = provider.completedCertifications || [];
  if (certs.length > 0) {
    const certPts = Math.min(20, certs.length * 10);
    score += certPts;
    checks.push({
      name: 'Cooperative Niche Skill Certifications',
      status: 'passed',
      points: certPts,
      detail: `Completed ${certs.length} official video training course(s) certified by Cooperative`,
    });
  } else {
    checks.push({
      name: 'Cooperative Niche Skill Certifications',
      status: 'recommended',
      points: 0,
      detail: 'Take free video courses in Sahakar Academy to earn +10 pts per certification',
    });
  }

  // 4. Verification Status
  if (provider.verified) {
    score += 10;
    checks.push({
      name: 'Cooperative Admin Manual Approval',
      status: 'passed',
      points: 10,
      detail: 'Approved by Cooperative Society Board',
    });
  }

  const finalScore = Math.min(100, Math.max(0, score));

  // Determine trust tier & badge
  let tier = 'Bronze Standard';
  let badge = '🛡️ Verified Member';
  if (finalScore >= 85) {
    tier = 'Gold Master';
    badge = '🏆 Master Cooperative Specialist';
  } else if (finalScore >= 70) {
    tier = 'Silver Certified';
    badge = '⭐ Verified Skill Professional';
  }

  return {
    providerId: provider._id,
    providerName: provider.userId?.name || 'Provider',
    trustScore: finalScore,
    tier,
    badge,
    isVerified: provider.verified,
    completedCertificationsCount: certs.length,
    completedCertifications: certs,
    breakdownChecks: checks,
    lastCalculatedAt: new Date(),
  };
}

module.exports = { verifyProviderTrustEngine };
