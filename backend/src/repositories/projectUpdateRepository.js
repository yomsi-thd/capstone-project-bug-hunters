const pool = require("../config/db");

// Posts a creator writes for the backers of one project. Publicly readable on the project
// page, and written only by the project's creator.
async function create(update, client = pool) {
    const result = await client.query(
        `
        INSERT INTO project_updates
        (
            project_id,
            author_id,
            title,
            body
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *;
        `,
        [
            update.project_id,
            update.author_id,
            update.title,
            update.body
        ]
    );

    return result.rows[0];
}

// Newest first, which is how the project page lists them. The author name is joined in so
// the UI needs no second request; author_id is ON DELETE SET NULL, so it can come back
// null.
async function findByProjectId(projectId) {
    const result = await pool.query(
        `
        SELECT pu.*,
               u.full_name AS author_name
        FROM project_updates pu
        LEFT JOIN users u ON u.id = pu.author_id
        WHERE pu.project_id = $1
        ORDER BY pu.created_at DESC;
        `,
        [projectId]
    );

    return result.rows;
}

async function findById(id) {
    const result = await pool.query(
        `SELECT * FROM project_updates WHERE id = $1;`,
        [id]
    );

    return result.rows[0];
}

async function remove(id) {
    const result = await pool.query(
        `DELETE FROM project_updates WHERE id = $1 RETURNING *;`,
        [id]
    );

    return result.rows[0];
}

module.exports = {
    create,
    findByProjectId,
    findById,
    remove
};
