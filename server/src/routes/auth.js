const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again after 15 minutes' },
});

router.post('/signup', authLimiter, asyncHandler(c.signup));
router.post('/login', authLimiter, asyncHandler(c.login));
router.get('/me', auth, asyncHandler(c.me));

module.exports = router;
