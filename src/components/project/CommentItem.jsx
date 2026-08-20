import { initials } from "../ui/initials";

const ROLE_STYLES = {
  BACKER: { background: "#eef2ff", color: "#4f46e5" },
  CREATOR: { background: "#fff1f1", color: "var(--color-brand)" },
};

function RoleBadge({ role }) {
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

function AuthorAvatar({ name }) {
  return (
    <div style={{
      width: "34px", height: "34px", borderRadius: "50%",
      background: "#e8e8e8", border: "1px solid #ddd",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "12px", fontWeight: 700, color: "#666", flexShrink: 0,
    }}>
      {initials(name, { max: 1 })}
    </div>
  );
}

export default function CommentItem({ comment, isReply = false }) {
  return (
    <div style={{
      display: "flex", gap: "12px",
      paddingLeft: isReply ? "46px" : "0",
      marginTop: isReply ? "12px" : "0",
    }}>
      <AuthorAvatar name={comment.author} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#111" }}>{comment.author}</span>
          <RoleBadge role={comment.role} />
          <span style={{ fontSize: "12px", color: "#aaa" }}>• {comment.time}</span>
        </div>
        <p style={{ margin: 0, fontSize: "14px", color: "#444", lineHeight: 1.6 }}>
          {comment.text}
        </p>
      </div>
    </div>
  );
}
