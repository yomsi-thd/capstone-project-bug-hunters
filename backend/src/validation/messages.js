/**
 * Sentences that a zod schema and a service check would otherwise both have to spell out.
 *
 * ⚠️ This file exists because of a drift the team has already had. On 2026-08-20 the
 * support-level rules were enforced on both sides and the minimum-amount message had
 * quietly gone out of step, so a creator who slipped past the form and was refused by the
 * API read a DIFFERENT sentence and had every reason to think they had hit a second,
 * stricter rule.
 *
 * The schema catches these first, which is the point — it can report several at once and
 * name the field. The service keeps its own check because it must not depend on a
 * middleware having run: a service is the last line, and UI is not a security boundary.
 * Two checks is fine. Two wordings is not.
 */
const MESSAGES = {
    COMMENT_EMPTY: "A comment cannot be empty.",
    COMMENT_TOO_LONG: "A comment must be 2000 characters or fewer.",

    UPDATE_TITLE_REQUIRED: "An update needs a title.",
    UPDATE_BODY_REQUIRED: "An update needs some content.",
    UPDATE_TITLE_TOO_LONG: "The title must be 200 characters or fewer.",

    // The wallet to adjust is named in the BODY, never taken from the token - reading
    // it from the token was the whole bug of 2026-08-21, when any signed-in user could
    // mint Class Coins into their own balance.
    WALLET_TARGET_REQUIRED: "user_id is required - name the account to adjust.",
};

module.exports = MESSAGES;
