const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
const authenticate = require("../middlewares/authMiddleware");

router.post("/", authenticate, projectController.createProject);

router.get("/", projectController.getAllProjects);

router.get("/:id", projectController.getProjectById);

router.put("/:id", authenticate, projectController.updateProject);

router.delete("/:id", authenticate, projectController.deleteProject);

module.exports = router;