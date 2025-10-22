// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Default error response
  let error = {
    message: 'Internal server error',
    status: 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.message = 'Validation failed';
    error.status = 400;
    error.details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    error.message = 'Unauthorized';
    error.status = 401;
  } else if (err.name === 'ForbiddenError') {
    error.message = 'Forbidden';
    error.status = 403;
  } else if (err.name === 'NotFoundError') {
    error.message = 'Resource not found';
    error.status = 404;
  } else if (err.code === '23505') { // PostgreSQL unique violation
    error.message = 'Resource already exists';
    error.status = 409;
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    error.message = 'Referenced resource does not exist';
    error.status = 400;
  } else if (err.message) {
    error.message = err.message;
    if (err.status) {
      error.status = err.status;
    }
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal server error';
  }

  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Custom error classes
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
};
