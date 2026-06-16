export const ADMIN_USER_NAV_ITEMS = [
  { id: "projects", label: "Projects", icon: "▦" },
  { id: "users", label: "Users", icon: "👤" },
  { id: "approvals", label: "Approvals", icon: "🛡" },
];

export const ADMIN_INITIAL_USERS = [
  {
    id: 1,
    name: "Elena Draganov",
    studentId: "s3829104",
    project: "URBAN TECH HUB",
    projectColor: "bg-brand",
    status: "Active",
    role: "Creator",
    email: "elena.draganov@student.rmit.edu.au",
  },
  {
    id: 2,
    name: "Marcus Kwong",
    studentId: "s3948572",
    project: "QUANTUM LAB",
    projectColor: "bg-brand",
    status: "Pending",
    role: "Student",
    email: "marcus.kwong@student.rmit.edu.au",
  },
  {
    id: 3,
    name: "Sophia Chen",
    studentId: "s3801293",
    project: null,
    projectColor: "",
    status: "Active",
    role: "Backer",
    email: "sophia.chen@student.rmit.edu.au",
  },
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