const pool = require("../config/db");

// Create ClassCoin account
async function createClassCoin(userId) {
    const result = await pool.query(
        `
        INSERT INTO classcoins (user_id)
        VALUES ($1)
        RETURNING *;
        `,
        [userId]
    );

    return result.rows[0];
}

// Get Balance
async function getBalance(userId) {
    const result = await pool.query(
        `
        SELECT *
        FROM classcoins
        WHERE user_id = $1;
        `,
        [userId]
    );

    return result.rows[0];
}

// Update balance.
// `client = pool` so classCoinService can still call these outside a transaction —
// without the default, POST /classcoins/add and /deduct threw
// "Cannot read properties of undefined (reading 'query')".
// The `AND balance >= $1` guard is what makes the invest flow race-safe: the check
// and the write are one statement, so two concurrent requests cannot both pass it.
async function deductBalance(userId, amount, client = pool) {
    const result = await client.query(
        `
        UPDATE classcoins
        SET
            balance = balance - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
          AND balance >= $1
        RETURNING *;
        `,
        [amount, userId]
    );

    return result.rows[0];
}

async function addBalance(userId, amount, client = pool) {
    const result = await client.query(
        `
        UPDATE classcoins
        SET
            balance = balance + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        RETURNING *;
        `,
        [amount, userId]
    );

    return result.rows[0];
}

// Create transaction
async function createTransaction(transaction, client = pool) {
    const result = await client.query(
        `
        INSERT INTO classcoin_transactions
        (
            classcoin_id,
            project_id,
            type,
            amount,
            description,
            tier_id
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *;
        `,
        [
            transaction.classcoin_id,
            transaction.project_id,
            transaction.type,
            transaction.amount,
            transaction.description,
            // The support level the backer picked, stored at investment time rather
            // than derived later from the amount: min_amount is editable, so buckets
            // worked out afterwards would silently rewrite what somebody signalled.
            // NULL is the normal case — choosing a level is optional.
            transaction.tier_id ?? null
        ]
    );

    return result.rows[0];
}

// Get transactions
async function getTransactions(classcoinId) {
    const result = await pool.query(
        `
        SELECT *
        FROM classcoin_transactions
        WHERE classcoin_id = $1
        ORDER BY created_at DESC;
        `,
        [classcoinId]
    );

    return result.rows;
}

// Everything this user has invested, GROUPED BY PROJECT and joined to the project row.
//
// Two problems in one query. My Investments used to read the raw transaction list and
// then call GET /projects/:id once per row (an N+1), and it listed one card per
// TRANSACTION — so backing the same project three times produced three identical-looking
// cards. One row per project, with the total and the number of times, is what the page
// actually wants to show.
//
// The JOIN drops transactions whose project was permanently deleted (project_id is
// ON DELETE SET NULL), which matches what the page did with them before: skip.
// Archived projects are kept on purpose — a backer's spend history must survive a
// project being hidden — and archived_at rides along so the card can badge it.
async function getInvestmentsByUser(userId) {
    const result = await pool.query(
        `
        SELECT p.id             AS project_id,
               p.title,
               p.description,
               p.category,
               p.image_url,
               p.current_amount,
               p.goal_amount,
               p.status,
               p.archived_at,
               SUM(ct.amount)::int AS invested_amount,
               COUNT(*)::int       AS investment_count,
               MIN(ct.created_at)  AS first_invested_at,
               MAX(ct.created_at)  AS last_invested_at,
               -- One card covers several investments, so it shows ONE support level:
               -- the highest this backer ever chose for this project. Same rule as
               -- projectRepository.findBackersByCreatorId, so the two never disagree.
               MAX(t.min_amount)::int                                       AS top_tier_min,
               (ARRAY_AGG(t.name ORDER BY t.min_amount DESC NULLS LAST))[1] AS top_tier_name
        FROM classcoin_transactions ct
        JOIN classcoins c ON c.id = ct.classcoin_id
        JOIN projects   p ON p.id = ct.project_id
        -- LEFT, never a plain JOIN. tier_id is NULL for every transaction made before
        -- support levels existed and for every "just support" choice; an inner join
        -- would empty this page for almost everybody.
        LEFT JOIN project_tiers t ON t.id = ct.tier_id
        WHERE c.user_id = $1
          AND ct.type = 'INVEST'
        GROUP BY p.id
        ORDER BY MAX(ct.created_at) DESC;
        `,
        [userId]
    );

    return result.rows;
}

module.exports = {
    createClassCoin,
    getBalance,
    deductBalance,
    addBalance,
    createTransaction,
    getTransactions,
    getInvestmentsByUser
};