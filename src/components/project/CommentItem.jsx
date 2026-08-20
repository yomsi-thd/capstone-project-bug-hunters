import Avatar from "../ui/Avatar";

// Indigo for BACKER, brand red for CREATOR. Deliberately NOT ui/Badge's tone vocabulary:
// these two are not "success" or "danger", they are two sides of a relationship, and the
// indigo exists so the creator's replies stand out in a thread of backers.
const ROLE_STYLES = {
  BACKER: "bg-indigo-50 text-indigo-600",
  CREATOR: "bg-red-50 text-brand",
};

// The commenter's relationship to THIS project — not their account role.
//
// ⚠️ Renamed from `RoleBadge` on 20/08. It used to share that name with the account-role
// badge (now components/ui/RoleBadge.jsx) while meaning something completely different,
// and the shared name was the trap: the next person tidying up would merge the two.
//
// The value comes from SQL, not from the roles table: CREATOR when the author owns the
// project, BACKER when they actually invested in THAT project. From CLAUDE.md — reading
// their account roles instead "would badge everyone BACKER and make it meaningless."
function CommentRoleBadge({ role }) {
  if (!role) return null;
  const tone = ROLE_STYLES[role] || "bg-neutral-100 text-neutral-600";
  return (
    <span className={`shrink-0 rounded px-[7px] py-0.5 text-[10px] font-bold tracking-[0.06em] ${tone}`}>
      {role}
    </span>
  );
}

export default function CommentItem({ comment, isReply = false }) {
  return (
    // 46px is the avatar (34px) plus the 12px gap, so a reply lines up under the parent's
    // text rather than under its avatar. CommentList repeats the same offset for the reply
    // box and the Reply button.
    <div className={`flex gap-3 ${isReply ? "mt-3 pl-[46px]" : "mt-0 pl-0"}`}>
      <Avatar name={comment.author} size={34} max={1} />
      <div className="flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold text-neutral-900">{comment.author}</span>
          <CommentRoleBadge role={comment.role} />
          <span className="text-[12px] text-neutral-400">• {comment.time}</span>
        </div>
        <p className="m-0 text-[14px] leading-relaxed text-neutral-700">
          {comment.text}
        </p>
      </div>
    </div>
  );
}
