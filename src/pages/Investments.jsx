import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Tag from "../components/project/Tag";
import useWindowWidth from "../hooks/useWindowWidth";
import { MY_INVESTMENTS } from "../mock";
import { getNavLinks } from "../mock/navLinks";

// TODO: Replace with real auth context
const MOCK_USER = { name: "Huy Nguyen", balance: 4500 };

function InvestmentCard({ investment, isMobile }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      border: "1px solid #e5e7eb",
      borderRadius: "10px",
      overflow: "hidden",
      background: "#fff",
      marginBottom: "20px",
    }}>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2.5">
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
                background: "#cc0000",
                borderRadius: "3px",
              }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
          <button style={{
            background: "#fff", border: "1px solid #ddd", borderRadius: "5px",
            fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em",
            padding: "9px 18px", cursor: "pointer", color: "#444",
          }}>
            VIEW UPDATES
          </button>
          <Link to={`/project/${investment.projectId}`} style={{
            textDecoration: "none", background: "#cc0000", color: "#fff",
            border: "none", borderRadius: "5px",
            fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em",
            padding: "9px 18px", cursor: "pointer", display: "inline-block",
          }}>
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
      <Link to="/login" style={{
        textDecoration: "none", background: "#cc0000", color: "#fff",
        borderRadius: "6px", fontSize: "13px", fontWeight: 700,
        letterSpacing: "0.04em", padding: "12px 28px", display: "inline-block",
      }}>
        LOGIN
      </Link>
    </div>
  );
}

export default function Investments() {
  // TODO: Replace with real auth context
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const w = useWindowWidth();
  const isMobile = w < 640;
  const isTablet = w >= 640 && w < 1024;
  const isDesktop = w >= 1024;

  const pad = isMobile ? "24px 16px" : isTablet ? "28px 24px" : "32px 40px";

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      <Header
        navLinks={getNavLinks(isLoggedIn)}
        search={search}
        setSearch={setSearch}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
        isLoggedIn={isLoggedIn}
        ccBalance={isLoggedIn ? MOCK_USER.balance : 0}
        userName={isLoggedIn ? MOCK_USER.name : ""}
        onLogout={() => setIsLoggedIn(false)}
      />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: pad }}>
        <h1 style={{ fontSize: isMobile ? "24px" : "30px", fontWeight: 800, margin: "0 0 6px", color: "#111" }}>
          My Investments
        </h1>
        <p style={{ fontSize: "14px", color: "#888", margin: "0 0 28px" }}>
          Track the progress of RMIT innovations you have supported.
        </p>

        {isLoggedIn ? (
          MY_INVESTMENTS.length > 0 ? (
            MY_INVESTMENTS.map(inv => (
              <InvestmentCard key={inv.id} investment={inv} isMobile={isMobile} />
            ))
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

      {/* DEV toggle — remove before production */}
      <button
        onClick={() => setIsLoggedIn(v => !v)}
        title="DEV: Toggle auth state"
        style={{
          position: "fixed", bottom: "20px", right: "20px", zIndex: 9999,
          background: isLoggedIn ? "#cc0000" : "#555",
          color: "#fff", border: "none", borderRadius: "20px",
          padding: "7px 14px", fontSize: "11px", fontWeight: 700,
          cursor: "pointer", opacity: 0.85,
        }}
      >
        {isLoggedIn ? "🔓 LOGGED IN" : "🔒 LOGGED OUT"}
      </button>
    </div>
  );
}
