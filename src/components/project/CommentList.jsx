import { useState } from "react";
import CommentItem from "./CommentItem";

const PREVIEW_COUNT = 3;

/**
 * `onPost(text, parentId)` posts a comment and resolves true on success, so this
 * component only clears its box when the request actually landed. The parent owns the
 * data — it reloads the thread, which is what fills in the author name and the
 * CREATOR / BACKER badge the server derives.
 */
export default function CommentList({
  comments = [],
  totalComments = 0,
  isLoggedIn = false,
  onPost,
  error = null,
}) {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [posting, setPosting] = useState(false);
  // id of the comment currently being replied to, or null.
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const visibleComments = expanded ? comments : comments.slice(0, PREVIEW_COUNT);

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    const ok = await onPost?.(text.trim(), null);
    setPosting(false);
    if (ok) setText("");
  };

  const handleReply = async (parentId) => {
    if (!replyText.trim() || posting) return;
    setPosting(true);
    const ok = await onPost?.(replyText.trim(), parentId);
    setPosting(false);
    if (ok) {
      setReplyText("");
      setReplyTo(null);
    }
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
            disabled={!isLoggedIn || !text.trim() || posting}
            style={{
              background: isLoggedIn && text.trim() ? "var(--color-brand)" : "#ccc",
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
              e.currentTarget.style.background = isLoggedIn && text.trim() ? "var(--color-brand)" : "#ccc";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {posting ? "POSTING…" : "POST COMMENT"}
          </button>
        </div>
        {error && (
          <div style={{ fontSize: "12px", color: "var(--color-brand)", marginTop: "8px" }}>{error}</div>
        )}
        {!isLoggedIn && (
          <div style={{ fontSize: "12px", color: "#aaa", marginTop: "8px" }}>
            Sign in to join the discussion.
          </div>
        )}
      </div>

      {/* Comment list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {visibleComments.map(comment => (
          <div key={comment.id}>
            <CommentItem comment={comment} />
            {comment.replies?.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}

            {/* Replies are one level deep only — a reply has no Reply button of its
                own, matching what CommentItem can render. */}
            {isLoggedIn && (
              replyTo === comment.id ? (
                <div style={{ paddingLeft: "46px", marginTop: "12px" }}>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Reply to ${comment.author}…`}
                    autoFocus
                    style={{
                      width: "100%", minHeight: "62px", border: "1px solid #e5e7eb",
                      borderRadius: "6px", padding: "10px", outline: "none", resize: "vertical",
                      fontSize: "13px", color: "#333", lineHeight: 1.6, fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                    <button
                      onClick={() => { setReplyTo(null); setReplyText(""); }}
                      style={{
                        background: "none", border: "1px solid #ddd", borderRadius: "5px",
                        fontSize: "11px", fontWeight: 600, color: "#666",
                        padding: "6px 14px", cursor: "pointer",
                      }}
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyText.trim() || posting}
                      style={{
                        background: replyText.trim() && !posting ? "var(--color-brand)" : "#ccc",
                        color: "#fff", border: "none", borderRadius: "5px",
                        fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
                        padding: "6px 16px",
                        cursor: replyText.trim() && !posting ? "pointer" : "not-allowed",
                      }}
                    >
                      {posting ? "POSTING…" : "REPLY"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ paddingLeft: "46px", marginTop: "10px" }}>
                  <button
                    onClick={() => { setReplyTo(comment.id); setReplyText(""); }}
                    style={{
                      background: "none", border: "none", padding: 0, cursor: "pointer",
                      fontSize: "12px", fontWeight: 600, color: "#888", transition: "color 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--color-brand)"}
                    onMouseLeave={e => e.currentTarget.style.color = "#888"}
                  >
                    ↩ Reply
                  </button>
                </div>
              )
            )}

            <div style={{ borderBottom: "1px solid #f0f0f0", marginTop: "20px" }} />
          </div>
        ))}

        {comments.length === 0 && (
          <div style={{ fontSize: "13px", color: "#aaa", padding: "8px 0" }}>
            No comments yet — be the first to ask the team something.
          </div>
        )}
      </div>

      {/* View all */}
      {!expanded && comments.length > PREVIEW_COUNT && (
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button
            onClick={() => setExpanded(true)}
            style={{
              background: "none", border: "1px solid #ddd", borderRadius: "5px",
              fontSize: "13px", fontWeight: 600, color: "#555",
              padding: "10px 24px", cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-brand)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#ddd"}
          >
            VIEW ALL {totalComments} COMMENTS
          </button>
        </div>
      )}
    </div>
  );
}
