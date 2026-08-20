/**
 * Wrapper for async route handlers to catch errors
 * Passes errors to the next middleware (error handler)
 */
export const asyncErrorHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Apply asyncErrorHandler to multiple route handlers
 */
export const wrapAsync = (handler) => asyncErrorHandler(handler);

