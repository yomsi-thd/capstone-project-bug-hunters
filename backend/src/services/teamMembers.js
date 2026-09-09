/**
 * A project's team list is free-form jsonb the creator types, and since it now carries an
 * email it cannot be handed to the browser as it stands.
 *
 * The email exists for one purpose: matching a reader against the team. Only the creator
 * ever sees it again, in the form where they typed it.
 */

// Older rows may hold a bare string where the wizard writes an object, and one project
// once held a value that was not an array at all. Neither should reach a caller as a
// crash.
function stripTeamEmails(teamMembers) {
    if (!Array.isArray(teamMembers)) {
        return [];
    }

    return teamMembers.map((member) => {
        if (!member || typeof member !== "object") {
            return member;
        }

        const { email, ...rest } = member;

        return rest;
    });
}

module.exports = { stripTeamEmails };
