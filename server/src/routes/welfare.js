const router = require('express').Router();
const c = require('../controllers/welfareController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');
const Provider = require('../models/Provider');

const providerOnly = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'Cooperative Admin' || req.user.role === 'Federation Admin') return next();
  const p = await Provider.findOne({ userId: req.user.userId, _id: req.params.providerId });
  if (!p) return res.status(403).json({ message: 'Forbidden' });
  next();
});

router.get('/:providerId', auth, asyncHandler(c.getWelfare));
router.get('/:providerId/qr', auth, asyncHandler(c.getWelfareQR));
router.put('/:providerId', auth, providerOnly, asyncHandler(c.upsertWelfare));

module.exports = router;
