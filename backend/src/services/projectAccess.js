const projectRepository = require("../repositories/projectRepository");
const { notFound, conflict } = require("../errors/AppError");

/**
 * The rules every project-shaped service has to agree on: who counts as an admin,
 * who may READ a project, and when a project is frozen.
 *
 * ⚠️ They live here rather than in projectService because all five of those services
 * call them, and a shared rule with five homes is a rule that will be updated in one
 * of them. The team spent 2026-08-24 gathering `isAdminRole` back up from ten
 * hand-written copies, and splitting projectService is exactly the occasion for that
 * to happen again. Import from here; do not re-write any of these.
 */

function isAdminRole(roles) {
    return Array.isArray(roles) && roles.includes("ADMIN");
}

// An archived project is frozen: no edits, no investments, no comments, no updates,
// no approve/reject. Freezing edits is not tidiness — it is what makes "restore puts
// the project back at its previous status without re-approval" safe. If editing while
// archived is ever allowed, restore MUST be changed to send the project back to
// PENDING, otherwise archive → edit → restore is a route onto Discover that skips
// moderation entirely.
function assertNotArchived(project) {

    if (project.archived_at) {
        throw conflict("This project is archived. Restore it first.");
    }
}

/**
 * Who may READ a project and everything hanging off it (its comments, its updates).
 *
 * Only APPROVED projects are public. A PENDING one has been vetted by nobody and a
 * REJECTED one was explicitly refused, so neither should be readable by a stranger who
 * guesses the id — and ids are sequential integers, so guessing is trivial. Serving them
 * anyway left the approval queue decorative: the moderation gate sat on Discover's
 * listing rather than on the project itself.
 *
 * `viewer` is req.user, which for the public routes comes from authOptional and is NULL
 * for a signed-out visitor.
 *
 * ⚠️ This tests `status` and deliberately NOT `archived_at`. An archived project must
 * stay readable — a backer who already invested still has a card linking to it, which is
 * the documented reason these routes never 404 for archived rows.
 */
function assertVisibleTo(project, viewer) {

    if (project.status === "APPROVED") {
        return;
    }

    const isOwner =
        viewer && Number(project.creator_id) === Number(viewer.id);

    if (!isOwner && !isAdminRole(viewer?.roles)) {
        // Deliberately the same message as a missing row. "This exists but is pending
        // review" already tells a stranger the project exists.
        throw notFound("Project not found");
    }
}

/**
 * The read every public project route begins with: load it, then apply the
 * visibility rule.
 *
 * Three routes did this by hand - the project, its comments, its updates - and they
 * must not be able to disagree, because hiding a project while leaving its discussion
 * readable one URL over hides nothing at all.
 */
async function loadVisibleProject(projectId, viewer) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    assertVisibleTo(project, viewer);

    return project;
}

module.exports = {
    isAdminRole,
    assertNotArchived,
    assertVisibleTo,
    loadVisibleProject,
};
