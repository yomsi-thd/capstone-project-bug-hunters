// Turns snake_case rows from Postgres into the shapes the components expect. Keeping
// the translation here means a change to the API's row shape does not reach the pages.
//
// Watch out for current_amount: it is a Postgres `numeric`, which node-postgres hands
// back as a string ("5000.00"). Run it through toNumber() before any arithmetic.

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// TAG_COLORS is keyed by uppercase tags, but the database holds mixed case
// ("Education"), so normalise. Unknown tags fall back to <Tag>'s default colour.
function toTag(category) {
  return (category || "UNCATEGORIZED").toUpperCase();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-10-25" -> "25 Oct 2026", by reading the string rather than parsing a Date.
 *
 * Semester dates are Postgres `DATE` columns with no time of day. `new Date("2026-10-25")`
 * reads as midnight UTC, which then prints as 24 Oct for any viewer west of Greenwich.
 * The API sends these as plain strings for that reason, so don't build a Date here.
 */
export function formatSemesterDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return "";

  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  if (!name) return "";

  return `${Number(day)} ${name} ${year}`;
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

/**
 * The second way a project can be frozen, kept separate from archiving above.
 *
 * Archiving is a person's decision and hides the project from Discover. A semester
 * ending is the calendar's, and the project stays visible under its own term. A project
 * can be in both states at once, so both flags are carried.
 *
 * Postgres computes `semesterClosed` (end_date < CURRENT_DATE). Don't re-derive it from
 * `semesterEndDate` here: that is a date-only string, and a Date built from it reads a
 * day early west of Greenwich. See formatSemesterDate.
 */
function toSemesterFields(row) {
  return {
    semesterId: row.semester_id ?? null,
    semesterName: row.semester_name || null,
    // Kept as the raw 'YYYY-MM-DD' string. Render it with formatSemesterDate.
    semesterEndDate: row.semester_end_date || null,
    semesterClosed: Boolean(row.semester_closed),
  };
}

// Archiving is independent of `status`: a project can be APPROVED and archived at once,
// so nothing here touches status. There is no ARCHIVED column, only `archived_at`, so
// the boolean is derived once here and every page reads `archived`.
//
// `archivedBy` stays a raw user id because CreatorMyProjects compares it to user.id
// (a creator may only undo their own archive). `archivedByName` is for display.
function toArchiveFields(row) {
  return {
    // != null rather than a falsy check, since the value is a timestamp string.
    archived: row.archived_at != null,
    archivedAt: formatDate(row.archived_at),
    archivedBy: row.archived_by ?? null,
    archivedByName: row.archived_by_name || null,
    archiveReason: row.archive_reason || null,
  };
}

/**
 * Who filed the project, when that was not its owner. Null for anything a creator made
 * themselves.
 *
 * The id decides whether APPROVE/REJECT are hidden, since the admin who filed a project
 * may not review it. The name is what the reviewing admin reads.
 */
function toOnBehalfFields(row) {
  return {
    createdByAdminId: row.created_by_admin_id ?? null,
    // Only GET /admin/projects joins the name. A row without the join still carries the
    // id, so the "hide the buttons" rule never depends on the join being there.
    createdByAdminName: row.created_by_admin_name || null,
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
    // The two numbers on a card: Class Coins received, and how many people sent them.
    // There is no funding goal, so no percentage and no progress bar.
    raised: toNumber(row.current_amount),
    // `== null` rather than falsy: a project nobody has backed reads 0, and only a row
    // without the count at all reads as unknown.
    backers: row.backers_count == null ? null : toNumber(row.backers_count),
    large: false,
    status: row.status,
    ownerId: row.creator_id,
    createdAt: row.created_at,
    // The teaching period the project was filed under. The card shows the semester name,
    // which the page looks up in the list it already loaded for the picker, so
    // GET /projects doesn't join semesters for one short string.
    semesterId: row.semester_id ?? null,
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
    // The closing date on this page is the semester's, not the project's own end_date.
    // GET /projects/:id joins it in, so the page needn't load the semester list.
    ...toSemesterFields(row),

    // A public route, so the join returns the creator's name but not their email; the
    // admin routes return that. Null when the creator's row was deleted.
    creator: row.creator_name
      ? {
          name: row.creator_name,
          // users.title, e.g. "Lead Researcher, RMIT Robotics Lab". Optional, so fall
          // back to a generic label rather than leaving the line empty.
          role: row.creator_title || "Project Creator",
        }
      : null,

    stats: {
      // A running total with no target to reach, so there is no percentage to show.
      raised: toNumber(row.current_amount),
      // Distinct wallets that invested, not the number of transactions.
      backers: row.backers_count == null ? null : toNumber(row.backers_count),
    },

    // What the reader themselves contributed, or null when they haven't or are signed
    // out. Kept outside `stats` because stats describes the project and this describes
    // the reader. It is what turns the invest button into "you have supported this".
    myContribution: row.my_contribution == null ? null : toNumber(row.my_contribution),

    // projects.endorsed. Only an admin can set it, via PATCH /projects/:id/endorse.
    endorsed: Boolean(row.endorsed),

    img: row.image_url || null,
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    // The pitch video, stored as a link and never as a file. Null on older projects, so
    // the page renders that section only when there is one.
    videoUrl: row.video_url || null,

    // `description` is the short blurb, also used on the Discover card. The three story
    // fields below are the long form and stay optional, so each section on ProjectDetail
    // renders only when its own field has text.
    about: row.description,
    challenge: row.challenge || null,
    solution: row.solution || null,
    // [{ title, desc }] listed under "Our Solution". Empty is fine; the prose above
    // stands on its own.
    solutionBullets: Array.isArray(row.solution_bullets) ? row.solution_bullets : [],
    // Column is `funding_usage`; the UI calls it `funding`.
    funding: row.funding_usage || null,

    teamMembers: Array.isArray(row.team_members) ? row.team_members : [],

    // Only feeds the "VIEW ALL n COMMENTS" label. The list itself is a separate request.
    totalComments: toNumber(row.comments_count),

    // Archived projects still come back from GET /projects/:id. The page renders them
    // read-only with a banner instead of 404ing, so existing investments and shared
    // links keep working.
    ...toArchiveFields(row),
  };
}

// Class Coins, never dollars: CC has no real-world value, so a "$" would misrepresent
// it. Callers parsing the number back out must strip /[^0-9.]/g, not just "$" and ",".
function money(value) {
  return `${toNumber(value).toLocaleString("en-US")} CC`;
}

/**
 * A formatted amount string -> a number. The inverse of money(), and kept beside it so
 * the two cannot drift apart.
 *
 * Strips /[^0-9.]/g rather than /[$,]/g, because the strings here are "1,050 CC": a
 * dollar-and-comma strip would leave " CC" behind and Number() would return NaN.
 *
 * `integer: true` drops the dot instead of rounding. The invest field filters on every
 * keystroke, so "12.5" becomes "125" and the user sees straight away that it takes no
 * decimals.
 *
 * @param {string|number} value
 * @param {{ integer?: boolean }} [options]
 * @returns {number} 0 when unreadable, never NaN: callers feed this straight into
 *   arithmetic or into a controlled input.
 */
export function parseAmount(value, { integer = false } = {}) {
  const cleaned = String(value ?? "").replace(integer ? /[^0-9]/g : /[^0-9.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

// DEPT_STYLE / CAT_STYLE are keyed in Title Case ("Engineering"), but the database
// holds both "ENGINEERING" and "Education", so normalise.
function toDept(category) {
  const c = (category || "General").toLowerCase();
  return c.charAt(0).toUpperCase() + c.slice(1);
}

// projects.status is PENDING / APPROVED / REJECTED. The creator and admin areas each
// label those differently on screen.
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
    raised: money(row.current_amount),
    img: row.image_url || null,
    lastEdited: formatDate(row.updated_at),
    // Carried through so the EditProject modal can prefill the story fields it saves.
    challenge: row.challenge || "",
    solution: row.solution || "",
    funding: row.funding_usage || "",
    // Not editable in that modal, but it has to send them back on save: the service
    // overwrites these columns with whatever the request contains.
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    solutionBullets: Array.isArray(row.solution_bullets) ? row.solution_bullets : [],
    // Bound to an <input value=...> in EditProject, so "" and never null, same as the
    // story fields above.
    videoUrl: row.video_url || "",

    // The admin's reason for rejecting. Approve and resubmit both clear the column, so
    // it is only ever set while the project is REJECTED and the card can show it without
    // checking the status.
    reviewNote: row.review_note || null,

    // Returned by GET /projects/my so CreatorDashboard can total them from the list it
    // already has. `== null` rather than falsy: 0 backers means none, and rendering that
    // as a dash would read as "unknown".
    backers: row.backers_count == null ? null : toNumber(row.backers_count),
    commentsCount: row.comments_count == null ? null : toNumber(row.comments_count),

    // `status` above is the moderation verdict; these describe visibility. My Projects
    // lists archived cards in their own tab rather than hiding them.
    ...toArchiveFields(row),
    // The card hides EDIT / UPDATE / RESUBMIT once the semester closes, rather than
    // offering buttons the API answers 409 to.
    ...toSemesterFields(row),
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
    raised: money(row.current_amount),
    img: row.image_url || null,
    ...toArchiveFields(row),
    ...toOnBehalfFields(row),
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
    // No goal and no duration: projects have no funding target, and the teaching period
    // replaced the per-project campaign dates.
    description: row.description,
    team: Array.isArray(row.team_members) ? row.team_members : [],
    // The review screen reads gallery[0] and tiers.map(), so both must be arrays here
    // even when the row carries neither.
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    // GET /admin/projects does not join support levels, since they are per-project
    // detail rather than queue data. The review screen loads them with getProjectTiers.
    tiers: [],
    ...toOnBehalfFields(row),
  };
}

/**
 * project_tiers row -> a support level as the UI reads it. "Support Level" on screen,
 * `tier` in the code and the columns.
 *
 * A level is a minimum contribution plus lines describing what choosing it signals. The
 * creator owes nothing in return, so there is no quantity, delivery date or fulfilment
 * state to track.
 */
export function toTier(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    // Both are integers today, but node-postgres returns numeric columns as strings and
    // that failure is silent. Coercing costs nothing.
    minAmount: toNumber(row.min_amount),
    bullets: Array.isArray(row.bullets) ? row.bullets : [],
    // Distinct people who chose this level, which is what says whether it attracts
    // anyone.
    backersCount: toNumber(row.backers_count),
    // A level somebody chose and the creator then removed is hidden, not deleted. It
    // never reaches the public list, but the creator's screens still see the flag.
    isActive: row.is_active !== false,
  };
}

/**
 * The level to show on a row covering several investments: the highest the person ever
 * chose. Null when they never chose one, which is the common case.
 */
function toTopTier(row) {
  if (!row.top_tier_name) return null;

  return {
    name: row.top_tier_name,
    minAmount: toNumber(row.top_tier_min),
  };
}

/**
 * creator_requests row, joined to users -> a row in the admin's Creator Requests queue.
 *
 * The other half of the sign-up checkbox: ticking "Creator" on Register writes a PENDING
 * row here, and approving it is what grants the CREATOR role.
 */
export function toCreatorRequest(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.full_name || `User #${row.user_id}`,
    email: row.email || "",
    // A column rather than a constant, so a request could later ask for another role.
    role: row.role || "CREATOR",
    status: row.status,
    requestedOn: formatDate(row.created_at),
  };
}

