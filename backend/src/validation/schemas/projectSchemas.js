const { z } = require("zod");

const M = require("../messages");

/**
 * ⚠️ Read the permissiveness here as deliberate, not as unfinished.
 *
 * The create wizard sends empty strings for prose the creator skipped, base64 data URIs
 * in `gallery`, and team members carrying whatever keys the form collected. Tightening
 * any of those would not catch a bug — it would BE one, refusing submissions the app has
 * always made. What these schemas exist to catch is the case that used to reach a
 * NOT NULL constraint and come back as a 500 with no clue which field was missing.
 *
 * ⚠️ The support-level rules stay in projectService, which delegates to the same
 * tierRules the frontend uses. zod checks that a level is an object with a name, an
 * amount and some bullets; it does NOT re-state "at most five per project" or "no two
 * active levels at the same amount", because both need to read the database — and
 * because a second copy of a rule is a second wording to keep in step. The team already
 * fixed one such drift on 2026-08-20.
 */

// Money arrives as a number from the wizard and as a string from a hand-made request.
const amount = z.coerce
    .number({ error: "An amount is required." })
    .refine((n) => Number.isFinite(n), "An amount must be a number.");

// Prose the creator may legitimately leave blank. "" is stored as NULL by the service.
const optionalText = z.string().max(20000).optional();

// Anything the app already puts in these arrays. `unknown` rather than a shape, because
// the shape is the form's business and this layer must not become a second copy of it.
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
    goal_amount: amount,
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
    // Sent ONLY by an admin filing on behalf of a creator. Whether it is required or
    // forbidden depends on the caller's role, which is resolveOwnership's decision -
    // it has to look the target account up, so it cannot live here.
    creator_id: z.union([z.number(), z.string()]).nullish(),
    // ⚠️ NO start_date / end_date, and no semester_id either. Removed 2026-09-06: a
    // project's closing date is its semester's, and the semester is decided by
    // semesterService from the day it is filed. Nothing the caller sends can change
    // it. The schema is `looseObject`, so an old client still sending those three
    // fields is not refused - they are simply ignored, which is what keeps this from
    // breaking a browser tab left open across the deploy.
});

/**
 * Every field optional: updateProject reads `data.x ?? project.x`, so an absent field
 * means "leave the column alone". EditProject only sends the tabs it can edit.
 *
 * ⚠️ `video_url` has three cases, not two, and the service depends on telling them
 * apart: absent leaves the column, text stores it, EMPTY stores NULL. So an empty string
 * has to pass validation here rather than being rejected as blank.
 */
const updateProjectSchema = createProjectSchema.partial();

const archiveSchema = z.looseObject({
    // Required only when an admin archives somebody else's project, which is a rule
    // about who the caller is - checked in the service.
    reason: z.string().max(2000).optional(),
});

const rejectSchema = z.looseObject({
    // Optional on purpose: the queue's one-click REJECT is a legitimate quick action for
    // obvious spam, and the REVIEW screen is where an explanation is written.
    note: z.string().max(5000).optional(),
});

const endorseSchema = z.looseObject({
    endorsed: z.coerce.boolean({ error: "Send endorsed as true or false." }),
});

// The sentences come from ../messages so the service's own copy of these checks cannot
// word them differently. See that file for the drift this prevents.
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

const investSchema = z.looseObject({
    amount: amount,
    // "No level - just support" sends nothing, and that is a first-class choice.
    tierId: z.union([z.number(), z.string()]).nullish(),
});

module.exports = {
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
