import { useState } from "react";
import {
  EDIT_PROJECT_TABS as TABS,
  SCHOOLS,
  MOCK_TIERS,
  ROLE_BADGE,
  EDIT_PROJECT_INITIAL_DATA,
  EDIT_PROJECT_INITIAL_TEAM,
} from "../mock";
import * as projectApi from "../api/projectApi";

function TabBasicInfo({ data, setData }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">Project Title</label>
        <input value={data.title} onChange={e => setData({ ...data, title: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">School / Department</label>
          <select value={data.school} onChange={e => setData({ ...data, school: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none bg-white focus:border-brand transition-colors">
            {SCHOOLS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">Funding Goal (AUD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input value={data.goal} onChange={e => setData({ ...data, goal: e.target.value })} className="w-full border border-gray-200 rounded-md pl-6 pr-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors" />
          </div>
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">Value Proposition</label>
        <textarea value={data.proposition} onChange={e => setData({ ...data, proposition: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand min-h-[100px] resize-y transition-colors leading-relaxed" />
      </div>
    </div>
  );
}

function TabMedia() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-[12px] font-bold text-gray-600 block mb-2">Cover Image</label>
        <div className="relative rounded-lg overflow-hidden h-44 bg-gray-900">
          <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&q=80" alt="Cover" className="w-full h-full object-cover opacity-90" />
          <div className="absolute top-2 right-2 text-[10px] font-semibold text-white bg-black/50 rounded px-2 py-0.5">Recommended: 2048px (16:9)</div>
        </div>
        <button className="mt-2 bg-white border border-gray-200 rounded-md px-3 py-1.5 text-[12px] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors">Replace Image</button>
      </div>
      <div>
        <label className="text-[12px] font-bold text-gray-600 block mb-2">Project Video</label>
        <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1.5">VIDEO OR YOUTUBE URL</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input defaultValue="https://vimeo.com/20371781" className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors w-full" />
          <button className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2 text-[12px] font-bold cursor-pointer transition-colors w-full sm:w-auto">SAVE</button>
        </div>
      </div>
    </div>
  );
}

function TabTeam({ team, setTeam }) {
  const [newMember, setNewMember] = useState({ name: "", role: "" });

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px] font-bold text-gray-900">Current Team</div>
      <div className="flex flex-col gap-2">
        {team.map(m => {
          const initials = m.name.split(" ").map(n => n[0]).slice(0, 2).join("");
          return (
            <div key={m.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-lg border border-gray-100 gap-2 sm:gap-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">{initials}</div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold text-gray-900">{m.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${ROLE_BADGE[m.role] || "bg-gray-100 text-gray-600"}`}>{m.role}</span>
                  </div>
                  <div className="text-[11px] text-gray-400">RMIT ID: {m.rmitId || "—"}</div>
                </div>
              </div>
              <div className="flex gap-3 self-end sm:self-auto">
                <button className="bg-transparent border-none text-[12px] text-brand font-semibold cursor-pointer hover:underline">Edit</button>
                <button onClick={() => setTeam(team.filter(t => t.id !== m.id))} className="bg-transparent border-none text-[12px] text-brand font-semibold cursor-pointer hover:underline">Remove</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-100 pt-4">
        <div className="text-[13px] font-bold text-gray-900 mb-2.5">Add a Member</div>
        <div className="flex flex-col gap-2">
          <input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Enter member name" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
          <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none bg-white focus:border-brand transition-colors">
            <option value="">Select a role...</option>
            <option>Lead Researcher</option>
            <option>Student Developer</option>
            <option>Co-Investigator</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function TabTiers({ tiers, setTiers }) {
  const [showNew, setShowNew] = useState(false);
  const [newTier, setNewTier] = useState({ name: "", amount: "", desc: "" });

  const saveTier = () => {
    if (newTier.name && newTier.amount) {
      setTiers([...tiers, { ...newTier, id: Date.now() }]);
      setNewTier({ name: "", amount: "", desc: "" });
      setShowNew(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-extrabold text-gray-900 mb-1">Edit Reward Tiers</h3>
      <p className="text-[13px] text-gray-400 mb-4">Configure the tiers and incentives for university-backed research crowdfunding.</p>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[13px] font-bold text-gray-900">Existing Tiers</span>
        <span className="text-[11px] text-gray-400 font-semibold">{tiers.length} ACTIVE TIERS</span>
      </div>
      <div className="flex flex-col gap-2.5 mb-4">
        {tiers.map(t => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-3.5 flex gap-3.5">
            <div className="w-10 h-10 border border-gray-200 rounded-md flex items-center justify-center text-lg shrink-0">🏷</div>
            <div className="flex-1">
              <div className="flex justify-between">
                <div>
                  <div className="text-[14px] font-bold text-gray-900">{t.name}</div>
                  <div className="text-[11px] font-bold text-brand tracking-wide mb-1">MINIMUM CONTRIBUTION: {t.amount} CC</div>
                  <div className="text-[12px] text-gray-500 leading-relaxed">{t.desc}</div>
                </div>
                <div className="flex gap-2 ml-3 shrink-0">
                  <button className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-600 text-sm">✎</button>
                  <button onClick={() => setTiers(tiers.filter(t2 => t2.id !== t.id))} className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-brand text-sm">🗑</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div onClick={() => !showNew && setShowNew(true)} className={`border-2 border-dashed border-gray-200 rounded-lg ${showNew ? "p-4" : "p-3.5 cursor-pointer hover:border-brand transition-colors"}`}>
        {!showNew ? (
          <div className="flex items-center gap-2 text-gray-400 text-[13px] font-semibold">
            <span className="text-lg">⊕</span> Create New Tier
          </div>
        ) : (
          <div>
            <div className="text-[13px] font-bold text-gray-900 mb-3">New Tier</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">TIER NAME</label>
                <input value={newTier.name} onChange={e => setNewTier({ ...newTier, name: e.target.value })} placeholder="e.g., Gold Supporter" className="w-full border border-gray-200 rounded-md px-2.5 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">MINIMUM (CC)</label>
                <input value={newTier.amount} onChange={e => setNewTier({ ...newTier, amount: e.target.value })} placeholder="e.g., 250" className="w-full border border-gray-200 rounded-md px-2.5 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
              </div>
            </div>
            <div className="mb-2.5">
              <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">DESCRIPTION</label>
              <textarea value={newTier.desc} onChange={e => setNewTier({ ...newTier, desc: e.target.value })} placeholder="Describe the rewards..." className="w-full border border-gray-200 rounded-md px-2.5 py-2 text-[13px] outline-none min-h-[56px] resize-y focus:border-brand transition-colors" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="bg-white border border-gray-200 rounded-md px-4 py-1.5 text-[12px] text-gray-600 cursor-pointer hover:bg-gray-50">Cancel</button>
              <button onClick={saveTier} className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-1.5 text-[12px] font-bold cursor-pointer transition-colors">Save Tier</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditProject({ project, onClose }) {
  const [activeTab, setActiveTab] = useState("basic");

  // If a `project` is passed in (e.g. clicked from My Projects), prefill from it.
  // Otherwise fall back to the static mock defaults so the modal still works standalone.
  const [basicData, setBasicData] = useState(() =>
    project
      ? {
          title: project.title || EDIT_PROJECT_INITIAL_DATA.title,
          school: project.dept ? `School of ${project.dept}` : EDIT_PROJECT_INITIAL_DATA.school,
          goal: project.goal ? String(project.goal).replace(/[$,]/g, "") : EDIT_PROJECT_INITIAL_DATA.goal,
          // description comes from the API (projects.description).
          proposition: project.description || project.proposition || EDIT_PROJECT_INITIAL_DATA.proposition,
        }
      : EDIT_PROJECT_INITIAL_DATA
  );
  const [team, setTeam] = useState(project?.team || EDIT_PROJECT_INITIAL_TEAM);
  const [tiers, setTiers] = useState(project?.tiers || MOCK_TIERS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // PUT /api/projects/:id — the backend only accepts title, description, category,
  // goal_amount, image_url, team_members. The Media and Tiers tabs have nowhere to save.
  const handleSave = async () => {
    if (!project?.id) {
      setSaveError("This modal was opened without a project, so there is nothing to save.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await projectApi.updateProject(project.id, {
        title: basicData.title.trim(),
        description: basicData.proposition.trim(),
        category: project.category ?? basicData.school,
        goal_amount: Number(String(basicData.goal).replace(/[^0-9.]/g, "")) || 0,
        image_url: project.img || "",
        team_members: team,
      });
      onClose?.();
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "basic": return <TabBasicInfo data={basicData} setData={setBasicData} />;
      case "media": return <TabMedia />;
      case "team":  return <TabTeam team={team} setTeam={setTeam} />;
      case "tiers": return <TabTiers tiers={tiers} setTiers={setTiers} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 font-sans p-4">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col w-full max-w-[660px]" style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <div className="text-[10px] font-bold text-gray-300 tracking-widest mb-0.5">CURRENT PROJECT</div>
            <div className="text-[15px] font-extrabold text-gray-900">{basicData.title}</div>
          </div>
          <button onClick={onClose} className="bg-transparent border-none text-xl text-gray-400 hover:text-gray-600 cursor-pointer leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-[12px] font-semibold cursor-pointer bg-transparent border-t-0 border-l-0 border-r-0 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-b-2 border-brand text-brand"
                  : "border-b-2 border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="text-sm">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{renderTab()}</div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex flex-col gap-2.5 shrink-0">
          {saveError && (
            <div className="text-[12px] text-brand bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {saveError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-end gap-2.5">
            <button onClick={onClose} className="bg-white border border-gray-200 rounded-md px-5 py-2.5 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto">CANCEL CHANGES</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand hover:bg-red-800 disabled:bg-gray-300 text-white border-none rounded-md px-5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors w-full sm:w-auto"
            >
              {saving ? "SAVING…" : "SAVE CHANGES"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}