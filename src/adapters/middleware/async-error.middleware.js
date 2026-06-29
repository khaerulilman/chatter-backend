/**
 * Wrapper for async route handlers to catch errors
 * Passes errors to the next middleware (error handler)
 */
export const asyncErrorHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Apply asyncErrorHandler to multiple route handlers
 */
export const wrapAsync = (handler) => asyncErrorHandler(handler);
