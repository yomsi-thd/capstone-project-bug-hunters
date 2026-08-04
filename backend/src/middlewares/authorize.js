function authorize(...roles) {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const hasRole = req.user.roles.some(role =>
            roles.includes(role)
        );

        if (!hasRole) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        next();
    };
}

module.exports = authorize;