const mongoose = require('mongoose');

/**
 * Expected reviewer -> employee pairs for a given feedback cycle.
 *
 * Why this exists:
 * - HR completion stats (expected / submitted / pending) are driven by these rows,
 *   not by hard-coded names or frontend math alone.
 * - Assignments are snapshotted from managerId relationships when a cycle is created,
 *   so later org-chart changes do not rewrite historical expected reviews.
 * - Completion is derived by checking whether all active parameters have Feedback rows
 *   for the assignment's cycle + reviewer + employee.
 */
const feedbackAssignmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    cycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedbackCycle',
      required: true,
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

feedbackAssignmentSchema.index(
  { cycleId: 1, reviewerId: 1, employeeId: 1 },
  { unique: true }
);
feedbackAssignmentSchema.index({ companyId: 1, cycleId: 1, status: 1 });
feedbackAssignmentSchema.index({ companyId: 1, reviewerId: 1, cycleId: 1 });

module.exports = mongoose.model('FeedbackAssignment', feedbackAssignmentSchema);
