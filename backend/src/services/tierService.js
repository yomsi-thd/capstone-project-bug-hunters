const tierRepository = require("../repositories/tierRepository");
const projectRepository = require("../repositories/projectRepository");
const { notFound, forbidden, conflict, validationFailed } = require("../errors/AppError");
const { isAdminRole, assertNotArchived, assertSemesterOpen, loadVisibleProject } = require("./projectAccess");

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
        throw validationFailed("A level needs a name.");
    }

    if (tier.name.length > 100) {
        throw validationFailed("A level name must be 100 characters or fewer.");
    }

    if (!Number.isInteger(tier.min_amount) || tier.min_amount <= 0) {
        // Worded identically to tierRules.js on the frontend. The two enforce the same
        // check (Number.isInteger && > 0), so they must not describe it differently —
        // a creator who gets past one and is refused by the other should read the same
        // sentence, not wonder whether they hit a second, stricter rule.
        throw validationFailed("A level needs a minimum above 0 CC — a whole number of Class Coins.");
    }

    if (tier.bullets.length === 0) {
        throw validationFailed("Add at least one line describing what this level signals.");
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
        throw conflict(`Another level already starts at ${tier.min_amount} CC.`);
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
        throw notFound("Project not found");
    }

    if (Number(project.creator_id) !== Number(userId) && !isAdminRole(roles)) {
        throw forbidden("Only the project's creator can change its support levels.");
    }

    assertNotArchived(project);
    // Covers create, update AND delete, because all three come through here. Hiding a
    // level is an EDIT of the project, not the removal of somebody's abusive text -
    // which is why this one is gated where deleteComment is not.
    assertSemesterOpen(project);

    return project;
}

// Public read, same shape as getProjectComments / getProjectUpdates. Hiding an
// unapproved project while leaving its support levels readable one URL over would
// not hide anything.
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

    // Scoped to the project from the path, so a level id from another project cannot
    // be edited by putting it in this URL.
    const existing = await tierRepository.findForProject(tierId, projectId);

    if (!existing) {
        throw notFound("Support level not found");
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
