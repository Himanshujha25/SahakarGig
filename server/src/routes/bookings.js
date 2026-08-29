const router = require('express').Router();
const c = require('../controllers/bookingController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const asyncHandler = require('../middleware/error');

router.post('/', auth, rbac('Household'), asyncHandler(c.createBooking));
// AI Geospatial Broadcast & First-Acceptance Dispatch
router.post('/broadcast', auth, rbac('Household'), asyncHandler(c.createBroadcastBooking));
router.post('/:id/keepalive', auth, asyncHandler(c.keepaliveBroadcast));
router.get('/broadcast/available', auth, rbac('Provider'), asyncHandler(c.availableBroadcastBookings));
router.patch('/:id/broadcast-accept', auth, rbac('Provider'), asyncHandler(c.acceptBroadcastRequest));
router.get('/:id', auth, asyncHandler(c.getBooking));
router.get('/household/mine', auth, rbac('Household'), asyncHandler(c.householdBookings));
router.get('/provider/mine', auth, rbac('Provider'), asyncHandler(c.providerBookings));
router.patch('/:id/accept', auth, rbac('Provider'), asyncHandler(c.acceptBooking));
router.patch('/:id/status', auth, rbac('Provider'), asyncHandler(c.updateStatus));
router.patch('/:id/cancel', auth, asyncHandler(c.cancelBooking));
router.patch('/:id/dispute', auth, asyncHandler(c.disputeBooking));
router.patch('/:id/withdraw-dispute', auth, asyncHandler(c.withdrawDispute));
router.patch('/:id/reschedule', auth, asyncHandler(c.rescheduleBooking));
router.post('/:id/chat', auth, asyncHandler(c.addChat));

module.exports = router;
