const { notFound } = require("../errors/AppError");

/**
 * Refuses a route parameter that is not a positive integer, before it can reach a query.
 *
 * Every id in this API is a SERIAL primary key, so `/projects/abc` cannot name a row. Sent
 * to Postgres it raises `invalid input syntax for type integer`, which is a database error
 * about a client's typo.
 *
 * ⚠️ This exists because removing the controllers' try/catch would otherwise have turned
 * those into 500s. They answered 404 before, since the old handlers mapped every failure
 * to one status — accidentally right, and worth keeping deliberately: ProjectDetail shows
 * its "Project not found" screen on a 404, so a stale or mistyped link like /project/abc
 * would have started showing a generic "something went wrong" instead.
 *
 * 404 rather than 400: an id that cannot exist names nothing, and NOT_FOUND already covers
 * "there is nothing here" for this API. It also keeps the answer identical whether the id
 * is unparseable or simply unused, which is the same reasoning that makes an unapproved
 * project 404 instead of 403.
 */
function numericParam(label = "Resource") {
    return (req, res, next, value) => {
        // Not Number(): that accepts "12.5", " 7 " and "1e3", none of which is an id.
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
