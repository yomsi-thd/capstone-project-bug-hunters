/**
 * An error that knows its own HTTP status.
 *
 * Today 98 of the 99 errors thrown in the services are a plain `new Error(...)`, so the
 * controller catching them has to guess — and mostly guesses 400. That is why
 * `updateProject` answers 400 for all three of "no such project", "not your project"
 * and "the database is down": a client cannot tell a user error from a system one, and
 * neither can whoever is running the demo.
 *
 * ⚠️ The status belongs to the place that THROWS, never to a regex over the message.
 * The team wrote this down when approve/reject grew a second failure mode: matching
 * /not found/i in the controller silently flips the status the day somebody rewords the
 * sentence.
 */

/**
 * The full set. Adding a case means adding it here, not inventing a status inline —
 * that is the whole point of having one table.
 *
 * ⚠️ 422 rather than 400 for validation. The line is: 400 = the request is broken as a
 * REQUEST (unparseable body, wrong content type), 422 = it parsed fine but says
 * something wrong, 409 = it says something fine that the current state does not allow.
 * That boundary is also the zod ↔ service boundary — zod refuses gives 422, a business
 * rule refuses gives 409.
 */
const CODES = {
    MALFORMED_REQUEST: 400,
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    // ⚠️ NOT_FOUND deliberately covers "does not exist" AND "exists but you may not see
    // it". Answering 403 for a PENDING project already tells a stranger it exists, and
    // ids are sequential integers. Do not split these apart.
    NOT_FOUND: 404,
    // The current state forbids the request: the project is archived, a level already
    // starts at that amount, an admin is reviewing what they filed themselves.
    CONFLICT: 409,
    INSUFFICIENT_FUNDS: 409,
    PAYLOAD_TOO_LARGE: 413,
    VALIDATION_FAILED: 422,
    INTERNAL: 500,
};

class AppError extends Error {
    /**
     * @param {number} status  HTTP status. Must match the code's entry in CODES.
     * @param {string} code    A machine-readable member of CODES.
     * @param {string} message A sentence for a person. This one reaches the browser.
     * @param {Array<{field: string, message: string}>|null} details
     *        Only ever set for VALIDATION_FAILED, where it says WHICH field is wrong —
     *        the thing the API cannot tell a client at all today.
     */
    constructor(status, code, message, details = null) {
        super(message);

        this.name = "AppError";
        this.status = status;
        this.code = code;
        this.details = details;

        // A brand, checked by errorHandler alongside `instanceof`.
        //
        // ⚠️ `instanceof` alone is not enough, and this was measured rather than
        // assumed: the backend is CommonJS while the tests are transformed to ESM, so a
        // test that imports this file and an app that requires it end up holding TWO
        // different AppError classes. Every error then fell through to 500 INTERNAL —
        // and the same thing happens for real if two copies of the module ever exist.
        // Branding is what React, Vue and Express all do about this.
        this.isAppError = true;

        // Keeps this constructor out of the stack trace, so the first frame is the line
        // that actually threw.
        Error.captureStackTrace?.(this, AppError);
    }

    /** The body sent to the client. See errorHandler for why `message` stays top level. */
    toJSON() {
        return { message: this.message, code: this.code, details: this.details };
    }
}

// Shorthands, so a throw site reads as one line rather than three arguments of ceremony.
const notFound = (message = "Not found") => new AppError(404, "NOT_FOUND", message);
const forbidden = (message) => new AppError(403, "FORBIDDEN", message);
const unauthenticated = (message) => new AppError(401, "UNAUTHENTICATED", message);
const conflict = (message) => new AppError(409, "CONFLICT", message);
const validationFailed = (message, details = null) =>
    new AppError(422, "VALIDATION_FAILED", message, details);

module.exports = {
    AppError,
    CODES,
    notFound,
    forbidden,
    unauthenticated,
    conflict,
    validationFailed,
};
