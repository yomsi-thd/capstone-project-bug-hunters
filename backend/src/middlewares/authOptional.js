const authenticate = require("./authMiddleware");

/**
 * Authentication that is attempted but not required.
 *
 * Used by routes that are PUBLIC yet behave differently once the caller is known —
 * GET /projects/:id is the only one so far: anyone may read an approved project, but a
 * PENDING or REJECTED one is visible only to its creator and to admins, and the server
 * cannot apply that rule without knowing who is asking.
 *
 *   no Authorization header  ->  req.user = null, continue (NOT a 401)
 *   header, valid token      ->  req.user = {...}, continue
 *   header, bad/expired      ->  401, exactly like authenticate
 *
 * ⚠️ That last line is deliberate and easy to get wrong. Access tokens live 15 minutes
 * and the frontend's axios interceptor refreshes them when it sees a 401. If an expired
 * token were quietly downgraded to "anonymous" instead, a signed-in creator whose token
 * had just lapsed would get a 404 on their OWN pending project, no 401 would be raised,
 * nothing would refresh, and the page would simply say "Project not found".
 *
 * The valid-token path delegates to `authenticate` rather than re-implementing it, so
 * the is_active check and the roles-from-token handling cannot drift between the two.
 */
async function authenticateOptional(req, res, next) {

    if (!req.headers.authorization) {
        req.user = null;
        return next();
    }

    return authenticate(req, res, next);
}

module.exports = authenticateOptional;
