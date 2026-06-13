export const EDIT_PROJECT_TABS = [
  { id: "basic", label: "Basic Info",   icon: "ℹ" },
  { id: "media", label: "Media",        icon: "🖼" },
  { id: "team",  label: "Team",         icon: "👥" },
  { id: "tiers", label: "Reward Tiers", icon: "🎁" },
];

export const MOCK_TIERS = [
  { id: 1, name: "Digital Supporter",  amount: "25",  desc: "Digital certificate of appreciation, name in project credits, and monthly newsletter access." },
  { id: 2, name: "Lab Access Partner", amount: "500", desc: "Exclusive physical lab tour, meeting with the research lead, and physical plaque installation." },
];

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
