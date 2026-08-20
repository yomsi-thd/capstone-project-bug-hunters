import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Tag from "../components/project/Tag";
import ProjectCard from "../components/project/ProjectCard";
import EmptyState from "../components/ui/EmptyState";
import useBreakpoint from "../hooks/useBreakpoint";
import { useAuth } from "../context/AuthContext";
// FILTERS / FILTER_TAGS are UI config, not data — they still come from the mock.
import { FILTERS, FILTER_TAGS } from "../mock";
import * as projectApi from "../api/projectApi";
import { toCard } from "../api/mappers";

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
                background: "var(--color-brand)", color: "#fff", borderRadius: "5px",
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
                e.currentTarget.style.background = "var(--color-brand)";
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
                background: "var(--color-brand)", color: "#fff", borderRadius: "5px",
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
                e.currentTarget.style.background = "var(--color-brand)";
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
                <div style={{ width: `${Math.min(project.funded, 100)}%`, height: "100%", background: "var(--color-brand)", borderRadius: "2px" }} />
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

// Sort options for the All Projects grid. "Newest" first because it is the order the
// API already returns and therefore the one the page had before this control existed —
// adding a sort should not silently reorder anyone's first visit.
//
// Each `compare` sorts a copy of the filtered list; none of them mutate state.
const SORTS = [
  {
    id: "newest",
    label: "Newest",
    compare: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  },
  {
    id: "funded",
    label: "Most funded",
    compare: (a, b) => b.funded - a.funded,
  },
  {
    id: "ending",
    label: "Ending soon",
    // daysLeft is null for every project created before 2026-08-06 (no end_date).
    // Those go to the BACK: an unknown deadline is not the same as an imminent one,
    // and sorting null as 0 would put the oldest projects at the front of a list
    // that claims to show what closes first.
    compare: (a, b) => {
      if (a.daysLeft == null && b.daysLeft == null) return 0;
      if (a.daysLeft == null) return 1;
      if (b.daysLeft == null) return -1;
      return a.daysLeft - b.daysLeft;
    },
  },
];

