const mongoose = require('mongoose');

/**
 * Global performance parameters shared by all companies.
 * Exactly five fixed parameters are seeded; not per-tenant.
 */
const performanceParameterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

performanceParameterSchema.index({ order: 1 });

module.exports = mongoose.model('PerformanceParameter', performanceParameterSchema);
