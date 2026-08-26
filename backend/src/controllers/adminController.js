const adminService = require("../services/adminService");
const projectService = require("../services/projectService");
const asyncHandler = require("../http/asyncHandler");
const { page, pagination } = require("../http/envelope");

const deactivateUser = asyncHandler(async (req, res) => {
    const user = await adminService.deactivateUser(req.params.id, req.user.id);

    res.status(200).json({ message: "User deactivated successfully", user });
});

const activateUser = asyncHandler(async (req, res) => {
    const user = await adminService.activateUser(req.params.id);

    res.status(200).json({ message: "User activated successfully", user });
});

// The other endpoint that accepts ?limit=&offset=. The admin user list is the one place
// that could plausibly grow past a screenful.
const getAllUsers = asyncHandler(async (req, res) => {
    const { limit, offset } = pagination(req);

    const { items, total } = await adminService.getAllUsers({ limit, offset });

    res.status(200).json(page(items, { total, limit, offset }));
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await adminService.getUserById(req.params.id);

    res.status(200).json(user);
});

// Body: { "roles": ["BACKER", "CREATOR"] } - replaces the user's whole role set.
const updateUserRoles = asyncHandler(async (req, res) => {
    const user = await adminService.updateUserRoles(req.params.id, req.body.roles, req.user.id);

    res.status(200).json({ message: "User roles updated successfully", user });
});

const getAllProjects = asyncHandler(async (req, res) => {
    const projects = await projectService.getAllProjects();

    res.status(200).json(page(projects));
});

const getProjectById = asyncHandler(async (req, res) => {
    // Passing req.user matters: getProjectById hides unapproved projects from anyone who
    // is not the creator or an admin, and reviewing a PENDING project is the entire point
    // of this route. This one is already behind authorize("ADMIN").
    const project = await projectService.getProjectById(req.params.id, req.user);

    res.status(200).json(project);
});

const getAllCreatorRequests = asyncHandler(async (req, res) => {
    const requests = await adminService.getAllCreatorRequests();

    res.status(200).json(page(requests));
});

const approveCreatorRequest = asyncHandler(async (req, res) => {
    const request = await adminService.approveCreatorRequest(req.params.id, req.user.id);

    res.status(200).json({ message: "Creator request approved.", request });
});

const rejectCreatorRequest = asyncHandler(async (req, res) => {
    const request = await adminService.rejectCreatorRequest(req.params.id, req.user.id);

    res.status(200).json({ message: "Creator request rejected.", request });
});

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
    rejectCreatorRequest,
};
