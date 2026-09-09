const tierRepository = require("../repositories/tierRepository");
const projectRepository = require("../repositories/projectRepository");
const { notFound, forbidden, conflict, validationFailed } = require("../errors/AppError");
const { isAdminRole, assertNotArchived, assertSemesterOpen, loadVisibleProject } = require("./projectAccess");
const { MAX_CONTRIBUTION } = require("../validation/schemas/projectSchemas");
const M = require("../validation/messages");

const MAX_TIERS = 5;

// One rule set, used by create and update alike so the two cannot drift apart. The
// frontend runs the same checks in src/components/project/tierRules.js, so a creator
// learns the rules from the form rather than from a refusal; this side is the boundary.
function normaliseTier(input = {}) {

    const name = String(input.name ?? "").trim();

    // The forms send the amount as a string, while the API may get a number.
    const minAmount = Number(input.min_amount ?? input.minAmount);

    const bullets = (Array.isArray(input.bullets) ? input.bullets : [])
        .map(line => String(line ?? "").trim())
        .filter(Boolean);

    return { name, min_amount: minAmount, bullets };
}

// The checks that need nothing but the level itself.
function assertTierFields(tier) {

    if (!tier.name) {
        throw validationFailed("A level needs a name.");
    }

    if (tier.name.length > 100) {
        throw validationFailed("A level name must be 100 characters or fewer.");
    }

    if (!Number.isInteger(tier.min_amount) || tier.min_amount <= 0) {
        // Worded to match tierRules.js on the frontend. Both enforce the same check, so
        // a creator refused by either should read the same sentence rather than wonder
        // whether they hit a second, stricter rule.
        throw validationFailed("A level needs a minimum above 0 CC — a whole number of Class Coins.");
    }

    // A level above the contribution cap could never be chosen, since a person gets one
    // contribution of at most MAX_CONTRIBUTION CC. Allowing it would put a button on the
    // project page that leads nowhere.
    if (tier.min_amount > MAX_CONTRIBUTION) {
        throw validationFailed(M.TIER_ABOVE_CAP);
    }

    if (tier.bullets.length === 0) {
        throw validationFailed("Add at least one line describing what this level signals.");
    }
}

// The field checks plus the one rule that needs the database: no two active levels of a
// project may start at the same amount. Used by the add and edit routes, where the
// project already exists.
async function assertTierIsValid(projectId, tier, { excludeTierId = null } = {}) {

    assertTierFields(tier);

    // Active levels only. A hidden one keeps its amount, and treating that as taken
    // would make hiding a level a permanent reservation of the number.
    const clash = await tierRepository.existsWithMinAmount(
        projectId,
        tier.min_amount,
        excludeTierId
    );

    if (clash) {
        throw conflict(`Another level already starts at ${tier.min_amount} CC.`);
    }
}

// The batch the create wizard submits, validated before the project row exists.
//
// The duplicate check compares the submitted levels against each other rather than
// against the database: inside createProject's transaction the new rows are invisible to
// a second connection, so a lookup would see nothing and wave duplicates through. A new
// project has no other levels to clash with anyway.
function normaliseTierBatch(rawTiers) {

    const tiers = (Array.isArray(rawTiers) ? rawTiers : []).map(normaliseTier);

    if (tiers.length > MAX_TIERS) {
        throw conflict(`A project can have at most ${MAX_TIERS} support levels.`);
    }

    const seen = new Set();

    for (const tier of tiers) {

        assertTierFields(tier);

        if (seen.has(tier.min_amount)) {
            throw conflict(`Another level already starts at ${tier.min_amount} CC.`);
        }

        seen.add(tier.min_amount);
    }

    return tiers;
}

// Who may add, edit or hide a level. Support levels are project content, so this follows
// updateProject's rule rather than createProjectUpdate's:
//   - ownership, or admin, checked here rather than by an authorize() on the route, since
//     the id is in the path and only the service knows who owns it;
//   - an archived project is frozen, exactly as editing it is;
//   - a REJECTED project is not blocked: it stays editable so the creator can revise and
//     resubmit, and the levels are part of what they revise. Project updates are blocked
//     when rejected because an update is a public post, which a level is not.
async function loadProjectForTierWrite(projectId, userId, roles) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    // Only the creator. A level is the project's own content, and an admin who filed the
    // project on somebody's behalf has already done their part: they set the levels in
    // the wizard, which goes through createProject rather than through here.
    if (Number(project.creator_id) !== Number(userId)) {
        throw forbidden("Only the project's creator can change its support levels.");
    }

    assertNotArchived(project);
    // Covers create, update and delete, since all three come through here. Hiding a
    // level is an edit of the project rather than the removal of somebody's abusive
    // text, which is why this is gated where deleteComment is not.
    assertSemesterOpen(project);

    return project;
}

// Public read, the same shape as comments and updates. Hiding an unapproved project
// while leaving its support levels readable one URL over would hide nothing.
async function getProjectTiers(projectId, viewer = null) {

    await loadVisibleProject(projectId, viewer);

    return await tierRepository.findByProjectId(projectId);
}

async function createTier(projectId, userId, roles, data) {

    await loadProjectForTierWrite(projectId, userId, roles);

    const active = await tierRepository.countActiveByProjectId(projectId);

    if (active >= MAX_TIERS) {
        throw conflict(`A project can have at most ${MAX_TIERS} support levels.`);
    }

    const tier = normaliseTier(data);

    await assertTierIsValid(projectId, tier);

    return await tierRepository.create({ project_id: projectId, ...tier });
}

async function updateTier(projectId, tierId, userId, roles, data) {

    await loadProjectForTierWrite(projectId, userId, roles);

    // Scoped to the project in the path, so a level id from another project cannot be
    // edited by putting it in this URL.
    const existing = await tierRepository.findForProject(tierId, projectId);

    if (!existing) {
        throw notFound("Support level not found");
    }

    const tier = normaliseTier(data);

    await assertTierIsValid(projectId, tier, { excludeTierId: existing.id });

    // Raising min_amount leaves history alone: an investment already carries its
    // tier_id, so what somebody signalled last week is not rewritten.
    return await tierRepository.update(existing.id, tier);
}

// Delete means delete only while nobody has chosen the level. Once somebody has, the row
// has to survive because their investment points at it, so it is hidden instead and the
// caller is told which happened.
async function deleteTier(projectId, tierId, userId, roles) {

    await loadProjectForTierWrite(projectId, userId, roles);

    const existing = await tierRepository.findForProject(tierId, projectId);

    if (!existing) {
        throw notFound("Support level not found");
    }

    if (await tierRepository.hasTransactions(existing.id)) {
        await tierRepository.deactivate(existing.id);
        return { hidden: true };
    }

    await tierRepository.remove(existing.id);
    return { hidden: false };
}

module.exports = {
    MAX_TIERS,
    normaliseTier,
    normaliseTierBatch,
    getProjectTiers,
    createTier,
    updateTier,
    deleteTier,
};
