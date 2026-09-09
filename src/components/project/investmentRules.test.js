import { describe, it, expect } from "vitest";
import { MAX_CONTRIBUTION, validateContribution } from "./investmentRules";

describe("MAX_CONTRIBUTION", () => {
  // The client's number, pinned here because three places read it: this module, the
  // modal's MAX button and the sentence under the invest button. The backend refuses
  // anything above it.
  it("is 500", () => {
    expect(MAX_CONTRIBUTION).toBe(500);
  });
});

describe("validateContribution", () => {
  it("accepts 1 through the cap", () => {
    expect(validateContribution(1, 1000)).toBeNull();
    expect(validateContribution(250, 1000)).toBeNull();
    // The boundary itself: 500 is the number backers are shown, so it must be a number
    // they can actually send.
    expect(validateContribution(MAX_CONTRIBUTION, 1000)).toBeNull();
  });

  it("refuses nothing, and refuses junk", () => {
    expect(validateContribution(0, 1000)).toBe("Enter an amount above 0 CC.");
    expect(validateContribution(-50, 1000)).toBe("Enter an amount above 0 CC.");
    expect(validateContribution("", 1000)).toBe("Enter an amount above 0 CC.");
    expect(validateContribution("abc", 1000)).toBe("Enter an amount above 0 CC.");
  });

  it("refuses more than the cap", () => {
    expect(validateContribution(MAX_CONTRIBUTION + 1, 1000)).toBe(
      "A contribution can be at most 500 CC."
    );
  });

  // A wallet problem is not a cap problem, and answering the wrong one is how a person
  // ends up hunting for a rule they never hit.
  it("names the balance first when the wallet is the real obstacle", () => {
    expect(validateContribution(400, 200)).toBe("That is more than your balance.");
    // Even above the cap: 900 CC from a 200 CC wallet is still a balance problem.
    expect(validateContribution(900, 200)).toBe("That is more than your balance.");
  });

  it("accepts spending the whole wallet when it is under the cap", () => {
    expect(validateContribution(200, 200)).toBeNull();
  });
});
