const projectUpdateRepository = require("../repositories/projectUpdateRepository");
const projectRepository = require("../repositories/projectRepository");
const { notFound, forbidden, conflict, validationFailed } = require("../errors/AppError");
const { isAdminRole, assertNotArchived, assertSemesterOpen, loadVisibleProject } = require("./projectAccess");
const M = require("../validation/messages");

// Anyone can read a project's updates: they are published on the public project page.
async function getProjectUpdates(projectId, viewer = null) {

    // Same reason as comments: updates are the project's content.
    await loadVisibleProject(projectId, viewer);

    return await projectUpdateRepository.findByProjectId(projectId);
}

// Only the project's creator may post an update about it. An admin is allowed too, not as
// a superuser but because an admin moderates and may have filed the project on the
// creator's behalf.
async function createProjectUpdate(userId, roles, projectId, data) {

    const title = (data.title || "").trim();
    const body = (data.body || "").trim();

    if (!title) {
        throw validationFailed(M.UPDATE_TITLE_REQUIRED);
    }

    if (!body) {
        throw validationFailed(M.UPDATE_BODY_REQUIRED);
    }

    if (title.length > 200) {
        throw validationFailed(M.UPDATE_TITLE_TOO_LONG);
    }

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    const isAdmin = isAdminRole(roles);

    if (project.creator_id !== userId && !isAdmin) {
        throw forbidden("Only the project's creator can post an update.");
    }

    assertNotArchived(project);
    // An update is a public post, and once the term is over there is no audience left to
    // announce anything to. deleteProjectUpdate below stays open, like deleteComment.
    assertSemesterOpen(project);

    // A rejected project is not on Discover and has no backers, so an update would go
    // nowhere. Worse, the updates endpoint is public, so if the project is later approved
    // that post surfaces with a timestamp from a period nobody could see it.
    if (project.status === "REJECTED") {
        throw conflict("This project was not approved, so it cannot post updates. Revise it and resubmit for review.");
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
        throw notFound("Update not found");
    }

    const project = await projectRepository.findById(update.project_id);
    const isAdmin = isAdminRole(roles);

    if (project?.creator_id !== userId && !isAdmin) {
        throw forbidden("Only the project's creator can delete an update.");
    }

    return await projectUpdateRepository.remove(updateId);
}

module.exports = { getProjectUpdates, createProjectUpdate, deleteProjectUpdate };
