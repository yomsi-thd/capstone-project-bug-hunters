import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import * as adminApi from "../api/adminApi";
import * as projectApi from "../api/projectApi";
import { toAdminProject } from "../api/mappers";
import {
  ADMIN_STATUS_STYLE as STATUS_STYLE,
  ADMIN_CAT_STYLE as CAT_STYLE,
  ADMIN_NAV_ITEMS as NAV_ITEMS,
} from "../mock";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("projects");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // GET /api/admin/projects — returns every project in every status.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await adminApi.getAllProject();
        if (!cancelled) setProjects((rows || []).map(toAdminProject));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.message || err.message || "Could not load projects");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filtered = projects.filter(p => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.creator.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All Statuses" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // This used to drop the row from local state and nothing else — no API call at all,
  // so the project came straight back on the next reload and stayed live on Discover.
  // The row is only removed once the server confirms the delete.
  const confirmDelete = async () => {
    setDeleting(true);
    setActionError(null);
    try {
      await projectApi.deleteProject(deleteTarget.id);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setActionError(
        err.response?.data?.message || err.message || "Could not delete this project"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleNavClick = (itemId) => {
    setActiveNav(itemId);
    if (itemId === "approvals") {
      navigate("/admin-approvals");
    }
    if (itemId === "users") {
      navigate("/admin-user-management");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans relative overflow-x-hidden">
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

      {/* Sidebar */}
      <aside
        className={`fixed top-14 bottom-0 left-0 md:top-0 z-40 w-48 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        <nav className="flex-1 p-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                handleNavClick(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left cursor-pointer bg-transparent border-l-4 border-t-0 border-r-0 border-b-0 mb-0.5 transition-colors ${
                activeNav === item.id
                  ? "border-brand text-brand font-bold bg-red-50"
                  : "border-transparent text-gray-500 font-medium hover:bg-gray-50"
              }`}
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-100">
          <button className="w-full bg-transparent border-none text-left px-3.5 py-2 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer">? Support</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        <main className="flex-1 p-4 md:p-9 overflow-y-auto">
          <h1 className="text-2xl md:text-[28px] font-extrabold text-gray-900 mb-1">Project Management</h1>
          <p className="text-[14px] text-gray-400 mb-7">Oversee and manage all academic crowdfunding initiatives.</p>

          {loading && (
            <div className="text-[13px] text-gray-400 mb-5">Loading projects…</div>
          )}
          {loadError && (
            <div className="bg-red-50 border border-red-200 text-[13px] text-brand rounded-lg px-4 py-3 mb-5">
              {loadError}
            </div>
          )}

          {/* Stats — now reactive to actual project list */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 lp-stagger">
            {[
              { label: "Total Projects",    value: projects.length,                                  icon: "▦",  accent: false },
              { label: "Pending Approvals", value: projects.filter(p => p.status === "Pending").length, icon: "📋", accent: false },
              { label: "Flagged Content",   value: projects.filter(p => p.status === "Flagged").length, icon: "🚩", accent: true  },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-xl p-6 border ${c.accent ? "border-brand" : "border-gray-200"}`} style={{ borderWidth: c.accent ? "1.5px" : "1px" }}>
                <div className="flex justify-between items-start mb-2">
                  <div className={`text-[13px] font-semibold ${c.accent ? "text-brand" : "text-gray-400"}`}>{c.label}</div>
                  <span className="text-lg">{c.icon}</span>
                </div>
                <div className={`text-[32px] font-extrabold ${c.accent ? "text-brand" : "text-gray-900"}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="bg-white border border-gray-200 rounded-t-xl px-4 md:px-5 py-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2 flex-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects by name or creator..."
                className="bg-transparent border-none outline-none text-[13px] text-gray-700 w-full placeholder-gray-300"
              />
            </div>
            <select className="border border-gray-200 rounded-md px-3 py-2 text-[13px] text-gray-500 bg-white outline-none w-full sm:w-auto">
              <option>All Schools</option>
              <option>School of Engineering</option>
              <option>School of Design</option>
              <option>School of Business</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-[13px] text-gray-500 bg-white outline-none w-full sm:w-auto"
            >
              <option>All Statuses</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Flagged</option>
            </select>
            <button className="bg-white border border-gray-200 rounded-md px-3.5 py-2 text-[12px] font-semibold text-gray-500 cursor-pointer whitespace-nowrap hover:bg-gray-50 transition-colors w-full sm:w-auto">⊞ More Filters</button>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["PROJECT DETAIL", "CREATOR", "STATUS", "FUNDING PROGRESS", "ACTIONS"].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold text-gray-400 tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="lp-stagger">
                  {filtered.length > 0 ? filtered.map((p, i) => {
                    // The backend also has REJECTED, which STATUS_STYLE has no key for.
                    const s = STATUS_STYLE[p.status] || { text: "text-gray-500", dot: "bg-gray-400" };
                    const cc = CAT_STYLE[p.category] || "bg-gray-100 text-gray-600";
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-gray-50 transition-colors ${i < filtered.length - 1 ? "border-b border-gray-50" : ""}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img src={p.img} alt={p.title} className="w-11 h-11 rounded-md object-cover shrink-0" />
                            <div>
                              <div className="text-[13px] font-bold text-gray-900 mb-1">{p.title}</div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${cc}`}>{p.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-500">{p.creator}</td>
                        <td className="px-5 py-3.5">
                          <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${s.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${s.dot}`} />{p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-brand w-8">{p.pct}%</span>
                            <div className="flex-1 h-1 bg-gray-100 rounded-full" style={{ minWidth: "80px" }}>
                              <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(p.pct, 100)}%` }} />
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">{p.raised} / {p.goal}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setDeleteTarget(p)}
                              title="Delete project"
                              className="bg-white border border-gray-200 rounded px-2 py-1 cursor-pointer text-sm hover:bg-red-50 hover:border-brand transition-colors"
                            >
                              🗑
                            </button>
                            <button className="bg-white border border-gray-200 rounded px-2 py-1 cursor-pointer text-sm hover:bg-gray-50 transition-colors">⋮</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-gray-400">No projects found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-gray-50">
              <span className="text-[12px] text-gray-400">Showing 1–{filtered.length} of {projects.length} projects</span>
              <div className="flex gap-2">
                {["Prev", "Next"].map(l => (
                  <button key={l} className="bg-white border border-gray-200 rounded-md px-4 py-1.5 text-[12px] text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">{l}</button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-[18px] font-bold text-gray-900 mb-3">Delete Project</h2>
            <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
              Are you sure you want to delete{" "}
              <span className="font-bold text-gray-900">"{deleteTarget.title}"</span>?{" "}
              This action is <span className="font-semibold text-gray-700">permanent</span> and cannot be undone.
              {" "}Its investments, comments and updates go with it.
            </p>

            {actionError && (
              <div className="bg-red-50 border border-red-200 text-[13px] text-brand rounded-lg px-3 py-2 mb-4">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setActionError(null); }}
                disabled={deleting}
                className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[13px] text-gray-600 font-medium cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className={`border-none rounded-md px-5 py-2 text-[13px] font-bold transition-colors ${
                  deleting
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-brand hover:bg-red-800 text-white cursor-pointer"
                }`}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}