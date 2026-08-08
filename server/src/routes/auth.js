const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { login, me, loginValidators } = require('../controllers/authController');

const router = express.Router();

router.post('/login', loginValidators, validate, login);
router.get('/me', authenticate, me);

module.exports = router;
