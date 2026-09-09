const projectRepository = require("../repositories/projectRepository");
const userRepository = require("../repositories/userRepository");
const semesterService = require("./semesterService");
const tierRepository = require("../repositories/tierRepository");
const withTransaction = require("../db/withTransaction");
const { notFound, forbidden, conflict, validationFailed } = require("../errors/AppError");
const { isAdminRole, assertNotArchived, assertSemesterOpen, loadVisibleProject } = require("./projectAccess");
const { normaliseTierBatch } = require("./tierService");
const { stripTeamEmails } = require("./teamMembers");

/**
 * The project's own lifecycle: create, read, edit, archive, restore, delete.
 *
 * Comments, project updates, support levels, investments and the moderation verdicts are
 * services of their own, each beside the repository it already had. The reading rules
 * they all share live in projectAccess.js.
 *
 * The routes did not move with them: a comment is still POST /projects/:id/comments.
 * The split is internal and the frontend cannot tell it happened.
 */

/**
 * Who ends up owning the project, and who is recorded as having filed it.
 *
 * An admin owns nothing: they may only create a project on behalf of a creator, and
 * ownership goes to that creator. The rule therefore reads the caller's role first.
 * `creator_id` is optional for nobody: forbidden for a creator, required for an admin.
 *
 * An admin who sends no creator_id is refused rather than defaulted to themselves, since
 * defaulting is the one path that could quietly mint a project owned by an admin. The
 * "target is the admin" branch closes the other way round it, naming yourself.
 *
 * A creator who sends creator_id is refused rather than having it ignored. Ignoring it
 * silently is how somebody files a project under another name with nothing recording
 * that they tried.
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
    // teaching period, so one has to be open to file it into, and in the gap between two
    // the refusal names the date the next one starts.
    //
    // Projects have no campaign window of their own: a project's closing date is its
    // semester's end_date, and nothing writes projects.start_date or end_date.
    const semester = await semesterService.requireOpenSemester();
    const ownership = await resolveOwnership(userId, roles, data);

    const project = {
        creator_id: ownership.creator_id,
        // NULL for a creator's own project. Set only when an admin filed it, and it is
        // what stops that same admin approving it later.
        created_by_admin_id: ownership.created_by_admin_id,
        title: data.title,
        description: data.description,
        category: data.category,
        current_amount: 0,
        image_url: data.image_url,
        status: "PENDING",
        team_members: data.team_members || [],
        // Taken from the open semester, never from the request. Nobody chooses which
        // teaching period their project counts towards, for the same reason as creator_id.
        semester_id: semester.id,
        // The story, split the way ProjectDetail renders it. `description` stays the
        // short blurb used on the Discover cards and these three are the long form. All
        // optional: a project with none of them shows the blurb alone.
        challenge: data.challenge || null,
        solution: data.solution || null,
        funding_usage: data.funding_usage || null,
        gallery: Array.isArray(data.gallery) ? data.gallery : [],
        // [{ title, desc }], the highlights listed under "Our Solution".
        solution_bullets: Array.isArray(data.solution_bullets) ? data.solution_bullets : [],
        // A link to the pitch video, which the wizard requires.
        video_url: data.video_url || null
    };

    // Validated before opening the transaction, so a bad level costs nothing.
    const tiers = normaliseTierBatch(data.tiers);

    if (tiers.length === 0) {
        return await projectRepository.createProject(project);
    }

    // Project and levels in one transaction. Half-saved is the worst outcome: the wizard
    // latches on success and sends the creator away, so they would believe levels exist
    // with no way to notice they don't.
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
    const projects = await projectRepository.findAll();

    // The admin screens show a name and a role, never an address, so the email has no
    // reason to leave the server here either. findByCreatorId is the exception: it only
    // ever returns the caller their own projects, so that list is already theirs.
    return projects.map((project) => ({
        ...project,
        team_members: stripTeamEmails(project.team_members),
    }));
}

/**
 * Discover's catalogue, always scoped to one semester.
 *
 * `semester` is the raw ?semester= value, or null. Null means the semester Discover
 * opens on, which is the most recently started one rather than the open one: between two
 * teaching periods there is no open semester, and Discover still has to show the term
 * that just finished. Having no open semester blocks writing, never reading.
 *
 * An explicit id is looked up rather than trusted, so ?semester=abc and ?semester=99999
 * both answer 404 instead of reporting an empty term.
 */
