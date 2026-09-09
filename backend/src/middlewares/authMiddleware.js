const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");
const { unauthenticated, forbidden } = require("../errors/AppError");

/**
 * The 401 versus 403 split here is not cosmetic, and getting it backwards logs people out
 * mid-session.
 *
 * The frontend's interceptor refreshes the access token when, and only when, it sees a
 * 401. Access tokens last 15 minutes, so that path runs constantly in normal use, and a
 * missing, malformed or expired token has to stay 401.
 *
 * A deactivated account has to stay 403. Answering 401 would have the interceptor refresh
 * (POST /auth/refresh does not check is_active), retry, be refused again, and loop.
 */
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return next(unauthenticated("Access token required"));
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return next(unauthenticated("Invalid or expired token"));
    }

    const user = await userRepository.findById(decoded.id);

    if (!user) {
        return next(unauthenticated("User not found"));
    }

    if (!user.is_active) {
        return next(forbidden("Your account has been deactivated."));
    }

    // Roles live in the user_roles table rather than on `users`, so they come from the
    // access token payload. authorize() reads req.user.roles.
    req.user = { ...user, roles: decoded.roles || [] };

    next();
}

/**
 * The database lookup above can fail on its own, and a dead connection is not the caller's
 * fault. Wrapping it keeps that a 500 rather than a 401: one try/catch around the whole
 * body would make an outage look like an expired token, and the frontend would refresh
 * and retry into it.
 */
module.exports = (req, res, next) => authenticate(req, res, next).catch(next);
