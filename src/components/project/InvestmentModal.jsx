import { useState } from "react";

const QUICK_AMOUNTS = [25, 50, 100];

export default function InvestmentModal({ project, balance, onClose, onConfirm }) {
  const [amount, setAmount] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  const handleQuickAmount = (val) => setAmount(val);
  const handleMax = () => setAmount(balance);

  const handleInputChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const val = raw === "" ? 0 : Math.min(parseInt(raw, 10), balance);
    setAmount(val);
  };

  const isValid = amount > 0 && amount <= balance;

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
          background: "#fff", borderRadius: "10px", width: "100%", maxWidth: "550px",
          maxHeight: "90vh", overflowY: "auto",
          borderTop: "5px solid #cc0000",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "24px 30px", borderBottom: "1px solid #eee",
        }}>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#111" }}>
            Invest in Innovation
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer", fontSize: "24px",
              color: "#888", lineHeight: 1, padding: "4px", borderRadius: "4px",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#111"; e.currentTarget.style.background = "#f3f3f3"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "none"; }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "30px" }}>
          {/* Project info */}
          <div style={{
            display: "flex", gap: "15px", alignItems: "center",
            border: "1px solid #eee", borderRadius: "8px", padding: "15px", marginBottom: "30px",
          }}>
            <div style={{ width: "65px", height: "65px", borderRadius: "6px", overflow: "hidden", flexShrink: 0, background: "#111" }}>
              <img src={project.img} alt={project.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#111" }}>{project.title}</div>
              <div style={{ fontSize: "14px", color: "#888" }}>{project.creator.name}, {project.creator.role.split(",").pop().trim()}</div>
            </div>
          </div>

          {/* Amount input */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em", color: "#888" }}>
              INVESTMENT AMOUNT (CC)
            </span>
            <span style={{ fontSize: "14px", color: "#888" }}>
              Balance: <strong style={{ color: "#cc0000" }}>{balance.toLocaleString()} CC</strong>
            </span>
          </div>

          <div style={{
            display: "flex", alignItems: "center",
            border: `1px solid ${inputFocused ? "#cc0000" : "#ddd"}`,
            boxShadow: inputFocused ? "0 0 0 3px rgba(204,0,0,0.1)" : "none",
            borderRadius: "6px", padding: "15px 20px", marginBottom: "18px",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}>
            <span style={{ fontSize: "27px", fontWeight: 800, color: "#cc0000", marginRight: "10px" }}>CC</span>
            <input
              value={amount === 0 ? "" : amount}
              onChange={handleInputChange}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="0"
              inputMode="numeric"
              style={{
                border: "none", outline: "none", flex: 1, textAlign: "right",
                fontSize: "27px", fontWeight: 800, color: "#111",
                background: "transparent",
              }}
            />
          </div>

          {/* Quick amount buttons */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
            {QUICK_AMOUNTS.map(val => (
              <button
                key={val}
                onClick={() => handleQuickAmount(val)}
                disabled={val > balance}
                style={{
                  flex: 1,
                  background: amount === val ? "#cc0000" : "#fff",
                  color: amount === val ? "#fff" : "#444",
                  border: "1px solid",
                  borderColor: amount === val ? "#cc0000" : "#ddd",
                  opacity: val > balance ? 0.4 : 1,
                  borderRadius: "6px",
                  fontSize: "14px", fontWeight: 700, padding: "14px 8px",
                  cursor: val > balance ? "not-allowed" : "pointer",
                  transition: "transform 0.12s, box-shadow 0.12s, background 0.15s, border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => {
                  if (val > balance) return;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.12)";
                  if (amount !== val) { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "#cc0000"; }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = amount === val ? "#cc0000" : "#fff";
                  e.currentTarget.style.borderColor = amount === val ? "#cc0000" : "#ddd";
                }}
                onMouseDown={e => { if (val <= balance) e.currentTarget.style.transform = "translateY(0) scale(0.97)"; }}
                onMouseUp={e => { if (val <= balance) e.currentTarget.style.transform = "translateY(-2px) scale(1)"; }}
              >
                {val} CC
              </button>
            ))}
          </div>

          <button
            onClick={handleMax}
            style={{
              width: "100%", background: amount === balance ? "#cc0000" : "#fff",
              color: amount === balance ? "#fff" : "#444",
              border: "1px solid #ddd", borderRadius: "6px",
              fontSize: "13px", fontWeight: 700, padding: "12px", cursor: "pointer",
              marginBottom: "24px", transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => {
              if (amount !== balance) { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "#cc0000"; }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = amount === balance ? "#cc0000" : "#fff";
              e.currentTarget.style.borderColor = "#ddd";
            }}
          >
            MAX ({balance.toLocaleString()} CC)
          </button>

          {/* Disclaimer */}
          <div style={{
            background: "#faf7f2", borderLeft: "3px solid #cc8800",
            borderRadius: "4px", padding: "16px 18px", marginBottom: "30px",
            fontSize: "14px", color: "#666", lineHeight: 1.7,
          }}>
            By confirming this investment, you agree to the{" "}
            <span style={{ color: "#cc0000", fontWeight: 600 }}>Terms of Catalyst Funding</span>.
            Class Coins represent academic backing and hold no real-world financial value outside the RMIT ecosystem.
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, background: "#fff", border: "1px solid #ddd",
                borderRadius: "6px", fontSize: "15px", fontWeight: 700,
                color: "#444", padding: "15px", cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "#bbb"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#ddd"; }}
            >
              CANCEL
            </button>
            <button
              onClick={() => isValid && onConfirm(amount)}
              disabled={!isValid}
              style={{
                flex: 1, background: isValid ? "#cc0000" : "#ccc",
                color: "#fff", border: "none", borderRadius: "6px",
                fontSize: "15px", fontWeight: 700, padding: "15px",
                cursor: isValid ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
              }}
              onMouseEnter={e => {
                if (!isValid) return;
                e.currentTarget.style.background = "#aa0000";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(204,0,0,0.3)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isValid ? "#cc0000" : "#ccc";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              CONFIRM INVESTMENT
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
