const express = require('express');
const { authenticate } = require('../middleware/auth');
const { myHistory, employeeHistory } = require('../controllers/performanceController');

const router = express.Router();

router.use(authenticate);

router.get('/history', myHistory);
router.get('/history/:employeeId', employeeHistory);

module.exports = router;
