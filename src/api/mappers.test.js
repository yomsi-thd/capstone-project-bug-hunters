import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toNumber,
  fundedPercent,
  daysLeftFrom,
  toCard,
  toDetail,
  toCreatorProject,
  toAdminProject,
  toApprovalProject,
  toAdminUser,
  toInvestment,
} from "./mappers";

// A project row as Postgres actually returns it through node-postgres: note that
// numeric columns arrive as STRINGS, and team_members is already parsed jsonb.
function projectRow(overrides = {}) {
  return {
    id: 4,
    creator_id: 14,
    title: "Autonomous Swarm Drones",
    description: "Coordinated drones for disaster mapping.",
    goal_amount: "15000.00",
    current_amount: "500.00",
    image_url: "https://example.test/drone.jpg",
    category: "ENGINEERING",
    status: "APPROVED",
    start_date: null,
    end_date: null,
    created_at: "2026-08-05T02:45:00.000Z",
    updated_at: "2026-08-05T02:46:00.000Z",
    team_members: [{ name: "David Chen", role: "Lead Researcher" }],
    ...overrides,
  };
}

describe("toNumber", () => {
  it("parses the strings Postgres returns for numeric columns", () => {
    expect(toNumber("5000.00")).toBe(5000);
    expect(toNumber("0.00")).toBe(0);
  });

  it("falls back to 0 rather than producing NaN", () => {
    // NaN would leak into the UI as "NaN%" or a broken progress bar.
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("not a number")).toBe(0);
    expect(toNumber({})).toBe(0);
  });
});

describe("fundedPercent", () => {
  it("computes a percentage from the string amounts", () => {
    expect(fundedPercent("500.00", "15000.00")).toBe(3);
    expect(fundedPercent("7500.00", "15000.00")).toBe(50);
  });

  it("returns 0 instead of Infinity when the goal is 0 or missing", () => {
    expect(fundedPercent("500.00", "0.00")).toBe(0);
    expect(fundedPercent("500.00", null)).toBe(0);
  });

  it("does not cap above 100 — an overfunded project stays overfunded", () => {
    expect(fundedPercent("30000.00", "15000.00")).toBe(200);
  });
});

describe("daysLeftFrom", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when there is no end date", () => {
    // createProject never writes end_date, so this is the everyday case.
    expect(daysLeftFrom(null)).toBeNull();
    expect(daysLeftFrom(undefined)).toBeNull();
    expect(daysLeftFrom("")).toBeNull();
  });

  it("returns null for an unparseable date", () => {
    expect(daysLeftFrom("not-a-date")).toBeNull();
  });

  it("counts the days remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T00:00:00.000Z"));
    expect(daysLeftFrom("2026-08-15T00:00:00.000Z")).toBe(10);
  });

  it("clamps a past deadline to 0 instead of going negative", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T00:00:00.000Z"));
    expect(daysLeftFrom("2026-07-01T00:00:00.000Z")).toBe(0);
  });
});

describe("toCard", () => {
  it("maps a row onto the shape ProjectCard expects", () => {
    expect(toCard(projectRow())).toEqual({
      id: 4,
      tag: "ENGINEERING",
      title: "Autonomous Swarm Drones",
      desc: "Coordinated drones for disaster mapping.",
      img: "https://example.test/drone.jpg",
      funded: 3,
      large: false,
      status: "APPROVED",
      ownerId: 14,
      createdAt: "2026-08-05T02:45:00.000Z",
    });
  });

  it("uppercases the tag so TAG_COLORS can key on it", () => {
    // Hiếu's older rows use mixed case ("Education", "Business").
    expect(toCard(projectRow({ category: "Education" })).tag).toBe("EDUCATION");
    expect(toCard(projectRow({ category: null })).tag).toBe("UNCATEGORIZED");
  });

  it("turns an empty image_url into null so the caller can skip the <img>", () => {
    expect(toCard(projectRow({ image_url: "" })).img).toBeNull();
  });

  it("returns null for a missing row", () => {
    expect(toCard(null)).toBeNull();
  });
});

describe("toDetail", () => {
  it("exposes numeric stats, not the raw strings", () => {
    const d = toDetail(projectRow());
    expect(d.stats.raised).toBe(500);
    expect(d.stats.goal).toBe(15000);
    expect(d.stats.funded).toBe(3);
  });

  it("nulls out every field the backend cannot supply", () => {
    const d = toDetail(projectRow());
    expect(d.creator).toBeNull();
    expect(d.stats.backers).toBeNull();
    expect(d.stats.daysLeft).toBeNull();
    expect(d.challenge).toBeNull();
    expect(d.solution).toBeNull();
    expect(d.funding).toBeNull();
    expect(d.endorsed).toBe(false);
    expect(d.gallery).toEqual([]);
    expect(d.totalComments).toBe(0);
  });

  it("uses description as the About text and keeps team_members", () => {
    const d = toDetail(projectRow());
    expect(d.about).toBe("Coordinated drones for disaster mapping.");
    expect(d.teamMembers).toEqual([{ name: "David Chen", role: "Lead Researcher" }]);
  });

  it("defends against team_members not being an array", () => {
    expect(toDetail(projectRow({ team_members: null })).teamMembers).toEqual([]);
  });

  it("carries creator_id through as ownerId for the edit-vs-invest CTA", () => {
    expect(toDetail(projectRow()).ownerId).toBe(14);
  });
});

