import Badge from "./Badge";

// The badge for an account role: admin, creator or backer. Brand colour for admin and
// neutral for the rest, the same "admin is different" signal the nav bar gives.
//
// Don't merge this with CommentRoleBadge in components/project/CommentItem.jsx. That one
// is not an account role: it is the author's relationship to the one project being
// viewed, computed in SQL, so it reads CREATOR when they own that project and BACKER
// when they invested in it. Using account roles there would badge everyone BACKER and
// mean nothing.

export default function RoleBadge({ role }) {
  // AuthContext stores roles lowercase, toAdminUser keeps the API's uppercase. Both
  // arrive here, so normalise rather than pick a side.
  const value = String(role ?? "").toUpperCase();
  if (!value) return null;

  return <Badge tone={value === "ADMIN" ? "brand" : "neutral"}>{value}</Badge>;
}

export function RoleBadgeList({ roles }) {
  const list = Array.isArray(roles) ? roles : [];

  // No roles is a real state rather than an error: an account exists before an admin
  // grants it anything.
  if (list.length === 0) {
    return <span className="text-[11px] italic text-neutral-400">No roles</span>;
  }

  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {list.map((role) => (
        <RoleBadge key={role} role={role} />
      ))}
    </span>
  );
}
