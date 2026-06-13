/**
 * Error Handling Middleware
 * Centralized error handler for all routes
 */

const logger = require('../utils/logger');

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  // Log error
  logger.error(`${message}`, {
    statusCode,
    errorCode,
    path: req.path,
    method: req.method,
    userId: req.userId,
    stack: err.stack,
  });

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  // MongoDB cast error
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  }

  // Mongoose schema validation
  if (err.name === 'MongoServerError' && err.code === 121) {
    statusCode = 400;
    errorCode = 'SCHEMA_VALIDATION_ERROR';
    message = 'Document does not match schema';
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errorCode,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found middleware
 */
const notFound = (req, res, next) => {
  const error = new APIError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Validation error formatter
 */
const formatValidationErrors = (errors) => {
  const formatted = {};
  errors.array().forEach((error) => {
    if (error.param) {
      formatted[error.param] = error.msg;
    }
  });
  return formatted;
};

/**
 * Throw API error with specific status code
 */
const throwError = (message, statusCode = 400, errorCode = 'BAD_REQUEST') => {
  throw new APIError(message, statusCode, errorCode);
};

module.exports = {
  APIError,
  errorHandler,
  asyncHandler,
  notFound,
  formatValidationErrors,
  throwError,
};
