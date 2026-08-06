const pool = require("../config/db");

async function create(userId) {
    const result = await pool.query(
        `
        INSERT INTO creator_requests (user_id, role)
        VALUES ($1, 'CREATOR')
        RETURNING *;
        `,
        [userId]
    );

    return result.rows[0];
}

async function findById(id) {
    const result = await pool.query(
        `
        SELECT *
        FROM creator_requests
        WHERE id = $1;
        `,
        [id]
    );

    return result.rows[0];
}

async function findByUserId(userId) {
    const result = await pool.query(
        `
        SELECT *
        FROM creator_requests
        WHERE user_id = $1;
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
        FROM creator_requests cr
        JOIN users u
            ON cr.user_id = u.id
        WHERE cr.status = 'PENDING'
        ORDER BY cr.created_at ASC;
        `
    );

    return result.rows;
}

async function approve(id, adminId, client = pool) {

    const result = await client.query(
        `
        UPDATE creator_requests
        SET
            status = 'APPROVED',
            reviewed_by = $1,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
        `,
        [adminId, id]
    );

    return result.rows[0];
}

async function reject(id, adminId, client = pool) {
    const result = await client.query(
        `
        UPDATE creator_requests
        SET
            status = 'REJECTED',
            reviewed_by = $1,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
        `,
        [adminId, id]
    );

    return result.rows[0];
}

module.exports = {
    create,
    findById,
    findByUserId,
    findAllPending,
    approve,
    reject
};