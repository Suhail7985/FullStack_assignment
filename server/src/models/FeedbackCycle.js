const mongoose = require('mongoose');

const feedbackCycleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

feedbackCycleSchema.index({ companyId: 1, year: 1, month: 1 }, { unique: true });

feedbackCycleSchema.virtual('label').get(function label() {
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
  return `${names[this.month - 1]} ${this.year}`;
});

feedbackCycleSchema.set('toJSON', { virtuals: true });
feedbackCycleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FeedbackCycle', feedbackCycleSchema);
