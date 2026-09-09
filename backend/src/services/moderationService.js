const projectRepository = require("../repositories/projectRepository");
const { notFound, forbidden, conflict } = require("../errors/AppError");
const { isAdminRole, assertNotArchived, assertSemesterOpen } = require("./projectAccess");
const MESSAGES = require("../validation/messages");

/**
 * The verdicts: approve, reject, resubmit, endorse. Kept together with the
 * conflict-of-interest rule rather than buried among create, edit and archive.
 *
 * resubmitProject lives here but is not a verdict: it is the owner asking to be looked at
 * again, which is why assertNotOwnReview does not apply to it.
 */

/**
 * An admin who filed a project on behalf of a creator may not also approve or reject it.
 * Moderation is where this platform's value sits, so one person doing both sides of it is
 * a real conflict of interest.
 *
 * created_by_admin_id is what makes the check possible: by then creator_id points at the
 * creator, so nothing else in the row remembers who filed it.
 *
 * Not applied to resubmitProject, which is the owner asking to be looked at again rather
 * than a verdict.
 */
function assertNotOwnReview(project, adminId) {

    if (
        project.created_by_admin_id != null &&
        Number(project.created_by_admin_id) === Number(adminId)
    ) {
        throw conflict(
            "You created this project on behalf of its owner, " +
            "so another admin has to review it."
        );
    }
}

// The queue already filters archived projects out, so this guard covers the stale-tab
// case: the queue was left open, somebody archived a project meanwhile, and the verdict
// would otherwise land on a project nobody can see.
async function approveProject(id, adminId) {

    const existing = await projectRepository.findById(id);

    if (!existing) {
        throw notFound("Project not found");
    }

    assertNotArchived(existing);
    assertNotOwnReview(existing, adminId);

    const approved = await projectRepository.approveProject(id);

    // No row came back, so `status` was no longer PENDING by the time the UPDATE ran and
    // another admin reached the project first. `existing` above says nothing about that:
    // it was read before the write, which is the window being closed here.
    if (!approved) {
        throw conflict(MESSAGES.VERDICT_ALREADY_GIVEN);
    }

    return approved;
}

async function rejectProject(id, note, adminId) {

    const existing = await projectRepository.findById(id);

    if (!existing) {
        throw notFound("Project not found");
    }

    assertNotArchived(existing);
    assertNotOwnReview(existing, adminId);

    const trimmedNote = (note || "").trim();

    // Optional, though the UI pushes for it: without a note the creator learns their
    // project was refused and nothing about why. Not enforced, because the queue's
    // one-click REJECT is a fair quick action for obvious spam.
    const rejected = await projectRepository.rejectProject(id, trimmedNote);

    // Same race as approveProject, and the worse direction of the two: without it an
    // already-approved project could be flipped to REJECTED and taken off Discover by an
    // admin looking at a stale queue.
    if (!rejected) {
        throw conflict(MESSAGES.VERDICT_ALREADY_GIVEN);
    }

    return rejected;
}

// The creator's way back after a rejection. Without it a REJECTED project is a dead end:
// the queue lists PENDING only and the admin dashboard has no approve button, so nothing
// could move it forward however well it was revised.
async function resubmitProject(projectId, userId, roles) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    assertNotArchived(project);
    // Resubmit is gated on the semester while approve and reject above are not, and the
    // asymmetry is the point. A verdict has to stay reachable on a finished term or a
    // PENDING project is stuck for good. Resubmitting is only useful if the creator can
    // first fix what was rejected, and editing closes with the term, so this would be a
    // button that changes state and achieves nothing. Reopening editing on a closed
    // semester means revisiting this line too.
    assertSemesterOpen(project);

    const isAdmin = isAdminRole(roles);

    if (project.creator_id !== userId && !isAdmin) {
        throw forbidden("Only the project's creator can resubmit it.");
    }

    // Only from REJECTED. From PENDING it would let someone bump their own project
    // around the queue, and from APPROVED it would take a live project off Discover.
    if (project.status !== "REJECTED") {
        throw conflict("Only a rejected project can be resubmitted for review.");
    }

    return await projectRepository.resubmitProject(projectId);
}

async function setProjectEndorsed(id, endorsed) {

    const project = await projectRepository.setEndorsed(id, Boolean(endorsed));

    if (!project) {
        throw notFound("Project not found");
    }

    return project;
}

module.exports = {
    approveProject,
    rejectProject,
    resubmitProject,
    setProjectEndorsed,
};
