import { useState } from "react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import {
  FRESH,
  HERO_PROJECTS,
  NAV_LINKS,
  TAG_COLORS,
  TRENDING,
  FILTERS,
} from "../mock";

function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  if (typeof window !== "undefined") {
    window.addEventListener("resize", () => setWidth(window.innerWidth));
  }
  return width;
}

function Tag({ label }) {
  const colors = TAG_COLORS[label] || { bg: "#333", text: "#fff" };
  return (
    <span
      style={{ background: colors.bg, color: colors.text }}
      className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-sm inline-block"
    >
      {label}
    </span>
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
    <div
      style={{ background: "#fff", border: "1px solid #ececec", borderRadius: "8px", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", transition: "box-shadow 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ height: "160px", overflow: "hidden", position: "relative" }}>
        <img src={project.img} alt={project.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", top: "10px", left: "10px" }}>
          <Tag label={project.tag} />
        </div>
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1, gap: "6px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111", lineHeight: 1.35 }}>{project.title}</h3>
        {project.desc && (
          <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: 1.5 }}>{project.desc}</p>
        )}
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

  const filteredFresh = FRESH.filter(p => {
    const matchFilter =
      activeFilter === "ALL" ||
      (activeFilter === "TECH" && ["MICROELECTRONICS", "FASHION TECH"].includes(p.tag)) ||
      (activeFilter === "SCIENCE" && p.tag === "ACOUSTICS");
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const containerPadding = isMobile ? "20px 16px" : isTablet ? "24px 20px" : "32px 24px";

  // Hero: right column = 2 rows of 200px + 12px gap = 412px total height
  const SMALL_HERO_H = 200;
  const HERO_GAP = 12;
  const largeHeroH = SMALL_HERO_H * 2 + HERO_GAP; // 412px

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      <Header
        navLinks={NAV_LINKS}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
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

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: containerPadding }}>

        {/* ── Hero Grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "1fr 320px" : isTablet ? "1fr 1fr" : "1fr",
          gridTemplateRows: isDesktop ? `${SMALL_HERO_H}px ${SMALL_HERO_H}px` : "auto",
          gap: `${HERO_GAP}px`,
          marginBottom: isMobile ? "32px" : "48px",
        }}>

          {/* Large hero — spans both rows on desktop, full width on tablet */}
          <div style={{
            gridRow: isDesktop ? "1 / 3" : "auto",
            gridColumn: isTablet ? "1 / -1" : "auto",
            position: "relative",
            borderRadius: "10px",
            overflow: "hidden",
            cursor: "pointer",
            height: isMobile ? "260px" : isTablet ? "320px" : `${largeHeroH}px`,
          }}>
            <img
              src={HERO_PROJECTS[0].img}
              alt={HERO_PROJECTS[0].title}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.82) 40%, rgba(0,0,0,0.1) 100%)" }} />
            <div style={{ position: "absolute", bottom: isMobile ? "16px" : "28px", left: isMobile ? "16px" : "28px", right: isMobile ? "16px" : "28px" }}>
              <Tag label={HERO_PROJECTS[0].tag} />
              <h2 style={{ margin: "8px 0 6px", fontSize: isMobile ? "18px" : "26px", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
                {HERO_PROJECTS[0].title}
              </h2>
              {!isMobile && (
                <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
                  {HERO_PROJECTS[0].desc}
                </p>
              )}
            </div>
          </div>

          {/* Small hero 1 — hidden on mobile */}
          {!isMobile && (
            <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", cursor: "pointer", height: isTablet ? "180px" : `${SMALL_HERO_H}px` }}>
              <img
                src={HERO_PROJECTS[1].img}
                alt={HERO_PROJECTS[1].title}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
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
          )}

          {/* Small hero 2 — hidden on mobile */}
          {!isMobile && (
            <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", cursor: "pointer", height: isTablet ? "180px" : `${SMALL_HERO_H}px` }}>
              <img
                src={HERO_PROJECTS[2].img}
                alt={HERO_PROJECTS[2].title}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)" }} />
              <div style={{ position: "absolute", bottom: "14px", left: "14px" }}>
                <Tag label={HERO_PROJECTS[2].tag} />
                <h3 style={{ margin: "6px 0 0", fontSize: "15px", fontWeight: 700, color: "#fff" }}>{HERO_PROJECTS[2].title}</h3>
              </div>
            </div>
          )}
        </div>

        {/* ── Trending Projects ── */}
        <div style={{ marginBottom: isMobile ? "32px" : "48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "4px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? "18px" : "22px", fontWeight: 800, color: "#111" }}>Trending Projects</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#888" }}>Projects gaining momentum across RMIT.</p>
            </div>
            <button style={{ background: "none", border: "none", fontSize: "12px", color: "#cc0000", cursor: "pointer", fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
              VIEW ALL →
            </button>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : isTablet ? "repeat(2, 1fr)" : "1fr",
            gap: "14px",
            marginTop: "16px",
          }}>
            {TRENDING.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>

        {/* ── Fresh Ideas ── */}
        <div style={{ marginBottom: isMobile ? "32px" : "48px" }}>
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? "12px" : 0,
            marginBottom: "16px",
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? "18px" : "22px", fontWeight: 800, color: "#111" }}>Fresh Ideas</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#888" }}>Recently launched campaigns seeking initial backing.</p>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    background: activeFilter === f ? "#cc0000" : "#fff",
                    color: activeFilter === f ? "#fff" : "#444",
                    border: "1px solid",
                    borderColor: activeFilter === f ? "#cc0000" : "#ddd",
                    borderRadius: "5px",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "5px 14px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "all 0.15s",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : isTablet ? "repeat(2, 1fr)" : "1fr",
            gap: "14px",
          }}>
            {filteredFresh.length > 0 ? (
              filteredFresh.map(p => <ProjectCard key={p.id} project={p} />)
            ) : (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "#888", fontSize: "14px" }}>
                No projects found for this filter.
              </div>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: "28px" }}>
            <button
              style={{
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                padding: "12px 36px",
                cursor: "pointer",
                color: "#444",
                width: isMobile ? "100%" : "auto",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              LOAD MORE PROJECTS
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}