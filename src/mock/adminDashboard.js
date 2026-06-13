export const ADMIN_PROJECTS = [
  { id: 1, title: "Sustainable Micro-Grid Node",  creator: "Dr. Sarah Jenkins",      category: "Engineering", status: "Active",  pct: 75, raised: "$15k", goal: "$20k",  img: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=80&q=70" },
  { id: 2, title: "Generative Art Archive",        creator: "Prof. Alan Turing",       category: "Design",      status: "Pending", pct: 0,  raised: "$0",   goal: "$5k",   img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=80&q=70" },
  { id: 3, title: "Blockchain Supply Chain App",   creator: "Mark Zuckerberg (Guest)", category: "Business",    status: "Flagged", pct: 12, raised: "$12k", goal: "$100k", img: "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=80&q=70" },
];

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
