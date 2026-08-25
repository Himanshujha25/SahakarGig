const router = require('express').Router();
const c = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

router.post('/', auth, asyncHandler(c.createReview));
router.get('/provider/:providerId', asyncHandler(c.providerReviews));

module.exports = router;
