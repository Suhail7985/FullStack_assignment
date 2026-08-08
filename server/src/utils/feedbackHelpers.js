const Employee = require('../models/Employee');
const FeedbackAssignment = require('../models/FeedbackAssignment');
const Feedback = require('../models/Feedback');
const PerformanceParameter = require('../models/PerformanceParameter');
const ApiError = require('./ApiError');

/**
 * Create FeedbackAssignment rows for a cycle from current manager relationships
 * within the company. Only active employees with a manager in the same company.
 */
async function createAssignmentsForCycle(companyId, cycleId) {
  const reports = await Employee.find({
    companyId,
    isActive: true,
    managerId: { $ne: null },
  }).select('_id managerId');

  if (!reports.length) {
    return [];
  }

  const docs = reports.map((emp) => ({
    companyId,
    cycleId,
    reviewerId: emp.managerId,
    employeeId: emp._id,
    status: 'pending',
  }));

  await FeedbackAssignment.insertMany(docs, { ordered: false }).catch((err) => {
    if (err.code !== 11000) {
      throw err;
    }
  });

  return FeedbackAssignment.find({ companyId, cycleId });
}

/**
 * Verify reviewer is authorized to review employee:
 * employee.managerId === reviewerId AND same company.
 */
async function assertCanReview(companyId, reviewerId, employeeId) {
  const employee = await Employee.findOne({
    _id: employeeId,
    companyId,
    isActive: true,
  });

  if (!employee) {
    throw new ApiError(404, 'Employee not found in your company');
  }

  if (!employee.managerId || employee.managerId.toString() !== reviewerId.toString()) {
    throw new ApiError(403, 'You are not authorized to review this employee');
  }

  return employee;
}

/**
 * Mark assignment completed when all active parameters have feedback rows.
 */
async function syncAssignmentStatus(companyId, cycleId, reviewerId, employeeId) {
  const paramCount = await PerformanceParameter.countDocuments({ isActive: true });
  const feedbackCount = await Feedback.countDocuments({
    companyId,
    cycleId,
    reviewerId,
    employeeId,
  });

  const status = feedbackCount >= paramCount && paramCount > 0 ? 'completed' : 'pending';

  await FeedbackAssignment.findOneAndUpdate(
    { companyId, cycleId, reviewerId, employeeId },
    { status },
    { new: true }
  );

  return status;
}

function monthLabel(month, year) {
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${names[month - 1]} ${year}`;
}

module.exports = {
  createAssignmentsForCycle,
  assertCanReview,
  syncAssignmentStatus,
  monthLabel,
};
