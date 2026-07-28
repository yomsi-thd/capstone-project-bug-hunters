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

  it("gives an admin (superuser) Admin Dashboard, My Projects and My Investments", () => {
    const l = labels({ roles: ["admin"] });
    expect(l).toContain("Admin Dashboard");
    // Admin is a superuser: canCreate is true, so it also manages projects.
    expect(l).toContain("My Projects");
    expect(l).toContain("My Investments");
  });

  it("always ends with the Departments and About links", () => {
    const l = labels({ roles: ["backer"] });
    expect(l.slice(-2)).toEqual(["Departments", "About"]);
  });
});
