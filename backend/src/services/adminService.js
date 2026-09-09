const withTransaction = require("../db/withTransaction");
const userRepository = require("../repositories/userRepository");
const creatorRequestRepository = require("../repositories/creatorRequestRepository");
const { notFound, forbidden, conflict, validationFailed } = require("../errors/AppError");

async function deactivateUser(userId, actingAdminId) {

    const user = await userRepository.findById(userId);

    if (!user) {
        throw notFound("User not found");
    }

    // Same idea as refusing to strip your own ADMIN role. authenticate rejects an
    // inactive account, so an admin who deactivates themselves is signed out on their
    // next request with no way back.
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

async function getAllUsers({ limit = null, offset = 0 } = {}) {

    const items = await userRepository.findAllUsers({ limit, offset });

    const total = limit == null ? items.length : await userRepository.countAllUsers();

    return { items, total };
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

// The only way to hand out a role by hand. It matters beyond the admin screen: nothing
// grants CREATOR automatically, and the creator-request queue covers only people who
// ticked the box at sign-up, so without this an existing backer could never become one.
//
// `roles` replaces the whole set, so send every role the user should keep.
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

    // An admin account holds ADMIN and nothing else: it owns no projects and no Class
    // Coins, so the combinations refused here have no meaning. Checked on this side as
    // well as in the Manage Access modal, because the UI is not a security boundary.
    //
    // Placed before the self-lockout guard on purpose: an admin editing their own account
    // trips both, and this is the message that explains the rule.
    if (wanted.includes("ADMIN") && wanted.length > 1) {
        // 409 rather than 422: every name in the set is real and spelled correctly, and
        // what is refused is the combination, which is a rule about the domain rather
        // than about the shape of the request.
        throw conflict(
            "An admin account holds the ADMIN role only. Remove CREATOR/BACKER, " +
            "or use a separate account for those."
        );
    }

    // Without this an admin could strip their own ADMIN role in one request and lock the
    // team out of the admin area with no way back.
    if (Number(userId) === Number(actingAdminId) && !wanted.includes("ADMIN")) {
        throw forbidden("You cannot remove your own ADMIN role.");
    }

    // setUserRoles deletes the whole set before inserting the new one, so a failure
    // halfway would leave the account holding no roles at all rather than unchanged.
    await withTransaction(async (client) => {
        await userRepository.setUserRoles(userId, wanted, client);
    });

    return {
        ...user,
        roles: wanted
    };
}

// One sentence, shared by the early check and the race guard below. Two checks are fine;
// two wordings would have people refused by each reading different reasons and assuming
// two different rules.
const REQUEST_ALREADY_REVIEWED = "Creator request has already been reviewed.";

async function approveCreatorRequest(requestId, adminId) {

    const request = await creatorRequestRepository.findById(requestId);

    if (!request) {
        throw notFound("Creator request not found.");
    }

    if (request.status !== "PENDING") {
        throw conflict(REQUEST_ALREADY_REVIEWED);
    }

    // Granting the role and marking the request reviewed happen together or not at all.
    // A request marked APPROVED without the role leaves the queue, so nobody would notice
    // the creator never got it.
    return await withTransaction(async (client) => {

        await userRepository.assignRole(
            request.user_id,
            "CREATOR",
            client
        );

        const approved = await creatorRequestRepository.approve(
            requestId,
            adminId,
            client
        );

        // The check above is a read-then-write and closes nothing on its own, since two
        // admins can both read PENDING and both pass it. `AND status = 'PENDING'` in the
        // UPDATE is what decides, and 0 rows means the other admin got there first.
        //
        // Thrown inside the transaction on purpose: assignRole ran first, so the throw is
        // what rolls the grant back. Returning instead would leave the role granted
        // against a request somebody else had already rejected.
        if (!approved) {
            throw conflict(REQUEST_ALREADY_REVIEWED);
        }

        return approved;
    });
}
async function rejectCreatorRequest(requestId, adminId) {

    const request = await creatorRequestRepository.findById(requestId);

    if (!request) {
        throw notFound("Creator request not found.");
    }

    if (request.status !== "PENDING") {
        throw conflict(REQUEST_ALREADY_REVIEWED);
    }

    const rejected = await creatorRequestRepository.reject(
        requestId,
        adminId
    );

    // Same race, same reason as approveCreatorRequest above.
    if (!rejected) {
        throw conflict(REQUEST_ALREADY_REVIEWED);
    }

    return rejected;
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