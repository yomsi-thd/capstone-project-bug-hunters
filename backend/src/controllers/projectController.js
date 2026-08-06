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
async function getAllApprovedProjects(req, res) {
    try {

        const projects =
            await projectService.getAllApprovedProjects();

        res.status(200).json(projects);

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }
}

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

//Get all Project of a User
async function getMyProjects(req, res) {

    try {

        const projects = await projectService.getMyProjects(req.user.id);

        res.status(200).json(projects);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });
    }
}

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

async function endorseProject(req, res) {
    try {

        const project = await projectService.setProjectEndorsed(
            req.params.id,
            req.body.endorsed
        );

        res.status(200).json(project);

    } catch (error) {

        res.status(404).json({
            message: error.message
        });

    }
}

async function getProjectComments(req, res) {
    try {

        const comments = await projectService.getProjectComments(req.params.id);

        res.status(200).json(comments);

    } catch (error) {

        res.status(404).json({
            message: error.message
        });

    }
}

async function createComment(req, res) {
    try {

        const comment = await projectService.createComment(
            req.user.id,
            req.params.id,
            req.body
        );

        res.status(201).json({
            message: "Comment posted successfully",
            comment
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

async function deleteComment(req, res) {
    try {

        await projectService.deleteComment(
            req.user.id,
            req.user.roles,
            req.params.commentId
        );

        res.status(200).json({
            message: "Comment deleted successfully"
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

async function getProjectUpdates(req, res) {
    try {

        const updates = await projectService.getProjectUpdates(req.params.id);

        res.status(200).json(updates);

    } catch (error) {

        res.status(404).json({
            message: error.message
        });

    }
}

async function createProjectUpdate(req, res) {
    try {

        const update = await projectService.createProjectUpdate(
            req.user.id,
            req.user.roles,
            req.params.id,
            req.body
        );

        res.status(201).json({
            message: "Update posted successfully",
            update
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

async function deleteProjectUpdate(req, res) {
    try {

        await projectService.deleteProjectUpdate(
            req.user.id,
            req.user.roles,
            req.params.updateId
        );

        res.status(200).json({
            message: "Update deleted successfully"
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

async function investProject(req, res) {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;
        const { amount } = req.body;

        const result = await projectService.investProject(
            userId,
            projectId,
            amount
        );

        res.status(200).json(result);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
}


module.exports = {
    createProject,
    //getAllProjects,
    getAllApprovedProjects,
    getProjectById,
    getMyProjects,
    updateProject,
    deleteProject,
    approveProject,
    rejectProject,
    endorseProject,
    getProjectComments,
    createComment,
    deleteComment,
    getProjectUpdates,
    createProjectUpdate,
    deleteProjectUpdate,
    investProject
};