import { useState, useEffect, useCallback } from "react";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import EditProject from "./EditProject";
import PostUpdateModal from "../components/creator/PostUpdateModal";
import CreatorSidebar from "../components/creator/CreatorSidebar";
import * as projectApi from "../api/projectApi";
import { toCreatorProject, parseAmount } from "../api/mappers";
import Header from "../components/layout/Header";
import { errorMessage } from "../api/apiError";

const DEPT_STYLE = {
  Engineering: "bg-blue-900 text-white",
  Science: "bg-green-700 text-white",
  Design: "bg-purple-700 text-white",
  Business: "bg-yellow-800 text-white",
};

// The moderation verdict, said out loud on every card.
//
// `toCreatorProject` renames APPROVED to "Active" — that is the funding-campaign framing.
// What a creator actually needs on this page is the admin's decision, so the badge says
// APPROVED instead. "Active Funding" in the stats above keeps the old wording, since
// there it really is describing a running campaign.
//
// REJECTED previously rendered NOTHING: the card body branched on Active / Draft /
// Pending Review and a rejected project matched none of them, so it sat in the list as a
// blank card indistinguishable from a loading one — which is why it looked like rejected
// projects had silently disappeared. They never left; they just stopped saying anything.
// `tone` here is the Badge vocabulary, so the colours live in one place. The LABEL still
// belongs to this file: toCreatorProject renames APPROVED to "Active" for the funding
// framing, but a creator looking at this card needs the board's verdict, so the badge says
// APPROVED while the "ACTIVE FUNDING" stat keeps the other wording.
const STATUS_BADGE = {
  Active: { label: "APPROVED", tone: "success" },
  "Pending Review": { label: "PENDING REVIEW", tone: "warning" },
  Rejected: { label: "REJECTED", tone: "danger" },
  Draft: { label: "DRAFT", tone: "neutral" },
};

// ⚠️ Kept separate from AdminUserManagement's StatusDot even though both say "status".
// That one is a USER's status; this is a PROJECT's. Same shape, different fact.
function StatusBadge({ status }) {
  // An unmapped status still gets a badge rather than silently rendering nothing —
  // that silence is the bug this exists to fix.
  const badge = STATUS_BADGE[status] || {
    label: String(status || "UNKNOWN").toUpperCase(),
    tone: "neutral",
  };

  return (
    <Badge tone={badge.tone} size="sm" className="shrink-0">
      {badge.label}
    </Badge>
  );
}

// The selected chip is derived from state rather than stored, so it cannot point at a
// chip that no longer exists — restoring the last archived project removes the ARCHIVED
// chip, and a stored "archived" would then show an empty list with nothing selected.
function activeTabFor(tab, archivedCount) {
  if (tab === "archived" && archivedCount === 0) return "all";
  return tab;
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
      <div className="flex justify-between items-start mb-2">
        <div className="text-[11px] font-bold text-gray-400 tracking-widest">{label}</div>
        <span className="text-brand text-lg">{icon}</span>
      </div>
      <div className="text-[24px] sm:text-[28px] font-extrabold text-gray-900">{value}</div>
    </div>
  );
}

/**
 * One card shape for every project, whatever its status.
 *
 * There used to be two near-identical components: the Active card used a 240px image
 * column and the Pending/Draft one used 200px, so a pending project sat in the same
 * list with a visibly smaller image. Only the middle of the card actually differs by
 * status, so that is the only part that branches now — the image column, the header
 * row and the action bar are shared and cannot drift apart again.
 *
 * `sm:min-h-*` matters: on desktop the image is `h-auto` and stretches to the row, so
 * without a floor the shorter pending body would pull the image up again.
 */
