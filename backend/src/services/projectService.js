const pool = require("../config/db");
const projectRepository = require("../repositories/projectRepository");
const projectUpdateRepository = require("../repositories/projectUpdateRepository");
const commentRepository = require("../repositories/commentRepository");
const classCoinRepository = require("../repositories/classCoinRepository");

// projects.start_date / end_date have always existed but createProject never wrote
// them, so every project came back with both null -> ProjectDetail showed "—" for
// "days to go" and AdminApprovals showed "Not set" for duration.
// The create form has no duration field yet, so a campaign window is assumed here.
// Change this constant (or send start_date / end_date in the request body) to adjust.
const DEFAULT_CAMPAIGN_DAYS = 30;

function resolveCampaignDates(data) {

    const start = data.start_date ? new Date(data.start_date) : new Date();

    if (Number.isNaN(start.getTime())) {
        throw new Error("start_date is not a valid date.");
    }

    const end = data.end_date
        ? new Date(data.end_date)
        : new Date(start.getTime() + DEFAULT_CAMPAIGN_DAYS * 24 * 60 * 60 * 1000);

    if (Number.isNaN(end.getTime())) {
        throw new Error("end_date is not a valid date.");
    }

    if (end <= start) {
        throw new Error("end_date must be after start_date.");
    }

    return { start, end };
}

// Create project
async function createProject(userId, data) {

    const { start, end } = resolveCampaignDates(data);

    const project = {
        creator_id: userId,
        title: data.title,
        description: data.description,
        category: data.category,
        goal_amount: data.goal_amount,
        current_amount: 0,
        image_url: data.image_url,
        status: "PENDING",
        team_members: data.team_members || [],
        start_date: start,
        end_date: end,
        // The project story, split the way ProjectDetail renders it. `description`
        // stays the short blurb used on the Discover cards; these three are the long
        // form. All optional — a project with none of them just shows the blurb.
        challenge: data.challenge || null,
        solution: data.solution || null,
        funding_usage: data.funding_usage || null,
        gallery: Array.isArray(data.gallery) ? data.gallery : [],
        // [{ title, desc }] — the highlights listed under "Our Solution".
        solution_bullets: Array.isArray(data.solution_bullets) ? data.solution_bullets : []
    };

    const createdProject =
        await projectRepository.createProject(project);

    return createdProject;
}

// Get all projects
async function getAllProjects() {
    return await projectRepository.findAll();
}

async function getAllApprovedProjects() {
    return await projectRepository.findAllApprovedProjects();
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
        team_members: data.team_members ?? project.team_members,
        challenge: data.challenge ?? project.challenge,
        solution: data.solution ?? project.solution,
        funding_usage: data.funding_usage ?? project.funding_usage,
        gallery: Array.isArray(data.gallery) ? data.gallery : project.gallery,
        solution_bullets: Array.isArray(data.solution_bullets)
            ? data.solution_bullets
            : project.solution_bullets
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

async function setProjectEndorsed(id, endorsed) {

    const project = await projectRepository.setEndorsed(id, Boolean(endorsed));

    if (!project) {
        throw new Error("Project not found");
    }

    return project;
}

// Comments are public to read and open to any signed-in user to write.
async function getProjectComments(projectId) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    return await commentRepository.findByProjectId(projectId);
}

async function createComment(userId, projectId, data) {

    const body = (data.body || "").trim();

    if (!body) {
        throw new Error("A comment cannot be empty.");
    }

    if (body.length > 2000) {
        throw new Error("A comment must be 2000 characters or fewer.");
    }

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    let parentId = null;

    if (data.parent_id) {
        const parent = await commentRepository.findById(data.parent_id);

        if (!parent || Number(parent.project_id) !== Number(projectId)) {
            throw new Error("The comment being replied to does not belong to this project.");
        }

        // The UI only draws one level of nesting, so a reply to a reply is attached to
        // the top-level comment instead of creating a thread nobody can see.
        parentId = parent.parent_id ?? parent.id;
    }

    return await commentRepository.create({
        project_id: projectId,
        user_id: userId,
        parent_id: parentId,
        body
    });
}

async function deleteComment(userId, roles, commentId) {

    const comment = await commentRepository.findById(commentId);

    if (!comment) {
        throw new Error("Comment not found");
    }

    const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

    if (comment.user_id !== userId && !isAdmin) {
        throw new Error("You can only delete your own comment.");
    }

    return await commentRepository.remove(commentId);
}

// Anyone can read a project's updates — they are published on the public project page.
async function getProjectUpdates(projectId) {

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    return await projectUpdateRepository.findByProjectId(projectId);
}

// Only the creator of the project may post an update about it. An ADMIN is allowed too,
// consistent with the rest of the app treating admin as a superuser.
async function createProjectUpdate(userId, roles, projectId, data) {

    const title = (data.title || "").trim();
    const body = (data.body || "").trim();

    if (!title) {
        throw new Error("An update needs a title.");
    }

    if (!body) {
        throw new Error("An update needs some content.");
    }

    if (title.length > 200) {
        throw new Error("The title must be 200 characters or fewer.");
    }

    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error("Project not found");
    }

    const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

    if (project.creator_id !== userId && !isAdmin) {
        throw new Error("Only the project's creator can post an update.");
    }

    return await projectUpdateRepository.create({
        project_id: projectId,
        author_id: userId,
        title,
        body
    });
}

async function deleteProjectUpdate(userId, roles, updateId) {

    const update = await projectUpdateRepository.findById(updateId);

    if (!update) {
        throw new Error("Update not found");
    }

    const project = await projectRepository.findById(update.project_id);
    const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

    if (project?.creator_id !== userId && !isAdmin) {
        throw new Error("Only the project's creator can delete an update.");
    }

    return await projectUpdateRepository.remove(updateId);
}

async function investProject(userId, projectId, amount) {

    if (!amount || amount <= 0) {
        throw new Error("Investment amount must be greater than 0.");
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        // Get project inside transaction
        const project = await projectRepository.findById(projectId, client);

        if (!project) {
            throw new Error("Project not found.");
        }

        if (project.status !== "APPROVED") {
            throw new Error("Only approved projects can receive investments.");
        }

        // Atomically deduct balance
        const wallet = await classCoinRepository.deductBalance(
            userId,
            amount,
            client
        );

        if (!wallet) {
            throw new Error("Insufficient ClassCoins.");
        }

        // Increase project funding
        await projectRepository.increaseCurrentAmount(
            projectId,
            amount,
            client
        );

        // Save transaction
        const transaction = await classCoinRepository.createTransaction(
            {
                classcoin_id: wallet.id,
                project_id: projectId,
                type: "INVEST",
                amount,
                description: `Invested in project #${projectId}`
            },
            client
        );

        await client.query("COMMIT");

        return {
            message: "Investment successful.",
            transaction
        };

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();

    }

}

module.exports = {
    createProject,
    getAllProjects,
    getAllApprovedProjects,
    getProjectById,
    getMyProjects,
    updateProject,
    deleteProject,
    approveProject,
    rejectProject,
    setProjectEndorsed,
    getProjectComments,
    createComment,
    deleteComment,
    getProjectUpdates,
    createProjectUpdate,
    deleteProjectUpdate,
    investProject
};