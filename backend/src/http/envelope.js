const { z } = require("zod");

/**
 * The shape every list endpoint answers with:
 *
 *     { "items": [...], "total": 3, "limit": null, "offset": 0 }
 *
 * `items` rather than `data`, because with axios the latter reads response.data.data.
 *
 * The envelope is for a uniform contract rather than for pagination. Its value is that
 * the day an endpoint does need paging, adding it is not a breaking change, and neither
 * is adding a cursor if offsets stop being enough.
 *
 * Pagination is opt-in and there is no default limit, which is deliberate. Discover loads
 * the whole catalogue and filters, searches and sorts it in the browser, so a default
 * limit would quietly reduce the search box to the first page and report no error.
 * Server-side paging there means moving search and filtering to the server first.
 */
function page(items, { total = null, limit = null, offset = 0 } = {}) {
    const list = Array.isArray(items) ? items : [];

    return {
        items: list,
        // Without a limit the caller asked for everything, so the count is the length:
        // no second round trip for a number already in hand.
        total: total ?? list.length,
        limit: limit ?? null,
        offset,
    };
}

/**
 * ?limit= and ?offset=, validated like any other input. An absent limit means everything,
 * which is what keeps each endpoint behaving as it did before the envelope.
 */
const paginationQuery = z.looseObject({
    limit: z.coerce
        .number({ error: "limit must be a number." })
        .int("limit must be a whole number.")
        .min(1, "limit must be at least 1.")
        .max(100, "limit cannot be more than 100.")
        .optional(),
    offset: z.coerce
        .number({ error: "offset must be a number." })
        .int("offset must be a whole number.")
        .min(0, "offset cannot be negative.")
        .optional(),
});

/** What a controller passes down to a repository. `limit: null` means no paging. */
function pagination(req) {
    const { limit = null, offset = 0 } = req.validatedQuery ?? {};

    return { limit: limit ?? null, offset: limit == null ? 0 : offset };
}

module.exports = { page, paginationQuery, pagination };
