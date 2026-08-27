const router = require('express').Router();
const c = require('../controllers/providerController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const asyncHandler = require('../middleware/error');

router.get('/', asyncHandler(c.listProviders));
router.get('/cooperatives', asyncHandler(c.listCooperatives));
router.get('/me', auth, asyncHandler(c.me));
router.get('/:id/slots', asyncHandler(c.getSlots));
router.get('/:id', asyncHandler(c.getProvider));
router.patch('/:id', auth, asyncHandler(c.updateProfile));
router.post('/:id/avatar', auth, upload.single('avatar'), asyncHandler(c.uploadAvatar));
router.post('/:id/docs', auth, upload.single('doc'), asyncHandler(c.uploadDoc));

module.exports = router;
