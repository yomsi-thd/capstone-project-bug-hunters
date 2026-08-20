import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Tag from "../components/project/Tag";
import EmptyState from "../components/ui/EmptyState";
import useBreakpoint from "../hooks/useBreakpoint";
import { useAuth } from "../context/AuthContext";
import * as classCoinApi from "../api/classCoinApi";
import { toInvestment } from "../api/mappers";

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
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            {/* The project was archived after this investment. The card stays — nobody's
                spend history disappears because a creator or admin tidied up — but it is
                marked so the funding bar below is not read as a live campaign. */}
            {investment.archived && (
              <span style={{
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
                color: "#7a5200", background: "#fff8e6", border: "1px solid #f0d9a0",
                borderRadius: "4px", padding: "3px 7px", whiteSpace: "nowrap",
              }}>
                ARCHIVED
              </span>
            )}
            {/* The support level this backer chose. Null for anything backed before
                2026-08-20 and for every "just support" investment, so most cards show
                nothing here. When the card covers several investments it is the HIGHEST
                level they picked — "across N investments" below already says the card is
                a total, so the two do not contradict each other. */}
            {investment.topTier && (
              <span style={{
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
                color: "#7a1020", background: "#fff2f4", border: "1px solid #f3ccd4",
                borderRadius: "4px", padding: "3px 7px", whiteSpace: "nowrap",
              }}>
                {investment.topTier.name.toUpperCase()}
              </span>
            )}
            <Tag label={investment.tag} />
          </div>
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
              {investment.investedAmount.toLocaleString()} CC
            </div>
            {/* Only mentioned above 1: the card is now one PROJECT, so a total of
                900 CC could be one investment or three, and the difference matters
                to somebody reading their own history. */}
            {investment.investmentCount > 1 && (
              <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                across {investment.investmentCount} investments
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "#999", marginBottom: "4px" }}>
              {investment.investmentCount > 1 ? "LATEST INVESTMENT" : "INVESTMENT DATE"}
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#111" }}>
              {investment.investmentDate}
            </div>
            {investment.investmentCount > 1 && (
              <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                first on {investment.firstInvestmentDate}
              </div>
            )}
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
  // canInvest gates the empty state's wording, not the page itself — the route stays
  // open to everyone, and a pure creator can legitimately land here from a stale link.
  const { isLoggedIn, canInvest, canCreate } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const pad = isMobile ? "24px 16px" : isTablet ? "28px 24px" : "32px 40px";

  // One request. This used to read the whole ClassCoin transaction history and then call
  // GET /projects/:id once per row — an N+1 that also produced one card per TRANSACTION,
  // so backing the same project three times looked like three duplicate cards.
  // GET /classcoins/investments groups by project and joins it server-side (2026-08-18).
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await classCoinApi.getMyInvestments();
        if (!cancelled) setInvestments((rows || []).map(toInvestment));
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.message || err.message || "Could not load your investments"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Local filter over the user's own investments (title / tag / description).
  const q = query.trim().toLowerCase();
  const filtered = q
    ? investments.filter(inv =>
        inv.title.toLowerCase().includes(q) ||
        (inv.tag && inv.tag.toLowerCase().includes(q)) ||
        (inv.desc && inv.desc.toLowerCase().includes(q)))
    : investments;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>

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
          loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#888", fontSize: "14px" }}>
              Loading your investments…
            </div>
          ) : loadError ? (
            <EmptyState
              className="py-15"
              icon="⚠️"
              title={<span className="text-red-700">Could not load your investments</span>}
              detail={loadError}
            />
          ) : investments.length > 0 ? (
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
                <EmptyState
                  className="py-12"
                  icon="🔍"
                  title={`No investments match “${query}”`}
                  detail="Try a different search term"
                />
              )}
            </>
          ) : (
            /* A pure creator holds no Class Coin balance and cannot invest, so telling
               them to "invest and it will show up here" points at a door that is locked
               for them — the Header does not even offer them a balance. Same rule as the
               nav: canInvest, not isLoggedIn. */
            canInvest ? (
              <EmptyState
                className="py-15"
                icon="💼"
                title="You haven't backed any projects yet"
                detail="Invest ClassCoins in a project and it will show up here."
              />
            ) : (
              <EmptyState
                className="py-15"
                icon="💼"
                title="This page is for backers"
                detail="Your account does not hold a Class Coin balance, so it cannot invest in projects."
              >
                {/* The CTA is gated on canCreate, not on "not canInvest": an account with
                    no roles at all reaches this branch too, and sending them to a page
                    the route guard rejects would just swap one dead end for another. */}
                {canCreate && (
                  <Link
                    to="/creator-my-projects"
                    style={{
                      display: "inline-block", marginTop: "18px",
                      background: "var(--color-brand)", color: "#fff", textDecoration: "none",
                      borderRadius: "6px", fontSize: "12px", fontWeight: 700,
                      letterSpacing: "0.06em", padding: "10px 22px",
                      transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "#aa0000";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(204,0,0,0.35)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "var(--color-brand)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    GO TO MY PROJECTS
                  </Link>
                )}
              </EmptyState>
            )
          )
        ) : (
          <EmptyLoggedOut isMobile={isMobile} />
        )}
      </div>

      <Footer isMobile={isMobile} />
    </div>
  );
}
