import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Tag from "../components/project/Tag";
import useBreakpoint from "../hooks/useBreakpoint";
import { useAuth } from "../context/AuthContext";
import { MY_INVESTMENTS } from "../mock";

function InvestmentCard({ investment, isMobile }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#fff",
        marginBottom: "20px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Image */}
      <div style={{
        width: isMobile ? "100%" : "220px",
        height: isMobile ? "160px" : "auto",
        flexShrink: 0,
        background: "#111",
      }}>
        <img
          src={investment.img}
          alt={investment.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: isMobile ? "16px" : "20px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "6px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111" }}>
            {investment.title}
          </h3>
          <Tag label={investment.tag} />
        </div>

        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#777", lineHeight: 1.6 }}>
          {investment.desc}
        </p>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: isMobile ? "16px" : "32px",
          marginBottom: "16px",
        }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "#999", marginBottom: "4px" }}>
              INVESTED AMOUNT
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "15px", fontWeight: 700, color: "#111" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--color-brand)" }} strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H9m0 0h4.5a1.5 1.5 0 0 1 0 3H9" />
              </svg>
              {investment.investedAmount} Coins
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "#999", marginBottom: "4px" }}>
              INVESTMENT DATE
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#111" }}>
              {investment.investmentDate}
            </div>
          </div>

          <div style={{ flex: isMobile ? "0 0 100%" : "1 1 160px", minWidth: "140px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "#999", marginBottom: "4px" }}>
              FUNDING PROGRESS ({investment.fundingProgress}%)
            </div>
            <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(investment.fundingProgress, 100)}%`,
                background: "var(--color-brand)",
                borderRadius: "3px",
              }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
          <button
            style={{
              background: "#fff", border: "1px solid #ddd", borderRadius: "5px",
              fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em",
              padding: "9px 18px", cursor: "pointer", color: "#444",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.borderColor = "var(--color-brand)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#ddd"; }}
          >
            VIEW UPDATES
          </button>
          <Link
            to={`/project/${investment.projectId}`}
            style={{
              textDecoration: "none", background: "var(--color-brand)", color: "#fff",
              border: "none", borderRadius: "5px",
              fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em",
              padding: "9px 18px", cursor: "pointer", display: "inline-block",
              transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#aa0000";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(204,0,0,0.3)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--color-brand)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            PROJECT PAGE
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyLoggedOut({ isMobile }) {
  return (
    <div style={{
      textAlign: "center",
      padding: isMobile ? "60px 20px" : "80px 20px",
      border: "1px dashed #ddd",
      borderRadius: "10px",
      background: "#fff",
    }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔒</div>
      <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#111", margin: "0 0 8px" }}>
        Login to view your investments
      </h3>
      <p style={{ fontSize: "14px", color: "#888", margin: "0 0 24px", maxWidth: "360px", marginLeft: "auto", marginRight: "auto" }}>
        Sign in to track the RMIT innovations you've backed and follow their funding progress.
      </p>
      <Link
        to="/login"
        style={{
          textDecoration: "none", background: "var(--color-brand)", color: "#fff",
          borderRadius: "6px", fontSize: "13px", fontWeight: 700,
          letterSpacing: "0.04em", padding: "12px 28px", display: "inline-block",
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
        LOGIN
      </Link>
    </div>
  );
}

export default function BackerInvestments() {
  const { isLoggedIn } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const pad = isMobile ? "24px 16px" : isTablet ? "28px 24px" : "32px 40px";

  // Local filter over the user's own investments (title / tag / description).
  const q = query.trim().toLowerCase();
  const filtered = q
    ? MY_INVESTMENTS.filter(inv =>
        inv.title.toLowerCase().includes(q) ||
        (inv.tag && inv.tag.toLowerCase().includes(q)) ||
        (inv.desc && inv.desc.toLowerCase().includes(q)))
    : MY_INVESTMENTS;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      <Header
        showSearch={false}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
      />

      <div className="lp-stagger" style={{ maxWidth: "1100px", margin: "0 auto", padding: pad }}>
        <h1 style={{ fontSize: isMobile ? "24px" : "30px", fontWeight: 800, margin: "0 0 6px", color: "#111" }}>
          My Investments
        </h1>
        <p style={{ fontSize: "14px", color: "#888", margin: "0 0 28px" }}>
          Track the progress of RMIT innovations you have supported.
        </p>

        {isLoggedIn ? (
          MY_INVESTMENTS.length > 0 ? (
            <>
              {/* Local filter — sits right above the list it filters. */}
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
                padding: "10px 14px", marginBottom: "24px",
                maxWidth: isMobile ? "100%" : "380px",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search my investments..."
                  style={{ border: "none", background: "none", outline: "none", fontSize: "14px", color: "#333", width: "100%" }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: "14px", lineHeight: 1, padding: 0 }}
                  >✕</button>
                )}
              </div>

              {filtered.length > 0 ? (
                filtered.map(inv => (
                  <InvestmentCard key={inv.id} investment={inv} isMobile={isMobile} />
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "#aaa" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>No investments match “{query}”</div>
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>Try a different search term</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>💼</div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>You haven't backed any projects yet</div>
            </div>
          )
        ) : (
          <EmptyLoggedOut isMobile={isMobile} />
        )}
      </div>

      <Footer isMobile={isMobile} />
    </div>
  );
}
