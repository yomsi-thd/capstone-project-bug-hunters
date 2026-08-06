import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import CreatorSidebar from "../components/creator/CreatorSidebar";
import * as projectApi from "../api/projectApi";
import { toNumber, fundedPercent } from "../api/mappers";

export default function CreatorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // There is no stats endpoint — totals are summed client-side from GET /projects/my.
  // TODO: ask for an aggregate endpoint once a creator can have many projects.
  const [totals, setTotals] = useState({ raised: 0, goal: 0, count: 0 });
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await projectApi.getMyProjects();
        if (cancelled) return;
        setTotals({
          raised: (rows || []).reduce((s, r) => s + toNumber(r.current_amount), 0),
          goal: (rows || []).reduce((s, r) => s + toNumber(r.goal_amount), 0),
          count: (rows || []).length,
        });
      } catch (err) {
        if (!cancelled) {
          setStatsError(err.response?.data?.message || err.message || "Could not load your project stats");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalPct = fundedPercent(totals.raised, totals.goal);
  const navigate = useNavigate();


  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans relative overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* The shared Header spans the full width, exactly as on the public pages.
          The sidebar and the content sit in a row underneath it. */}
      <Header showSearch={false} onToggleSidebar={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0">

      <CreatorSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl md:text-[22px] font-extrabold text-gray-900 m-0">Dashboard Overview</h1>
              <p className="text-[13px] text-gray-400 mt-1">Track your campaign's performance and manage your active projects.</p>
            </div>
            {/* Same placement as My Projects: next to the title, not in the sidebar. */}
            <button
              onClick={() => navigate("/create-project")}
              className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2.5 text-[12px] font-bold tracking-wide cursor-pointer transition-colors shrink-0"
            >
              ⊕ NEW PROJECT
            </button>
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

            {/* Stat cards */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[11px] font-bold text-gray-400 tracking-widest">TOTAL BACKERS</div>
                  <span className="text-gray-300 text-lg">👥</span>
                </div>
                {/* TODO: the backend does not count investors. */}
                <div className="text-[28px] font-extrabold text-gray-900">—</div>
                <div className="text-[12px] text-gray-400 mt-0.5">Not provided by the API yet</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[11px] font-bold text-gray-400 tracking-widest">PAGE VIEWS</div>
                  <span className="text-gray-300 text-lg">👁</span>
                </div>
                {/* TODO: no analytics — the backend does not record page views. */}
                <div className="text-[28px] font-extrabold text-gray-900">—</div>
                <div className="text-[12px] text-gray-400 mt-0.5">No analytics endpoint yet</div>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lp-stagger">
            {/* Discussions */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">Community Discussions</h3>
              <p className="text-[12px] text-gray-400 mb-4">Most active threads requiring your attention.</p>
              {/* TODO: the backend has no comments / discussions table. */}
              <div className="text-[12px] text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
                No discussions — the API has no comments table yet.
              </div>
            </div>

            {/* Backer Tiers */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">Backer Tiers</h3>
              <p className="text-[12px] text-gray-400 mb-4">Distribution of funds across defined reward levels.</p>
              {/* TODO: the backend has no reward tiers table. */}
              <div className="text-[12px] text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
                No reward tiers — the API has no tiers table yet.
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-2">RECENT BACKERS</div>
                {/* TODO: the backend does not expose who invested in a project. */}
                <div className="text-[11px] text-gray-400">
                  The API does not expose who backed a project yet.
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      </div>

      {/* ── Post Update Modal ── */}
    </div>
  );
}