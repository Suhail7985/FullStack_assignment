const express = require('express');
const { authenticate } = require('../middleware/auth');
const { listParameters } = require('../controllers/parameterController');

const router = express.Router();

router.use(authenticate);
router.get('/', listParameters);

module.exports = router;
