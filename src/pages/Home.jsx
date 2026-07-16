import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Tag from "../components/project/Tag";
import ProjectCard from "../components/project/ProjectCard";
import useWindowWidth from "../hooks/useWindowWidth";
import {
  FRESH,
  HERO_PROJECTS,
  TRENDING,
  FILTERS,
} from "../mock";

function HeroCard({ project, style, showDesc, showFundingBar }) {
  return (
    <Link to={`/project/${project.id}`} style={{ textDecoration: "none", color: "inherit", ...style }}>
      <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", cursor: "pointer", height: "100%" }}>
        <img
          src={project.img}
          alt={project.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: showDesc
            ? "linear-gradient(to top, rgba(0,0,0,0.82) 40%, rgba(0,0,0,0.1) 100%)"
            : showFundingBar
              ? "linear-gradient(to top, rgba(0,0,0,0.70) 50%, rgba(0,0,0,0.1) 100%)"
              : "rgba(0,0,0,0.25)",
        }} />
        <div style={{
          position: "absolute",
          bottom: showDesc ? undefined : "14px",
          ...(showDesc ? { bottom: "28px", left: "28px", right: "28px" } : { left: "14px", right: showFundingBar ? "14px" : undefined }),
        }}>
          <Tag label={project.tag} />
          <h3 style={{
            margin: showDesc ? "8px 0 6px" : "6px 0 0",
            fontSize: showDesc ? "26px" : "15px",
            fontWeight: showDesc ? 800 : 700,
            color: "#fff",
            lineHeight: showDesc ? 1.2 : undefined,
          }}>
            {project.title}
          </h3>
          {showDesc && project.desc && (
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
              {project.desc}
            </p>
          )}
          {showFundingBar && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.3)", borderRadius: "2px" }}>
                <div style={{ width: `${project.funded}%`, height: "100%", background: "#cc0000", borderRadius: "2px" }} />
              </div>
              <span style={{ fontSize: "11px", color: "#fff", fontWeight: 600 }}>{project.funded}%</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
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

  const SMALL_HERO_H = 200;
  const HERO_GAP = 12;
  const largeHeroH = SMALL_HERO_H * 2 + HERO_GAP;

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

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: containerPadding }}>

        {/* Hero Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "1fr 320px" : isTablet ? "1fr 1fr" : "1fr",
          gridTemplateRows: isDesktop ? `${SMALL_HERO_H}px ${SMALL_HERO_H}px` : "auto",
          gap: `${HERO_GAP}px`,
          marginBottom: isMobile ? "32px" : "48px",
        }}>
          <HeroCard
            project={HERO_PROJECTS[0]}
            showDesc={!isMobile}
            style={{
              gridRow: isDesktop ? "1 / 3" : "auto",
              gridColumn: isTablet ? "1 / -1" : "auto",
              height: isMobile ? "260px" : isTablet ? "320px" : `${largeHeroH}px`,
            }}
          />

          {!isMobile && (
            <HeroCard
              project={HERO_PROJECTS[1]}
              showFundingBar
              style={{ height: isTablet ? "180px" : `${SMALL_HERO_H}px` }}
            />
          )}

          {!isMobile && (
            <HeroCard
              project={HERO_PROJECTS[2]}
              style={{ height: isTablet ? "180px" : `${SMALL_HERO_H}px` }}
            />
          )}
        </div>

        {/* Trending Projects */}
        <div style={{ marginBottom: isMobile ? "32px" : "48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "4px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? "18px" : "22px", fontWeight: 800, color: "#111" }}>Trending Projects</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#888" }}>Projects gaining momentum across RMIT.</p>
            </div>
            <Link to="/discover" style={{ fontSize: "12px", color: "#cc0000", fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap", textDecoration: "none" }}>
              VIEW ALL →
            </Link>
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

        {/* Fresh Ideas */}
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

      <Footer isMobile={isMobile} />
    </div>
  );
}
