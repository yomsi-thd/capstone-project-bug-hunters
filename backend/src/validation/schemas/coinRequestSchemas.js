const { z } = require("zod");

const M = require("../messages");

// The same number as NOTE_MAX_LENGTH in src/components/classcoin/coinRequestRules.js.
const NOTE_MAX_LENGTH = 200;

/**
 * ⚠️ SHAPE only. The three real rules - a request already waiting, a wallet that still
 * holds coins, an ADMIN account - all need to read the database, so they live in
 * coinRequestService where there is no way around them.
 */
const coinRequestSchema = z.looseObject({
    note: z
        .string({ error: M.COIN_REQUEST_NOTE_REQUIRED })
        .trim()
        .min(1, M.COIN_REQUEST_NOTE_REQUIRED)
        .max(NOTE_MAX_LENGTH, M.COIN_REQUEST_NOTE_TOO_LONG)
});

/**
 * The amount the admin types when approving - the person asking never names a number.
 *
 * The ceiling matches grantSchema and for the same reason: 100,000 CC is 200 times the
 * contribution cap, wide enough for any real intent and narrow enough to catch a typed
 * extra zero.
 */
const coinRequestVerdictSchema = z.looseObject({
    amount: z.coerce
        .number({ error: "An amount is required." })
        .int("An amount must be a whole number of Class Coins.")
        .min(1, "An amount must be greater than 0.")
        .max(100000, "That is more than 100,000 CC - check the amount.")
});

module.exports = { coinRequestSchema, coinRequestVerdictSchema, NOTE_MAX_LENGTH };
