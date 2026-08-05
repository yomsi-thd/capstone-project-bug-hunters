const projectRepository = require("../repositories/projectRepository");
const classCoinRepository = require("../repositories/classCoinRepository");
const userRepository = require("../repositories/userRepository");

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

    const createdProject =
        await projectRepository.createProject(project);

    await userRepository.assignRole(userId, "CREATOR");

    return createdProject;
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

async function getMyProjects(userId) {

    return await projectRepository.findByCreatorId(userId);
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

    return await projectRepository.updateProject(projectId, updatedProject);
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

async function approveProject(id) {

    const project =
        await projectRepository.approveProject(id);

    if (!project) {
        throw new Error("Project not found");
    }

    return project;
}

async function rejectProject(id) {

    const project =
        await projectRepository.rejectProject(id);

    if (!project) {
        throw new Error("Project not found");
    }

    return project;
}

async function investProject(userId, projectId, amount) {

    // Validate amount
    if (!amount || amount <= 0) {
        throw new Error("Investment amount must be greater than 0.");
    }

    // Get user's ClassCoin wallet
    const wallet = await classCoinRepository.getBalance(userId);

    if (!wallet) {
        throw new Error("ClassCoin wallet not found.");
    }

    // Check balance
    if (wallet.balance < amount) {
        throw new Error("Insufficient ClassCoins.");
    }

    // Find project
    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found.");
    }

    // Only approved projects can receive investments
    if (project.status !== "APPROVED") {
        throw new Error("Only approved projects can receive investments.");
    }

    // Deduct user's ClassCoins
    await classCoinRepository.deductBalance(userId, amount);

    // Increase project's current amount
    await projectRepository.increaseCurrentAmount(projectId, amount);

    // Save transaction history
    const transaction =
        await classCoinRepository.createTransaction({
            classcoin_id: wallet.id,
            project_id: projectId,
            type: "INVEST",
            amount,
            description: `Invested in project #${projectId}`
        });

    return {
        message: "Investment successful.",
        transaction
    };
}

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    getMyProjects,
    updateProject,
    deleteProject,
    approveProject,
    rejectProject,
    investProject
};