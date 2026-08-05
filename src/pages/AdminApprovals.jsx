import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import { useAuth } from "../context/AuthContext";
import {
  ADMIN_APPROVAL_DEPT_STYLE as DEPT_STYLE,
  ADMIN_APPROVAL_PROJECTS as INITIAL_PROJECTS,
  ADMIN_NAV_ITEMS as NAV_ITEMS,
} from "../mock";

// ── Project Review Page ──
function ProjectReview({ project, onBack, onApprove, onRequestChanges }) {
  const [feedback, setFeedback] = useState("");

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-2">
        <button onClick={onBack} className="text-[12px] text-gray-400 hover:text-brand bg-transparent border-none cursor-pointer transition-colors">← Back to Approvals</button>
        <span className="text-gray-300 text-[12px]">/</span>
        <span className="text-[12px] text-gray-500 font-medium">Project Submission Review</span>
      </div>

      <div className="px-8 py-6 max-w-4xl w-full mx-auto">
        {/* Title row */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1">PROJECT SUBMISSION REVIEW</div>
            <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight">{project.title}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1 shrink-0">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm ${DEPT_STYLE[project.dept] || "bg-gray-200 text-gray-600"}`}>{project.dept}</span>
            <span className="bg-red-50 border border-brand text-brand text-[10px] font-bold px-2.5 py-1 rounded-sm">PENDING REVIEW</span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_280px] gap-6">
          {/* Left col */}
          <div>
            {/* Gallery */}
            <div className="rounded-xl overflow-hidden mb-3 relative" style={{ height: "220px" }}>
              <img src={project.gallery[0]} alt={project.title} className="w-full h-full object-cover" />
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-semibold px-3 py-1 rounded-full cursor-pointer">▶ Project Pitch Video</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {project.gallery.slice(1).map((img, i) => (
                <div key={i} className="rounded-lg overflow-hidden h-28">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            {/* Project Goal */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">Project Goal</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{project.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-1">PROJECTED FUNDING GOAL</div>
                  <div className="text-[18px] font-extrabold text-brand">{project.goal}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-1">CAMPAIGN DURATION</div>
                  <div className="text-[18px] font-extrabold text-gray-900">{project.duration}</div>
                </div>
              </div>
            </div>

            {/* Review Decision */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-gray-900 mb-3">Review Decision</h3>
              <div className="mb-4">
                <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">FEEDBACK TO CREATOR</label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Provide constructive feedback or instructions for required changes..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors min-h-[100px] resize-y leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <button
                    onClick={() => onApprove(project.id)}
                    className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors flex items-center gap-2"
                  >
                    ✓ APPROVE PROJECT
                  </button>
                  <button
                    onClick={() => onRequestChanges(project.id, feedback)}
                    className="bg-white border border-gray-300 text-gray-600 rounded-md px-5 py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    ↩ REQUEST CHANGES
                  </button>
                </div>
                <p className="text-[11px] text-gray-300 max-w-[200px] text-right leading-relaxed">Approving this project will make it live and visible to potential backers on the RMIT ecosystem.</p>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="flex flex-col gap-4">
            {/* Team Members */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-[13px] font-bold text-gray-900 mb-3">Team Members</h3>
              <div className="flex flex-col gap-2.5">
                {project.team.map(m => {
                  const initials = m.name.split(" ").map(n => n[0]).join("").slice(0, 2);
                  return (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">{initials}</div>
                      <div>
                        <div className="text-[12px] font-semibold text-gray-900">{m.name}</div>
                        <div className="text-[10px] text-gray-400">ID: {m.id} · {m.role}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reward Tiers */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-[13px] font-bold text-gray-900 mb-3">Reward Tiers</h3>
              <div className="flex flex-col gap-3">
                {project.tiers.map((t, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-extrabold text-gray-900">{t.amount}</span>
                      <span className="bg-brand text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">{t.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Approvals Page ──
export default function AdminApprovals() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [activeNav, setActiveNav] = useState("approvals");
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.creator.toLowerCase().includes(search.toLowerCase())
  );

  const handleApprove = (id) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: "Approved" } : p));
    setReviewTarget(null);
  };

  const handleRequestChanges = (id, feedback) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: "Changes Requested", feedback } : p));
    setReviewTarget(null);
  };

  const handleLogout = () => {
    auth.logout();
    navigate("/");
  };

  const handleNavClick = (itemId) => {
    setActiveNav(itemId);

    if (itemId === "projects") {
      navigate("/admin-dashboard");
    }

    if (itemId === "users") {
      navigate("/admin-user-management");
    }
  };

  const pending   = projects.filter(p => p.status === "Pending Review").length;
  const approved  = projects.filter(p => p.status === "Approved").length;

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans relative overflow-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(true)} showSearch={false} onLogout={handleLogout} />

      <div className="flex flex-1 min-h-0 relative">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 min-[1200px]:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-14 bottom-0 left-0 z-40 w-48 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } min-[1200px]:relative min-[1200px]:top-0 min-[1200px]:translate-x-0`}
      >

        <nav className="flex-1 p-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                handleNavClick(item.id);
                setSidebarOpen(false);
                setReviewTarget(null);
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
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {reviewTarget ? (
          <ProjectReview
            project={reviewTarget}
            onBack={() => setReviewTarget(null)}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
          />
        ) : (
          <main className="flex-1 p-4 md:p-9 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[28px] font-extrabold text-gray-900 mb-1">Project Approvals</h1>
            <p className="text-[14px] text-gray-400">Review and validate student project submissions for the upcoming funding cycle.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5 lp-stagger">
            {[
              { label: "Pending Review",    value: pending,  sub: `↑ 12%`, subColor: "text-green-500" },
              { label: "Approved (MoM)",    value: approved + 142, sub: null },
            ].map(c => (
              <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-[11px] font-semibold text-gray-400 mb-2">{c.label}</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-[32px] font-extrabold text-gray-900">{c.value}</div>
                  {c.sub && <span className={`text-[12px] font-semibold ${c.subColor}`}>{c.sub}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-2 w-full sm:w-72 mb-5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter projects..."
              className="bg-transparent border-none outline-none text-[13px] text-gray-700 w-full placeholder-gray-300"
            />
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="min-w-[800px] w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Project Title", "Student Creator", "Department", "Submission Date", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-bold text-gray-400 tracking-wide text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="lp-stagger">
                {filtered.length > 0 ? filtered.map((p, i) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${i < filtered.length - 1 ? "border-b border-gray-100" : ""}`}>
                    {/* Title */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img src={p.img} alt={p.title} className="w-10 h-10 rounded-md object-cover shrink-0" />
                        <div className="text-[13px] font-bold text-gray-900 leading-snug">{p.title}</div>
                      </div>
                    </td>
                    {/* Creator */}
                    <td className="px-5 py-3.5">
                      <div className="text-[13px] font-semibold text-gray-900">{p.creator}</div>
                      <div className="text-[11px] text-gray-400">{p.email}</div>
                    </td>
                    {/* Dept */}
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm ${DEPT_STYLE[p.dept] || "bg-gray-200 text-gray-600"}`}>{p.dept}</span>
                    </td>
                    {/* Date */}
                    <td className="px-5 py-3.5 text-[13px] text-gray-500">{p.submitted}</td>
                    {/* Status */}
                    <td className="px-5 py-3.5">
                      {p.status === "Approved" ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap bg-green-50 text-green-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-200">● APPROVED</span>
                      ) : p.status === "Changes Requested" ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap bg-yellow-50 text-yellow-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-yellow-200">● CHANGES REQUESTED</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap bg-red-50 text-red-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-200">● PENDING REVIEW</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setReviewTarget(p)}
                          className="bg-white border border-gray-200 text-gray-600 rounded-md px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          REVIEW
                        </button>
                        {p.status !== "Approved" && (
                          <button
                            onClick={() => handleApprove(p.id)}
                            className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-3 py-1.5 text-[12px] font-bold cursor-pointer transition-colors"
                          >
                            APPROVE
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-[13px] text-gray-400">No projects found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-5 py-3.5 flex justify-between items-center border-t border-gray-100">
              <span className="text-[12px] text-gray-400">Showing 1-{filtered.length} of {projects.length} projects</span>
              <button className="bg-white border border-gray-200 rounded px-2 py-1 text-gray-400 cursor-pointer hover:bg-gray-50 text-sm">›</button>
            </div>
          </div>
          </main>
        )}
      </div>
      </div>
    </div>
  );
}