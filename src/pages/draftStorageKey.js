// Where CreateProject parks its autosaved draft.
//
// Until 2026-08-18 this was a single fixed key with no account in it, and
// clearDraftFromStorage() ran in exactly one place — a successful submit. Logging out
// did not touch it. So on a shared machine (which is every demo of this project, with
// five test accounts and constant role switching) one person's half-written project was
// handed to whoever signed in next, pre-filled, sometimes sitting on the Review & Submit
// step with the button armed. One click and it was published under the wrong name.
//
// Kept in its own module rather than inside CreateProject.jsx so the rule can be tested
// without rendering the five-step wizard.

export const LEGACY_DRAFT_STORAGE_KEY = "rmit-launchpad-create-project-draft";

/**
 * The draft key for one account, or null when nobody is signed in.
 *
 * Null is meaningful: the caller must then neither read nor write a draft. Falling back
 * to a shared key for signed-out users would reintroduce exactly the leak this fixes.
 *
 * The id is coerced to a string so a number from the session and a string from anywhere
 * else land on the same key — otherwise a reload could look in the wrong place.
 */
export function draftStorageKey(userId) {
  if (userId === null || userId === undefined || userId === "") return null;

  return `${LEGACY_DRAFT_STORAGE_KEY}:${String(userId)}`;
}
