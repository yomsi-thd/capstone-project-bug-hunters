const adminService = require("../services/adminService");
const projectService = require("../services/projectService");

async function deactivateUser(req, res) {

    try {

        const user = await adminService.deactivateUser(req.params.id, req.user.id);

        res.status(200).json({
            message: "User deactivated successfully",
            user
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

async function activateUser(req, res) {

    try {

        const user = await adminService.activateUser(req.params.id);

        res.status(200).json({
            message: "User activated successfully",
            user
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

async function getAllUsers(req, res) {

    try {

        const users = await adminService.getAllUsers();

        res.status(200).json(users);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
}

async function getUserById(req, res) {

    try {

        const user = await adminService.getUserById(req.params.id);

        res.status(200).json(user);

    } catch (error) {

        res.status(404).json({
            message: error.message
        });

    }
}

async function updateUserRoles(req, res) {

    try {

        const user = await adminService.updateUserRoles(
            req.params.id,
            req.body.roles,
            req.user.id
        );

        res.status(200).json({
            message: "User roles updated successfully",
            user
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

async function getAllProjects(req, res) {
    try {
        const projects = await projectService.getAllProjects();

        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
}

async function getProjectById(req, res) {
    try {
        // Passing req.user matters: getProjectById hides unapproved projects from
        // anyone who is not the creator or an admin, and reviewing a PENDING project is
        // the entire point of this route. This one is already behind authorize("ADMIN").
        const project = await projectService.getProjectById(req.params.id, req.user);

        res.status(200).json(project);
    } catch (error) {
        res.status(404).json({
            message: error.message
        });
    }
}

async function getAllCreatorRequests(req, res) {
    try {

        const requests =
            await adminService.getAllCreatorRequests();

        res.status(200).json(requests);

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }
}

async function approveCreatorRequest(req, res) {
    try {

        const request =
            await adminService.approveCreatorRequest(
                req.params.id,
                req.user.id
            );

        res.status(200).json({
            message: "Creator request approved.",
            request
        });

    } catch (err) {

        res.status(400).json({
            message: err.message
        });

    }
}

async function rejectCreatorRequest(req, res) {
    try {

        const request =
            await adminService.rejectCreatorRequest(
                req.params.id,
                req.user.id
            );

        res.status(200).json({
            message: "Creator request rejected.",
            request
        });

    } catch (err) {

        res.status(400).json({
            message: err.message
        });

    }
}

module.exports = {
    deactivateUser,
    activateUser,
    getAllUsers,
    getUserById,
    updateUserRoles,
    getAllProjects,
    getProjectById,
    getAllCreatorRequests,
    approveCreatorRequest,
    rejectCreatorRequest
};