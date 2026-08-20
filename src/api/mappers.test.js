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
  toBacker,
  toProfile,
  toInvestment,
  toProjectUpdate,
  toCommentThread,
  toTier,
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
      // Null here because projectRow() has no end_date — Discover's "Ending soon"
      // sort pushes those to the back rather than treating them as ending today.
      daysLeft: null,
    });
  });

  it("carries daysLeft so Discover can sort by which campaign closes first", () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect(toCard(projectRow({ end_date: future })).daysLeft).toBe(5);
    // A closed campaign is 0, not a negative number.
    const past = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(toCard(projectRow({ end_date: past })).daysLeft).toBe(0);
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

  it("carries the backer and comment counts the creator dashboard totals up", () => {
    // GET /projects/my started returning both on 2026-08-18; before that the dashboard
    // showed "—" in every stat card.
    const p = toCreatorProject(projectRow({ backers_count: 3, comments_count: 7 }));
    expect(p.backers).toBe(3);
    expect(p.commentsCount).toBe(7);
  });

  it("keeps a real zero as 0 and a missing count as null", () => {
    // The check has to be `== null`, not falsy: a project nobody has backed yet has 0
    // backers, and rendering that as "—" would read as "we don't know".
    const none = toCreatorProject(projectRow({ backers_count: 0, comments_count: 0 }));
    expect(none.backers).toBe(0);
    expect(none.commentsCount).toBe(0);

    const missing = toCreatorProject(projectRow());
    expect(missing.backers).toBeNull();
    expect(missing.commentsCount).toBeNull();
  });
});

