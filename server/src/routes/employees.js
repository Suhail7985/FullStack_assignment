const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMe,
  getTeam,
  getById,
  listCompanyEmployees,
} = require('../controllers/employeeController');

const router = express.Router();

router.use(authenticate);

router.get('/me', getMe);
router.get('/team', getTeam);
router.get('/', authorize('hr', 'admin'), listCompanyEmployees);
router.get('/:id', getById);

module.exports = router;
