import { describe, it, expect } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(initials("An Nguyen")).toBe("AN");
  });

  // This is the variant that shipped in AdminApprovals:152 and EditProject:126 — neither
  // uppercased, so the same person showed as "an" there and "AN" in AdminUserManagement
  // and CreatorDashboard.
  it("uppercases a name typed in lower case", () => {
    expect(initials("an nguyen")).toBe("AN");
  });

  it("takes only one letter when asked", () => {
    expect(initials("An Nguyen", { max: 1 })).toBe("A");
  });

  // ⚠️ First TWO WORDS, not first-and-last: "An Van Nguyen" is "AV", not "AN".
  //
  // This looks wrong for a Vietnamese name, where the family name comes last — but it is
  // what all eight hand-written copies did, however they were spelled (`.slice(0, 2)`
  // before or after `.join("")` gives the same answer). Preserving it is the point: this
  // is a refactor, and switching to first-and-last would silently change what every
  // avatar in the app displays.
  //
  // If the team decides first-and-last reads better, that is a design change with its own
  // commit — and this test is where it gets decided.
  it("takes the first two words, not the first and last", () => {
    expect(initials("An Van Nguyen")).toBe("AV");
  });

  it("survives extra whitespace", () => {
    expect(initials("  an   nguyen  ")).toBe("AN");
  });

  it("handles a one-word name", () => {
    expect(initials("Madonna")).toBe("M");
  });

  // A pure function takes junk rather than throwing. An empty name is real data here:
  // project_updates.author_id is ON DELETE SET NULL, so toProjectUpdate falls back to a
  // placeholder and other rows can arrive with nothing at all.
  it("returns an empty string rather than throwing on junk input", () => {
    expect(initials("")).toBe("");
    expect(initials(null)).toBe("");
    expect(initials(undefined)).toBe("");
    expect(initials("   ")).toBe("");
  });

  // The fallback character is each screen's own decision — Header uses "U",
  // ProjectDetail uses "?" — so this function must not pick one for them.
  it("does not invent a fallback character", () => {
    expect(initials(null)).not.toBe("U");
    expect(initials(null)).not.toBe("?");
  });
});
