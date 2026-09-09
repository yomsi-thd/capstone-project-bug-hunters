// The rules a contribution has to satisfy, as plain functions so they are testable
// without rendering the invest modal, and so the modal and the project sidebar share one
// implementation.
//
// The backend enforces the same rules and is the real boundary: the cap in investSchema,
// the once-per-project and own-project rules in investmentService, with a partial unique
// index under them. This file exists so a backer learns the rules from the form rather
// than from a rejected request.
//
// The sentences below are copied word for word from backend/src/validation/messages.js.
// Two checks is fine; two wordings makes people hunt for a rule that isn't there.

export const MAX_CONTRIBUTION = 500;

/**
 * Will the API accept this amount? Returns null when it will, or the sentence to show
 * when it won't.
 *
 * The one-contribution-per-project rule is not checked here, since it depends on what
 * the person has already done and only the server knows that. The sidebar covers it by
 * not offering the button at all.
 */
export function validateContribution(amount, balance) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    return "Enter an amount above 0 CC.";
  }

  // Balance before cap, on purpose. Somebody holding 200 CC who types 400 has a wallet
  // problem, and quoting a limit they never reached would answer the wrong question.
  if (value > Number(balance)) {
    return "That is more than your balance.";
  }

  if (value > MAX_CONTRIBUTION) {
    return "A contribution can be at most 500 CC.";
  }

  return null;
}
