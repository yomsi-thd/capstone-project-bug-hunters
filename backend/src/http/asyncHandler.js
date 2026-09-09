/**
 * Wraps an async route handler so a rejected promise reaches errorHandler.
 *
 * Express 5 already forwards rejected promises, so this is not strictly necessary. It is
 * kept because it states the intent where somebody reads the handler, and because it
 * stops the project depending on one Express major version: a downgrade, or a router
 * copied elsewhere, would otherwise turn every async throw into a hung request.
 */
const asyncHandler = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
