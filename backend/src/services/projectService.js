const projectRepository = require("../repositories/projectRepository");
const userRepository = require("../repositories/userRepository");
const semesterService = require("./semesterService");
const tierRepository = require("../repositories/tierRepository");
const withTransaction = require("../db/withTransaction");
const { notFound, forbidden, conflict, validationFailed } = require("../errors/AppError");
const { isAdminRole, assertNotArchived, assertSemesterOpen, loadVisibleProject } = require("./projectAccess");
const { normaliseTierBatch } = require("./tierService");

/**
 * The project's own lifecycle: create, read, edit, archive, restore, delete.
 *
 * Comments, project updates, support levels, investments and the moderation verdicts
 * used to live in this file too - 1005 lines across five resources, which turned
 * "where is the rule about X" into a search rather than a lookup. They are now five
 * services of their own, each beside the repository it already had, and the reading
 * rules they share are in projectAccess.js.
 *
 * ⚠️ The ROUTES did not move. A comment is still POST /projects/:id/comments. This
 * split is entirely internal and the frontend cannot tell that it happened.
 */

/**
 * Who ends up OWNING the project, and who gets recorded as having filed it.
 *
 * An admin no longer owns anything (the lecturer's rule, 2026-08-21): they may only
 * create a project ON BEHALF OF a creator, and ownership goes to that creator. So the
 * rule is read from the CALLER's role first — `creator_id` in the body is optional for
 * nobody: forbidden for a creator, required for an admin.
 *
 * ⚠️ An admin who sends no creator_id is REFUSED rather than defaulted to themselves.
 * Defaulting is the one path in this flow that could quietly mint "a project owned by
 * an admin", which is exactly what the rule exists to remove. The `target is the admin`
 * branch closes the remaining way round it: naming yourself.
 *
 * ⚠️ A creator who sends creator_id is REFUSED rather than having it ignored. Silently
 * ignoring it is how a creator would file a project under someone else's name with
 * nothing anywhere recording that they tried.
 */
async function resolveOwnership(userId, roles, data) {

    const requestedOwnerId = data.creator_id ?? null;

    if (!isAdminRole(roles)) {

        if (requestedOwnerId != null) {
            throw forbidden("Only an admin can create a project on behalf of a creator.");
        }

        return { creator_id: userId, created_by_admin_id: null };
    }

    if (requestedOwnerId == null) {
        throw validationFailed(
            "An admin creates a project on behalf of a creator. " +
            "Choose the creator it belongs to.",
            [{ field: "creator_id", message: "Choose the creator this project belongs to." }]
        );
    }

    if (Number(requestedOwnerId) === Number(userId)) {
        throw forbidden("An admin cannot own a project.");
    }

    const target = await userRepository.findById(requestedOwnerId);

    if (!target) {
        throw validationFailed("That creator account does not exist.");
    }

    if (target.is_active === false) {
        throw conflict("That creator account is deactivated.");
    }

    const targetRoles = await userRepository.getUserRoles(target.id);

    if (!targetRoles.includes("CREATOR")) {
        throw conflict("That user is not a creator. Grant the CREATOR role first.");
    }

    return { creator_id: target.id, created_by_admin_id: userId };
}

