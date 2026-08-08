const ApiError = require('../utils/ApiError');

function errorHandler(err, _req, res, _next) {
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details,
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate record — this feedback may already exist',
    });
  }

  const statusCode = err.statusCode || 500;
  const message =
    err.isOperational || statusCode < 500 || process.env.VERCEL
      ? err.message || 'Internal server error'
      : 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error('[api-error]', statusCode, err.message, err.stack);
  }

  const body = { success: false, message };
  if (err.details) {
    body.details = err.details;
  }
  return res.status(statusCode).json(body);
}

function notFound(_req, _res, next) {
  next(new ApiError(404, 'Route not found'));
}

module.exports = { errorHandler, notFound };
