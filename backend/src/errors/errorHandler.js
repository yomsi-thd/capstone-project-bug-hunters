const { AppError } = require("./AppError");

/**
 * The one place in the backend that decides an error's HTTP status and writes an error
 * body. Mounted in app.js after every route.
 *
 * `message` stays at the top level rather than being wrapped in { error: {...} }. The
 * frontend reads it with optional chaining in many places, so a wrapper would not throw
 * anywhere: every one of them would quietly render undefined. This shape only adds `code`
 * and `details`, which keeps the error contract backwards-compatible.
 *
 * It deliberately does not follow RFC 9457. That standard buys interoperability between
 * organisations, and this API has one consumer. On the frontend side only
 * src/api/apiError.js knows the shape, so adopting RFC 9457 later is one file to change.
 */

/**
 * Errors thrown by express.json() before any controller runs.
 *
 * The body parser rejects an oversized or malformed request before the router is reached,
 * so no controller's try/catch ever sees it. Without this the client gets an HTML error
 * page and nothing appears in the service logs at all.
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
     * and body-parser builds its errors that way. Honouring the flag reads the library's
     * own declaration rather than guessing from a status number.
     */
    const status = Number(err?.status ?? err?.statusCode);

    if (err?.expose === true && Number.isInteger(status) && status >= 400 && status < 500) {
        return { status, code: "MALFORMED_REQUEST", message: err.message, details: null };
    }

    return {
        status: 500,
        code: "INTERNAL",
        // Never the real message. An unexpected error here is a bug, a bad query or a
        // dead connection, and those messages carry table names, column names and
        // sometimes values. The stack goes to the log instead.
        message: "Something went wrong on our side.",
        details: null,
    };
}

// Express identifies an error handler by its four-parameter signature, so dropping the
// unused `next` turns this back into ordinary middleware and it silently stops catching
// anything.
function errorHandler(err, req, res, next) {
    const { status, code, message, details } = describe(err);

    // Only unexpected errors are logged with a stack. A 404 or a refused permission is
    // the API working, and logging those buries the entries that matter.
    if (status >= 500) {
        console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    }

    // Express has already begun writing the response, so handing this to its default
    // handler is the only safe move left.
    if (res.headersSent) {
        return next(err);
    }

    res.status(status).json({ message, code, details });
}

module.exports = errorHandler;
