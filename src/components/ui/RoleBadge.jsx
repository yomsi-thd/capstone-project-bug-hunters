import Badge from "./Badge";

// The badge for an ACCOUNT ROLE: admin / creator / backer.
//
// Account.jsx and AdminUserManagement.jsx each had their own version of this. They were
// not just duplicated code — they looked different: a soft red pill on the account page,
// a solid red rectangle in the admin table. One of the two had to give, and the soft pill
// won because every other chip in this app is a tinted pill (see Badge).
//
// Brand for admin, neutral for the rest — the same "admin is different" signal the nav bar
// gives, without inventing a third colour vocabulary.
//
// ⚠️ DO NOT merge this with the RoleBadge inside components/project/CommentItem.jsx, even
// though the name was identical before 20/08 (it is CommentRoleBadge now, for exactly this
// reason). That one is NOT an account role: it is the author's CREATOR/BACKER relationship
// to the ONE project being viewed, computed in SQL — CREATOR when they own the project,
// BACKER when they actually invested in that project. From CLAUDE.md: reading their
// account roles there instead "would badge everyone BACKER and make it meaningless."
//
// Two concepts, one name. That is the trap this comment exists to spring.

export default function RoleBadge({ role }) {
  // AuthContext lower-cases the roles it stores; toAdminUser keeps the raw uppercase
  // array from the API. Both arrive here, so normalise rather than pick a side.
  const value = String(role ?? "").toUpperCase();
  if (!value) return null;

  return <Badge tone={value === "ADMIN" ? "brand" : "neutral"}>{value}</Badge>;
}

export function RoleBadgeList({ roles }) {
  const list = Array.isArray(roles) ? roles : [];

  // "No roles" is a real state, not an error: an account can exist before an admin grants
  // it anything, and AdminUserManagement has rows like that today.
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
