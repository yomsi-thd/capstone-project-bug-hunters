const pool = require("../config/db");

// Creates a wallet. It takes a `client` so a grant can create a missing one inside its
// own transaction: some accounts predate automatic wallet creation and have no row.
async function createClassCoin(userId, client = pool) {
    const result = await client.query(
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

// Updates a balance. `client = pool` so these can still be called outside a transaction.
//
// The `AND balance >= $1` guard is what makes the invest flow race-safe: the check and
// the write are one statement, so two concurrent requests cannot both pass it.
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
            tier_id,
            granted_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *;
        `,
        [
            transaction.classcoin_id,
            transaction.project_id,
            transaction.type,
            transaction.amount,
            transaction.description,
            // The level the backer picked, stored at investment time rather than worked
            // out later from the amount: min_amount is editable, so buckets derived
            // afterwards would rewrite what somebody signalled. NULL is the normal case,
            // since choosing a level is optional.
            transaction.tier_id ?? null,
            // Who issued this, when it was a grant. NULL for an investment, and NULL for
            // the automatic grant at registration, where the system is the grantor and no
            // admin should be credited with it.
            transaction.granted_by ?? null
        ]
    );

    return result.rows[0];
}

// The wallets for a batch of accounts, in one round trip.
//
// It returns fewer rows than ids when somebody has no wallet, and the service treats that
// as "one of these accounts does not exist" rather than granting to the rest: a partial
// grant is the outcome the bulk route exists to make impossible.
async function findWalletsByUserIds(userIds, client = pool) {
    const result = await client.query(
        "SELECT id, user_id FROM classcoins WHERE user_id = ANY($1)",
        [userIds]
    );

    return result.rows;
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

// Everything this user has invested, grouped by project and joined to the project row.
//
// One row per project with the total is what My Investments actually shows. Reading the
// raw transaction list instead would need a project lookup per row and would render
// repeat investments as near-identical duplicate cards.
//
// The join drops transactions whose project was permanently deleted, since project_id is
// ON DELETE SET NULL, which is what the page wants. Archived projects are kept, because a
// backer's spend history must survive a project being hidden, and archived_at rides along
// so the card can badge it.
async function getInvestmentsByUser(userId) {
    const result = await pool.query(
        `
        SELECT p.id             AS project_id,
               p.title,
               p.description,
               p.category,
               p.image_url,
               p.current_amount,
               p.status,
               p.archived_at,
               -- The GROUP BY earns its place: one row per project is the shape the page
               -- renders a card from. There is at most one contribution per project per
               -- person, so there is no count or first-investment date to carry.
               SUM(ct.amount)::int AS invested_amount,
               MAX(ct.created_at)  AS last_invested_at,
               -- One card shows one support level: the highest this backer chose for
               -- this project. The same rule as findBackersByCreatorId, so the two never
               -- disagree.
               MAX(t.min_amount)::int                                       AS top_tier_min,
               (ARRAY_AGG(t.name ORDER BY t.min_amount DESC NULLS LAST))[1] AS top_tier_name
        FROM classcoin_transactions ct
        JOIN classcoins c ON c.id = ct.classcoin_id
        JOIN projects   p ON p.id = ct.project_id
        -- LEFT rather than a plain join. tier_id is NULL for every "just support"
        -- choice, and an inner join would empty this page for almost everybody.
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

// Has this person already backed this project? One row is all the caller needs, since
// the answer only decides whether to refuse.
//
// `client` matters here more than anywhere else in this file. investmentService calls it
// inside the transaction, and forgetting to pass the client would take a separate
// connection and read state the transaction is about to change.
async function findContribution(userId, projectId, client = pool) {
    const result = await client.query(
        `
        SELECT ct.id, ct.amount
        FROM classcoin_transactions ct
        JOIN classcoins c ON c.id = ct.classcoin_id
        WHERE c.user_id = $1
          AND ct.project_id = $2
          AND ct.type = 'INVEST'
        LIMIT 1
        `,
        [userId, projectId]
    );

    return result.rows[0];
}

module.exports = {
    createClassCoin,
    getBalance,
    deductBalance,
    addBalance,
    createTransaction,
    getTransactions,
    findContribution,
    findWalletsByUserIds,
    getInvestmentsByUser
};