import { useState } from "react";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Story & Media" },
  { id: 3, label: "Team Members" },
  { id: 4, label: "Funding Goals" },
  { id: 5, label: "Review & Submit" },
];

const SCHOOLS = ["School of Engineering", "School of Design", "School of Business", "School of Science", "School of Computing"];

const MOCK_TEAM = [
  { id: 1, name: "Dr. Alexander Vance", role: "Lead Researcher",  rmitId: "a847291" },
  { id: 2, name: "Chloe Chen",          role: "Student Developer", rmitId: "s3984021" },
];

const ROLE_BADGE = {
  "Lead Researcher":   "bg-blue-100 text-blue-700",
  "Student Developer": "bg-green-100 text-green-700",
  "Co-Investigator":   "bg-purple-100 text-purple-700",
  "Industry Advisor":  "bg-orange-100 text-orange-700",
};

function StepIndicator({ steps, current }) {
  return (
    <div className="flex flex-col">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-start gap-3 relative" style={{ paddingBottom: i < steps.length - 1 ? "24px" : 0 }}>
          {i < steps.length - 1 && (
            <div className="absolute left-[11px] top-6 w-0.5 h-6" style={{ background: s.id < current ? "#cc0000" : "#e5e7eb" }} />
          )}
          <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
            s.id < current  ? "bg-brand border-brand text-white" :
            s.id === current ? "bg-white border-brand text-brand" :
                               "bg-white border-gray-200 text-gray-300"
          }`}>
            {s.id < current ? "✓" : s.id}
          </div>
          <div className="pt-0.5">
            <div className="text-[10px] text-gray-300 font-bold tracking-widest">STEP {s.id}</div>
            <div className={`text-[13px] ${s.id === current ? "font-bold text-gray-900" : s.id < current ? "font-medium text-brand" : "font-normal text-gray-300"}`}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Step1({ data, setData }) {
  return (
    <div>
      <h1 className="text-[32px] font-extrabold text-gray-900 mb-2">Basic Information</h1>
      <p className="text-[14px] text-gray-500 mb-7 leading-relaxed">Establish the core identity of your initiative. These details help potential backers understand the academic context and primary goal of your project.</p>
      <div className="flex flex-col gap-5">
        <div>
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">PROJECT TITLE</label>
          <input value={data.title} onChange={e => setData({ ...data, title: e.target.value })} placeholder="e.g., Sustainable Urban Micro-Grids" className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[14px] outline-none focus:border-brand transition-colors" />
          <p className="text-[11px] text-gray-300 mt-1">Keep it concise and impactful. Maximum 60 characters.</p>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">SCHOOL / DEPARTMENT</label>
          <select value={data.school} onChange={e => setData({ ...data, school: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[14px] outline-none focus:border-brand bg-white transition-colors">
            <option value="">Select your primary academic affiliation...</option>
            {SCHOOLS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">FUNDING GOAL (AUD)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
            <input value={data.goal} onChange={e => setData({ ...data, goal: e.target.value })} placeholder="15,000" className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-2.5 text-[14px] outline-none focus:border-brand transition-colors" />
          </div>
          <p className="text-[11px] text-gray-300 mt-1">Minimum target is $500. This must cover your core research or prototyping costs.</p>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">VALUE PROPOSITION</label>
          <textarea value={data.proposition} onChange={e => setData({ ...data, proposition: e.target.value })} placeholder="Briefly describe the problem you are solving, your proposed solution, and the anticipated academic or societal impact..." className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[14px] outline-none focus:border-brand min-h-[100px] resize-y transition-colors leading-relaxed" />
        </div>
      </div>
    </div>
  );
}

function Step2() {
  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Media Uploads</h2>
      <p className="text-[13px] text-gray-400 mb-6">Upload high-quality visual assets to showcase your project.</p>
      <div className="flex flex-col gap-7">
        <div>
          <div className="text-[14px] font-bold text-gray-900 mb-1">Cover Image</div>
          <p className="text-[12px] text-gray-400 mb-2.5">Minimum resolution: 1920×1080px (16:9 ratio). Max size: 5MB.</p>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 text-center cursor-pointer hover:border-brand transition-colors">
            <div className="text-3xl text-gray-200 mb-2">⬆</div>
            <div className="text-[13px] text-brand font-semibold">Upload a file</div>
            <div className="text-[12px] text-gray-400">or drag and drop</div>
            <div className="text-[11px] text-gray-300 mt-1">PNG, JPG, WEBP UP TO 5MB</div>
          </div>
        </div>
        <div>
          <div className="text-[14px] font-bold text-gray-900 mb-1">Project Video</div>
          <p className="text-[12px] text-gray-400 mb-3">Provide a YouTube/Vimeo URL or upload directly.</p>
          <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">Video URL (Recommended)</label>
          <input placeholder="https://youtube.com/watch?v=..." className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors mb-2" />
          <div className="text-center text-[12px] text-gray-300 my-2">OR UPLOAD</div>
          <div className="flex items-center gap-3">
            <button className="bg-white border border-brand text-brand rounded-md px-3 py-1.5 text-[12px] font-bold cursor-pointer hover:bg-red-50 transition-colors">↑ SELECT VIDEO FILE</button>
            <span className="text-[11px] text-gray-300">MP4, MOV UP TO 50MB</span>
          </div>
        </div>
        <div>
          <div className="text-[14px] font-bold text-gray-900 mb-1">Prototype Gallery</div>
          <p className="text-[12px] text-gray-400 mb-3">Upload up to 6 additional photos.</p>
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2].map(i => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-900">
                <img src={`https://images.unsplash.com/photo-156504${3660 + i * 1000}-4636190af475?w=200&q=70`} alt="" className="w-full h-full object-cover opacity-85" />
              </div>
            ))}
            <div className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand transition-colors gap-1">
              <span className="text-xl text-gray-300">+</span>
              <span className="text-[11px] text-gray-300">ADD PHOTO</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-300 mt-2">2 of 6 photos uploaded.</p>
        </div>
      </div>
    </div>
  );
}

