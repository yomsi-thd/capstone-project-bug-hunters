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
 * A project whose SEMESTER has ended is read-only (the client's rule, 2026-09-06).
 *
 * The second freeze axis, and deliberately independent of the first. Archiving is
 * something a PERSON does and it hides the project from Discover; a semester ending is
 * something the CALENDAR does and the project stays perfectly visible under its own
 * term. A project can be in both states at once, and each has to be checked on its own.
 *
 * ⚠️ Pure and synchronous, because `semester_closed` is computed by Postgres in
 * projectRepository (findById / findByCreatorId) rather than derived here. NEVER add a
 * lookup and a `new Date(...) < new Date()` to this function: `semesters.end_date` is a
 * DATE column with no time of day, so building a Date from it reads a day early west of
 * Greenwich, and `new Date()` is the SERVER's clock - UTC on Render, UTC+7 on a dev
 * machine - so the two would lock a project at two different moments.
 *
 * ⚠️ A project with no semester is NOT locked (the COALESCE in that query). Failing open
 * is the safer default: an orphaned project stays editable, where failing closed would
 * silently freeze a live one.
 *
 * ⚠️ THIS MUST NOT BE ADDED TO approveProject OR rejectProject. A project still PENDING
 * when its term ended has to remain reviewable, or it is stuck in the queue for ever -
 * and once approved it simply belongs to that term's read-only record. Blocking those
 * two looks like consistency and is the one change that breaks the feature.
 */
function assertSemesterOpen(project) {

    if (project.semester_closed) {
        throw conflict(
            `${project.semester_name || "That semester"} has ended, so this project is now read-only.`
        );
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
    assertSemesterOpen,
    assertVisibleTo,
    loadVisibleProject,
};
