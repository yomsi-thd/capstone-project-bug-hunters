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

// `canDelete` is decided by the caller through canDeleteComment() rather than re-derived
// here, so the one rule covers the roots and the replies alike. `onDelete` opens the
// caller's confirmation dialog — this component never deletes anything itself, because the
// warning about cascaded replies needs the thread, which only CommentList has.
export default function CommentItem({ comment, isReply = false, canDelete = false, onDelete }) {
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
          {canDelete && (
            // ml-auto rather than a wrapper: the row already wraps, and an extra flex
            // container would break the badge's alignment on a narrow screen.
            <button
              type="button"
              onClick={() => onDelete?.(comment)}
              className="ml-auto cursor-pointer border-none bg-none p-0 text-[12px] font-semibold text-neutral-400 transition-colors duration-150 hover:text-brand"
            >
              Delete
            </button>
          )}
        </div>
        <p className="m-0 text-[14px] leading-relaxed text-neutral-700">
          {comment.text}
        </p>
      </div>
    </div>
  );
}
