import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EditProject from "./EditProject";
import {
  CREATOR_DISCUSSIONS as DISCUSSIONS,
  CREATOR_TIERS as TIERS,
  RECENT_BACKERS,
  CREATOR_SIDEBAR_LINKS as SIDEBAR_LINKS,
} from "../mock";

export default function CreatorDashboard() {
  const [active, setActive] = useState("dashboard");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSidebarClick = (id) => {
    setActive(id);
    if (id === "edit") setShowEditProject(true);
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans relative overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-48 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <span className="text-[13px] font-extrabold tracking-widest text-brand">RMIT LAUNCHPAD</span>
        </div>

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
          {["? Help Center", "→ Logout"].map(l => (
            <button key={l} className="w-full bg-transparent border-none text-left px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer">{l}</button>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-900 focus:outline-none text-xl cursor-pointer mr-3"
          >
            ☰
          </button>
          <span className="text-[13px] font-extrabold tracking-widest text-brand">RMIT LAUNCHPAD</span>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="mb-6">
            <h1 className="text-xl md:text-[22px] font-extrabold text-gray-900 m-0">Dashboard Overview</h1>
            <p className="text-[13px] text-gray-400 mt-1">Track your campaign's performance and manage your active projects.</p>
          </div>

          {/* Top stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            {/* Funding card */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex justify-between items-start mb-2">
                <div className="text-[11px] font-bold text-gray-400 tracking-widest">TOTAL FUNDS RAISED</div>
                <span className="bg-white border border-gray-200 rounded-full px-3 py-0.5 text-[11px] font-semibold text-green-600">Active Campaign</span>
              </div>
              <div className="text-3xl md:text-[36px] font-extrabold text-brand leading-none mb-1">
                $42,500 <span className="text-lg text-gray-400 font-normal">/ $50,000</span>
              </div>
              <p className="text-[12px] text-gray-400 mb-4">85% of your funding goal reached. 12 days remaining.</p>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Progress</span>
                <span className="text-brand font-bold">85%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: "85%" }} />
              </div>
            </div>

            {/* Stat cards */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[11px] font-bold text-gray-400 tracking-widest">TOTAL BACKERS</div>
                  <span className="text-gray-300 text-lg">👥</span>
                </div>
                <div className="text-[28px] font-extrabold text-gray-900">342</div>
                <div className="text-[12px] text-green-500 mt-0.5">↑ +12 this week</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[11px] font-bold text-gray-400 tracking-widest">PAGE VIEWS</div>
                  <span className="text-gray-300 text-lg">👁</span>
                </div>
                <div className="text-[28px] font-extrabold text-gray-900">12,450</div>
                <div className="text-[12px] text-gray-400 mt-0.5">Conversion rate 2.7%</div>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Discussions */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">Community Discussions</h3>
              <p className="text-[12px] text-gray-400 mb-4">Most active threads requiring your attention.</p>
              <div className="flex flex-col gap-3">
                {DISCUSSIONS.map((d, i) => (
                  <div key={d.id} className={`flex gap-2.5 ${i < DISCUSSIONS.length - 1 ? "pb-3 border-b border-gray-100" : ""}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ background: d.color }}>{d.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-brand mb-0.5 cursor-pointer hover:underline">{d.title}</div>
                      <div className="text-[11px] text-gray-500 truncate">{d.preview}</div>
                      <div className="text-[11px] text-gray-300 mt-1">{d.replies} Replies · {d.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-3 bg-transparent border-none text-[11px] font-bold text-brand tracking-wide cursor-pointer hover:underline">VIEW ALL DISCUSSIONS →</button>
            </div>

            {/* Backer Tiers */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">Backer Tiers</h3>
              <p className="text-[12px] text-gray-400 mb-4">Distribution of funds across defined reward levels.</p>
              <div className="flex flex-col gap-3.5">
                {TIERS.map(t => (
                  <div key={t.name}>
                    <div className="flex justify-between mb-1">
                      <div>
                        <span className="text-[13px] font-semibold text-gray-900">{t.name} </span>
                        <span className="text-[12px] text-gray-400">{t.price}</span>
                      </div>
                      <span className="text-[12px] text-gray-400">{t.backers} Backers</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: t.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-2">RECENT BACKERS</div>
                <div className="flex flex-wrap gap-2">
                  {RECENT_BACKERS.map(b => (
                    <span key={b} className="bg-gray-100 rounded-full px-3 py-1 text-[11px] text-gray-600 font-medium">{b}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Edit Project Modal ── */}
      {showEditProject && (
        <EditProject onClose={() => { setShowEditProject(false); setActive("dashboard"); }} />
      )}

      {/* ── Post Update Modal ── */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-[500px] p-6 relative shadow-2xl overflow-y-auto max-h-full">
            <button onClick={() => setShowUpdateModal(false)} className="absolute top-4 right-4 bg-transparent border-none text-xl text-gray-400 hover:text-gray-600 cursor-pointer">×</button>
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">Post Project Update</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[12px] text-blue-700 mb-4 leading-relaxed">
              ℹ Updates are emailed directly to your backers and posted publicly on your project page.
            </div>
            <div className="mb-3">
              <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">UPDATE TITLE</label>
              <input placeholder="e.g., Prototype Phase 1 Completed!" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
            </div>
            <div className="mb-3">
              <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">UPDATE CONTENT</label>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex gap-2">
                  {["B", "I", "≡", "⊞", "🔗"].map(t => (
                    <button key={t} className="bg-transparent border-none text-[13px] font-bold text-gray-500 px-1.5 py-0.5 hover:bg-gray-200 rounded cursor-pointer">{t}</button>
                  ))}
                </div>
                <textarea placeholder="Share the details of your progress..." className="w-full border-none outline-none px-3 py-2.5 text-[13px] min-h-[80px] resize-y" />
              </div>
            </div>
            <div className="mb-5">
              <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">MEDIA ATTACHMENTS</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-7 text-center cursor-pointer hover:border-brand transition-colors">
                <div className="text-2xl text-gray-300 mb-1.5">☁</div>
                <div className="text-[13px] font-semibold text-gray-600">Click to upload or drag and drop</div>
                <div className="text-[11px] text-gray-300 mt-1">SVG, PNG, JPG or GIF (max. 800×400px)</div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setShowUpdateModal(false)} className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50">CANCEL</button>
              <button className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-5 py-2 text-[13px] font-bold cursor-pointer transition-colors">POST UPDATE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}