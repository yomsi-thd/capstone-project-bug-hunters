const pool = require("../config/db");

// Threaded one level deep: a comment has parent_id NULL and a reply points at one. The UI
// never nests further, so the service flattens a reply-to-a-reply onto the same parent
// rather than rejecting it.
async function create(comment, client = pool) {
    const result = await client.query(
        `
        INSERT INTO comments (project_id, user_id, parent_id, body)
        VALUES ($1,$2,$3,$4)
        RETURNING *;
        `,
        [
            comment.project_id,
            comment.user_id,
            comment.parent_id ?? null,
            comment.body
        ]
    );

    return result.rows[0];
}

/**
 * Every comment on a project, flat and oldest first so the service can thread them.
 *
 * `role` is the badge shown next to the name, derived here rather than stored: CREATOR
 * when the author owns this project, BACKER when they invested in it, otherwise null.
 * That is what the badge means to a reader, where echoing the author's account roles
 * would badge nearly everyone BACKER.
 */
async function findByProjectId(projectId) {
    const result = await pool.query(
        `
        SELECT c.*,
               u.full_name AS author_name,
               CASE
                   WHEN u.id IS NULL THEN NULL
                   WHEN u.id = p.creator_id THEN 'CREATOR'
                   WHEN EXISTS (
                       SELECT 1
                       FROM classcoin_transactions ct
                       JOIN classcoins cc ON cc.id = ct.classcoin_id
                       WHERE cc.user_id = u.id
                         AND ct.project_id = p.id
                         AND ct.type = 'INVEST'
                   ) THEN 'BACKER'
                   ELSE NULL
               END AS author_role
        FROM comments c
        JOIN projects p ON p.id = c.project_id
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.project_id = $1
        ORDER BY c.created_at ASC;
        `,
        [projectId]
    );

    return result.rows;
}

async function findById(id) {
    const result = await pool.query(
        `SELECT * FROM comments WHERE id = $1;`,
        [id]
    );

    return result.rows[0];
}

async function remove(id) {
    const result = await pool.query(
        `DELETE FROM comments WHERE id = $1 RETURNING *;`,
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
