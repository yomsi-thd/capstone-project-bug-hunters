const { validationFailed } = require("../errors/AppError");

/**
 * Turns a zod schema into middleware that checks the request body before a controller
 * runs, and answers 422 with a list of exactly which fields are wrong.
 *
 * That list is the thing this adds. Until now a bad body either fell through to a
 * NOT NULL constraint (500, no clue which field) or was refused one field at a time by
 * the service, so a form could never mark more than one input at once.
 *
 * ⚠️ WHERE THE LINE IS. zod checks the SHAPE of the request: is the field there, is it a
 * string, is it a number, is it too long. Everything that needs to read the database
 * stays in the service — at most five levels per project, no two active levels at the
 * same amount, an archived project is frozen, an admin may not review what they filed.
 *
 * Two reasons, and the second is the one that matters. Those rules need data zod does
 * not have; and a rule that lives in the service has no way around it, while a rule that
 * lives on a route only guards the callers that go through that route. It is exactly why
 * resolveOwnership is not a route guard.
 *
 * ⚠️ Schemas here are deliberately PERMISSIVE about anything the app already sends. The
 * create wizard posts empty strings for optional prose, base64 data URIs in `gallery`
 * and team members with whatever keys the form collected. A schema that tightened those
 * would not be catching bugs — it would be one.
 */
function formatIssues(error) {
    return error.issues.map((issue) => ({
        // "" for a problem with the body as a whole, which is the honest answer when
        // there is no single field to blame.
        field: issue.path.join("."),
        message: issue.message,
    }));
}

/**
 * Validates `req.body` and REPLACES it with the parsed value, so a coerced number
 * reaches the service as a number. Every object schema is built with `z.looseObject`,
 * so keys the schema does not mention survive rather than being silently dropped.
 */
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body ?? {});

        if (!result.success) {
            const details = formatIssues(result.error);

            return next(
                validationFailed(
                    details.length === 1
                        ? details[0].message
                        : `${details.length} fields need attention.`,
                    details
                )
            );
        }

        req.body = result.data;

        next();
    };
}

/**
 * The same for `req.query`.
 *
 * ⚠️ Express 5 makes req.query a getter with no setter, so the parsed value goes to
 * `req.validatedQuery` instead of being written back. Assigning to req.query throws
 * "Cannot set property query of #<IncomingMessage> which has only a getter".
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query ?? {});

        if (!result.success) {
            const details = formatIssues(result.error);

            return next(
                validationFailed(
                    details.length === 1 ? details[0].message : `${details.length} query parameters are invalid.`,
                    details
                )
            );
        }

        req.validatedQuery = result.data;

        next();
    };
}

module.exports = { validateBody, validateQuery };
