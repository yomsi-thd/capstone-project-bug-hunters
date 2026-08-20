// The backend returns snake_case rows straight from Postgres, while the components
// were built against the old mock shape. Every difference is absorbed here, so
// ProjectCard / FundingBar / CommentList keep the same props as before.
//
// Note: goal_amount and current_amount are Postgres `numeric`, and node-postgres
// returns those as STRINGS ("5000.00"), not numbers. Every calculation must go
// through toNumber() first or the result is wrong.

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function fundedPercent(currentAmount, goalAmount) {
  const goal = toNumber(goalAmount);
  if (goal <= 0) return 0;
  return Math.round((toNumber(currentAmount) / goal) * 100);
}

// createProject now writes start_date / end_date (defaulting to a 30-day window), so
// this returns a real number for anything created after 2026-08-06. Projects created
// before that still have both columns null and fall back to null here.
export function daysLeftFrom(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const diff = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

// TAG_COLORS is keyed by uppercase tags. Hiếu's existing rows use "Education" /
// "Business" in mixed case, so normalise here; unknown tags fall back to <Tag>'s
// default colour.
function toTag(category) {
  return (category || "UNCATEGORIZED").toUpperCase();
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

// Archive is a SECOND axis, independent of `status`. A project can be APPROVED and
// archived at the same time, which is why nothing here touches the status field.
// "Archived" is `archived_at IS NOT NULL` on the row — there is no PUBLISHED/ARCHIVED
// column — so the boolean is derived once here and every page reads `archived`.
//
// `archivedBy` stays the raw user id, not a name: CreatorMyProjects compares it to
// user.id to decide whether the creator may restore (they may only undo their own
// archive). `archivedByName` is the display string for the same person.
function toArchiveFields(row) {
  return {
    // != null, not falsy — the value is a timestamp string, but be explicit.
    archived: row.archived_at != null,
    archivedAt: formatDate(row.archived_at),
    archivedBy: row.archived_by ?? null,
    archivedByName: row.archived_by_name || null,
    archiveReason: row.archive_reason || null,
  };
}

/** Project row -> card on Discover and the listing grids. */
export function toCard(row) {
  if (!row) return null;
  return {
    id: row.id,
    tag: toTag(row.category),
    title: row.title,
    desc: row.description,
    img: row.image_url || null,
    funded: fundedPercent(row.current_amount, row.goal_amount),
    large: false,
    status: row.status,
    ownerId: row.creator_id,
    createdAt: row.created_at,
    // Feeds Discover's "Ending soon" sort. Null for anything created before
    // 2026-08-06, when createProject started writing start_date/end_date — those sort
    // to the back rather than being mistaken for campaigns closing today.
    daysLeft: daysLeftFrom(row.end_date),
  };
}

/** Project row -> the detail page. */
export function toDetail(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.creator_id,
    tag: toTag(row.category),
    title: row.title,
    status: row.status,

    // GET /projects/:id joins users for the name only — it is a public route, so the
    // creator's email is deliberately not exposed here (the admin routes return it).
    // Still null for a project whose creator row was deleted.
    creator: row.creator_name
      ? {
          name: row.creator_name,
          // users.title, e.g. "Lead Researcher, RMIT Robotics Lab". Optional, so fall
          // back to the generic label rather than leaving the line empty.
          role: row.creator_title || "Project Creator",
        }
      : null,

    stats: {
      funded: fundedPercent(row.current_amount, row.goal_amount),
      raised: toNumber(row.current_amount),
      goal: toNumber(row.goal_amount),
      daysLeft: daysLeftFrom(row.end_date),
      // Distinct wallets that invested, not the number of transactions.
      backers: row.backers_count == null ? null : toNumber(row.backers_count),
    },

    // projects.endorsed — only an admin can set it (PATCH /projects/:id/endorse).
    endorsed: Boolean(row.endorsed),

    img: row.image_url || null,
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    // The pitch video, added to `projects` on 2026-08-18. A LINK, never a file — the
    // wizard's file-upload branch was removed with it. Null for every project created
    // before that date, so the page renders the section only when there is one.
    videoUrl: row.video_url || null,

    // `description` is the short blurb (also the Discover card text); the three story
    // fields below are the long form, added to `projects` on 2026-08-06. They stay
    // optional — projects created before that have none, and each section on
    // ProjectDetail only renders when its own field has text.
    about: row.description,
    challenge: row.challenge || null,
    solution: row.solution || null,
    // [{ title, desc }] listed under "Our Solution". Empty is fine — the prose above
    // them stands on its own.
    solutionBullets: Array.isArray(row.solution_bullets) ? row.solution_bullets : [],
    // The column is `funding_usage`; the UI has always called this one `funding`.
    funding: row.funding_usage || null,

    teamMembers: Array.isArray(row.team_members) ? row.team_members : [],

    // Only the "VIEW ALL n COMMENTS" label; the rendered list comes from the separate
    // comments request.
    totalComments: toNumber(row.comments_count),

    // GET /projects/:id still returns archived projects on purpose — the page renders
    // read-only with a banner rather than 404ing, so a backer's existing investment
    // and the shared link both keep working.
    ...toArchiveFields(row),
  };
}

// Class Coins, not dollars. CC has no real-world value, so a "$" prefix was actively
// misleading — and it contradicted the Header badge, the invest modal and My Investments,
// which all speak CC already.
// Callers that parse the number back out must strip non-digits (/[^0-9.]/g), NOT just
// "$" and "," — CreatorMyProjects and EditProject both do.
function money(value) {
  return `${toNumber(value).toLocaleString("en-US")} CC`;
}

// DEPT_STYLE / CAT_STYLE are keyed in Title Case ("Engineering"), while category in
// the database is sometimes uppercase ("ENGINEERING") and sometimes not
// ("Education") -> normalise.
function toDept(category) {
  const c = (category || "General").toLowerCase();
  return c.charAt(0).toUpperCase() + c.slice(1);
}

// The backend's projects.status is PENDING / APPROVED / REJECTED; Khôi's UI uses
// different labels in the creator area and the admin area.
const CREATOR_STATUS = { APPROVED: "Active", PENDING: "Pending Review", REJECTED: "Rejected" };
const ADMIN_STATUS = { APPROVED: "Active", PENDING: "Pending", REJECTED: "Rejected" };

/** Project row -> card in CreatorMyProjects / CreatorDashboard. */
export function toCreatorProject(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    dept: toDept(row.category),
    status: CREATOR_STATUS[row.status] ?? row.status,
    pct: fundedPercent(row.current_amount, row.goal_amount),
    raised: money(row.current_amount),
    goal: money(row.goal_amount),
    img: row.image_url || null,
    lastEdited: formatDate(row.updated_at),
    // Carried through so the EditProject modal can prefill the story fields it saves.
    challenge: row.challenge || "",
    solution: row.solution || "",
    funding: row.funding_usage || "",
    // Not editable in that modal, but it has to echo them back on save — the service
    // overwrites these columns with whatever the request contains.
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    solutionBullets: Array.isArray(row.solution_bullets) ? row.solution_bullets : [],
    // Bound to an <input value=…> in EditProject, so "" and never null — the same
    // reason the story fields above pass "" through.
    videoUrl: row.video_url || "",

    // Why the board rejected it, written by the admin. Only ever set while the project
    // is REJECTED — approve and resubmit both clear the column — so the card can show it
    // without checking the status first.
    reviewNote: row.review_note || null,

    // Added to GET /projects/my on 2026-08-18 so CreatorDashboard can total them from
    // the list it already fetches. `== null` and not a falsy check: a project nobody
    // has backed yet has 0 backers, and showing "—" for that would read as "unknown"
    // rather than "none".
    backers: row.backers_count == null ? null : toNumber(row.backers_count),
    commentsCount: row.comments_count == null ? null : toNumber(row.comments_count),

    // `status` above stays the moderation verdict. These describe visibility, and
    // My Projects lists archived cards in their own tab rather than hiding them.
    ...toArchiveFields(row),
  };
}

