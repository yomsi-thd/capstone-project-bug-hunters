const authService = require("../services/authService");

async function register(req, res) {

    try {

        const { fullName, email, password } = req.body;

        const user =
            await authService.register(
                fullName,
                email,
                password
            );

        res.status(201).json(user);

    } catch (error) {

        res.status(400).json({
            message: error.message
        });
    }
}

async function login(req, res) {

    try {

        const { email, password } = req.body;

        const result =
            await authService.login(
                email,
                password
            );

        res.json(result);

    } catch (error) {

        res.status(401).json({
            message: error.message
        });
    }
}

async function refreshToken(req, res) {
    try {

        const { refreshToken } = req.body;

        const result =
            await authService.refreshToken(refreshToken);

        res.json(result);

    } catch (error) {

        res.status(401).json({
            message: error.message
        });

    }
}

async function logout(req, res) {
    try {

        const { refreshToken } = req.body;

        await authService.logout(refreshToken);

        res.json({
            message: "Logged out successfully"
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

module.exports = {
    register,
    login,
    refreshToken,
    logout
};