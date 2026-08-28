const router = require('express').Router();
const c = require('../controllers/adminController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const asyncHandler = require('../middleware/error');

router.use(auth, rbac('Cooperative Admin'));
router.get('/dashboard', asyncHandler(c.dashboard));
router.get('/verifications', asyncHandler(c.pendingVerifications));
router.patch('/verify/:providerId', asyncHandler(c.verifyProvider));
router.get('/disputes', asyncHandler(c.disputes));
router.patch('/resolve/:bookingId', asyncHandler(c.resolveDispute));
router.get('/commission', asyncHandler(c.getCommission));
router.patch('/commission', asyncHandler(c.updateCommission));
router.get('/leaderboard', asyncHandler(c.leaderboard));
router.get('/providers', asyncHandler(c.listProviders));
router.post('/invite-worker', asyncHandler(c.inviteWorker));

module.exports = router;
