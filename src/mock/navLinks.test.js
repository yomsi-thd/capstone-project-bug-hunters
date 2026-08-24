import { describe, it, expect } from "vitest";
import { getNavLinksForUser } from "./navLinks";

const labels = (user) => getNavLinksForUser(user).map((l) => l.label);

describe("getNavLinksForUser", () => {
  it("shows only public links when logged out", () => {
    expect(labels(null)).toEqual(["Discover", "Departments", "About"]);
  });

  it("gives a backer + creator both My Projects and My Investments", () => {
    const l = labels({ roles: ["backer", "creator"] });
    expect(l).toContain("My Projects");
    expect(l).toContain("My Investments");
    expect(l).not.toContain("Admin Dashboard");
  });

  it("gives a pure creator My Projects but not My Investments", () => {
    const l = labels({ roles: ["creator"] });
    expect(l).toContain("My Projects");
    expect(l).not.toContain("My Investments");
  });

  it("gives an admin Admin Dashboard and NOTHING of their own", () => {
    const l = labels({ roles: ["admin"] });
    expect(l).toContain("Admin Dashboard");
    // Both of these were here before the 2026-08-24 role separation. An admin owns no
    // projects and holds no Class Coins now, so each link pointed at an empty page —
    // and /creator-my-projects is behind canCreate, which an admin no longer has, so
    // My Projects would have landed on the "no access" screen.
    expect(l).not.toContain("My Projects");
    expect(l).not.toContain("My Investments");
  });

  it("always ends with the Departments and About links", () => {
    const l = labels({ roles: ["backer"] });
    expect(l.slice(-2)).toEqual(["Departments", "About"]);
  });
});
