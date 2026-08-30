const router = require('express').Router();
const c = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

router.get('/', auth, asyncHandler(c.list));
router.patch('/read-all', auth, asyncHandler(c.markAllRead));
router.delete('/', auth, asyncHandler(c.clearAll));
router.patch('/:id/read', auth, asyncHandler(c.markRead));

module.exports = router;
