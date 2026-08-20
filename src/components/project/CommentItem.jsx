import Avatar from "../ui/Avatar";

const ROLE_STYLES = {
  BACKER: { background: "#eef2ff", color: "#4f46e5" },
  CREATOR: { background: "#fff1f1", color: "var(--color-brand)" },
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
  const style = ROLE_STYLES[role] || { background: "#f3f4f6", color: "#555" };
  return (
    <span style={{
      ...style,
      fontSize: "10px", fontWeight: 700,
      letterSpacing: "0.06em", padding: "2px 7px",
      borderRadius: "4px", flexShrink: 0,
    }}>
      {role}
    </span>
  );
}

export default function CommentItem({ comment, isReply = false }) {
  return (
    <div style={{
      display: "flex", gap: "12px",
      paddingLeft: isReply ? "46px" : "0",
      marginTop: isReply ? "12px" : "0",
    }}>
      <Avatar name={comment.author} size={34} max={1} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#111" }}>{comment.author}</span>
          <CommentRoleBadge role={comment.role} />
          <span style={{ fontSize: "12px", color: "#aaa" }}>• {comment.time}</span>
        </div>
        <p style={{ margin: 0, fontSize: "14px", color: "#444", lineHeight: 1.6 }}>
          {comment.text}
        </p>
      </div>
    </div>
  );
}
