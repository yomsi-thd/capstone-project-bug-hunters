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
        status: "PENDING"
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