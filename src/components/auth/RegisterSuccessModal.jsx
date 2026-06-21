export default function RegisterSuccessModal({ onGoToLogin }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff", borderRadius: "10px", width: "100%", maxWidth: "420px",
          borderTop: "5px solid #cc0000", padding: "40px 32px 28px",
          textAlign: "center", animation: "regSuccessIn 0.35s ease-out",
        }}
      >
        <style>{`
          @keyframes regSuccessIn {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        <div style={{
          width: "60px", height: "60px", borderRadius: "50%",
          background: "#cc0000", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 20px",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "0.02em" }}>
          ACCOUNT CREATED
        </h2>

        <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.7, margin: "0 0 28px" }}>
          You've successfully registered with RMIT Launchpad. Please sign in to start exploring and validating ideas.
        </p>

        <button
          onClick={onGoToLogin}
          style={{
            width: "100%", background: "#cc0000", color: "#fff", border: "none",
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
            e.currentTarget.style.background = "#cc0000";
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
