const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
const authenticate = require("../middlewares/authMiddleware");
const authenticateOptional = require("../middlewares/authOptional");
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

// Same rule as "/my" above: this has to stay ABOVE "/:id" or Express matches
// "/:id/..." first. No authorize() — the creator comes from the token, so this can
// only ever return the caller's own backers.
router.get("/my/backers", authenticate, projectController.getMyBackers);

// Public, but not blind: authOptional lets a signed-out visitor through with
// req.user = null while still identifying anyone who did send a token. The service
// needs that to keep PENDING and REJECTED projects visible to their creator and to
// admins, and hidden from everyone else. Plain `authenticate` here would lock signed-out
// visitors out of every project page, which is the opposite of what this route is for.
router.get("/:id", authenticateOptional, projectController.getProjectById);

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
// Public like the project itself, and optional-auth for the same reason: these are the
// project's content, so hiding an unapproved project while leaving its discussion
// readable one URL over would not hide anything.
router.get("/:id/comments", authenticateOptional, projectController.getProjectComments);

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
router.get("/:id/updates", authenticateOptional, projectController.getProjectUpdates);

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