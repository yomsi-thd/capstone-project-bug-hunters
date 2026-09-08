import { describe, it, expect } from "vitest";
import { NOTE_MAX_LENGTH, validateNote } from "./coinRequestRules";

describe("NOTE_MAX_LENGTH", () => {
  // Pinned here because the backend refuses anything longer (coinRequestSchemas.js) and
  // the modal counts down against it. Three places read this number.
  it("is 200", () => {
    expect(NOTE_MAX_LENGTH).toBe(200);
  });
});

describe("validateNote", () => {
  it("accepts an ordinary sentence", () => {
    expect(validateNote("I am a guest invited to the showcase.")).toBeNull();
  });

  it("accepts exactly the maximum", () => {
    expect(validateNote("x".repeat(NOTE_MAX_LENGTH))).toBeNull();
  });

  it("refuses nothing at all", () => {
    const expected = "Tell the admin who you are and why you need Class Coins.";
    expect(validateNote("")).toBe(expected);
    expect(validateNote(null)).toBe(expected);
    expect(validateNote(undefined)).toBe(expected);
  });

  it("refuses whitespace, which is not an answer", () => {
    expect(validateNote("    ")).toBe(
      "Tell the admin who you are and why you need Class Coins."
    );
  });

  it("refuses one character past the maximum", () => {
    expect(validateNote("x".repeat(NOTE_MAX_LENGTH + 1))).toBe(
      "Keep that under 200 characters."
    );
  });

  it("measures the trimmed value, so trailing spaces do not push it over", () => {
    expect(validateNote(`${"x".repeat(NOTE_MAX_LENGTH)}     `)).toBeNull();
  });
});
