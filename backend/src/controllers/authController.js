const authService = require("../services/authService");
const asyncHandler = require("../http/asyncHandler");

/**
 * No try/catch in this file, which is the point. The status is decided in the service, at
 * the line that knows what went wrong, and errorHandler is the only place that writes it.
 * A status chosen per handler here would flatten several different failures into one.
 */

const register = asyncHandler(async (req, res) => {
    const { fullName, email, password, wantCreator } = req.body;

    const user = await authService.register(fullName, email, password, wantCreator);

    res.status(201).json(user);
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json(result);
});

const refreshToken = asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.body.refreshToken);

    res.json(result);
});

const logout = asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);

    res.json({ message: "Logged out successfully" });
});

module.exports = { register, login, refreshToken, logout };
