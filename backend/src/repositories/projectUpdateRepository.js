const pool = require("../config/db");

// Posts a creator writes for the backers of one project. Read publicly on the project
// page, written only by the project's creator (see projectService.createProjectUpdate).
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

// Newest first — the project page lists them in reverse chronological order.
// The author name is joined in so the UI does not need a second request; author_id is
// ON DELETE SET NULL, so it can legitimately come back null.
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
