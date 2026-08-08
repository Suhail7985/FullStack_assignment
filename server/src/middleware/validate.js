const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new ApiError(
        400,
        'Validation failed',
        errors.array().map((e) => ({ field: e.path, message: e.msg }))
      )
    );
  }
  next();
}

module.exports = { validate };
