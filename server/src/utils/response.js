function success(res, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

function fail(res, message, statusCode = 400, details = null) {
  const body = {
    success: false,
    message,
  };
  if (details) {
    body.details = details;
  }
  return res.status(statusCode).json(body);
}

module.exports = { success, fail };
