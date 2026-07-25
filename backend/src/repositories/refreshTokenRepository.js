const pool = require("../config/db");

const createToken = async (userId, token, expiresAt) => {
    const query = `
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;

    const values = [userId, token, expiresAt];
    const result = await pool.query(query, values);

    return result.rows[0];
};

const findByToken = async (token) => {
    const query = `
        SELECT *
        FROM refresh_tokens
        WHERE token = $1;
    `;

    const result = await pool.query(query, [token]);

    return result.rows[0];
};

const deleteToken = async (token) => {
    const query = `
        DELETE FROM refresh_tokens
        WHERE token = $1;
    `;

    await pool.query(query, [token]);
};

const deleteByUser = async (userId) => {
    const query = `
        DELETE FROM refresh_tokens
        WHERE user_id = $1;
    `;

    await pool.query(query, [userId]);
};

module.exports = {
    createToken,
    findByToken,
    deleteToken,
    deleteByUser,
};