import { Link } from "react-router-dom";

function genTransactionId() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TX-${rand}-RMIT`;
}

export default function InvestmentSuccessModal({ amount, onClose, transactionId }) {
  const txId = transactionId || genTransactionId();

  return (
    <div
      onClick={onClose}
      className="lp-overlay"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="lp-modal"
        style={{
          background: "#fff", borderRadius: "10px", width: "100%", maxWidth: "420px",
          borderTop: "5px solid #cc0000", padding: "40px 32px 28px",
          textAlign: "center",
        }}
      >
        {/* Success icon */}
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
          INVESTMENT SUCCESSFUL
        </h2>

        <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.7, margin: "0 0 28px" }}>
          Your investment of <strong style={{ color: "#111" }}>{amount.toLocaleString()} CC</strong> has been
          successfully processed. Thank you for acting as a catalyst for academic innovation at RMIT Launchpad.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <Link
            to="/investments"
            style={{
              textDecoration: "none", background: "#cc0000", color: "#fff",
              borderRadius: "6px", fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.04em", padding: "13px", display: "block",
              transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#aa0000";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(204,0,0,0.3)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#cc0000";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            VIEW MY INVESTMENTS
          </Link>
          <Link
            to="/discover"
            style={{
              textDecoration: "none", background: "#fff", border: "1px solid #ddd",
              color: "#444", borderRadius: "6px", fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.04em", padding: "13px", display: "block",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "#cc0000"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#ddd"; }}
          >
            BACK TO DISCOVER
          </Link>
        </div>

        <div style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
          <span style={{ fontSize: "11px", color: "#aaa", letterSpacing: "0.04em" }}>
            TRANSACTION ID: {txId}
          </span>
        </div>
      </div>
    </div>
  );
}
