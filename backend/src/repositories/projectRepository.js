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
            team_members
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
            JSON.stringify(project.team_members)
        ]
    );

    return result.rows[0];
}

// Get all projects
async function findAll() {
    const result = await pool.query(
        "SELECT * FROM projects ORDER BY created_at DESC"
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

// Get project by ID
async function findById(id, client = pool) {
    const result = await client.query(
        "SELECT * FROM projects WHERE id = $1",
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
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$7
        RETURNING *
        `,
        [
            project.title,
            project.description,
            project.category,
            project.goal_amount,
            project.image_url,
            project.team_members,
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

async function increaseCurrentAmount(projectId, amount) {
    const result = await pool.query(
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
    increaseCurrentAmount
};