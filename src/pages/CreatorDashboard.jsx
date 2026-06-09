import { useState } from "react";

const SIDEBAR_LINKS = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "edit", label: "Edit Project", icon: "✎" },
];

const DISCUSSIONS = [
  { id: 1, avatar: "J", color: "#2563eb", title: "Manufacturing timeline questions", preview: "Can you provide more specifics on the supply chain delays mentioned in the last update? Will this push...", replies: 14, time: "8 hours ago" },
  { id: 2, avatar: "M", color: "#dc2626", title: "International Shipping Rates", preview: "The current rates to Europe seem unusually high compared to similar institutional campaigns. Are these...", replies: 9, time: "5 hours ago" },
  { id: 3, avatar: "A", color: "#7c3aed", title: "Academic Paper Pre-release", preview: "Will backers in the 'Research Patron' tier get early access to the draft manuscript before official...", replies: 54, time: "1 day ago" },
];

const TIERS = [
  { name: "Digital Supporter", price: "$25", backers: 145, color: "#2563eb", pct: 65 },
  { name: "Early Adopter", price: "$150", backers: 112, color: "#7c3aed", pct: 50 },
  { name: "Research Patron", price: "$500", backers: 69, color: "#059669", pct: 35 },
  { name: "Institutional Sponsor", price: "$2,000", backers: 20, color: "#dc2626", pct: 15 },
];

const RECENT_BACKERS = ["Sarah Jenkins", "Dr. Alan Turing", "TechVentures Ltd."];

function StatsCard({ label, value, sub, icon }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ececec", borderRadius: "8px", padding: "16px 20px", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#888", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "6px" }}>{label}</div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#111" }}>{value}</div>
          {sub && <div style={{ fontSize: "12px", color: "#22c55e", marginTop: "2px" }}>{sub}</div>}
        </div>
        <div style={{ fontSize: "20px", color: "#aaa" }}>{icon}</div>
      </div>
    </div>
  );
}

