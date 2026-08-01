const projectService = require("../services/projectService");

// Create Project
const createProject = async (req, res) => {
    try {
        const creatorId = req.user.id;

        const project = await projectService.createProject(
            creatorId,
            req.body
        );

        res.status(201).json({
            message: "Project created successfully",
            project
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// Get All Projects
const getAllProjects = async (req, res) => {
    try {
        const projects = await projectService.getAllProjects();

        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// Get Project By ID
const getProjectById = async (req, res) => {
    try {
        const project = await projectService.getProjectById(
            req.params.id
        );

        res.status(200).json(project);
    } catch (error) {
        res.status(404).json({
            message: error.message
        });
    }
};

// Update Project
const updateProject = async (req, res) => {
    try {
        const project = await projectService.updateProject(
            req.params.id,
            req.user.id,
            req.body
        );

        res.status(200).json({
            message: "Project updated successfully",
            project
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// Delete Project
const deleteProject = async (req, res) => {
    try {
        await projectService.deleteProject(
            req.params.id,
            req.user.id
        );

        res.status(200).json({
            message: "Project deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

async function approveProject(req, res) {

    try {

        const project =
            await projectService.approveProject(
                req.params.id
            );

        res.json(project);

    } catch (error) {

        res.status(404).json({
            message: error.message
        });

    }
}

async function rejectProject(req, res) {

    try {

        const project =
            await projectService.rejectProject(
                req.params.id
            );

        res.json(project);

    } catch (error) {

        res.status(404).json({
            message: error.message
        });

    }
}

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    approveProject,
    rejectProject
};