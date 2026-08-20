const pool = require("../config/db");
const projectRepository = require("../repositories/projectRepository");
const projectUpdateRepository = require("../repositories/projectUpdateRepository");
const commentRepository = require("../repositories/commentRepository");
const classCoinRepository = require("../repositories/classCoinRepository");
const tierRepository = require("../repositories/tierRepository");

// projects.start_date / end_date have always existed but createProject never wrote
// them, so every project came back with both null -> ProjectDetail showed "—" for
// "days to go" and AdminApprovals showed "Not set" for duration.
// The create form has no duration field yet, so a campaign window is assumed here.
// Change this constant (or send start_date / end_date in the request body) to adjust.
const DEFAULT_CAMPAIGN_DAYS = 30;

function resolveCampaignDates(data) {

    const start = data.start_date ? new Date(data.start_date) : new Date();

    if (Number.isNaN(start.getTime())) {
        throw new Error("start_date is not a valid date.");
    }

    const end = data.end_date
        ? new Date(data.end_date)
        : new Date(start.getTime() + DEFAULT_CAMPAIGN_DAYS * 24 * 60 * 60 * 1000);

    if (Number.isNaN(end.getTime())) {
        throw new Error("end_date is not a valid date.");
    }

    if (end <= start) {
        throw new Error("end_date must be after start_date.");
    }

    return { start, end };
}

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
        throw new Error("This project is archived. Restore it first.");
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
        throw new Error("Project not found");
    }
}

// ─── Support levels (project_tiers) ─────────────────────────────────────────────
//
// A support level is a MINIMUM contribution plus the lines that say what choosing it
// signals. Nobody is owed anything — the creator does not receive Class Coins and the
// platform never promises delivery — so there is no quantity, no delivery date and no
// "fulfilled" state to track. What the numbers answer is "which level attracts people".

const MAX_TIERS = 5;

// One rule set, used by create and update alike, so the two can never drift apart.
// The frontend runs the same checks in src/components/project/tierRules.js; that copy
// exists so a creator does not learn the rules by being refused by the API, not because
// this one is optional. UI is not a security boundary.
function normaliseTier(input = {}) {

    const name = String(input.name ?? "").trim();

    // The forms send the amount as a string ("250"), the API may get a number.
    const minAmount = Number(input.min_amount ?? input.minAmount);

    const bullets = (Array.isArray(input.bullets) ? input.bullets : [])
        .map(line => String(line ?? "").trim())
        .filter(Boolean);

    return { name, min_amount: minAmount, bullets };
}

// The checks that need nothing but the level itself.
function assertTierFields(tier) {

    if (!tier.name) {
        throw new Error("A level needs a name.");
    }

    if (tier.name.length > 100) {
        throw new Error("A level name must be 100 characters or fewer.");
    }

    if (!Number.isInteger(tier.min_amount) || tier.min_amount <= 0) {
        throw new Error("A level needs a minimum above 0 CC.");
    }

    if (tier.bullets.length === 0) {
        throw new Error("Add at least one line describing what this level signals.");
    }
}

// Fields plus the one rule that needs the database: no two ACTIVE levels of the same
// project may start at the same amount. Used by the add/edit routes, where the project
// already exists and already has levels.
async function assertTierIsValid(projectId, tier, { excludeTierId = null } = {}) {

    assertTierFields(tier);

    // Only ACTIVE levels count — a hidden one keeps its amount, and treating that as
    // taken forever would make hiding a level a permanent reservation of the number.
    const clash = await tierRepository.existsWithMinAmount(
        projectId,
        tier.min_amount,
        excludeTierId
    );

    if (clash) {
        throw new Error(`Another level already starts at ${tier.min_amount} CC.`);
    }
}

// The batch the create wizard submits, validated BEFORE the project row exists.
//
// The duplicate check here compares the submitted levels against each other rather than
// against the database on purpose: inside createProject's transaction the new project's
// rows are not visible to a second connection, so a DB lookup would see nothing and
// wave duplicates through. A brand-new project has no other levels to clash with anyway.
function normaliseTierBatch(rawTiers) {

    const tiers = (Array.isArray(rawTiers) ? rawTiers : []).map(normaliseTier);

    if (tiers.length > MAX_TIERS) {
        throw new Error(`A project can have at most ${MAX_TIERS} support levels.`);
    }

    const seen = new Set();

    for (const tier of tiers) {

        assertTierFields(tier);

        if (seen.has(tier.min_amount)) {
            throw new Error(`Another level already starts at ${tier.min_amount} CC.`);
        }

        seen.add(tier.min_amount);
    }

    return tiers;
}

