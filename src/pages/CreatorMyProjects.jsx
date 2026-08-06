import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EditProject from "./EditProject";
import PostUpdateModal from "../components/creator/PostUpdateModal";
import CreatorSidebar from "../components/creator/CreatorSidebar";
import * as projectApi from "../api/projectApi";
import { toCreatorProject } from "../api/mappers";
import Header from "../components/layout/Header";

const DEPT_STYLE = {
  Engineering: "bg-blue-900 text-white",
  Science: "bg-green-700 text-white",
  Design: "bg-purple-700 text-white",
  Business: "bg-yellow-800 text-white",
};

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
function ProjectRowCard({ project, onEdit, onUpdate, onDetails }) {
  const isActive = project.status === "Active";

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
            {isActive && (
              <span className="text-[15px] font-extrabold text-brand shrink-0">{project.pct}%</span>
            )}
          </div>

          <h3 className="text-[17px] font-bold text-gray-900 mb-3">{project.title}</h3>

          {isActive ? (
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
            </>
          )}

          <div className="border-t border-gray-100 pt-4 mt-auto flex flex-wrap gap-2.5">
            <button
              onClick={() => onEdit(project)}
              className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2 text-[12px] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              ✎ EDIT PROJECT
            </button>
            <button
              onClick={() => onUpdate(project)}
              className="bg-white border border-gray-300 text-gray-600 rounded-md px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              ↑ UPDATE
            </button>
            <button
              onClick={() => onDetails(project)}
              className="bg-white border border-gray-300 text-gray-600 rounded-md px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
            >
              PROJECT DETAILS
            </button>
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
  const navigate = useNavigate();

  // GET /api/projects/my — the signed-in creator's own projects.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await projectApi.getMyProjects();
        if (!cancelled) setProjects((rows || []).map(toCreatorProject));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.message || err.message || "Could not load your projects");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalProjects = projects.length;
  const activeFunding = projects.filter(p => p.status === "Active").length;
  const totalRaised = projects.reduce((sum, p) => {
    if (p.status === "Active") {
      // toCreatorProject formats this as "10,625 CC", so strip everything that is not
      // a digit or a decimal point rather than just "$" and ",".
      const num = parseFloat(p.raised.replace(/[^0-9.]/g, ""));
      return sum + num;
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

      <div className="flex flex-col gap-5 lp-stagger">
        {projects.map(p => (
          <ProjectRowCard
            key={p.id}
            project={p}
            onEdit={setEditTarget}
            onUpdate={setUpdateTarget}
            onDetails={proj => navigate(`/project/${proj.id}`)}
          />
        ))}
      </div>
    </div>
  );

  const modals = (
    <>
      {editTarget && <EditProject project={editTarget} onClose={() => setEditTarget(null)} />}
      {updateTarget && (
        <PostUpdateModal
          project={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onPosted={() => setPostedFor(updateTarget.title)}
        />
      )}
    </>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans relative overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

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
