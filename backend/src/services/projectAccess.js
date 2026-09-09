const projectRepository = require("../repositories/projectRepository");
const { notFound, conflict } = require("../errors/AppError");

/**
 * The rules every project-shaped service has to agree on: who counts as an admin, who
 * may read a project, and when a project is frozen.
 *
 * They live here rather than in projectService because all five of those services call
 * them, and a shared rule with five homes gets updated in one of them. Import from here
 * rather than rewriting any of these.
 */

function isAdminRole(roles) {
    return Array.isArray(roles) && roles.includes("ADMIN");
}

// An archived project is frozen: no edits, investments, comments, updates or verdicts.
// Freezing edits is what makes restoring at the previous status safe. If editing while
// archived is ever allowed, restore has to send the project back to PENDING, or
// archive - edit - restore becomes a route onto Discover that skips moderation.
function assertNotArchived(project) {

    if (project.archived_at) {
        throw conflict("This project is archived. Restore it first.");
    }
}

/**
 * A project whose semester has ended is read-only.
 *
 * The second freeze axis, independent of the first. Archiving is something a person does
 * and it hides the project from Discover; a semester ending is the calendar's doing and
 * the project stays visible under its own term. Both can be true at once, so each is
 * checked separately.
 *
 * Pure and synchronous, because Postgres computes `semester_closed` in projectRepository
 * rather than deriving it here. Don't add a lookup and a date comparison: end_date is a
 * DATE column with no time of day, so a Date built from it reads a day early west of
 * Greenwich, and new Date() is the server's clock, which differs between Render and a
 * dev machine. The two would lock a project at different moments.
 *
 * A project with no semester is not locked. Failing open keeps an orphaned project
 * editable, where failing closed would silently freeze a live one.
 *
 * This must not be added to approveProject or rejectProject. A project still PENDING when
 * its term ended has to stay reviewable, or it sits in the queue for ever. Blocking those
 * two looks like consistency and breaks the feature.
 */
function assertSemesterOpen(project) {

    if (project.semester_closed) {
        throw conflict(
            `${project.semester_name || "That semester"} has ended, so this project is now read-only.`
        );
    }
}

/**
 * Who may read a project and everything hanging off it, meaning its comments and updates.
 *
 * Only APPROVED projects are public. A PENDING one has been vetted by nobody and a
 * REJECTED one was refused, so neither should be readable by a stranger who guesses the
 * id, and ids are sequential integers. Serving them anyway would leave the approval queue
 * decorative, with the gate on Discover's listing rather than on the project.
 *
 * `viewer` is req.user, which on the public routes comes from authOptional and is null
 * for a signed-out visitor.
 *
 * It tests `status` and deliberately not `archived_at`: an archived project stays
 * readable, because a backer who already invested still has a card linking to it.
 */
function assertVisibleTo(project, viewer) {

    if (project.status === "APPROVED") {
        return;
    }

    const isOwner =
        viewer && Number(project.creator_id) === Number(viewer.id);

    if (!isOwner && !isAdminRole(viewer?.roles)) {
        // The same message as a missing row. Saying "this exists but is pending review"
        // already tells a stranger the project exists.
        throw notFound("Project not found");
    }
}

/**
 * The read every public project route begins with: load the project, then apply the
 * visibility rule.
 *
 * The project, its comments and its updates all go through this, because hiding a project
 * while leaving its discussion readable one URL over hides nothing at all.
 */
// `withContribution` is opt-in. Most callers load a project only to decide whether its
// comments, updates or levels may be read, and would pay for a subquery they discard.
// Only the detail page renders it.
async function loadVisibleProject(projectId, viewer, { withContribution = false } = {}) {

    const project = await projectRepository.findById(
        projectId,
        undefined,
        withContribution ? (viewer?.id ?? null) : null
    );

    if (!project) {
        throw notFound("Project not found");
    }

    assertVisibleTo(project, viewer);

    return project;
}

module.exports = {
    isAdminRole,
    assertNotArchived,
    assertSemesterOpen,
    assertVisibleTo,
    loadVisibleProject,
};
