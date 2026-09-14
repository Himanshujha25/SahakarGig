const router = require('express').Router();
const c = require('../controllers/aiController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

router.get('/demand', auth, asyncHandler(c.demandForecast));
router.get('/recommend', auth, asyncHandler(c.recommendProviders));
router.post('/nudge', auth, asyncHandler(c.nudgeProviders));
router.post('/chat', asyncHandler(c.chatWithGroq));
router.post('/translate', asyncHandler(c.translateContent));

// ── 4 CORE NEW AI ENDPOINTS ──
router.post('/estimate-price', asyncHandler(c.estimatePrice));
router.post('/dispute-audit', auth, asyncHandler(c.auditDispute));
router.get('/worker-insights', auth, asyncHandler(c.workerCoach));
router.post('/verify-trust', asyncHandler(c.verifyTrust));

module.exports = router;
