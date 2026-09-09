import { describe, it, expect } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(initials("An Nguyen")).toBe("AN");
  });

  // Hand-written copies disagreed on casing, so the same person showed as "an" on one
  // screen and "AN" on another.
  it("uppercases a name typed in lower case", () => {
    expect(initials("an nguyen")).toBe("AN");
  });

  it("takes only one letter when asked", () => {
    expect(initials("An Nguyen", { max: 1 })).toBe("A");
  });

  // First two words rather than first and last: "An Van Nguyen" is "AV", not "AN".
  //
  // That reads oddly for a Vietnamese name, where the family name comes last, but it is
  // what every hand-written copy did and switching would change what every avatar in the
  // app displays. If first-and-last reads better, that is a design change with its own
  // commit, and this test is where it gets decided.
  it("takes the first two words, not the first and last", () => {
    expect(initials("An Van Nguyen")).toBe("AV");
  });

  it("survives extra whitespace", () => {
    expect(initials("  an   nguyen  ")).toBe("AN");
  });

  it("handles a one-word name", () => {
    expect(initials("Madonna")).toBe("M");
  });

  // A pure function takes junk rather than throwing, and an empty name is real data:
  // author_id is ON DELETE SET NULL, so rows can arrive with no name at all.
  it("returns an empty string rather than throwing on junk input", () => {
    expect(initials("")).toBe("");
    expect(initials(null)).toBe("");
    expect(initials(undefined)).toBe("");
    expect(initials("   ")).toBe("");
  });

  // The fallback character is each screen's own decision, so this function must not pick
  // one for them.
  it("does not invent a fallback character", () => {
    expect(initials(null)).not.toBe("U");
    expect(initials(null)).not.toBe("?");
  });
});