// Who may add, edit or hide a level. Support levels are project CONTENT, so this
// follows updateProject's rule rather than createProjectUpdate's:
//   * ownership (or admin), checked here rather than by an authorize() on the route —
//     the id is in the path and only the service knows who owns it;
//   * an archived project is frozen, exactly like editing it is;
//   * a REJECTED project is NOT blocked. It stays editable so the creator can revise
//     and resubmit, and the levels are part of what they revise. (Project updates are
//     blocked when rejected because an update is a public post; a level is not.)
async function loadProjectForTierWrite(projectId, userId, roles) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    if (Number(project.creator_id) !== Number(userId) && !isAdminRole(roles)) {
        throw new Error("Only the project's creator can change its support levels.");
    }

    assertNotArchived(project);

    return project;
}

// Public read, same shape as getProjectComments / getProjectUpdates. Hiding an
// unapproved project while leaving its support levels readable one URL over would
// not hide anything.
async function getProjectTiers(projectId, viewer = null) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    assertVisibleTo(project, viewer);

    return await tierRepository.findByProjectId(projectId);
}

async function createTier(projectId, userId, roles, data) {

    await loadProjectForTierWrite(projectId, userId, roles);

    const active = await tierRepository.countActiveByProjectId(projectId);

    if (active >= MAX_TIERS) {
        throw new Error(`A project can have at most ${MAX_TIERS} support levels.`);
    }

    const tier = normaliseTier(data);

    await assertTierIsValid(projectId, tier);

    return await tierRepository.create({ project_id: projectId, ...tier });
}

async function updateTier(projectId, tierId, userId, roles, data) {

    await loadProjectForTierWrite(projectId, userId, roles);

    // Scoped to the project from the path, so a level id from another project cannot
    // be edited by putting it in this URL.
    const existing = await tierRepository.findForProject(tierId, projectId);

    if (!existing) {
        throw new Error("Support level not found");
    }

    const tier = normaliseTier(data);

    await assertTierIsValid(projectId, tier, { excludeTierId: existing.id });

    // Raising min_amount deliberately leaves history alone: an investment already
    // carries its tier_id, so what somebody signalled last week is not rewritten.
    return await tierRepository.update(existing.id, tier);
}

// Delete means delete only while nobody has chosen the level. Once somebody has, the
// row has to survive — their investment points at it — so it is hidden instead and the
// caller is told which of the two happened.
async function deleteTier(projectId, tierId, userId, roles) {

    await loadProjectForTierWrite(projectId, userId, roles);

    const existing = await tierRepository.findForProject(tierId, projectId);

    if (!existing) {
        throw new Error("Support level not found");
    }

    if (await tierRepository.hasTransactions(existing.id)) {
        await tierRepository.deactivate(existing.id);
        return { hidden: true };
    }

    await tierRepository.remove(existing.id);
    return { hidden: false };
}

// Create project
async function createProject(userId, data) {

    const { start, end } = resolveCampaignDates(data);

    const project = {
        creator_id: userId,
        title: data.title,
        description: data.description,
        category: data.category,
        goal_amount: data.goal_amount,
        current_amount: 0,
        image_url: data.image_url,
        status: "PENDING",
        team_members: data.team_members || [],
        start_date: start,
        end_date: end,
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

    // Project + levels are one transaction, same shape as investProject. Half-saved is
    // the worst outcome here: the wizard latches submitLockRef on success and sends the
    // creator away, so they would believe the levels exist with no way to notice they
    // do not.
    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const createdProject =
            await projectRepository.createProject(project, client);

        for (const tier of tiers) {
            await tierRepository.create(
                { project_id: createdProject.id, ...tier },
                client
            );
        }

        await client.query("COMMIT");

        return createdProject;

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();

    }
}

// Get all projects
async function getAllProjects() {
    return await projectRepository.findAll();
}

async function getAllApprovedProjects() {
    return await projectRepository.findAllApprovedProjects();
}

