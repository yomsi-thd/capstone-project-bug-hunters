const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
const authenticate = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");

// ADMIN is included on purpose: the team treats admin as a superuser, and the nav bar
// gates "START A PROJECT" on canCreate = creator OR admin. Dropping ADMIN here would
// show admins a button that 403s only after they finish the whole form.
// (Agreed with Hiếu on 2026-08-06.)
router.post("/", authenticate, authorize("CREATOR", "ADMIN"), projectController.createProject);

router.get("/", projectController.getAllApprovedProjects);

// Must come BEFORE "/:id", otherwise Express matches "/:id" with id = "my".
// The path is "/my" (no :id) — the controller reads the creator from req.user.id.
router.get("/my", authenticate, projectController.getMyProjects);

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

// The "RMIT Endorsed" badge is a university endorsement, so only an admin may set it.
router.patch(
    "/:id/endorse",
    authenticate,
    authorize("ADMIN"),
    projectController.endorseProject
);

// Comments: public to read, any signed-in user may post, only the author (or an admin)
// may delete. Ownership is checked in the service, not by a role guard.
router.get("/:id/comments", projectController.getProjectComments);

router.post(
    "/:id/comments",
    authenticate,
    projectController.createComment
);

router.delete(
    "/:id/comments/:commentId",
    authenticate,
    projectController.deleteComment
);

// Project updates. Reading is public (they show on the project page); posting and
// deleting are checked against the project's creator inside the service.
router.get("/:id/updates", projectController.getProjectUpdates);

router.post(
    "/:id/updates",
    authenticate,
    projectController.createProjectUpdate
);

router.delete(
    "/:id/updates/:updateId",
    authenticate,
    projectController.deleteProjectUpdate
);

router.post(
    "/:id/invest",
    authenticate,
    projectController.investProject
);

module.exports = router;