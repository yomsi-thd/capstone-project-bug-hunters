export default function RegisterSuccessModal({ onGoToLogin, requestedRole = null }) {
  return (
    <div
      className="lp-overlay"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "16px",
      }}
    >
      <div
        className="lp-modal"
        style={{
          background: "#fff", borderRadius: "10px", width: "100%", maxWidth: "420px",
          borderTop: "5px solid var(--color-brand)", padding: "40px 32px 28px",
          textAlign: "center",
        }}
      >
        <div style={{
          width: "60px", height: "60px", borderRadius: "50%",
          background: "var(--color-brand)", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 20px",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "0.02em" }}>
          ACCOUNT CREATED
        </h2>

        {requestedRole ? (
          <>
            <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.7, margin: "0 0 16px" }}>
              You've successfully registered as a <strong>Backer</strong>. You can sign in and start exploring right away.
            </p>
            <div style={{
              display: "flex", gap: "10px", alignItems: "flex-start", textAlign: "left",
              border: "1px solid #f0d000", background: "#fffbe6", borderRadius: "8px",
              padding: "12px 14px", margin: "0 0 28px",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b58900" strokeWidth="2" style={{ flexShrink: 0, marginTop: "1px" }}>
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ fontSize: "13px", color: "#7a5c00", lineHeight: 1.6 }}>
                Your request for <strong>{requestedRole}</strong> access has been submitted and is
                {" "}<strong>pending admin review</strong>. You'll be able to publish projects once an admin approves it.
              </span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.7, margin: "0 0 28px" }}>
            You've successfully registered with RMIT Launchpad. Please sign in to start exploring and validating ideas.
          </p>
        )}

        <button
          onClick={onGoToLogin}
          style={{
            width: "100%", background: "var(--color-brand)", color: "#fff", border: "none",
            borderRadius: "6px", fontSize: "13px", fontWeight: 700,
            letterSpacing: "0.04em", padding: "13px", cursor: "pointer",
            transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#aa0000";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(204,0,0,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "var(--color-brand)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          GO TO LOGIN
        </button>
      </div>
    </div>
  );
}
