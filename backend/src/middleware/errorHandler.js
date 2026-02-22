// src/middleware/errorHandler.js
const logger = require('../config/logger');

// 404 Handler
const notFound = (req, res, next) => {
  const error = new Error(`Route pa jwenn: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message || 'Erè entèn sèvè';

  // Prisma errors
  if (err.code === 'P2002') {
    statusCode = 409;
    const field = err.meta?.target?.[0] || 'field';
    message = `${field} deja egziste nan sistèm nan.`;
  }
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Resous pa jwenn.';
  }
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Referans done pa valid.';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; message = 'Token pa valid.'; }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token ekspire. Konekte ankò.'; }

  // Log server errors
  if (statusCode >= 500) {
    logger.error({ message: err.message, stack: err.stack, url: req.originalUrl });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Wrapper async (évite try/catch répétitifs)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { notFound, errorHandler, asyncHandler };
