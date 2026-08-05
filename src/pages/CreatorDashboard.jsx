import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreatorMyProjects from "./CreatorMyProjects";
import PostUpdateModal from "../components/creator/PostUpdateModal";
import Header from "../components/layout/Header";
import { CREATOR_SIDEBAR_LINKS as RAW_SIDEBAR_LINKS } from "../mock";
import * as projectApi from "../api/projectApi";
import { toNumber, fundedPercent } from "../api/mappers";

// Remove the "Edit Project" sidebar link — editing now happens from My Projects
const SIDEBAR_LINKS = RAW_SIDEBAR_LINKS.filter(link => link.id !== "edit");

export default function CreatorDashboard() {
  const [active, setActive] = useState("dashboard");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showMyProjects, setShowMyProjects] = useState(false);
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

  const handleSidebarClick = (id) => {
    setActive(id);
    if (id === "myprojects") {
      setShowMyProjects(true);
    } else {
      setShowMyProjects(false);
    }
  };

  // ── Show My Projects page instead of the dashboard ──
  if (showMyProjects) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100 font-sans relative overflow-x-hidden">
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

        <Header showSearch={false} onToggleSidebar={() => setSidebarOpen(true)} />

        <div className="flex flex-1 min-h-0">

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar (kept so navigation stays consistent) */}
        <aside
          className={`fixed top-14 bottom-0 left-0 md:top-0 z-40 w-48 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:relative md:translate-x-0`}
        >
          <div className="px-4 py-4 border-b border-gray-200">
            <button
              onClick={() => { navigate("/create-project"); setSidebarOpen(false); }}
              className="w-full bg-brand hover:bg-red-800 text-white text-[11px] font-bold tracking-wide py-1.5 rounded mb-1.5 transition-colors cursor-pointer border-none"
            >
              ⊕ NEW PROJECT
            </button>
            <button
              onClick={() => { setShowUpdateModal(true); setSidebarOpen(false); }}
              className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 text-[11px] font-bold tracking-wide py-1.5 rounded transition-colors cursor-pointer"
            >
              ↑ NEW UPDATE
            </button>
          </div>

          <nav className="flex-1 p-2">
            {SIDEBAR_LINKS.map(link => (
              <button
                key={link.id}
                onClick={() => { handleSidebarClick(link.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold tracking-wide rounded text-left mb-0.5 transition-colors cursor-pointer border-none ${
                  active === link.id ? "bg-brand text-white" : "bg-transparent text-gray-400 hover:bg-gray-50"
                }`}
              >
                <span>{link.icon}</span>{link.label}
              </button>
            ))}
          </nav>

          <div className="p-2 border-t border-gray-200">
            <button className="w-full bg-transparent border-none text-left px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer">? Support</button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <CreatorMyProjects
            embedded
            onBack={() => { setShowMyProjects(false); setActive("dashboard"); }}
          />
        </div>
        </div>
        <PostUpdateModal open={showUpdateModal} onClose={() => setShowUpdateModal(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans relative overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* The shared Header spans the full width, exactly as on the public pages.
          The sidebar and the content sit in a row underneath it. */}
      <Header showSearch={false} onToggleSidebar={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0">

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-14 bottom-0 left-0 md:top-0 z-40 w-48 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        <div className="px-4 py-4 border-b border-gray-200">
          <button
            onClick={() => {
              navigate("/create-project");
              setSidebarOpen(false);
            }}
            className="w-full bg-brand hover:bg-red-800 text-white text-[11px] font-bold tracking-wide py-1.5 rounded mb-1.5 transition-colors cursor-pointer border-none"
          >
            ⊕ NEW PROJECT
          </button>
          <button
            onClick={() => {
              setShowUpdateModal(true);
              setSidebarOpen(false);
            }}
            className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 text-[11px] font-bold tracking-wide py-1.5 rounded transition-colors cursor-pointer"
          >
            ↑ NEW UPDATE
          </button>
        </div>

        <nav className="flex-1 p-2">
          {SIDEBAR_LINKS.map(link => (
            <button
              key={link.id}
              onClick={() => {
                handleSidebarClick(link.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold tracking-wide rounded text-left mb-0.5 transition-colors cursor-pointer border-none ${
                active === link.id ? "bg-brand text-white" : "bg-transparent text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span>{link.icon}</span>{link.label}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-200">
          <button className="w-full bg-transparent border-none text-left px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer">? Support</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl md:text-[22px] font-extrabold text-gray-900 m-0">Dashboard Overview</h1>
              <p className="text-[13px] text-gray-400 mt-1">Track your campaign's performance and manage your active projects.</p>
            </div>
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
                ${totals.raised.toLocaleString()}{" "}
                <span className="text-lg text-gray-400 font-normal">/ ${totals.goal.toLocaleString()}</span>
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
      <PostUpdateModal open={showUpdateModal} onClose={() => setShowUpdateModal(false)} />
    </div>
  );
}