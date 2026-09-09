const commentRepository = require("../repositories/commentRepository");
const projectRepository = require("../repositories/projectRepository");
const { notFound, forbidden, validationFailed } = require("../errors/AppError");
const { isAdminRole, assertNotArchived, assertSemesterOpen, loadVisibleProject } = require("./projectAccess");
const M = require("../validation/messages");

// Comments are public to read and open to any signed-in user to write.
async function getProjectComments(projectId, viewer = null) {

    // The same loader the project itself goes through: hiding a project but not its
    // discussion would leave the content readable one URL over.
    await loadVisibleProject(projectId, viewer);

    return await commentRepository.findByProjectId(projectId);
}

async function createComment(userId, projectId, data) {

    const body = (data.body || "").trim();

    if (!body) {
        throw validationFailed(M.COMMENT_EMPTY);
    }

    if (body.length > 2000) {
        throw validationFailed(M.COMMENT_TOO_LONG);
    }

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw notFound("Project not found");
    }

    assertNotArchived(project);
    // The semester's freeze closes posting. Deleting stays open on both axes, since
    // abusive text does not become acceptable because a term ended.
    assertSemesterOpen(project);

    let parentId = null;

    if (data.parent_id) {
        const parent = await commentRepository.findById(data.parent_id);

        if (!parent || Number(parent.project_id) !== Number(projectId)) {
            throw validationFailed("The comment being replied to does not belong to this project.");
        }

        // The UI draws one level of nesting, so a reply to a reply is attached to the
        // top-level comment rather than creating a thread nobody can see.
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
        throw notFound("Comment not found");
    }

    const isAdmin = isAdminRole(roles);

    if (comment.user_id !== userId && !isAdmin) {
        throw forbidden("You can only delete your own comment.");
    }

    return await commentRepository.remove(commentId);
}

module.exports = { getProjectComments, createComment, deleteComment };
