const pool = require("../config/db");

// Create Project
async function createProject(project) {
    const result = await pool.query(
        `
        INSERT INTO projects
        (
            creator_id,
            title,
            description,
            category,
            goal_amount,
            current_amount,
            image_url,
            status,
            team_members,
            start_date,
            end_date,
            challenge,
            solution,
            funding_usage,
            gallery,
            solution_bullets
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING *
        `,
        [
            project.creator_id,
            project.title,
            project.description,
            project.category,
            project.goal_amount,
            project.current_amount,
            project.image_url,
            project.status,
            JSON.stringify(project.team_members),
            project.start_date,
            project.end_date,
            project.challenge,
            project.solution,
            project.funding_usage,
            JSON.stringify(project.gallery ?? []),
            JSON.stringify(project.solution_bullets ?? [])
        ]
    );

    return result.rows[0];
}

// Get all projects.
// ADMIN-ONLY (adminController.getAllProjects) — it returns every status AND the
// creator's email, so do not reuse it for a public route.
// The join replaces the "Creator #14" placeholder in AdminDashboard / AdminApprovals.
async function findAll() {
    const result = await pool.query(
        `
        SELECT p.*,
               u.full_name AS creator_name,
               u.email     AS creator_email
        FROM projects p
        LEFT JOIN users u ON u.id = p.creator_id
        ORDER BY p.created_at DESC
        `
    );

    return result.rows;
}

async function findAllApprovedProjects() {
    const result = await pool.query(
        `
        SELECT *
        FROM projects
        WHERE status = 'APPROVED'
        ORDER BY created_at DESC;
        `
    );

    return result.rows;
}

// Get project by ID.
// Serves the PUBLIC route GET /projects/:id, so it joins the creator's NAME only —
// never the email, which would then be readable by anyone.
// backers_count is DISTINCT wallets, not rows: investing three times still counts
// as one backer.
async function findById(id, client = pool) {
    const result = await client.query(
        `
        SELECT p.*,
               u.full_name AS creator_name,
               u.title     AS creator_title,
               (
                   SELECT COUNT(DISTINCT ct.classcoin_id)::int
                   FROM classcoin_transactions ct
                   WHERE ct.project_id = p.id
                     AND ct.type = 'INVEST'
               ) AS backers_count,
               (
                   SELECT COUNT(*)::int
                   FROM comments c
                   WHERE c.project_id = p.id
               ) AS comments_count
        FROM projects p
        LEFT JOIN users u ON u.id = p.creator_id
        WHERE p.id = $1
        `,
        [id]
    );

    return result.rows[0];
}

//Find all projects by User ID
async function findByCreatorId(userId) {

    const result = await pool.query(
        `
        SELECT *
        FROM projects
        WHERE creator_id = $1
        ORDER BY created_at DESC
        `,
        [userId]
    );

    return result.rows;
}

// Update project
async function updateProject(id, project) {
    const result = await pool.query(
        `
        UPDATE projects
        SET
            title=$1,
            description=$2,
            category=$3,
            goal_amount=$4,
            image_url=$5,
            team_members=$6,
            challenge=$7,
            solution=$8,
            funding_usage=$9,
            gallery=$10,
            solution_bullets=$11,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$12
        RETURNING *
        `,
        [
            project.title,
            project.description,
            project.category,
            project.goal_amount,
            project.image_url,
            // MUST be stringified, exactly like createProject does. team_members is a
            // jsonb column; handing node-postgres a raw JS array makes it send a Postgres
            // array literal ({...}) and every save failed with
            // "invalid input syntax for type json" — so PUT /projects/:id never worked.
            JSON.stringify(project.team_members ?? []),
            project.challenge,
            project.solution,
            project.funding_usage,
            JSON.stringify(project.gallery ?? []),
            JSON.stringify(project.solution_bullets ?? []),
            id
        ]
    );

    return result.rows[0];
}

async function approveProject(id) {

    const result = await pool.query(
        `
        UPDATE projects
        SET status = 'APPROVED'
        WHERE id = $1
        RETURNING *;
        `,
        [id]
    );

    return result.rows[0];
}

// The "RMIT Endorsed" badge on the project page. Admin-only — it is a university
// endorsement, so a creator must not be able to award it to themselves.
async function setEndorsed(id, endorsed) {

    const result = await pool.query(
        `
        UPDATE projects
        SET endorsed = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
        `,
        [endorsed, id]
    );

    return result.rows[0];
}

async function rejectProject(id) {

    const result = await pool.query(
        `
        UPDATE projects
        SET status = 'REJECTED'
        WHERE id = $1
        RETURNING *;
        `,
        [id]
    );

    return result.rows[0];
}

// Delete project
async function deleteProject(id) {
    await pool.query(
        "DELETE FROM projects WHERE id=$1",
        [id]
    );
}

// `client` is REQUIRED to be the caller's transaction client during an investment.
// Without the parameter this ran on its own pool connection, so a later ROLLBACK in
// investProject left the project funded with coins that were never deducted.
async function increaseCurrentAmount(projectId, amount, client = pool) {
    const result = await client.query(
        `
        UPDATE projects
        SET
            current_amount = current_amount + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
        `,
        [amount, projectId]
    );

    return result.rows[0];
}

module.exports = {
    createProject,
    findAll,
    findAllApprovedProjects,
    findById,
    findByCreatorId,
    updateProject,
    deleteProject,
    approveProject,
    rejectProject,
    setEndorsed,
    increaseCurrentAmount
};