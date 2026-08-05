// UI configuration for the creator area — NOT data.
//
// CREATOR_DISCUSSIONS, CREATOR_TIERS and RECENT_BACKERS lived here until the pages
// were wired to the API. They were removed rather than kept as a fallback: the
// backend has no comments table, no reward-tiers table and no way to list who backed
// a project, so rendering them would have shown invented numbers next to real ones.
// CreatorDashboard now shows an empty state naming the missing endpoint instead.

export const CREATOR_SIDEBAR_LINKS = [
  { id: "dashboard",  label: "DASHBOARD",   icon: "▦" },
  { id: "myprojects", label: "MY PROJECTS", icon: "📁" },
];
