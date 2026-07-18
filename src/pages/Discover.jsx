import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Tag from "../components/project/Tag";
import ProjectCard from "../components/project/ProjectCard";
import useWindowWidth from "../hooks/useWindowWidth";
import { useAuth } from "../context/AuthContext";
import { ALL_PROJECTS, HERO_PROJECTS, TRENDING, FILTERS, FILTER_TAGS, PROJECT_DETAILS } from "../mock";

function HeroCard({ project, style, showDesc, showFundingBar, canInvest, isOwner, onEdit }) {
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

          {/* Owner's CTA: a real edit button that intercepts the click and
              routes to project management — the image/card still navigates to
              the detail page via the wrapping Link. Everyone else sees the
              invest CTA, which is decoration only (the Link carries the click
              to the detail page, where the investment modal lives). */}
          {showDesc && isOwner ? (
            <span
              role="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "#cc0000", color: "#fff", borderRadius: "5px",
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
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              EDIT THIS PROJECT
            </span>
          ) : showDesc && canInvest ? (
            <span
              style={{
                display: "inline-block",
                background: "#cc0000", color: "#fff", borderRadius: "5px",
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
            </span>
          ) : null}

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

const PROJECTS_PREVIEW_COUNT = 6;

export default function Discover() {
  const { canInvest, user } = useAuth();
  const navigate = useNavigate();

  // Ownership lives in PROJECT_DETAILS (single source of truth); the hero
  // listing mirrors it by id. Owner -> "Edit" CTA instead of "Invest".
  const ownsProject = id => !!user && PROJECT_DETAILS[id]?.ownerId === user.username;
  const goToEdit = () => navigate("/creator-my-projects");

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const w = useWindowWidth();
  const isMobile = w < 640;
  const isTablet = w >= 640 && w < 1024;
  const isDesktop = w >= 1024;

  // Search and filters run over the whole catalogue, so a query reaches every
  // project (hero + trending + fresh), not just the ones shown in this grid.
  const filteredProjects = ALL_PROJECTS.filter(p => {
    const matchFilter =
      activeFilter === "ALL" || (FILTER_TAGS[activeFilter] || []).includes(p.tag);
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.desc && p.desc.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  // Once expanded, stay expanded across filter/search changes — "show me
  // everything" is the user's standing intent, not a per-tag setting.
  // Only a remount (refresh, or arriving from another page) collapses it.
  const visibleProjects = showAll ? filteredProjects : filteredProjects.slice(0, PROJECTS_PREVIEW_COUNT);

  // Matches the `!search` check above, so " " counts as searching either way.
  const isSearching = search !== "";

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
            showFundingBar
            canInvest={canInvest}
            isOwner={ownsProject(HERO_PROJECTS[0].id)}
            onEdit={goToEdit}
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
              showFundingBar
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
              href="#all"
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

        {/* ── All Projects ── */}
        <div id="all" style={{ marginBottom: isMobile ? "32px" : "48px" }}>
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? "12px" : 0,
            marginBottom: "16px",
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? "18px" : "22px", fontWeight: 800, color: "#111" }}>All Projects</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#888" }}>Browse and search every campaign on RMIT Launchpad.</p>
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

          {/* Entrance animation plays on tag switch, but never while searching —
              live results should settle, not fade in on every keystroke.
              The key remounts the whole grid so the stagger replays for every
              card at once; without it, cards shared by two tags keep their DOM
              node and sit still while only the new ones animate. Search state is
              in the key so that clearing the box back to empty also remounts:
              otherwise the restored cards would animate alone while the ones
              already on screen stayed put — the same uneven effect, just moved. */}
          <div
            key={`${activeFilter}|${isSearching ? "search" : "browse"}`}
            className={isSearching ? undefined : "lp-stagger"}
            style={{
              display: "grid",
              gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : isTablet ? "repeat(2, 1fr)" : "1fr",
              gap: "14px",
            }}
          >
            {visibleProjects.length > 0 ? (
              visibleProjects.map(p => <ProjectCard key={p.id} project={p} />)
            ) : (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px 24px", color: "#aaa" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>No projects found</div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>Try a different filter or search term</div>
              </div>
            )}
          </div>

          {!showAll && filteredProjects.length > PROJECTS_PREVIEW_COUNT && (
          <div style={{ textAlign: "center", marginTop: "28px" }}>
            <button
              onClick={() => setShowAll(true)}
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
          )}
        </div>
      </div>

      <Footer isMobile={isMobile} />
    </div>
  );
}
