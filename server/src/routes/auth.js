const router = require('express').Router();
const c = require('../controllers/authController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

router.post('/signup', asyncHandler(c.signup));
router.post('/login', asyncHandler(c.login));
router.get('/me', auth, asyncHandler(c.me));

module.exports = router;
