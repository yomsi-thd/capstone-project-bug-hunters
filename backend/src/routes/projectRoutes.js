const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
// Comments, updates, support levels and investments have controllers of their own now.
// The PATHS below are deliberately unchanged - the split is internal.
const commentController = require("../controllers/commentController");
const projectUpdateController = require("../controllers/projectUpdateController");
const tierController = require("../controllers/tierController");
const investmentController = require("../controllers/investmentController");
const authenticate = require("../middlewares/authMiddleware");
const authenticateOptional = require("../middlewares/authOptional");
const authorize = require("../middlewares/authorize");
const { guardIdParams } = require("../http/numericParam");
const { validateBody } = require("../validation/validate");
const {
    createProjectSchema,
    updateProjectSchema,
    archiveSchema,
    rejectSchema,
    endorseSchema,
    commentSchema,
    projectUpdateSchema,
    investSchema,
} = require("../validation/schemas/projectSchemas");

// Every id here is a SERIAL primary key, so anything that is not a positive integer
// cannot name a row. Checked once, before any handler runs - see numericParam.js for
// why the answer is 404 rather than 400.
guardIdParams(router, {
    id: "Project",
    commentId: "Comment",
    updateId: "Update",
    tierId: "Support level",
});

// ADMIN is still here after the role separation (2026-08-24), but for the OPPOSITE
// reason it was here before. It is no longer "admin is a superuser and may own
// projects" — an admin owns nothing now. It is that an admin may file a project ON
// BEHALF OF a creator, so they still have to get through this door.
// The rule that an ADMIN caller MUST name the creator (and a CREATOR caller must not)
// lives in projectService.resolveOwnership, not here: it needs to look the target
// account up, which a route guard cannot do.
router.post("/", authenticate, authorize("CREATOR", "ADMIN"), validateBody(createProjectSchema), projectController.createProject);

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

router.put("/:id", authenticate, validateBody(updateProjectSchema), projectController.updateProject);

// Archive / restore / permanent delete — the two-step bin that replaced plain delete.
// No authorize() guard on purpose: the rule is about OWNERSHIP, not role, and it is the
// same pattern the project-updates and comment routes already use. archive is allowed
// for the creator or an admin; restore is allowed for an admin, or for the creator only
// when they were the one who archived it. Both are decided in projectService.
router.patch("/:id/archive", authenticate, validateBody(archiveSchema), projectController.archiveProject);

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
    validateBody(rejectSchema),
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
    validateBody(endorseSchema),
    projectController.endorseProject
);

// Comments: public to read, any signed-in user may post, only the author (or an admin)
// may delete. Ownership is checked in the service, not by a role guard.
// Public like the project itself, and optional-auth for the same reason: these are the
// project's content, so hiding an unapproved project while leaving its discussion
// readable one URL over would not hide anything.
router.get("/:id/comments", authenticateOptional, commentController.getProjectComments);

router.post(
    "/:id/comments",
    authenticate,
    validateBody(commentSchema),
    commentController.createComment
);

router.delete(
    "/:id/comments/:commentId",
    authenticate,
    commentController.deleteComment
);

// Project updates. Reading is public (they show on the project page); posting and
// deleting are checked against the project's creator inside the service.
router.get("/:id/updates", authenticateOptional, projectUpdateController.getProjectUpdates);

router.post(
    "/:id/updates",
    authenticate,
    validateBody(projectUpdateSchema),
    projectUpdateController.createProjectUpdate
);

router.delete(
    "/:id/updates/:updateId",
    authenticate,
    projectUpdateController.deleteProjectUpdate
);

// Support levels ("project_tiers" in the database — the UI wording can still change,
// the column names should not). Reading is public and follows the project's own
// visibility rule; writing is checked against the project's creator inside the service,
// so there is no authorize() here either.
//
// All four sit under "/:id/…", so none of them is at risk of the trap that once killed
// GET /projects/my — only a STATIC first segment has to be declared above "/:id".
//
// authOptional, not authenticate: the project page is public, but a token that is
// present and broken still 401s so axios gets its chance to refresh. Downgrading an
// expired token to "anonymous" would 404 a creator on their own pending project.
router.get("/:id/tiers", authenticateOptional, tierController.getProjectTiers);

router.post(
    "/:id/tiers",
    authenticate,
    tierController.createTier
);

router.put(
    "/:id/tiers/:tierId",
    authenticate,
    tierController.updateTier
);

router.delete(
    "/:id/tiers/:tierId",
    authenticate,
    tierController.deleteTier
);

// authorize("BACKER") added 2026-08-24 with the admin role separation. This route had
// only `authenticate` since it shipped, so `canInvest` in AuthContext was purely a UI
// gate: any signed-in account, admin or pure creator, could invest with one hand-made
// request. "An admin owns nothing and invests in nothing" cannot be a frontend rule.
router.post(
    "/:id/invest",
    authenticate,
    authorize("BACKER"),
    validateBody(investSchema),
    investmentController.investProject
);

module.exports = router;