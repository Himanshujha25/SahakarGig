const router = require('express').Router();
const c = require('../controllers/certificationController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/error');

router.get('/', auth, asyncHandler(c.getCourses));
router.post('/create', auth, asyncHandler(c.createCourse));
router.post('/issue-direct', auth, asyncHandler(c.issueDirectCertificate));
router.post('/:courseId/submit-quiz', auth, asyncHandler(c.submitQuiz));

module.exports = router;
