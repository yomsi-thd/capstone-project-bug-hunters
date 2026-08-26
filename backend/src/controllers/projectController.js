const projectService = require("../services/projectService");
const asyncHandler = require("../http/asyncHandler");

/**
 * Not one try/catch in this file, where there used to be twenty-four.
 *
 * Fourteen of them mapped every possible failure to 400, which is the defect the whole
 * restructure starts from: in updateProject, "there is no such project", "that project
 * is not yours" and "the database is down" all came back identical, so no client could
 * tell a user's mistake from an outage, and neither could whoever was running the demo.
 *
 * Every status is now decided by the line in projectService that throws, and written by
 * errorHandler. Two of these handlers already worked that way — approveProject and
 * rejectProject read `error.status` — and this is that idea applied everywhere.
 */

// ─── Project lifecycle ──────────────────────────────────────────────────────────

const createProject = asyncHandler(async (req, res) => {
    // (id, roles, body): the service needs the roles because an ADMIN caller must name
    // the creator the project belongs to, while a CREATOR caller must not.
    const project = await projectService.createProject(req.user.id, req.user.roles, req.body);

    res.status(201).json({ message: "Project created successfully", project });
});

const getAllApprovedProjects = asyncHandler(async (req, res) => {
    const projects = await projectService.getAllApprovedProjects();

    res.status(200).json(projects);
});

const getProjectById = asyncHandler(async (req, res) => {
    // req.user comes from authOptional: the real user when a token was sent, and null
    // for a signed-out visitor. The service uses it to decide whether an unapproved
    // project is visible, and answers 404 either way when it is not - saying 403 would
    // already confirm that a PENDING project exists.
    const project = await projectService.getProjectById(req.params.id, req.user);

    res.status(200).json(project);
});

const getMyProjects = asyncHandler(async (req, res) => {
    const projects = await projectService.getMyProjects(req.user.id);

    res.status(200).json(projects);
});

// Everyone who has backed a project this user owns.
const getMyBackers = asyncHandler(async (req, res) => {
    const backers = await projectService.getMyBackers(req.user.id);

    res.status(200).json(backers);
});

const updateProject = asyncHandler(async (req, res) => {
    const project = await projectService.updateProject(req.params.id, req.user.id, req.body);

    res.status(200).json({ message: "Project updated successfully", project });
});

// Archive - the everyday "remove it" action. Soft, reversible.
const archiveProject = asyncHandler(async (req, res) => {
    const project = await projectService.archiveProject(
        req.params.id,
        req.user.id,
        req.user.roles,
        req.body.reason
    );

    res.status(200).json({ message: "Project archived successfully", project });
});

// Restore - brings it back at the status it already had, with no re-approval.
const restoreProject = asyncHandler(async (req, res) => {
    const project = await projectService.restoreProject(req.params.id, req.user.id, req.user.roles);

    res.status(200).json({ message: "Project restored successfully", project });
});

// PERMANENT. Admin only, and only for an already-archived project; both rules are in
// the service.
const deleteProject = asyncHandler(async (req, res) => {
    await projectService.deleteProject(req.params.id, req.user.id, req.user.roles);

    res.status(200).json({ message: "Project deleted permanently" });
});

// ─── Moderation ─────────────────────────────────────────────────────────────────

const approveProject = asyncHandler(async (req, res) => {
    // req.user.id is who is reviewing. The service refuses when it is the same admin who
    // filed the project on the creator's behalf.
    const project = await projectService.approveProject(req.params.id, req.user.id);

    res.json(project);
});

const rejectProject = asyncHandler(async (req, res) => {
    // `note` is the reviewer's explanation, shown to the creator on their project card.
    const project = await projectService.rejectProject(req.params.id, req.body?.note, req.user.id);

    res.json(project);
});

// The creator's route back into the queue after revising a rejected project.
const resubmitProject = asyncHandler(async (req, res) => {
    const project = await projectService.resubmitProject(req.params.id, req.user.id, req.user.roles);

    res.status(200).json({ message: "Project resubmitted for review", project });
});

const endorseProject = asyncHandler(async (req, res) => {
    const project = await projectService.setProjectEndorsed(req.params.id, req.body.endorsed);

    res.status(200).json(project);
});

// ─── Comments ───────────────────────────────────────────────────────────────────

const getProjectComments = asyncHandler(async (req, res) => {
    const comments = await projectService.getProjectComments(req.params.id, req.user);

    res.status(200).json(comments);
});

const createComment = asyncHandler(async (req, res) => {
    const comment = await projectService.createComment(req.user.id, req.params.id, req.body);

    res.status(201).json({ message: "Comment posted successfully", comment });
});

const deleteComment = asyncHandler(async (req, res) => {
    await projectService.deleteComment(req.user.id, req.user.roles, req.params.commentId);

    res.status(200).json({ message: "Comment deleted successfully" });
});

// ─── Project updates ────────────────────────────────────────────────────────────

const getProjectUpdates = asyncHandler(async (req, res) => {
    const updates = await projectService.getProjectUpdates(req.params.id, req.user);

    res.status(200).json(updates);
});

const createProjectUpdate = asyncHandler(async (req, res) => {
    const update = await projectService.createProjectUpdate(
        req.user.id,
        req.user.roles,
        req.params.id,
        req.body
    );

    res.status(201).json({ message: "Update posted successfully", update });
});

const deleteProjectUpdate = asyncHandler(async (req, res) => {
    await projectService.deleteProjectUpdate(req.user.id, req.user.roles, req.params.updateId);

    res.status(200).json({ message: "Update deleted successfully" });
});

// ─── Support levels (project_tiers) ─────────────────────────────────────────────

const getProjectTiers = asyncHandler(async (req, res) => {
    const tiers = await projectService.getProjectTiers(req.params.id, req.user);

    res.status(200).json(tiers);
});

const createTier = asyncHandler(async (req, res) => {
    const tier = await projectService.createTier(
        req.params.id,
        req.user.id,
        req.user.roles,
        req.body
    );

    res.status(201).json({ message: "Support level added", tier });
});

const updateTier = asyncHandler(async (req, res) => {
    const tier = await projectService.updateTier(
        req.params.id,
        req.params.tierId,
        req.user.id,
        req.user.roles,
        req.body
    );

    res.status(200).json({ message: "Support level updated", tier });
});

const deleteTier = asyncHandler(async (req, res) => {
    // `hidden` tells the UI which of the two things happened: a level nobody chose is
    // really gone, one somebody chose is only hidden so their history still points at a
    // row that exists.
    const result = await projectService.deleteTier(
        req.params.id,
        req.params.tierId,
        req.user.id,
        req.user.roles
    );

    res.status(200).json({
        message: result.hidden
            ? "Hidden. Backers who chose it keep their history."
            : "Support level deleted",
        hidden: result.hidden,
    });
});

// ─── Investing ──────────────────────────────────────────────────────────────────

const investProject = asyncHandler(async (req, res) => {
    // tierId is optional - "No level, just support" sends none, and that is a
    // first-class choice rather than a fallback.
    const { amount, tierId } = req.body;

    const result = await projectService.investProject(
        req.user.id,
        req.params.id,
        amount,
        tierId ?? null
    );

    res.status(200).json(result);
});

module.exports = {
    createProject,
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
    endorseProject,
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
};
