const projectUpdateService = require("../services/projectUpdateService");
const asyncHandler = require("../http/asyncHandler");

// Routes are unchanged: these still answer /api/projects/:id/updates.

const getProjectUpdates = asyncHandler(async (req, res) => {
    const updates = await projectUpdateService.getProjectUpdates(req.params.id, req.user);

    res.status(200).json(updates);
});

const createProjectUpdate = asyncHandler(async (req, res) => {
    const update = await projectUpdateService.createProjectUpdate(
        req.user.id,
        req.user.roles,
        req.params.id,
        req.body
    );

    res.status(201).json({ message: "Update posted successfully", update });
});

const deleteProjectUpdate = asyncHandler(async (req, res) => {
    await projectUpdateService.deleteProjectUpdate(req.user.id, req.user.roles, req.params.updateId);

    res.status(200).json({ message: "Update deleted successfully" });
});

module.exports = { getProjectUpdates, createProjectUpdate, deleteProjectUpdate };
