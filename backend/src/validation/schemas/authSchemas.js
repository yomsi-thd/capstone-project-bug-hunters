const { z } = require("zod");

/**
 * `email` is not z.email(), on purpose.
 *
 * The frontend's field is not type="email" either, since the browser's own validation
 * bubble would pre-empt AuthInput's error line. Both sides check that something was
 * typed and leave "is this a valid address" to the only thing that can answer it:
 * whether the account exists.
 *
 * A stricter rule here would be a rule about which addresses may hold an account, which
 * is not this layer's decision.
 */
// The message is on the type check as well as the length one. zod's default for a
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
