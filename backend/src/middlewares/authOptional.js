const authenticate = require("./authMiddleware");

/**
 * Authentication that is attempted but not required.
 *
 * For routes that are public yet behave differently once the caller is known. Anyone may
 * read an approved project, but a PENDING or REJECTED one is visible only to its creator
 * and to admins, and the server cannot apply that rule without knowing who is asking.
 *
 *   no Authorization header  ->  req.user = null, continue, not a 401
 *   header, valid token      ->  req.user = {...}, continue
 *   header, bad or expired   ->  401, exactly like authenticate
 *
 * That last line is easy to get wrong. Access tokens last 15 minutes and the frontend
 * refreshes them when it sees a 401. Downgrading an expired token to anonymous instead
 * would give a signed-in creator a 404 on their own pending project, with no 401 to
 * trigger a refresh and nothing on screen but "Project not found".
 *
 * The valid-token path delegates to `authenticate` rather than reimplementing it, so the
 * is_active check and the roles handling cannot drift between the two.
 */
async function authenticateOptional(req, res, next) {

    if (!req.headers.authorization) {
        req.user = null;
        return next();
    }

    return authenticate(req, res, next);
}

module.exports = authenticateOptional;
