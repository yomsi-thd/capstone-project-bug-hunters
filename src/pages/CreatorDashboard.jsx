import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import CreatorSidebar from "../components/creator/CreatorSidebar";
import Avatar from "../components/ui/Avatar";
import * as projectApi from "../api/projectApi";
import { toNumber, fundedPercent, toBacker } from "../api/mappers";
import { errorMessage } from "../api/apiError";

export default function CreatorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // There is no stats endpoint — totals are summed client-side from GET /projects/my,
  // which since 2026-08-18 also carries backers_count and comments_count per project.
  // TODO: ask for an aggregate endpoint once a creator can have many projects.
  const [totals, setTotals] = useState({ raised: 0, goal: 0, count: 0, backers: 0, comments: 0 });
  // Projects that have comments, busiest first — the "Community Discussions" panel.
  const [discussions, setDiscussions] = useState([]);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await projectApi.getMyProjects();
        if (cancelled) return;
        const list = rows || [];
        setTotals({
          raised: list.reduce((s, r) => s + toNumber(r.current_amount), 0),
          goal: list.reduce((s, r) => s + toNumber(r.goal_amount), 0),
          count: list.length,
          // Summed across projects, so one person who backed two of them counts twice.
          // The stat is labelled "backers across projects" for exactly that reason.
          backers: list.reduce((s, r) => s + toNumber(r.backers_count), 0),
          comments: list.reduce((s, r) => s + toNumber(r.comments_count), 0),
        });
        setDiscussions(
          list
            .filter(r => toNumber(r.comments_count) > 0)
            .sort((a, b) => toNumber(b.comments_count) - toNumber(a.comments_count))
            .map(r => ({ id: r.id, title: r.title, comments: toNumber(r.comments_count) }))
        );
      } catch (err) {
        if (!cancelled) {
          setStatsError(errorMessage(err, "Could not load your project stats"));
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Loaded separately from the projects above: a failure here must leave the funding
  // totals on screen rather than blanking the page, the same split ProjectDetail uses
  // for its updates tab.
  const [backers, setBackers] = useState([]);
  const [backersError, setBackersError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await projectApi.getMyBackers();
        if (!cancelled) setBackers((rows || []).map(toBacker));
      } catch (err) {
        if (!cancelled) {
          setBackersError(errorMessage(err, "Could not load your backers"));
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalPct = fundedPercent(totals.raised, totals.goal);
  const navigate = useNavigate();


  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans relative overflow-x-hidden">

      {/* The shared Header spans the full width, exactly as on the public pages.
          The sidebar and the content sit in a row underneath it. */}
      <Header showSearch={false} onToggleSidebar={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0">

      <CreatorSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* NEW PROJECT used to sit beside this title. It went on 2026-08-28 when the
              admins' CREATE FOR A CREATOR moved onto the nav bar: START A PROJECT is
              already there for creators, on every page, so a second copy here was the
              odd one out. The nav bar is now the one way into the wizard. */}
          <div className="mb-6">
            <h1 className="text-xl md:text-[22px] font-extrabold text-gray-900 m-0">Dashboard Overview</h1>
            <p className="text-[13px] text-gray-400 mt-1">Track your campaign's performance and manage your active projects.</p>
          </div>

          {/* Top stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5 lp-stagger">
            {/* Funding card */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex justify-between items-start mb-2">
                <div className="text-[11px] font-bold text-gray-400 tracking-widest">TOTAL FUNDS RAISED</div>
                <span className="bg-white border border-gray-200 rounded-full px-3 py-0.5 text-[11px] font-semibold text-green-600">Active Campaign</span>
              </div>
              <div className="text-3xl md:text-[36px] font-extrabold text-brand leading-none mb-1">
                {totals.raised.toLocaleString()} CC{" "}
                <span className="text-lg text-gray-400 font-normal">/ {totals.goal.toLocaleString()} CC</span>
              </div>
              <p className="text-[12px] text-gray-400 mb-4">
                {statsError
                  ? statsError
                  : `${totalPct}% of your funding goal reached across ${totals.count} ${totals.count === 1 ? "project" : "projects"}.`}
              </p>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Progress</span>
                <span className="text-brand font-bold">{totalPct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(totalPct, 100)}%` }} />
              </div>
            </div>

            {/* Stat cards.
                The PAGE VIEWS card that used to sit below was removed: nothing in the
                system records a view, so it could only ever read "—". */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[11px] font-bold text-gray-400 tracking-widest">BACKERS ACROSS PROJECTS</div>
                  <span className="text-gray-300 text-lg">👥</span>
                </div>
                <div className="text-[28px] font-extrabold text-gray-900">{totals.backers}</div>
                {/* Not "total backers": the counts are per project and summed, so one
                    person who backed two of them is counted twice. The list below is
                    grouped per person and is where the true headcount is. */}
                <div className="text-[12px] text-gray-400 mt-0.5">
                  Counted once per project backed
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[11px] font-bold text-gray-400 tracking-widest">COMMENTS</div>
                  <span className="text-gray-300 text-lg">💬</span>
                </div>
                <div className="text-[28px] font-extrabold text-gray-900">{totals.comments}</div>
                <div className="text-[12px] text-gray-400 mt-0.5">
                  Across all {totals.count} of your {totals.count === 1 ? "project" : "projects"}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row. `items-start` so each panel is only as tall as its own
              content — the two lists have very different lengths, and a stretched
              Discussions card left half a panel of white space that read as a
              failed load rather than as "that is all of them". */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start lp-stagger">
            {/* Discussions */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">Community Discussions</h3>
              <p className="text-[12px] text-gray-400 mb-4">Your projects with the most to read, busiest first.</p>
              {discussions.length > 0 ? (
                <div className="flex flex-col">
                  {discussions.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => navigate(`/project/${d.id}`)}
                      className={`flex items-center justify-between gap-3 text-left bg-transparent border-none cursor-pointer px-1 py-2.5 hover:text-brand transition-colors ${
                        i < discussions.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <span className="text-[13px] font-semibold text-gray-800 truncate">{d.title}</span>
                      <span className="text-[12px] text-gray-400 shrink-0">
                        {d.comments} {d.comments === 1 ? "comment" : "comments"} ›
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
                  Nobody has commented on your projects yet.
                </div>
              )}
            </div>

            {/* Backers.
                This panel used to be "Backer Tiers — distribution of funds across
                defined reward levels", which needed three things that did not exist: a
                project_tiers table, a tier choice in the invest modal, and a tier_id on
                the transaction. All three landed on 2026-08-20, so the chip below is
                real — but the panel stays "who put money in" rather than becoming a
                distribution chart: "which level attracts people" is already answered on
                the project page, per level, without another screen.
                It also absorbed the separate "RECENT BACKERS" block that sat underneath
                saying the same thing. */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">Your Backers</h3>
              <p className="text-[12px] text-gray-400 mb-4">Everyone who has invested in your projects, most first.</p>
              {backersError ? (
                <div className="text-[12px] text-brand bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {backersError}
                </div>
              ) : backers.length > 0 ? (
                <div className="flex flex-col">
                  {backers.map((b, i) => (
                    <div
                      key={b.id}
                      className={`flex items-center gap-3 py-2.5 ${i < backers.length - 1 ? "border-b border-gray-100" : ""}`}
                    >
                      <Avatar name={b.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[13px] font-semibold text-gray-800 truncate">{b.name}</span>
                          {/* The highest support level this person ever chose across ALL
                              your projects — the row is grouped per person, not per
                              project. The "N projects" line right below keeps that from
                              being read as "their level on one project". Absent for
                              anyone who invested before 2026-08-20 or chose no level. */}
                          {b.topTier && (
                            <span className="shrink-0 rounded-sm border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-brand">
                              {b.topTier.name.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">{b.projectsLabel} · {b.lastInvested}</div>
                      </div>
                      <div className="text-[13px] font-bold text-brand shrink-0">{b.amount}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
                  No investments yet. They appear here as soon as somebody backs a project.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      </div>

      {/* ── Post Update Modal ── */}
    </div>
  );
}