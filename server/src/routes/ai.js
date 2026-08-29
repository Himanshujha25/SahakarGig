const router = require('express').Router();
const c = require('../controllers/aiController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

router.get('/demand', auth, asyncHandler(c.demandForecast));
router.get('/recommend', auth, asyncHandler(c.recommendProviders));
router.post('/nudge', auth, asyncHandler(c.nudgeProviders));
router.post('/chat', asyncHandler(c.chatWithGroq));

module.exports = router;
