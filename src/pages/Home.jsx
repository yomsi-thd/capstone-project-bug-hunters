import { useState } from "react";

const NAV_LINKS = ["Discover", "Departments", "Impact"];

const HERO_PROJECTS = [
  {
    id: 1,
    tag: "ENGINEERING",
    title: "Next-Gen Prosthetics: Neural Interfaces",
    desc: "Developing affordable, neurally-controlled prosthetic limbs using advanced 3D printing and machine learning to restore natural movement and sensation.",
    img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80",
    funded: 87,
    large: true,
  },
  {
    id: 2,
    tag: "BIOTECH",
    title: "Algae-Based Biofuels",
    img: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80",
    funded: 60,
    large: false,
  },
  {
    id: 3,
    tag: "ARCHITECTURE",
    title: "Modular Urban Libraries",
    img: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80",
    funded: 34,
    large: false,
  },
];

const TRENDING = [
  { id: 1, tag: "COMPUTER SCIENCE", title: "Quantum Encryption protocols for IoT devices", desc: "Securing the next generation of smart devices against quantum computing...", funded: 115, img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80" },
  { id: 2, tag: "DESIGN", title: "Generative Typography for Dyslexia", desc: "Adaptive font rendering systems that adjust in real-time to improve reading...", funded: 88, img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300&q=80" },
  { id: 3, tag: "MANUFACTURING", title: "Zero-Waste CNC Machining", desc: "Developing closed-loop recycling systems for metal chips in advanced manufacturing.", funded: 45, img: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=300&q=80" },
  { id: 4, tag: "BUSINESS", title: "Micro-Credit AI Analysis", desc: "Using machine learning to assess non-traditional creditworthiness for small businesses.", funded: 72, img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&q=80" },
];

const FRESH = [
  { id: 1, tag: "MICROELECTRONICS", title: "Biodegradable Sensors", desc: "Creating environmental monitoring sensors that dissolve harmlessly after their operational lifespan.", funded: 12, img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80" },
  { id: 2, tag: "FASHION TECH", title: "Kinetic Energy Textiles", desc: "Weaving piezoelectric materials into everyday clothing to harvest energy from human movement.", funded: 5, img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
  { id: 3, tag: "ACOUSTICS", title: "Active Noise Cancellation Windows", desc: "Applying metamaterials to glass to selectively block urban noise pollution while allowing airflow.", funded: 22, img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
];

const TAG_COLORS = {
  "COMPUTER SCIENCE": { bg: "#1a3a5c", text: "#fff" },
  "DESIGN": { bg: "#2d1a5c", text: "#fff" },
  "MANUFACTURING": { bg: "#1a3a2d", text: "#fff" },
  "BUSINESS": { bg: "#3a2d1a", text: "#fff" },
  "MICROELECTRONICS": { bg: "#1a2d3a", text: "#fff" },
  "FASHION TECH": { bg: "#3a1a2d", text: "#fff" },
  "ACOUSTICS": { bg: "#1a3a3a", text: "#fff" },
  "ENGINEERING": { bg: "#1a3a5c", text: "#fff" },
  "BIOTECH": { bg: "#1a3a2d", text: "#fff" },
  "ARCHITECTURE": { bg: "#3a2d1a", text: "#fff" },
};

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  if (typeof window !== "undefined") {
    window.addEventListener("resize", () => setWidth(window.innerWidth));
  }
  return width;
}

function Tag({ label }) {
  const colors = TAG_COLORS[label] || { bg: "#333", text: "#fff" };
  return (
    <span style={{
      background: colors.bg, color: colors.text,
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
      padding: "3px 8px", borderRadius: "3px", display: "inline-block",
    }}>{label}</span>
  );
}

function FundingBar({ percent }) {
  const clamped = Math.min(percent, 100);
  return (
    <div style={{ marginTop: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#cc0000" }}>{percent}%</span>
        <span style={{ fontSize: "11px", color: "#888" }}>Funded</span>
      </div>
      <div style={{ height: "3px", background: "#e5e5e5", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${clamped}%`, background: "#cc0000", borderRadius: "2px" }} />
      </div>
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #ececec", borderRadius: "8px",
      overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column",
      transition: "box-shadow 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ height: "160px", overflow: "hidden", position: "relative" }}>
        <img src={project.img} alt={project.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", top: "10px", left: "10px" }}><Tag label={project.tag} /></div>
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1, gap: "6px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111", lineHeight: 1.35 }}>{project.title}</h3>
        {project.desc && <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: 1.5 }}>{project.desc}</p>}
        <FundingBar percent={project.funded} />
      </div>
    </div>
  );
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("Discover");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const w = useWindowWidth();
  const isMobile = w < 640;
  const isTablet = w >= 640 && w < 1024;
  const isDesktop = w >= 1024;

  const filters = ["ALL", "TECH", "ART", "SCIENCE"];

  const filteredFresh = FRESH.filter(p => {
    const matchFilter = activeFilter === "ALL" ||
      (activeFilter === "TECH" && ["MICROELECTRONICS", "FASHION TECH"].includes(p.tag)) ||
      (activeFilter === "SCIENCE" && p.tag === "ACOUSTICS");
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Responsive grid helpers
  const trendingCols = isDesktop ? "repeat(4, 1fr)" : isTablet ? "repeat(2, 1fr)" : "1fr";
  const freshCols = isDesktop ? "repeat(3, 1fr)" : isTablet ? "repeat(2, 1fr)" : "1fr";

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 639px) {
          .hero-grid { grid-template-columns: 1fr !important; grid-template-rows: auto !important; }
          .hero-large { grid-row: auto !important; min-height: 260px !important; }
          .hero-small { height: 180px !important; }
          .footer-inner { flex-direction: column !important; gap: 20px !important; }
          .footer-links { flex-wrap: wrap !important; gap: 12px !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .hero-grid { grid-template-columns: 1fr 1fr !important; grid-template-rows: auto auto !important; }
          .hero-large { grid-row: 1 !important; grid-column: 1 / -1 !important; min-height: 320px !important; }
          .hero-small { height: 180px !important; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        background: "#fff", borderBottom: "1px solid #ececec",
        padding: isMobile ? "0 16px" : "0 40px",
        display: "flex", alignItems: "center", gap: isMobile ? "8px" : "32px",
        height: "56px", position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ fontWeight: 800, fontSize: isMobile ? "16px" : "18px", color: "#cc0000", lineHeight: 1.1, marginRight: "4px", flexShrink: 0 }}>
          RMIT<br /><span style={{ fontWeight: 400, fontSize: isMobile ? "12px" : "14px", color: "#111" }}>Launchpad</span>
        </div>

        {/* Desktop nav links */}
        {!isMobile && (
          <div style={{ display: "flex", gap: "4px", flex: 1 }}>
            {NAV_LINKS.map(link => (
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

        {/* Desktop search */}
        {isDesktop && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f3", borderRadius: "6px", padding: "6px 12px", width: "200px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." style={{ border: "none", background: "none", outline: "none", fontSize: "13px", color: "#333", width: "100%" }} />
          </div>
        )}

        {/* Tablet search icon */}
        {isTablet && (
          <button onClick={() => setSearchOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", fontSize: "18px" }}>🔍</button>
        )}

        {/* Mobile search icon */}
        {isMobile && (
          <button onClick={() => setSearchOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "18px" }}>🔍</button>
        )}

        {/* Desktop auth buttons */}
        {isDesktop && (
          <>
            <button style={{ background: "none", border: "none", fontSize: "13px", color: "#444", cursor: "pointer", fontWeight: 500 }}>LOGIN</button>
            <button style={{ background: "#cc0000", color: "#fff", border: "none", borderRadius: "5px", fontSize: "13px", fontWeight: 700, padding: "8px 16px", cursor: "pointer", letterSpacing: "0.03em" }}>START A PROJECT</button>
          </>
        )}

        {/* Tablet login */}
        {isTablet && (
          <button style={{ background: "#cc0000", color: "#fff", border: "none", borderRadius: "5px", fontSize: "12px", fontWeight: 700, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>START</button>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "22px", color: "#444" }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
      </nav>

      {/* Mobile expandable search */}
      {(isMobile || isTablet) && searchOpen && (
        <div style={{ background: "#fff", borderBottom: "1px solid #ececec", padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f3", borderRadius: "6px", padding: "8px 12px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." autoFocus style={{ border: "none", background: "none", outline: "none", fontSize: "14px", color: "#333", width: "100%" }} />
          </div>
        </div>
      )}

      {/* Mobile menu dropdown */}
      {isMobile && menuOpen && (
        <div style={{ background: "#fff", borderBottom: "1px solid #ececec", padding: "8px 16px 16px" }}>
          {NAV_LINKS.map(link => (
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

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: isMobile ? "20px 16px" : isTablet ? "24px 20px" : "32px 24px" }}>

        {/* Hero Grid */}
        <div className="hero-grid" style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "1fr 320px" : isTablet ? "1fr 1fr" : "1fr",
          gridTemplateRows: isDesktop ? "auto auto" : "auto",
          gap: "12px", marginBottom: isMobile ? "32px" : "48px",
        }}>
          <div className="hero-large" style={{ gridRow: isDesktop ? "1 / 3" : "auto", position: "relative", borderRadius: "10px", overflow: "hidden", cursor: "pointer", minHeight: isMobile ? "260px" : "420px" }}>
            <img src={HERO_PROJECTS[0].img} alt={HERO_PROJECTS[0].title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.82) 40%, rgba(0,0,0,0.1) 100%)" }} />
            <div style={{ position: "absolute", bottom: isMobile ? "16px" : "28px", left: isMobile ? "16px" : "28px", right: isMobile ? "16px" : "28px" }}>
              <Tag label={HERO_PROJECTS[0].tag} />
              <h2 style={{ margin: "8px 0 6px", fontSize: isMobile ? "18px" : "26px", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{HERO_PROJECTS[0].title}</h2>
              {!isMobile && <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>{HERO_PROJECTS[0].desc}</p>}
            </div>
          </div>
          {(!isMobile) && (
            <>
              <div className="hero-small" style={{ position: "relative", borderRadius: "10px", overflow: "hidden", cursor: "pointer", height: isTablet ? "180px" : "200px" }}>
                <img src={HERO_PROJECTS[1].img} alt={HERO_PROJECTS[1].title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.70) 50%, rgba(0,0,0,0.1) 100%)" }} />
                <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "14px" }}>
                  <Tag label={HERO_PROJECTS[1].tag} />
                  <h3 style={{ margin: "6px 0 4px", fontSize: "15px", fontWeight: 700, color: "#fff" }}>{HERO_PROJECTS[1].title}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.3)", borderRadius: "2px" }}>
                      <div style={{ width: `${HERO_PROJECTS[1].funded}%`, height: "100%", background: "#cc0000", borderRadius: "2px" }} />
                    </div>
                    <span style={{ fontSize: "11px", color: "#fff", fontWeight: 600 }}>{HERO_PROJECTS[1].funded}%</span>
                  </div>
                </div>
              </div>
              <div className="hero-small" style={{ position: "relative", borderRadius: "10px", overflow: "hidden", cursor: "pointer", height: isTablet ? "180px" : "200px" }}>
                <img src={HERO_PROJECTS[2].img} alt={HERO_PROJECTS[2].title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)" }} />
                <div style={{ position: "absolute", bottom: "14px", left: "14px" }}>
                  <Tag label={HERO_PROJECTS[2].tag} />
                  <h3 style={{ margin: "6px 0 0", fontSize: "15px", fontWeight: 700, color: "#fff" }}>{HERO_PROJECTS[2].title}</h3>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Trending Projects */}
        <div style={{ marginBottom: isMobile ? "32px" : "48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "4px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? "18px" : "22px", fontWeight: 800, color: "#111" }}>Trending Projects</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#888" }}>Projects gaining momentum across RMIT.</p>
            </div>
            <button style={{ background: "none", border: "none", fontSize: "12px", color: "#cc0000", cursor: "pointer", fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>VIEW ALL →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: trendingCols, gap: "14px", marginTop: "16px" }}>
            {TRENDING.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>

        {/* Fresh Ideas */}
        <div style={{ marginBottom: isMobile ? "32px" : "48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: "16px", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "12px" : "0" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? "18px" : "22px", fontWeight: 800, color: "#111" }}>Fresh Ideas</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#888" }}>Recently launched campaigns seeking initial backing.</p>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  background: activeFilter === f ? "#cc0000" : "#fff",
                  color: activeFilter === f ? "#fff" : "#444",
                  border: "1px solid", borderColor: activeFilter === f ? "#cc0000" : "#ddd",
                  borderRadius: "5px", fontSize: "12px", fontWeight: 600,
                  padding: "5px 14px", cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.15s",
                }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: freshCols, gap: "14px" }}>
            {filteredFresh.length > 0 ? filteredFresh.map(p => <ProjectCard key={p.id} project={p} />) : (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "#888", fontSize: "14px" }}>No projects found for this filter.</div>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: "28px" }}>
            <button style={{
              background: "#fff", border: "1px solid #ccc", borderRadius: "5px",
              fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
              padding: "12px 36px", cursor: "pointer", color: "#444", transition: "background 0.15s",
              width: isMobile ? "100%" : "auto",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >LOAD MORE PROJECTS</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#1a1a1a", color: "#fff", padding: isMobile ? "32px 16px 24px" : "40px 40px 32px" }}>
        <div className="footer-inner" style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "20px" : "0" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "16px", color: "#fff", marginBottom: "6px" }}>RMIT Launchpad</div>
            <div style={{ fontSize: "12px", color: "#888" }}>© 2026 RMIT University. All rights reserved.</div>
          </div>
          <div className="footer-links" style={{ display: "flex", gap: isMobile ? "12px" : "32px", flexWrap: "wrap" }}>
            {["About RMIT", "Research Ethics", "Terms of Service", "Privacy Policy", "Contact Support"].map(link => (
              <a key={link} href="#" style={{ fontSize: "13px", color: "#aaa", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "#fff"}
                onMouseLeave={e => e.target.style.color = "#aaa"}
              >{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}