/**
 * Wraps an async route handler so a rejected promise reaches errorHandler.
 *
 * ⚠️ Express 5 already forwards a rejected promise to the error handler, so this is
 * technically unnecessary. It is kept for two reasons: it states the intention at the
 * place someone reads the handler, and it stops the project depending on a detail of
 * one Express major version — a downgrade, or a router copied into another project,
 * would otherwise turn every async throw into a hung request with no clue why.
 *
 * Five lines is a cheap price for not having to remember that.
 */
const asyncHandler = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
