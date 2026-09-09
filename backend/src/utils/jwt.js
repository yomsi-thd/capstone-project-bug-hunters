const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const generateAccessToken = (user, roles) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            roles
        },
        ACCESS_SECRET,
        { expiresIn: "15m" }
    );
};

/**
 * `jwtid` is load-bearing rather than decoration. Without it the payload is just
 * { id, roles }, so `iat`, which has one-second resolution, is the only thing separating
 * two sign-ins by the same account. Two logins inside the same second then produce a
 * byte-identical token, which collides with the unique index on refresh_tokens.token and
 * fails a password that was perfectly correct.
 *
 * That is reachable by double-clicking SIGN IN, or by two devices signing in together.
 *
 * `jwtid` sets the standard `jti` claim, so every token is unique whatever the clock says.
 * Nothing reads `jti`: the row is still looked up by the token string, so the refresh flow
 * is unchanged.
 *
 * The access token does not get one. Identical access tokens are harmless, because
 * nothing stores them under a unique constraint.
 */
const generateRefreshToken = (user, roles) => {
    return jwt.sign(
        {
            id: user.id,
            roles
        },
        REFRESH_SECRET,
        { expiresIn: "7d", jwtid: crypto.randomUUID() }
    );
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, ACCESS_SECRET);
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_SECRET);
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};