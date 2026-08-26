/**
 * Test data, built the way the app itself builds it wherever that is possible.
 *
 * Accounts are inserted with direct SQL — `POST /auth/register` can only ever produce
 * a BACKER, and most of what these tests check is what happens to a CREATOR or an
 * ADMIN. But the TOKEN always comes from `POST /auth/login`, so every request in the
 * suite carries a token the real sign-in path produced rather than one the test forged.
 * A forged token would keep passing on the day login starts putting something different
 * in it.
 */

const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../src/app");
const pool = require("../../src/config/db");

const PASSWORD = "Test1234";

// bcrypt is deliberately slow. One hash for the whole suite, computed once.
let passwordHash = null;

async function hashOnce() {
    if (!passwordHash) passwordHash = await bcrypt.hash(PASSWORD, 10);
    return passwordHash;
}

let counter = 0;

/** Unique per call, so tests never collide on the UNIQUE email index. */
function uniqueEmail(label) {
    counter += 1;
    return `${label}.${Date.now()}.${counter}@test.invalid`;
}

/**
 * An account with exactly the roles asked for, a wallet, and a live access token.
 *
 * `roles: []` is a real case, not a mistake — an account holding no role at all is
 * what several of the permission checks fall through to.
 */
async function makeUser({ roles = ["BACKER"], balance = 5000, active = true, name = "Test User", title = null } = {}) {
    const email = uniqueEmail(roles.join("-").toLowerCase() || "norole");
    const hash = await hashOnce();

    const { rows } = await pool.query(
        `INSERT INTO users (full_name, email, password, title, is_active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name`,
        [name, email, hash, title, active]
    );

    const user = rows[0];

    for (const role of roles) {
        await pool.query(
            `INSERT INTO user_roles (user_id, role_id)
             SELECT $1, id FROM roles WHERE name = $2`,
            [user.id, role]
        );
    }

    await pool.query(
        `INSERT INTO classcoins (user_id, balance) VALUES ($1, $2)`,
        [user.id, balance]
    );

    // Deactivated accounts cannot sign in through the middleware, but they CAN still
    // get a token — that is exactly the case `authenticate` has to refuse, so the token
    // is fetched before the account is of any use to anyone.
    const login = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });

    return {
        id: user.id,
        email,
        password: PASSWORD,
        roles,
        token: login.body.accessToken,
        refreshToken: login.body.refreshToken,
    };
}

/**
 * A project row, inserted directly so a test can start from any status without walking
 * the whole create → approve path first. Tests that are ABOUT that path use the API.
 */
async function makeProject({
    creatorId,
    status = "APPROVED",
    title = "Test project",
    goal = 5000,
    current = 0,
    createdByAdminId = null,
    archivedAt = null,
    archivedBy = null,
    category = "ENGINEERING",
} = {}) {
    const { rows } = await pool.query(
        `INSERT INTO projects
             (creator_id, title, description, goal_amount, current_amount, category,
              status, created_by_admin_id, archived_at, archived_by, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, CURRENT_DATE + 30)
         RETURNING *`,
        [
            creatorId,
            title,
            "A description used by the backend test suite.",
            goal,
            current,
            category,
            status,
            createdByAdminId,
            archivedAt,
            archivedBy,
        ]
    );

    return rows[0];
}

async function makeTier({ projectId, name = "Supporter", minAmount = 100, bullets = ["Signals support"], isActive = true }) {
    const { rows } = await pool.query(
        `INSERT INTO project_tiers (project_id, name, min_amount, bullets, is_active)
         VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING *`,
        [projectId, name, minAmount, JSON.stringify(bullets), isActive]
    );

    return rows[0];
}

async function makeComment({ projectId, userId, body = "A comment.", parentId = null }) {
    const { rows } = await pool.query(
        `INSERT INTO comments (project_id, user_id, parent_id, body)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [projectId, userId, parentId, body]
    );

    return rows[0];
}

async function balanceOf(userId) {
    const { rows } = await pool.query(`SELECT balance FROM classcoins WHERE user_id = $1`, [userId]);
    return rows[0] ? Number(rows[0].balance) : null;
}

/** `request(app)` with the Authorization header already on it. */
function as(token) {
    const agent = request(app);
    const wrap = (method) => (url) => agent[method](url).set("Authorization", `Bearer ${token}`);

    return { get: wrap("get"), post: wrap("post"), put: wrap("put"), patch: wrap("patch"), delete: wrap("delete") };
}

module.exports = { app, pool, PASSWORD, makeUser, makeProject, makeTier, makeComment, balanceOf, as, uniqueEmail };
