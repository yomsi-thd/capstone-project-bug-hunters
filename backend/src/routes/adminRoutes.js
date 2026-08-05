const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const adminController = require("../controllers/adminController");

router.patch(
    "/users/:id/deactivate",
    authenticate,
    authorize("admin"),
    adminController.deactivateUser
);

router.patch(
    "/users/:id/activate",
    authenticate,
    authorize("admin"),
    adminController.activateUser
);

router.get(
    "/users",
    authenticate,
    authorize("admin"),
    adminController.getAllUsers
);

router.get(
    "/users/:id",
    authenticate,
    authorize("admin"),
    adminController.getUserById
);

router.get(
    "/projects",
    authenticate,
    authorize("admin"),
    adminController.getAllProjects
);

router.get(
    "/projects/:id",
    authenticate,
    authorize("admin"),
    adminController.getProjectById
);

module.exports = router;