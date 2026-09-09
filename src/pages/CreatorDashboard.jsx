import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import CreatorSidebar from "../components/creator/CreatorSidebar";
import Avatar from "../components/ui/Avatar";
import * as projectApi from "../api/projectApi";
import { toNumber, toBacker } from "../api/mappers";
import { errorMessage } from "../api/apiError";

export default function CreatorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // There is no stats endpoint, so the totals are summed here from GET /projects/my,
  // which carries backers_count and comments_count per project.
  // TODO: ask for an aggregate endpoint once a creator can have many projects.
  const [totals, setTotals] = useState({ raised: 0, count: 0, backers: 0, comments: 0 });
  // Projects with comments, busiest first, for the Community Discussions panel.
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
          count: list.length,
          // Summed across projects, so somebody who backed two counts twice. That is
          // why the stat reads "backers across projects".
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

  // Loaded separately from the projects above, so a failure here leaves the funding
  // totals on screen rather than blanking the page. Same split ProjectDetail uses.
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
          {/* No NEW PROJECT button beside the title. START A PROJECT is on the nav
              bar for creators, on every page, so the nav bar is the one way into the
              wizard. */}
          <div className="mb-6">
            <h1 className="text-xl md:text-[22px] font-extrabold text-gray-900 m-0">Dashboard Overview</h1>
            <p className="text-[13px] text-gray-400 mt-1">Track your campaign's performance and manage your active projects.</p>
          </div>

          {/* Top stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5 lp-stagger">
            {/* Funding card */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex justify-between items-start mb-2">
                <div className="text-[11px] font-bold text-gray-400 tracking-widest">TOTAL CLASS COINS RECEIVED</div>
                <span className="bg-white border border-gray-200 rounded-full px-3 py-0.5 text-[11px] font-semibold text-green-600">Active Campaign</span>
              </div>
              {/* The running total is the measure, so there is nothing for it to be a
                  percentage of. */}
              <div className="text-3xl md:text-[36px] font-extrabold text-brand leading-none mb-1">
                {totals.raised.toLocaleString()} CC
              </div>
              <p className="text-[12px] text-gray-400">
                {statsError
                  ? statsError
                  : `across ${totals.count} ${totals.count === 1 ? "project" : "projects"}.`}
              </p>
            </div>

            {/* Stat cards. There is no page-views card, because nothing records a
                view and it could only ever read as unknown. */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[11px] font-bold text-gray-400 tracking-widest">BACKERS ACROSS PROJECTS</div>
                  <span className="text-gray-300 text-lg">👥</span>
                </div>
                <div className="text-[28px] font-extrabold text-gray-900">{totals.backers}</div>
                {/* Not "total backers": the counts are per project and summed, so one
                    person who backed two is counted twice. The list below is grouped per
                    person and is where the real head count is. */}
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
              content: the two lists differ a lot in length, and a stretched panel leaves
              white space that reads as a failed load rather than as "that is all". */}
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

            {/* Backers: who put coins in, rather than a distribution chart. "Which
                level attracts people" is already answered on the project page, per
                level, without another screen. */}
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
                          {/* The highest level this person chose across all your projects,
                              since the row is grouped per person rather than per
                              project. The "N projects" line below keeps that from being
                              read as their level on one project. Absent for anyone who
                              chose no level. */}
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