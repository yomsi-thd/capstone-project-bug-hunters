const pool = require("../config/db");

async function createUser(fullName, email, password) {
    const result = await pool.query(
        `INSERT INTO users (full_name, email, password)
         VALUES ($1, $2, $3)
         RETURNING id, full_name, email, is_active`,
        [fullName, email, password]
    );

    return result.rows[0];
}

async function findById(id) {
    const result = await pool.query(
        `SELECT id, full_name, email, is_active, created_at
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
         RETURNING id, full_name, email, is_active`,
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

// adminService.getAllUsers() calls this function, but it did not exist before
// -> GET /api/admin/users returned "userRepository.findAllUsers is not a function".
// Returns a roles array because the users table no longer has a role column.
async function findAllUsers() {
    const result = await pool.query(
        `
        SELECT u.id,
               u.full_name,
               u.email,
               u.is_active,
               u.created_at,
               COALESCE(
                   ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
                   '{}'
               ) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        GROUP BY u.id
        ORDER BY u.id
        `
    );

    return result.rows;
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

async function assignRole(userId, roleName, client = pool) {
    const result = await client.query(
        `
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id
        FROM roles
        WHERE name = $2
        ON CONFLICT (user_id, role_id) DO NOTHING
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

async function updateStatus(userId, isActive) {
    const result = await pool.query(
        `
        UPDATE users
        SET is_active = $1
        WHERE id = $2
        RETURNING id, full_name, email, is_active
        `,
        [isActive, userId]
    );

    return result.rows[0];
}

module.exports = {
    createUser,
    findById,
    findByEmail,
    updateProfile,
    updatePassword,
    deleteUser,
    findAllUsers,
    getUserRoles,
    assignRole,
    removeRole,
    updateStatus
};