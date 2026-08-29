const router = require('express').Router();
const c = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const asyncHandler = require('../middleware/error');

router.get('/household', auth, rbac('Household'), asyncHandler(c.householdInsights));

module.exports = router;