export const EDIT_PROJECT_TABS = [
  { id: "basic", label: "Basic Info",   icon: "ℹ" },
  { id: "media", label: "Media",        icon: "🖼" },
  { id: "team",  label: "Team",         icon: "👥" },
  { id: "tiers", label: "Support Levels", icon: "◎" },
];

// MOCK_TIERS was deleted on 2026-08-20. The tab initialised its list from it, so a
// creator opening Support Levels was editing two invented rows belonging to no project.
// It also wrote them in the reward voice ("physical plaque installation"), which the
// feature explicitly is not. The tab now loads the project's real levels from
// GET /projects/:id/tiers.

export const EDIT_PROJECT_INITIAL_DATA = {
  title: "Autonomous Urban Transit",
  school: "School of Engineering",
  goal: "250000",
  proposition: "Developing the next generation of AI-driven public transport for high-density metropolitan areas, focusing on safety, efficiency, and last-mile connectivity for RMIT's urban campus ecosystem.",
};

export const EDIT_PROJECT_INITIAL_TEAM = [
  { id: 1, name: "Dr. Alexander Vance", role: "Lead Researcher",  rmitId: "e647291" },
  { id: 2, name: "Chloe Chen",          role: "Student Developer", rmitId: "s3984021" },
];