/** Project row -> table in AdminDashboard. */
export function toAdminProject(row) {
  return {
    id: row.id,
    title: row.title,
    // GET /admin/projects joins users; the fallback covers a deleted creator row.
    creator: row.creator_name || `Creator #${row.creator_id}`,
    category: toDept(row.category),
    status: ADMIN_STATUS[row.status] ?? row.status,
    pct: fundedPercent(row.current_amount, row.goal_amount),
    raised: money(row.current_amount),
    goal: money(row.goal_amount),
    img: row.image_url || null,
    ...toArchiveFields(row),
  };
}

/** Project row -> approval queue in AdminApprovals. */
export function toApprovalProject(row) {
  return {
    id: row.id,
    title: row.title,
    // GET /admin/projects joins users; the fallbacks cover a deleted creator row.
    creator: row.creator_name || `Creator #${row.creator_id}`,
    email: row.creator_email || "",
    dept: (row.category || "GENERAL").toUpperCase(),
    submitted: formatDate(row.created_at),
    status: "Pending Review",
    img: row.image_url || null,
    goal: money(row.goal_amount),
    // Projects created before 2026-08-06 have no dates — createProject did not write
    // them back then — so "Not set" is still reachable.
    duration:
      row.start_date && row.end_date
        ? `${formatDate(row.start_date)} → ${formatDate(row.end_date)}`
        : "Not set",
    description: row.description,
    team: Array.isArray(row.team_members) ? row.team_members : [],
    // AdminApprovals' review screen reads project.gallery[0] and project.tiers.map().
    // Both were missing here, so opening REVIEW threw
    // "Cannot read properties of undefined (reading '0')" and — with no error boundary
    // above it — blanked the whole app. Always hand back arrays.
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    // Kept as a safety net even though support levels now have their own endpoint.
    // GET /admin/projects does not join them (they are per-project detail, not queue
    // data), so this stays empty and the review screen loads them itself with
    // getProjectTiers. Removing the field would make a page in Khôi's area depend on
    // two changes landing together.
    tiers: [],
  };
}

