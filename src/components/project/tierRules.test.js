import { describe, it, expect } from "vitest";
import { MAX_TIERS, validateTiers, normaliseTier, meetsMinimum } from "./tierRules";

// A valid level, spread and overridden in the cases below.
const level = (over = {}) => ({
  name: "Pilot partner",
  amount: "250",
  bullets: ["I want the team to install a trial unit in my area."],
  ...over,
});

describe("normaliseTier", () => {
  it("trims the name and coerces the amount to a number", () => {
    const t = normaliseTier(level({ name: "  Pilot partner  ", amount: "250" }));
    expect(t.name).toBe("Pilot partner");
    expect(t.minAmount).toBe(250);
  });

  it("drops blank bullet lines and trims the rest", () => {
    const t = normaliseTier(level({ bullets: ["  I want a demo  ", "", "   ", "I can be interviewed"] }));
    expect(t.bullets).toEqual(["I want a demo", "I can be interviewed"]);
  });

  it("reads either `amount` (both forms) or `minAmount` (the API shape)", () => {
    expect(normaliseTier({ minAmount: 100 }).minAmount).toBe(100);
    expect(normaliseTier({ amount: "100" }).minAmount).toBe(100);
  });

  it("turns a non-numeric amount into NaN rather than 0", () => {
    // 0 would look like a deliberate "free" level and slip past a `> 0` check written
    // as `!amount`; NaN fails every comparison, which is what we want.
    expect(Number.isNaN(normaliseTier(level({ amount: "abc" })).minAmount)).toBe(true);
  });

  it("survives junk input instead of throwing", () => {
    const t = normaliseTier({});
    expect(t.name).toBe("");
    expect(t.bullets).toEqual([]);
  });
});

describe("validateTiers", () => {
  it("accepts an empty list — support levels are optional", () => {
    expect(validateTiers([])).toBeNull();
  });

  it("accepts a well-formed list", () => {
    expect(validateTiers([level(), level({ name: "Advocate", amount: "50" })])).toBeNull();
  });

  it("rejects more than MAX_TIERS levels", () => {
    const many = Array.from({ length: MAX_TIERS + 1 }, (_, i) =>
      level({ name: `Level ${i}`, amount: String((i + 1) * 10) })
    );
    expect(validateTiers(many)).toMatch(/at most 5 support levels/i);
  });

  it("accepts exactly MAX_TIERS levels", () => {
    const exactly = Array.from({ length: MAX_TIERS }, (_, i) =>
      level({ name: `Level ${i}`, amount: String((i + 1) * 10) })
    );
    expect(validateTiers(exactly)).toBeNull();
  });

  it("rejects two levels starting at the same amount", () => {
    const message = validateTiers([level({ amount: "250" }), level({ name: "Other", amount: "250" })]);
    expect(message).toMatch(/already starts at 250 CC/i);
  });

  it("rejects a missing name", () => {
    expect(validateTiers([level({ name: "   " })])).toMatch(/needs a name/i);
  });

  it("rejects a name longer than 100 characters", () => {
    expect(validateTiers([level({ name: "x".repeat(101) })])).toMatch(/100 characters/i);
  });

  it("accepts a name of exactly 100 characters", () => {
    expect(validateTiers([level({ name: "x".repeat(100) })])).toBeNull();
  });

  it("rejects a minimum of 0", () => {
    expect(validateTiers([level({ amount: "0" })])).toMatch(/above 0 CC/i);
  });

  it("rejects a negative minimum", () => {
    expect(validateTiers([level({ amount: "-50" })])).toMatch(/above 0 CC/i);
  });

  it("rejects a non-numeric minimum", () => {
    expect(validateTiers([level({ amount: "abc" })])).toMatch(/above 0 CC/i);
  });

  it("rejects a fractional minimum", () => {
    // The column is INTEGER; 25.5 would be silently rounded by Postgres.
    expect(validateTiers([level({ amount: "25.5" })])).toMatch(/whole number|above 0 CC/i);
  });

  it("rejects a level whose bullets are all blank", () => {
    expect(validateTiers([level({ bullets: ["", "   "] })])).toMatch(/at least one line/i);
  });

  it("rejects a level with no bullets at all", () => {
    expect(validateTiers([level({ bullets: [] })])).toMatch(/at least one line/i);
  });

  it("reports the FIRST problem it meets, not a list", () => {
    // The forms show one message at a time, so the order has to be predictable.
    const message = validateTiers([level({ name: "" }), level({ amount: "0" })]);
    expect(message).toMatch(/needs a name/i);
  });

  it("treats a non-array as empty rather than throwing", () => {
    expect(validateTiers(undefined)).toBeNull();
    expect(validateTiers(null)).toBeNull();
  });
});

describe("meetsMinimum", () => {
  const tier = { minAmount: 250 };

  it("is true when the amount is exactly the minimum", () => {
    // The boundary is the whole point: "250 CC or more" must accept 250.
    expect(meetsMinimum(250, tier)).toBe(true);
  });

  it("is true above the minimum", () => {
    expect(meetsMinimum(251, tier)).toBe(true);
  });

  it("is false below the minimum", () => {
    expect(meetsMinimum(249, tier)).toBe(false);
  });

  it("is true when no level is selected — 'just support' has no floor", () => {
    expect(meetsMinimum(1, null)).toBe(true);
    expect(meetsMinimum(1, undefined)).toBe(true);
  });

  it("reads min_amount too, so an unmapped API row still works", () => {
    expect(meetsMinimum(250, { min_amount: 250 })).toBe(true);
    expect(meetsMinimum(249, { min_amount: 250 })).toBe(false);
  });
});
