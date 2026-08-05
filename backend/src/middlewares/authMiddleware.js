const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");

async function authenticate(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Access token required"
        });
    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await userRepository.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                message: "Your account has been deactivated."
            });
        }

        // `users` no longer has a `role` column (roles moved to the user_roles table),
        // so roles come from the access token payload - authorize() reads req.user.roles.
        req.user = { ...user, roles: decoded.roles || [] };

        next();

    } catch (err) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

module.exports = authenticate;