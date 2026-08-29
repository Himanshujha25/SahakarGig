const router = require('express').Router();
const c = require('../controllers/favoriteController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

// NOTE: `/ids` is registered before any `/:param` routes to avoid conflicts.
router.get('/', auth, asyncHandler(c.getFavorites));
router.get('/ids', auth, asyncHandler(c.getFavoriteIds));
router.post('/:providerId', auth, asyncHandler(c.addFavorite));
router.delete('/:providerId', auth, asyncHandler(c.removeFavorite));

module.exports = router;