// UI configuration for user management. The page reads its users from
// GET /api/admin/users.

export const ADMIN_USER_NAV_ITEMS = [
  { id: "projects", label: "Projects", icon: "▦" },
  { id: "users", label: "Users", icon: "👤" },
  { id: "approvals", label: "Approvals", icon: "🛡" },
];

// The three role names seeded in the `roles` table, uppercase because that is what the
// JWT carries and what PATCH /admin/users/:id/roles validates against. The backend
// rejects anything else, so this list must not drift.
export const ADMIN_USER_ROLES = ["ADMIN", "CREATOR", "BACKER"];

// What the grant box starts on. Config rather than a rule: an admin types over it and
// the server accepts anything from 1 to 100,000. Unlike MAX_CONTRIBUTION, it does not
// have to match a backend constant.
export const DEFAULT_GRANT = 4000;