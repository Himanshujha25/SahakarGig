const router = require('express').Router();
const c = require('../controllers/welfareController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

router.get('/:providerId', auth, asyncHandler(c.getWelfare));
router.put('/:providerId', auth, asyncHandler(c.upsertWelfare));

module.exports = router;
