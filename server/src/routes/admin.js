const router = require('express').Router();
const c = require('../controllers/adminController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const asyncHandler = require('../middleware/error');

router.use(auth, rbac('Cooperative Admin'));

// 1. Dashboard
router.get('/dashboard', asyncHandler(c.dashboard));

// 2. Cooperative Profile & Compliance Documents
router.get('/cooperative', asyncHandler(c.getCoopProfile));
router.patch('/cooperative', asyncHandler(c.updateCoopProfile));
router.post('/cooperative/doc', asyncHandler(c.uploadRegistrationDoc));

// 3. Member Management
router.get('/providers', asyncHandler(c.listProviders));
router.post('/members/add', asyncHandler(c.addMember));
router.delete('/members/:providerId', asyncHandler(c.removeMember));
router.post('/invite-worker', asyncHandler(c.inviteWorker));
router.get('/leaderboard', asyncHandler(c.leaderboard));

// 4. Verification Queue, Actions & Audit Trail
router.get('/verifications', asyncHandler(c.pendingVerifications));
router.get('/verifications/history', asyncHandler(c.getVerificationHistory));
router.post('/verifications/:providerId/action', asyncHandler(c.verifyProviderAction));
router.patch('/verify/:providerId', asyncHandler(c.verifyProvider));

// 5. Financials, Welfare Fund & Member Payouts
router.get('/financials', asyncHandler(c.getFinancials));
router.post('/financials/withdraw', asyncHandler(c.withdrawTreasury));
router.post('/financials/welfare-claim', asyncHandler(c.disburseWelfareClaim));
router.post('/financials/payout', asyncHandler(c.initiateMemberPayout));
router.get('/commission', asyncHandler(c.getCommission));
router.patch('/commission', asyncHandler(c.updateCommission));

// 6. Notices & Meeting Minutes
router.get('/notices', asyncHandler(c.getNotices));
router.post('/notices', asyncHandler(c.createNotice));
router.delete('/notices/:noticeId', asyncHandler(c.deleteNotice));
router.post('/meeting-minutes', asyncHandler(c.uploadMeetingMinutes));

// 7. Compliance, Annual Returns & Grievances
router.get('/compliance', asyncHandler(c.getComplianceData));
router.post('/compliance/annual-return', asyncHandler(c.recordAnnualReturn));
router.post('/compliance/grievance', asyncHandler(c.addGrievance));
router.patch('/compliance/grievance/:grievanceId/resolve', asyncHandler(c.resolveGrievance));

// 8. Disputes & Resolution
router.get('/disputes', asyncHandler(c.disputes));
router.patch('/resolve/:bookingId', asyncHandler(c.resolveDispute));

// 9. Institutional Bulk RFPs & Crew Mobilization
router.get('/rfp', asyncHandler(c.listRFPs));
router.patch('/rfp/:bookingId/accept', asyncHandler(c.acceptRFP));
router.patch('/rfp/:bookingId/quotation', asyncHandler(c.updateRFPQuotation));

module.exports = router;
