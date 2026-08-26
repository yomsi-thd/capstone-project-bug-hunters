const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");
const { unauthenticated, forbidden } = require("../errors/AppError");

/**
 * ⚠️ The 401 / 403 split here is not cosmetic, and getting it backwards logs people out
 * mid-session.
 *
 * The frontend's axios interceptor refreshes the access token when — and only when — it
 * sees a 401. Access tokens live 15 minutes, so that path runs constantly during normal
 * use. A missing, malformed or expired token must therefore stay 401.
 *
 * A DEACTIVATED account must stay 403. If it answered 401 the interceptor would refresh
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

    // `users` no longer has a `role` column (roles moved to the user_roles table),
    // so roles come from the access token payload - authorize() reads req.user.roles.
    req.user = { ...user, roles: decoded.roles || [] };

    next();
}

/**
 * The database lookup above can fail on its own, and a dead connection is not the
 * caller's fault. Wrapping keeps that a 500 instead of it being swallowed into a 401,
 * which is what the previous single try/catch around the whole body did — an outage
 * looked exactly like an expired token, so the frontend would refresh and retry into it.
 */
module.exports = (req, res, next) => authenticate(req, res, next).catch(next);
