// The rules a coin request has to satisfy. Plain functions in their own module, like
// investmentRules and tierRules: testable without rendering anything, and a file
// exporting both a component and a function would fail the react-refresh build.
//
// The backend enforces the same length rule and is the real boundary. This copy exists
// so a person learns the rules from the form rather than from a rejected request, and
// its sentences are copied word for word from backend/src/validation/messages.js.

export const NOTE_MAX_LENGTH = 200;

/**
 * Will the API accept this note? Returns null when it will, or the sentence to show when
 * it won't. Measured on the trimmed value, so a trailing space cannot fail it.
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
