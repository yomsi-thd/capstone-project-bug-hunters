const pool = require("../config/db");

/**
 * Support levels — `project_tiers` in the database, "Support Levels" on screen.
 *
 * A level is a MINIMUM contribution plus a list of lines saying what choosing it
 * signals. Nobody is owed anything: the creator writes the levels, the backer picks
 * one at investment time, and `classcoin_transactions.tier_id` records the choice.
 *
 * ⚠️ Every function takes `client = pool`. This has bitten the repo twice already —
 * classCoinRepository once made `client` mandatory (so /classcoins/add and /deduct
 * threw) and increaseCurrentAmount once ignored the client it was handed (so a
 * ROLLBACK could not undo the funding bump). Both shapes are wrong; this is the
 * shape that works inside and outside a transaction.
 */

// Every level of one project, cheapest first.
//
// `backers_count` is the number that makes support levels worth having: it answers
// "which level attracts the most people". COUNT(DISTINCT classcoin_id), not COUNT(*),
// so investing three times at one level is still one person — the same rule the
// project's own backers_count already follows.
async function findByProjectId(projectId, { activeOnly = true } = {}, client = pool) {
    const result = await client.query(
        `
        SELECT pt.id,
               pt.project_id,
               pt.name,
               pt.min_amount,
               pt.bullets,
               pt.is_active,
               pt.created_at,
               (
                   SELECT COUNT(DISTINCT ct.classcoin_id)::int
                   FROM classcoin_transactions ct
                   WHERE ct.tier_id = pt.id
                     AND ct.type = 'INVEST'
               ) AS backers_count
        FROM project_tiers pt
        WHERE pt.project_id = $1
          AND ($2::boolean IS FALSE OR pt.is_active)
        ORDER BY pt.min_amount ASC, pt.id ASC;
        `,
        [projectId, activeOnly]
    );

    return result.rows;
}

// One level, scoped to the project it must belong to. The project id is not
// decoration: the invest flow gets `tierId` straight from the request body, so this
// is what stops a backer attaching another project's level to their investment.
async function findForProject(tierId, projectId, client = pool) {
    const result = await client.query(
        `
        SELECT *
        FROM project_tiers
        WHERE id = $1
          AND project_id = $2;
        `,
        [tierId, projectId]
    );

    return result.rows[0];
}

async function countActiveByProjectId(projectId, client = pool) {
    const result = await client.query(
        `
        SELECT COUNT(*)::int AS count
        FROM project_tiers
        WHERE project_id = $1
          AND is_active;
        `,
        [projectId]
    );

    return result.rows[0].count;
}

// "Another level already starts at this amount." Only ACTIVE levels count — a hidden
// one keeps its amount, and blocking a new level because a hidden one shares the price
// would make hiding a level a permanent reservation of that number.
// `excludeTierId` is the level being edited, which must not collide with itself.
async function existsWithMinAmount(projectId, minAmount, excludeTierId = null, client = pool) {
    const result = await client.query(
        `
        SELECT 1
        FROM project_tiers
        WHERE project_id = $1
          AND min_amount = $2
          AND is_active
          AND ($3::int IS NULL OR id <> $3)
        LIMIT 1;
        `,
        [projectId, minAmount, excludeTierId]
    );

    return result.rowCount > 0;
}

// Has anybody actually chosen this level? Decides delete vs hide.
async function hasTransactions(tierId, client = pool) {
    const result = await client.query(
        `
        SELECT 1
        FROM classcoin_transactions
        WHERE tier_id = $1
        LIMIT 1;
        `,
        [tierId]
    );

    return result.rowCount > 0;
}

async function create(tier, client = pool) {
    const result = await client.query(
        `
        INSERT INTO project_tiers
        (
            project_id,
            name,
            min_amount,
            bullets
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *;
        `,
        [
            tier.project_id,
            tier.name,
            tier.min_amount,
            // jsonb, so it has to be stringified. Handing node-postgres a raw JS array
            // makes it send a Postgres array literal ({...}) and the insert fails with
            // "invalid input syntax for type json" — the bug that once broke every
            // PUT /projects/:id because team_members was passed unstringified.
            JSON.stringify(tier.bullets ?? [])
        ]
    );

    return result.rows[0];
}

// Editing min_amount deliberately does NOT touch history: an investment already
// carries its tier_id, so raising the bar on a level never rewrites what somebody
// signalled last week.
async function update(tierId, tier, client = pool) {
    const result = await client.query(
        `
        UPDATE project_tiers
        SET name       = $1,
            min_amount = $2,
            bullets    = $3
        WHERE id = $4
        RETURNING *;
        `,
        [
            tier.name,
            tier.min_amount,
            JSON.stringify(tier.bullets ?? []),
            tierId
        ]
    );

    return result.rows[0];
}

// Hide rather than destroy — what "delete" becomes once somebody has chosen the level.
async function deactivate(tierId, client = pool) {
    const result = await client.query(
        `
        UPDATE project_tiers
        SET is_active = FALSE
        WHERE id = $1
        RETURNING *;
        `,
        [tierId]
    );

    return result.rows[0];
}

// Only ever called for a level with no transactions (see projectService.deleteTier).
async function remove(tierId, client = pool) {
    const result = await client.query(
        `DELETE FROM project_tiers WHERE id = $1 RETURNING *;`,
        [tierId]
    );

    return result.rows[0];
}

module.exports = {
    findByProjectId,
    findForProject,
    countActiveByProjectId,
    existsWithMinAmount,
    hasTransactions,
    create,
    update,
    deactivate,
    remove
};
