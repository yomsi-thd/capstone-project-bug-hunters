import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EditProject from "./EditProject";
import PostUpdateModal from "../components/creator/PostUpdateModal";
import { CREATOR_SIDEBAR_LINKS } from "../mock";
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

function ActiveProjectCard({ project, onEdit }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr]">
        <div className="h-44 sm:h-auto">
          <img src={project.img} alt={project.title} className="w-full h-full object-cover" />
        </div>
        <div className="p-5 flex flex-col">
          <div className="flex justify-between items-start mb-2 gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm ${DEPT_STYLE[project.dept] || "bg-gray-200 text-gray-600"} shrink-0`}>
              {project.dept.toUpperCase()}
            </span>
            <span className="text-[15px] font-extrabold text-brand shrink-0">{project.pct}%</span>
          </div>
          <h3 className="text-[17px] font-bold text-gray-900 mb-3">{project.title}</h3>
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
          <div className="border-t border-gray-100 pt-4 mt-auto flex gap-2.5">
            <button
              onClick={() => onEdit(project)}
              className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2 text-[12px] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              ✎ EDIT PROJECT
            </button>
            <button className="bg-white border border-gray-300 text-gray-600 rounded-md px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors">
              PROJECT DETAILS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleProjectCard({ project, onEdit }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
        <div className="h-40 sm:h-auto">
          <img src={project.img} alt={project.title} className="w-full h-full object-cover" />
        </div>
        <div className="p-5 flex flex-col">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm w-fit mb-2 ${DEPT_STYLE[project.dept] || "bg-gray-200 text-gray-600"}`}>
            {project.dept.toUpperCase()}
          </span>
          <h3 className="text-[17px] font-bold text-gray-900 mb-2">{project.title}</h3>

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

          <div className="border-t border-gray-100 pt-4 mt-auto flex gap-2.5">
            <button
              onClick={() => onEdit(project)}
              className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2 text-[12px] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              ✎ EDIT PROJECT
            </button>
            <button className="bg-white border border-gray-300 text-gray-600 rounded-md px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors">
              PROJECT DETAILS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarShell({ active, sidebarOpen, onClose, onNavigate, onNewProject, onNewUpdate }) {
  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-14 bottom-0 left-0 md:top-0 z-40 w-48 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold shrink-0">PC</div>
            <div>
              <div className="text-[13px] font-bold text-gray-900">Project Creator</div>
              <div className="text-[11px] text-gray-400">School of Design</div>
            </div>
          </div>
          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="w-full bg-brand hover:bg-red-800 text-white text-[11px] font-bold tracking-wide py-1.5 rounded mb-1.5 transition-colors cursor-pointer border-none"
          >
            ⊕ NEW PROJECT
          </button>
          <button
            onClick={() => {
              onNewUpdate();
              onClose();
            }}
            className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 text-[11px] font-bold tracking-wide py-1.5 rounded transition-colors cursor-pointer"
          >
            ↑ NEW UPDATE
          </button>
        </div>

        <nav className="flex-1 p-2">
          {CREATOR_SIDEBAR_LINKS.map(link => (
            <button
              key={link.id}
              onClick={() => {
                onNavigate(link.id);
                onClose();
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
          {["? Help Center", "→ Logout"].map(l => (
            <button key={l} className="w-full bg-transparent border-none text-left px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer">{l}</button>
          ))}
        </div>
      </aside>
    </>
  );
}

export default function CreatorMyProjects({ onBack, embedded = false }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [active, setActive] = useState("myprojects");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
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
      const num = parseFloat(p.raised.replace(/[$,]/g, ""));
      return sum + num;
    }
    return sum;
  }, 0);

  const handleSidebarClick = (id) => {
    setActive(id);

    if (id === "dashboard") {
      navigate("/creator-dashboard");
    }
  };

  const projectContent = (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          {onBack && (
            <button onClick={onBack} className="text-[12px] text-gray-400 hover:text-brand bg-transparent border-none cursor-pointer mb-2 transition-colors">
              ← Back to Dashboard
            </button>
          )}
          <h1 className="text-[22px] sm:text-[26px] font-extrabold text-gray-900 m-0">My Projects</h1>
          <p className="text-[13px] text-gray-400 mt-1">Manage your ongoing research and creative initiatives.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 lp-stagger">
        <StatCard label="TOTAL PROJECTS" value={totalProjects} icon="📁" />
        <StatCard label="ACTIVE FUNDING" value={activeFunding} icon="📈" />
        <StatCard label="TOTAL RAISED" value={`$${totalRaised.toLocaleString()}`} icon="💳" />
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
        {projects.map(p =>
          p.status === "Active" ? (
            <ActiveProjectCard key={p.id} project={p} onEdit={setEditTarget} />
          ) : (
            <SimpleProjectCard key={p.id} project={p} onEdit={setEditTarget} />
          )
        )}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <>
        {projectContent}
        {editTarget && <EditProject project={editTarget} onClose={() => setEditTarget(null)} />}
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans relative overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* The shared Header spans the full width, exactly as on the public pages.
          The sidebar and the content sit in a row underneath it. */}
      <Header showSearch={false} onToggleSidebar={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0">

      <SidebarShell
        active={active}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleSidebarClick}
        onNewProject={() => navigate("/create-project")}
        onNewUpdate={() => setShowUpdateModal(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {projectContent}
        </main>
      </div>
      </div>

      {editTarget && <EditProject project={editTarget} onClose={() => setEditTarget(null)} />}

      <PostUpdateModal open={showUpdateModal} onClose={() => setShowUpdateModal(false)} />
    </div>
  );
}