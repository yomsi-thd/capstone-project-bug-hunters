import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Tag from "../components/project/Tag";
import ProjectCard from "../components/project/ProjectCard";
import useWindowWidth from "../hooks/useWindowWidth";
import { useAuth } from "../context/AuthContext";
import { FRESH, HERO_PROJECTS, TRENDING, FILTERS } from "../mock";

function HeroCard({ project, style, showDesc, showFundingBar, canInvest }) {
  return (
    <Link to={`/project/${project.id}`} style={{ textDecoration: "none", color: "inherit", ...style }}>
      <div
        style={{ position: "relative", borderRadius: "10px", overflow: "hidden", cursor: "pointer", height: "100%", transition: "transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease" }}
        onMouseEnter={e => {
          e.currentTarget.style.filter = "brightness(1.05)";
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.18)";
          const img = e.currentTarget.querySelector("img");
          if (img) img.style.transform = "scale(1.06)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.filter = "none";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
          const img = e.currentTarget.querySelector("img");
          if (img) img.style.transform = "scale(1)";
        }}
      >
        <img
          src={project.img}
          alt={project.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: showDesc
            ? "linear-gradient(to top, rgba(0,0,0,0.88) 40%, rgba(0,0,0,0.08) 100%)"
            : "linear-gradient(to top, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.1) 100%)",
        }} />
        <div style={{
          position: "absolute",
          ...(showDesc
            ? { bottom: "28px", left: "28px", right: "28px" }
            : { bottom: "14px", left: "14px", right: "14px" }),
        }}>
          <Tag label={project.tag} />
          <h3 style={{
            margin: showDesc ? "8px 0 6px" : "6px 0 0",
            fontSize: showDesc ? "26px" : "15px",
            fontWeight: showDesc ? 800 : 700,
            color: "#fff",
            lineHeight: showDesc ? 1.2 : 1.3,
          }}>
            {project.title}
          </h3>

          {showDesc && project.desc && (
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
              {project.desc}
            </p>
          )}

          {showDesc && canInvest && (
            <button
              onClick={e => { e.preventDefault(); /* TODO: open investment modal */ }}
              style={{
                background: "#cc0000", color: "#fff", border: "none", borderRadius: "5px",
                fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                padding: "8px 18px", cursor: "pointer",
                transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#aa0000";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(204,0,0,0.35)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#cc0000";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              INVEST IN THIS PROJECT
            </button>
          )}

          {showFundingBar && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.3)", borderRadius: "2px" }}>
                <div style={{ width: `${Math.min(project.funded, 100)}%`, height: "100%", background: "#cc0000", borderRadius: "2px" }} />
              </div>
              <span style={{ fontSize: "11px", color: "#fff", fontWeight: 600 }}>{project.funded}%</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Discover() {
  const { canInvest } = useAuth();

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
      (activeFilter === "TECH" && ["MICROELECTRONICS", "FASHION TECH", "COMPUTER SCIENCE"].includes(p.tag)) ||
      (activeFilter === "ART" && ["DESIGN", "FASHION TECH"].includes(p.tag)) ||
      (activeFilter === "SCIENCE" && ["ACOUSTICS", "BIOTECH", "MICROELECTRONICS"].includes(p.tag));
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.desc && p.desc.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const pad = isMobile ? "20px 16px" : isTablet ? "24px 20px" : "32px 40px";
  const SMALL_H = 200;
  const GAP = 12;

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

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: pad }}>

        {/* ── Hero Grid ── */}
        <div className="lp-stagger" style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "1fr 320px" : isTablet ? "1fr 1fr" : "1fr",
          gridTemplateRows: isDesktop ? `${SMALL_H}px ${SMALL_H}px` : "auto",
          gap: `${GAP}px`,
          marginBottom: isMobile ? "32px" : "48px",
        }}>
          <HeroCard
            project={HERO_PROJECTS[0]}
            showDesc={!isMobile}
            canInvest={canInvest}
            style={{
              gridRow: isDesktop ? "1 / 3" : "auto",
              gridColumn: isTablet ? "1 / -1" : "auto",
              height: isMobile ? "260px" : isTablet ? "320px" : `${SMALL_H * 2 + GAP}px`,
            }}
          />
          {!isMobile && (
            <HeroCard
              project={HERO_PROJECTS[1]}
              showFundingBar
              style={{ height: isTablet ? "180px" : `${SMALL_H}px` }}
            />
          )}
          {!isMobile && (
            <HeroCard
              project={HERO_PROJECTS[2]}
              style={{ height: isTablet ? "180px" : `${SMALL_H}px` }}
            />
          )}
        </div>

        {/* ── Trending Projects ── */}
        <div style={{ marginBottom: isMobile ? "32px" : "48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? "18px" : "22px", fontWeight: 800, color: "#111" }}>Trending Projects</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#888" }}>Projects gaining momentum across RMIT.</p>
            </div>
            <a
              href="#fresh"
              style={{ fontSize: "12px", color: "#cc0000", fontWeight: 600, letterSpacing: "0.04em", textDecoration: "none", display: "inline-block", transition: "opacity 0.15s, transform 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.transform = "translateX(3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateX(0)"; }}
            >
              VIEW ALL →
            </a>
          </div>
          <div className="lp-stagger" style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : isTablet ? "repeat(2, 1fr)" : "1fr",
            gap: "14px",
          }}>
            {TRENDING.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>

        {/* ── Fresh Ideas ── */}
        <div id="fresh" style={{ marginBottom: isMobile ? "32px" : "48px" }}>
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
                    fontSize: "12px", fontWeight: 600,
                    padding: "5px 14px", cursor: "pointer",
                    letterSpacing: "0.04em", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.10)";
                    if (activeFilter !== f) e.currentTarget.style.borderColor = "#cc0000";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = activeFilter === f ? "#cc0000" : "#ddd";
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="lp-stagger" style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : isTablet ? "repeat(2, 1fr)" : "1fr",
            gap: "14px",
          }}>
            {filteredFresh.length > 0 ? (
              filteredFresh.map(p => <ProjectCard key={p.id} project={p} />)
            ) : (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px 24px", color: "#aaa" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>No projects found</div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>Try a different filter or search term</div>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: "28px" }}>
            <button
              style={{
                background: "#fff", border: "1px solid #ccc", borderRadius: "5px",
                fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
                padding: "12px 36px", cursor: "pointer", color: "#444",
                width: isMobile ? "100%" : "auto",
                transition: "background 0.15s, transform 0.15s, box-shadow 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#f5f5f5";
                e.currentTarget.style.borderColor = "#cc0000";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.10)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#ccc";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
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
