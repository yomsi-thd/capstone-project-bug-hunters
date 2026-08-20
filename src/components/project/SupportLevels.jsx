/**
 * The read-only list of a project's Support Levels.
 *
 * Shared by THREE screens — ProjectDetail's tab, AdminApprovals' review panel and
 * EditProject's preview — because three hand-written copies of the same list are three
 * places to drift apart, and the admin's copy is the one that decides whether a project
 * gets approved.
 *
 * Inline styles, matching the rest of components/project/. Khôi's pages are Tailwind but
 * they render this as a black box, so the two never have to agree.
 *
 * ⚠️ The explanatory line at the bottom is not decoration. A support level is a
 * COMMITMENT LEVEL, not a reward: the backer declares what they care about, and the
 * creator owes nothing — Class Coins have no real-world value and creators never receive
 * them, so the platform must not imply anything is being bought. Without that line the
 * data model is one thing and every reader assumes another.
 */
export default function SupportLevels({ levels, emptyMessage, compact = false }) {
  const list = Array.isArray(levels) ? levels : [];

  if (list.length === 0) {
    return (
      <div style={{ padding: compact ? "16px 0" : "40px 0", textAlign: "center", color: "#aaa" }}>
        <div style={{ fontSize: compact ? "22px" : "32px", marginBottom: "8px" }}>◎</div>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>No support levels yet</div>
        <div style={{ fontSize: "13px", marginTop: "4px", color: "#bbb" }}>
          {emptyMessage || "The creator has not set any levels for this project."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: compact ? "10px" : "14px" }}>
        {list.map((level) => (
          <li
            key={level.id}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: "8px",
              padding: compact ? "14px 16px" : "18px 20px",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ fontSize: compact ? "14px" : "16px", fontWeight: 800, color: "#111" }}>
                {level.name}
              </div>
              <div style={{ fontSize: compact ? "15px" : "18px", fontWeight: 800, color: "var(--color-brand)", whiteSpace: "nowrap" }}>
                {level.minAmount.toLocaleString()} CC
                <span style={{ fontSize: "12px", fontWeight: 400, color: "#999" }}> or more</span>
              </div>
            </div>

            {level.bullets.length > 0 && (
              <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {level.bullets.map((line, i) => (
                  <li key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#555", lineHeight: 1.6 }}>
                    <span style={{ color: "var(--color-brand)", flexShrink: 0 }}>›</span>
                    {line}
                  </li>
                ))}
              </ul>
            )}

            {/* The count is the whole reason levels are worth recording: it answers
                "which level do people actually pick". Rendered even at 0 — an empty
                level is a real answer, and hiding it would make the busy ones look
                like the only ones that exist. */}
            <div style={{ marginTop: "10px", fontSize: "11px", color: "#999", letterSpacing: "0.04em" }}>
              {level.backersCount === 0
                ? "No backers at this level yet"
                : `${level.backersCount} ${level.backersCount === 1 ? "backer" : "backers"} at this level`}
            </div>
          </li>
        ))}
      </ul>

      <p style={{ margin: "14px 0 0", fontSize: "12px", color: "#999", lineHeight: 1.7, fontStyle: "italic" }}>
        Levels tell the creator what backers care about — they are not rewards, and
        nothing is owed or shipped.
      </p>
    </div>
  );
}