export default function CreatorDashboard() {
  const [active, setActive] = useState("dashboard");
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  return (
    <div style={{ fontFamily: "'DM Sans', Arial, sans-serif", display: "flex", minHeight: "100vh", background: "#f7f7f5" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <aside style={{ width: "200px", background: "#1a1a1a", display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #2a2a2a" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#cc0000", letterSpacing: "0.08em" }}>RMIT LAUNCHPAD</div>
        </div>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #2a2a2a" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#cc0000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#fff" }}>PC</div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>Project Creator</div>
              <div style={{ fontSize: "11px", color: "#888" }}>School of Design</div>
            </div>
          </div>
          <button onClick={() => setShowUpdateModal(false)} style={{ width: "100%", background: "#cc0000", color: "#fff", border: "none", borderRadius: "5px", padding: "7px 0", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", marginBottom: "6px" }}>+ NEW PROJECT</button>
          <button onClick={() => setShowUpdateModal(true)} style={{ width: "100%", background: "#2a2a2a", color: "#ccc", border: "none", borderRadius: "5px", padding: "7px 0", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}>↑ NEW UPDATE</button>
        </div>
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {SIDEBAR_LINKS.map(link => (
            <button key={link.id} onClick={() => setActive(link.id)} style={{
              width: "100%", background: active === link.id ? "#cc0000" : "none",
              color: active === link.id ? "#fff" : "#888", border: "none", borderRadius: "5px",
              padding: "8px 12px", fontSize: "12px", fontWeight: 600, textAlign: "left",
              cursor: "pointer", display: "flex", gap: "8px", alignItems: "center", marginBottom: "2px",
            }}>
              <span>{link.icon}</span>{link.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 8px", borderTop: "1px solid #2a2a2a" }}>
          <button style={{ width: "100%", background: "none", color: "#888", border: "none", padding: "8px 12px", fontSize: "12px", textAlign: "left", cursor: "pointer" }}>? Help Center</button>
          <button style={{ width: "100%", background: "none", color: "#888", border: "none", padding: "8px 12px", fontSize: "12px", textAlign: "left", cursor: "pointer" }}>→ Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#111" }}>Dashboard Overview</h1>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#888" }}>Track your campaign's performance and manage your active projects.</p>
          </div>
          <span style={{ background: "#fff", border: "1px solid #ececec", borderRadius: "20px", padding: "4px 14px", fontSize: "12px", fontWeight: 600, color: "#22c55e" }}>Active Campaign</span>
        </div>

        {/* Funding summary */}
        <div style={{ background: "#fff", border: "1px solid #ececec", borderRadius: "10px", padding: "24px", marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "#888", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "6px" }}>TOTAL FUNDS RAISED</div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: "#111" }}>$42,500 <span style={{ fontSize: "18px", color: "#888", fontWeight: 400 }}>/ $50,000</span></div>
          <div style={{ fontSize: "12px", color: "#888", margin: "6px 0 14px" }}>85% of your funding goal reached. 12 days remaining.</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888", marginBottom: "4px" }}>
            <span>Progress</span><span style={{ color: "#cc0000", fontWeight: 700 }}>85%</span>
          </div>
          <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ width: "85%", height: "100%", background: "#cc0000", borderRadius: "3px" }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "14px", marginBottom: "24px" }}>
          <StatsCard label="TOTAL BACKERS" value="342" sub="↑ +12 this week" icon="👥" />
          <StatsCard label="PAGE VIEWS" value="12,450" sub="Conversion rate 2.7%" icon="👁" />
        </div>

        {/* Bottom two cols */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Discussions */}
          <div style={{ background: "#fff", border: "1px solid #ececec", borderRadius: "10px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "#111" }}>Community Discussions</h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#888" }}>Most active threads requiring your attention.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {DISCUSSIONS.map(d => (
                <div key={d.id} style={{ display: "flex", gap: "10px", paddingBottom: "12px", borderBottom: "1px solid #f5f5f5" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>{d.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#cc0000", marginBottom: "2px", cursor: "pointer" }}>{d.title}</div>
                    <div style={{ fontSize: "11px", color: "#666", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.preview}</div>
                    <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>{d.replies} Replies · {d.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <button style={{ marginTop: "12px", background: "none", border: "none", fontSize: "12px", color: "#cc0000", cursor: "pointer", fontWeight: 600, letterSpacing: "0.04em" }}>VIEW ALL DISCUSSIONS →</button>
          </div>

          {/* Backer Tiers */}
          <div style={{ background: "#fff", border: "1px solid #ececec", borderRadius: "10px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "#111" }}>Backer Tiers</h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#888" }}>Distribution of funds across defined reward levels.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {TIERS.map(t => (
                <div key={t.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#111" }}>{t.name} </span>
                      <span style={{ fontSize: "12px", color: "#888" }}>{t.price}</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#888" }}>{t.backers} Backers</span>
                  </div>
                  <div style={{ height: "4px", background: "#f0f0f0", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${t.pct}%`, height: "100%", background: t.color, borderRadius: "2px" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "20px", borderTop: "1px solid #f5f5f5", paddingTop: "14px" }}>
              <div style={{ fontSize: "11px", color: "#888", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "8px" }}>RECENT BACKERS</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {RECENT_BACKERS.map(b => (
                  <span key={b} style={{ background: "#f5f5f5", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", color: "#444", fontWeight: 500 }}>{b}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Post Update Modal */}
      {showUpdateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#fff", borderRadius: "10px", width: "480px", padding: "24px", position: "relative" }}>
            <button onClick={() => setShowUpdateModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#888" }}>×</button>
            <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800, color: "#111" }}>Post Project Update</h2>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: "#1d4ed8", marginBottom: "16px", lineHeight: 1.5 }}>
              ℹ Updates are emailed directly to your backers and posted publicly on your project page. Use this to share progress, milestones, or important news.
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#666", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>UPDATE TITLE</label>
              <input placeholder="e.g., Prototype Phase 1 Completed!" style={{ width: "100%", border: "1px solid #ddd", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#666", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>UPDATE CONTENT</label>
              <div style={{ border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ background: "#f9f9f9", borderBottom: "1px solid #ddd", padding: "6px 10px", display: "flex", gap: "8px" }}>
                  {["B", "I", "≡", "⊞", "🔗"].map(t => <button key={t} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "#444", padding: "2px 6px" }}>{t}</button>)}
                </div>
                <textarea placeholder="Share the details of your progress..." style={{ width: "100%", border: "none", outline: "none", padding: "10px 12px", fontSize: "13px", minHeight: "80px", resize: "vertical", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#666", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>MEDIA ATTACHMENTS</label>
              <div style={{ border: "2px dashed #ddd", borderRadius: "8px", padding: "28px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "24px", color: "#ccc", marginBottom: "6px" }}>↑</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#444" }}>Click to upload or drag and drop</div>
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>SVG, PNG, JPG or GIF (max. 800×400px)</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setShowUpdateModal(false)} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "6px", padding: "8px 20px", fontSize: "13px", cursor: "pointer", color: "#444" }}>CANCEL</button>
              <button style={{ background: "#cc0000", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 20px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>POST UPDATE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}