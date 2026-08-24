import { describe, it, expect } from "vitest";
import { canDeleteComment, repliesLostBy } from "./commentPermissions";

const comment = (over = {}) => ({ id: 1, authorId: 7, replies: [], ...over });

describe("canDeleteComment", () => {
  it("lets an author delete their own comment", () => {
    expect(canDeleteComment({ id: 7, isAdmin: false }, comment())).toBe(true);
  });

  it("refuses a signed-in reader who did not write it", () => {
    expect(canDeleteComment({ id: 8, isAdmin: false }, comment())).toBe(false);
  });

  it("lets an admin delete anyone's comment", () => {
    expect(canDeleteComment({ id: 99, isAdmin: true }, comment())).toBe(true);
  });

  it("refuses a signed-out viewer", () => {
    expect(canDeleteComment(null, comment())).toBe(false);
  });

  // The button is rendered per comment, so a missing comment must not read as "allowed".
  it("refuses when the comment is missing", () => {
    expect(canDeleteComment({ id: 7, isAdmin: true }, null)).toBe(false);
  });

  // users.id is ON DELETE SET NULL, so a comment can arrive with no author at all. Two
  // nulls must not match each other into a delete button for a stranger.
  it("refuses a null author even when the viewer has no id", () => {
    expect(canDeleteComment({ id: null, isAdmin: false }, comment({ authorId: null }))).toBe(false);
  });

  it("still lets an admin delete a comment whose author was deleted", () => {
    expect(canDeleteComment({ id: 1, isAdmin: true }, comment({ authorId: null }))).toBe(true);
  });

  // node-postgres hands back an int and the session stores whatever the JWT carried; the
  // rule must not depend on which of the two is a string today.
  it("matches ids across number and string forms", () => {
    expect(canDeleteComment({ id: "7", isAdmin: false }, comment({ authorId: 7 }))).toBe(true);
  });
});

describe("repliesLostBy", () => {
  it("counts the replies a cascade would take", () => {
    expect(repliesLostBy(comment({ replies: [{ id: 2 }, { id: 3 }] }))).toBe(2);
  });

  it("is 0 for a comment with no replies", () => {
    expect(repliesLostBy(comment())).toBe(0);
  });

  // A reply node carries no `replies` array at all — CommentList builds it only for roots.
  it("is 0 when the comment has no replies array", () => {
    expect(repliesLostBy({ id: 4, authorId: 7 })).toBe(0);
  });

  it("is 0 for a missing comment", () => {
    expect(repliesLostBy(null)).toBe(0);
  });
});
