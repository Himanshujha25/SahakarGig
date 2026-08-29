const router = require('express').Router();
const c = require('../controllers/welfareController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');
const Provider = require('../models/Provider');

const providerOnly = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'CooperativeAdmin' || req.user.role === 'FederationAdmin' || req.user.role === 'Cooperative Admin' || req.user.role === 'Federation Admin') return next();
  const p = await Provider.findOne({ userId: req.user.userId, _id: req.params.providerId });
  if (!p) return res.status(403).json({ message: 'Forbidden' });
  next();
});

// ── SCHEME & CLAIM MANAGEMENT ──
router.post('/schemes', auth, asyncHandler(c.createScheme));
router.get('/schemes', asyncHandler(c.listSchemes));
router.patch('/schemes/:id', auth, asyncHandler(c.updateScheme));

router.post('/claims', auth, asyncHandler(c.applyClaim));
router.get('/claims', asyncHandler(c.listClaims));
router.patch('/claims/:id/review', auth, asyncHandler(c.reviewClaim));
router.post('/claims/:id/disburse', auth, asyncHandler(c.disburseClaim));
router.get('/federation/summary', asyncHandler(c.getFederationWelfareSummary));

// ── INDIVIDUAL MEMBER WELFARE & E-SHRAM ──
router.get('/:providerId', auth, asyncHandler(c.getWelfare));
router.get('/:providerId/qr', auth, asyncHandler(c.getWelfareQR));
router.put('/:providerId', auth, providerOnly, asyncHandler(c.upsertWelfare));
router.post('/:providerId/verify-eshram', auth, providerOnly, asyncHandler(c.verifyEShram));

module.exports = router;