/**
 * project_tiers row -> a support level as the UI reads it.
 *
 * "Support Level" on screen, `tier` in the code and the column names. A level is a
 * MINIMUM contribution plus the lines saying what choosing it signals — the creator
 * owes nothing, so there is no quantity, delivery date or fulfilment state here.
 */
export function toTier(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    // min_amount is INTEGER and backers_count comes from COUNT(), but node-postgres has
    // handed this codebase numeric columns as strings before (goal_amount, current_amount)
    // and the bugs were silent — arithmetic that "worked" and produced wrong percentages.
    // Coercing costs nothing and removes the whole class.
    minAmount: toNumber(row.min_amount),
    bullets: Array.isArray(row.bullets) ? row.bullets : [],
    // How many DISTINCT people chose this level. This is the number that makes support
    // levels worth having: it says which level attracts people.
    backersCount: toNumber(row.backers_count),
    // A hidden level (somebody chose it, then the creator removed it) never reaches the
    // public list, but the flag rides along for the creator's own screens.
    isActive: row.is_active !== false,
  };
}

/**
 * The one support level to show on a row that covers SEVERAL investments: the highest
 * the person ever chose. Null when they never chose one, which is the common case —
 * every transaction made before 2026-08-20 and every "just support" investment.
 */
function toTopTier(row) {
  if (!row.top_tier_name) return null;

  return {
    name: row.top_tier_name,
    minAmount: toNumber(row.top_tier_min),
  };
}

/**
 * creator_requests row (joined to users) -> a row in the admin's Creator Requests queue.
 *
 * This is the other half of the sign-up checkbox: ticking "Creator" on Register writes a
 * PENDING row here, and approving it is what actually grants the CREATOR role —
 * createProject stopped auto-granting it on 2026-08-06.
 */
export function toCreatorRequest(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.full_name || `User #${row.user_id}`,
    email: row.email || "",
    // The column exists so a future request could ask for something other than CREATOR.
    role: row.role || "CREATOR",
    status: row.status,
    requestedOn: formatDate(row.created_at),
  };
}

/**
 * The signed-in user's own row (GET /users/profile) -> the Account page.
 *
 * `name`, `email` and `title` are bound to controlled <input>s, so a missing column
 * becomes `""` and never `null` — `null` would make the input uncontrolled and React
 * would warn the first time the user typed. `toCreatorProject` does the same for the
 * story fields, and for the same reason.
 */
export function toProfile(row) {
  if (!row) return null;
  return {
    id: row.id ?? null,
    name: row.full_name ?? "",
    email: row.email ?? "",
    // Academic affiliation shown under the creator's name on a project page.
    title: row.title ?? "",
    // users.created_at is a bare TIMESTAMP, so it reads back shifted by the DB's
    // offset (BACKEND-REVIEW-FOR-HIEU-2 §4e). Only the date is rendered, which hides
    // the error except for accounts created between midnight and 07:00.
    joinedOn: formatDate(row.created_at),
    isActive: row.is_active !== false,
  };
}

/**
 * User row -> table in AdminUserManagement.
 *
 * There used to be a `studentId` of `#${row.id}` and a `project` of "Unassigned" here.
 * Neither exists in the database — `users` has no student id, and nothing in this
 * listing links a user to a project — so both were invented values shown as fact. They
 * are gone, and the table now shows the email and the roles instead, which are real.
 */
export function toAdminUser(row) {
  const roles = Array.isArray(row.roles) ? row.roles : [];
  return {
    id: row.id,
    name: row.full_name,
    // The backend only has a boolean is_active — no "Pending" / "Suspended".
    status: row.is_active ? "Active" : "Inactive",
    // Two shapes of the same fact, on purpose: `role` is the display string in the
    // table, `roles` is what the edit checkboxes bind to and what
    // PATCH /admin/users/:id/roles takes back.
    role: roles.length
      ? roles.map(r => r.charAt(0) + r.slice(1).toLowerCase()).join(", ")
      : "—",
    roles,
    email: row.email,
    isActive: !!row.is_active,
  };
}