async function getAllApprovedProjects({ semester = null, limit = null, offset = 0 } = {}) {

    const target =
        semester == null
            ? await semesterService.getBrowsableSemester()
            : await semesterService.requireSemester(semester);

    // No semester has started yet. Impossible with real data, but it should be an empty
    // catalogue rather than a 500 on the landing page.
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
// `viewer` is req.user: from authOptional on the public route, and the admin's own
// req.user on GET /admin/projects/:id. See assertVisibleTo for the rule.
async function getProjectById(id, viewer = null) {

    // The one read that wants my_contribution, which the detail page turns into "you
    // have supported this" in place of the invest button.
    const project = await loadVisibleProject(id, viewer, { withContribution: true });

    // The same shape of answer, for the same sidebar. A reader on the team can never
    // support this project, so the page has to say so instead of offering a button, and
    // it cannot work this out for itself once the emails are stripped below.
    //
    // A signed-out reader costs no query.
    const viewerIsTeamMember = viewer?.id
        ? await projectRepository.isTeamMemberByEmail(id, viewer.id)
        : false;

    return {
        ...project,
        // The creator gets their own list back untouched, because EditProject is where
        // they correct an address they mistyped. Nobody else has any use for it.
        team_members:
            viewer?.id === project.creator_id
                ? project.team_members
                : stripTeamEmails(project.team_members),
        viewer_is_team_member: viewerIsTeamMember,
    };
}

async function getMyProjects(userId) {

    return await projectRepository.findByCreatorId(userId);
}

// Backers of everything this creator owns. The creator id comes from the token rather
// than the URL, so there is nothing to check ownership against: a creator can only ask
// for their own.
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
        // 403, kept distinct from "no such project" and from a database failure.
        //
        // There is no admin branch: updateProject compares creator_id to req.user.id and
        // nothing else, so an admin editing somebody's project is refused like a
        // stranger.
        throw forbidden("Unauthorized");
    }

    assertNotArchived(project);
    // No edits once the semester has closed. This is also why resubmit is locked: a
    // creator who cannot edit has nothing to resubmit.
    assertSemesterOpen(project);

    const updatedProject = {
        title: data.title ?? project.title,
        description: data.description ?? project.description,
        category: data.category ?? project.category,
        image_url: data.image_url ?? project.image_url,
        team_members: data.team_members ?? project.team_members,
        challenge: data.challenge ?? project.challenge,
        solution: data.solution ?? project.solution,
        funding_usage: data.funding_usage ?? project.funding_usage,
        gallery: Array.isArray(data.gallery) ? data.gallery : project.gallery,
        solution_bullets: Array.isArray(data.solution_bullets)
            ? data.solution_bullets
            : project.solution_bullets,
        // Three cases rather than two: absent leaves the column alone, text is stored,
        // and empty stores NULL rather than "". createProject normalises the same way, so
        // one column never holds two different values meaning "no video".
        video_url:
            data.video_url === undefined
                ? project.video_url
                : (data.video_url || null)
    };

    return await projectRepository.updateProject(projectId, updatedProject);
}

// Archives a project instead of destroying it, so nothing leaves the database on a
// single click. A creator may archive their own project, an admin may archive any.
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

    // An admin archiving someone else's project locks the creator out of restoring it,
    // so the creator is owed the reason. Archiving your own needs no justification.
    if (isAdmin && !isOwner && !trimmedReason) {
        throw validationFailed("A reason is required when archiving another user's project.");
    }

    return await projectRepository.archiveProject(projectId, userId, trimmedReason);
}

// Restore. A creator may only undo an archive they performed themselves; if an admin
// archived the project, only an admin can bring it back, or the creator could reverse a
// moderation decision.
//
// archived_by is ON DELETE SET NULL, so once the archiver's account is gone the
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

    // archiveProject never touched `status`, so the project returns at the verdict it
    // already had: APPROVED goes back onto Discover, PENDING to the approval queue. No
    // re-approval, and no previous_status column to keep.
    return await projectRepository.restoreProject(projectId);
}

// Permanent delete, the second step of the bin rather than the first. Admin only, and
// only for a project that is already archived, so nothing is ever one click from gone.
//
// The cascade takes comments and project_updates with it, while
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
