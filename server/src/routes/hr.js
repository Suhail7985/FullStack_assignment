const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  feedbackStatus,
  pendingFeedback,
  feedbackSummary,
} = require('../controllers/hrController');

const router = express.Router();

router.use(authenticate);
router.use(authorize('hr', 'admin'));

router.get('/feedback-status', feedbackStatus);
router.get('/pending-feedback', pendingFeedback);
router.get('/feedback-summary', feedbackSummary);

module.exports = router;
