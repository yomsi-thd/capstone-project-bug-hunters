const { z } = require("zod");

/**
 * ⚠️ `email` is NOT z.email(), and that is deliberate.
 *
 * The frontend's own field is deliberately not `type="email"` either — the browser's
 * native validation bubble would pre-empt AuthInput's error line. Both sides check that
 * something was typed and leave the judgement of what a valid address looks like to the
 * one thing that can actually answer it: whether the account exists.
 *
 * The seeded test accounts also end in `@test.com`, and the suite uses `.invalid`, which
 * is a reserved TLD. A stricter rule here would be a rule about which addresses may hold
 * an account, which is not a decision this layer gets to make.
 */
// The message is on the TYPE check as well as the length one: zod's default for a
// missing field is "Invalid input: expected string, received undefined", and `details`
// exists so a form can show a person what is wrong.
const email = z
    .string({ error: "An email address is required." })
    .trim()
    .min(1, "An email address is required.")
    .max(100);

const password = z.string({ error: "A password is required." }).min(1, "A password is required.");

const registerSchema = z.looseObject({
    fullName: z
        .string({ error: "A full name is required." })
        .trim()
        .min(1, "A full name is required.")
        .max(100),
    email,
    password,
    // The sign-up form's "request Creator access" checkbox. Absent means no.
    wantCreator: z.coerce.boolean().optional(),
});

const loginSchema = z.looseObject({ email, password });

const refreshTokenSchema = z.looseObject({
    refreshToken: z
        .string({ error: "Send the refresh token in the body." })
        .min(1, "Send the refresh token in the body."),
});

module.exports = { registerSchema, loginSchema, refreshTokenSchema };
