// Who may delete a comment.
//
// This mirrors `projectService.deleteComment` (backend), which allows the comment's own
// author or an ADMIN and refuses everyone else. It is kept in its own module for the same
// reason tierRules.js and videoUrl.js are: the rule has to be testable without rendering
// the thread, and it must exist in exactly ONE place on this side so the button and the
// request can never disagree about who is allowed.
//
// ⚠️ The project's CREATOR is deliberately NOT on this list, and it is not an oversight.
// The whole platform exists to let backers signal what they think of an idea; a creator
// who could delete criticism from their own project page would make the discussion
// worthless as a signal. Abuse goes to an admin, which after the 24/08 role separation is
// precisely what an admin is for — they own nothing and moderate everything.
//
// `viewer` is `{ id, isAdmin }`; pass null when signed out.
export function canDeleteComment(viewer, comment) {
  if (!viewer || !comment) return false;
  if (viewer.isAdmin) return true;

  // A comment whose author was deleted carries `authorId = null` (users.id is
  // ON DELETE SET NULL). Without this guard a viewer with no id would match it.
  if (comment.authorId == null || viewer.id == null) return false;

  return Number(comment.authorId) === Number(viewer.id);
}

// How many replies a delete would take with it.
//
// ⚠️ `comments.parent_id` is ON DELETE CASCADE, so deleting a top-level comment destroys
// every reply underneath it — including replies written by OTHER people, who never agreed
// to it and are never told. The team chose a hard delete over a soft one on 24/08, so the
// confirmation dialog carrying this number is the only thing standing between a routine
// click and somebody else's writing disappearing. Keep it.
//
// A reply has no replies of its own — the thread is one level deep by design — so this is
// 0 for them.
export function repliesLostBy(comment) {
  return comment?.replies?.length ?? 0;
}
