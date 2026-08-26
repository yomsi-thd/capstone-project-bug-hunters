const authService = require("../services/authService");
const asyncHandler = require("../http/asyncHandler");

/**
 * No try/catch anywhere in this file, and that is the point.
 *
 * Each of these used to end in `catch (error) { res.status(...) }` with a status chosen
 * per handler — 400 for register, 401 for login, 401 for refresh, 400 for logout. The
 * status is decided by the service now, at the line that knows what went wrong, and
 * errorHandler is the only place that writes it.
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