function ProjectRowCard({ project, onEdit, onUpdate, onDetails, onArchive, onRestore, onResubmit, canRestore, restoring, resubmitting }) {
  // An archived project keeps its verdict ("Active", "Pending Review"), so the funding
  // block below must not read as a live campaign — the archived branch takes over.
  const isArchived = Boolean(project.archived);
  const isActive = !isArchived && project.status === "Active";
  const isRejected = !isArchived && project.status === "Rejected";

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${isArchived ? "border-amber-200" : "border-gray-200"}`}>
      <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] sm:min-h-[215px]">
        <div className="h-44 sm:h-auto bg-gray-100">
          {project.img ? (
            <img src={project.img} alt={project.title} className="w-full h-full object-cover" />
          ) : (
            // image_url is optional on the API, and a bare <img src={null}> renders the
            // browser's broken-image icon.
            <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-400">
              No cover image
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col">
          <div className="flex justify-between items-start mb-2 gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm shrink-0 ${DEPT_STYLE[project.dept] || "bg-gray-200 text-gray-600"}`}>
              {project.dept.toUpperCase()}
            </span>
            {/* The verdict badge is ALWAYS here — that is the whole point. Archived is a
                separate axis, so an archived project shows both: what the admin decided,
                and the fact that it is currently put away. */}
            <div className="flex items-center gap-2 shrink-0">
              {isActive && <span className="text-[15px] font-extrabold text-brand">{project.pct}%</span>}
              <StatusBadge status={project.status} />
              {isArchived && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-1 whitespace-nowrap">
                  ARCHIVED
                </span>
              )}
            </div>
          </div>

          <h3 className="text-[17px] font-bold text-gray-900 mb-3">{project.title}</h3>

          {isArchived ? (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-3 text-[12px] text-amber-900 leading-relaxed mb-3">
              {canRestore ? (
                <>
                  You archived this project{project.archivedAt && ` on ${project.archivedAt}`}. It is
                  hidden from Discover and cannot be edited. Restore it to bring it back as{" "}
                  <strong>{project.status}</strong>.
                </>
              ) : (
                <>
                  {/* A creator cannot undo an admin's archive — the reason is the only
                      thing that tells them what happened, which is why the backend
                      requires it in that case. */}
                  Archived by <strong>{project.archivedByName || "an administrator"}</strong>
                  {project.archivedAt && ` on ${project.archivedAt}`}. Only an administrator can
                  restore it.
                  {project.archiveReason && (
                    <div className="mt-1.5 italic">Reason: {project.archiveReason}</div>
                  )}
                </>
              )}
            </div>
          ) : isActive ? (
            <>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-brand rounded-full" style={{ width: `${project.pct}%` }} />
              </div>
              <div className="flex gap-8 mb-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-0.5">RAISED</div>
                  <div className="text-[14px] font-bold text-gray-900">{project.raised}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-0.5">GOAL</div>
                  <div className="text-[14px] font-bold text-gray-900">{project.goal}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              {project.status === "Draft" && (
                <p className="text-[13px] text-gray-400 italic mb-3">
                  Last edited {project.lastEdited}. Complete your project details to submit for review.
                </p>
              )}
              {project.status === "Pending Review" && (
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-3 text-[12px] text-gray-500 leading-relaxed mb-3">
                  Your project is currently being reviewed by the RMIT {project.dept} Department board. You will receive an update within 3-5 business days.
                </div>
              )}
              {/* Rejected had no branch at all, so the card body was empty. It now states
                  the verdict, quotes the reviewer's note when there is one, and points at
                  the way forward — edit, then RESUBMIT below. */}
              {project.status === "Rejected" && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3.5 py-3 text-[12px] text-red-800 leading-relaxed mb-3">
                  This project was not approved by the RMIT {project.dept} Department board, so it
                  is not listed on Discover and cannot receive investments.
                  {project.reviewNote ? (
                    <div className="mt-2 pl-3 border-l-2 border-red-300 italic">
                      "{project.reviewNote}"
                    </div>
                  ) : (
                    // The reviewer can reject in one click from the queue without typing
                    // anything, so an empty note is a normal state, not a missing value.
                    <div className="mt-2 text-red-600">The board did not leave a note.</div>
                  )}
                  <div className="mt-2">
                    Edit the project to address the feedback, then <strong>resubmit</strong> it for
                    review.
                  </div>
                </div>
              )}
            </>
          )}

          {/* EDIT and UPDATE are gone while archived: the backend rejects both on an
              archived project, and that refusal is exactly what keeps restoring safe
              (nothing can change between archive and restore, so no re-approval).
              Offering the buttons would only produce an error after the fact. */}
          <div className="border-t border-gray-100 pt-4 mt-auto flex flex-wrap gap-2.5">
            {isArchived ? (
              <>
                {canRestore && (
                  <button
                    onClick={() => onRestore(project)}
                    disabled={restoring}
                    className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2 text-[12px] font-bold cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {restoring ? "RESTORING…" : "↩ RESTORE"}
                  </button>
                )}
                <button
                  onClick={() => onDetails(project)}
                  className="bg-white border border-gray-300 text-gray-600 rounded-md px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  PROJECT DETAILS
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onEdit(project)}
                  className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2 text-[12px] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  ✎ EDIT PROJECT
                </button>
                {/* No UPDATE on a rejected project. A project update is a public post on
                    the project page, and a rejected project is not on Discover and has no
                    backers — so it would be written for nobody, and would then surface
                    with a misleading timestamp if the project were later approved. The
                    backend refuses it too, so the button would only ever produce an error.
                    RESUBMIT takes its place: without it a rejected project is a dead end,
                    since the approval queue lists only PENDING. */}
                {isRejected ? (
                  <button
                    onClick={() => onResubmit(project)}
                    disabled={resubmitting}
                    className="bg-white border border-gray-300 text-gray-600 rounded-md px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resubmitting ? "RESUBMITTING…" : "↻ RESUBMIT FOR REVIEW"}
                  </button>
                ) : (
                  <button
                    onClick={() => onUpdate(project)}
                    className="bg-white border border-gray-300 text-gray-600 rounded-md px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                  >
                    ↑ UPDATE
                  </button>
                )}
                <button
                  onClick={() => onDetails(project)}
                  className="bg-white border border-gray-300 text-gray-600 rounded-md px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  PROJECT DETAILS
                </button>
                {/* Replaces nothing — a creator previously had no way to take their own
                    project down at all, short of asking an admin to delete it. */}
                <button
                  onClick={() => onArchive(project)}
                  className="bg-white border border-gray-300 text-gray-500 rounded-md px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 hover:text-gray-700 transition-colors ml-auto"
                >
                  🗄 ARCHIVE
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreatorMyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  // The project whose update form is open — null means the modal is closed. It is the
  // project itself rather than a boolean so the form knows what it is posting about.
  const [updateTarget, setUpdateTarget] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Title of the project an update was just posted to. The modal closes on success, so
  // without this there is no sign anything happened — the update lives on the project
  // page, not on this one.
  const [postedFor, setPostedFor] = useState(null);
  // "all" | "Active" | "Pending Review" | "Rejected" | "archived".
  // The first four filter the live list by the admin's verdict; "archived" is the
  // separate visibility axis and swaps the list out entirely, which is why it shares this
  // one control rather than sitting in a second row — a project is in exactly one of
  // these buckets at a time from this page's point of view.
  const [tab, setTab] = useState("all");
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [resubmittingId, setResubmittingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  // Set only on /creator-my-projects/:id/edit — the deep link used by "EDIT THIS PROJECT"
  // on ProjectDetail and on the Discover hero. Undefined on the plain list route.
  const { id: editIdParam } = useParams();


  // GET /api/projects/my — the signed-in creator's own projects, archived included.
  // Refetched after archive/restore rather than patched locally: archived_by_name comes
  // from a join that the mutation response does not carry.
  // Nothing here sets state before the first `await`: `loading` already starts true, so
  // the effect below never triggers a synchronous cascading render
  // (react-hooks/set-state-in-effect). Keep it that way if you edit this.
  const loadProjects = useCallback(async () => {
    try {
      const rows = await projectApi.getMyProjects();
      setProjects((rows || []).map(toCreatorProject));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, "Could not load your projects"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Wrapped in an async IIFE, matching every other fetch effect in the codebase:
  // calling loadProjects() bare here trips react-hooks/set-state-in-effect, which reads
  // the call graph and sees the setStates inside it.
  useEffect(() => { (async () => { await loadProjects(); })(); }, [loadProjects]);


  const liveProjects = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p => p.archived);
  // Derived, not stored: restoring the LAST archived project hides the Archived chip, and
  // a stored tab would leave you stranded on an empty list with no way back. Falling back
  // here fixes that without an effect that fights the user's own clicks.
  const activeTab = activeTabFor(tab, archivedProjects.length);

  // The project whose edit form is open. DERIVED rather than synced with an effect: the
  // deep link /creator-my-projects/:id/edit is already a piece of state living in the URL,
  // and copying it into React state with a useEffect both trips
  // react-hooks/set-state-in-effect and reopens the dialog the moment it is closed, since
  // the id is still in the URL for one render.
  //
  // ⚠️ An id matching nothing deliberately opens NOTHING and leaves the creator on the
  // list. GET /projects/my returns only their own projects, so "no match" covers a stale
  // link, a typo and somebody else's project alike — and the list is the honest answer to
  // all three. Do not make it an error state; this page cannot tell those cases apart.
  const urlEditProject = editIdParam
    ? projects.find(p => String(p.id) === editIdParam) ?? null
    : null;
  // The row button wins if both are somehow set — but the open dialog covers the list, so
  // in practice only one of them can be chosen at a time.
  const openEditProject = editTarget ?? urlEditProject;

  const shown =
    activeTab === "archived"
      ? archivedProjects
      : activeTab === "all"
        ? liveProjects
        : liveProjects.filter(p => p.status === activeTab);

  // Only the statuses that actually exist get a chip. A creator with nothing rejected
  // should not be looking at a permanent "REJECTED (0)".
  const filterChips = [
    { id: "all", label: "ALL", count: liveProjects.length },
    ...["Active", "Pending Review", "Rejected", "Draft"]
      .map(status => ({
        id: status,
        label: (STATUS_BADGE[status]?.label) || status.toUpperCase(),
        count: liveProjects.filter(p => p.status === status).length,
      }))
      .filter(chip => chip.count > 0),
    ...(archivedProjects.length > 0
      ? [{ id: "archived", label: "ARCHIVED", count: archivedProjects.length }]
      : []),
  ];

  // A creator may only undo an archive they performed themselves. If an admin archived
  // the project, archived_by is the admin's id and the backend refuses the restore — so
  // the button is not offered either.
  const canRestore = (p) => p.archivedBy != null && p.archivedBy === user?.id;

  const handleArchive = async () => {
    setArchiving(true);
    setActionError(null);
    try {
      await projectApi.archiveProject(archiveTarget.id, archiveReason.trim());
      await loadProjects();
      setArchiveTarget(null);
      setArchiveReason("");
    } catch (err) {
      setActionError(
        errorMessage(err, "Could not archive this project")
      );
    } finally {
      setArchiving(false);
    }
  };

  // Back into the approval queue after a revision. The backend clears review_note and
  // sets the status to PENDING, so the card re-renders as "Pending Review" — that visible
  // change is the confirmation, no toast needed.
  const handleResubmit = async (project) => {
    setResubmittingId(project.id);
    setLoadError(null);
    try {
      await projectApi.resubmitProject(project.id);
      await loadProjects();
    } catch (err) {
      setLoadError(
        errorMessage(err, "Could not resubmit this project")
      );
    } finally {
      setResubmittingId(null);
    }
  };

  const handleRestore = async (project) => {
    setRestoringId(project.id);
    setLoadError(null);
    try {
      await projectApi.restoreProject(project.id);
      await loadProjects();
    } catch (err) {
      setLoadError(
        errorMessage(err, "Could not restore this project")
      );
    } finally {
      setRestoringId(null);
    }
  };

  // Stats describe what you are actually running, so archived projects are excluded —
  // an archived project raises nothing and is not "active funding".
  const totalProjects = liveProjects.length;
  const activeFunding = liveProjects.filter(p => p.status === "Active").length;
  const totalRaised = liveProjects.reduce((sum, p) => {
    if (p.status === "Active") {
      // toCreatorProject formats this as "10,625 CC"; parseAmount knows to strip the
      // unit as well as the separator, and returns 0 rather than NaN on a bad row —
      // one NaN here would turn the whole total into NaN.
      return sum + parseAmount(p.raised);
    }
    return sum;
  }, 0);

  const projectContent = (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          {/* Getting back to the dashboard is the sidebar's job now. */}
          <h1 className="text-[22px] sm:text-[26px] font-extrabold text-gray-900 m-0">My Projects</h1>
          <p className="text-[13px] text-gray-400 mt-1">Manage your ongoing research and creative initiatives.</p>
        </div>

        {/* NEW PROJECT sits with the page title rather than in the sidebar, which is now
            purely navigation. NEW UPDATE did not survive at all: an update belongs to one
            project, and every card carries its own UPDATE button. */}
        <button
          onClick={() => navigate("/create-project")}
          className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2.5 text-[12px] font-bold tracking-wide cursor-pointer transition-colors shrink-0"
        >
          ⊕ NEW PROJECT
        </button>
      </div>

      {postedFor && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-[13px] mb-5 flex items-start justify-between gap-3">
          <span>Update posted to <strong>{postedFor}</strong> — it is live on the project page.</span>
          <button
            onClick={() => setPostedFor(null)}
            className="bg-transparent border-none text-green-700 hover:text-green-900 cursor-pointer text-[15px] leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 lp-stagger">
        <StatCard label="TOTAL PROJECTS" value={totalProjects} icon="📁" />
        <StatCard label="ACTIVE FUNDING" value={activeFunding} icon="📈" />
        <StatCard label="TOTAL RAISED" value={`${totalRaised.toLocaleString()} CC`} icon="💳" />
      </div>

      {/* Filter by the admin's verdict, plus the archive bin. Only rendered once there is
          more than one bucket to choose between — a lone "ALL (3)" chip is just noise. */}
      {filterChips.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {filterChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => setTab(chip.id)}
              className={`rounded-md px-3.5 py-2 text-[12px] font-bold tracking-wide cursor-pointer transition-colors border ${
                activeTab === chip.id
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
      )}

      {loading && <div className="text-[13px] text-gray-400 py-10 text-center">Loading your projects…</div>}
      {!loading && loadError && (
        <div className="text-[13px] text-brand py-10 text-center">
          Could not load your projects — {loadError}
        </div>
      )}
      {!loading && !loadError && projects.length === 0 && (
        <div className="text-[13px] text-gray-400 py-10 text-center">
          You have not created any projects yet.
        </div>
      )}
      {!loading && !loadError && projects.length > 0 && shown.length === 0 && (
        <div className="text-[13px] text-gray-400 py-10 text-center">
          {activeTab === "archived"
            ? "Nothing archived."
            : activeTab === "all"
              ? "All of your projects are archived."
              : "No projects with this status."}
        </div>
      )}

      <div className="flex flex-col gap-5 lp-stagger">
        {shown.map(p => (
          <ProjectRowCard
            key={p.id}
            project={p}
            onEdit={setEditTarget}
            onUpdate={setUpdateTarget}
            onDetails={proj => navigate(`/project/${proj.id}`)}
            onArchive={proj => { setArchiveTarget(proj); setArchiveReason(""); setActionError(null); }}
            onRestore={handleRestore}
            onResubmit={handleResubmit}
            canRestore={canRestore(p)}
            restoring={restoringId === p.id}
            resubmitting={resubmittingId === p.id}
          />
        ))}
      </div>
    </div>
  );

  const modals = (
    <>
      {openEditProject && (
        <EditProject
          project={openEditProject}
          onClose={() => {
            setEditTarget(null);
            // Drop the deep link so a refresh does not reopen the form, and so the back
            // button goes where the creator came from rather than back into the dialog.
            if (editIdParam) navigate("/creator-my-projects", { replace: true });
          }}
        />
      )}
      {updateTarget && (
        <PostUpdateModal
          project={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onPosted={() => setPostedFor(updateTarget.title)}
        />
      )}

      {/* Archive confirmation. Mounted only when there is a target, the same pattern as
          EditProject and PostUpdateModal — that is also what resets the reason box
          between projects, so it needs no effect. */}
      {archiveTarget && (
        <Modal
          onClose={() => { setArchiveTarget(null); setActionError(null); }}
          maxWidth={440}
          panelClassName="p-6"
        >
            <h2 className="text-[18px] font-bold text-gray-900 mb-3">Archive Project</h2>
            <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
              <span className="font-bold text-gray-900">"{archiveTarget.title}"</span> will be
              hidden from Discover and stop accepting investments and comments, and you will not
              be able to edit it. Nothing is deleted — you can restore it yourself at any time,
              and it comes back as <span className="font-semibold text-gray-700">{archiveTarget.status}</span>.
            </p>

            <label className="block text-[12px] font-bold text-gray-500 tracking-wide mb-1.5">
              REASON <span className="font-medium text-gray-400">(optional)</span>
            </label>
            <textarea
              value={archiveReason}
              onChange={e => setArchiveReason(e.target.value)}
              placeholder="A note to yourself about why you archived this."
              rows={3}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] text-gray-700 outline-none resize-y focus:border-gray-400 transition-colors mb-4"
            />

            {actionError && (
              <div className="bg-red-50 border border-red-200 text-[13px] text-brand rounded-lg px-3 py-2 mb-4">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setArchiveTarget(null); setActionError(null); }}
                disabled={archiving}
                className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[13px] text-gray-600 font-medium cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className={`border-none rounded-md px-5 py-2 text-[13px] font-bold transition-colors ${
                  archiving
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-brand hover:bg-red-800 text-white cursor-pointer"
                }`}
              >
                {archiving ? "Archiving…" : "Archive"}
              </button>
            </div>
        </Modal>
      )}
    </>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans relative overflow-x-hidden">

      <Header showSearch={false} onToggleSidebar={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0">
        <CreatorSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {projectContent}
          </main>
        </div>
      </div>

      {modals}
    </div>
  );
}
