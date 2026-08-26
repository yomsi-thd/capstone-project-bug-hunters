const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");
const { notFound, conflict, validationFailed } = require("../errors/AppError");

async function getProfile(userId) {
    return await userRepository.findById(userId);
}

async function updateProfile(userId, fullName, email, title) {

    const user =
        await userRepository.findById(userId);

    if (!user)
        throw notFound("User not found");

    const existing =
        await userRepository.findByEmail(email);

    if (existing && existing.id !== userId)
        // 409: the address is real and usable, it just already belongs to somebody.
        throw conflict("Email already exists");

    return await userRepository.updateProfile(
        userId,
        fullName,
        email,
        // undefined means "not supplied" -> keep what is already stored.
        title === undefined ? user.title : title
    );
}

async function changePassword(
    userId,
    oldPassword,
    newPassword
) {

    const user =
        await userRepository.findById(userId);

    if (!user)
        throw notFound("User not found");

    const fullUser =
        await userRepository.findByEmail(user.email);

    const match =
        await bcrypt.compare(
            oldPassword,
            fullUser.password
        );

    if (!match)
        // 422 rather than 401: the caller IS authenticated - they are holding a valid
        // token for this very account. What is wrong is a value they typed, and naming
        // the field is what lets the form put the error on the right input.
        throw validationFailed("Old password is incorrect", [
            { field: "oldPassword", message: "Old password is incorrect" },
        ]);

    const hashed =
        await bcrypt.hash(newPassword, 10);

    await userRepository.updatePassword(
        userId,
        hashed
    );

    return {
        message: "Password updated successfully"
    };
}

async function deleteAccount(userId) {

    const user = await userRepository.findById(userId);

    if (!user) {
        throw notFound("User not found");
    }

    return await userRepository.deleteUser(userId);
}

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount
};