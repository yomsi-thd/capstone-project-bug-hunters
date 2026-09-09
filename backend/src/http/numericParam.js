const { notFound } = require("../errors/AppError");

/**
 * Refuses a route parameter that is not a positive integer, before it can reach a query.
 *
 * Every id in this API is a serial primary key, so /projects/abc cannot name a row.
 * Passed to Postgres it raises "invalid input syntax for type integer", which is a
 * database error about a client's typo.
 *
 * 404 rather than 400: an id that cannot exist names nothing, and NOT_FOUND already means
 * "there is nothing here". It also keeps the answer the same whether the id is
 * unparseable or simply unused, which is what makes an unapproved project 404 rather than
 * 403. ProjectDetail shows its "Project not found" screen on a 404, so a mistyped link
 * lands somewhere that explains itself.
 */
function numericParam(label = "Resource") {
    return (req, res, next, value) => {
        // Not Number(), which accepts "12.5", " 7 " and "1e3", none of which is an id.
        if (!/^\d+$/.test(String(value))) {
            return next(notFound(`${label} not found`));
        }

        next();
    };
}

/** Applies the check to every id-shaped parameter a router uses. */
function guardIdParams(router, params) {
    for (const [name, label] of Object.entries(params)) {
        router.param(name, numericParam(label));
    }
}

module.exports = { numericParam, guardIdParams };
