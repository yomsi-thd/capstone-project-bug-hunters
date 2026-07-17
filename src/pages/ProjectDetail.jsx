import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Tag from "../components/project/Tag";
import CommentList from "../components/project/CommentList";
import BackerInvestmentModal from "../components/project/BackerInvestmentModal";
import BackerInvestmentSuccessModal from "../components/project/BackerInvestmentSuccessModal";
import useWindowWidth from "../hooks/useWindowWidth";
import { useAuth } from "../context/AuthContext";
import { PROJECT_DETAILS, COMMENTS_BY_PROJECT } from "../mock";

function FundingBar({ percent }) {
  return (
    <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px", overflow: "hidden", margin: "10px 0" }}>
      <div style={{
        height: "100%", width: `${Math.min(percent, 100)}%`,
        background: "#cc0000", borderRadius: "3px", transition: "width 0.4s ease",
      }} />
    </div>
  );
}

function TabNav({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "28px", gap: "0" }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 20px", fontSize: "14px", fontWeight: active === tab.id ? 700 : 400,
            color: active === tab.id ? "#cc0000" : "#666",
            borderBottom: active === tab.id ? "2px solid #cc0000" : "2px solid transparent",
            marginBottom: "-2px", transition: "all 0.15s", position: "relative",
            display: "flex", alignItems: "center", gap: "6px",
          }}
          onMouseEnter={e => {
            if (active !== tab.id) {
              e.currentTarget.style.color = "#cc0000";
              e.currentTarget.style.borderBottomColor = "rgba(204,0,0,0.3)";
            }
          }}
          onMouseLeave={e => {
            if (active !== tab.id) {
              e.currentTarget.style.color = "#666";
              e.currentTarget.style.borderBottomColor = "transparent";
            }
          }}
        >
          {tab.label}
          {tab.count != null && (
            <span style={{
              background: active === tab.id ? "#cc0000" : "#e5e7eb",
              color: active === tab.id ? "#fff" : "#666",
              fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "10px",
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function EndorsedBadge() {
  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: "8px",
      padding: "14px 16px", marginTop: "14px",
      display: "flex", gap: "10px", alignItems: "flex-start",
    }}>
      <div style={{
        width: "22px", height: "22px", borderRadius: "50%",
        background: "#cc0000", display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, marginTop: "1px",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#111", marginBottom: "3px" }}>
          RMIT Endorsed Project
        </div>
        <div style={{ fontSize: "12px", color: "#888", lineHeight: 1.5 }}>
          This project has been reviewed and approved by the School of Engineering ethics and feasibility board.
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { isLoggedIn, canInvest, balance } = useAuth();
  const [activeTab, setActiveTab] = useState("about");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const w = useWindowWidth();
  const isMobile = w < 640;
  const isTablet = w >= 640 && w < 1024;
  const isDesktop = w >= 1024;

  // Invest flow: closed -> "invest" modal -> "success" modal -> closed
  const [investStep, setInvestStep] = useState(null); // null | "invest" | "success"
  const [investedAmount, setInvestedAmount] = useState(0);

  const handleConfirmInvestment = (amount) => {
    // TODO: call investmentService.invest(p.id, amount) when backend is ready
    setInvestedAmount(amount);
    setInvestStep("success");
  };

  const closeModals = () => {
    setInvestStep(null);
    setInvestedAmount(0);
  };

  // TODO: replace with GET /projects/:id + GET /projects/:id/comments when backend is ready
  const p = PROJECT_DETAILS[id];
  const comments = COMMENTS_BY_PROJECT[id] || [];

  if (!p) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>
        <Header />
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 6px" }}>Project not found</h1>
          <p style={{ fontSize: "14px", color: "#888", margin: "0 0 24px" }}>
            No project exists with the id “{id}”.
          </p>
          <Link
            to="/discover"
            style={{
              display: "inline-block", background: "#cc0000", color: "#fff",
              textDecoration: "none", borderRadius: "6px",
              fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em",
              padding: "12px 28px", transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#aa0000";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(204,0,0,0.35)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#cc0000";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            BACK TO DISCOVER
          </Link>
        </div>
        <Footer isMobile={isMobile} />
      </div>
    );
  }

  const tabs = [
    { id: "about", label: "About" },
    { id: "rewards", label: "Rewards" },
    { id: "updates", label: "Updates", count: p.updates },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      <Header
        search={search}
        setSearch={setSearch}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
      />

      {/* Hero image */}
      <div style={{ width: "100%", height: isMobile ? "220px" : isTablet ? "300px" : "380px", overflow: "hidden", background: "#111" }}>
        <img
          src={p.img}
          alt={p.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
        />
      </div>

      {/* Main content */}
      <div className="lp-reveal" style={{ maxWidth: "1100px", margin: "0 auto", padding: isMobile ? "24px 16px" : "32px 40px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "1fr 300px" : "1fr",
          gap: isDesktop ? "40px" : "28px",
          alignItems: "start",
        }}>

          {/* ── LEFT: Main Content ── */}
          <div>
            <Tag label={p.tag} />
            <h1 style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: 800, margin: "10px 0 14px", lineHeight: 1.2, color: "#111" }}>
              {p.title}
            </h1>

            {/* Creator */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "50%",
                background: "#e8e8e8", border: "1px solid #ddd",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 700, color: "#666", flexShrink: 0,
              }}>
                {p.creator.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#111" }}>{p.creator.name}</div>
                <div style={{ fontSize: "12px", color: "#888" }}>{p.creator.role}</div>
              </div>
            </div>

            {/* Sidebar injected here on mobile/tablet */}
            {!isDesktop && <FundingSidebar p={p} canInvest={canInvest} isMobile={isMobile} onInvest={() => setInvestStep("invest")} />}

            {/* Tab nav */}
            <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

            {/* About tab content */}
            {activeTab === "about" && (
              <div>
                <p style={{ fontSize: "15px", color: "#444", lineHeight: 1.8, margin: "0 0 28px" }}>
                  {p.about}
                </p>

                <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 12px", color: "#111" }}>
                  The Challenge
                </h2>
                <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.8, margin: "0 0 28px" }}>
                  {p.challenge}
                </p>

                {/* Gallery image */}
                {p.gallery[0] && (
                  <div
                    style={{ borderRadius: "10px", overflow: "hidden", marginBottom: "28px", background: "#111" }}
                    onMouseEnter={e => { const img = e.currentTarget.querySelector("img"); if (img) img.style.transform = "scale(1.05)"; }}
                    onMouseLeave={e => { const img = e.currentTarget.querySelector("img"); if (img) img.style.transform = "scale(1)"; }}
                  >
                    <img src={p.gallery[0]} alt="Project gallery" style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }} />
                  </div>
                )}

                <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 12px", color: "#111" }}>
                  Our Solution
                </h2>
                <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.8, margin: "0 0 16px" }}>
                  {p.solution.intro}
                </p>
                <ul style={{ margin: "0 0 28px", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {p.solution.bullets.map((b, i) => (
                    <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ color: "#cc0000", fontWeight: 700, marginTop: "2px", flexShrink: 0 }}>▸</span>
                      <span style={{ fontSize: "14px", color: "#555", lineHeight: 1.7 }}>
                        <strong style={{ color: "#111" }}>{b.title}:</strong> {b.desc}
                      </span>
                    </li>
                  ))}
                </ul>

                <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 12px", color: "#111" }}>
                  How Your Funding Helps
                </h2>
                <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.8, margin: "0 0 40px" }}>
                  {p.funding}
                </p>

                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "32px" }}>
                  <CommentList
                    comments={comments}
                    totalComments={p.totalComments}
                    isLoggedIn={isLoggedIn}
                  />
                </div>
              </div>
            )}

            {activeTab === "rewards" && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#aaa" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎁</div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>No rewards available yet</div>
              </div>
            )}

            {activeTab === "updates" && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#aaa" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{p.updates} updates posted</div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>Connect to backend to load updates</div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Sidebar (desktop only) ── */}
          {isDesktop && <FundingSidebar p={p} canInvest={canInvest} isMobile={false} onInvest={() => setInvestStep("invest")} />}
        </div>
      </div>

      <Footer isMobile={isMobile} />

      {investStep === "invest" && (
        <BackerInvestmentModal
          project={p}
          balance={balance}
          onClose={closeModals}
          onConfirm={handleConfirmInvestment}
        />
      )}

      {investStep === "success" && (
        <BackerInvestmentSuccessModal
          amount={investedAmount}
          onClose={closeModals}
        />
      )}

    </div>
  );
}

