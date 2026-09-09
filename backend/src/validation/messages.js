/**
 * Sentences that a zod schema and a service check would otherwise each spell out.
 *
 * The schema catches these first, which is the point: it can report several at once and
 * name the field. The service keeps its own check because it must not depend on a
 * middleware having run.
 *
 * Two checks is fine. Two wordings is not: somebody who slips past the form and is
 * refused by the API would read a different sentence and assume a second, stricter rule.
 */
const MESSAGES = {
    COMMENT_EMPTY: "A comment cannot be empty.",
    COMMENT_TOO_LONG: "A comment must be 2000 characters or fewer.",

    UPDATE_TITLE_REQUIRED: "An update needs a title.",
    UPDATE_BODY_REQUIRED: "An update needs some content.",
    UPDATE_TITLE_TOO_LONG: "The title must be 200 characters or fewer.",

    // One contribution per person per project, so the cap is also the most any single
    // account can put behind one project. The client's number.
    CONTRIBUTION_TOO_LARGE: "A contribution can be at most 500 CC.",
    CONTRIBUTION_ALREADY_MADE: "You have already supported this project — one contribution per person.",
    CONTRIBUTION_OWN_PROJECT: "You cannot support your own project.",
    // A level above the cap is one nobody can reach: a dead control by construction.
    TIER_ABOVE_CAP: "A support level cannot ask for more than 500 CC.",

    // An admin owns nothing, so granting to one is refused on both coin routes.
    // Enforcing it only where the UI hides a checkbox leaves the rule open to any
    // hand-made request.
    GRANT_TO_ADMIN: "An administrator account cannot hold Class Coins.",
    GRANT_TARGET_MISSING: "One of those accounts no longer exists.",

    // Somebody outside RMIT asking for Class Coins. The first two are copied word for
    // word into src/components/classcoin/coinRequestRules.js.
    COIN_REQUEST_NOTE_REQUIRED: "Tell the admin who you are and why you need Class Coins.",
    COIN_REQUEST_NOTE_TOO_LONG: "Keep that under 200 characters.",
    COIN_REQUEST_PENDING: "You already have a request waiting for an admin.",
    COIN_REQUEST_WALLET_NOT_EMPTY: "You still have Class Coins to spend.",
    COIN_REQUEST_ALREADY_REVIEWED: "This request has already been reviewed.",

    // The wallet to adjust is named in the body, never taken from the token. Reading it
    // from the token would let any signed-in user mint coins into their own balance.
    WALLET_TARGET_REQUIRED: "user_id is required - name the account to adjust.",

    // Two admins working the same approval queue. The frontend quotes this wording, so
    // changing it here alone would have the two explain the same refusal differently.
    VERDICT_ALREADY_GIVEN: "This project has already been reviewed by another admin.",
};

module.exports = MESSAGES;