describe("toCreatorProject", () => {
  it("maps backend statuses onto the creator labels", () => {
    expect(toCreatorProject(projectRow({ status: "APPROVED" })).status).toBe("Active");
    expect(toCreatorProject(projectRow({ status: "PENDING" })).status).toBe("Pending Review");
    expect(toCreatorProject(projectRow({ status: "REJECTED" })).status).toBe("Rejected");
  });

  it("passes an unknown status through instead of dropping it", () => {
    expect(toCreatorProject(projectRow({ status: "ARCHIVED" })).status).toBe("ARCHIVED");
  });

  it("formats money as strings, because the page parses them back", () => {
    // CreatorMyProjects does parseFloat(p.raised.replace(/[$,]/g, "")).
    const p = toCreatorProject(projectRow({ current_amount: "10625.00", goal_amount: "12500.00" }));
    expect(p.raised).toBe("$10,625");
    expect(p.goal).toBe("$12,500");
    expect(typeof p.raised).toBe("string");
  });

  it("title-cases the department so DEPT_STYLE can key on it", () => {
    expect(toCreatorProject(projectRow({ category: "ENGINEERING" })).dept).toBe("Engineering");
  });
});

describe("toAdminProject", () => {
  it("maps statuses onto the admin labels", () => {
    expect(toAdminProject(projectRow({ status: "APPROVED" })).status).toBe("Active");
    expect(toAdminProject(projectRow({ status: "PENDING" })).status).toBe("Pending");
    expect(toAdminProject(projectRow({ status: "REJECTED" })).status).toBe("Rejected");
  });

  it("stands in a placeholder creator because the API returns only an id", () => {
    expect(toAdminProject(projectRow()).creator).toBe("Creator #14");
  });
});

describe("toApprovalProject", () => {
  it("says the duration is not set when the dates are missing", () => {
    expect(toApprovalProject(projectRow()).duration).toBe("Not set");
  });

  it("shows the range once both dates exist", () => {
    const row = projectRow({ start_date: "2026-08-01", end_date: "2026-09-01" });
    expect(toApprovalProject(row).duration).toBe("2026-08-01 → 2026-09-01");
  });

  it("uppercases the department for ADMIN_APPROVAL_DEPT_STYLE", () => {
    expect(toApprovalProject(projectRow({ category: "science" })).dept).toBe("SCIENCE");
  });
});

describe("toAdminUser", () => {
  const userRow = (overrides = {}) => ({
    id: 15,
    full_name: "Huy Test Admin",
    email: "huy-test-admin@test.com",
    is_active: true,
    roles: ["ADMIN", "BACKER"],
    ...overrides,
  });

  it("title-cases and joins the roles array", () => {
    expect(toAdminUser(userRow()).role).toBe("Admin, Backer");
  });

  it("shows a dash for a user with no roles", () => {
    // user id 12 in the shared database really is in this state.
    expect(toAdminUser(userRow({ roles: [] })).role).toBe("—");
    expect(toAdminUser(userRow({ roles: undefined })).role).toBe("—");
  });

  it("maps the is_active boolean onto the two statuses the API can express", () => {
    expect(toAdminUser(userRow({ is_active: true })).status).toBe("Active");
    expect(toAdminUser(userRow({ is_active: false })).status).toBe("Inactive");
    expect(toAdminUser(userRow({ is_active: false })).isActive).toBe(false);
  });
});

describe("toInvestment", () => {
  const tx = {
    id: 1,
    classcoin_id: 4,
    project_id: 4,
    type: "INVEST",
    amount: 500,
    created_at: "2026-08-05T02:46:36.210Z",
  };

  it("merges a transaction with its project", () => {
    const inv = toInvestment(tx, projectRow());
    expect(inv.projectId).toBe(4);
    expect(inv.title).toBe("Autonomous Swarm Drones");
    expect(inv.investedAmount).toBe(500);
    expect(inv.fundingProgress).toBe(3);
    expect(inv.investmentDate).toMatch(/Aug \d{2}, 2026/);
  });

  it("still renders when the project is gone", () => {
    // GET /projects/:id can 404 for a deleted project; the card must not blow up.
    const inv = toInvestment(tx, null);
    expect(inv.title).toBe("Project #4");
    expect(inv.tag).toBe("UNCATEGORIZED");
    expect(inv.fundingProgress).toBe(0);
    expect(inv.investedAmount).toBe(500);
  });
});
