'use strict';

/**
 * 404 handler – catches any route not matched above.
 */
function notFound(req, res, next) {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
  });
}

/**
 * Global error handler.
 * Keeps stack traces out of production responses.
 */
function errorHandler(err, req, res, next) {
  // Log the full error server-side (never expose to client)
  console.error('[DocuSaathi Error]', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