// Create project
async function createProject(userId, roles, data) {

    // The semester gate, checked before anything is written. A project belongs to a
    // teaching period, so there has to be one open to file it into — and in the gap
    // between two the refusal names the date the next one starts.
    //
    // ⚠️ This REPLACED resolveCampaignDates + DEFAULT_CAMPAIGN_DAYS (deleted 2026-09-06),
    // which gave every project its own 30-day window. That per-project deadline was the
    // funding framing the client asked us to remove, one layer below where it showed on
    // screen. A project's closing date is its SEMESTER's end_date now, and nothing
    // writes projects.start_date / end_date any more.
    const semester = await semesterService.requireOpenSemester();
    const ownership = await resolveOwnership(userId, roles, data);

    const project = {
        creator_id: ownership.creator_id,
        // NULL for a creator's own project. Only set when an admin filed it, and it is
        // what stops that same admin approving it later.
        created_by_admin_id: ownership.created_by_admin_id,
        title: data.title,
        description: data.description,
        category: data.category,
        goal_amount: data.goal_amount,
        current_amount: 0,
        image_url: data.image_url,
        status: "PENDING",
        team_members: data.team_members || [],
        // Taken from the open semester, never from the request. A creator does not get
        // to choose which teaching period their project counts towards, and neither
        // does an admin filing on their behalf - same reasoning as creator_id.
        semester_id: semester.id,
        // The project story, split the way ProjectDetail renders it. `description`
        // stays the short blurb used on the Discover cards; these three are the long
        // form. All optional — a project with none of them just shows the blurb.
        challenge: data.challenge || null,
        solution: data.solution || null,
        funding_usage: data.funding_usage || null,
        gallery: Array.isArray(data.gallery) ? data.gallery : [],
        // [{ title, desc }] — the highlights listed under "Our Solution".
        solution_bullets: Array.isArray(data.solution_bullets) ? data.solution_bullets : [],
        // A link to the pitch video. The wizard requires one; before 2026-08-18 there
        // was no column and it was collected and dropped.
        video_url: data.video_url || null
    };

    // Validated before opening the transaction so a bad level costs nothing.
    const tiers = normaliseTierBatch(data.tiers);

    if (tiers.length === 0) {
        return await projectRepository.createProject(project);
    }

    // Project + levels are one transaction. Half-saved is the worst outcome here: the
    // wizard latches submitLockRef on success and sends the creator away, so they would
    // believe the levels exist with no way to notice they do not.
    return await withTransaction(async (client) => {

        const createdProject =
            await projectRepository.createProject(project, client);

        for (const tier of tiers) {
            await tierRepository.create(
                { project_id: createdProject.id, ...tier },
                client
            );
        }

        return createdProject;
    });
}

// Get all projects
async function getAllProjects() {
    return await projectRepository.findAll();
}

/**
 * Discover's catalogue, ALWAYS scoped to one semester.
 *
 * `semester` is the raw `?semester=` value or null. Null means "the one Discover opens
 * on", which is the most recently STARTED semester — not the open one. In the gap
 * between two teaching periods there is no open semester, and Discover must still show
 * the term that just finished rather than an empty page: no open semester blocks
 * writing, never reading.
 *
 * ⚠️ An explicit id is looked up rather than trusted, so `?semester=abc` and
 * `?semester=99999` both answer 404 instead of quietly reporting an empty term.
 */
async function getAllApprovedProjects({ semester = null, limit = null, offset = 0 } = {}) {

    const target =
        semester == null
            ? await semesterService.getBrowsableSemester()
            : await semesterService.requireSemester(semester);

    // No semester has started yet. Impossible with the real data, and it must still be
    // an empty catalogue rather than a 500 on the landing page.
    if (!target) {
        return { items: [], total: 0 };
    }

    const items = await projectRepository.findAllApprovedProjects({
        semesterId: target.id,
        limit,
        offset,
    });

    // Only pay for the COUNT when a page was actually asked for.
    const total =
        limit == null
            ? items.length
            : await projectRepository.countApprovedProjects({ semesterId: target.id });

    return { items, total };
}

// Get project by ID
// `viewer` is req.user — from authOptional on the public route, and the admin's own
// req.user on GET /admin/projects/:id. See assertVisibleTo for the rule.
async function getProjectById(id, viewer = null) {

    return await loadVisibleProject(id, viewer);
}

async function getMyProjects(userId) {

    return await projectRepository.findByCreatorId(userId);
}

// Backers of everything this creator owns. The creator id comes from the token, never
// from the URL, so there is no project to check ownership against — a creator can only
// ever ask for their own.
async function getMyBackers(userId) {

    return await projectRepository.findBackersByCreatorId(userId);
}

