const { body } = require('express-validator');
const Feedback = require('../models/Feedback');
const FeedbackCycle = require('../models/FeedbackCycle');
const FeedbackAssignment = require('../models/FeedbackAssignment');
const PerformanceParameter = require('../models/PerformanceParameter');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');
const { assertCanReview, monthLabel } = require('../utils/feedbackHelpers');

const submitValidators = [
  body('cycleId').isMongoId().withMessage('Valid cycleId is required'),
  body('employeeId').isMongoId().withMessage('Valid employeeId is required'),
  body('responses').isArray({ min: 1 }).withMessage('responses must be a non-empty array'),
  body('responses.*.parameterId').isMongoId().withMessage('Valid parameterId is required'),
  body('responses.*.score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Score must be an integer from 1 to 5'),
  body('responses.*.reason')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Reason is required for each parameter'),
];

async function getOpenCycle(companyId) {
  return FeedbackCycle.findOne({ companyId, status: 'open' }).sort({ year: -1, month: -1 });
}

async function toGive(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const reviewerId = req.user.employeeId;

    let cycle;
    if (req.query.cycleId) {
      cycle = await FeedbackCycle.findOne({ _id: req.query.cycleId, companyId });
    } else {
      cycle = await getOpenCycle(companyId);
    }

    if (!cycle) {
      return success(res, { cycle: null, assignments: [] });
    }

    const assignments = await FeedbackAssignment.find({
      companyId,
      cycleId: cycle._id,
      reviewerId,
    })
      .populate('employeeId', 'name email role')
      .sort({ status: 1 });

    const parameters = await PerformanceParameter.find({ isActive: true }).sort({ order: 1 });

    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const existing = await Feedback.find({
          companyId,
          cycleId: cycle._id,
          reviewerId,
          employeeId: a.employeeId._id,
        }).select('parameterId score reason');

        return {
          _id: a._id,
          status: a.status,
          employee: a.employeeId,
          submittedCount: existing.length,
          expectedCount: parameters.length,
          existingFeedback: existing,
        };
      })
    );

    return success(res, {
      cycle: {
        _id: cycle._id,
        month: cycle.month,
        year: cycle.year,
        status: cycle.status,
        label: monthLabel(cycle.month, cycle.year),
      },
      parameters,
      assignments: enriched,
    });
  } catch (err) {
    next(err);
  }
}

