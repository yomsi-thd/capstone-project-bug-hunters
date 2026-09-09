const { z } = require("zod");

const M = require("../messages");

/**
 * These schemas are permissive on purpose.
 *
 * The create wizard sends empty strings for prose the creator skipped, base64 data URIs
 * in `gallery`, and team members carrying whatever keys the form collected. Tightening
 * any of that would refuse submissions the app has always made. What they exist to catch
 * is the request that would otherwise reach a NOT NULL constraint and come back as a 500
 * with no clue which field was missing.
 *
 * The support-level rules stay in projectService, which uses the same tierRules the
 * frontend does. zod checks that a level is an object with a name, an amount and some
 * bullets; it does not restate the per-project limit or the duplicate-minimum rule,
 * because both need to read the database and because a second copy is a second wording
 * to keep in step.
 */

// Money arrives as a number from the wizard and as a string from a hand-made request.
const amount = z.coerce
    .number({ error: "An amount is required." })
    .refine((n) => Number.isFinite(n), "An amount must be a number.");

// Prose the creator may leave blank. The service stores "" as NULL.
const optionalText = z.string().max(20000).optional();

// `unknown` rather than a shape: the shape is the form's business, and this layer must
// not become a second copy of it.
const jsonArray = z.array(z.unknown()).optional();

const tierInput = z.looseObject({
    name: z.string().max(200).optional(),
    min_amount: z.union([z.number(), z.string()]).optional(),
    minAmount: z.union([z.number(), z.string()]).optional(),
    bullets: z.array(z.unknown()).optional(),
});

const createProjectSchema = z.looseObject({
    title: z.string({ error: "A title is required." }).trim().min(1, "A title is required.").max(255),
    description: z
        .string({ error: "A short description is required." })
        .trim()
        .min(1, "A short description is required."),
    // No goal_amount: a project has a running total and nothing to reach. The schema is
    // looseObject, so a stale browser tab still sending one is not refused; the key is
    // stripped.
    category: z.string().max(100).optional(),
    image_url: z.string().optional(),
    video_url: z.string().optional(),
    challenge: optionalText,
    solution: optionalText,
    funding_usage: optionalText,
    team_members: jsonArray,
    gallery: jsonArray,
    solution_bullets: jsonArray,
    tiers: z.array(tierInput).optional(),
    // Sent only by an admin filing on behalf of a creator. Whether it is required or
    // forbidden depends on the caller's role, which resolveOwnership decides: it has to
    // look the target account up, so the rule cannot live here.
    creator_id: z.union([z.number(), z.string()]).nullish(),
    // No start_date, end_date or semester_id. A project's closing date is its
    // semester's, and semesterService picks the semester from the day it is filed, so
    // nothing the caller sends can change it. looseObject means an older client sending
    // those fields is ignored rather than refused.
});

/**
 * Every field is optional. updateProject reads `data.x ?? project.x`, so an absent field
 * means "leave the column alone", and EditProject only sends the tabs it can edit.
 *
 * `video_url` has three cases rather than two and the service depends on telling them
 * apart: absent leaves the column, text stores it, empty stores NULL. An empty string
 * therefore has to pass validation here rather than be rejected as blank.
 */
const updateProjectSchema = createProjectSchema.partial();

const archiveSchema = z.looseObject({
    // Required only when an admin archives somebody else's project, which is a rule
    // about the caller and so is checked in the service.
    reason: z.string().max(2000).optional(),
});

const rejectSchema = z.looseObject({
    // Optional, because the queue's one-click REJECT is a fair quick action for obvious
    // spam and the review screen is where an explanation gets written.
    note: z.string().max(5000).optional(),
});

const endorseSchema = z.looseObject({
    endorsed: z.coerce.boolean({ error: "Send endorsed as true or false." }),
});

// The sentences come from ../messages so the service's copy of these checks cannot word
// them differently.
const commentSchema = z.looseObject({
    body: z.string({ error: M.COMMENT_EMPTY }).trim().min(1, M.COMMENT_EMPTY).max(2000, M.COMMENT_TOO_LONG),
    parent_id: z.union([z.number(), z.string()]).nullish(),
});

const projectUpdateSchema = z.looseObject({
    title: z
        .string({ error: M.UPDATE_TITLE_REQUIRED })
        .trim()
        .min(1, M.UPDATE_TITLE_REQUIRED)
        .max(200, M.UPDATE_TITLE_TOO_LONG),
    body: z.string({ error: M.UPDATE_BODY_REQUIRED }).trim().min(1, M.UPDATE_BODY_REQUIRED),
});

// One contribution per person per project, so this ceiling is also the most any single
// account can put behind one project. That is the point of it: one rich account must not
// outweigh a group of genuine supporters. The number is the client's.
//
// It lives here rather than in the service because it is a complaint about the shape of a
// value and needs no database read. The two rules that do, already-contributed and
// own-project, stay in investmentService.
const MAX_CONTRIBUTION = 500;

const investSchema = z.looseObject({
    amount: amount.refine((n) => n <= MAX_CONTRIBUTION, M.CONTRIBUTION_TOO_LARGE),
    // "Just support" sends nothing, which is a real choice rather than a missing value.
    tierId: z.union([z.number(), z.string()]).nullish(),
});

module.exports = {
    MAX_CONTRIBUTION,
    createProjectSchema,
    updateProjectSchema,
    archiveSchema,
    rejectSchema,
    endorseSchema,
    commentSchema,
    projectUpdateSchema,
    investSchema,
    tierInput,
};
