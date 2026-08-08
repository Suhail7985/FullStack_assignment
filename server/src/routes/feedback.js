const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  toGive,
  submitFeedback,
  received,
  getById,
  listCycles,
  submitValidators,
} = require('../controllers/feedbackController');

const router = express.Router();

router.use(authenticate);

router.get('/cycles', listCycles);
router.get('/to-give', toGive);
router.get('/received', received);
router.post('/', submitValidators, validate, submitFeedback);
router.get('/:id', getById);

module.exports = router;
