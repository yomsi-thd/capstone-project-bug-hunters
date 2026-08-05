import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useBreakpoint, { BREAKPOINTS } from "../../hooks/useBreakpoint";
import { useAuth } from "../../context/AuthContext";
import { getNavLinksForUser } from "../../mock/navLinks";

function CCBadge({ ccBalance }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      border: "1px solid #ddd", borderRadius: "6px",
      padding: "5px 10px", background: "#fff", flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--color-brand)" }} strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H9m0 0h4.5a1.5 1.5 0 0 1 0 3H9" />
      </svg>
      <span style={{ fontSize: "12px", fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>
        BALANCE&nbsp;
        <span style={{ color: "var(--color-brand)" }}>{ccBalance.toLocaleString()} CC</span>
      </span>
    </div>
  );
}

function Avatar({ userName }) {
  return (
    <div style={{
      width: "30px", height: "30px", borderRadius: "50%",
      background: "#e8e8e8", border: "1px solid #ddd",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "11px", fontWeight: 700, color: "#555", flexShrink: 0,
    }}>
      {userName ? userName.charAt(0).toUpperCase() : "U"}
    </div>
  );
}

export default function Header(props = {}) {
  // Header is self-sufficient: it reads the signed-in user from AuthContext and
  // manages its own menu/search state. Any prop passed in still overrides the
  // internal default, so older call sites keep working unchanged.
  const auth = useAuth();
  const [menuOpenState, setMenuOpenState] = useState(false);
  const [searchOpenState, setSearchOpenState] = useState(false);
  const [searchState, setSearchState] = useState("");

  const pick = (value, fallback) => (value !== undefined ? value : fallback);

  const { isMobile, isTablet, isDesktop } = useBreakpoint(BREAKPOINTS.HEADER_DESKTOP_MIN);

  const isLoggedIn = pick(props.isLoggedIn, auth.isLoggedIn);
  const ccBalance = pick(props.ccBalance, auth.balance);
  const userName = pick(props.userName, auth.user?.name ?? "");
  const onLogout = pick(props.onLogout, auth.logout);
  const navLinks = pick(props.navLinks, getNavLinksForUser(auth.user));

  // Role-derived visibility: only Creators start projects; only Backers/Admins
  // hold a Class Coin balance.
  const canCreate = pick(props.canCreate, auth.canCreate);
  const showBalance = pick(props.showBalance, auth.canInvest);
  const showSearch = pick(props.showSearch, true);
  const onToggleSidebar = props.onToggleSidebar;

  const search = pick(props.search, searchState);
  const setSearch = pick(props.setSearch, setSearchState);
  const menuOpen = pick(props.menuOpen, menuOpenState);
  const setMenuOpen = pick(props.setMenuOpen, setMenuOpenState);
  const searchOpen = pick(props.searchOpen, searchOpenState);
  const setSearchOpen = pick(props.setSearchOpen, setSearchOpenState);

  const { pathname } = useLocation();

  const isActive = (path) => {
    if (path === "/discover") return pathname === "/" || pathname === "/discover";
    return pathname === path;
  };

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
      <nav style={{
        background: "#fff", borderBottom: "1px solid #ececec",
        padding: isMobile ? "0 16px" : "0 40px",
        display: "flex", alignItems: "center", gap: isMobile ? "8px" : "16px",
        height: "56px",
      }}>
        {onToggleSidebar && !isDesktop && (
          <button
            onClick={onToggleSidebar}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "20px", color: "#444", borderRadius: "4px", flexShrink: 0, transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#f3f3f3"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
            aria-label="Toggle sidebar"
          >☰</button>
        )}

        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", flexShrink: 0, marginRight: "4px" }}>
          <div style={{ fontWeight: 800, fontSize: isMobile ? "16px" : "18px", color: "var(--color-brand)", lineHeight: 1.1 }}>
            RMIT<br /><span style={{ fontWeight: 400, fontSize: isMobile ? "12px" : "14px", color: "#111" }}>Launchpad</span>
          </div>
        </Link>

        {/* Desktop nav links (tablet folds these into the hamburger to avoid overflow) */}
        {isDesktop && (
          <div style={{ display: "flex", gap: "4px", flex: 1 }}>
            {navLinks.map(({ label, path }) => (
              path.startsWith("#") ? (
                <a
                  key={label}
                  href={path}
                  className="lp-navlink"
                  style={{ fontSize: "14px", fontWeight: 400, padding: "6px 12px" }}
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={label} to={path}
                  className={isActive(path) ? "lp-navlink is-active" : "lp-navlink"}
                  style={{
                    fontSize: "14px", fontWeight: isActive(path) ? 600 : 400,
                    padding: "6px 12px",
                  }}
                >{label}</Link>
              )
            ))}
          </div>
        )}

        {!isDesktop && <div style={{ flex: 1 }} />}

        {/* Desktop search */}
        {isDesktop && showSearch && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f3", borderRadius: "6px", padding: "6px 12px", width: "200px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." style={{ border: "none", background: "none", outline: "none", fontSize: "13px", color: "#333", width: "100%" }} />
          </div>
        )}

        {/* Mobile/tablet search toggle */}
        {(isTablet || isMobile) && showSearch && (
          <button
            onClick={() => setSearchOpen(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: isMobile ? "4px" : "6px", fontSize: "18px", borderRadius: "4px", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#f3f3f3"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
            aria-label="Toggle search"
          >🔍</button>
        )}

        {/* Desktop — Logged Out */}
        {isDesktop && !isLoggedIn && (
          <Link
            to="/login"
            style={{ textDecoration: "none", fontSize: "13px", color: "#444", fontWeight: 500, flexShrink: 0, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--color-brand)"}
            onMouseLeave={e => e.currentTarget.style.color = "#444"}
          >LOGIN</Link>
        )}

        {/* Desktop — Logged In */}
        {isDesktop && isLoggedIn && (
          <>
            {showBalance && <CCBadge ccBalance={ccBalance} />}
            {canCreate && (
              <Link
                to="/create-project"
                style={{
                  textDecoration: "none", background: "var(--color-brand)", color: "#fff", borderRadius: "5px",
                  fontSize: "13px", fontWeight: 700, padding: "8px 16px", letterSpacing: "0.03em", flexShrink: 0,
                  transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#aa0000";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 3px 8px rgba(204,0,0,0.3)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--color-brand)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >START A PROJECT</Link>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <Avatar userName={userName} />
              <Link
                to="/dashboard"
                style={{ textDecoration: "none", fontSize: "13px", color: "#333", fontWeight: 500, transition: "color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--color-brand)"}
                onMouseLeave={e => e.currentTarget.style.color = "#333"}
              >Account</Link>
            </div>
            <button
              onClick={onLogout}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: "13px", color: "#666", fontWeight: 500, padding: 0, flexShrink: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--color-brand)"}
              onMouseLeave={e => e.currentTarget.style.color = "#666"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Logout
            </button>
          </>
        )}

        {/* Tablet — Logged Out */}
        {isTablet && !isLoggedIn && (
          <Link
            to="/login"
            style={{ textDecoration: "none", fontSize: "12px", color: "#444", fontWeight: 500, whiteSpace: "nowrap", transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--color-brand)"}
            onMouseLeave={e => e.currentTarget.style.color = "#444"}
          >LOGIN</Link>
        )}

        {/* Tablet — Logged In */}
        {isTablet && isLoggedIn && (
          <>
            {showBalance && (
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-brand)", whiteSpace: "nowrap" }}>
                {ccBalance.toLocaleString()} CC
              </div>
            )}
            {canCreate && (
              <Link
                to="/create-project"
                style={{
                  textDecoration: "none", background: "var(--color-brand)", color: "#fff", borderRadius: "5px",
                  fontSize: "12px", fontWeight: 700, padding: "7px 12px", whiteSpace: "nowrap",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#aa0000"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--color-brand)"}
              >START A PROJECT</Link>
            )}
            <Avatar userName={userName} />
          </>
        )}
        {!isDesktop && (
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "22px", color: "#444", borderRadius: "4px", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#f3f3f3"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "⋮"}
          </button>
        )}
      </nav>

      {(isMobile || isTablet) && showSearch && searchOpen && (
        <div style={{
          background: "#fff", borderBottom: "1px solid #ececec", padding: "10px 16px",
          boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f3", borderRadius: "6px", padding: "8px 12px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." autoFocus style={{ border: "none", background: "none", outline: "none", fontSize: "14px", color: "#333", width: "100%" }} />
          </div>
        </div>
      )}
      </div>

      {!isDesktop && menuOpen && (
        <div style={{
          background: "#fff", borderBottom: "1px solid #ececec", padding: "8px 16px 16px",
          position: "fixed", top: "56px", left: 0, right: 0, zIndex: 99,
          maxHeight: "calc(100vh - 56px)", overflowY: "auto",
          boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
        }}>
          {navLinks.map(({ label, path }) => (
            path.startsWith("#") ? (
              <a
                key={label}
                href={path}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block", textDecoration: "none", padding: "10px 4px", fontSize: "15px",
                  fontWeight: 400, color: "#444", borderBottom: "1px solid #f5f5f5",
                  transition: "background 0.15s, padding-left 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.paddingLeft = "10px"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.paddingLeft = "4px"; }}
              >
                {label}
              </a>
            ) : (
              <Link
                key={label} to={path} onClick={() => setMenuOpen(false)}
                style={{
                  display: "block", textDecoration: "none", padding: "10px 4px", fontSize: "15px",
                  fontWeight: isActive(path) ? 700 : 400,
                  color: isActive(path) ? "var(--color-brand)" : "#444",
                  borderBottom: "1px solid #f5f5f5",
                  transition: "background 0.15s, padding-left 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.paddingLeft = "10px"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.paddingLeft = "4px"; }}
              >{label}</Link>
            )
          ))}

          {isMobile && !isLoggedIn && (
            <div style={{ marginTop: "12px" }}>
              <Link
                to="/login" onClick={() => setMenuOpen(false)}
                style={{
                  display: "block", textAlign: "center", textDecoration: "none", background: "var(--color-brand)",
                  color: "#fff", borderRadius: "5px", padding: "10px", fontSize: "13px", fontWeight: 700,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#aa0000"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--color-brand)"}
              >LOGIN</Link>
            </div>
          )}

          {isLoggedIn && (
            <div style={{ marginTop: "12px" }}>
              {/* Balance + Start already sit on the tablet bar, so show them in
                  the menu on mobile only; Account + Logout show on both. */}
              {isMobile && showBalance && (
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-brand)", padding: "8px 4px", borderBottom: "1px solid #f5f5f5" }}>
                  Balance: {ccBalance.toLocaleString()} CC
                </div>
              )}
              {isMobile && canCreate && (
                <Link
                  to="/create-project" onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block", textAlign: "center", textDecoration: "none", background: "var(--color-brand)",
                    color: "#fff", borderRadius: "5px", padding: "10px", fontSize: "13px", fontWeight: 700,
                    margin: "10px 0", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#aa0000"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--color-brand)"}
                >START A PROJECT</Link>
              )}
              <Link
                to="/dashboard" onClick={() => setMenuOpen(false)}
                style={{
                  display: "block", textDecoration: "none", padding: "10px 4px",
                  fontSize: "14px", color: "#333", borderBottom: "1px solid #f5f5f5",
                  transition: "background 0.15s, padding-left 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.paddingLeft = "10px"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.paddingLeft = "4px"; }}
              >Account</Link>
              <button
                onClick={() => { setMenuOpen(false); onLogout?.(); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", background: "none",
                  border: "none", padding: "10px 4px", fontSize: "14px", color: "var(--color-brand)",
                  cursor: "pointer", fontWeight: 600,
                  transition: "background 0.15s, padding-left 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.paddingLeft = "10px"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.paddingLeft = "4px"; }}
              >Logout</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}