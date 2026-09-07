// The rules a contribution has to satisfy, in a plain-function module next to
// tierRules.js and videoUrl.js and for the same two reasons: they are testable without
// rendering the invest modal, and the modal and the project sidebar share ONE
// implementation instead of each checking a slightly different set.
//
// ⚠️ The backend enforces the same rules, and this copy is not the security boundary:
// the cap lives in investSchema (422), the once-per-project rule and the own-project
// rule in investmentService (409 / 403), with a partial unique index under them. This
// file exists so a backer learns the rules from the form rather than from a rejected
// request.
//
// ⚠️ The sentences below are copied WORD FOR WORD from
// backend/src/validation/messages.js. Two checks is fine; two wordings is what sent a
// creator looking for a second, stricter rule on 2026-08-20, and is the reason that
// messages file exists at all.

export const MAX_CONTRIBUTION = 500;

/**
 * Is this amount something the API will accept? Returns null when it is, or the sentence
 * to show when it is not.
 *
 * The "one contribution per project" rule is NOT checked here: it needs to know what the
 * person has already done, which only the server can answer. The sidebar handles it by
 * not offering the button at all (`myContribution != null`).
 */
export function validateContribution(amount, balance) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    return "Enter an amount above 0 CC.";
  }

  // Balance before cap, deliberately. Somebody holding 200 CC who types 400 has a wallet
  // problem; telling them about a 500 limit they never reached would answer a question
  // they did not ask.
  if (value > Number(balance)) {
    return "That is more than your balance.";
  }

  if (value > MAX_CONTRIBUTION) {
    return "A contribution can be at most 500 CC.";
  }

  return null;
}
