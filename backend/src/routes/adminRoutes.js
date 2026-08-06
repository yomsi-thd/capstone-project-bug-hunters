const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");
const adminController = require("../controllers/adminController");

router.patch(
    "/users/:id/deactivate",
    authenticate,
    authorize("ADMIN"),
    adminController.deactivateUser
);

router.patch(
    "/users/:id/activate",
    authenticate,
    authorize("ADMIN"),
    adminController.activateUser
);

router.get(
    "/users",
    authenticate,
    authorize("ADMIN"),
    adminController.getAllUsers
);

router.get(
    "/users/:id",
    authenticate,
    authorize("ADMIN"),
    adminController.getUserById
);

// Body: { "roles": ["BACKER", "CREATOR"] } — replaces the user's whole role set.
router.patch(
    "/users/:id/roles",
    authenticate,
    authorize("ADMIN"),
    adminController.updateUserRoles
);

router.get(
    "/projects",
    authenticate,
    authorize("ADMIN"),
    adminController.getAllProjects
);

router.get(
    "/projects/:id",
    authenticate,
    authorize("ADMIN"),
    adminController.getProjectById
);

router.get(
    "/creator-requests",
    authenticate,
    authorize("ADMIN"),
    adminController.getAllCreatorRequests
);

router.patch(
    "/creator-requests/:id/approve",
    authenticate,
    authorize("ADMIN"),
    adminController.approveCreatorRequest
);

router.patch(
    "/creator-requests/:id/reject",
    authenticate,
    authorize("ADMIN"),
    adminController.rejectCreatorRequest
);

module.exports = router;