async function submitFeedback(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const reviewerId = req.user.employeeId;
    const { cycleId, employeeId, responses } = req.body;

    const cycle = await FeedbackCycle.findOne({ _id: cycleId, companyId });
    if (!cycle) {
      throw new ApiError(404, 'Feedback cycle not found');
    }
    if (cycle.status !== 'open') {
      throw new ApiError(403, 'This feedback cycle is closed');
    }

    await assertCanReview(companyId, reviewerId, employeeId);

    const assignment = await FeedbackAssignment.findOne({
      companyId,
      cycleId,
      reviewerId,
      employeeId,
    });

    if (!assignment) {
      throw new ApiError(403, 'No feedback assignment exists for this employee in this cycle');
    }

    if (assignment.status === 'completed') {
      throw new ApiError(409, 'Feedback already submitted for this employee in this cycle');
    }

    const parameters = await PerformanceParameter.find({ isActive: true }).sort({ order: 1 });

    if (responses.length !== parameters.length) {
      throw new ApiError(
        400,
        `Incomplete review: all ${parameters.length} parameters are required`
      );
    }

    const paramIds = new Set(parameters.map((p) => p._id.toString()));
    const seen = new Set();

    for (const response of responses) {
      const pid = response.parameterId.toString();
      if (!paramIds.has(pid)) {
        throw new ApiError(400, 'Invalid performance parameter');
      }
      if (seen.has(pid)) {
        throw new ApiError(400, 'Duplicate parameter in submission');
      }
      seen.add(pid);

      if (!Number.isInteger(response.score) || response.score < 1 || response.score > 5) {
        throw new ApiError(400, 'Score must be an integer from 1 to 5');
      }
      if (!response.reason || !String(response.reason).trim()) {
        throw new ApiError(400, 'Reason is required for each parameter');
      }
    }

    if (seen.size !== parameters.length) {
      throw new ApiError(
        400,
        `Incomplete review: all ${parameters.length} parameters are required`
      );
    }

    const existing = await Feedback.countDocuments({
      companyId,
      cycleId,
      reviewerId,
      employeeId,
    });

    if (existing > 0) {
      throw new ApiError(409, 'Feedback already submitted for this employee in this cycle');
    }

    const now = new Date();
    const docs = responses.map((r) => ({
      companyId,
      cycleId,
      reviewerId,
      employeeId,
      parameterId: r.parameterId,
      score: r.score,
      reason: String(r.reason).trim(),
      submittedAt: now,
    }));

    // Unique compound index enforces no duplicate parameter rows.
    await Feedback.insertMany(docs);
    assignment.status = 'completed';
    await assignment.save();

    const created = await Feedback.find({
      companyId,
      cycleId,
      reviewerId,
      employeeId,
    }).populate('parameterId', 'name order');

    return success(
      res,
      {
        message: 'Feedback submitted successfully',
        feedback: created,
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

async function received(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const employeeId = req.user.employeeId;

    const feedback = await Feedback.find({ companyId, employeeId })
      .populate('parameterId', 'name order')
      .populate('reviewerId', 'name email role')
      .populate('cycleId', 'month year status')
      .sort({ submittedAt: -1 });

    const byCycle = {};
    for (const item of feedback) {
      const cycle = item.cycleId;
      if (!cycle) continue;
      const key = cycle._id.toString();
      if (!byCycle[key]) {
        byCycle[key] = {
          cycle: {
            _id: cycle._id,
            month: cycle.month,
            year: cycle.year,
            status: cycle.status,
            label: monthLabel(cycle.month, cycle.year),
          },
          reviewer: item.reviewerId,
          parameters: [],
        };
      }
      byCycle[key].parameters.push({
        _id: item._id,
        parameter: item.parameterId,
        score: item.score,
        reason: item.reason,
        submittedAt: item.submittedAt,
      });
    }

    const reviews = Object.values(byCycle).sort((a, b) => {
      if (a.cycle.year !== b.cycle.year) return b.cycle.year - a.cycle.year;
      return b.cycle.month - a.cycle.month;
    });

    for (const review of reviews) {
      review.parameters.sort((a, b) => (a.parameter?.order || 0) - (b.parameter?.order || 0));
    }

    return success(res, { reviews });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const feedback = await Feedback.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    })
      .populate('parameterId', 'name order')
      .populate('reviewerId', 'name email')
      .populate('employeeId', 'name email')
      .populate('cycleId', 'month year status');

    if (!feedback) {
      throw new ApiError(404, 'Feedback not found');
    }

    const isReviewer = feedback.reviewerId._id.toString() === req.user.employeeId;
    const isSubject = feedback.employeeId._id.toString() === req.user.employeeId;
    const isHr = ['hr', 'admin'].includes(req.user.role);

    if (!isReviewer && !isSubject && !isHr) {
      throw new ApiError(403, 'You are not authorized to view this feedback');
    }

    return success(res, { feedback });
  } catch (err) {
    next(err);
  }
}

async function listCycles(req, res, next) {
  try {
    const cycles = await FeedbackCycle.find({ companyId: req.user.companyId }).sort({
      year: -1,
      month: -1,
    });

    const data = cycles.map((c) => ({
      _id: c._id,
      month: c.month,
      year: c.year,
      status: c.status,
      label: monthLabel(c.month, c.year),
    }));

    return success(res, { cycles: data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  toGive,
  submitFeedback,
  received,
  getById,
  listCycles,
  submitValidators,
};
