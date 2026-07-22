const projectRepository = require("../repositories/projectRepository");

// Create project
async function createProject(userId, data) {

    const project = {
        creator_id: userId,
        title: data.title,
        description: data.description,
        category: data.category,
        goal_amount: data.goal_amount,
        current_amount: 0,
        image_url: data.image_url,
        status: "PENDING",
        team_members: data.team_members || []
    };

    return await projectRepository.createProject(project);
}

// Get all projects
async function getAllProjects() {
    return await projectRepository.findAll();
}

// Get project by ID
async function getProjectById(id) {

    const project = await projectRepository.findById(id);

    if (!project) {
        throw new Error("Project not found");
    }

    return project;
}

// Update project
async function updateProject(projectId, userId, data) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    if (project.creator_id !== userId) {
        throw new Error("Unauthorized");
    }

    const updatedProject = {
        title: data.title ?? project.title,
        description: data.description ?? project.description,
        category: data.category ?? project.category,
        goal_amount: data.goal_amount ?? project.goal_amount,
        image_url: data.image_url ?? project.image_url,
        team_members: data.team_members ?? project.team_members
    };

    return await projectRepository.updateProject(projectId, data);
}

// Delete project
async function deleteProject(projectId, userId) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    if (project.creator_id !== userId) {
        throw new Error("Unauthorized");
    }

    await projectRepository.deleteProject(projectId);
}

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject
};