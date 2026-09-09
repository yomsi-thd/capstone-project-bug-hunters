// Where CreateProject parks its autosaved draft.
//
// The key carries the account id. A single fixed key would hand one person's half-written
// project to whoever signs in next on the same machine, pre-filled and sometimes sitting
// on Review & Submit with the button armed. That is one click away from publishing under
// the wrong name, and demos of this project run on shared machines.
//
// Kept in its own module rather than inside CreateProject.jsx so the rule is testable
// without rendering the five-step wizard.

export const LEGACY_DRAFT_STORAGE_KEY = "rmit-launchpad-create-project-draft";

/**
 * The draft key for one account, or null when nobody is signed in.
 *
 * Null is meaningful: the caller must then neither read nor write a draft. A shared
 * fallback key for signed-out users would bring the leak straight back.
 *
 * The id is coerced to a string so a number from the session and a string from anywhere
 * else land on the same key, rather than a reload looking in the wrong place.
 */
export function draftStorageKey(userId) {
  if (userId === null || userId === undefined || userId === "") return null;

  return `${LEGACY_DRAFT_STORAGE_KEY}:${String(userId)}`;
}