describe("toBacker", () => {
  const backerRow = (overrides = {}) => ({
    user_id: 31,
    full_name: "Priya Sharma",
    // SUM()::int comes back as a number, but COUNT/SUM over numeric would be a string —
    // the same node-postgres trap the amounts have, so the mapper coerces anyway.
    total_amount: 750,
    project_count: 2,
    last_invested_at: "2026-08-14T09:15:00.000Z",
    ...overrides,
  });

  it("formats the total in Class Coins, never dollars", () => {
    const b = toBacker(backerRow({ total_amount: 1250 }));
    expect(b.amount).toBe("1,250 CC");
    expect(b.amount).not.toContain("$");
  });

  it("coerces a string total, the way node-postgres returns numerics", () => {
    expect(toBacker(backerRow({ total_amount: "750" })).amountValue).toBe(750);
  });

  it("names the person, falling back to the id if the row lost its join", () => {
    expect(toBacker(backerRow()).name).toBe("Priya Sharma");
    expect(toBacker(backerRow({ full_name: null })).name).toBe("Backer #31");
  });

  it("pluralises the project count", () => {
    expect(toBacker(backerRow({ project_count: 1 })).projectsLabel).toBe("1 project");
    expect(toBacker(backerRow({ project_count: 2 })).projectsLabel).toBe("2 projects");
  });

  it("has no support level when the person never chose one", () => {
    // The common case by far: every investment made before 2026-08-20, plus every
    // "No level — just support" choice. The LEFT JOIN leaves both columns NULL.
    expect(toBacker(backerRow({ top_tier_name: null, top_tier_min: null })).topTier).toBeNull();
    // Absent entirely, e.g. an older cached response.
    expect(toBacker(backerRow()).topTier).toBeNull();
  });

  it("carries the highest level the person chose", () => {
    const b = toBacker(backerRow({ top_tier_name: "Pilot partner", top_tier_min: 250 }));
    expect(b.topTier).toEqual({ name: "Pilot partner", minAmount: 250 });
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

  it("also hands back the raw uppercase roles the edit checkboxes bind to", () => {
    // `role` above is a display string; PATCH /admin/users/:id/roles wants the array.
    expect(toAdminUser(userRow()).roles).toEqual(["ADMIN", "BACKER"]);
    expect(toAdminUser(userRow({ roles: undefined })).roles).toEqual([]);
  });

  it("invents no student id and no project assignment", () => {
    // Both used to be filled in — studentId was "#15" and project was always
    // "Unassigned" — which put numbers on screen that exist nowhere in the database.
    const u = toAdminUser(userRow());
    expect(u.studentId).toBeUndefined();
    expect(u.project).toBeUndefined();
  });

  it("maps the is_active boolean onto the two statuses the API can express", () => {
    expect(toAdminUser(userRow({ is_active: true })).status).toBe("Active");
    expect(toAdminUser(userRow({ is_active: false })).status).toBe("Inactive");
    expect(toAdminUser(userRow({ is_active: false })).isActive).toBe(false);
  });
});

describe("toProfile", () => {
  const profileRow = (overrides = {}) => ({
    id: 21,
    full_name: "Test Student",
    email: "TestStudent@test.com",
    title: "Final-year student, School of Engineering",
    is_active: true,
    created_at: "2026-07-14T03:20:00.000Z",
    ...overrides,
  });

  it("maps the row onto the Account page's shape", () => {
    const p = toProfile(profileRow());
    expect(p.id).toBe(21);
    expect(p.name).toBe("Test Student");
    expect(p.email).toBe("TestStudent@test.com");
    expect(p.title).toBe("Final-year student, School of Engineering");
    expect(p.joinedOn).toBeTruthy();
  });

  // The three text fields are bound to controlled inputs, so null would make them
  // uncontrolled and React would warn as soon as the user typed.
  it("turns missing text columns into empty strings, never null", () => {
    const p = toProfile(profileRow({ title: null, full_name: null, email: null }));
    expect(p.title).toBe("");
    expect(p.name).toBe("");
    expect(p.email).toBe("");
  });

  it("returns null for a missing row rather than an empty object", () => {
    expect(toProfile(null)).toBeNull();
    expect(toProfile(undefined)).toBeNull();
  });

  it("leaves the join date empty when the column is null", () => {
    expect(toProfile(profileRow({ created_at: null })).joinedOn).toBe("");
  });

  it("treats a missing is_active as active", () => {
    expect(toProfile(profileRow({ is_active: undefined })).isActive).toBe(true);
    expect(toProfile(profileRow({ is_active: false })).isActive).toBe(false);
  });
});

// GET /classcoins/investments returns one row per PROJECT, already grouped and joined —
// it replaced "read every transaction, then fetch each project" on 2026-08-18. So this
// mapper takes one row, not a (transaction, project) pair.
describe("toInvestment", () => {
  const investmentRow = (overrides = {}) => ({
    project_id: 4,
    title: "Autonomous Swarm Drones",
    description: "Coordinated drones for disaster mapping.",
    category: "ENGINEERING",
    image_url: "https://example.test/drone.jpg",
    current_amount: "500.00",
    goal_amount: "15000.00",
    status: "APPROVED",
    archived_at: null,
    invested_amount: 500,
    investment_count: 1,
    first_invested_at: "2026-08-05T02:46:36.210Z",
    last_invested_at: "2026-08-05T02:46:36.210Z",
    ...overrides,
  });

  it("maps a grouped row onto the investment card", () => {
    const inv = toInvestment(investmentRow());
    expect(inv.projectId).toBe(4);
    expect(inv.title).toBe("Autonomous Swarm Drones");
    expect(inv.investedAmount).toBe(500);
    expect(inv.fundingProgress).toBe(3);
    expect(inv.investmentDate).toMatch(/Aug \d{2}, 2026/);
  });

  it("totals repeat investments into one card and counts them", () => {
    // The old page rendered one card per transaction, so backing the same project
    // three times produced three cards that looked identical.
    const inv = toInvestment(investmentRow({ invested_amount: 900, investment_count: 3 }));
    expect(inv.investedAmount).toBe(900);
    expect(inv.investmentCount).toBe(3);
  });

  it("uppercases the tag and survives a missing category", () => {
    expect(toInvestment(investmentRow({ category: "Education" })).tag).toBe("EDUCATION");
    expect(toInvestment(investmentRow({ category: null })).tag).toBe("UNCATEGORIZED");
  });

  it("badges an investment in an archived project instead of dropping it", () => {
    // Archiving must never erase somebody's spend history — the card stays, marked.
    const inv = toInvestment(investmentRow({ archived_at: "2026-08-11T10:00:00.000Z" }));
    expect(inv.archived).toBe(true);
    expect(inv.investedAmount).toBe(500);
    expect(inv.title).toBe("Autonomous Swarm Drones");
  });

  it("coerces the numeric strings node-postgres hands back", () => {
    const inv = toInvestment(investmentRow({ invested_amount: "750", current_amount: "7500.00" }));
    expect(inv.investedAmount).toBe(750);
    expect(inv.fundingProgress).toBe(50);
  });
});

// The archive columns, added 2026-08-11 when delete was replaced by a two-step bin.
// The point of these is that archiving is a SECOND axis: it must never disturb the
// moderation status, because restore relies on that status surviving untouched.
describe("toInvestment support level", () => {
  const row = (overrides = {}) => ({
    project_id: 4,
    title: "Autonomous Swarm Drones",
    description: "Coordinated drones for disaster mapping.",
    category: "ENGINEERING",
    image_url: null,
    current_amount: "500.00",
    goal_amount: "15000.00",
    status: "APPROVED",
    archived_at: null,
    invested_amount: 500,
    investment_count: 1,
    first_invested_at: "2026-08-05T02:46:36.210Z",
    last_invested_at: "2026-08-05T02:46:36.210Z",
    ...overrides,
  });

  it("is null when no level was chosen", () => {
    expect(toInvestment(row()).topTier).toBeNull();
    expect(toInvestment(row({ top_tier_name: null, top_tier_min: null })).topTier).toBeNull();
  });

  it("carries the highest level chosen for the project", () => {
    expect(toInvestment(row({ top_tier_name: "Advocate", top_tier_min: 50 })).topTier)
      .toEqual({ name: "Advocate", minAmount: 50 });
  });

  it("coerces the minimum, since node-postgres has handed this codebase strings before", () => {
    expect(toInvestment(row({ top_tier_name: "Advocate", top_tier_min: "50" })).topTier.minAmount).toBe(50);
  });
});

describe("toTier", () => {
  const tierRow = (overrides = {}) => ({
    id: 3,
    project_id: 4,
    name: "Pilot partner",
    min_amount: 250,
    bullets: ["I want the team to install a trial unit in my area."],
    is_active: true,
    backers_count: 12,
    created_at: "2026-08-20T02:00:00.000Z",
    ...overrides,
  });

  it("maps a level onto the shape the UI reads", () => {
    const t = toTier(tierRow());
    expect(t.id).toBe(3);
    expect(t.name).toBe("Pilot partner");
    expect(t.minAmount).toBe(250);
    expect(t.bullets).toEqual(["I want the team to install a trial unit in my area."]);
    expect(t.backersCount).toBe(12);
    expect(t.isActive).toBe(true);
  });

  it("coerces min_amount and backers_count to numbers", () => {
    // COUNT() and INTEGER columns have both arrived as strings from node-postgres in
    // this codebase, and the resulting bugs were silent.
    const t = toTier(tierRow({ min_amount: "250", backers_count: "12" }));
    expect(t.minAmount).toBe(250);
    expect(t.backersCount).toBe(12);
  });

  it("reports 0 backers rather than NaN when nobody has chosen it", () => {
    expect(toTier(tierRow({ backers_count: 0 })).backersCount).toBe(0);
    expect(toTier(tierRow({ backers_count: null })).backersCount).toBe(0);
  });

  it("always hands back an array of bullets", () => {
    expect(toTier(tierRow({ bullets: null })).bullets).toEqual([]);
    expect(toTier(tierRow({ bullets: undefined })).bullets).toEqual([]);
  });

  it("treats a hidden level as inactive", () => {
    expect(toTier(tierRow({ is_active: false })).isActive).toBe(false);
  });
});

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
