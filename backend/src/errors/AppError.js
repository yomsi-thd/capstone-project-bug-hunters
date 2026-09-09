/**
 * An error that knows its own HTTP status.
 *
 * With plain `new Error(...)` the controller catching it has to guess, and usually
 * guesses 400, so "no such project", "not your project" and "the database is down" all
 * come back the same. A client cannot then tell a user error from a system one.
 *
 * The status belongs to the place that throws, never to a regex over the message:
 * matching /not found/i in a controller silently flips the status the day somebody
 * rewords the sentence.
 */

/**
 * The full set. A new case is added here rather than given a status inline, which is the
 * point of having one table.
 *
 * 422 rather than 400 for validation. The line is: 400 means the request is broken as a
 * request, such as an unparseable body; 422 means it parsed but says something wrong; 409
 * means it says something fine that the current state does not allow. That is also the
 * zod-versus-service boundary: zod refusing gives 422, a business rule refusing gives 409.
 */
const CODES = {
    MALFORMED_REQUEST: 400,
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    // NOT_FOUND covers both "does not exist" and "exists but you may not see it".
    // Answering 403 for a PENDING project already tells a stranger it exists, and ids are
    // sequential integers. Don't split these apart.
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
     *        Only set for VALIDATION_FAILED, where it names which field is wrong.
     */
    constructor(status, code, message, details = null) {
        super(message);

        this.name = "AppError";
        this.status = status;
        this.code = code;
        this.details = details;

        // A brand, checked by errorHandler alongside `instanceof`.
        //
        // `instanceof` alone is not enough. The backend is CommonJS while the tests are
        // transformed to ESM, so a test importing this file and an app requiring it hold
        // two different AppError classes and every error falls through to 500. The same
        // happens for real whenever two copies of the module exist.
        this.isAppError = true;

        // Keeps this constructor out of the stack trace, so the first frame is the line
        // that threw.
        Error.captureStackTrace?.(this, AppError);
    }

    /** The body sent to the client. See errorHandler for why `message` stays top level. */
    toJSON() {
        return { message: this.message, code: this.code, details: this.details };
    }
}

// Shorthands, so a throw site reads as one line.
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
