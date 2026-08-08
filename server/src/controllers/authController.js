const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');

const loginValidators = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const employee = await Employee.findOne({ email: email.toLowerCase() }).select(
      '+passwordHash'
    );

    if (!employee || !employee.isActive) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const match = await bcrypt.compare(password, employee.passwordHash);
    if (!match) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = jwt.sign(
      {
        employeeId: employee._id.toString(),
        companyId: employee.companyId.toString(),
        role: employee.role,
      },
      (process.env.JWT_SECRET || '').trim(),
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d').trim() }
    );

    const company = await Company.findById(employee.companyId).select('name slug');

    return success(res, {
      token,
      user: {
        ...employee.toSafeObject(),
        company,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const employee = await Employee.findById(req.user.employeeId);
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }
    const company = await Company.findById(employee.companyId).select('name slug');
    return success(res, {
      user: {
        ...employee.toSafeObject(),
        company,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, loginValidators };
