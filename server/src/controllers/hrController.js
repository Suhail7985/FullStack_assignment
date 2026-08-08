const FeedbackAssignment = require('../models/FeedbackAssignment');
const FeedbackCycle = require('../models/FeedbackCycle');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');
const { monthLabel } = require('../utils/feedbackHelpers');

async function resolveCycle(companyId, cycleId) {
  if (cycleId) {
    const cycle = await FeedbackCycle.findOne({ _id: cycleId, companyId });
    if (!cycle) {
      throw new ApiError(404, 'Feedback cycle not found');
    }
    return cycle;
  }
  return FeedbackCycle.findOne({ companyId, status: 'open' }).sort({ year: -1, month: -1 });
}

function formatCycle(cycle) {
  if (!cycle) return null;
  return {
    _id: cycle._id,
    month: cycle.month,
    year: cycle.year,
    status: cycle.status,
    label: monthLabel(cycle.month, cycle.year),
  };
}

async function feedbackStatus(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const cycle = await resolveCycle(companyId, req.query.cycleId);

    if (!cycle) {
      return success(res, {
        company: await Company.findById(companyId).select('name slug'),
        cycle: null,
        reviewers: [],
        summary: { expected: 0, submitted: 0, pending: 0, completion: 0 },
      });
    }

    const assignments = await FeedbackAssignment.find({ companyId, cycleId: cycle._id })
      .populate('reviewerId', 'name email role')
      .populate('employeeId', 'name email role');

    const byReviewer = {};

    for (const a of assignments) {
      const rid = a.reviewerId._id.toString();
      if (!byReviewer[rid]) {
        byReviewer[rid] = {
          reviewer: a.reviewerId,
          expected: 0,
          submitted: 0,
          pending: 0,
          pendingEmployees: [],
        };
      }
      byReviewer[rid].expected += 1;
      if (a.status === 'completed') {
        byReviewer[rid].submitted += 1;
      } else {
        byReviewer[rid].pending += 1;
        byReviewer[rid].pendingEmployees.push(a.employeeId);
      }
    }

    const reviewers = Object.values(byReviewer).map((r) => ({
      ...r,
      status: r.pending === 0 ? 'Complete' : 'Pending',
    }));

    reviewers.sort((a, b) => a.reviewer.name.localeCompare(b.reviewer.name));

    const expected = assignments.length;
    const submitted = assignments.filter((a) => a.status === 'completed').length;
    const pending = expected - submitted;
    const completion = expected === 0 ? 0 : Math.round((submitted / expected) * 1000) / 10;

    const company = await Company.findById(companyId).select('name slug');

    return success(res, {
      company,
      cycle: formatCycle(cycle),
      reviewers,
      summary: { expected, submitted, pending, completion },
    });
  } catch (err) {
    next(err);
  }
}

async function pendingFeedback(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const cycle = await resolveCycle(companyId, req.query.cycleId);

    if (!cycle) {
      return success(res, { cycle: null, pending: [] });
    }

    const filter = {
      companyId,
      cycleId: cycle._id,
      status: 'pending',
    };

    if (req.query.reviewerId) {
      filter.reviewerId = req.query.reviewerId;
    }

    const pending = await FeedbackAssignment.find(filter)
      .populate('reviewerId', 'name email role')
      .populate('employeeId', 'name email role')
      .sort({ createdAt: 1 });

    const items = pending.map((a) => ({
      _id: a._id,
      reviewer: a.reviewerId,
      employee: a.employeeId,
      label: `${a.reviewerId.name} -> ${a.employeeId.name}`,
    }));

    return success(res, {
      cycle: formatCycle(cycle),
      pending: items,
    });
  } catch (err) {
    next(err);
  }
}

async function feedbackSummary(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const cycles = await FeedbackCycle.find({ companyId }).sort({ year: -1, month: -1 });

    const summaries = await Promise.all(
      cycles.map(async (cycle) => {
        const assignments = await FeedbackAssignment.find({ companyId, cycleId: cycle._id });
        const expected = assignments.length;
        const submitted = assignments.filter((a) => a.status === 'completed').length;
        const pending = expected - submitted;
        return {
          cycle: formatCycle(cycle),
          expected,
          submitted,
          pending,
          completion: expected === 0 ? 0 : Math.round((submitted / expected) * 1000) / 10,
        };
      })
    );

    return success(res, { summaries });
  } catch (err) {
    next(err);
  }
}

module.exports = { feedbackStatus, pendingFeedback, feedbackSummary };
