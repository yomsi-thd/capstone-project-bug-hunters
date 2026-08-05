// UI configuration for the admin dashboard — NOT data.
// ADMIN_PROJECTS was removed when AdminDashboard was wired to GET /api/admin/projects.

export const ADMIN_STATUS_STYLE = {
  Active:  { text: "text-green-600",  dot: "bg-green-500" },
  Pending: { text: "text-gray-400",   dot: "bg-gray-300"  },
  Flagged: { text: "text-brand",      dot: "bg-brand"     },
};

export const ADMIN_CAT_STYLE = {
  Engineering: "bg-blue-50 text-blue-700",
  Design:      "bg-purple-50 text-purple-700",
  Business:    "bg-yellow-50 text-yellow-800",
};

export const ADMIN_NAV_ITEMS = [
  { id: "projects",  label: "Projects",  icon: "▦" },
  { id: "users",     label: "Users",     icon: "👤" },
  { id: "approvals", label: "Approvals", icon: "🛡" },
];
