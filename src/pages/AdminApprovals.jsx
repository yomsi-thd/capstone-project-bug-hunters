import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import { initials } from "../components/ui/initials";
import * as adminApi from "../api/adminApi";
import * as projectApi from "../api/projectApi";
import { toApprovalProject, toCreatorRequest, toTier } from "../api/mappers";
import SupportLevels from "../components/project/SupportLevels";
import {
  ADMIN_APPROVAL_DEPT_STYLE as DEPT_STYLE,
  ADMIN_NAV_ITEMS as NAV_ITEMS,
} from "../mock";

// ── Project Review Page ──
function ProjectReview({ project, onBack, onApprove, onReject }) {
  const [feedback, setFeedback] = useState("");

  // Loaded here rather than carried on the queue row: GET /admin/projects does not join
  // the levels (they are per-project detail, not queue data), and an admin deciding
  // whether to approve a project should be able to see what its backers will be offered.
  // A failure must not take the review screen down with it - the verdict buttons work
  // without this panel.
  const [levels, setLevels] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await projectApi.getProjectTiers(project.id);
        if (!cancelled) setLevels((rows || []).map(toTier));
      } catch {
        if (!cancelled) setLevels([]);
      }
    })();
    return () => { cancelled = true; };
  }, [project.id]);

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
            {/* Gallery. A submission may have no images at all — falling straight to
                project.gallery[0] is what used to crash this whole screen. Show the
                cover image, then the gallery, then a placeholder. */}
            <div className="rounded-xl overflow-hidden mb-3 relative bg-gray-100" style={{ height: "220px" }}>
              {(project.gallery?.[0] || project.img) ? (
                <img src={project.gallery?.[0] || project.img} alt={project.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-400">
                  No images submitted
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(project.gallery || []).slice(1).map((img, i) => (
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
                  {/* Was "REQUEST CHANGES" while the list row called the identical
                      action "REJECT" (2026-08-18: settled on REJECT). Both call
                      rejectProject and both land on status = REJECTED; the schema is
                      CHECK (status IN ('PENDING','APPROVED','REJECTED')) with no
                      CHANGES_REQUESTED, so the softer wording described a state that
                      does not exist. The note below says what actually happens. */}
                  <button
                    onClick={() => onReject(project.id, feedback)}
                    className="bg-white border border-gray-300 text-gray-600 rounded-md px-5 py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    ✕ REJECT PROJECT
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 max-w-[230px] text-right leading-relaxed">
                  Approving publishes the project to Discover. Rejecting sends it back to
                  the creator with your feedback — they can revise it and resubmit.
                </p>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="flex flex-col gap-4">
            {/* Team Members */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-[13px] font-bold text-gray-900 mb-3">Team Members</h3>
              <div className="flex flex-col gap-2.5">
                {(project.team || []).length === 0 && (
                  <div className="text-[11px] text-gray-400">No team members listed.</div>
                )}
                {(project.team || []).map((m, idx) => {
                  // team_members is free-form jsonb — a row may hold a bare string, or an
                  // object with no name at all. Neither must take the screen down.
                  const name = (typeof m === "string" ? m : m?.name) || "Unnamed member";
                  const initialsText = initials(name);
                  return (
                    <div key={m?.id ?? idx} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">{initialsText}</div>
                      <div>
                        <div className="text-[12px] font-semibold text-gray-900">{name}</div>
                        <div className="text-[10px] text-gray-400">
                          {[m?.rmitId && `ID: ${m.rmitId}`, m?.role].filter(Boolean).join(" · ") || "No role given"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Support Levels. The same component the project page renders, so what the
                admin approves is exactly what a backer will see. */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-[13px] font-bold text-gray-900 mb-3">Support Levels</h3>
              <SupportLevels
                levels={levels}
                compact
                emptyMessage="This creator has not set any levels. Backers can still invest any amount."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Approvals Page ──
// The two things an admin approves. Projects came first; creator requests are the other
// half of the "Creator" checkbox on Register — approving one is now the ONLY way a user
// gets the CREATOR role, since createProject stopped granting it automatically.
const QUEUES = [
  { id: "projects", label: "Project Submissions" },
  { id: "creators", label: "Creator Requests" },
];

export default function AdminApprovals() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("approvals");
  const [queue, setQueue] = useState("projects");
  const [projects, setProjects] = useState([]);
  const [creatorRequests, setCreatorRequests] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // GET /api/admin/projects then filter to PENDING — there is no dedicated route for
  // the approval queue. TODO: ask for a ?status=PENDING filter.
  // Archived projects are excluded: that route returns them too, and a PENDING project
  // that has since been archived would otherwise sit here waiting for a verdict the
  // backend now refuses, so APPROVE would just throw a 400 and look broken.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await adminApi.getAllProject();
        if (!cancelled) {
          setProjects(
            (rows || [])
              .filter(r => r.status === "PENDING" && r.archived_at == null)
              .map(toApprovalProject)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.message || err.message || "Could not load the approval queue");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // GET /api/admin/creator-requests already returns only PENDING rows.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await adminApi.getAllCreatorRequests();
        if (!cancelled) setCreatorRequests((rows || []).map(toCreatorRequest));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.message || err.message || "Could not load creator requests");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const term = search.toLowerCase();

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(term) ||
    p.creator.toLowerCase().includes(term)
  );

  const filteredRequests = creatorRequests.filter(r =>
    r.name.toLowerCase().includes(term) || r.email.toLowerCase().includes(term)
  );

  // Approving grants the CREATOR role inside a DB transaction on the backend; the row is
  // kept in the list with its new status so the admin can see what they just did.
  const handleCreatorDecision = async (id, decision) => {
    setActionError(null);
    try {
      if (decision === "approve") await adminApi.approveCreatorRequest(id);
      else await adminApi.rejectCreatorRequest(id);
      setCreatorRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: decision === "approve" ? "APPROVED" : "REJECTED" } : r)
      );
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Could not update this request");
    }
  };

  const handleApprove = async (id) => {
    setActionError(null);
    try {
      await projectApi.approveProject(id);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: "Approved" } : p));
      setReviewTarget(null);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Could not approve this project");
    }
  };

  // The feedback typed in the review screen is now stored: it goes to
  // projects.review_note and the creator reads it on their My Projects card. This box
  // existed long before the column did, and everything typed into it used to be dropped.
  const handleReject = async (id, feedback) => {
    setActionError(null);
    try {
      await projectApi.rejectProject(id, feedback);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: "Changes Requested", feedback } : p));
      setReviewTarget(null);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Could not reject this project");
    }
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
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans relative overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* The shared Header spans the full width, exactly as on the public pages.
          The sidebar and the content sit in a row underneath it. */}
      <Header showSearch={false} onToggleSidebar={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0">

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
      <div className="flex-1 flex flex-col min-w-0">

        {reviewTarget ? (
          <ProjectReview
            project={reviewTarget}
            onBack={() => setReviewTarget(null)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : (
          <main className="flex-1 p-4 md:p-9 overflow-y-auto">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-[28px] font-extrabold text-gray-900 mb-1">Approvals</h1>
            <p className="text-[14px] text-gray-400">
              {queue === "projects"
                ? "Review and validate student project submissions for the upcoming funding cycle."
                : "Students who asked for Creator access when they signed up. Approving one grants the CREATOR role."}
            </p>
          </div>

          {/* Queue switcher */}
          <div className="flex border-b-2 border-gray-200 mb-5 gap-0">
            {QUEUES.map(q => {
              const count = q.id === "projects"
                ? projects.filter(p => p.status === "Pending Review").length
                : creatorRequests.filter(r => r.status === "PENDING").length;
              return (
                <button
                  key={q.id}
                  onClick={() => { setQueue(q.id); setSearch(""); }}
                  className={`lp-navlink flex items-center gap-2 px-5 py-2.5 text-[14px] bg-transparent cursor-pointer -mb-0.5 ${queue === q.id ? "is-active font-bold" : ""}`}
                  style={{ "--nav-base": "#666" }}
                >
                  {q.label}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${queue === q.id ? "bg-brand text-white" : "bg-gray-200 text-gray-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {(loadError || actionError) && (
            <div className="bg-red-50 border border-red-200 text-[13px] text-brand rounded-lg px-4 py-3 mb-5">
              {loadError || actionError}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5 lp-stagger">
            {(queue === "projects"
              ? [
                  { label: "Pending Review", value: pending },
                  { label: "Approved (this session)", value: approved },
                ]
              : [
                  { label: "Pending Requests", value: creatorRequests.filter(r => r.status === "PENDING").length },
                  { label: "Granted (this session)", value: creatorRequests.filter(r => r.status === "APPROVED").length },
                ]
            ).map(c => (
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
              placeholder={queue === "projects" ? "Filter projects..." : "Filter by name or email..."}
              className="bg-transparent border-none outline-none text-[13px] text-gray-700 w-full placeholder-gray-300"
            />
          </div>

          {/* Creator requests queue */}
          {queue === "creators" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
              <table className="min-w-[700px] w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Student", "Requested Role", "Requested On", "Status", "Actions"].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold text-gray-400 tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="lp-stagger">
                  {filteredRequests.length > 0 ? filteredRequests.map((r, i) => (
                    <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${i < filteredRequests.length - 1 ? "border-b border-gray-100" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-[12px] font-bold shrink-0">
                            {initials(r.name, { max: 1 })}
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-gray-900 leading-snug">{r.name}</div>
                            <div className="text-[11px] text-gray-400">{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-red-50 text-brand border border-red-200 text-[10px] font-bold px-2.5 py-1 rounded-sm">{r.role}</span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500">{r.requestedOn}</td>
                      <td className="px-5 py-3.5">
                        {r.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap bg-green-50 text-green-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-200">● GRANTED</span>
                        ) : r.status === "REJECTED" ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap bg-gray-100 text-gray-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200">● DECLINED</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap bg-red-50 text-red-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-200">● PENDING</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {r.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCreatorDecision(r.id, "reject")}
                              className="bg-white border border-gray-200 text-gray-600 rounded-md px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              DECLINE
                            </button>
                            <button
                              onClick={() => handleCreatorDecision(r.id, "approve")}
                              className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-3 py-1.5 text-[12px] font-bold cursor-pointer transition-colors"
                            >
                              GRANT CREATOR
                            </button>
                          </div>
                        ) : (
                          <span className="text-[12px] text-gray-300">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-gray-400">
                        {creatorRequests.length === 0
                          ? "No creator requests waiting. One appears here when a student ticks “Creator” while signing up."
                          : "No requests match that filter."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Project submissions queue */}
          {queue === "projects" && (
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
                    {/* Actions. Both decisions are available straight from the row —
                        APPROVE was here on its own, so rejecting meant opening REVIEW
                        first and looked like a missing feature. REVIEW is still the way
                        to read the submission before deciding. */}
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setReviewTarget(p)}
                          className="bg-white border border-gray-200 text-gray-600 rounded-md px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          REVIEW
                        </button>
                        {/* Each button hides only once its own decision has been made, so
                            a mis-click is recoverable: a rejected project can still be
                            approved from here. Once the page reloads the queue only
                            fetches PENDING, and there would be no way back. */}
                        {/* Quick reject, deliberately with no note — for obvious spam.
                            To tell the creator WHY, open REVIEW and use the feedback box
                            there; that text is stored on the project now. */}
                        {p.status !== "Changes Requested" && (
                          <button
                            onClick={() => handleReject(p.id, "")}
                            title="Reject without feedback — use REVIEW to explain why"
                            className="bg-white border border-gray-300 text-gray-600 rounded-md px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:bg-red-50 hover:text-brand hover:border-red-200 transition-colors"
                          >
                            REJECT
                          </button>
                        )}
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
          )}
          </main>
        )}
      </div>
      </div>
    </div>
  );
}