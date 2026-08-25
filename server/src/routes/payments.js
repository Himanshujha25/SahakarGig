const router = require('express').Router();
const c = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const asyncHandler = require('../middleware/error');

router.post('/capture', auth, rbac('Household'), asyncHandler(c.capturePayment));
router.get('/invoice/:bookingId', auth, asyncHandler(c.getInvoice));

module.exports = router;