function Step3({ team, setTeam }) {
  const [newMember, setNewMember] = useState({ name: "", role: "", rmitId: "" });
  const [inviteEmail, setInviteEmail] = useState("");

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Build Your Team</h2>
      <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">Add the core researchers, academic staff, and student developers driving this initiative.</p>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="text-[13px] font-bold text-gray-900 mb-3">Add a Member</div>
        <div className="grid gap-2.5 mb-0" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
          <div>
            <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">FULL NAME</label>
            <input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="e.g., Dr. Jane Smith" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">PROJECT ROLE</label>
            <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none bg-white focus:border-brand transition-colors">
              <option value="">Select a role...</option>
              {Object.keys(ROLE_BADGE).map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">RMIT ID</label>
            <input value={newMember.rmitId} onChange={e => setNewMember({ ...newMember, rmitId: e.target.value })} placeholder="e.g. s123456" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
          </div>
          <button onClick={() => { if (newMember.name && newMember.role) { setTeam([...team, { ...newMember, id: Date.now() }]); setNewMember({ name: "", role: "", rmitId: "" }); }}} className="w-9 h-9 bg-brand hover:bg-red-800 text-white border-none rounded-md text-lg cursor-pointer flex items-center justify-center transition-colors self-end">+</button>
        </div>
      </div>
      {team.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-3">CURRENT TEAM ({team.length})</div>
          {team.map(m => (
            <div key={m.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-bold text-gray-900">{m.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${ROLE_BADGE[m.role] || "bg-gray-100 text-gray-600"}`}>{m.role}</span>
                </div>
                <div className="text-[11px] text-gray-400">RMIT ID: {m.rmitId || "—"}</div>
              </div>
              <div className="flex gap-1.5">
                <button className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-600 text-sm">✎</button>
                <button onClick={() => setTeam(team.filter(t => t.id !== m.id))} className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-brand text-sm">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
        <div className="text-[13px] font-bold text-gray-900 mb-1">✉ Invite External Collaborators</div>
        <p className="text-[12px] text-gray-400 mb-2.5">Send an email invitation to industry partners or non-RMIT contributors.</p>
        <div className="flex gap-2.5">
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Enter email address" className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
          <button className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-2 text-[12px] font-bold cursor-pointer transition-colors whitespace-nowrap">SEND INVITE</button>
        </div>
      </div>
    </div>
  );
}

function Step4({ tiers, setTiers }) {
  const [newTier, setNewTier] = useState({ name: "", amount: "", privileges: [""] });

  const updatePrivilege = (i, val) => { const u = [...newTier.privileges]; u[i] = val; setNewTier({ ...newTier, privileges: u }); };
  const saveTier = () => { if (newTier.name && newTier.amount) { setTiers([...tiers, { ...newTier, id: Date.now() }]); setNewTier({ name: "", amount: "", privileges: [""] }); }};

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Reward Tiers <span className="font-normal text-gray-400">(Optional)</span></h2>
      <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">Define structured backing tiers using Class Coins (CC).</p>
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-[14px] font-bold text-gray-900 mb-4">Create New Tier</div>
          <div className="mb-3.5">
            <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">TIER NAME</label>
            <input value={newTier.name} onChange={e => setNewTier({ ...newTier, name: e.target.value })} placeholder="e.g., VIP Lab Access" className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors" />
          </div>
          <div className="mb-3.5">
            <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">MINIMUM CONTRIBUTION (CC)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">CC</span>
              <input value={newTier.amount} onChange={e => setNewTier({ ...newTier, amount: e.target.value })} placeholder="100" className="w-full border border-gray-200 rounded-md pl-10 pr-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">PRIVILEGES / REWARDS INCLUDED</label>
            {newTier.privileges.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <span className="text-brand text-sm">✓</span>
                <input value={p} onChange={e => updatePrivilege(i, e.target.value)} placeholder={i === 0 ? "Early access to alpha testing" : "Add a privilege..."} className="flex-1 border border-gray-200 rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-brand transition-colors" />
                {i > 0 && <button onClick={() => setNewTier({ ...newTier, privileges: newTier.privileges.filter((_, idx) => idx !== i) })} className="bg-transparent border-none cursor-pointer text-gray-300 hover:text-gray-500 text-base">×</button>}
              </div>
            ))}
            <button onClick={() => setNewTier({ ...newTier, privileges: [...newTier.privileges, ""] })} className="bg-transparent border-none text-[12px] text-brand font-bold cursor-pointer hover:underline">+ ADD ANOTHER PRIVILEGE</button>
          </div>
          <div className="flex justify-end gap-2.5">
            <button onClick={() => setNewTier({ name: "", amount: "", privileges: [""] })} className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[12px] text-gray-600 cursor-pointer hover:bg-gray-50">CLEAR</button>
            <button onClick={saveTier} className="bg-[#1a1a5c] hover:bg-blue-900 text-white border-none rounded-md px-5 py-2 text-[12px] font-bold cursor-pointer transition-colors">SAVE TIER</button>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-3">PROJECT PAGE PREVIEW</div>
          {tiers.length > 0 ? tiers.map((t, i) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-2.5">
              <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-1">TIER {i + 1}</div>
              <div className="text-lg font-extrabold text-gray-900 mb-1">{t.name}</div>
              <div className="text-[22px] font-extrabold text-gray-900 mb-2.5">{t.amount} CC <span className="text-[13px] font-normal text-gray-400">or more</span></div>
              {t.privileges.filter(Boolean).map((p, pi) => (
                <div key={pi} className="flex gap-2 text-[12px] text-gray-600 mb-1"><span className="text-brand">✓</span>{p}</div>
              ))}
              <button className="mt-3 w-full bg-brand hover:bg-red-800 text-white border-none rounded-md py-2 text-[12px] font-bold cursor-pointer transition-colors">BACK THIS PROJECT</button>
            </div>
          )) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-7 text-center">
              <div className="text-[12px] text-gray-300">NEW TIER PREVIEW WILL APPEAR HERE</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateProject() {
  const [step, setStep] = useState(1);
  const [basicData, setBasicData] = useState({ title: "", school: "", goal: "", proposition: "" });
  const [team, setTeam] = useState(MOCK_TEAM);
  const [tiers, setTiers] = useState([
    { id: 1, name: "Digital Supporter", amount: "25", privileges: ["Name listed on digital contributor wall.", "Weekly email updates."] }
  ]);
  const navigate = useNavigate();

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1 data={basicData} setData={setBasicData} />;
      case 2: return <Step2 />;
      case 3: return <Step3 team={team} setTeam={setTeam} />;
      case 4: return <Step4 tiers={tiers} setTiers={setTiers} />;
      default: return <div className="text-gray-400 text-sm">Step {step} — coming soon.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      <header className="bg-white border-b border-gray-200 h-13 flex items-center justify-between px-10">
        <div className="text-[15px] font-extrabold text-brand tracking-widest py-3">RMIT LAUNCHPAD</div>
        <button onClick={() => navigate("/creator-dashboard")} className="bg-transparent border-none text-[13px] text-gray-400 cursor-pointer hover:text-gray-600">× CANCEL</button>
      </header>
      <div className="max-w-4xl mx-auto px-6 py-10 grid gap-12" style={{ gridTemplateColumns: "200px 1fr" }}>
        <div>
          <div className="text-[14px] font-bold text-gray-900 mb-1">Create Project</div>
          <div className="text-[12px] text-gray-400 mb-6">Submit your proposal for review.</div>
          <StepIndicator steps={STEPS} current={step} />
        </div>
        <div>
          {renderStep()}
          <div className="flex justify-between mt-9 pt-5 border-t border-gray-100">
            <button className="bg-white border border-gray-200 rounded-md px-6 py-2.5 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors">
              {step === STEPS.length ? "← BACK" : "SAVE DRAFT"}
            </button>
            <div className="flex gap-2.5">
              {step > 1 && step < STEPS.length && (
                <button onClick={() => setStep(s => s - 1)} className="bg-white border border-gray-200 rounded-md px-5 py-2.5 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors">← Back</button>
              )}
              {step < STEPS.length ? (
                <button onClick={() => setStep(s => Math.min(STEPS.length, s + 1))} className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-7 py-2.5 text-[13px] font-bold cursor-pointer transition-colors">NEXT STEP →</button>
              ) : (
                <button className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-7 py-2.5 text-[13px] font-bold cursor-pointer transition-colors">SUBMIT PROJECT FOR APPROVAL ▶</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}