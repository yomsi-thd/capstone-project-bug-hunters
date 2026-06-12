import { Link, useLocation } from "react-router-dom";

export default function Header({
  navLinks,
  search,
  setSearch,
  menuOpen,
  setMenuOpen,
  searchOpen,
  setSearchOpen,
  isMobile,
  isTablet,
  isDesktop,
}) {
  const { pathname } = useLocation();

  const isActive = (path) => {
    if (path === "/discover") return pathname === "/" || pathname === "/discover";
    return pathname === path;
  };

  return (
    <>
      <nav style={{
        background: "#fff", borderBottom: "1px solid #ececec",
        padding: isMobile ? "0 16px" : "0 40px",
        display: "flex", alignItems: "center", gap: isMobile ? "8px" : "32px",
        height: "56px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <Link to="/" style={{ textDecoration: "none", flexShrink: 0, marginRight: "4px" }}>
          <div style={{ fontWeight: 800, fontSize: isMobile ? "16px" : "18px", color: "#cc0000", lineHeight: 1.1 }}>
            RMIT<br /><span style={{ fontWeight: 400, fontSize: isMobile ? "12px" : "14px", color: "#111" }}>Launchpad</span>
          </div>
        </Link>

        {!isMobile && (
          <div style={{ display: "flex", gap: "4px", flex: 1 }}>
            {navLinks.map(({ label, path }) => (
              path.startsWith("#") ? (
                <a key={label} href={path} style={{
                  textDecoration: "none",
                  fontSize: "14px", fontWeight: 400,
                  color: "#444",
                  padding: "6px 12px",
                  borderBottom: "2px solid transparent",
                }}>{label}</a>
              ) : (
                <Link key={label} to={path} style={{
                  textDecoration: "none",
                  fontSize: "14px", fontWeight: isActive(path) ? 600 : 400,
                  color: isActive(path) ? "#cc0000" : "#444",
                  padding: "6px 12px",
                  borderBottom: isActive(path) ? "2px solid #cc0000" : "2px solid transparent",
                  transition: "all 0.15s",
                }}>{label}</Link>
              )
            ))}
          </div>
        )}

        {isMobile && <div style={{ flex: 1 }} />}

        {isDesktop && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f3", borderRadius: "6px", padding: "6px 12px", width: "200px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." style={{ border: "none", background: "none", outline: "none", fontSize: "13px", color: "#333", width: "100%" }} />
          </div>
        )}

        {(isTablet || isMobile) && (
          <button onClick={() => setSearchOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: isMobile ? "4px" : "6px", fontSize: "18px" }} aria-label="Toggle search">🔍</button>
        )}

        {isDesktop && (
          <>
            <Link to="/login" style={{ textDecoration: "none", fontSize: "13px", color: "#444", fontWeight: 500 }}>LOGIN</Link>
            <Link to="/create-project" style={{
              textDecoration: "none", background: "#cc0000", color: "#fff", borderRadius: "5px",
              fontSize: "13px", fontWeight: 700, padding: "8px 16px", letterSpacing: "0.03em",
            }}>START A PROJECT</Link>
          </>
        )}

        {isTablet && (
          <>
            <Link to="/login" style={{ textDecoration: "none", fontSize: "12px", color: "#444", fontWeight: 500, whiteSpace: "nowrap" }}>LOGIN</Link>
            <Link to="/create-project" style={{
              textDecoration: "none", background: "#cc0000", color: "#fff", borderRadius: "5px",
              fontSize: "12px", fontWeight: 700, padding: "7px 12px", whiteSpace: "nowrap",
            }}>START</Link>
          </>
        )}

        {isMobile && (
          <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "22px", color: "#444" }} aria-label="Toggle menu">
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
      </nav>

      {(isMobile || isTablet) && searchOpen && (
        <div style={{ background: "#fff", borderBottom: "1px solid #ececec", padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f3", borderRadius: "6px", padding: "8px 12px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." autoFocus style={{ border: "none", background: "none", outline: "none", fontSize: "14px", color: "#333", width: "100%" }} />
          </div>
        </div>
      )}

      {isMobile && menuOpen && (
        <div style={{ background: "#fff", borderBottom: "1px solid #ececec", padding: "8px 16px 16px" }}>
          {navLinks.map(({ label, path }) => (
            path.startsWith("#") ? (
              <a key={label} href={path} onClick={() => setMenuOpen(false)} style={{
                display: "block", textDecoration: "none", padding: "10px 4px", fontSize: "15px",
                fontWeight: 400, color: "#444", borderBottom: "1px solid #f5f5f5",
              }}>{label}</a>
            ) : (
              <Link key={label} to={path} onClick={() => setMenuOpen(false)} style={{
                display: "block", textDecoration: "none", padding: "10px 4px", fontSize: "15px",
                fontWeight: isActive(path) ? 700 : 400,
                color: isActive(path) ? "#cc0000" : "#444",
                borderBottom: "1px solid #f5f5f5",
              }}>{label}</Link>
            )
          ))}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{
              flex: 1, textAlign: "center", textDecoration: "none", background: "#fff",
              border: "1px solid #ddd", borderRadius: "5px", padding: "9px", fontSize: "13px",
              fontWeight: 600, color: "#444",
            }}>LOGIN</Link>
            <Link to="/create-project" onClick={() => setMenuOpen(false)} style={{
              flex: 1, textAlign: "center", textDecoration: "none", background: "#cc0000",
              color: "#fff", borderRadius: "5px", padding: "9px", fontSize: "13px", fontWeight: 700,
            }}>START A PROJECT</Link>
          </div>
        </div>
      )}
    </>
  );
}
