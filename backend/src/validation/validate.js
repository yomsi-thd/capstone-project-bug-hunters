const { validationFailed } = require("../errors/AppError");

/**
 * Turns a zod schema into middleware that checks a request before the controller runs and
 * answers 422 naming exactly which fields are wrong. That list is what it adds: without
 * it a bad body either reaches a NOT NULL constraint as a 500, or is refused one field at
 * a time so a form can never mark more than one input.
 *
 * Where the line is: zod checks the shape of the request, meaning is the field there, is
 * it a string, is it too long. Anything that has to read the database stays in the
 * service, such as the per-project level limit or an admin reviewing what they filed.
 *
 * Two reasons for that, and the second matters more. Those rules need data zod does not
 * have; and a rule in the service cannot be routed around, while a rule on a route guards
 * only the callers that go through it. It is why resolveOwnership is not a route guard.
 *
 * The schemas are permissive about anything the app already sends: empty strings for
 * optional prose, base64 data URIs in `gallery`, team members with whatever keys the form
 * collected. Tightening those would not catch a bug, it would be one.
 */
function formatIssues(error) {
    return error.issues.map((issue) => ({
        // "" when the problem is with the body as a whole and there is no single field
        // to blame.
        field: issue.path.join("."),
        message: issue.message,
    }));
}

/**
 * Validates req.body and replaces it with the parsed value, so a coerced number reaches
 * the service as a number. Every object schema uses z.looseObject, so keys the schema
 * does not mention survive rather than being dropped.
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
 * The same for req.query.
 *
 * Express 5 makes req.query a getter with no setter, so the parsed value goes to
 * req.validatedQuery rather than being written back. Assigning to req.query throws.
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
