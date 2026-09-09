// Who may delete a comment. Mirrors projectService.deleteComment on the backend: the
// author or an admin, nobody else. Kept in one module so the button and the request can
// never disagree, and so the rule is testable without rendering the thread.
//
// The project's creator is deliberately absent. The platform exists to let backers
// signal what they think of an idea, and a creator who could delete criticism from their
// own page would make that signal worthless. Abuse goes to an admin, who owns nothing
// and moderates everything.
//
// `viewer` is { id, isAdmin }, or null when signed out.
export function canDeleteComment(viewer, comment) {
  if (!viewer || !comment) return false;
  if (viewer.isAdmin) return true;

  // A comment whose author was deleted carries authorId null, so without this guard a
  // viewer with no id would match it.
  if (comment.authorId == null || viewer.id == null) return false;

  return Number(comment.authorId) === Number(viewer.id);
}

// How many replies a delete would take with it.
//
// comments.parent_id is ON DELETE CASCADE, so deleting a top-level comment destroys
// every reply under it, including other people's. Deletes are hard, not soft, so the
// confirmation dialog showing this number is the only warning anyone gets.
//
// Threads are one level deep, so a reply always returns 0.
export function repliesLostBy(comment) {
  return comment?.replies?.length ?? 0;
}