/**
 * The signed-in user's own row -> the Account page.
 *
 * `name`, `email` and `title` bind to controlled inputs, so a missing column becomes ""
 * and never null. Null would make the input uncontrolled and React warns the first time
 * the user types.
 */
export function toProfile(row) {
  if (!row) return null;
  return {
    id: row.id ?? null,
    name: row.full_name ?? "",
    email: row.email ?? "",
    // Academic affiliation shown under the creator's name on a project page.
    title: row.title ?? "",
    // users.created_at is a bare TIMESTAMP, so it reads back shifted by the database's
    // offset. Only the date is shown, which hides the error except for accounts created
    // in the small hours.
    joinedOn: formatDate(row.created_at),
    isActive: row.is_active !== false,
  };
}

/** User row -> table in AdminUserManagement. */
export function toAdminUser(row) {
  const roles = Array.isArray(row.roles) ? row.roles : [];
  return {
    id: row.id,
    name: row.full_name,
    // The backend has only a boolean is_active, no "Pending" or "Suspended".
    status: row.is_active ? "Active" : "Inactive",
    // Two shapes of the same fact: `role` is the display string, `roles` is what the
    // edit checkboxes bind to and what PATCH /admin/users/:id/roles takes back.
    role: roles.length
      ? roles.map(r => r.charAt(0) + r.slice(1).toLowerCase()).join(", ")
      : "—",
    roles,
    email: row.email,
    isActive: !!row.is_active,
    // The wallet, so an admin can see who needs Class Coins. Null is kept rather than
    // turned into 0: no wallet row at all is a different fact from an empty wallet, and
    // the table shows a dash for the first and "0 CC" for the second.
    balance: row.balance == null ? null : toNumber(row.balance),
  };
}

