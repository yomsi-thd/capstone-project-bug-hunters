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
 * ⚠️ The `jwtid` is load-bearing, not decoration. Without it this payload is just
 * { id, roles }, so `iat` — which has ONE-SECOND resolution — was the only thing that
 * differed between two sign-ins by the same account. Two logins inside the same second
 * produced a BYTE-IDENTICAL token, which collided with the UNIQUE index on
 * refresh_tokens.token and failed a password that was perfectly correct.
 *
 * Reachable by double-clicking SIGN IN, or by two devices signing in together. It used to
 * answer 401 carrying the raw constraint name `refresh_tokens_token_key` to the browser,
 * and after the error contract it became a generic 500 — the leak was gone, the bug was
 * not. Fixed 2026-08-27.
 *
 * `jwtid` sets the standard `jti` claim, so every token is unique whatever the clock
 * says. Nothing reads `jti`: the row is still looked up by the token string, and adding a
 * claim is additive, so `verifyRefreshToken` and the refresh flow are unchanged.
 *
 * The access token deliberately does NOT get one — identical access tokens are harmless
 * because nothing stores them under a unique constraint.
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