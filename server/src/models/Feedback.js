const mongoose = require('mongoose');

/**
 * One document per (cycle, reviewer, employee, parameter).
 * Historical reviews are never overwritten — each cycle gets its own rows.
 * Compound unique index prevents duplicate parameter scores for a review.
 */
const feedbackSchema = new mongoose.Schema(
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
    parameterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PerformanceParameter',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Score must be an integer between 1 and 5',
      },
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

feedbackSchema.index(
  { cycleId: 1, reviewerId: 1, employeeId: 1, parameterId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
