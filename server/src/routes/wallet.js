const router = require('express').Router();
const c = require('../controllers/walletController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const asyncHandler = require('../middleware/error');

router.get('/', auth, rbac('Household'), asyncHandler(c.walletOverview));
router.post('/topup', auth, rbac('Household'), asyncHandler(c.createTopup));
router.post('/topup/verify', auth, rbac('Household'), asyncHandler(c.verifyTopup));
router.post('/dev-topup', auth, rbac('Household'), asyncHandler(c.devTopup));

module.exports = router;