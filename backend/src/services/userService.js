const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");

async function getProfile(userId) {
    return await userRepository.findById(userId);
}

async function updateProfile(userId, fullName, email, title) {

    const user =
        await userRepository.findById(userId);

    if (!user)
        throw new Error("User not found");

    const existing =
        await userRepository.findByEmail(email);

    if (existing && existing.id !== userId)
        throw new Error("Email already exists");

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
        throw new Error("User not found");

    const fullUser =
        await userRepository.findByEmail(user.email);

    const match =
        await bcrypt.compare(
            oldPassword,
            fullUser.password
        );

    if (!match)
        throw new Error("Old password is incorrect");

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
        throw new Error("User not found");
    }

    return await userRepository.deleteUser(userId);
}

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount
};