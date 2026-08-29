const router = require('express').Router();
const c = require('../controllers/federationController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

const fedOnly = (req, res, next) => {
  if (req.user.role !== 'Federation Admin') {
    return res.status(403).json({ message: 'Federation Admin role required' });
  }
  next();
};

router.use(auth, fedOnly);

// 1. Dashboard
router.get('/dashboard', asyncHandler(c.dashboard));

// 2. Cooperative Management
router.get('/cooperatives', asyncHandler(c.listCooperatives));
router.post('/cooperatives/register', asyncHandler(c.registerCooperative));
router.post('/cooperatives/onboard', asyncHandler(c.onboardCooperative));
router.get('/cooperatives/kpi-report', asyncHandler(c.getCooperativeKpiReport));
router.get('/cooperatives/:id', asyncHandler(c.getCooperativeDetail));
router.patch('/cooperatives/:id/status', asyncHandler(c.updateCooperativeStatus));
router.patch('/cooperatives/:id/commission', asyncHandler(c.updateCooperativeCommission));
router.get('/cooperatives/:id/invite', asyncHandler(c.generateMemberInvite));

// 3. Provider Verification (via Federation)
router.get('/verifications', asyncHandler(c.listPendingVerifications));
router.post('/verifications/bulk-verify', asyncHandler(c.bulkVerifyProviders));
router.patch('/verifications/:id/verify', asyncHandler(c.verifyProvider));
router.patch('/verifications/:id/re-verify', asyncHandler(c.requestReVerification));

// 4. Dispute Resolution & Arbitration
router.get('/disputes', asyncHandler(c.listDisputes));
router.get('/disputes/:id', asyncHandler(c.getDisputeDetail));
router.post('/disputes/:id/resolve', asyncHandler(c.resolveDispute));
router.post('/disputes/:id/escalate', asyncHandler(c.escalateDispute));

// 5. Announcements
router.get('/announcements', asyncHandler(c.listAnnouncements));
router.post('/announcements', asyncHandler(c.createAnnouncement));
router.delete('/announcements/:id', asyncHandler(c.deleteAnnouncement));

// 6. Earnings & Finance
router.get('/finance', asyncHandler(c.getFinanceSummary));
router.patch('/finance/settings', asyncHandler(c.updateFinanceSettings));
router.post('/finance/payouts/batch', asyncHandler(c.initiateBatchPayout));
router.get('/finance/statement', asyncHandler(c.getMonthlyStatement));

// 7. Analytics & Leaderboard & Heatmap
router.get('/analytics', asyncHandler(c.getAnalytics));

module.exports = router;
