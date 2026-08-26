const userService = require("../services/userService");
const asyncHandler = require("../http/asyncHandler");

const getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user.id);

    res.json(user);
});

const updateProfile = asyncHandler(async (req, res) => {
    // `title` is optional: leaving it out of the body keeps the stored value.
    const { fullName, email, title } = req.body;

    const user = await userService.updateProfile(req.user.id, fullName, email, title);

    res.json(user);
});

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const result = await userService.changePassword(req.user.id, oldPassword, newPassword);

    res.json(result);
});

const deleteAccount = asyncHandler(async (req, res) => {
    const user = await userService.deleteAccount(req.user.id);

    res.status(200).json({ message: "Account deleted successfully", user });
});

module.exports = { getProfile, updateProfile, changePassword, deleteAccount };
