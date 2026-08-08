const PerformanceParameter = require('../models/PerformanceParameter');
const { success } = require('../utils/response');

async function listParameters(_req, res, next) {
  try {
    const parameters = await PerformanceParameter.find({ isActive: true }).sort({ order: 1 });
    return success(res, { parameters });
  } catch (err) {
    next(err);
  }
}

module.exports = { listParameters };
