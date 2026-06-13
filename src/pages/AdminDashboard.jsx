import { useState } from "react";
import {
  ADMIN_PROJECTS as PROJECTS,
  ADMIN_STATUS_STYLE as STATUS_STYLE,
  ADMIN_CAT_STYLE as CAT_STYLE,
  ADMIN_NAV_ITEMS as NAV_ITEMS,
} from "../mock";

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("projects");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const filtered = PROJECTS.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.creator.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All Statuses" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* ── Sidebar ── */}
      <aside className="w-48 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white font-extrabold text-base shrink-0">R</div>
          <div>
            <div className="text-[11px] font-extrabold text-gray-900">ADMIN PORTAL</div>
            <div className="text-[10px] text-gray-400">Academic Oversight</div>
          </div>
        </div>
        <nav className="flex-1 p-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
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

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-9 shrink-0">
          <div className="text-base font-extrabold text-brand">RMIT Launchpad Admin</div>
          <div className="flex items-center gap-5">
            {["Dashboard", "Reports"].map(l => (
              <button key={l} className="bg-transparent border-none text-[13px] text-gray-500 font-medium cursor-pointer hover:text-gray-900">{l}</button>
            ))}
            <span className="text-lg cursor-pointer text-gray-400 hover:text-gray-600">🔔</span>
            <span className="text-lg cursor-pointer text-gray-400 hover:text-gray-600">⚙</span>
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-[12px] font-bold cursor-pointer">A</div>
          </div>
        </header>

        <main className="flex-1 p-9 overflow-y-auto">
          <h1 className="text-[28px] font-extrabold text-gray-900 mb-1">Project Management</h1>
          <p className="text-[14px] text-gray-400 mb-7">Oversee and manage all academic crowdfunding initiatives.</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-7">
            {[
              { label: "Total Projects",    value: "142", icon: "▦",  accent: false },
              { label: "Pending Approvals", value: "18",  icon: "📋", accent: false },
              { label: "Flagged Content",   value: "3",   icon: "🚩", accent: true  },
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
          <div className="bg-white border border-gray-200 rounded-t-xl px-5 py-4 flex gap-3 items-center">
            <div className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2 flex-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects by name or creator..." className="bg-transparent border-none outline-none text-[13px] text-gray-700 w-full placeholder-gray-300" />
            </div>
            <select className="border border-gray-200 rounded-md px-3 py-2 text-[13px] text-gray-500 bg-white outline-none">
              <option>All Schools</option>
              <option>School of Engineering</option>
              <option>School of Design</option>
              <option>School of Business</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-[13px] text-gray-500 bg-white outline-none">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Flagged</option>
            </select>
            <button className="bg-white border border-gray-200 rounded-md px-3.5 py-2 text-[12px] font-semibold text-gray-500 cursor-pointer whitespace-nowrap hover:bg-gray-50 transition-colors">⊞ More Filters</button>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  {["PROJECT DETAIL", "CREATOR", "STATUS", "FUNDING PROGRESS", "ACTIONS"].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-bold text-gray-400 tracking-widest text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const s = STATUS_STYLE[p.status];
                  const cc = CAT_STYLE[p.category] || "bg-gray-100 text-gray-600";
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${i < filtered.length - 1 ? "border-b border-gray-50" : ""}`}>
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
                          <button className="bg-white border border-gray-200 rounded px-2 py-1 cursor-pointer text-sm hover:bg-gray-50 transition-colors">🗑</button>
                          <button className="bg-white border border-gray-200 rounded px-2 py-1 cursor-pointer text-sm hover:bg-gray-50 transition-colors">⋮</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3.5 flex justify-between items-center border-t border-gray-50">
              <span className="text-[12px] text-gray-400">Showing 1–{filtered.length} of 142 projects</span>
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
  );
}