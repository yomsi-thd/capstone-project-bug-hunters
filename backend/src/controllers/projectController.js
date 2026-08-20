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
        // req.user comes from authOptional: the real user when a token was sent, and
        // null for a signed-out visitor. The service uses it to decide whether an
        // unapproved project is visible.
        const project = await projectService.getProjectById(
            req.params.id,
            req.user
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

//Get everyone who has backed a project this user owns
async function getMyBackers(req, res) {

    try {

        const backers = await projectService.getMyBackers(req.user.id);

        res.status(200).json(backers);

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

// Archive Project — the everyday "remove it" action. Soft, reversible.
const archiveProject = async (req, res) => {
    try {
        const project = await projectService.archiveProject(
            req.params.id,
            req.user.id,
            req.user.roles,
            req.body.reason
        );

        res.status(200).json({
            message: "Project archived successfully",
            project
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// Restore Project — brings it back at the status it already had.
const restoreProject = async (req, res) => {
    try {
        const project = await projectService.restoreProject(
            req.params.id,
            req.user.id,
            req.user.roles
        );

        res.status(200).json({
            message: "Project restored successfully",
            project
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// Delete Project — PERMANENT. Admin only, and only for an already-archived project;
// both rules live in the service.
const deleteProject = async (req, res) => {
    try {
        await projectService.deleteProject(
            req.params.id,
            req.user.id,
            req.user.roles
        );

        res.status(200).json({
            message: "Project deleted permanently"
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

        // `note` is the reviewer's explanation, shown to the creator on their project
        // card. AdminApprovals collected it long before there was a column for it.
        const project =
            await projectService.rejectProject(
                req.params.id,
                req.body?.note
            );

        res.json(project);

    } catch (error) {

        res.status(404).json({
            message: error.message
        });

    }
}

// The creator's route back into the approval queue after revising a rejected project.
async function resubmitProject(req, res) {

    try {

        const project = await projectService.resubmitProject(
            req.params.id,
            req.user.id,
            req.user.roles
        );

        res.status(200).json({
            message: "Project resubmitted for review",
            project
        });

    } catch (error) {

        res.status(400).json({
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

        const comments = await projectService.getProjectComments(req.params.id, req.user);

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

        const updates = await projectService.getProjectUpdates(req.params.id, req.user);

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

// ─── Support levels (project_tiers) ─────────────────────────────────────────────

async function getProjectTiers(req, res) {
    try {

        const tiers = await projectService.getProjectTiers(req.params.id, req.user);

        res.status(200).json(tiers);

    } catch (error) {

        res.status(404).json({
            message: error.message
        });

    }
}

async function createTier(req, res) {
    try {

        const tier = await projectService.createTier(
            req.params.id,
            req.user.id,
            req.user.roles,
            req.body
        );

        res.status(201).json({
            message: "Support level added",
            tier
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

async function updateTier(req, res) {
    try {

        const tier = await projectService.updateTier(
            req.params.id,
            req.params.tierId,
            req.user.id,
            req.user.roles,
            req.body
        );

        res.status(200).json({
            message: "Support level updated",
            tier
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
}

async function deleteTier(req, res) {
    try {

        // `hidden` tells the UI which of the two things happened: a level nobody chose
        // is really gone, one somebody chose is only hidden so their history still
        // points at a row that exists.
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
            hidden: result.hidden
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
        // tierId is optional — "No level — just support" sends none.
        const { amount, tierId } = req.body;

        const result = await projectService.investProject(
            userId,
            projectId,
            amount,
            tierId ?? null
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
    deleteTier
};