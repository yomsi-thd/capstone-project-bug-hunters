// UI configuration for user management — NOT data.
// ADMIN_INITIAL_USERS was removed when the page was wired to GET /api/admin/users.

export const ADMIN_USER_NAV_ITEMS = [
  { id: "projects", label: "Projects", icon: "▦" },
  { id: "users", label: "Users", icon: "👤" },
  { id: "approvals", label: "Approvals", icon: "🛡" },
];

// The three role names seeded in the `roles` table, uppercase because that is what the
// JWT carries and what PATCH /admin/users/:id/roles validates against. Anything else
// here is rejected by the backend, so this list must not drift.
//
// ADMIN_PROJECT_GROUPS ("Urban Tech Hub", "Quantum Lab", …) and ADMIN_USER_STATUSES
// ("Pending", "Suspended") were removed on 2026-08-18: neither exists anywhere in the
// database. The groups drove a "Project Assignment" column that read "Unassigned" for
// every user alive, and the statuses drove a filter for two states the schema cannot
// express — `users.is_active` is a boolean.
export const ADMIN_USER_ROLES = ["ADMIN", "CREATOR", "BACKER"];