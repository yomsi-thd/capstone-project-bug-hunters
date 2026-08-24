// Centralized nav links so every page stays consistent.
// Pass the right set into <Header navLinks={...} /> based on auth state.

export const NAV_LINKS_LOGGED_OUT = [
  { label: "Discover", path: "/discover" },
  { label: "Departments", path: "#" },
  { label: "About", path: "#" },
];

export const NAV_LINKS_LOGGED_IN = [
  { label: "Discover", path: "/discover" },
  { label: "My Projects", path: "/creator-my-projects" },
  { label: "My Investments", path: "/investments" },
  { label: "Departments", path: "#" },
  { label: "About", path: "#" },
];

// Helper: pick the right nav set from auth state.
export function getNavLinks(isLoggedIn) {
  return isLoggedIn ? NAV_LINKS_LOGGED_IN : NAV_LINKS_LOGGED_OUT;
}

// Role-aware nav links, derived from the current user's roles.
//   Admin    -> Admin Dashboard ONLY (of the role-specific links)
//   Creator  -> My Projects
//   Backer   -> My Investments
// Logged out shows only the public links.
//
// ⚠️ Admin lost My Projects and My Investments on 2026-08-24. An admin owns no
// projects and holds no Class Coins now, so both links led somewhere that has nothing
// of theirs in it — and /creator-my-projects is behind canCreate, so the link would
// have landed on the "no access" screen. Mirrors canCreate / canInvest in AuthContext.
export function getNavLinksForUser(user) {
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("admin");
  const isCreator = roles.includes("creator");
  const isBacker = roles.includes("backer");

  const links = [{ label: "Discover", path: "/discover" }];
  if (isAdmin) links.push({ label: "Admin Dashboard", path: "/admin-dashboard" });
  if (isCreator) links.push({ label: "My Projects", path: "/creator-my-projects" });
  if (isBacker) links.push({ label: "My Investments", path: "/investments" });
  links.push({ label: "Departments", path: "#" });
  links.push({ label: "About", path: "#" });
  return links;
}

// Kept for backward compatibility with pages still importing NAV_LINKS directly.
export const NAV_LINKS = NAV_LINKS_LOGGED_OUT;