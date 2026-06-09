export default function Header({
  navLinks,
  activeNav,
  setActiveNav,
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
  return (
    <>
      <nav style={{
        background: "#fff", borderBottom: "1px solid #ececec",
        padding: isMobile ? "0 16px" : "0 40px",
        display: "flex", alignItems: "center", gap: isMobile ? "8px" : "32px",
        height: "56px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? "16px" : "18px", color: "#cc0000", lineHeight: 1.1, marginRight: "4px", flexShrink: 0 }}>
          RMIT<br /><span style={{ fontWeight: 400, fontSize: isMobile ? "12px" : "14px", color: "#111" }}>Launchpad</span>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: "4px", flex: 1 }}>
            {navLinks.map(link => (
              <button key={link} onClick={() => setActiveNav(link)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "14px", fontWeight: activeNav === link ? 600 : 400,
                color: activeNav === link ? "#cc0000" : "#444",
                padding: "6px 12px",
                borderBottom: activeNav === link ? "2px solid #cc0000" : "2px solid transparent",
                transition: "all 0.15s",
              }}>{link}</button>
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

        {isTablet && (
          <button onClick={() => setSearchOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", fontSize: "18px" }}>🔍</button>
        )}

        {isMobile && (
          <button onClick={() => setSearchOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "18px" }}>🔍</button>
        )}

        {isDesktop && (
          <>
            <button style={{ background: "none", border: "none", fontSize: "13px", color: "#444", cursor: "pointer", fontWeight: 500 }}>LOGIN</button>
            <button style={{ background: "#cc0000", color: "#fff", border: "none", borderRadius: "5px", fontSize: "13px", fontWeight: 700, padding: "8px 16px", cursor: "pointer", letterSpacing: "0.03em" }}>START A PROJECT</button>
          </>
        )}

        {isTablet && (
          <button style={{ background: "#cc0000", color: "#fff", border: "none", borderRadius: "5px", fontSize: "12px", fontWeight: 700, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>START</button>
        )}

        {isMobile && (
          <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "22px", color: "#444" }}>
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
          {navLinks.map(link => (
            <button key={link} onClick={() => { setActiveNav(link); setMenuOpen(false); }} style={{
              display: "block", width: "100%", background: "none", border: "none",
              textAlign: "left", padding: "10px 4px", fontSize: "15px",
              fontWeight: activeNav === link ? 700 : 400,
              color: activeNav === link ? "#cc0000" : "#444", cursor: "pointer",
              borderBottom: "1px solid #f5f5f5",
            }}>{link}</button>
          ))}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button style={{ flex: 1, background: "#fff", border: "1px solid #ddd", borderRadius: "5px", padding: "9px", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#444" }}>LOGIN</button>
            <button style={{ flex: 1, background: "#cc0000", color: "#fff", border: "none", borderRadius: "5px", padding: "9px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>START A PROJECT</button>
          </div>
        </div>
      )}
    </>
  );
}
