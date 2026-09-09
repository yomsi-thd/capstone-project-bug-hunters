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
        `SELECT id, full_name, email, title, is_active, created_at
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

// `title` is the academic affiliation shown under a creator's name on the project page,
// e.g. "Lead Researcher, RMIT Robotics Lab". Optional; pass null to clear it.
async function updateProfile(id, fullName, email, title) {
    const result = await pool.query(
        `UPDATE users
         SET full_name = $1,
             email = $2,
             title = $3
         WHERE id = $4
         RETURNING id, full_name, email, title, is_active`,
        [fullName, email, title ?? null, id]
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

// Returns a roles array, since `users` has no role column.
// Which of these accounts hold ADMIN. Used to refuse a grant before any of it lands, an
// admin owning nothing. Checking it here rather than only in the screen is the difference
// between a rule and a suggestion.
// Which of these ids name a real account. The bulk grant uses it to tell "no wallet yet",
// which is fine and makes one, apart from "this id names nobody", which is a 404.
async function findExistingIdsAmong(userIds, client = pool) {
    const result = await client.query("SELECT id FROM users WHERE id = ANY($1)", [userIds]);

    return result.rows.map((row) => row.id);
}

async function findAdminIdsAmong(userIds, client = pool) {
    const result = await client.query(
        `SELECT DISTINCT u.id
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
         WHERE u.id = ANY($1) AND r.name = 'ADMIN'`,
        [userIds]
    );

    return result.rows.map((row) => row.id);
}

async function findAllUsers({ limit = null, offset = 0 } = {}) {
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
               ) AS roles,
               -- The admin issues Class Coins from this same table, so the balance has
               -- to be on the row. A LEFT JOIN, because some accounts have no wallet and
               -- an inner join would drop them off the admin's screen with no error.
               -- NULL here means no wallet, which is a different fact from a balance
               -- of 0.
               cc.balance::int AS balance
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN classcoins cc ON cc.user_id = u.id
        GROUP BY u.id, cc.balance
        ORDER BY u.id
        ${limit == null ? "" : "LIMIT $1 OFFSET $2"}
        `,
        limit == null ? [] : [limit, offset]
    );

    return result.rows;
}

async function countAllUsers() {
    const result = await pool.query(`SELECT COUNT(*)::int AS total FROM users`);

    return result.rows[0].total;
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

// Replaces a user's whole role set in one shot. Pass the transaction client so the DELETE
// and the INSERT cannot half-apply and leave the account with no roles at all.
async function setUserRoles(userId, roleNames, client = pool) {

    await client.query(
        `DELETE FROM user_roles WHERE user_id = $1`,
        [userId]
    );

    if (roleNames.length === 0) {
        return [];
    }

    const result = await client.query(
        `
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id
        FROM roles
        WHERE name = ANY($2::text[])
        ON CONFLICT (user_id, role_id) DO NOTHING
        RETURNING role_id;
        `,
        [userId, roleNames]
    );

    return result.rows;
}

// The role vocabulary lives in the roles table, so validate against that rather than
// hardcoding the three names in the service.
async function findAllRoleNames() {
    const result = await pool.query(
        `SELECT name FROM roles ORDER BY id;`
    );

    return result.rows.map(row => row.name);
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
    findAdminIdsAmong,
    findExistingIdsAmong,
    findById,
    findByEmail,
    updateProfile,
    updatePassword,
    deleteUser,
    findAllUsers,
    countAllUsers,
    getUserRoles,
    assignRole,
    setUserRoles,
    findAllRoleNames,
    removeRole,
    updateStatus
};