// Update project
async function updateProject(projectId, userId, data) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    if (project.creator_id !== userId) {
        // 403, where it used to be 400 alongside "no such project" and "the database is
        // down" - the three cases this whole restructure exists to separate.
        //
        // Note there is still no admin branch: updateProject compares creator_id to
        // req.user.id and nothing else, so an admin editing somebody's project is
        // refused exactly like a stranger. That is existing behaviour, left alone.
        throw forbidden("Unauthorized");
    }

    assertNotArchived(project);
    // "Không sửa" - the client's words. Note this is what makes locking resubmit the
    // right call: a creator who cannot edit has nothing to resubmit.
    assertSemesterOpen(project);

    const updatedProject = {
        title: data.title ?? project.title,
        description: data.description ?? project.description,
        category: data.category ?? project.category,
        goal_amount: data.goal_amount ?? project.goal_amount,
        image_url: data.image_url ?? project.image_url,
        team_members: data.team_members ?? project.team_members,
        challenge: data.challenge ?? project.challenge,
        solution: data.solution ?? project.solution,
        funding_usage: data.funding_usage ?? project.funding_usage,
        gallery: Array.isArray(data.gallery) ? data.gallery : project.gallery,
        solution_bullets: Array.isArray(data.solution_bullets)
            ? data.solution_bullets
            : project.solution_bullets,
        // Three cases, not two: field absent -> leave the column alone; field sent with
        // text -> store it; field sent empty -> store NULL, not "". createProject already
        // normalises the same way (`data.video_url || null`), and letting an edit write
        // "" would leave two different values meaning "no video" in one column.
        video_url:
            data.video_url === undefined
                ? project.video_url
                : (data.video_url || null)
    };

    return await projectRepository.updateProject(projectId, updatedProject);
}

// Archive a project instead of destroying it. Replaces "delete" as the everyday action
// after the demo feedback: nothing should leave the database on a single click.
// A creator may archive their own project; an ADMIN may archive any.
async function archiveProject(projectId, userId, roles, reason) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    if (project.archived_at) {
        throw conflict("This project is already archived.");
    }

    const isAdmin = isAdminRole(roles);
    const isOwner = project.creator_id === userId;

    if (!isOwner && !isAdmin) {
        throw forbidden("Unauthorized");
    }

    const trimmedReason = (reason || "").trim();

    // An admin archiving someone else's project locks the creator out of restoring it
    // (see restoreProject), so the creator is at least owed the reason. Archiving your
    // own project needs no justification.
    if (isAdmin && !isOwner && !trimmedReason) {
        throw validationFailed("A reason is required when archiving another user's project.");
    }

    return await projectRepository.archiveProject(projectId, userId, trimmedReason);
}

// Restore. The asymmetry here is deliberate and is the core rule of the feature:
// a creator may only undo an archive they performed themselves. If an ADMIN archived
// the project, only an admin can bring it back — otherwise the creator could simply
// reverse a moderation decision.
// Note `archived_by` is ON DELETE SET NULL, so if the archiver's account is gone the
// comparison fails and only an admin can restore. That is the safe direction.
async function restoreProject(projectId, userId, roles) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    if (!project.archived_at) {
        throw conflict("This project is not archived.");
    }

    const isAdmin = isAdminRole(roles);
    const archivedBySelf = project.archived_by === userId;
    const isOwner = project.creator_id === userId;

    if (!isAdmin && !(isOwner && archivedBySelf)) {
        throw forbidden(
            "This project was archived by an administrator and can only be restored by one."
        );
    }

    // `status` was never touched by archiveProject, so the project comes back at the
    // verdict it already had: APPROVED goes straight back onto Discover, PENDING
    // returns to the approval queue. No re-approval, and no previous_status column.
    return await projectRepository.restoreProject(projectId);
}

// Permanent delete — the second step of the two-step bin, not the first.
// Tightened from the previous behaviour in two ways:
//   1. ADMIN only. A creator used to be able to hard-delete their own project; now the
//      most they can do is archive it, and an admin has to sign off on the destruction.
//   2. The project must already be archived, so nothing is ever one click from gone.
// The cascade is unchanged: comments and project_updates go with it, and
// classcoin_transactions.project_id is set to NULL so the spend record survives.
async function deleteProject(projectId, userId, roles) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    if (!isAdminRole(roles)) {
        throw forbidden("Unauthorized");
    }

    if (!project.archived_at) {
        throw conflict("Only an archived project can be permanently deleted. Archive it first.");
    }

    await projectRepository.deleteProject(projectId);
}

module.exports = {
    createProject,
    getAllProjects,
    getAllApprovedProjects,
    getProjectById,
    getMyProjects,
    getMyBackers,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
};