/**
 * One row of GET /projects/my/backers -> a line in the creator dashboard's backer list.
 *
 * The row is already grouped per person by SQL, so this is only formatting. `amount` is
 * the string the list renders and `amountValue` the number it sorts/among-totals with —
 * the pages that had only the formatted string ended up parsing digits back out of it.
 */
export function toBacker(row) {
  const projects = toNumber(row.project_count);
  return {
    id: row.user_id,
    name: row.full_name || `Backer #${row.user_id}`,
    amount: money(row.total_amount),
    amountValue: toNumber(row.total_amount),
    projects,
    projectsLabel: `${projects} ${projects === 1 ? "project" : "projects"}`,
    lastInvested: formatDate(row.last_invested_at),
    // The highest support level this person ever chose across the creator's projects.
    // The row is grouped per PERSON over every project they backed, so the chip means
    // "their strongest signal to you", not "their level on one project" — the
    // "N projects" line next to it keeps that from being misread.
    topTier: toTopTier(row),
  };
}

/**
 * "2 days ago" for CommentItem's `time`. The old mock hardcoded these strings, so the
 * component expects a phrase rather than a date.
 */
export function timeAgo(value) {
  if (!value) return "";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  if (seconds < 60) return "just now";

  const units = [
    ["minute", 60],
    ["hour", 60],
    ["day", 24],
    ["week", 7],
    ["month", 4.345],
    ["year", 12],
  ];

  let amount = seconds;
  let label = "minute";
  for (let i = 0; i < units.length; i += 1) {
    amount /= units[i][1];
    if (amount < (units[i + 1]?.[1] ?? Infinity) || i === units.length - 1) {
      label = units[i][0];
      break;
    }
  }

  const n = Math.max(1, Math.floor(amount));
  return `${n} ${label}${n === 1 ? "" : "s"} ago`;
}

/**
 * Flat comment rows -> the nested shape CommentList/CommentItem render.
 *
 * The API returns every comment for a project in one flat, oldest-first list with a
 * `parent_id`; the UI draws exactly one level of nesting. Newest top-level comment goes
 * first (that is what a reader expects), while replies stay oldest-first so a
 * conversation reads downwards.
 */
export function toCommentThread(rows = []) {
  const toNode = (row) => ({
    id: row.id,
    author: row.author_name || "Deleted user",
    // CREATOR / BACKER / null — derived server-side from who owns and who backed the
    // project, not from the author's account roles.
    role: row.author_role || null,
    time: timeAgo(row.created_at),
    text: row.body,
    authorId: row.user_id,
  });

  const roots = [];
  const byId = new Map();

  rows.forEach((row) => {
    if (row.parent_id == null) {
      const node = { ...toNode(row), replies: [] };
      byId.set(row.id, node);
      roots.push(node);
    }
  });

  rows.forEach((row) => {
    if (row.parent_id != null) {
      // A reply whose parent is missing (deleted mid-request) would otherwise vanish.
      byId.get(row.parent_id)?.replies.push(toNode(row));
    }
  });

  return roots.reverse();
}

/** project_updates row -> an entry in ProjectDetail's Updates tab. */
export function toProjectUpdate(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    // author_id is ON DELETE SET NULL, so the join can legitimately come back empty.
    author: row.author_name || "Unknown creator",
    postedOn: formatDate(row.created_at),
  };
}

/**
 * One row of GET /classcoins/investments -> a card on My Investments.
 *
 * The row is one PROJECT, not one transaction: the query groups by project and sums the
 * amounts, so investing three times in the same project is a single card for 900 CC
 * rather than three cards for 300 that look like duplicates. It arrives already joined,
 * which is what removed the old "fetch each project separately" N+1 — and why there is
 * no "project is missing" branch here: a transaction whose project was permanently
 * deleted carries project_id = NULL and never survives the join.
 */
export function toInvestment(row) {
  return {
    // One card per project now, so the project id is the identity.
    id: row.project_id,
    projectId: row.project_id,
    title: row.title,
    tag: toTag(row.category),
    desc: row.description ?? "",
    img: row.image_url || null,
    investedAmount: toNumber(row.invested_amount),
    // How many separate times they invested. 1 for most cards, which is why the UI
    // only mentions it above 1.
    investmentCount: toNumber(row.investment_count),
    // The most recent one — that is what "when did I back this" means on a card that
    // now covers several.
    investmentDate: formatDate(row.last_invested_at),
    firstInvestmentDate: formatDate(row.first_invested_at),
    fundingProgress: fundedPercent(row.current_amount, row.goal_amount),
    // The backer keeps the card either way — archiving a project must not erase
    // somebody's spend history — so it is badged rather than dropped.
    archived: row.archived_at != null,
    // The highest support level chosen for this project. Null for anything backed
    // before support levels existed and for every "just support" investment, which is
    // most of them — the card simply shows no chip.
    topTier: toTopTier(row),
  };
}
