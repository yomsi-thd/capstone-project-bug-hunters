import { useState, useEffect, useCallback } from "react";
import Modal from "../components/ui/Modal";
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
  // Archive is the everyday action now; permanent delete is the second step, reachable
  // only from the Archived bin. Separate targets so the two confirmations can never be
  // confused with one another.
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  // id of the row whose RESTORE is in flight — restore happens inline, with no modal.
  const [restoringId, setRestoringId] = useState(null);

  // GET /api/admin/projects — returns every project in every status, archived included.
  // Every mutation below refetches through this rather than patching local state: the
  // archive columns arrive with joins (archived_by_name) that a mutation response does
  // not carry, so a hand-patched row would show the wrong name.
  // Nothing here sets state before the first `await`: `loading` already starts true, so
  // the effect below never triggers a synchronous cascading render
  // (react-hooks/set-state-in-effect). Keep it that way if you edit this.
  const loadProjects = useCallback(async () => {
    try {
      const rows = await adminApi.getAllProject();
      setProjects((rows || []).map(toAdminProject));
      setLoadError(null);
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || "Could not load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  // Wrapped in an async IIFE, matching every other fetch effect in the codebase:
  // calling loadProjects() bare here trips react-hooks/set-state-in-effect, which reads
  // the call graph and sees the setStates inside it.
  useEffect(() => { (async () => { await loadProjects(); })(); }, [loadProjects]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Archived projects live in their own bin, not mixed into the normal list — including
  // under "All Statuses", which means "all moderation statuses", not "everything ever".
  // Selecting Archived shows only those.
  const showArchived = statusFilter === "Archived";

  const filtered = projects.filter(p => {
    if (Boolean(p.archived) !== showArchived) return false;
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.creator.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      showArchived || statusFilter === "All Statuses" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const liveProjects = projects.filter(p => !p.archived);
  const archivedCount = projects.length - liveProjects.length;

  const closeModals = () => {
    setArchiveTarget(null);
    setDeleteTarget(null);
    setArchiveReason("");
    setActionError(null);
  };

  // Archive — replaces the old delete button. The reason is required by the backend
  // whenever an admin archives someone else's project, which on this screen is almost
  // always the case, so the field is validated here too rather than round-tripping.
  const confirmArchive = async () => {
    if (!archiveReason.trim()) {
      setActionError("Please give a reason — the creator cannot restore this themselves.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await projectApi.archiveProject(archiveTarget.id, archiveReason.trim());
      await loadProjects();
      closeModals();
    } catch (err) {
      setActionError(
        err.response?.data?.message || err.message || "Could not archive this project"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (project) => {
    setRestoringId(project.id);
    setActionError(null);
    try {
      await projectApi.restoreProject(project.id);
      await loadProjects();
    } catch (err) {
      setLoadError(
        err.response?.data?.message || err.message || "Could not restore this project"
      );
    } finally {
      setRestoringId(null);
    }
  };

  // Permanent delete. The backend refuses this unless the project is already archived,
  // so it is only ever offered from the Archived bin. The row goes for good.
  const confirmDelete = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await projectApi.deleteProject(deleteTarget.id);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      closeModals();
    } catch (err) {
      setActionError(
        err.response?.data?.message || err.message || "Could not delete this project"
      );
    } finally {
      setBusy(false);
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
          {/* The button sits beside the page title, where CreatorSidebar already puts
              NEW PROJECT — not in the sidebar, which lists destinations rather than
              actions. An admin owns no projects, so the wizard it opens always files
              the project under a creator they pick in step 1. */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <h1 className="text-2xl md:text-[28px] font-extrabold text-gray-900">Project Management</h1>
            <button
              onClick={() => navigate("/create-project")}
              className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2.5 text-[12px] font-bold tracking-wide cursor-pointer transition-colors shrink-0"
            >
              + CREATE FOR A CREATOR
            </button>
          </div>
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
              // Counted over live projects only. An archived project is in the bin, and
              // counting it as a "Total Project" would make archiving look like it did
              // nothing.
              { label: "Total Projects",    value: liveProjects.length,                                   icon: "▦",  accent: false },
              { label: "Pending Approvals", value: liveProjects.filter(p => p.status === "Pending").length, icon: "📋", accent: false },
              { label: "Archived",          value: archivedCount,                                         icon: "🗄", accent: false },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-xl p-6 ${c.accent ? "border-[1.5px] border-brand" : "border border-gray-200"}`}>
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
              {/* The bin. Archived is a separate axis from the three above — a project
                  in here still has its own Active/Pending verdict, which is what it
                  returns to when restored. */}
              {/* Explicit value: the label carries a count, so without it the option's
                  value would be "Archived (3)" and never match showArchived. */}
              <option value="Archived">Archived ({archivedCount})</option>
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
                        <td className="px-5 py-3.5 text-[13px] text-gray-500">
                          {p.creator}
                          {/* The owner is the creator either way; this says an admin
                              typed it in for them. Null for everything a creator
                              submitted, so the column is unchanged for those rows. */}
                          {p.createdByAdminId != null && (
                            <div className="text-[11px] text-blue-700">
                              filed by {p.createdByAdminName || "an admin"}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${s.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${s.dot}`} />{p.status}
                          </span>
                          {/* Archived is shown ALONGSIDE the verdict, not instead of it —
                              that verdict is what the project returns to on restore. */}
                          {p.archived && (
                            <div className="mt-1">
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-1.5 py-0.5">
                                ARCHIVED
                              </span>
                              <div className="text-[11px] text-gray-400 mt-1 leading-snug max-w-[190px]">
                                {p.archivedByName ? `by ${p.archivedByName}` : "by a deleted account"}
                                {p.archivedAt && ` · ${p.archivedAt}`}
                                {p.archiveReason && (
                                  <div className="text-gray-500 italic">"{p.archiveReason}"</div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-brand w-8">{p.pct}%</span>
                            <div className="flex-1 h-1 bg-gray-100 rounded-full min-w-20">
                              <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(p.pct, 100)}%` }} />
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">{p.raised} / {p.goal}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {/* Archived rows get the two recovery-bin actions; live rows get
                              ARCHIVE, which is now the only way a project can start
                              leaving. Permanent delete is deliberately unreachable until
                              a project sits in the bin — the backend enforces that too. */}
                          {p.archived ? (
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                onClick={() => handleRestore(p)}
                                disabled={restoringId === p.id}
                                title="Restore this project to its previous status"
                                className="bg-white border border-gray-300 rounded px-2.5 py-1 cursor-pointer text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {restoringId === p.id ? "RESTORING…" : "↩ RESTORE"}
                              </button>
                              <button
                                onClick={() => { setDeleteTarget(p); setActionError(null); }}
                                title="Permanently delete — cannot be undone"
                                className="bg-white border border-gray-200 rounded px-2.5 py-1 cursor-pointer text-[11px] font-semibold text-brand hover:bg-red-50 hover:border-brand transition-colors whitespace-nowrap"
                              >
                                🗑 DELETE
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setArchiveTarget(p); setArchiveReason(""); setActionError(null); }}
                                title="Archive project — reversible"
                                className="bg-white border border-gray-300 rounded px-2.5 py-1 cursor-pointer text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                              >
                                🗄 ARCHIVE
                              </button>
                              <button className="bg-white border border-gray-200 rounded px-2 py-1 cursor-pointer text-sm hover:bg-gray-50 transition-colors">⋮</button>
                            </div>
                          )}
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
              {/* Counted within the bin being viewed. Against the raw projects.length it
                  read "1–1 of 6" while the Total Projects card said 5, because that card
                  excludes archived and this did not. */}
              <span className="text-[12px] text-gray-400">
                Showing 1–{filtered.length} of {showArchived ? archivedCount : liveProjects.length}
                {showArchived ? " archived projects" : " projects"}
              </span>
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

      {/* Archive Confirmation Modal — the ordinary "take it down" action. */}
      {archiveTarget && (
        <Modal onClose={closeModals} maxWidth={440} panelClassName="p-6">
            <h2 className="text-[18px] font-bold text-gray-900 mb-3">Archive Project</h2>
            <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
              <span className="font-bold text-gray-900">"{archiveTarget.title}"</span> will be
              hidden from Discover and stop accepting investments and comments. Nothing is
              deleted — you can restore it from the{" "}
              <span className="font-semibold text-gray-700">Archived</span> filter, and it will
              come back as <span className="font-semibold text-gray-700">{archiveTarget.status}</span>.
            </p>

            <label className="block text-[12px] font-bold text-gray-500 tracking-wide mb-1.5">
              REASON
            </label>
            <textarea
              value={archiveReason}
              onChange={e => setArchiveReason(e.target.value)}
              placeholder="Why is this being archived? The creator will see this."
              rows={3}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] text-gray-700 outline-none resize-y focus:border-gray-400 transition-colors mb-1"
            />
            {/* The creator cannot undo an admin's archive, so the reason is the only
                thing telling them what happened. Required, not optional. */}
            <p className="text-[11px] text-gray-400 mb-4">
              Required — {archiveTarget.creator} cannot restore this themselves.
            </p>

            {actionError && (
              <div className="bg-red-50 border border-red-200 text-[13px] text-brand rounded-lg px-3 py-2 mb-4">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModals}
                disabled={busy}
                className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[13px] text-gray-600 font-medium cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                disabled={busy}
                className={`border-none rounded-md px-5 py-2 text-[13px] font-bold transition-colors ${
                  busy
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-brand hover:bg-red-800 text-white cursor-pointer"
                }`}
              >
                {busy ? "Archiving…" : "Archive"}
              </button>
            </div>
        </Modal>
      )}

      {/* Permanent Delete Modal — only reachable from the Archived bin. */}
      {deleteTarget && (
        <Modal onClose={closeModals} maxWidth={420} panelClassName="p-6">
            <h2 className="text-[18px] font-bold text-gray-900 mb-3">Delete Permanently</h2>
            <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
              <span className="font-bold text-gray-900">"{deleteTarget.title}"</span> will be
              erased from the database. This is{" "}
              <span className="font-semibold text-gray-700">permanent and cannot be undone</span> —
              its comments and updates go with it.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[12px] text-amber-800 leading-relaxed mb-4">
              It is already archived, so nobody can see it. Leave it here unless you are
              certain it should not exist at all.
            </div>

            {actionError && (
              <div className="bg-red-50 border border-red-200 text-[13px] text-brand rounded-lg px-3 py-2 mb-4">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModals}
                disabled={busy}
                className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[13px] text-gray-600 font-medium cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Keep it
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className={`border-none rounded-md px-5 py-2 text-[13px] font-bold transition-colors ${
                  busy
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-brand hover:bg-red-800 text-white cursor-pointer"
                }`}
              >
                {busy ? "Deleting…" : "Delete forever"}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}