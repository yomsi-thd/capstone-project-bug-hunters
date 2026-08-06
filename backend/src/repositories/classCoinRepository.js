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
            description
        )
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *;
        `,
        [
            transaction.classcoin_id,
            transaction.project_id,
            transaction.type,
            transaction.amount,
            transaction.description
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

module.exports = {
    createClassCoin,
    getBalance,
    deductBalance,
    addBalance,
    createTransaction,
    getTransactions
};