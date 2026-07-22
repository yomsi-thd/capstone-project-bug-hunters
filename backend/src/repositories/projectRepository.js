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
            status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
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
            project.status
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

// Get project by ID
async function findById(id) {
    const result = await pool.query(
        "SELECT * FROM projects WHERE id = $1",
        [id]
    );

    return result.rows[0];
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
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$6
        RETURNING *
        `,
        [
            project.title,
            project.description,
            project.category,
            project.goal_amount,
            project.image_url,
            id
        ]
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

module.exports = {
    createProject,
    findAll,
    findById,
    updateProject,
    deleteProject
};