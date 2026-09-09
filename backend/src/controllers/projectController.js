const projectService = require("../services/projectService");
const moderationService = require("../services/moderationService");
const asyncHandler = require("../http/asyncHandler");
const { page, pagination } = require("../http/envelope");

/**
 * The project's own lifecycle. Comments, updates, support levels and investments have
 * controllers of their own; the routes are unchanged, so /api/projects/:id/comments
 * answers exactly as before.
 *
 * There is no try/catch in this file. Every status is decided by the line in
 * projectService that throws and written by errorHandler, so "there is no such project",
 * "that project is not yours" and "the database is down" reach the client as three
 * different answers rather than one 400.
 */

// Project lifecycle.

const createProject = asyncHandler(async (req, res) => {
    // The service needs the roles: an admin caller has to name the creator the project
    // belongs to, and a creator caller must not.
    const project = await projectService.createProject(req.user.id, req.user.roles, req.body);

    res.status(201).json({ message: "Project created successfully", project });
});

// One of the two endpoints that accept ?limit= and ?offset=. Without them it returns the
// whole catalogue, which is what Discover depends on.
const getAllApprovedProjects = asyncHandler(async (req, res) => {
    const { limit, offset } = pagination(req);

    // ?semester=<id> comes from Discover's picker. Read off req.query rather than
    // through the pagination schema: it is not a paging parameter, and zod would answer
    // 422 for a bad value where every other id in this API answers 404.
    const { items, total } = await projectService.getAllApprovedProjects({
        semester: req.query.semester ?? null,
        limit,
        offset,
    });

    res.status(200).json(page(items, { total, limit, offset }));
});

const getProjectById = asyncHandler(async (req, res) => {
    // req.user comes from authOptional: the real user when a token was sent, null
    // otherwise. The service uses it to decide whether an unapproved project is visible,
    // and answers 404 when it is not, since a 403 would confirm the project exists.
    const project = await projectService.getProjectById(req.params.id, req.user);

    res.status(200).json(project);
});

const getMyProjects = asyncHandler(async (req, res) => {
    const projects = await projectService.getMyProjects(req.user.id);

    res.status(200).json(page(projects));
});

// Everyone who has backed a project this user owns.
const getMyBackers = asyncHandler(async (req, res) => {
    const backers = await projectService.getMyBackers(req.user.id);

    res.status(200).json(page(backers));
});

const updateProject = asyncHandler(async (req, res) => {
    const project = await projectService.updateProject(req.params.id, req.user.id, req.body);

    res.status(200).json({ message: "Project updated successfully", project });
});

// Archive: the everyday "remove it" action, soft and reversible.
const archiveProject = asyncHandler(async (req, res) => {
    const project = await projectService.archiveProject(
        req.params.id,
        req.user.id,
        req.user.roles,
        req.body.reason
    );

    res.status(200).json({ message: "Project archived successfully", project });
});

// Restore: brings it back at the status it already had, with no re-approval.
const restoreProject = asyncHandler(async (req, res) => {
    const project = await projectService.restoreProject(req.params.id, req.user.id, req.user.roles);

    res.status(200).json({ message: "Project restored successfully", project });
});

// Permanent. Admin only, and only for an already-archived project; both rules live in
// the service.
const deleteProject = asyncHandler(async (req, res) => {
    await projectService.deleteProject(req.params.id, req.user.id, req.user.roles);

    res.status(200).json({ message: "Project deleted permanently" });
});

// Moderation.

const approveProject = asyncHandler(async (req, res) => {
    // req.user.id is who is reviewing. The service refuses when that is the same admin
    // who filed the project on the creator's behalf.
    const project = await moderationService.approveProject(req.params.id, req.user.id);

    res.json(project);
});

const rejectProject = asyncHandler(async (req, res) => {
    // `note` is the reviewer's explanation, shown to the creator on their project card.
    const project = await moderationService.rejectProject(req.params.id, req.body?.note, req.user.id);

    res.json(project);
});

// The creator's route back into the queue after revising a rejected project.
const resubmitProject = asyncHandler(async (req, res) => {
    const project = await moderationService.resubmitProject(req.params.id, req.user.id, req.user.roles);

    res.status(200).json({ message: "Project resubmitted for review", project });
});

const endorseProject = asyncHandler(async (req, res) => {
    const project = await moderationService.setProjectEndorsed(req.params.id, req.body.endorsed);

    res.status(200).json(project);
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
};