function FundingSidebar({ p, canInvest, isMobile, onInvest }) {
  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: "10px",
      background: "#fff", padding: "22px",
      position: "sticky", top: "72px",
      marginBottom: isMobile ? "28px" : "0",
    }}>
      <FundingBar percent={p.stats.funded} />

      <div style={{ fontSize: "28px", fontWeight: 800, color: "#cc0000", marginBottom: "2px" }}>
        {p.stats.funded}%
      </div>
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "#888", marginBottom: "14px" }}>
        FUNDED
      </div>

      <div style={{ fontSize: "22px", fontWeight: 800, color: "#111" }}>
        ${p.stats.raised.toLocaleString()}
      </div>
      <div style={{ fontSize: "13px", color: "#888", marginBottom: "18px" }}>
        pledged of ${p.stats.goal.toLocaleString()} goal
      </div>

      <div style={{ display: "flex", gap: "24px", marginBottom: "22px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#111" }}>{p.stats.daysLeft}</div>
          <div style={{ fontSize: "12px", color: "#888" }}>days to go</div>
        </div>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#111" }}>{p.stats.backers}</div>
          <div style={{ fontSize: "12px", color: "#888" }}>backers</div>
        </div>
      </div>

      <button
        disabled={!canInvest}
        onClick={() => canInvest && onInvest()}
        style={{
          width: "100%", background: canInvest ? "#cc0000" : "#ccc",
          color: "#fff", border: "none", borderRadius: "6px",
          fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em",
          padding: "14px", cursor: canInvest ? "pointer" : "not-allowed",
          transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
        }}
        onMouseEnter={e => {
          if (!canInvest) return;
          e.currentTarget.style.background = "#aa0000";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(204,0,0,0.35)";
        }}
        onMouseLeave={e => {
          if (!canInvest) return;
          e.currentTarget.style.background = "#cc0000";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        INVEST IN THIS PROJECT
      </button>

      <p style={{ fontSize: "11px", color: "#aaa", textAlign: "center", margin: "8px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        All or nothing funding model.
      </p>

      {p.endorsed && <EndorsedBadge />}
    </div>
  );
}


