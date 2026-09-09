export const EDIT_PROJECT_TABS = [
  { id: "basic", label: "Basic Info",   icon: "ℹ" },
  { id: "media", label: "Media",        icon: "🖼" },
  { id: "team",  label: "Team",         icon: "👥" },
  { id: "tiers", label: "Support Levels", icon: "◎" },
];

// The Support Levels tab loads the project's real levels from GET /projects/:id/tiers.
// It used to start from sample rows, which meant a creator opened the tab editing two
// invented levels that belonged to no project.

export const EDIT_PROJECT_INITIAL_DATA = {
  title: "Autonomous Urban Transit",
  school: "School of Engineering",
  proposition: "Developing the next generation of AI-driven public transport for high-density metropolitan areas, focusing on safety, efficiency, and last-mile connectivity for RMIT's urban campus ecosystem.",
};

export const EDIT_PROJECT_INITIAL_TEAM = [
  { id: 1, name: "Dr. Alexander Vance", role: "Lead Researcher",  rmitId: "e647291" },
  { id: 2, name: "Chloe Chen",          role: "Student Developer", rmitId: "s3984021" },
];
