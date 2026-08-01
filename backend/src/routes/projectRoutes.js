const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
const authenticate = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");

router.post("/", authenticate, projectController.createProject);

router.get("/", projectController.getAllProjects);

router.get("/:id", projectController.getProjectById);

router.put("/:id", authenticate, projectController.updateProject);

router.delete("/:id", authenticate, projectController.deleteProject);

router.patch(
    "/:id/approve",
    authenticate,
    authorize("ADMIN"),
    projectController.approveProject
);

router.patch(
    "/:id/reject",
    authenticate,
    authorize("ADMIN"),
    projectController.rejectProject
);

module.exports = router;