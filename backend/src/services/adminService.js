const userRepository = require("../repositories/userRepository");
const creatorRequestRepository = require("../repositories/creatorRequestRepository");

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

async function getAllCreatorRequests() {
    return await creatorRequestRepository.findAllPending();
}

const pool = require("../config/db");

async function approveCreatorRequest(requestId, adminId) {

    const request = await creatorRequestRepository.findById(requestId);

    if (!request) {
        throw new Error("Creator request not found.");
    }

    if (request.status !== "PENDING") {
        throw new Error("Creator request has already been reviewed.");
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        await userRepository.assignRole(
            request.user_id,
            "CREATOR",
            client
        );

        const updatedRequest =
            await creatorRequestRepository.approve(
                requestId,
                adminId,
                client
            );

        await client.query("COMMIT");

        return updatedRequest;

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();

    }
}
async function rejectCreatorRequest(requestId, adminId) {

    const request = await creatorRequestRepository.findById(requestId);

    if (!request) {
        throw new Error("Creator request not found.");
    }

    if (request.status !== "PENDING") {
        throw new Error("Creator request has already been reviewed.");
    }

    return await creatorRequestRepository.reject(
        requestId,
        adminId
    );
}

module.exports = {
    deactivateUser,
    activateUser,
    getAllUsers,
    getAllCreatorRequests,
    approveCreatorRequest,
    rejectCreatorRequest,
    getUserById
};