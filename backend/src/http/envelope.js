const { z } = require("zod");

/**
 * The shape every list endpoint answers with:
 *
 *     { "items": [...], "total": 3, "limit": null, "offset": 0 }
 *
 * `items` rather than `data`, and that is worth writing down so nobody flips it back and
 * forth. Stripe and JSON:API both use `data`, but with axios that reads
 * `response.data.data`, which is genuinely hard to follow. YouTube's Data API uses
 * `items` and it is the clearer of the two here.
 *
 * The envelope is for a UNIFORM CONTRACT, not for pagination. Its value is that the day
 * any of these eleven endpoints does need paging, adding it is no longer a breaking
 * change — and neither is adding a `nextCursor` if offsets ever stop being enough.
 *
 * ⚠️ PAGINATION IS OPT-IN AND THERE IS NO DEFAULT LIMIT. This looks like an oversight
 * and is the opposite. Discover deliberately loads the WHOLE catalogue and filters,
 * searches and sorts it client-side — "a query reaches every project" is written into
 * the product notes. A default limit of 20 would quietly reduce the search box to the
 * first twenty projects and report no error at all. If server-side paging is ever wanted
 * there, search and filtering have to move to the server first, and that is a product
 * change with its own spec.
 */
function page(items, { total = null, limit = null, offset = 0 } = {}) {
    const list = Array.isArray(items) ? items : [];

    return {
        items: list,
        // Without a limit the caller asked for everything, so the count IS the length —
        // no second COUNT(*) round trip for a number already in hand.
        total: total ?? list.length,
        limit: limit ?? null,
        offset,
    };
}

/**
 * `?limit=&offset=`, validated like any other input.
 *
 * Absent limit means "everything", which is what keeps every endpoint's behaviour
 * exactly as it was before the envelope landed.
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
