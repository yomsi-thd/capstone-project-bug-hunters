const userService =
    require("../services/userService");

async function getProfile(req, res) {

    try {

        const user =
            await userService.getProfile(
                req.user.id
            );

        res.json(user);

    } catch (err) {

        res.status(500).json({
            message: err.message
        });
    }
}

async function updateProfile(req, res) {

    try {

        // `title` is optional: leaving it out of the body keeps the stored value.
        const { fullName, email, title } = req.body;

        const user =
            await userService.updateProfile(
                req.user.id,
                fullName,
                email,
                title
            );

        res.json(user);

    } catch (err) {

        res.status(400).json({
            message: err.message
        });
    }
}

async function changePassword(req, res) {

    try {

        const {
            oldPassword,
            newPassword
        } = req.body;

        const result =
            await userService.changePassword(
                req.user.id,
                oldPassword,
                newPassword
            );

        res.json(result);

    } catch (err) {

        res.status(400).json({
            message: err.message
        });
    }
}

async function deleteAccount(req, res) {

    try {

        const user = await userService.deleteAccount(req.user.id);

        res.status(200).json({
            message: "Account deleted successfully",
            user
        });

    } catch (err) {

        res.status(400).json({
            message: err.message
        });
    }
}

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount
};