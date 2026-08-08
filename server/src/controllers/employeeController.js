const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');

async function getMe(req, res, next) {
  try {
    const employee = await Employee.findById(req.user.employeeId).populate(
      'managerId',
      'name email role'
    );
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }
    return success(res, { employee: employee.toSafeObject(), manager: employee.managerId });
  } catch (err) {
    next(err);
  }
}

async function getTeam(req, res, next) {
  try {
    const team = await Employee.find({
      companyId: req.user.companyId,
      managerId: req.user.employeeId,
      isActive: true,
    })
      .select('-passwordHash')
      .sort({ name: 1 });

    return success(res, { team });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).select('-passwordHash');

    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    const isSelf = employee._id.toString() === req.user.employeeId;
    const isManager = employee.managerId?.toString() === req.user.employeeId;
    const isHr = ['hr', 'admin'].includes(req.user.role);

    if (!isSelf && !isManager && !isHr) {
      throw new ApiError(403, 'You are not authorized to view this employee');
    }

    return success(res, { employee });
  } catch (err) {
    next(err);
  }
}

async function listCompanyEmployees(req, res, next) {
  try {
    if (!['hr', 'admin'].includes(req.user.role)) {
      throw new ApiError(403, 'HR access required');
    }

    const employees = await Employee.find({
      companyId: req.user.companyId,
      isActive: true,
    })
      .select('-passwordHash')
      .populate('managerId', 'name email')
      .sort({ name: 1 });

    return success(res, { employees });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, getTeam, getById, listCompanyEmployees };
