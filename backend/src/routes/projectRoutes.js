const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
// Comments, updates, support levels and investments have controllers of their own. The
// paths below are unchanged: the split is internal.
const commentController = require("../controllers/commentController");
const projectUpdateController = require("../controllers/projectUpdateController");
const tierController = require("../controllers/tierController");
const investmentController = require("../controllers/investmentController");
const authenticate = require("../middlewares/authMiddleware");
const authenticateOptional = require("../middlewares/authOptional");
const authorize = require("../middlewares/authorize");
const { guardIdParams } = require("../http/numericParam");
const { validateBody } = require("../validation/validate");
const { validateQuery } = require("../validation/validate");
const { paginationQuery } = require("../http/envelope");
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

// Every id here is a serial primary key, so anything that is not a positive integer
// cannot name a row. Checked once, before any handler runs. See numericParam.js for why
// the answer is 404 rather than 400.
guardIdParams(router, {
    id: "Project",
    commentId: "Comment",
    updateId: "Update",
    tierId: "Support level",
});

// ADMIN is allowed here not because an admin may own projects, which they may not, but
// because an admin may file one on behalf of a creator and still has to get through this
// door.
//
// The rule that an admin caller must name the creator, and a creator caller must not,
// lives in projectService.resolveOwnership: it needs to look the target account up, which
// a route guard cannot do.
router.post("/", authenticate, authorize("CREATOR", "ADMIN"), validateBody(createProjectSchema), projectController.createProject);

router.get("/", validateQuery(paginationQuery), projectController.getAllApprovedProjects);

// Must come before "/:id", or Express matches that with id = "my". The controller reads
// the creator from req.user.id.
router.get("/my", authenticate, projectController.getMyProjects);

// Same rule as "/my": it has to stay above "/:id". No authorize() needed, since the
// creator comes from the token and this can only return the caller's own backers.
router.get("/my/backers", authenticate, projectController.getMyBackers);

// Public but not blind. authOptional lets a signed-out visitor through with req.user
// null while still identifying anyone who sent a token, which the service needs to keep
// PENDING and REJECTED projects visible to their creator and to admins. Plain
// `authenticate` would lock signed-out visitors out of every project page.
router.get("/:id", authenticateOptional, projectController.getProjectById);

router.put("/:id", authenticate, validateBody(updateProjectSchema), projectController.updateProject);

// Archive, restore and permanent delete: the two-step bin that replaced plain delete.
// No authorize() guard, because the rule is about ownership rather than role, as with the
// comment and update routes. Archive is allowed for the creator or an admin; restore for
// an admin, or for the creator only when they archived it. Both are decided in
// projectService.
router.patch("/:id/archive", authenticate, validateBody(archiveSchema), projectController.archiveProject);

router.patch("/:id/restore", authenticate, projectController.restoreProject);

// Permanent. The service restricts it to an admin acting on an already-archived project,
// so nobody destroys a project in one click.
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

// Resubmits a rejected project for review. Ownership again, checked in the service.
// Without this route a rejected project is stuck for good: the queue lists PENDING only,
// and the admin dashboard has no approve button.
router.patch("/:id/resubmit", authenticate, projectController.resubmitProject);

// The "RMIT Endorsed" badge is a university endorsement, so admin only.
router.patch(
    "/:id/endorse",
    authenticate,
    authorize("ADMIN"),
    validateBody(endorseSchema),
    projectController.endorseProject
);

// Comments: public to read, any signed-in user may post, and only the author or an admin
// may delete, checked in the service rather than by a role guard.
//
// Optional auth for the same reason as the project itself: comments are the project's
// content, so hiding an unapproved project while leaving its discussion readable one URL
// over would hide nothing.
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

// Project updates. Reading is public, since they show on the project page; posting and
// deleting are checked against the project's creator in the service.
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

// Support levels, `project_tiers` in the database. Reading is public and follows the
// project's own visibility rule; writing is checked against the creator in the service,
// so there is no authorize() here either.
//
// All four sit under "/:id/...", so none needs declaring above "/:id": only a static
// first segment does.
//
// authOptional rather than authenticate. The project page is public, but a token that is
// present and broken still 401s so axios gets its chance to refresh; downgrading an
// expired token to anonymous would 404 a creator on their own pending project.
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

// authorize("BACKER") is what makes canInvest more than a UI gate. With `authenticate`
// alone, any signed-in account could invest through one hand-made request, and "an admin
// owns nothing and invests in nothing" cannot be a frontend rule.
router.post(
    "/:id/invest",
    authenticate,
    authorize("BACKER"),
    validateBody(investSchema),
    investmentController.investProject
);

module.exports = router;