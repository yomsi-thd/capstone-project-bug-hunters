const adminService = require("../services/adminService");
const projectService = require("../services/projectService");

async function deactivateUser(req, res) {

    try {

        const user = await adminService.deactivateUser(req.params.id);

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
        const project = await projectService.getProjectById(req.params.id);

        res.status(200).json(project);
    } catch (error) {
        res.status(404).json({
            message: error.message
        });
    }
}

module.exports = {
    deactivateUser,
    activateUser,
    getAllUsers,
    getUserById,
    getAllProjects,
    getProjectById
};