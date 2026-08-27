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
import { errorMessage } from "../api/apiError";

function HeroCard({ project, style, showDesc, showFundingBar, canInvest, isOwner, onEdit }) {
  return (
    // `style` is the grid placement the caller computes, so it stays inline.
    <Link to={`/project/${project.id}`} className="text-inherit no-underline" style={style}>
      {/* `group` replaces a pair of handlers that reached into the DOM with
          querySelector("img") to scale the photo on hover. group-hover states the same
          thing declaratively, and cannot go looking for an element that is not there. */}
      <div className="group relative h-full cursor-pointer overflow-hidden rounded-[10px] transition-[transform,box-shadow,filter] duration-250 ease-out hover:-translate-y-[3px] hover:brightness-105 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
        <img
          src={project.img}
          alt={project.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.06]"
        />
        {/* The big card carries a heavier wash because it also holds body text; the two
            small ones only need enough to keep a title legible. */}
        <div
          className={`absolute inset-0 ${
            showDesc
              ? "bg-[linear-gradient(to_top,rgba(0,0,0,0.88)_40%,rgba(0,0,0,0.08)_100%)]"
              : "bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_50%,rgba(0,0,0,0.1)_100%)]"
          }`}
        />
        <div className={`absolute ${showDesc ? "right-7 bottom-7 left-7" : "right-3.5 bottom-3.5 left-3.5"}`}>
          <Tag label={project.tag} />
          <h3
            className={`text-white ${
              showDesc
                ? "mx-0 mt-2 mb-1.5 text-[26px] leading-[1.2] font-extrabold"
                : "mx-0 mt-1.5 mb-0 text-[15px] leading-[1.3] font-bold"
            }`}
          >
            {project.title}
          </h3>

          {showDesc && project.desc && (
            <p className="mx-0 mt-0 mb-4 text-[13px] leading-relaxed text-white/80">
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
              onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(project); }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] bg-brand px-[18px] py-2 text-[11px] font-bold tracking-[0.08em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_6px_16px_rgba(204,0,0,0.35)]"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              EDIT THIS PROJECT
            </span>
          ) : showDesc && canInvest ? (
            <span
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] bg-brand px-[18px] py-2 text-[11px] font-bold tracking-[0.08em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_6px_16px_rgba(204,0,0,0.35)]"
            >
              INVEST IN THIS PROJECT
            </span>
          ) : null}

          {showFundingBar && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-[3px] flex-1 rounded-sm bg-white/30">
                <div
                  className="h-full rounded-sm bg-brand"
                  style={{ width: `${Math.min(project.funded, 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-white">{project.funded}%</span>
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
    // ⚠️ Deliberately NOT ui/EmptyState. This is a bordered CARD and it also carries the
    // loading and error states, not just "there is nothing here" — folding it in would
    // lose the card and blur three different situations into one look.
    <div className="mb-8 rounded-[10px] border border-neutral-100 bg-white px-6 py-10 text-center">
      <h2 className="m-0 text-[17px] font-extrabold text-neutral-900">{title}</h2>
      {detail && (
        <p className="mx-auto mt-2 mb-0 max-w-[460px] text-[13px] leading-relaxed text-neutral-500">
          {detail}
        </p>
      )}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-[18px] cursor-pointer rounded-[5px] border-none bg-brand px-[22px] py-2.5 text-[11px] font-bold tracking-[0.08em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_6px_16px_rgba(204,0,0,0.35)]"
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
  // Takes the project so the hero CTA deep-links to that project's edit form.
  const goToEdit = proj => navigate(`/creator-my-projects/${proj.id}/edit`);

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
            errorMessage(err, "Could not load projects")
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
    <div className="min-h-screen bg-surface text-neutral-900">

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
      {/* ⚠️ overflow-anchor:none is load-bearing, not decoration: entering search mode
          hides the hero and trending blocks, and without it the browser's scroll anchoring
          fights the manual smooth-scroll-to-top that gives the query its feedback.
          `pad` is a runtime value from the breakpoint hook. */}
      <div className="mx-auto max-w-[1100px] [overflow-anchor:none]" style={{ padding: pad }}>

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
        {/* The grid tracks are computed from SMALL_H and GAP, so they stay inline. */}
        <div
          className={`lp-stagger grid ${isMobile ? "mb-8" : "mb-12"}`}
          style={{
            gridTemplateColumns: isDesktop ? "1fr 320px" : isTablet ? "1fr 1fr" : "1fr",
            gridTemplateRows: isDesktop ? `${SMALL_H}px ${SMALL_H}px` : "auto",
            gap: `${GAP}px`,
          }}
        >
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
        <div className={isMobile ? "mb-8" : "mb-12"}>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className={`m-0 font-extrabold text-neutral-900 ${isMobile ? "text-[18px]" : "text-[22px]"}`}>Trending Projects</h2>
              <p className="mx-0 mt-0.5 mb-0 text-[13px] text-neutral-500">Projects gaining momentum across RMIT.</p>
            </div>
            <a
              href="#all"
              className="inline-block text-[12px] font-semibold tracking-[0.04em] text-brand no-underline transition-[opacity,transform] duration-150 hover:translate-x-[3px] hover:opacity-70"
            >
              VIEW ALL →
            </a>
          </div>
          <div
            className="lp-stagger grid gap-3.5"
            style={{ gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : isTablet ? "repeat(2, 1fr)" : "1fr" }}
          >
            {trending.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
        </>
        )}

        {/* ── All Projects ── */}
        {/* Hidden while loading / on error / when empty — the StatusBlock above already says so. */}
        {!loading && !loadError && projects.length > 0 && (
        <div id="all" className={isMobile ? "mb-8" : "mb-12"}>
          <div className={`mb-4 flex justify-between ${isMobile ? "flex-col items-start gap-3" : "flex-row items-center gap-0"}`}>
            <div>
              <h2 className={`m-0 font-extrabold text-neutral-900 ${isMobile ? "text-[18px]" : "text-[22px]"}`}>
                {isSearching ? "Search results" : "All Projects"}
              </h2>
              <p className="mx-0 mt-0.5 mb-0 text-[13px] text-neutral-500">
                {isSearching
                  ? `${filteredProjects.length} ${filteredProjects.length === 1 ? "project" : "projects"} found for “${search}”`
                  : "Browse and search every campaign on RMIT Launchpad."}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`cursor-pointer rounded-[5px] border px-3.5 py-[5px] text-[12px] font-semibold tracking-[0.04em] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.10)] ${
                    activeFilter === f
                      ? "border-brand bg-brand text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-brand"
                  }`}
                >
                  {f}
                </button>
              ))}
              {isSearching && (
                <button
                  onClick={() => setSearch("")}
                  className="cursor-pointer rounded-[5px] border border-brand bg-white px-3.5 py-[5px] text-[12px] font-bold tracking-[0.04em] text-brand transition-all duration-150 hover:bg-brand hover:text-white"
                >
                  ✕ CLEAR
                </button>
              )}

              {/* Sort sits with the tag chips because it does the same job: it changes
                  which projects you see first. A native <select> rather than another
                  row of chips — three more buttons here would crowd the four tags on
                  mobile, and the current value has to stay readable at a glance. */}
              <label className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold tracking-[0.06em] text-neutral-500">
                  SORT
                </span>
                <select
                  value={sortId}
                  onChange={e => setSortId(e.target.value)}
                  className="cursor-pointer rounded-[5px] border border-neutral-200 bg-white px-2.5 py-[5px] text-[12px] font-semibold tracking-[0.04em] text-neutral-700 transition-all duration-150 hover:border-brand"
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
            className={`grid gap-3.5 ${isSearching ? "" : "lp-stagger"}`}
            style={{ gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : isTablet ? "repeat(2, 1fr)" : "1fr" }}
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
          <div className="mt-7 text-center">
            <button
              onClick={() => setShowAll(true)}
              className={`cursor-pointer rounded-[5px] border border-neutral-300 bg-white px-9 py-3 text-[12px] font-bold tracking-[0.08em] text-neutral-700 transition-[background,transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-brand hover:bg-neutral-100 hover:shadow-[0_6px_14px_rgba(0,0,0,0.10)] ${isMobile ? "w-full" : "w-auto"}`}
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
