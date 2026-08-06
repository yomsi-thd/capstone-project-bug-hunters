const pool = require("../config/db");
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

// PATCH /admin/users/:id/roles — the only way to hand out a role by hand.
// It matters beyond AdminUserManagement: createProject no longer auto-grants
// CREATOR, and the creator-request queue only covers people who ticked the box at
// sign-up. Without this route an existing BACKER could never become a CREATOR.
// `roles` REPLACES the user's whole set, so send every role they should keep.
async function updateUserRoles(userId, roles, actingAdminId) {

    if (!Array.isArray(roles)) {
        throw new Error("roles must be an array, e.g. { \"roles\": [\"BACKER\", \"CREATOR\"] }");
    }

    const wanted = [...new Set(
        roles.map(role => String(role).trim().toUpperCase()).filter(Boolean)
    )];

    const user = await userRepository.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    const validRoles = await userRepository.findAllRoleNames();
    const unknown = wanted.filter(role => !validRoles.includes(role));

    if (unknown.length > 0) {
        throw new Error(
            `Unknown role(s): ${unknown.join(", ")}. Valid roles: ${validRoles.join(", ")}`
        );
    }

    // Without this an admin can strip their own ADMIN role in one request and lock
    // the whole team out of the admin area, with no route left to undo it.
    if (Number(userId) === Number(actingAdminId) && !wanted.includes("ADMIN")) {
        throw new Error("You cannot remove your own ADMIN role.");
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        await userRepository.setUserRoles(userId, wanted, client);

        await client.query("COMMIT");

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();

    }

    return {
        ...user,
        roles: wanted
    };
}

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
    updateUserRoles,
    getAllCreatorRequests,
    approveCreatorRequest,
    rejectCreatorRequest,
    getUserById
};