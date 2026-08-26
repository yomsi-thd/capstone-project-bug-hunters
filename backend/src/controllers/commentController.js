const commentService = require("../services/commentService");
const asyncHandler = require("../http/asyncHandler");

// Routes are unchanged: these still answer /api/projects/:id/comments.

const getProjectComments = asyncHandler(async (req, res) => {
    const comments = await commentService.getProjectComments(req.params.id, req.user);

    res.status(200).json(comments);
});

const createComment = asyncHandler(async (req, res) => {
    const comment = await commentService.createComment(req.user.id, req.params.id, req.body);

    res.status(201).json({ message: "Comment posted successfully", comment });
});

const deleteComment = asyncHandler(async (req, res) => {
    await commentService.deleteComment(req.user.id, req.user.roles, req.params.commentId);

    res.status(200).json({ message: "Comment deleted successfully" });
});

module.exports = { getProjectComments, createComment, deleteComment };
