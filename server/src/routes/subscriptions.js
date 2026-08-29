const router = require('express').Router();
const c = require('../controllers/subscriptionController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const asyncHandler = require('../middleware/error');

router.get('/', auth, rbac('Household'), asyncHandler(c.overview));
router.post('/subscribe', auth, rbac('Household'), asyncHandler(c.subscribe));
router.post('/verify', auth, rbac('Household'), asyncHandler(c.verifySubscription));
router.post('/cancel', auth, rbac('Household'), asyncHandler(c.cancel));

module.exports = router;