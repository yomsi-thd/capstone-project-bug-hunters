// The rules a coin request has to satisfy, in a plain-function module next to
// RequestCoinsModal and for the same two reasons as investmentRules.js and tierRules.js:
// they are testable without rendering anything, and a file that exported both a component
// and a function would fail the react-refresh build.
//
// ⚠️ The backend enforces the same rules, and this copy is not the security boundary: the
// length lives in backend/src/validation/schemas/coinRequestSchemas.js (422). This file
// exists so a person learns the rules from the form rather than from a rejected request.
//
// ⚠️ The two sentences below are copied WORD FOR WORD from
// backend/src/validation/messages.js (COIN_REQUEST_NOTE_REQUIRED and
// COIN_REQUEST_NOTE_TOO_LONG). Two checks is fine; two wordings is not.

export const NOTE_MAX_LENGTH = 200;

/**
 * Is this note something the API will accept? Returns null when it is, or the sentence to
 * show when it is not.
 *
 * Measured on the trimmed value: somebody who finishes typing and leaves a trailing space
 * should not be refused over one invisible character.
 */
export function validateNote(note) {
  const trimmed = String(note ?? "").trim();

  if (trimmed.length === 0) {
    return "Tell the admin who you are and why you need Class Coins.";
  }

  if (trimmed.length > NOTE_MAX_LENGTH) {
    return "Keep that under 200 characters.";
  }

  return null;
}
