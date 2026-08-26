const { z } = require("zod");

const M = require("../messages");

/**
 * Bodies for the account routes, the wallet routes and the admin role editor.
 *
 * ⚠️ Nothing here states a password POLICY. The app has never had one — the seeded test
 * accounts use `Test1234` and Register only checks length on the client — so adding one
 * at this layer would silently refuse existing accounts on their next password change.
 * A policy is a product decision with a migration behind it, not a side effect of adding
 * validation.
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
    // Absent means "keep what is stored" - the service depends on telling that apart
    // from an empty string, which means "clear it".
    title: z.string().max(150).nullish(),
});

const changePasswordSchema = z.looseObject({
    oldPassword: z.string({ error: "Enter your current password." }).min(1, "Enter your current password."),
    newPassword: z.string({ error: "Enter a new password." }).min(1, "Enter a new password."),
});

/**
 * The wallet to credit or debit is named in the BODY, never taken from the token.
 * Reading it from the token was the whole bug of 2026-08-21: the routes had no role
 * guard either, so any signed-in user could mint Class Coins into their own wallet.
 */
const walletAdjustmentSchema = z.looseObject({
    user_id: z.union([z.number(), z.string()], { error: M.WALLET_TARGET_REQUIRED }),
    amount: z.coerce.number({ error: "An amount is required." }),
});

/**
 * ⚠️ Shape only. Which role NAMES are valid is read from the `roles` table, and the rule
 * that ADMIN may not be combined with anything else is a domain rule - both stay in
 * adminService, which is also the only place they cannot be routed around.
 */
const updateRolesSchema = z.looseObject({
    roles: z.array(z.string(), {
        error: 'roles must be an array, e.g. { "roles": ["BACKER", "CREATOR"] }',
    }),
});

module.exports = {
    updateProfileSchema,
    changePasswordSchema,
    walletAdjustmentSchema,
    updateRolesSchema,
};
