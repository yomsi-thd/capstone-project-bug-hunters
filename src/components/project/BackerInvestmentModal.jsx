import Modal from "../ui/Modal";
import { useState } from "react";
import { parseAmount } from "../../api/mappers";
import { meetsMinimum } from "./tierRules";

const QUICK_AMOUNTS = [25, 50, 100];

export default function BackerInvestmentModal({ project, levels = [], balance, onClose, onConfirm }) {
  const [amount, setAmount] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  // null = "No level - just support", which is a real choice and the default.
  const [selectedTierId, setSelectedTierId] = useState(null);

  const selectedTier = levels.find(l => l.id === selectedTierId) || null;
  const belowMinimum = selectedTier != null && !meetsMinimum(amount, selectedTier);

  const handleQuickAmount = (val) => setAmount(val);
  const handleMax = () => setAmount(balance);

  const handleInputChange = (e) => {
    // parseAmount returns 0 for an empty or unreadable field, which is exactly what the
    // old `raw === "" ? 0 : parseInt(raw, 10)` produced — so the cap is all that is left.
    setAmount(Math.min(parseAmount(e.target.value, { integer: true }), balance));
  };

  // Picking a level fills the minimum in for you. Typing MORE afterwards is fine;
  // typing less disables CONFIRM and says why, but deliberately does NOT clear the
  // selection - silently undoing somebody's choice is the surest way to leave them
  // with no idea what just happened.
  const handleSelectTier = (tier) => {
    if (tier === null) {
      setSelectedTierId(null);
      return;
    }
    setSelectedTierId(tier.id);
    if (amount < tier.minAmount) setAmount(Math.min(tier.minAmount, balance));
  };

  const isValid = amount > 0 && amount <= balance && !belowMinimum;

  return (
    <Modal onClose={onClose} maxWidth={550} panelClassName="border-t-[5px] border-brand">
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

          {/* Support levels. The whole block is skipped when the project has none, so
              a project without levels keeps exactly the modal it had before. */}
          {levels.length > 0 && (
            <div style={{ marginBottom: "26px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em", color: "#888", marginBottom: "10px" }}>
                SUPPORT LEVEL (OPTIONAL)
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {levels.map(level => {
                  const affordable = level.minAmount <= balance;
                  const chosen = selectedTierId === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => affordable && handleSelectTier(level)}
                      disabled={!affordable}
                      style={{
                        textAlign: "left", width: "100%",
                        background: chosen ? "#fff8f8" : "#fff",
                        border: `1px solid ${chosen ? "var(--color-brand)" : "#e5e5e5"}`,
                        borderRadius: "8px", padding: "12px 14px",
                        cursor: affordable ? "pointer" : "not-allowed",
                        opacity: affordable ? 1 : 0.5,
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                      onMouseEnter={e => { if (affordable && !chosen) e.currentTarget.style.borderColor = "#bbb"; }}
                      onMouseLeave={e => { if (!chosen) e.currentTarget.style.borderColor = "#e5e5e5"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#111" }}>{level.name}</span>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--color-brand)", whiteSpace: "nowrap" }}>
                          {level.minAmount.toLocaleString()} CC+
                        </span>
                      </div>
                      {level.bullets.length > 0 && (
                        <div style={{ fontSize: "12px", color: "#777", marginTop: "4px", lineHeight: 1.5 }}>
                          {level.bullets[0]}
                          {level.bullets.length > 1 && ` +${level.bullets.length - 1} more`}
                        </div>
                      )}
                      {/* The reason, not just a greyed-out row - the quick-amount
                          buttons already dim the same way when they exceed the balance. */}
                      {!affordable && (
                        <div style={{ fontSize: "11px", color: "#b06", marginTop: "4px" }}>
                          Needs more Class Coins than you have.
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* A first-class choice, not a fallback: investing without declaring a
                    level is perfectly normal and must not look like a mistake. */}
                <button
                  type="button"
                  onClick={() => handleSelectTier(null)}
                  style={{
                    textAlign: "left", width: "100%",
                    background: selectedTierId === null ? "#fff8f8" : "#fff",
                    border: `1px solid ${selectedTierId === null ? "var(--color-brand)" : "#e5e5e5"}`,
                    borderRadius: "8px", padding: "12px 14px", cursor: "pointer",
                    fontSize: "14px", fontWeight: 700, color: "#111",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={e => { if (selectedTierId !== null) e.currentTarget.style.borderColor = "#bbb"; }}
                  onMouseLeave={e => { if (selectedTierId !== null) e.currentTarget.style.borderColor = "#e5e5e5"; }}
                >
                  No level - just support
                </button>
              </div>

              {/* Without this line the code is "record which level was chosen" and every
                  reader still understands "buy a reward". It is what makes the feature
                  mean what the team decided it means. */}
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#999", lineHeight: 1.6, fontStyle: "italic" }}>
                Levels tell the creator what backers care about - they are not rewards,
                and nothing is owed or shipped.
              </p>
            </div>
          )}

          {/* Amount input */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em", color: "#888" }}>
              INVESTMENT AMOUNT (CC)
            </span>
            <span style={{ fontSize: "14px", color: "#888" }}>
              Balance: <strong style={{ color: "var(--color-brand)" }}>{balance.toLocaleString()} CC</strong>
            </span>
          </div>

          <div style={{
            display: "flex", alignItems: "center",
            border: `1px solid ${inputFocused ? "var(--color-brand)" : "#ddd"}`,
            boxShadow: inputFocused ? "0 0 0 3px rgba(204,0,0,0.1)" : "none",
            borderRadius: "6px", padding: "15px 20px", marginBottom: "18px",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}>
            <span style={{ fontSize: "27px", fontWeight: 800, color: "var(--color-brand)", marginRight: "10px" }}>CC</span>
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

          {belowMinimum && (
            <div style={{
              fontSize: "13px", color: "var(--color-brand)", fontWeight: 600,
              marginTop: "-8px", marginBottom: "18px",
            }}>
              &ldquo;{selectedTier.name}&rdquo; needs at least {selectedTier.minAmount.toLocaleString()} CC.
              Raise the amount, or choose &ldquo;No level - just support&rdquo;.
            </div>
          )}

          {/* Quick amount buttons */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
            {QUICK_AMOUNTS.map(val => (
              <button
                key={val}
                onClick={() => handleQuickAmount(val)}
                disabled={val > balance}
                style={{
                  flex: 1,
                  background: amount === val ? "var(--color-brand)" : "#fff",
                  color: amount === val ? "#fff" : "#444",
                  border: "1px solid",
                  borderColor: amount === val ? "var(--color-brand)" : "#ddd",
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
                  if (amount !== val) { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "var(--color-brand)"; }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = amount === val ? "var(--color-brand)" : "#fff";
                  e.currentTarget.style.borderColor = amount === val ? "var(--color-brand)" : "#ddd";
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
              width: "100%", background: amount === balance ? "var(--color-brand)" : "#fff",
              color: amount === balance ? "#fff" : "#444",
              border: "1px solid #ddd", borderRadius: "6px",
              fontSize: "13px", fontWeight: 700, padding: "12px", cursor: "pointer",
              marginBottom: "24px", transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => {
              if (amount !== balance) { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "var(--color-brand)"; }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = amount === balance ? "var(--color-brand)" : "#fff";
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
            <span style={{ color: "var(--color-brand)", fontWeight: 600 }}>Terms of Catalyst Funding</span>.
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
              onClick={() => isValid && onConfirm(amount, selectedTierId)}
              disabled={!isValid}
              style={{
                flex: 1, background: isValid ? "var(--color-brand)" : "#ccc",
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
                e.currentTarget.style.background = isValid ? "var(--color-brand)" : "#ccc";
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
    </Modal>
  );
}
