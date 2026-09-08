const pool = require("../config/db");

async function create(userId, note) {
    const result = await pool.query(
        `
        INSERT INTO coin_requests (user_id, note)
        VALUES ($1, $2)
        RETURNING *;
        `,
        [userId, note]
    );

    return result.rows[0];
}

async function findById(id) {
    const result = await pool.query(
        `
        SELECT *
        FROM coin_requests
        WHERE id = $1;
        `,
        [id]
    );

    return result.rows[0];
}

// For GET /classcoins/requests/me. Only the waiting one: a request that already has a
// verdict says nothing about whether this person can ask today.
async function findPendingByUserId(userId) {
    const result = await pool.query(
        `
        SELECT *
        FROM coin_requests
        WHERE user_id = $1
          AND status = 'PENDING';
        `,
        [userId]
    );

    return result.rows[0];
}

async function findAllPending() {
    const result = await pool.query(
        `
        SELECT
            cr.*,
            u.full_name,
            u.email
        FROM coin_requests cr
        JOIN users u
            ON cr.user_id = u.id
        WHERE cr.status = 'PENDING'
        ORDER BY cr.created_at ASC;
        `
    );

    return result.rows;
}

// ⚠️ `AND status = 'PENDING'` lives in the UPDATE itself, not in a check above it. Two
// admins both read PENDING, so every check-before-write passes for both; only this
// statement decides. 0 rows means the other one got there first.
async function approve(id, adminId, amount, client = pool) {
    const result = await client.query(
        `
        UPDATE coin_requests
        SET
            status = 'APPROVED',
            amount_granted = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $3
          AND status = 'PENDING'
        RETURNING *;
        `,
        [amount, adminId, id]
    );

    return result.rows[0];
}

async function reject(id, adminId, client = pool) {
    const result = await client.query(
        `
        UPDATE coin_requests
        SET
            status = 'REJECTED',
            reviewed_by = $1,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND status = 'PENDING'
        RETURNING *;
        `,
        [adminId, id]
    );

    return result.rows[0];
}

module.exports = {
    create,
    findById,
    findPendingByUserId,
    findAllPending,
    approve,
    reject
};
