const withTransaction = require("../db/withTransaction");
const userRepository = require("../repositories/userRepository");
const creatorRequestRepository = require("../repositories/creatorRequestRepository");
const { notFound, forbidden, conflict, validationFailed } = require("../errors/AppError");

async function deactivateUser(userId, actingAdminId) {

    const user = await userRepository.findById(userId);

    if (!user) {
        throw notFound("User not found");
    }

    // Same rule as updateUserRoles refusing to strip your own ADMIN role: authenticate
    // rejects an inactive account, so an admin who deactivates themselves is signed out
    // on their next request with no route left to undo it.
    if (Number(userId) === Number(actingAdminId)) {
        // 403: an admin may deactivate users, just not this one. The refusal is about
        // the caller's relationship to the target, which is what FORBIDDEN means.
        throw forbidden("You cannot deactivate your own account.");
    }

    if (!user.is_active) {
        throw conflict("User is already deactivated");
    }

    return await userRepository.updateStatus(userId, false);
}

async function activateUser(userId) {

    const user = await userRepository.findById(userId);

    if (!user) {
        throw notFound("User not found");
    }

    if (user.is_active) {
        throw conflict("User is already active");
    }

    return await userRepository.updateStatus(userId, true);
}

async function getAllUsers() {

    return await userRepository.findAllUsers();
}

async function getUserById(userId) {

    const user = await userRepository.findById(userId);

    if (!user) {
        throw notFound("User not found");
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
        throw validationFailed(
            "roles must be an array, e.g. { \"roles\": [\"BACKER\", \"CREATOR\"] }",
            [{ field: "roles", message: "Send an array of role names." }]
        );
    }

    const wanted = [...new Set(
        roles.map(role => String(role).trim().toUpperCase()).filter(Boolean)
    )];

    const user = await userRepository.findById(userId);

    if (!user) {
        throw notFound("User not found");
    }

    const validRoles = await userRepository.findAllRoleNames();
    const unknown = wanted.filter(role => !validRoles.includes(role));

    if (unknown.length > 0) {
        // 422: the shape is right, the values are not. `details` names the field so a
        // form can put the error on the control that produced it.
        throw validationFailed(
            `Unknown role(s): ${unknown.join(", ")}. Valid roles: ${validRoles.join(", ")}`,
            [{ field: "roles", message: `Unknown role(s): ${unknown.join(", ")}` }]
        );
    }

    // An admin account holds ADMIN and nothing else (lecturer's rule, 2026-08-21):
    // it owns no projects and no Class Coins, so the combinations this refuses have
    // no meaning left. Checked here as well as in the Manage Access modal because the
    // UI is not a security boundary — the same pair of reasons as the self-lockout
    // guard below.
    // ⚠️ Placed BEFORE that guard on purpose: an admin editing their own account is
    // caught by both, and this is the message that explains the rule.
    if (wanted.includes("ADMIN") && wanted.length > 1) {
        // 409, not 422: every name in the set is real and spelled correctly. What is
        // refused is the COMBINATION, which is a rule about the domain rather than about
        // the shape of the request - the same line the whole error table draws.
        throw conflict(
            "An admin account holds the ADMIN role only. Remove CREATOR/BACKER, " +
            "or use a separate account for those."
        );
    }

    // Without this an admin can strip their own ADMIN role in one request and lock
    // the whole team out of the admin area, with no route left to undo it.
    if (Number(userId) === Number(actingAdminId) && !wanted.includes("ADMIN")) {
        throw forbidden("You cannot remove your own ADMIN role.");
    }

    // setUserRoles deletes the whole set before inserting the new one, so a failure
    // halfway would leave the account holding NO roles at all - locked out of everything
    // rather than merely unchanged.
    await withTransaction(async (client) => {
        await userRepository.setUserRoles(userId, wanted, client);
    });

    return {
        ...user,
        roles: wanted
    };
}

async function approveCreatorRequest(requestId, adminId) {

    const request = await creatorRequestRepository.findById(requestId);

    if (!request) {
        throw notFound("Creator request not found.");
    }

    if (request.status !== "PENDING") {
        throw conflict("Creator request has already been reviewed.");
    }

    // Granting the role and marking the request reviewed are one step or neither: a
    // request marked APPROVED without the role is invisible to the queue afterwards, so
    // nobody would ever notice the creator never got it.
    return await withTransaction(async (client) => {

        await userRepository.assignRole(
            request.user_id,
            "CREATOR",
            client
        );

        return await creatorRequestRepository.approve(
            requestId,
            adminId,
            client
        );
    });
}
async function rejectCreatorRequest(requestId, adminId) {

    const request = await creatorRequestRepository.findById(requestId);

    if (!request) {
        throw notFound("Creator request not found.");
    }

    if (request.status !== "PENDING") {
        throw conflict("Creator request has already been reviewed.");
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