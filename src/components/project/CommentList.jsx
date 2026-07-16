import { useState } from "react";
import CommentItem from "./CommentItem";

export default function CommentList({ comments = [], totalComments = 0, isLoggedIn = false }) {
  const [text, setText] = useState("");

  const handlePost = () => {
    if (!text.trim()) return;
    // TODO: call commentService.postComment() when API is ready
    console.log("Post comment:", text);
    setText("");
  };

  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 20px", color: "#111" }}>
        Feedback &amp; Discussion
      </h2>

      {/* Leave a comment */}
      <div style={{
        border: "1px solid #e5e7eb", borderRadius: "8px",
        padding: "16px", marginBottom: "28px", background: "#fff",
      }}>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "#888", margin: "0 0 8px" }}>
          LEAVE A COMMENT
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ask a question or share your thoughts with the team..."
          disabled={!isLoggedIn}
          style={{
            width: "100%", minHeight: "80px", border: "none",
            outline: "none", resize: "vertical", fontSize: "14px",
            color: "#333", lineHeight: 1.6, fontFamily: "inherit",
            background: "transparent", boxSizing: "border-box",
            opacity: isLoggedIn ? 1 : 0.5,
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <button
            onClick={handlePost}
            disabled={!isLoggedIn || !text.trim()}
            style={{
              background: isLoggedIn && text.trim() ? "#cc0000" : "#ccc",
              color: "#fff", border: "none", borderRadius: "5px",
              fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em",
              padding: "8px 20px", cursor: isLoggedIn && text.trim() ? "pointer" : "not-allowed",
              transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={e => {
              if (!isLoggedIn || !text.trim()) return;
              e.currentTarget.style.background = "#aa0000";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(204,0,0,0.3)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isLoggedIn && text.trim() ? "#cc0000" : "#ccc";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            POST COMMENT
          </button>
        </div>
      </div>

      {/* Comment list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {comments.map(comment => (
          <div key={comment.id}>
            <CommentItem comment={comment} />
            {comment.replies?.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
            <div style={{ borderBottom: "1px solid #f0f0f0", marginTop: "20px" }} />
          </div>
        ))}
      </div>

      {/* View all */}
      {totalComments > comments.length && (
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button
            style={{
              background: "none", border: "1px solid #ddd", borderRadius: "5px",
              fontSize: "13px", fontWeight: 600, color: "#555",
              padding: "10px 24px", cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#cc0000"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#ddd"}
          >
            VIEW ALL {totalComments} COMMENTS
          </button>
        </div>
      )}
    </div>
  );
}
