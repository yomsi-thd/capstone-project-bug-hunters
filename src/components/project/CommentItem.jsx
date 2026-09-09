import Avatar from "../ui/Avatar";

// Indigo for BACKER, brand red for CREATOR. Not ui/Badge's tones, because these two are
// not "success" or "danger" but two sides of a relationship, and the indigo is what makes
// the creator's replies stand out in a thread of backers.
const ROLE_STYLES = {
  BACKER: "bg-indigo-50 text-indigo-600",
  CREATOR: "bg-red-50 text-brand",
};

// The commenter's relationship to this project, not their account role. Named apart from
// ui/RoleBadge for that reason: the two look alike and mean different things.
//
// The value comes from SQL rather than the roles table, so it reads CREATOR when the
// author owns this project and BACKER when they invested in it. Using account roles
// would badge everyone BACKER and mean nothing.
function CommentRoleBadge({ role }) {
  if (!role) return null;
  const tone = ROLE_STYLES[role] || "bg-neutral-100 text-neutral-600";
  return (
    <span className={`shrink-0 rounded px-[7px] py-0.5 text-[10px] font-bold tracking-[0.06em] ${tone}`}>
      {role}
    </span>
  );
}

// The caller decides `canDelete` through canDeleteComment(), so one rule covers roots
// and replies alike. `onDelete` opens the caller's confirmation dialog: this component
// never deletes anything itself, since warning about cascaded replies needs the whole
// thread and only CommentList has it.
export default function CommentItem({ comment, isReply = false, canDelete = false, onDelete }) {
  return (
    // 46px is the 34px avatar plus the 12px gap, so a reply lines up under the parent's
    // text rather than its avatar. CommentList uses the same offset.
    <div className={`flex gap-3 ${isReply ? "mt-3 pl-[46px]" : "mt-0 pl-0"}`}>
      <Avatar name={comment.author} size={34} max={1} />
      <div className="flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold text-neutral-900">{comment.author}</span>
          <CommentRoleBadge role={comment.role} />
          <span className="text-[12px] text-neutral-400">• {comment.time}</span>
          {canDelete && (
            // ml-auto rather than a wrapper, since the row already wraps and another
            // flex container would break the badge's alignment when narrow.
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
