import { useState, useEffect } from "react";
import Modal from "../components/ui/Modal";
import { RoleBadgeList } from "../components/ui/RoleBadge";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Avatar from "../components/ui/Avatar";
import * as adminApi from "../api/adminApi";
import { toAdminUser } from "../api/mappers";
import { useAuth } from "../context/AuthContext";
import {
  ADMIN_USER_NAV_ITEMS as NAV_ITEMS,
  ADMIN_USER_ROLES as ROLES,
  DEFAULT_GRANT,
} from "../mock";
import * as classCoinApi from "../api/classCoinApi";
import { errorMessage } from "../api/apiError";

// What each role unlocks, so an admin can see the consequence before ticking the box.
// Kept beside the modal rather than in mock/, since it is prose about this screen rather
// than configuration anything else reads.
const ROLE_HINTS = {
  // An admin is not a superuser: ADMIN grants none of what CREATOR does. Keep this line
  // in step with canCreate, since a wrong hint on the screen where roles are handed out
  // is worse than no hint.
  ADMIN:   "Reviews and approves projects, manages every account. Owns nothing: no Class Coins, no projects of their own. Can create a project on behalf of a creator.",
  CREATOR: "Starts projects and posts updates on them.",
  BACKER:  "Holds a Class Coin balance and can invest in projects.",
};

