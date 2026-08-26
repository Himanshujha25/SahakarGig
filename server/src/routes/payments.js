const router = require('express').Router();
const c = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const asyncHandler = require('../middleware/error');

router.post('/create-order', auth, rbac('Household'), asyncHandler(c.createOrder));
router.post('/verify', auth, rbac('Household'), asyncHandler(c.verifyAndCapture));
router.get('/invoice/:bookingId', auth, asyncHandler(c.getInvoice));

module.exports = router;
