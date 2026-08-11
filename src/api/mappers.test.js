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
  toProjectUpdate,
  toCommentThread,
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

// The same row after an admin archived it. `status` is deliberately still APPROVED —
// archiving does not touch the moderation verdict, which is what lets restore put the
// project straight back on Discover without a second approval.
function archivedRow(overrides = {}) {
  return projectRow({
    archived_at: "2026-08-11T04:20:00.000Z",
    archived_by: 9,
    archived_by_name: "Admin Nguyen",
    archive_reason: "Duplicate submission",
    ...overrides,
  });
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

  it("reads the creator name and backer count off the joined row", () => {
    const d = toDetail(projectRow({ creator_name: "Huy Test Creator", backers_count: 3 }));
    expect(d.creator).toEqual({ name: "Huy Test Creator", role: "Project Creator" });
    expect(d.stats.backers).toBe(3);
  });

  it("keeps a real zero backer count instead of turning it into null", () => {
    // 0 is falsy — the check has to be against null, or a project nobody backed
    // would render the "not supplied by the API" placeholder.
    expect(toDetail(projectRow({ backers_count: 0 })).stats.backers).toBe(0);
  });

  it("maps the three story columns onto the About sections", () => {
    // The column is funding_usage; the UI prop has always been `funding`.
    const d = toDetail(projectRow({
      challenge: "Rescue teams cannot map a collapsed site fast enough.",
      solution: "A swarm that divides the area between units.",
      funding_usage: "Airframes, LiDAR units and flight-test hours.",
    }));
    expect(d.challenge).toBe("Rescue teams cannot map a collapsed site fast enough.");
    expect(d.solution).toBe("A swarm that divides the area between units.");
    expect(d.funding).toBe("Airframes, LiDAR units and flight-test hours.");
  });

  it("treats an empty story column as absent so the section is skipped", () => {
    // ProjectDetail renders each section on truthiness — "" must not open an empty one.
    const d = toDetail(projectRow({ challenge: "", solution: "", funding_usage: "" }));
    expect(d.challenge).toBeNull();
    expect(d.solution).toBeNull();
    expect(d.funding).toBeNull();
  });

  it("nulls out every field the backend cannot supply", () => {
    const d = toDetail(projectRow());
    // No join columns on this fixture — a deleted creator row looks the same.
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

describe("toCommentThread", () => {
  const row = (over = {}) => ({
    id: 1,
    project_id: 4,
    user_id: 25,
    parent_id: null,
    body: "Does it export to CAD?",
    author_name: "Test Lecturer",
    author_role: "BACKER",
    created_at: new Date().toISOString(),
    ...over,
  });

  it("nests replies under their parent and drops nothing", () => {
    const thread = toCommentThread([
      row({ id: 1 }),
      row({ id: 2, parent_id: 1, body: "Yes — .PLY and .LAS.", author_name: "Test Student", author_role: "CREATOR" }),
    ]);
    expect(thread).toHaveLength(1);
    expect(thread[0].replies).toHaveLength(1);
    expect(thread[0].replies[0].role).toBe("CREATOR");
  });

  it("puts the newest thread first but keeps replies oldest-first", () => {
    const thread = toCommentThread([
      row({ id: 1, body: "older" }),
      row({ id: 2, body: "newer" }),
      row({ id: 3, parent_id: 1, body: "reply A" }),
      row({ id: 4, parent_id: 1, body: "reply B" }),
    ]);
    // CommentItem reads `text`, not `body` — the mapper renames it.
    expect(thread.map(c => c.text)).toEqual(["newer", "older"]);
    expect(thread[1].replies.map(r => r.text)).toEqual(["reply A", "reply B"]);
  });

  it("survives a reply whose parent is missing", () => {
    // comments.user_id is SET NULL and a parent can vanish between requests; an
    // orphaned reply must not throw.
    expect(() => toCommentThread([row({ id: 9, parent_id: 999 })])).not.toThrow();
    expect(toCommentThread([row({ id: 9, parent_id: 999 })])).toEqual([]);
  });

  it("names a deleted author rather than rendering nothing", () => {
    expect(toCommentThread([row({ author_name: null })])[0].author).toBe("Deleted user");
  });
});

describe("toProjectUpdate", () => {
  const updateRow = (over = {}) => ({
    id: 7,
    project_id: 6,
    title: "Prototype Phase 1 Completed",
    body: "First pavilion assembled on campus.",
    author_name: "Test Student",
    created_at: "2026-08-06T05:29:26.910Z",
    ...over,
  });

  it("maps a row onto the Updates tab entry", () => {
    expect(toProjectUpdate(updateRow())).toEqual({
      id: 7,
      title: "Prototype Phase 1 Completed",
      body: "First pavilion assembled on campus.",
      author: "Test Student",
      postedOn: "Aug 06, 2026",
    });
  });

  it("falls back when the author row was deleted", () => {
    // project_updates.author_id is ON DELETE SET NULL, so the join really can be empty.
    expect(toProjectUpdate(updateRow({ author_name: null })).author).toBe("Unknown creator");
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

  it("formats amounts in Class Coins, as strings the pages parse back", () => {
    // CreatorMyProjects and EditProject strip non-digits back out of these.
    const p = toCreatorProject(projectRow({ current_amount: "10625.00", goal_amount: "12500.00" }));
    expect(p.raised).toBe("10,625 CC");
    expect(p.goal).toBe("12,500 CC");
    expect(typeof p.raised).toBe("string");
  });

  it("never labels an amount in dollars — CC has no real-world value", () => {
    const p = toCreatorProject(projectRow());
    expect(p.raised).not.toContain("$");
    expect(p.goal).not.toContain("$");
  });

  it("title-cases the department so DEPT_STYLE can key on it", () => {
    expect(toCreatorProject(projectRow({ category: "ENGINEERING" })).dept).toBe("Engineering");
  });

  it("carries the story columns through as strings for the edit modal", () => {
    // EditProject binds these straight to <textarea value=…>, so null would make the
    // input uncontrolled and React would warn.
    const p = toCreatorProject(projectRow({ challenge: "A problem", funding_usage: "Lab time" }));
    expect(p.challenge).toBe("A problem");
    expect(p.funding).toBe("Lab time");
    expect(toCreatorProject(projectRow()).solution).toBe("");
  });
});

describe("toAdminProject", () => {
  it("maps statuses onto the admin labels", () => {
    expect(toAdminProject(projectRow({ status: "APPROVED" })).status).toBe("Active");
    expect(toAdminProject(projectRow({ status: "PENDING" })).status).toBe("Pending");
    expect(toAdminProject(projectRow({ status: "REJECTED" })).status).toBe("Rejected");
  });

  it("uses the joined creator name, falling back to the id", () => {
    expect(toAdminProject(projectRow({ creator_name: "Huy Test Creator" })).creator).toBe("Huy Test Creator");
    expect(toAdminProject(projectRow()).creator).toBe("Creator #14");
  });
});

describe("toApprovalProject", () => {
  it("says the duration is not set when the dates are missing", () => {
    expect(toApprovalProject(projectRow()).duration).toBe("Not set");
  });

  it("shows the range once both dates exist", () => {
    // createProject writes full timestamps, so the raw values would render as
    // "2026-08-01T00:00:00.000Z → …" in the table.
    const row = projectRow({ start_date: "2026-08-01T00:00:00.000Z", end_date: "2026-09-01T00:00:00.000Z" });
    expect(toApprovalProject(row).duration).toBe("Aug 01, 2026 → Sep 01, 2026");
  });

  it("uses the joined creator name and email, falling back to the id", () => {
    const joined = projectRow({ creator_name: "Huy Test Creator", creator_email: "creator@test.com" });
    expect(toApprovalProject(joined).creator).toBe("Huy Test Creator");
    expect(toApprovalProject(joined).email).toBe("creator@test.com");
    // A deleted creator row leaves the join columns null.
    expect(toApprovalProject(projectRow()).creator).toBe("Creator #14");
    expect(toApprovalProject(projectRow()).email).toBe("");
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
    expect(inv.archived).toBe(false);
  });

  it("badges an investment in an archived project instead of dropping it", () => {
    // Archiving must never erase somebody's spend history — the card stays, marked.
    const inv = toInvestment(tx, archivedRow());
    expect(inv.archived).toBe(true);
    expect(inv.investedAmount).toBe(500);
    expect(inv.title).toBe("Autonomous Swarm Drones");
  });
});

// The archive columns, added 2026-08-11 when delete was replaced by a two-step bin.
// The point of these is that archiving is a SECOND axis: it must never disturb the
// moderation status, because restore relies on that status surviving untouched.
describe("archive fields", () => {
  it("reports a live project as not archived, with no stray metadata", () => {
    for (const mapped of [toDetail(projectRow()), toCreatorProject(projectRow()), toAdminProject(projectRow())]) {
      expect(mapped.archived).toBe(false);
      expect(mapped.archivedBy).toBeNull();
      expect(mapped.archivedByName).toBeNull();
      expect(mapped.archiveReason).toBeNull();
      expect(mapped.archivedAt).toBe("");
    }
  });

  it("carries who archived it, when and why", () => {
    const d = toDetail(archivedRow());
    expect(d.archived).toBe(true);
    expect(d.archivedBy).toBe(9);
    expect(d.archivedByName).toBe("Admin Nguyen");
    expect(d.archiveReason).toBe("Duplicate submission");
    expect(d.archivedAt).toMatch(/Aug \d{2}, 2026/);
  });

  it("keeps archivedBy as the raw id, since CreatorMyProjects compares it to user.id", () => {
    // A creator may only restore an archive they performed themselves. That check is
    // `archivedBy === user.id`, so this must stay a number and never become a name.
    const c = toCreatorProject(archivedRow({ archived_by: 14 }));
    expect(c.archivedBy).toBe(14);
    expect(typeof c.archivedBy).toBe("number");
  });

  it("leaves the moderation status alone — archived is a separate axis", () => {
    // The whole reason restore needs no re-approval: `status` survives the round trip.
    expect(toDetail(archivedRow()).status).toBe("APPROVED");
    expect(toCreatorProject(archivedRow()).status).toBe("Active");
    expect(toAdminProject(archivedRow()).status).toBe("Active");
    expect(toAdminProject(archivedRow({ status: "PENDING" })).status).toBe("Pending");
  });

  it("carries the reviewer's rejection note to the creator's card", () => {
    const c = toCreatorProject(projectRow({ status: "REJECTED", review_note: "Goal is unrealistic." }));
    expect(c.status).toBe("Rejected");
    expect(c.reviewNote).toBe("Goal is unrealistic.");
  });

  it("maps an absent or empty review note to null, not an empty string", () => {
    // The queue's one-click REJECT stores no note, so this is a normal state — the card
    // branches on it to say "The board did not leave a note."
    expect(toCreatorProject(projectRow({ status: "REJECTED" })).reviewNote).toBeNull();
    expect(toCreatorProject(projectRow({ status: "REJECTED", review_note: "" })).reviewNote).toBeNull();
  });

  it("survives a row whose archiver was deleted (archived_by is ON DELETE SET NULL)", () => {
    const d = toDetail(archivedRow({ archived_by: null, archived_by_name: null }));
    expect(d.archived).toBe(true);
    expect(d.archivedBy).toBeNull();
    expect(d.archivedByName).toBeNull();
  });
});
