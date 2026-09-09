const { z } = require("zod");

const M = require("../messages");

/**
 * Bodies for the account routes, the wallet routes and the admin role editor.
 *
 * Nothing here states a password policy. The app has never had one, so adding it at this
 * layer would refuse existing accounts on their next password change. A policy is a
 * product decision with a migration behind it, not a side effect of adding validation.
 */

const updateProfileSchema = z.looseObject({
    fullName: z
        .string({ error: "A full name is required." })
        .trim()
        .min(1, "A full name is required.")
        .max(100),
    email: z
        .string({ error: "An email address is required." })
        .trim()
        .min(1, "An email address is required.")
        .max(100),
    // Absent means "keep what is stored", and the service depends on telling that apart
    // from an empty string, which means "clear it".
    title: z.string().max(150).nullish(),
});

const changePasswordSchema = z.looseObject({
    oldPassword: z.string({ error: "Enter your current password." }).min(1, "Enter your current password."),
    newPassword: z.string({ error: "Enter a new password." }).min(1, "Enter a new password."),
});

/**
 * The wallet to credit or debit is named in the body, never taken from the token. Reading
 * it from the token, on routes with no role guard, would let any signed-in user mint
 * Class Coins into their own wallet.
 */
const walletAdjustmentSchema = z.looseObject({
    user_id: z.union([z.number(), z.string()], { error: M.WALLET_TARGET_REQUIRED }),
    amount: z.coerce.number({ error: "An amount is required." }),
});

/**
 * Shape only. Which role names are valid comes from the `roles` table, and the rule that
 * ADMIN may not be combined with anything else is a domain rule. Both stay in
 * adminService, which is the only place they cannot be routed around.
 */
const updateRolesSchema = z.looseObject({
    roles: z.array(z.string(), {
        error: 'roles must be an array, e.g. { "roles": ["BACKER", "CREATOR"] }',
    }),
});

/**
 * Bulk grant. Both limits guard against a slip rather than a hostile admin: 200 ids is a
 * larger class than anyone reaches by accident, and 100,000 CC is wide enough for any
 * real intent while still catching a typed extra zero.
 *
 * Who may receive a grant is not here. That needs the roles table, so it lives in
 * classCoinService where it cannot be routed around.
 */
const grantSchema = z.looseObject({
    user_ids: z
        .array(z.coerce.number().int().positive(), { error: "Choose at least one account to grant to." })
        .min(1, "Choose at least one account to grant to.")
        .max(200, "Grant to at most 200 accounts at a time."),
    amount: z.coerce
        .number({ error: "An amount is required." })
        .int("An amount must be a whole number of Class Coins.")
        .min(1, "An amount must be greater than 0.")
        .max(100000, "That is more than 100,000 CC - check the amount."),
});

module.exports = {
    grantSchema,
    updateProfileSchema,
    changePasswordSchema,
    walletAdjustmentSchema,
    updateRolesSchema,
};
