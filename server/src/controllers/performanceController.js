const Feedback = require('../models/Feedback');
const FeedbackCycle = require('../models/FeedbackCycle');
const PerformanceParameter = require('../models/PerformanceParameter');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');
const { monthLabel } = require('../utils/feedbackHelpers');

async function buildHistory(companyId, employeeId) {
  const parameters = await PerformanceParameter.find({ isActive: true }).sort({ order: 1 });
  const feedback = await Feedback.find({ companyId, employeeId })
    .populate('parameterId', 'name order')
    .populate('reviewerId', 'name email')
    .populate('cycleId', 'month year status');

  const cycleMap = {};

  for (const item of feedback) {
    if (!item.cycleId || !item.parameterId) continue;
    const key = item.cycleId._id.toString();
    if (!cycleMap[key]) {
      cycleMap[key] = {
        cycle: {
          _id: item.cycleId._id,
          month: item.cycleId.month,
          year: item.cycleId.year,
          status: item.cycleId.status,
          label: monthLabel(item.cycleId.month, item.cycleId.year),
        },
        reviewer: item.reviewerId,
        scores: {},
        details: [],
      };
    }
    cycleMap[key].scores[item.parameterId.name] = item.score;
    cycleMap[key].details.push({
      parameter: item.parameterId.name,
      parameterId: item.parameterId._id,
      order: item.parameterId.order,
      score: item.score,
      reason: item.reason,
      reviewer: item.reviewerId,
    });
  }

  const history = Object.values(cycleMap).sort((a, b) => {
    if (a.cycle.year !== b.cycle.year) return a.cycle.year - b.cycle.year;
    return a.cycle.month - b.cycle.month;
  });

  for (const row of history) {
    row.details.sort((a, b) => a.order - b.order);
    const values = Object.values(row.scores);
    row.average =
      values.length > 0
        ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
        : null;
  }

  const byParameter = parameters.map((p) => ({
    parameter: { _id: p._id, name: p.name, order: p.order },
    series: history.map((h) => ({
      cycle: h.cycle,
      score: h.scores[p.name] ?? null,
    })),
  }));

  return {
    parameters: parameters.map((p) => ({ _id: p._id, name: p.name, order: p.order })),
    history,
    byParameter,
  };
}

async function myHistory(req, res, next) {
  try {
    const data = await buildHistory(req.user.companyId, req.user.employeeId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function employeeHistory(req, res, next) {
  try {
    const { employeeId } = req.params;
    const companyId = req.user.companyId;

    const employee = await Employee.findOne({ _id: employeeId, companyId });
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    const isSelf = employeeId === req.user.employeeId;
    const isManager = employee.managerId?.toString() === req.user.employeeId;
    const isHr = ['hr', 'admin'].includes(req.user.role);

    if (!isSelf && !isManager && !isHr) {
      throw new ApiError(403, 'You can only access your own performance history');
    }

    const data = await buildHistory(companyId, employeeId);
    return success(res, { employee: employee.toSafeObject(), ...data });
  } catch (err) {
    next(err);
  }
}

module.exports = { myHistory, employeeHistory };