/**
 * One row of GET /projects/my/backers -> a line in the creator dashboard's backer list.
 *
 * SQL has already grouped the row per person, so this is only formatting. `amount` is
 * the string the list renders, `amountValue` the number it sorts and totals with, so
 * callers never have to parse the digits back out.
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
    // The highest level this person chose across all of the creator's projects, not on
    // any one of them. The "N projects" line beside it keeps that from being misread.
    topTier: toTopTier(row),
  };
}

/** "2 days ago" for CommentItem, which expects a phrase rather than a date. */
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
 * Flat comment rows -> the nested shape CommentList and CommentItem render.
 *
 * The API returns every comment in one flat, oldest-first list carrying `parent_id`, and
 * the UI draws exactly one level of nesting. Top-level comments end up newest first,
 * while replies stay oldest first so a conversation reads downwards.
 */
export function toCommentThread(rows = []) {
  const toNode = (row) => ({
    id: row.id,
    author: row.author_name || "Deleted user",
    // CREATOR, BACKER or null. The server derives it from who owns and who backed this
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
      // Optional chaining: a reply whose parent was deleted mid-request has no node.
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
    // author_id is ON DELETE SET NULL, so the join can come back empty.
    author: row.author_name || "Unknown creator",
    postedOn: formatDate(row.created_at),
  };
}

/**
 * One row of GET /classcoins/investments -> a card on My Investments.
 *
 * A row is one project rather than one transaction: the query groups by project and sums
 * the amounts, so repeat investments read as a single card instead of near-duplicates.
 * The project is already joined in, so there is no "project missing" branch to handle;
 * a transaction whose project was deleted has project_id NULL and never survives the join.
 */
export function toInvestment(row) {
  return {
    // One card per project, so the project id is the identity.
    id: row.project_id,
    projectId: row.project_id,
    title: row.title,
    tag: toTag(row.category),
    desc: row.description ?? "",
    img: row.image_url || null,
    investedAmount: toNumber(row.invested_amount),
    // The day they backed it. One contribution per project, so there is no first and
    // latest to tell apart; MAX(created_at) over a single row is that same date.
    investmentDate: formatDate(row.last_invested_at),
    // The project's running total, not this backer's share. Theirs is investedAmount.
    projectTotal: toNumber(row.current_amount),
    // Archiving a project must not erase somebody's spend history, so the card stays
    // and is badged instead.
    archived: row.archived_at != null,
    // The highest level chosen for this project, null for a plain "just support"
    // investment. The card then shows no chip.
    topTier: toTopTier(row),
  };
}
