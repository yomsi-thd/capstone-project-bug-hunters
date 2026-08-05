const userRepository = require("../repositories/userRepository");

async function deactivateUser(userId) {

    const user = await userRepository.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (!user.is_active) {
        throw new Error("User is already deactivated");
    }

    return await userRepository.updateStatus(userId, false);
}

async function activateUser(userId) {

    const user = await userRepository.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (user.is_active) {
        throw new Error("User is already active");
    }

    return await userRepository.updateStatus(userId, true);
}

async function getAllUsers() {

    return await userRepository.findAllUsers();
}

async function getUserById(userId) {

    const user = await userRepository.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}

module.exports = {
    deactivateUser,
    activateUser,
    getAllUsers,
    getUserById
};