import { useState, useEffect } from "react";
import Modal from "../components/ui/Modal";
import {
  EDIT_PROJECT_TABS as TABS,
  SCHOOLS,
  ROLE_BADGE,
  EDIT_PROJECT_INITIAL_DATA,
  EDIT_PROJECT_INITIAL_TEAM,
} from "../mock";
import * as projectApi from "../api/projectApi";
import { isLinkable } from "../components/project/videoUrl";
import SupportLevels from "../components/project/SupportLevels";
import Avatar from "../components/ui/Avatar";
import { MAX_TIERS, validateTiers } from "../components/project/tierRules";
import { toTier, parseAmount } from "../api/mappers";

// The three optional story sections ProjectDetail renders under the blurb. Kept in the
// Basic Info tab next to the value proposition — the Media tab still has nowhere to save.
const STORY_FIELDS = [
  { key: "challenge", label: "The Challenge" },
  { key: "solution", label: "Our Solution" },
  { key: "funding", label: "How Your Funding Helps" },
];

// projects.category stores the bare department ("ENGINEERING") — the SCHOOLS dropdown
// offers "School of Engineering". Saving the label verbatim gives the project a category
// no filter chip and no tag colour can match. Same normalisation as CreateProject.
function toCategory(school) {
  return String(school || "").replace(/^School of\s+/i, "").trim().toUpperCase();
}

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
            {/* The existing rows use departments that are not in SCHOOLS (BIOTECH,
                ARCHITECTURE…). Without keeping the project's own value as an option the
                select would fall back to the first entry and silently recategorise the
                project the moment anything else on the tab was saved. */}
            {!SCHOOLS.includes(data.school) && data.school && <option key={data.school}>{data.school}</option>}
            {SCHOOLS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">Funding Goal (CC)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">CC</span>
            <input value={data.goal} onChange={e => setData({ ...data, goal: e.target.value })} className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors" />
          </div>
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">Value Proposition</label>
        <textarea value={data.proposition} onChange={e => setData({ ...data, proposition: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand min-h-[100px] resize-y transition-colors leading-relaxed" />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="text-[13px] font-bold text-gray-900 mb-1">Project Story <span className="font-normal text-gray-400">(optional)</span></div>
        <p className="text-[12px] text-gray-400 mb-3">Each section only appears on the project page when it has text.</p>
        <div className="flex flex-col gap-3">
          {STORY_FIELDS.map(field => (
            <div key={field.key}>
              <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">{field.label}</label>
              <textarea
                value={data[field.key]}
                onChange={e => setData({ ...data, [field.key]: e.target.value })}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand min-h-[90px] resize-y transition-colors leading-relaxed"
              />
            </div>
          ))}
        </div>
      </div>

      {/* The video lives here rather than on the Media tab, for the same reason the
          story fields do: Basic Info is the tab that actually saves. */}
      <div className="border-t border-gray-100 pt-4">
        <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">Project Video URL</label>
        <input
          value={data.videoUrl}
          onChange={e => setData({ ...data, videoUrl: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">YouTube and Vimeo links play on the project page; anything else is shown as a link.</p>
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
          return (
            <div key={m.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-lg border border-gray-100 gap-2 sm:gap-0">
              <div className="flex items-center gap-2.5">
                <Avatar name={m.name} size={32} tone="blue" />
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

// An empty level form. Bullet lines start with one blank row so the field is visibly
// there; blanks are filtered out before anything is sent.
const EMPTY_TIER = { name: "", amount: "", bullets: [""] };

// Support Levels - `project_tiers` in the database, and NOT rewards. A level is a
// minimum contribution plus the lines saying what choosing it signals; the creator owes
// nothing, so there is no quantity, delivery date or fulfilment state to edit here.
//
// ⚠️ This tab has NO shared Save button - the modal's SAVE CHANGES only writes the
// Basic Info fields. So every action here calls the API on its own and then refetches.
// The alternative (collect edits, save with the rest) would silently drop them, which is
// exactly the class of bug this whole feature was built to end.
function TabTiers({ projectId }) {
  const [levels, setLevels] = useState([]);
  // Seeded from projectId rather than always true: with no project there is nothing to
  // fetch, and flipping it off from inside the effect would be a setState in an effect
  // body for no reason.
  const [loading, setLoading] = useState(Boolean(projectId));
  const [loadError, setLoadError] = useState(null);

  const [draft, setDraft] = useState(EMPTY_TIER);
  const [editingId, setEditingId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Bumped after every add / edit / remove to refetch. Same pattern as ProjectDetail's
  // commentsVersion, and for the same reason: backersCount on each level is computed in
  // SQL, so the list has to come back from the server rather than be patched locally.
  const [version, setVersion] = useState(0);
  const reload = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await projectApi.getProjectTiers(projectId);
        if (!cancelled) setLevels((rows || []).map(toTier));
      } catch (err) {
        if (!cancelled) setLoadError(err.response?.data?.message || err.message || "Could not load the support levels");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, version]);

  const closeForm = () => { setShowNew(false); setEditingId(null); setDraft(EMPTY_TIER); setFormError(""); };

  const startEdit = (level) => {
    setEditingId(level.id);
    setShowNew(true);
    setFormError("");
    setDraft({
      name: level.name,
      amount: String(level.minAmount),
      bullets: level.bullets.length > 0 ? [...level.bullets] : [""],
    });
  };

  const updateBullet = (i, val) => {
    const next = [...draft.bullets];
    next[i] = val;
    setDraft({ ...draft, bullets: next });
  };

  const save = async () => {
    // Validate the list AS IT WOULD BE, not the one level: the duplicate-minimum and
    // the 5-level rules only exist across levels. Same function the wizard and the
    // backend use, so the three cannot drift.
    const candidate = { ...draft, id: editingId ?? "new" };
    const nextList = editingId
      ? levels.map(l => (l.id === editingId ? candidate : { ...l, amount: String(l.minAmount) }))
      : [...levels.map(l => ({ ...l, amount: String(l.minAmount) })), candidate];

    const problem = validateTiers(nextList);
    if (problem) { setFormError(problem); return; }

    const payload = {
      name: draft.name.trim(),
      min_amount: parseAmount(draft.amount, { integer: true }),
      bullets: draft.bullets.map(b => b.trim()).filter(Boolean),
    };

    setBusy(true);
    setFormError("");
    try {
      if (editingId) {
        // Raising the minimum deliberately does not touch history - an investment
        // already carries its tier_id, so nobody's past choice is rewritten.
        await projectApi.updateTier(projectId, editingId, payload);
        setNotice("Level updated.");
      } else {
        await projectApi.createTier(projectId, payload);
        setNotice("Level added.");
      }
      closeForm();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || "Could not save the level");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (level) => {
    setBusy(true);
    setNotice("");
    try {
      // The backend decides between deleting and hiding: a level somebody already chose
      // has to survive, because their investment points at it. Say which happened -
      // "it vanished from the list but is still in someone's history" is confusing
      // silence otherwise.
      const result = await projectApi.deleteTier(projectId, level.id);
      setNotice(result.hidden
        ? "Hidden. Backers who chose it keep their history."
        : "Level deleted.");
      if (editingId === level.id) closeForm();
      reload();
    } catch (err) {
      setNotice(err.response?.data?.message || err.message || "Could not remove the level");
    } finally {
      setBusy(false);
    }
  };

  if (!projectId) {
    return (
      <div className="text-[13px] text-gray-400">
        This modal was opened without a project, so there are no support levels to edit.
      </div>
    );
  }

  const atLimit = levels.length >= MAX_TIERS && editingId === null;

  return (
    <div>
      <h3 className="text-lg font-extrabold text-gray-900 mb-1">Support Levels</h3>
      <p className="text-[13px] text-gray-400 mb-1">
        Each level is a minimum number of Class Coins plus the lines describing what choosing it says.
      </p>
      <p className="text-[13px] text-gray-400 mb-4 italic">
        Not rewards - you are not promising to deliver anything. Changes here save immediately.
      </p>

      {loadError && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-brand">{loadError}</div>
      )}
      {notice && (
        <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-600">{notice}</div>
      )}

      <div className="flex justify-between items-center mb-3">
        <span className="text-[13px] font-bold text-gray-900">Existing Levels</span>
        <span className="text-[11px] text-gray-400 font-semibold">{levels.length} OF {MAX_TIERS}</span>
      </div>

      {loading ? (
        <div className="text-[12px] text-gray-400 mb-4">Loading levels…</div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-4">
          {levels.length === 0 && (
            <div className="text-[12px] text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-5 text-center">
              No levels yet. Backers can still invest any amount without one.
            </div>
          )}
          {levels.map(t => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-3.5 flex gap-3.5">
              <div className="w-10 h-10 border border-gray-200 rounded-md flex items-center justify-center text-lg shrink-0">◎</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold text-gray-900">{t.name}</div>
                    <div className="text-[11px] font-bold text-brand tracking-wide mb-1">MINIMUM: {t.minAmount.toLocaleString()} CC</div>
                    {t.bullets.map((b, i) => (
                      <div key={i} className="text-[12px] text-gray-500 leading-relaxed">› {b}</div>
                    ))}
                    {/* The number that makes levels worth recording, and also the
                        warning that removing this one will hide rather than delete it. */}
                    <div className="text-[11px] text-gray-400 mt-1">
                      {t.backersCount === 0
                        ? "No backers at this level yet"
                        : `${t.backersCount} ${t.backersCount === 1 ? "backer" : "backers"} at this level`}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3 shrink-0 self-start">
                    <button onClick={() => startEdit(t)} disabled={busy} className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-600 text-sm disabled:cursor-not-allowed">✎</button>
                    <button onClick={() => remove(t)} disabled={busy} className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-brand text-sm disabled:cursor-not-allowed">🗑</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div onClick={() => !showNew && !atLimit && setShowNew(true)} className={`border-2 border-dashed border-gray-200 rounded-lg ${showNew ? "p-4" : atLimit ? "p-3.5" : "p-3.5 cursor-pointer hover:border-brand transition-colors"}`}>
        {!showNew ? (
          <div className="flex items-center gap-2 text-gray-400 text-[13px] font-semibold">
            <span className="text-lg">⊕</span>
            {atLimit ? `All ${MAX_TIERS} levels used — edit or remove one to add another` : "Create New Level"}
          </div>
        ) : (
          <div>
            <div className="text-[13px] font-bold text-gray-900 mb-3">{editingId ? "Edit Level" : "New Level"}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">LEVEL NAME</label>
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g., Pilot partner" className="w-full border border-gray-200 rounded-md px-2.5 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">MINIMUM (CC)</label>
                <input value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value })} placeholder="e.g., 250" className="w-full border border-gray-200 rounded-md px-2.5 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
              </div>
            </div>
            {/* A LIST, not the single textarea this tab used to have. The wizard already
                collected a list, so the two forms disagreed about the shape of the same
                thing - one of them had to be losing structure, and it was this one. */}
            <div className="mb-2.5">
              <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">WHAT THIS LEVEL SIGNALS</label>
              {draft.bullets.map((b, i) => (
                <div key={i} className="flex gap-2 mb-1.5 items-center">
                  <span className="text-brand text-sm">›</span>
                  <input value={b} onChange={e => updateBullet(i, e.target.value)} placeholder={i === 0 ? "I want to trial this on my own campus" : "I am happy to be interviewed for 30 minutes"} className="flex-1 border border-gray-200 rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-brand transition-colors" />
                  {i > 0 && <button onClick={() => setDraft({ ...draft, bullets: draft.bullets.filter((_, idx) => idx !== i) })} className="bg-transparent border-none cursor-pointer text-gray-300 hover:text-gray-500 text-base">×</button>}
                </div>
              ))}
              <button onClick={() => setDraft({ ...draft, bullets: [...draft.bullets, ""] })} className="bg-transparent border-none text-[12px] text-brand font-bold cursor-pointer hover:underline">+ ADD ANOTHER LINE</button>
            </div>
            {formError && (
              <div className="mb-2.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-brand">{formError}</div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={closeForm} disabled={busy} className="bg-white border border-gray-200 rounded-md px-4 py-1.5 text-[12px] text-gray-600 cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed">Cancel</button>
              <button onClick={save} disabled={busy} className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-4 py-1.5 text-[12px] font-bold cursor-pointer transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                {busy ? "Saving…" : editingId ? "Save Level" : "Add Level"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* The same component the project page and the admin review screen render, so
          this preview cannot drift from what a backer actually sees. */}
      {levels.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-2">PROJECT PAGE PREVIEW</div>
          <SupportLevels levels={levels} compact />
        </div>
      )}
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
          // Prefill from the stored category, not from `dept` — dept is a display label
          // derived from it, so `School of ${dept}` produced "School of School of design"
          // for anything created through the form.
          school: project.category || EDIT_PROJECT_INITIAL_DATA.school,
          // toCreatorProject hands this over as "12,500 CC". Kept as a STRING: it binds
          // to a controlled <input value=...>, and a number is fine there but undefined
          // would make the input uncontrolled.
          goal: project.goal ? String(parseAmount(project.goal)) : EDIT_PROJECT_INITIAL_DATA.goal,
          // description comes from the API (projects.description).
          proposition: project.description || project.proposition || EDIT_PROJECT_INITIAL_DATA.proposition,
          // toCreatorProject passes these through from the story columns; "" when unset.
          challenge: project.challenge || "",
          solution: project.solution || "",
          funding: project.funding || "",
          videoUrl: project.videoUrl || "",
        }
      : { ...EDIT_PROJECT_INITIAL_DATA, challenge: "", solution: "", funding: "", videoUrl: "" }
  );
  const [team, setTeam] = useState(project?.team || EDIT_PROJECT_INITIAL_TEAM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // PUT /api/projects/:id — the backend accepts title, description, category,
  // goal_amount, image_url, team_members and the three story columns. Support Levels
  // save themselves through their own endpoints (see TabTiers); the Media tab is still
  // the one with nowhere to save.
  const handleSave = async () => {
    if (!project?.id) {
      setSaveError("This modal was opened without a project, so there is nothing to save.");
      return;
    }
    // Same rule the create wizard enforces. Without it, a creator could get past the
    // wizard's check and then paste anything here — editing would be the way around it.
    // Empty is allowed on this screen: the video is required to CREATE a project, but
    // clearing it later is a deliberate choice, not a typo.
    const videoUrl = basicData.videoUrl.trim();
    if (videoUrl && !isLinkable(videoUrl)) {
      setSaveError("That video link does not look like a web address — it should start with https://");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await projectApi.updateProject(project.id, {
        title: basicData.title.trim(),
        description: basicData.proposition.trim(),
        // Was `project.category ?? basicData.school`, which always won — the School
        // dropdown looked editable but every change to it was thrown away on save.
        category: toCategory(basicData.school),
        goal_amount: parseAmount(basicData.goal),
        image_url: project.img || "",
        team_members: team,
        // The column is funding_usage; the form field is called `funding`.
        challenge: basicData.challenge.trim(),
        solution: basicData.solution.trim(),
        funding_usage: basicData.funding.trim(),
        video_url: videoUrl,
        // Echoed back unchanged: this modal has no editor for either yet, and the
        // service overwrites the column with whatever it is handed.
        gallery: project.gallery ?? [],
        solution_bullets: project.solutionBullets ?? [],
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
      // Self-contained: it loads and saves the project's real levels itself, because
      // SAVE CHANGES below only writes Basic Info.
      case "tiers": return <TabTiers projectId={project?.id} />;
      default: return null;
    }
  };

  return (
    // panelScroll={false}: this dialog is a column with a fixed header and tab bar and a
    // scrolling body. Letting the whole panel scroll would carry the tabs off the top.
    //
    // ⚠️ closable={false} is deliberate, and it PRESERVES the behaviour this dialog always
    // had. Every other modal in the app closes on a backdrop click; this one does not,
    // because it is a large form holding unsaved edits — a stray click beside it would
    // throw away everything typed since the dialog opened, with no confirmation and no
    // undo. The × and CANCEL CHANGES are the deliberate ways out.
    //
    // (This was listed as an inconsistency to fix when the shared Modal was planned.
    //  Reading the form again, it is not one: it is the only dialog here with unsaved work
    //  in it, so it is the only one that should be hard to dismiss by accident.)
    <Modal onClose={onClose} closable={false} maxWidth={660} panelScroll={false} panelClassName="flex max-h-[90vh] flex-col overflow-hidden font-sans">

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
    </Modal>
  );
}