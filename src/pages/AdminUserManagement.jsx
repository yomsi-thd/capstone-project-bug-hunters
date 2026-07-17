import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/layout/DashboardHeader";
import rmitLogo from "../assets/rmit-logo.png";
import {
  ADMIN_INITIAL_USERS as INITIAL_USERS,
  ADMIN_PROJECT_GROUPS as PROJECT_GROUPS,
  ADMIN_USER_NAV_ITEMS as NAV_ITEMS,
  ADMIN_USER_ROLES as ROLES,
  ADMIN_USER_STATUSES as STATUSES,
} from "../mock";

function getInitials(name) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function StatusDot({ status }) {
  const colors = {
    Active:    "text-green-600",
    Pending:   "text-yellow-500",
    Suspended: "text-red-500",
  };
  const dots = {
    Active:    "bg-green-500",
    Pending:   "bg-yellow-400",
    Suspended: "bg-red-500",
  };
  return (
    <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${colors[status] || "text-gray-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${dots[status] || "bg-gray-300"}`} />
      {status}
    </span>
  );
}

// ── Add New User Modal ──
function AddUserModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", studentId: "", projectGroup: "Urban Tech Hub", role: "Student", email: "" });

  const handleAdd = () => {
    if (!form.name || !form.studentId) return;
    onAdd({
      id: Date.now(),
      name: form.name,
      studentId: form.studentId,
      project: form.projectGroup !== "Unassigned" ? form.projectGroup.toUpperCase() : null,
      projectColor: "bg-brand",
      status: "Pending",
      role: form.role,
      email: form.email,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[480px] p-6 md:p-7 overflow-y-auto max-h-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-[20px] font-bold text-gray-900">Add New User</h2>
          <button onClick={onClose} className="bg-transparent border-none text-xl text-gray-400 hover:text-gray-600 cursor-pointer leading-none">×</button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">FULL NAME</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Elena Draganov"
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">STUDENT ID</label>
            <input
              value={form.studentId}
              onChange={e => setForm({ ...form, studentId: e.target.value })}
              placeholder="e.g. s3829104"
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">PROJECT GROUP</label>
              <select
                value={form.projectGroup}
                onChange={e => setForm({ ...form, projectGroup: e.target.value })}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none bg-white focus:border-brand transition-colors"
              >
                {PROJECT_GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">ROLE</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none bg-white focus:border-brand transition-colors"
              >
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">EMAIL ADDRESS</label>
            <input
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="student.name@student.rmit.edu.au"
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="bg-white border border-gray-200 rounded-md px-5 py-2.5 text-[13px] text-gray-600 font-medium cursor-pointer hover:bg-gray-50 transition-colors">CANCEL</button>
          <button onClick={handleAdd} className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors">ADD USER</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit User Modal ──
function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name: user.name,
    studentId: user.studentId,
    email: user.email,
    role: user.role,
    projectGroup: user.project ? user.project.split(" ").map(w => w[0] + w.slice(1).toLowerCase()).join(" ") : "Unassigned",
    status: user.status,
  });

  const handleSave = () => {
    onSave({
      ...user,
      name: form.name,
      studentId: form.studentId,
      email: form.email,
      role: form.role,
      project: form.projectGroup !== "Unassigned" ? form.projectGroup.toUpperCase() : null,
      status: form.status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[520px] overflow-y-auto max-h-full" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-7 py-5 border-b border-gray-100">
          <h2 className="text-[18px] font-bold text-gray-900">Edit User Information</h2>
          <button onClick={onClose} className="bg-transparent border-none text-xl text-gray-400 hover:text-gray-600 cursor-pointer leading-none">×</button>
        </div>

        <div className="px-7 py-5 flex flex-col gap-5">
          {/* User Identity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand text-sm">🪪</span>
              <span className="text-[11px] font-bold text-gray-500 tracking-widest">USER IDENTITY</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1.5">FULL NAME</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors bg-gray-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1.5">RMIT ID</label>
                <input
                  value={form.studentId}
                  onChange={e => setForm({ ...form, studentId: e.target.value })}
                  className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors bg-gray-50"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1.5">EMAIL ADDRESS</label>
              <input
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors bg-gray-50"
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Role & Assignment */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand text-sm">⚙️</span>
              <span className="text-[11px] font-bold text-gray-500 tracking-widest">ROLE & ASSIGNMENT</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1.5">USER ROLE</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none bg-gray-50 focus:border-brand transition-colors"
                >
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1.5">PROJECT GROUP ASSIGNMENT</label>
                <select
                  value={form.projectGroup}
                  onChange={e => setForm({ ...form, projectGroup: e.target.value })}
                  className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none bg-gray-50 focus:border-brand transition-colors"
                >
                  {PROJECT_GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Status Management */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand text-sm">⚡</span>
              <span className="text-[11px] font-bold text-gray-500 tracking-widest">STATUS MANAGEMENT</span>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1.5">ACCOUNT STATUS</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-52 border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none bg-gray-50 focus:border-brand transition-colors"
              >
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-gray-100">
          <button onClick={onClose} className="bg-white border border-gray-200 rounded-md px-5 py-2.5 text-[13px] text-gray-600 font-medium cursor-pointer hover:bg-gray-50 transition-colors">CANCEL CHANGES</button>
          <button onClick={handleSave} className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors">SAVE CHANGES</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function AdminUserManagement() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("users");
  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavClick = (itemId) => {
    setActiveNav(itemId);
    if (itemId === "projects") {
      navigate("/admin-dashboard");
    }
    if (itemId === "approvals") {
      navigate("/admin-approvals");
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.studentId.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (newUser) => setUsers(prev => [...prev, newUser]);

  const handleSave = (updated) => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));

  const handleRemove = () => {
    setUsers(prev => prev.filter(u => u.id !== removeTarget.id));
    setRemoveTarget(null);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans relative overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-48 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        <div className="px-5 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center">
            {/* Replace this src with your actual RMIT logo */}
            <img src={rmitLogo} alt="RMIT" className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
            <div className="w-full h-full rounded-lg bg-brand hidden items-center justify-center text-white font-extrabold text-base">R</div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-gray-900">ADMIN PORTAL</div>
          </div>
        </div>
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
        {/* Top nav */}
        <DashboardHeader onToggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-9 overflow-y-auto">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-[28px] font-extrabold text-gray-900 mb-1">User Management</h1>
              <p className="text-[14px] text-gray-400 max-w-lg">Oversee academic participants, manage project group assignments, and monitor student engagement within the RMIT Launchpad incubator.</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
            >
              + ADD NEW USER
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 md:px-5 py-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-5">
            <div className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2 flex-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or student ID..."
                className="bg-transparent border-none outline-none text-[13px] text-gray-700 w-full placeholder-gray-300"
              />
            </div>
            <select className="border border-gray-200 rounded-md px-3 py-2 text-[13px] text-gray-500 bg-white outline-none w-full sm:w-auto">
              <option>Filter by Project Group</option>
              {PROJECT_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
            <select className="border border-gray-200 rounded-md px-3 py-2 text-[13px] text-gray-500 bg-white outline-none w-full sm:w-auto">
              <option>Filter by Role</option>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          {/* User table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["User Identity", "Project Assignment", "Status", "Management Actions"].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold text-gray-400 tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="lp-stagger">
                  {filtered.length > 0 ? filtered.map((u, i) => (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${i < filtered.length - 1 ? "border-b border-gray-100" : ""}`}>
                      {/* Identity */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-[12px] font-bold text-gray-600 shrink-0">
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-gray-900">{u.name}</div>
                            <div className="text-[11px] text-gray-400">ID: {u.studentId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Project */}
                      <td className="px-5 py-3.5">
                        {u.project ? (
                          <div className="flex items-center gap-2">
                            <span className="bg-brand text-white text-[10px] font-bold px-2.5 py-1 rounded-sm">{u.project}</span>
                            <button
                              onClick={() => setEditTarget(u)}
                              className="text-[11px] text-brand font-semibold bg-transparent border-none cursor-pointer hover:underline flex items-center gap-1"
                            >
                              ✎ EDIT
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2.5 py-1 rounded-sm">UNASSIGNED</span>
                            <button
                              onClick={() => setEditTarget(u)}
                              className="text-[11px] text-brand font-semibold bg-transparent border-none cursor-pointer hover:underline flex items-center gap-1"
                            >
                              ⊕ ASSIGN
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusDot status={u.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditTarget(u)}
                            className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 bg-transparent border-none cursor-pointer hover:text-brand transition-colors"
                          >
                            ⚙ MANAGE
                          </button>
                          <button
                            onClick={() => setRemoveTarget(u)}
                            className="flex items-center gap-1.5 text-[12px] font-semibold text-brand bg-transparent border-none cursor-pointer hover:text-red-800 transition-colors"
                          >
                            🗑 REMOVE
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-[13px] text-gray-400">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3.5 flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-gray-100">
              <span className="text-[12px] text-gray-400">Showing 1 to {filtered.length} of {users.length} students</span>
              <div className="flex items-center gap-1">
                <button className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-[12px] text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">PREVIOUS</button>
                {[1, 2, 3].map(n => (
                  <button key={n} className={`rounded-md w-8 h-8 text-[12px] font-semibold cursor-pointer border transition-colors ${n === 1 ? "bg-brand text-white border-brand" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>{n}</button>
                ))}
                <button className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-[12px] text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">NEXT</button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add New User Modal */}
      {showAddModal && (
        <AddUserModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSave={handleSave} />
      )}

      {/* Remove Confirmation Modal */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setRemoveTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-[18px] font-bold text-gray-900 mb-3">Remove User</h2>
            <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
              Are you sure you want to remove{" "}
              <span className="font-bold text-gray-900">{removeTarget.name}</span>?{" "}
              This action is <span className="font-semibold text-gray-700">permanent</span> and cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRemoveTarget(null)} className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[13px] text-gray-600 font-medium cursor-pointer hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleRemove} className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-5 py-2 text-[13px] font-bold cursor-pointer transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}