// Get project by ID
// `viewer` is req.user — from authOptional on the public route, and the admin's own
// req.user on GET /admin/projects/:id. See assertVisibleTo for the rule.
async function getProjectById(id, viewer = null) {

    const project = await projectRepository.findById(id);

    if (!project) {
        throw new Error("Project not found");
    }

    assertVisibleTo(project, viewer);

    return project;
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
        throw new Error("Project not found");
    }

    if (project.creator_id !== userId) {
        throw new Error("Unauthorized");
    }

    assertNotArchived(project);

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
        throw new Error("Project not found");
    }

    if (project.archived_at) {
        throw new Error("This project is already archived.");
    }

    const isAdmin = isAdminRole(roles);
    const isOwner = project.creator_id === userId;

    if (!isOwner && !isAdmin) {
        throw new Error("Unauthorized");
    }

    const trimmedReason = (reason || "").trim();

    // An admin archiving someone else's project locks the creator out of restoring it
    // (see restoreProject), so the creator is at least owed the reason. Archiving your
    // own project needs no justification.
    if (isAdmin && !isOwner && !trimmedReason) {
        throw new Error("A reason is required when archiving another user's project.");
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
        throw new Error("Project not found");
    }

    if (!project.archived_at) {
        throw new Error("This project is not archived.");
    }

    const isAdmin = isAdminRole(roles);
    const archivedBySelf = project.archived_by === userId;
    const isOwner = project.creator_id === userId;

    if (!isAdmin && !(isOwner && archivedBySelf)) {
        throw new Error(
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
        throw new Error("Project not found");
    }

    if (!isAdminRole(roles)) {
        throw new Error("Unauthorized");
    }

    if (!project.archived_at) {
        throw new Error("Only an archived project can be permanently deleted. Archive it first.");
    }

    await projectRepository.deleteProject(projectId);
}

// The approval queue already filters archived projects out, so this guard covers the
// stale-tab case: an admin left the queue open, someone archived a project meanwhile,
// and the verdict would otherwise land silently on a project nobody can see.
async function approveProject(id) {

    const existing = await projectRepository.findById(id);

    if (!existing) {
        throw new Error("Project not found");
    }

    assertNotArchived(existing);

    return await projectRepository.approveProject(id);
}

async function rejectProject(id, note) {

    const existing = await projectRepository.findById(id);

    if (!existing) {
        throw new Error("Project not found");
    }

    assertNotArchived(existing);

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
        throw new Error("Project not found");
    }

    assertNotArchived(project);

    const isAdmin = isAdminRole(roles);

    if (project.creator_id !== userId && !isAdmin) {
        throw new Error("Only the project's creator can resubmit it.");
    }

    // Only from REJECTED. Allowing it from PENDING would let someone bump their own
    // project around the queue, and from APPROVED it would take a live project off
    // Discover by accident.
    if (project.status !== "REJECTED") {
        throw new Error("Only a rejected project can be resubmitted for review.");
    }

    return await projectRepository.resubmitProject(projectId);
}

async function setProjectEndorsed(id, endorsed) {

    const project = await projectRepository.setEndorsed(id, Boolean(endorsed));

    if (!project) {
        throw new Error("Project not found");
    }

    return project;
}

// Comments are public to read and open to any signed-in user to write.
async function getProjectComments(projectId, viewer = null) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    // Hiding the project but not its discussion would leave the same content readable
    // one URL over.
    assertVisibleTo(project, viewer);

    return await commentRepository.findByProjectId(projectId);
}

async function createComment(userId, projectId, data) {

    const body = (data.body || "").trim();

    if (!body) {
        throw new Error("A comment cannot be empty.");
    }

    if (body.length > 2000) {
        throw new Error("A comment must be 2000 characters or fewer.");
    }

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    assertNotArchived(project);

    let parentId = null;

    if (data.parent_id) {
        const parent = await commentRepository.findById(data.parent_id);

        if (!parent || Number(parent.project_id) !== Number(projectId)) {
            throw new Error("The comment being replied to does not belong to this project.");
        }

        // The UI only draws one level of nesting, so a reply to a reply is attached to
        // the top-level comment instead of creating a thread nobody can see.
        parentId = parent.parent_id ?? parent.id;
    }

    return await commentRepository.create({
        project_id: projectId,
        user_id: userId,
        parent_id: parentId,
        body
    });
}

async function deleteComment(userId, roles, commentId) {

    const comment = await commentRepository.findById(commentId);

    if (!comment) {
        throw new Error("Comment not found");
    }

    const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

    if (comment.user_id !== userId && !isAdmin) {
        throw new Error("You can only delete your own comment.");
    }

    return await commentRepository.remove(commentId);
}

