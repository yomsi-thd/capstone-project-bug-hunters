const { unauthenticated, forbidden } = require("../errors/AppError");

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(unauthenticated("Unauthorized"));
        }

        const hasRole = req.user.roles.some((role) => roles.includes(role));

        if (!hasRole) {
            return next(forbidden("Forbidden"));
        }

        next();
    };
}

module.exports = authorize;
