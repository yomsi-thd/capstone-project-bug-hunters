const projectRepository = require("../repositories/projectRepository");
const { notFound, forbidden, conflict } = require("../errors/AppError");
const { isAdminRole, assertNotArchived, assertSemesterOpen } = require("./projectAccess");

/**
 * The verdicts: approve, reject, resubmit, endorse.
 *
 * Split out from projectService for size - everything this platform is worth sits in
 * the moderation step, and it reads better next to the conflict-of-interest rule than
 * buried among create/edit/archive.
 *
 * ⚠️ resubmitProject lives here but is NOT a verdict: it is the owner exercising
 * their right to be looked at again, which is why assertNotOwnReview deliberately
 * does not apply to it.
 */

/**
 * An admin who filed a project on behalf of a creator may not also be the one who
 * approves or rejects it. Everything this platform is worth sits in the moderation
 * step, so one person doing both sides of it is a real conflict of interest — and
 * before `created_by_admin_id` existed there was no trace in the database to check
 * against, because creator_id points at the creator by then.
 *
 * Deliberately NOT applied to resubmitProject: resubmitting is the owner exercising
 * their right to be looked at again, not a verdict.
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

// The approval queue already filters archived projects out, so this guard covers the
// stale-tab case: an admin left the queue open, someone archived a project meanwhile,
// and the verdict would otherwise land silently on a project nobody can see.
async function approveProject(id, adminId) {

    const existing = await projectRepository.findById(id);

    if (!existing) {
        throw notFound("Project not found");
    }

    assertNotArchived(existing);
    assertNotOwnReview(existing, adminId);

    return await projectRepository.approveProject(id);
}

async function rejectProject(id, note, adminId) {

    const existing = await projectRepository.findById(id);

    if (!existing) {
        throw notFound("Project not found");
    }

    assertNotArchived(existing);
    assertNotOwnReview(existing, adminId);

    const trimmedNote = (note || "").trim();

    // Optional, but strongly encouraged by the UI: without it the creator is told their
    // project was refused and nothing about why, which is the state this column exists
    // to end. Not enforced here because the queue's one-click REJECT is a legitimate
    // quick action for obvious spam.
    return await projectRepository.rejectProject(id, trimmedNote);
}

// The creator's way back after a rejection. Without this a REJECTED project is a dead
// end: the approval queue only lists PENDING and the admin dashboard has no approve
// button, so nothing could ever move it forward again no matter how well it was revised.
async function resubmitProject(projectId, userId, roles) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    assertNotArchived(project);
    // ⚠️ Resubmit is gated on the semester but approve and reject above deliberately are
    // NOT, and the asymmetry is the point. A verdict still has to be reachable on a
    // finished term or a PENDING project is stuck for ever. Resubmitting, on the other
    // hand, is only useful if the creator can first FIX what was rejected - and
    // updateProject is closed once the term ends, so this would be a button that changes
    // state and achieves nothing. If editing on a closed semester is ever reopened, this
    // line has to be reconsidered at the same time.
    assertSemesterOpen(project);

    const isAdmin = isAdminRole(roles);

    if (project.creator_id !== userId && !isAdmin) {
        throw forbidden("Only the project's creator can resubmit it.");
    }

    // Only from REJECTED. Allowing it from PENDING would let someone bump their own
    // project around the queue, and from APPROVED it would take a live project off
    // Discover by accident.
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
