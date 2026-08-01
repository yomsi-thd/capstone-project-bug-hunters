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

// Find by user id
async function findByUserId(userId) {
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

// Update balance
async function updateBalance(id, balance) {
    const result = await pool.query(
        `
        UPDATE classcoins
        SET
            balance = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
        `,
        [balance, id]
    );

    return result.rows[0];
}

// Create transaction
async function createTransaction(transaction) {
    const result = await pool.query(
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
    findByUserId,
    updateBalance,
    createTransaction,
    getTransactions
};