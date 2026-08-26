const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");
const adminController = require("../controllers/adminController");
const { guardIdParams } = require("../http/numericParam");
const { validateBody } = require("../validation/validate");
const { updateRolesSchema } = require("../validation/schemas/accountSchemas");

// :id is a user id on the /users routes and a request id on /creator-requests. Both are
// SERIAL, and "not found" is the right answer for a value that can be neither.
guardIdParams(router, { id: "Resource" });

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
    validateBody(updateRolesSchema),
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