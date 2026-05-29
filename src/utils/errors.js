'use strict';

// Simple error helpers
function createError(message, statusCode = 500) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function validationError(message) {
  return createError(message, 400);
}

function notFoundError(resource = 'Resource') {
  return createError(`${resource} not found`, 404);
}

function unauthorizedError(message = 'Authentication required') {
  return createError(message, 401);
}

function forbiddenError(message = 'Access denied') {
  return createError(message, 403);
}

module.exports = {
  createError,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
};