// users.is_active is a boolean, so these are the only two states that exist. Anything
// like "Pending" or "Suspended" would be a state the schema cannot express.
function StatusDot({ status }) {
  const colors = { Active: "text-green-600", Inactive: "text-gray-500" };
  const dots = { Active: "bg-green-500", Inactive: "bg-gray-400" };
  return (
    <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${colors[status] || "text-gray-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${dots[status] || "bg-gray-300"}`} />
      {status}
    </span>
  );
}

// Manage Access modal.
//
// Roles and the active flag are the only things an admin can change about somebody else.
// PUT /users/profile edits your own row and has no admin equivalent, so name and email
// are read-only here rather than inputs that would collect what you typed and drop it.
//
// Roles are checkboxes rather than a dropdown, because a user holds a set of them: the
// student persona is CREATOR + BACKER, which a single-choice control cannot express.
function ManageAccessModal({ user, currentUserId, saving, error, onClose, onSave }) {
  const [roles, setRoles] = useState(user.roles);

  // The backend refuses to let an admin drop their own ADMIN role, since that could lock
  // the team out of the admin area with no way back. Disabling the checkbox teaches the
  // same rule before the click rather than after a 400.
  const isSelf = user.id === currentUserId;

  // An admin account holds ADMIN and nothing else: it owns no projects and no Class
  // Coins, so ADMIN+CREATOR and ADMIN+BACKER describe an account the rest of the app has
  // no shape for. adminService.updateUserRoles refuses them too.
  //
  // Ticking resolves the conflict rather than blocking the click: ADMIN clears the other
  // two, and either of them clears ADMIN. A checkbox that silently does nothing would be
  // worse than either.
  const toggle = (role) => {
    if (isSelf && role === "ADMIN") return;
    setRoles(prev => {
      if (prev.includes(role)) return prev.filter(r => r !== role);
      if (role === "ADMIN") return ["ADMIN"];
      return [...prev.filter(r => r !== "ADMIN"), role];
    });
  };

  // The two rules meet on your own account: ADMIN cannot be removed and cannot be
  // combined, so every box is locked with no valid set to move to. Say so rather than
  // show three dead checkboxes.
  const selfLocked = isSelf && roles.includes("ADMIN");

  const changed =
    roles.length !== user.roles.length ||
    roles.some(r => !user.roles.includes(r));

  return (
    // closable={!saving} so the dialog cannot be dismissed while the role change is
    // being written, leaving nobody unsure whether it went through.
    <Modal onClose={onClose} closable={!saving} maxWidth={480}>
        {/* Header */}
        <div className="flex justify-between items-center px-7 py-5 border-b border-gray-100">
          <h2 className="text-[18px] font-bold text-gray-900">Manage Access</h2>
          <button onClick={onClose} disabled={saving} className="bg-transparent border-none text-xl text-gray-400 hover:text-gray-600 cursor-pointer leading-none disabled:opacity-40">×</button>
        </div>

        <div className="px-7 py-5 flex flex-col gap-5">
          {/* Identity, read-only on purpose. See the note above the component. */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand text-sm">🪪</span>
              <span className="text-[11px] font-bold text-gray-500 tracking-widest">USER IDENTITY</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <Avatar name={user.name} size={40} fontSize={13} />
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-gray-900 truncate">{user.name}</div>
                <div className="text-[12px] text-gray-500 truncate">{user.email}</div>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              A person edits their own name, email and title on their Account page — there is
              no endpoint for an admin to change them here.
            </p>
          </div>

          <div className="border-t border-gray-100" />

          {/* Roles */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand text-sm">⚙️</span>
              <span className="text-[11px] font-bold text-gray-500 tracking-widest">ROLES</span>
            </div>
            <div className="flex flex-col gap-2">
              {ROLES.map(role => {
                const checked = roles.includes(role);
                // Own-account ADMIN stays locked, and the other two lock once ADMIN is
                // on, because there is no valid combination to move to.
                const locked = (isSelf && role === "ADMIN") || (selfLocked && role !== "ADMIN");
                return (
                  <label
                    key={role}
                    className={`flex items-start gap-3 border rounded-lg px-4 py-3 transition-colors ${
                      locked ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                        : checked ? "border-brand bg-red-50/40 cursor-pointer"
                        : "border-gray-200 hover:border-gray-300 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked || saving}
                      onChange={() => toggle(role)}
                      className="mt-0.5 accent-brand w-4 h-4 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-gray-900">{role}</span>
                      <span className="block text-[11px] text-gray-500 leading-relaxed">
                        {ROLE_HINTS[role]}
                        {/* Its own sentence: ROLE_HINTS.ADMIN ends in a full stop, so a
                            trailing clause would read as a fragment glued onto it. */}
                        {isSelf && role === "ADMIN" && " You cannot remove your own admin access."}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Ticking ADMIN unticks the other two, so say so. A control that changes
                two other controls without a word is as unhelpful as a disabled button
                with no reason. Not shown on your own account, where `selfLocked` below
                explains the case and two notes would compete. */}
            {!selfLocked && roles.includes("ADMIN") && (
              <p className="text-[12px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 mt-3">
                An admin account holds ADMIN alone — CREATOR and BACKER were cleared.
                Untick ADMIN to give them back.
              </p>
            )}

            {selfLocked && (
              <p className="text-[12px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 mt-3">
                Your own account is locked to ADMIN. You cannot remove your own admin
                access, and an admin account holds no other role — so there is nothing
                here to change. Another admin can edit your roles from this screen.
              </p>
            )}

            {roles.length === 0 && (
              <p className="text-[12px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 mt-3">
                With no roles this account can still sign in, but every section of the site
                will be empty for them. You can give the roles back from this same screen.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-[13px] text-brand rounded-lg px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={saving} className="bg-white border border-gray-200 rounded-md px-5 py-2.5 text-[13px] text-gray-600 font-medium cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50">CANCEL</button>
          <button
            onClick={() => onSave(roles)}
            disabled={saving || !changed}
            className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "SAVING…" : "SAVE ROLES"}
          </button>
        </div>
    </Modal>
  );
}

// Main page.
export default function AdminUserManagement() {
  const navigate = useNavigate();
  const { user: signedInUser } = useAuth();
  const [activeNav, setActiveNav] = useState("users");
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [editTarget, setEditTarget] = useState(null);
  // Errors from the role save belong in the modal, beside the checkboxes that caused
  // them. The page-level banner sits behind the overlay.
  const [savingRoles, setSavingRoles] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Issuing Class Coins. `selected` holds user ids, and an admin can never be among them
  // because their row renders no checkbox.
  const [selected, setSelected] = useState([]);
  const [grantAmount, setGrantAmount] = useState(String(DEFAULT_GRANT));
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState(null);
  const [grantedNote, setGrantedNote] = useState(null);

  const toggleSelected = (id) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleGrant = async () => {
    setGranting(true);
    setGrantError(null);
    try {
      const result = await classCoinApi.grantCoins(selected, Number(grantAmount));
      // Refetch rather than patch the rows. The balance on screen has to be the server's,
      // and this page is nowhere near a hot path.
      const rows = await adminApi.getAllUsers();
      setUsers((rows || []).map(toAdminUser));
      setSelected([]);
      setGrantedNote(
        `Granted ${result.amount.toLocaleString()} CC to ${result.granted} ${result.granted === 1 ? "person" : "people"}.`
      );
    } catch (err) {
      setGrantError(errorMessage(err, "Could not grant Class Coins"));
    } finally {
      setGranting(false);
    }
  };

  // The user list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await adminApi.getAllUsers();
        if (!cancelled) setUsers((rows || []).map(toAdminUser));
      } catch (err) {
        if (!cancelled) {
          setLoadError(errorMessage(err, "Could not load users"));
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleToggleActive = async (u) => {
    setActionError(null);
    try {
      if (u.isActive) await adminApi.deactivateUser(u.id);
      else await adminApi.activateUser(u.id);
      setUsers(prev => prev.map(x =>
        x.id === u.id
          ? { ...x, isActive: !u.isActive, status: !u.isActive ? "Active" : "Inactive" }
          : x
      ));
    } catch (err) {
      setActionError(errorMessage(err, "Could not change this user's status"));
    }
  };

  const handleNavClick = (itemId) => {
    setActiveNav(itemId);
    if (itemId === "projects") {
      navigate("/admin-dashboard");
    }
    if (itemId === "approvals") {
      navigate("/admin-approvals");
    }
  };

  const query = search.trim().toLowerCase();
  const filtered = users.filter(u => {
    const matchesSearch =
      !query ||
      (u.name || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query);
    const matchesRole = roleFilter === "ALL" || u.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  // PATCH /admin/users/:id/roles replaces the whole set, so the modal hands back every
  // role the user should end up with rather than a delta. It is the only way to grant a
  // role by hand; creator_requests covers only people who ticked the box at sign-up.
  const handleSaveRoles = async (roles) => {
    setSavingRoles(true);
    setSaveError(null);
    try {
      const res = await adminApi.updateUserRoles(editTarget.id, roles);
      // Trust the server's answer over the checkboxes: it uppercases and de-duplicates
      // the set and decides what was actually stored. Only the role fields are taken from
      // it, since the reply is built around the update and spreading it wholesale could
      // blank a name or email it never carried. is_active is carried over.
      const saved = toAdminUser({
        id: editTarget.id,
        roles: res?.user?.roles ?? roles,
        is_active: editTarget.isActive,
      });
      setUsers(prev => prev.map(u =>
        u.id === editTarget.id ? { ...u, role: saved.role, roles: saved.roles } : u
      ));
      setEditTarget(null);
    } catch (err) {
      setSaveError(errorMessage(err, "Could not update this user's roles"));
    } finally {
      setSavingRoles(false);
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
        {/* Top nav */}

        <main className="flex-1 p-4 md:p-9 overflow-y-auto">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-[28px] font-extrabold text-gray-900 mb-1">User Management</h1>
              <p className="text-[14px] text-gray-400 max-w-lg">Grant and revoke access for everyone on RMIT Launchpad, and deactivate accounts that should no longer sign in.</p>
            </div>
            {/* There is no ADD NEW USER button: sign-up needs a password, so it goes
                through the Register page and cannot happen from here. */}
          </div>

          {(loadError || actionError) && (
            <div className="bg-red-50 border border-red-200 text-[13px] text-brand rounded-lg px-4 py-3 mb-5 flex justify-between items-center gap-3">
              <span>{loadError || actionError}</span>
              {actionError && !loadError && (
                <button
                  onClick={() => setActionError(null)}
                  className="bg-transparent border-none cursor-pointer text-brand text-[15px] leading-none"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 md:px-5 py-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-5">
            <div className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2 flex-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="bg-transparent border-none outline-none text-[13px] text-gray-700 w-full placeholder-gray-300"
              />
            </div>
            {/* Nothing in the database links a user to a project, so there is no group
                filter here. This one filters for real. */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-[13px] text-gray-600 bg-white outline-none w-full sm:w-auto"
            >
              <option value="ALL">All roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {grantedNote && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-[13px] mb-4 flex items-start justify-between gap-3">
              <span>{grantedNote}</span>
              <button
                onClick={() => setGrantedNote(null)}
                className="bg-transparent border-none text-green-700 hover:text-green-900 cursor-pointer text-[15px] leading-none shrink-0"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Only present once somebody is selected: an empty amount box above an empty
              selection is a control with nothing to act on. */}
          {selected.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 md:px-5 py-3 flex flex-wrap items-center gap-3 mb-4">
              <span className="text-[13px] font-bold text-gray-900">
                {selected.length} selected
              </span>
              <input
                value={grantAmount}
                onChange={e => setGrantAmount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                aria-label="Class Coins to grant"
                className="w-28 border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors"
              />
              <span className="text-[13px] text-gray-500">CC each</span>
              <button
                onClick={handleGrant}
                disabled={granting || !Number(grantAmount)}
                className="bg-brand text-white border-none rounded-md px-4 py-2 text-[12px] font-bold tracking-[0.05em] cursor-pointer transition-colors hover:bg-brand-dark disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {granting ? "GRANTING…" : "GRANT"}
              </button>
              <button
                onClick={() => setSelected([])}
                className="bg-transparent border-none text-[12px] font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                Clear
              </button>
              {grantError && <span className="text-[12px] text-brand">{grantError}</span>}
            </div>
          )}

          {/* User table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {/* The first header is blank on purpose: it sits over the checkbox
                        column, and "Select" would be a label for a control that already
                        explains itself. */}
                    {["", "User Identity", "Roles", "Balance", "Status", "Management Actions"].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-[11px] font-bold text-gray-400 tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="lp-stagger">
                  {filtered.length > 0 ? filtered.map((u, i) => (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${i < filtered.length - 1 ? "border-b border-gray-100" : ""}`}>
                      <td className="px-5 py-3.5 w-10">
                        {/* An admin row renders no checkbox rather than a disabled one. An
                            admin owns nothing and is never a valid target, and a
                            greyed-out box invites somebody to try and then refuses. */}
                        {!u.roles.includes("ADMIN") && (
                          <input
                            type="checkbox"
                            checked={selected.includes(u.id)}
                            onChange={() => toggleSelected(u.id)}
                            aria-label={`Select ${u.name}`}
                            className="h-4 w-4 cursor-pointer accent-brand"
                          />
                        )}
                      </td>

                      {/* Identity */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size={36} fontSize={12} />
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold text-gray-900">{u.name}</div>
                            {/* The email rather than an invented id: it is also the
                                address this person signs in with. */}
                            <div className="text-[11px] text-gray-400 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Roles */}
                      <td className="px-5 py-3.5">
                        <RoleBadgeList roles={u.roles} />
                      </td>

                      {/* Balance */}
                      <td className="px-5 py-3.5">
                        {/* A dash is for an account with no wallet; a real 0 renders as
                            "0 CC". They look alike and mean different things: one has
                            spent or never received, the other has no wallet at all. */}
                        <span className="text-[13px] font-bold text-gray-900 whitespace-nowrap">
                          {u.balance == null ? "—" : `${u.balance.toLocaleString()} CC`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusDot status={u.status} />
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={u.id === signedInUser?.id}
                          title={u.id === signedInUser?.id ? "You cannot deactivate your own account." : undefined}
                          className="block mt-1 text-[11px] text-brand font-semibold bg-transparent border-none cursor-pointer hover:underline p-0 disabled:text-gray-300 disabled:cursor-not-allowed disabled:no-underline"
                        >
                          {u.isActive ? "DEACTIVATE" : "ACTIVATE"}
                        </button>
                      </td>

                      {/* Actions */}
                      {/* No REMOVE button. DELETE /users/profile only deletes yourself,
                          and deleting a user cascades away their projects, comments and
                          funding history. Deactivating is the reversible equivalent and
                          already sits in the Status column. */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => { setSaveError(null); setEditTarget(u); }}
                          className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 bg-transparent border-none cursor-pointer hover:text-brand transition-colors"
                        >
                          ⚙ MANAGE ACCESS
                        </button>
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

            {/* No pager: the whole list is already on screen. The count stays. */}
            <div className="px-5 py-3.5 border-t border-gray-100">
              <span className="text-[12px] text-gray-400">
                Showing {filtered.length} of {users.length} {users.length === 1 ? "account" : "accounts"}
              </span>
            </div>
          </div>
        </main>
      </div>
      </div>

      {/* The Manage Access modal, mounted per open, so the checkboxes reset to the
          user being edited without an effect to sync them. */}
      {editTarget && (
        <ManageAccessModal
          user={editTarget}
          currentUserId={signedInUser?.id}
          saving={savingRoles}
          error={saveError}
          onClose={() => { setEditTarget(null); setSaveError(null); }}
          onSave={handleSaveRoles}
        />
      )}
    </div>
  );
}