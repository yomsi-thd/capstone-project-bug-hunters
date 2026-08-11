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

// Archive / restore / permanent delete — the two-step bin that replaced plain delete.
// No authorize() guard on purpose: the rule is about OWNERSHIP, not role, and it is the
// same pattern the project-updates and comment routes already use. archive is allowed
// for the creator or an admin; restore is allowed for an admin, or for the creator only
// when they were the one who archived it. Both are decided in projectService.
router.patch("/:id/archive", authenticate, projectController.archiveProject);

router.patch("/:id/restore", authenticate, projectController.restoreProject);

// PERMANENT. The service restricts this to an ADMIN acting on an already-archived
// project, so a creator can no longer destroy their own project in one click.
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

// Resubmit a REJECTED project for review. No authorize() guard — like archive/restore
// this is about OWNERSHIP, and the service checks it (creator of the project, or admin).
// Without this route a rejected project is permanently stuck: the approval queue only
// lists PENDING and the admin dashboard has no approve button.
router.patch("/:id/resubmit", authenticate, projectController.resubmitProject);

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