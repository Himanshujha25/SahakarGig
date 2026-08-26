const router = require('express').Router();
const c = require('../controllers/federationController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

const fedOnly = (req, res, next) => {
  if (req.user.role !== 'Federation Admin') return res.status(403).json({ message: 'Federation Admin only' });
  next();
};

router.use(auth, fedOnly);
router.get('/dashboard', asyncHandler(c.dashboard));
router.get('/cooperatives', asyncHandler(c.listCooperatives));
router.post('/cooperatives/onboard', asyncHandler(c.onboardCooperative));
router.patch('/commission', asyncHandler(c.updateCommission));

module.exports = router;
