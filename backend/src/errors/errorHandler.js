const { AppError } = require("./AppError");

/**
 * The ONE place in the backend that decides an error's HTTP status and writes an error
 * body. Mounted in app.js after every route.
 *
 * ⚠️ `message` stays at the TOP LEVEL of the response and is not wrapped in
 * `{ error: {...} }`. 36 places in the frontend read `err.response?.data?.message`, and
 * because they read it with `?.` a wrapper would not throw anywhere — all 36 would
 * quietly render `undefined`. So this shape only ADDS `code` and `details`, which makes
 * the whole error contract a non-breaking change.
 *
 * This is a deliberate deviation from RFC 9457 (Problem Details). That standard's value
 * is interoperability between organisations, and this API has exactly one consumer: the
 * team's own frontend. The deviation is paid for on the frontend side by src/api/apiError.js,
 * which is the only file that knows the shape — so adopting RFC 9457 later is one file
 * to change rather than thirty-six.
 */

/**
 * Errors thrown by express.json() before any controller runs.
 *
 * These are the reason a 10mb upload currently returns an HTML page instead of JSON: the
 * body parser rejects the request before the router is reached, so no controller's
 * try/catch ever sees it. The team spent time on 2026-08-11 chasing exactly this,
 * because nothing appeared in the service logs at all.
 */
const BODY_PARSER_CODES = {
    "entity.too.large": {
        status: 413,
        code: "PAYLOAD_TOO_LARGE",
        message:
            "That request is too large. Images are stored inside the project row, so a " +
            "very large photo can exceed the 10mb limit — try a smaller one.",
    },
    "entity.parse.failed": {
        status: 400,
        code: "MALFORMED_REQUEST",
        message: "The request body is not valid JSON.",
    },
    "encoding.unsupported": {
        status: 400,
        code: "MALFORMED_REQUEST",
        message: "The request body uses an encoding this API cannot read.",
    },
};

/** See the `isAppError` note in AppError.js for why `instanceof` alone is not enough. */
const isAppError = (err) => err instanceof AppError || err?.isAppError === true;

function describe(err) {
    if (isAppError(err)) {
        return { status: err.status, code: err.code, message: err.message, details: err.details };
    }

    const fromParser = BODY_PARSER_CODES[err?.type];

    if (fromParser) {
        return { ...fromParser, details: null };
    }

    /**
     * http-errors sets `expose: true` on errors whose message is safe to show a client,
     * and body-parser builds its errors that way. Honouring that flag is reading a
     * library's own declaration, not guessing from a status number.
     */
    const status = Number(err?.status ?? err?.statusCode);

    if (err?.expose === true && Number.isInteger(status) && status >= 400 && status < 500) {
        return { status, code: "MALFORMED_REQUEST", message: err.message, details: null };
    }

    return {
        status: 500,
        code: "INTERNAL",
        // ⚠️ Never the real message. An unexpected error here is a bug, a bad query or a
        // dead connection, and those messages carry table names, column names and
        // sometimes values. The stack goes to the log, where the team can read it.
        message: "Something went wrong on our side.",
        details: null,
    };
}

// eslint-disable-next-line no-unused-vars -- Express identifies an error handler by its
// four-parameter signature; dropping `next` turns this back into ordinary middleware and
// it silently stops catching anything.
function errorHandler(err, req, res, next) {
    const { status, code, message, details } = describe(err);

    // Only the unexpected ones are logged with a stack. A 404 or a refused permission is
    // the API working, and logging those buries the entries that matter.
    if (status >= 500) {
        console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    }

    // Express has already begun writing on a streamed or double-sent response; handing
    // it to Express's default handler is the only safe move left.
    if (res.headersSent) {
        return next(err);
    }

    res.status(status).json({ message, code, details });
}

module.exports = errorHandler;