// Shared notice block for the loading / error / empty states.
function StatusBlock({ title, detail, actionLabel, onAction }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee", borderRadius: "10px",
      padding: "40px 24px", textAlign: "center", marginBottom: "32px",
    }}>
      <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#111" }}>{title}</h2>
      {detail && (
        <p style={{ margin: "8px auto 0", fontSize: "13px", color: "#888", maxWidth: "460px", lineHeight: 1.6 }}>
          {detail}
        </p>
      )}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: "18px", background: "var(--color-brand)", color: "#fff",
            border: "none", borderRadius: "5px", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.08em", padding: "10px 22px", cursor: "pointer",
            transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#aa0000";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(204,0,0,0.35)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "var(--color-brand)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function Discover() {
  const { canInvest, user } = useAuth();
  const navigate = useNavigate();

  // Ownership compares the real user id against projects.creator_id.
  // (The old mock compared user.username — the backend has no username column.)
  const ownsProject = p => !!user && user.id != null && p?.ownerId === user.id;
  const goToEdit = () => navigate("/creator-my-projects");

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [sortId, setSortId] = useState("newest");
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await projectApi.getAllProjects();
        if (cancelled) return;
        // GET /projects now returns APPROVED rows only (findAllApprovedProjects), so
        // there is no client-side status filter here any more. Filtering in the browser
        // only hid the drafts visually — the rows were still sent to every visitor.
        setProjects(rows.map(toCard));
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.message || err.message || "Could not load projects"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  // The backend has no notion of hero/trending, so derive both from the data:
  // Hero = the 3 newest projects, Trending = the 4 with the highest funded percentage.
  // The two groups may overlap — as in the old mock, hero/trending projects also
  // appear again in the "All Projects" grid below.
  const hero = [...projects]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
  const trending = [...projects].sort((a, b) => b.funded - a.funded).slice(0, 4);

  // Search and filters run over the whole catalogue, so a query reaches every
  // project (hero + trending + fresh), not just the ones shown in this grid.
  // Sorting is applied last, to a copy — `projects` stays in the API's order, which
  // is what `hero` above still derives from.
  const activeSort = SORTS.find(s => s.id === sortId) ?? SORTS[0];
  const filteredProjects = projects
    .filter(p => {
      const matchFilter =
        activeFilter === "ALL" || (FILTER_TAGS[activeFilter] || []).includes(p.tag);
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.desc && p.desc.toLowerCase().includes(search.toLowerCase()));
      return matchFilter && matchSearch;
    })
    .sort(activeSort.compare);

  // Once expanded, stay expanded across filter/search changes — "show me
  // everything" is the user's standing intent, not a per-tag setting.
  // Only a remount (refresh, or arriving from another page) collapses it.
  const visibleProjects = showAll ? filteredProjects : filteredProjects.slice(0, PROJECTS_PREVIEW_COUNT);

  // Matches the `!search` check above, so " " counts as searching either way.
  const isSearching = search !== "";

  // Entering search mode moves the results to the top of the page; scroll there
  // once so a user who searched from mid/bottom of the page sees the feedback.
  // Guarded on the isSearching transition, so it fires when a query begins (not
  // on every keystroke) and never when clearing the box back to browse mode.
  useEffect(() => {
    if (!isSearching) return;
    // Scroll to the top so the results header is visible. We animate manually
    // with rAF instead of `behavior:"smooth"` — native smooth scroll is
    // unreliable right after hiding Hero/Trending (the layout shift drops the
    // animation and strands the page mid-list). This always lands at the top,
    // and respects reduced-motion by jumping instead.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
      return;
    }
    let raf, startTime = null, start = null;
    const duration = 380;
    const step = t => {
      if (start === null) { start = window.scrollY; startTime = t; }
      if (start <= 0) return;
      const p = Math.min((t - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
      window.scrollTo(0, Math.round(start * (1 - ease)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [isSearching]);

  const pad = isMobile ? "20px 16px" : isTablet ? "24px 20px" : "32px 40px";
  const SMALL_H = 200;
  const GAP = 12;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>

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

      {/* overflowAnchor:none — hiding Hero/Trending on search must not trigger
          the browser's scroll-anchoring, which would fight our scroll-to-top. */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: pad, overflowAnchor: "none" }}>

        {loading && <StatusBlock title="Loading projects…" />}

        {!loading && loadError && (
          <StatusBlock
            title="Could not load projects"
            detail={loadError}
            actionLabel="TRY AGAIN"
            onAction={() => setReloadKey(k => k + 1)}
          />
        )}

        {!loading && !loadError && projects.length === 0 && (
          <StatusBlock
            title="No projects yet"
            detail="No approved projects have been published yet. Once a creator submits a project and an admin approves it, it will show up here."
          />
        )}

        {/* Hero + Trending are browse-only. Hide them while searching so the
            results grid rises to the top and the query's feedback is visible. */}
        {!isSearching && hero.length > 0 && (
        <>
        {/* ── Hero Grid ── */}
        <div className="lp-stagger" style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "1fr 320px" : isTablet ? "1fr 1fr" : "1fr",
          gridTemplateRows: isDesktop ? `${SMALL_H}px ${SMALL_H}px` : "auto",
          gap: `${GAP}px`,
          marginBottom: isMobile ? "32px" : "48px",
        }}>
          <HeroCard
            project={hero[0]}
            showDesc={!isMobile}
            showFundingBar
            canInvest={canInvest}
            isOwner={ownsProject(hero[0])}
            onEdit={goToEdit}
            style={{
              gridRow: isDesktop ? "1 / 3" : "auto",
              gridColumn: isTablet ? "1 / -1" : "auto",
              height: isMobile ? "260px" : isTablet ? "320px" : `${SMALL_H * 2 + GAP}px`,
            }}
          />
          {/* Only render when the project exists — the DB may hold fewer than 3 approved projects. */}
          {!isMobile && hero[1] && (
            <HeroCard
              project={hero[1]}
              showFundingBar
              style={{ height: isTablet ? "180px" : `${SMALL_H}px` }}
            />
          )}
          {!isMobile && hero[2] && (
            <HeroCard
              project={hero[2]}
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
              style={{ fontSize: "12px", color: "var(--color-brand)", fontWeight: 600, letterSpacing: "0.04em", textDecoration: "none", display: "inline-block", transition: "opacity 0.15s, transform 0.15s" }}
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
            {trending.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
        </>
        )}

        {/* ── All Projects ── */}
        {/* Hidden while loading / on error / when empty — the StatusBlock above already says so. */}
        {!loading && !loadError && projects.length > 0 && (
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
              <h2 style={{ margin: 0, fontSize: isMobile ? "18px" : "22px", fontWeight: 800, color: "#111" }}>
                {isSearching ? "Search results" : "All Projects"}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#888" }}>
                {isSearching
                  ? `${filteredProjects.length} ${filteredProjects.length === 1 ? "project" : "projects"} found for “${search}”`
                  : "Browse and search every campaign on RMIT Launchpad."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    background: activeFilter === f ? "var(--color-brand)" : "#fff",
                    color: activeFilter === f ? "#fff" : "#444",
                    border: "1px solid",
                    borderColor: activeFilter === f ? "var(--color-brand)" : "#ddd",
                    borderRadius: "5px",
                    fontSize: "12px", fontWeight: 600,
                    padding: "5px 14px", cursor: "pointer",
                    letterSpacing: "0.04em", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.10)";
                    if (activeFilter !== f) e.currentTarget.style.borderColor = "var(--color-brand)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = activeFilter === f ? "var(--color-brand)" : "#ddd";
                  }}
                >
                  {f}
                </button>
              ))}
              {isSearching && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    background: "#fff", color: "var(--color-brand)",
                    border: "1px solid var(--color-brand)", borderRadius: "5px",
                    fontSize: "12px", fontWeight: 700,
                    padding: "5px 14px", cursor: "pointer",
                    letterSpacing: "0.04em", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "var(--color-brand)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.color = "var(--color-brand)";
                  }}
                >
                  ✕ CLEAR
                </button>
              )}

              {/* Sort sits with the tag chips because it does the same job: it changes
                  which projects you see first. A native <select> rather than another
                  row of chips — three more buttons here would crowd the four tags on
                  mobile, and the current value has to stay readable at a glance. */}
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#888", letterSpacing: "0.06em" }}>
                  SORT
                </span>
                <select
                  value={sortId}
                  onChange={e => setSortId(e.target.value)}
                  style={{
                    background: "#fff", color: "#444",
                    border: "1px solid #ddd", borderRadius: "5px",
                    fontSize: "12px", fontWeight: 600,
                    padding: "5px 10px", cursor: "pointer",
                    letterSpacing: "0.04em", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-brand)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; }}
                >
                  {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {/* Entrance animation plays on tag switch, but never while searching —
              live results should settle, not fade in on every keystroke.
              The key remounts the whole grid so the stagger replays for every
              card at once; without it, cards shared by two tags keep their DOM
              node and sit still while only the new ones animate. Search state is
              in the key so that clearing the box back to empty also remounts:
              otherwise the restored cards would animate alone while the ones
              already on screen stayed put — the same uneven effect, just moved.
              Sort is in the key for a different reason: changing it mounts and
              unmounts nothing, so without the remount the cards would silently
              swap places with no sign the control did anything. */}
          <div
            key={`${activeFilter}|${sortId}|${isSearching ? "search" : "browse"}`}
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
              <EmptyState
                className="col-span-full py-12"
                icon="🔍"
                title="No projects found"
                detail="Try a different filter or search term"
              />
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
                e.currentTarget.style.borderColor = "var(--color-brand)";
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
        )}
      </div>

      <Footer isMobile={isMobile} />
    </div>
  );
}
