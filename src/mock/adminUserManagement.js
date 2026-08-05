// UI configuration for user management — NOT data.
// ADMIN_INITIAL_USERS was removed when the page was wired to GET /api/admin/users.

export const ADMIN_USER_NAV_ITEMS = [
  { id: "projects", label: "Projects", icon: "▦" },
  { id: "users", label: "Users", icon: "👤" },
  { id: "approvals", label: "Approvals", icon: "🛡" },
];

export const ADMIN_PROJECT_GROUPS = [
  "Urban Tech Hub",
  "Quantum Lab",
  "Biotech Research",
  "Design Studio",
  "Unassigned",
];

export const ADMIN_USER_ROLES = ["Student", "Creator", "Backer", "Admin"];

export const ADMIN_USER_STATUSES = ["Active", "Pending", "Suspended"];