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

// projects.end_date exists but createProject never writes it, so in practice it is
// usually null.
// TODO: the backend does not accept start_date/end_date when creating a project.
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

    // TODO: the backend does not join to users; GET /projects/:id only returns creator_id.
    creator: null,

    stats: {
      funded: fundedPercent(row.current_amount, row.goal_amount),
      raised: toNumber(row.current_amount),
      goal: toNumber(row.goal_amount),
      daysLeft: daysLeftFrom(row.end_date),
      // TODO: the backend does not count how many people invested.
      backers: null,
    },

    // TODO: no column marks a project as RMIT endorsed.
    endorsed: false,

    img: row.image_url || null,
    // TODO: the backend has no gallery table.
    gallery: [],

    about: row.description,
    // TODO: the backend has a single `description` column; the old UI split it in three.
    challenge: null,
    solution: null,
    funding: null,

    teamMembers: Array.isArray(row.team_members) ? row.team_members : [],

    // TODO: the backend has no comments table.
    totalComments: 0,
    updates: 0,
  };
}

function money(value) {
  return `$${toNumber(value).toLocaleString("en-US")}`;
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
  };
}

/** Project row -> table in AdminDashboard. */
export function toAdminProject(row) {
  return {
    id: row.id,
    title: row.title,
    // TODO: the backend does not join to users, only creator_id is available.
    creator: `Creator #${row.creator_id}`,
    category: toDept(row.category),
    status: ADMIN_STATUS[row.status] ?? row.status,
    pct: fundedPercent(row.current_amount, row.goal_amount),
    raised: money(row.current_amount),
    goal: money(row.goal_amount),
    img: row.image_url || null,
  };
}

/** Project row -> approval queue in AdminApprovals. */
export function toApprovalProject(row) {
  return {
    id: row.id,
    title: row.title,
    // TODO: the backend does not return the creator's name or email.
    creator: `Creator #${row.creator_id}`,
    email: "",
    dept: (row.category || "GENERAL").toUpperCase(),
    submitted: formatDate(row.created_at),
    status: "Pending Review",
    img: row.image_url || null,
    goal: money(row.goal_amount),
    // TODO: start_date/end_date exist but createProject never writes them.
    duration: row.start_date && row.end_date ? `${row.start_date} → ${row.end_date}` : "Not set",
    description: row.description,
    team: Array.isArray(row.team_members) ? row.team_members : [],
  };
}

/** User row -> table in AdminUserManagement. */
export function toAdminUser(row) {
  const roles = Array.isArray(row.roles) ? row.roles : [];
  return {
    id: row.id,
    name: row.full_name,
    // TODO: the users table has no rmit_id / student id column.
    studentId: `#${row.id}`,
    // TODO: the backend does not link a user to a project in this listing.
    project: "Unassigned",
    projectColor: "bg-gray-400",
    // The backend only has a boolean is_active — no "Pending" / "Suspended".
    status: row.is_active ? "Active" : "Inactive",
    role: roles.length
      ? roles.map(r => r.charAt(0) + r.slice(1).toLowerCase()).join(", ")
      : "—",
    email: row.email,
    isActive: !!row.is_active,
  };
}

/**
 * One ClassCoin transaction plus its project -> card on My Investments.
 * `project` may be null if the project was deleted.
 */
export function toInvestment(tx, project) {
  return {
    id: tx.id,
    projectId: tx.project_id,
    title: project?.title ?? `Project #${tx.project_id}`,
    tag: toTag(project?.category),
    desc: project?.description ?? "",
    img: project?.image_url || null,
    investedAmount: toNumber(tx.amount),
    investmentDate: formatDate(tx.created_at),
    fundingProgress: project
      ? fundedPercent(project.current_amount, project.goal_amount)
      : 0,
  };
}
