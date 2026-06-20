// Centralized nav links so every page stays consistent.
// Pass the right set into <Header navLinks={...} /> based on auth state.

export const NAV_LINKS_LOGGED_OUT = [
  { label: "Discover", path: "/discover" },
  { label: "Departments", path: "#" },
  { label: "About", path: "#" },
];

export const NAV_LINKS_LOGGED_IN = [
  { label: "Discover", path: "/discover" },
  { label: "My Projects", path: "/my-projects" },
  { label: "My Investments", path: "/investments" },
  { label: "Departments", path: "#" },
  { label: "About", path: "#" },
];

// Helper: pick the right nav set from auth state.
export function getNavLinks(isLoggedIn) {
  return isLoggedIn ? NAV_LINKS_LOGGED_IN : NAV_LINKS_LOGGED_OUT;
}

// Kept for backward compatibility with pages still importing NAV_LINKS directly.
export const NAV_LINKS = NAV_LINKS_LOGGED_OUT;