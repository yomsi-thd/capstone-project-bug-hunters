// Nav links in one place so every page stays consistent. Pass the right set into
// <Header navLinks={...} /> for the current auth state.

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

// Picks the right nav set from auth state.
export function getNavLinks(isLoggedIn) {
  return isLoggedIn ? NAV_LINKS_LOGGED_IN : NAV_LINKS_LOGGED_OUT;
}

// Nav links derived from the current user's roles.
//   Admin    -> Admin Dashboard only, of the role-specific links
//   Creator  -> My Projects
//   Backer   -> My Investments
// Logged out shows the public links alone.
//
// An admin gets neither My Projects nor My Investments: they own no projects and hold no
// Class Coins, so both would lead to a page with nothing of theirs in it, and
// /creator-my-projects is behind canCreate anyway. Mirrors canCreate and canInvest in
// AuthContext.
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

// Kept for pages that still import NAV_LINKS directly.
export const NAV_LINKS = NAV_LINKS_LOGGED_OUT;