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

  // ── Prisma errors (kode espesifik)
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

  // ── Prisma validation/invocation errors (mesaj teknik — kache yo!)
  // PrismaClientValidationError, PrismaClientKnownRequestError, etc.
  if (
    err.name === 'PrismaClientValidationError' ||
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientUnknownRequestError' ||
    err.name === 'PrismaClientRustPanicError' ||
    err.name === 'PrismaClientInitializationError'
  ) {
    statusCode = 500;
    message = 'Erè trete done. Kontakte sipò teknik.';
    // Log reyèl erè a côté sèvè sèlman
    logger.error({
      type: err.name,
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      body: req.body
    });
    return res.status(statusCode).json({ success: false, message });
  }

  // ── JWT errors
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; message = 'Token pa valid.'; }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token ekspire. Konekte ankò.'; }

  // ── Validation errors (Joi, express-validator, etc.)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message || 'Done ou voye yo pa valid.';
  }

  // ── Log tout 500+ errors côté sèvè
  if (statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.originalUrl
    });
    // ✅ Pa janm retounen detay teknik bay kliyan an — menm nan development
    message = message.includes('Erè') ? message : 'Erè entèn sèvè. Kontakte sipò teknik.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    // ✅ Retire stack trace menm nan development — Prisma messages trò detaye
    // ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Wrapper async (évite try/catch répétitifs)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { notFound, errorHandler, asyncHandler };
