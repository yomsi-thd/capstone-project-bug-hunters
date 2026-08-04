const pool = require("../config/db");

async function createUser(fullName, email, password) {
    const result = await pool.query(
        `INSERT INTO users (full_name, email, password)
         VALUES ($1, $2, $3)
         RETURNING id, full_name, email, role`,
        [fullName, email, password]
    );

    return result.rows[0];
}

async function findById(id) {
    const result = await pool.query(
        `SELECT id, full_name, email, role, created_at
         FROM users
         WHERE id = $1`,
        [id]
    );

    return result.rows[0];
}

async function findByEmail(email) {
    const result = await pool.query(
        `SELECT * FROM users
         WHERE email = $1`,
        [email]
    );

    return result.rows[0];
}

async function updateProfile(id, fullName, email) {
    const result = await pool.query(
        `UPDATE users
         SET full_name = $1,
             email = $2
         WHERE id = $3
         RETURNING id, full_name, email, role`,
        [fullName, email, id]
    );

    return result.rows[0];
}

async function updatePassword(id, password) {
    await pool.query(
        `UPDATE users
         SET password = $1
         WHERE id = $2`,
        [password, id]
    );
}

async function deleteUser(id) {
    const result = await pool.query(
        `DELETE FROM users
         WHERE id = $1
         RETURNING id, full_name, email`,
        [id]
    );

    return result.rows[0];
}

async function getUserRoles(userId) {
    const result = await pool.query(
        `
        SELECT r.name
        FROM user_roles ur
        JOIN roles r
            ON ur.role_id = r.id
        WHERE ur.user_id = $1;
        `,
        [userId]
    );

    return result.rows.map(role => role.name);
}

async function assignRole(userId, roleName) {
    const result = await pool.query(
        `
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id
        FROM roles
        WHERE name = $2
        ON CONFLICT DO NOTHING
        RETURNING *;
        `,
        [userId, roleName]
    );

    return result.rows[0];
}

async function removeRole(userId, roleName) {
    await pool.query(
        `
        DELETE FROM user_roles
        WHERE user_id = $1
        AND role_id = (
            SELECT id
            FROM roles
            WHERE name = $2
        );
        `,
        [userId, roleName]
    );
}

module.exports = {
    createUser,
    findById,
    findByEmail,
    updateProfile,
    updatePassword,
    deleteUser,
    getUserRoles,
    assignRole,
    removeRole
};