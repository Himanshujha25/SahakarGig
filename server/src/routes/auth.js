const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again after 15 minutes' },
});

router.post('/signup', authLimiter, asyncHandler(c.signup));
router.post('/login', authLimiter, asyncHandler(c.login));
router.get('/me', auth, asyncHandler(c.me));
router.patch('/me', auth, asyncHandler(c.updateMe));

// OTP flows
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests. Please try again after 15 minutes.' },
});
router.post('/send-otp', authLimiter, require('../middleware/auth').optionalAuth, asyncHandler(c.sendOtp));
// send-otp validates req.user itself for authenticated purposes (change_password etc.)

// Forgot-password initiation — cross-checks registration BEFORE issuing an OTP.
// Stricter limiter: this is the endpoint that can probe account existence.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password-reset attempts. Please try again after 15 minutes.' },
});
router.post('/forgot-password', forgotLimiter, asyncHandler(c.forgotPasswordInitiate));

router.post('/reset-password', authLimiter, asyncHandler(c.resetPassword));
router.post('/change-password', auth, asyncHandler(c.changePassword));
router.post('/verify-email', auth, asyncHandler(c.verifyEmail));

module.exports = router;