// Anyone can read a project's updates — they are published on the public project page.
async function getProjectUpdates(projectId, viewer = null) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    // Same reason as the comments above: the updates are the project's content.
    assertVisibleTo(project, viewer);

    return await projectUpdateRepository.findByProjectId(projectId);
}

// Only the creator of the project may post an update about it. An ADMIN is allowed too,
// consistent with the rest of the app treating admin as a superuser.
async function createProjectUpdate(userId, roles, projectId, data) {

    const title = (data.title || "").trim();
    const body = (data.body || "").trim();

    if (!title) {
        throw new Error("An update needs a title.");
    }

    if (!body) {
        throw new Error("An update needs some content.");
    }

    if (title.length > 200) {
        throw new Error("The title must be 200 characters or fewer.");
    }

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    const isAdmin = isAdminRole(roles);

    if (project.creator_id !== userId && !isAdmin) {
        throw new Error("Only the project's creator can post an update.");
    }

    assertNotArchived(project);

    // A project update is a public announcement on the project page. A rejected project
    // is not on Discover and has no backers, so the post would go nowhere — and worse,
    // GET /projects/:id/updates is public, so if the project is later approved that
    // update surfaces with a timestamp from a period nobody could see it.
    if (project.status === "REJECTED") {
        throw new Error("This project was not approved, so it cannot post updates. Revise it and resubmit for review.");
    }

    return await projectUpdateRepository.create({
        project_id: projectId,
        author_id: userId,
        title,
        body
    });
}

async function deleteProjectUpdate(userId, roles, updateId) {

    const update = await projectUpdateRepository.findById(updateId);

    if (!update) {
        throw new Error("Update not found");
    }

    const project = await projectRepository.findById(update.project_id);
    const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

    if (project?.creator_id !== userId && !isAdmin) {
        throw new Error("Only the project's creator can delete an update.");
    }

    return await projectUpdateRepository.remove(updateId);
}

// `tierId` is the support level the backer picked, and it is OPTIONAL — the modal
// offers "No level — just support" and that is a first-class choice, not a fallback.
async function investProject(userId, projectId, amount, tierId = null) {

    if (!amount || amount <= 0) {
        throw new Error("Investment amount must be greater than 0.");
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        // Get project inside transaction
        const project = await projectRepository.findById(projectId, client);

        if (!project) {
            throw new Error("Project not found.");
        }

        if (project.status !== "APPROVED") {
            throw new Error("Only approved projects can receive investments.");
        }

        // Checked inside the transaction alongside the status, so an archive landing
        // mid-flight rolls the investment back rather than funding a hidden project.
        if (project.archived_at) {
            throw new Error("This project has been archived and is no longer accepting investments.");
        }

        // Resolved INSIDE the transaction, for the same reason archived_at is: the
        // creator can hide a level or raise its minimum while this investment is in
        // flight, and the right answer then is to roll back rather than to record a
        // tier_id that no longer means what the backer was shown.
        let tier = null;

        if (tierId) {

            // Scoped to this project, so a level id belonging to another project cannot
            // be attached to this investment by editing the request body.
            tier = await tierRepository.findForProject(tierId, projectId, client);

            if (!tier || !tier.is_active) {
                throw new Error("That support level is no longer available.");
            }

            if (amount < tier.min_amount) {
                throw new Error(`This level needs at least ${tier.min_amount} CC.`);
            }
        }

        // Atomically deduct balance
        const wallet = await classCoinRepository.deductBalance(
            userId,
            amount,
            client
        );

        if (!wallet) {
            throw new Error("Insufficient ClassCoins.");
        }

        // Increase project funding
        await projectRepository.increaseCurrentAmount(
            projectId,
            amount,
            client
        );

        // Save transaction
        const transaction = await classCoinRepository.createTransaction(
            {
                classcoin_id: wallet.id,
                project_id: projectId,
                type: "INVEST",
                amount,
                description: `Invested in project #${projectId}`,
                tier_id: tier ? tier.id : null
            },
            client
        );

        await client.query("COMMIT");

        return {
            message: "Investment successful.",
            transaction
        };

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();

    }

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
    approveProject,
    rejectProject,
    resubmitProject,
    setProjectEndorsed,
    getProjectComments,
    createComment,
    deleteComment,
    getProjectUpdates,
    createProjectUpdate,
    deleteProjectUpdate,
    investProject,
    getProjectTiers,
    createTier,
    updateTier,
    deleteTier,
    MAX_TIERS
};