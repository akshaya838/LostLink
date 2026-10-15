function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler: turns Mongoose errors into clean 4xx responses
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }
  const status = err.status || 500;
  if (status >= 500) console.error('[item-service] Error:', err);
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
}

module.exports = { notFound, errorHandler };
