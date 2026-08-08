const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new ApiError(401, 'Invalid or expired token');
    }

    const employee = await Employee.findById(payload.employeeId);
    if (!employee || !employee.isActive) {
      throw new ApiError(401, 'User not found or inactive');
    }

    // Tenant and identity always come from JWT + DB — never from request body.
    req.user = {
      employeeId: employee._id.toString(),
      companyId: employee.companyId.toString(),
      role: employee.role,
      name: employee.name,
      email: employee.email,
    };
    req.employee = employee;
    next();
  } catch (err) {
    next(err);
  }
}

function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
