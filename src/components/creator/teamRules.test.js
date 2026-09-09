import { describe, it, expect } from "vitest";

import { validateTeamMember } from "./teamRules";

describe("validateTeamMember", () => {
  it("accepts a name with a valid email", () => {
    expect(validateTeamMember({ name: "Mai", email: "mai@example.com" })).toBeNull();
  });

  // A member with no account has nothing to stop, so an address is not required.
  it("accepts a name with no email at all", () => {
    expect(validateTeamMember({ name: "Mai" })).toBeNull();
    expect(validateTeamMember({ name: "Mai", email: "" })).toBeNull();
    expect(validateTeamMember({ name: "Mai", email: "   " })).toBeNull();
  });

  it("requires a name", () => {
    expect(validateTeamMember({ name: "", email: "mai@example.com" })).toMatch(/name/i);
    expect(validateTeamMember({ name: "   " })).toMatch(/name/i);
    expect(validateTeamMember()).toMatch(/name/i);
  });

  it("rejects something that is not an address", () => {
    expect(validateTeamMember({ name: "Mai", email: "mai" })).toMatch(/valid email/i);
    expect(validateTeamMember({ name: "Mai", email: "mai@example" })).toMatch(/valid email/i);
    expect(validateTeamMember({ name: "Mai", email: "mai example.com" })).toMatch(/valid email/i);
    expect(validateTeamMember({ name: "Mai", email: "@example.com" })).toMatch(/valid email/i);
  });

  it("ignores surrounding spaces rather than calling the address invalid", () => {
    expect(validateTeamMember({ name: "Mai", email: "  mai@example.com  " })).toBeNull();
  });

  // It never reports whether the address belongs to an account: doing so would let anyone
  // discover which addresses are registered.
  it("accepts a well-formed address that belongs to nobody", () => {
    expect(validateTeamMember({ name: "Mai", email: "nobody-at-all@example.com" })).toBeNull();
  });
});
