const router = require('express').Router();
const c = require('../controllers/aiController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

router.get('/demand', auth, asyncHandler(c.demandForecast));
router.post('/nudge', auth, asyncHandler(c.nudgeProviders));

module.exports = router;
