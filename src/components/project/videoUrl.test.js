import { describe, it, expect } from "vitest";
import { toEmbedUrl, isLinkable } from "./videoUrl";

describe("toEmbedUrl", () => {
  it("converts the YouTube watch link people actually paste", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
      .toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("handles the short youtu.be form and the share link's extra query", () => {
    expect(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ"))
      .toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    // The "Copy link" button on YouTube appends ?si=… — it must not end up in the id.
    expect(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ?si=AbC123"))
      .toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s"))
      .toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("handles shorts and an already-embeddable link", () => {
    expect(toEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"))
      .toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(toEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ"))
      .toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("converts Vimeo", () => {
    expect(toEmbedUrl("https://vimeo.com/123456789"))
      .toBe("https://player.vimeo.com/video/123456789");
  });

  it("returns null for anything it cannot embed, so the caller falls back to a link", () => {
    expect(toEmbedUrl("https://drive.google.com/file/d/abc/view")).toBeNull();
    expect(toEmbedUrl("not a url at all")).toBeNull();
    expect(toEmbedUrl("")).toBeNull();
    expect(toEmbedUrl(null)).toBeNull();
  });

  it("refuses a javascript: url rather than turning it into a link", () => {
    // The value is creator-supplied and rendered into an href, so anything that is not
    // plainly http(s) has to be rejected here.
    expect(toEmbedUrl("javascript:alert(1)")).toBeNull();
  });
});

// Both project forms call this before saving, so the check that lets a value INTO the
// database is the same one the page uses to decide whether it is safe to render as a
// link — the two cannot drift into disagreeing about what a link is.
describe("isLinkable", () => {
  it("accepts a plain web address, embeddable or not", () => {
    expect(isLinkable("https://www.youtube.com/watch?v=abc")).toBe(true);
    // Not embeddable, but still a real link the page will render as one.
    expect(isLinkable("https://drive.google.com/file/d/abc/view")).toBe(true);
    expect(isLinkable("http://example.test/talk.mp4")).toBe(true);
  });

  it("rejects the typed-something-else case the create wizard used to accept", () => {
    // "abc" got past a required field and was stored as a project's video.
    expect(isLinkable("abc")).toBe(false);
    expect(isLinkable("uqewq")).toBe(false);
    expect(isLinkable("www.youtube.com/watch?v=abc")).toBe(false); // no scheme
    expect(isLinkable("")).toBe(false);
    expect(isLinkable(null)).toBe(false);
  });

  it("rejects a scheme that would execute on click", () => {
    expect(isLinkable("javascript:alert(1)")).toBe(false);
    expect(isLinkable("data:text/html,<script>alert(1)</script>")).toBe(false);
  });
});
