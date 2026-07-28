import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CREATE_PROJECT_STEPS as STEPS,
  SCHOOLS,
  MOCK_TEAM,
  ROLE_BADGE,
  CREATE_PROJECT_TIERS
} from "../mock";

const MAX_GALLERY_IMAGES = 6;

function formatCurrency(value) {
  const numericValue = Number(String(value).replace(/[^\d.]/g, ""));
  if (Number.isNaN(numericValue) || numericValue <= 0) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(numericValue);
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 102.4) / 10)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createFileItem(file) {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    preview: URL.createObjectURL(file),
  };
}

function fileLabel(fileItem) {
  if (!fileItem) return "Not uploaded";
  return `${fileItem.file.name} · ${formatFileSize(fileItem.file.size)}`;
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function StepIndicator({ steps, current }) {
  return (
    <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 gap-6 md:gap-0 scrollbar-none shrink-0">
      {steps.map((s, i) => (
        <div key={s.id} className={`flex items-center md:items-start gap-3 relative shrink-0 ${i < steps.length - 1 ? "pb-0 md:pb-6" : ""}`}>
          {i < steps.length - 1 && (
            <div className="hidden md:block absolute left-[11px] top-6 w-0.5 h-6" style={{ background: s.id < current ? "#cc0000" : "#e5e7eb" }} />
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
            <div className={`text-[13px] whitespace-nowrap ${s.id === current ? "font-bold text-gray-900" : s.id < current ? "font-medium text-brand" : "font-normal text-gray-300"}`}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Step1({ data, setData }) {
  return (
    <div>
      <h1 className="text-[32px] font-extrabold text-black mb-2">Basic Information</h1>
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

function Step2({ media, setMedia }) {
  const coverInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const uploadCover = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMedia(prev => {
      if (prev.coverImage?.preview) URL.revokeObjectURL(prev.coverImage.preview);
      return { ...prev, coverImage: createFileItem(file) };
    });
    event.target.value = "";
  };

  const uploadVideo = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMedia(prev => ({ ...prev, videoFile: { file } }));
    event.target.value = "";
  };

  const uploadGallery = event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setMedia(prev => {
      const remainingSlots = MAX_GALLERY_IMAGES - prev.galleryImages.length;
      const nextGallery = files.slice(0, remainingSlots).map(createFileItem);
      return { ...prev, galleryImages: [...prev.galleryImages, ...nextGallery] };
    });
    event.target.value = "";
  };

  const removeCover = () => {
    setMedia(prev => {
      if (prev.coverImage?.preview) URL.revokeObjectURL(prev.coverImage.preview);
      return { ...prev, coverImage: null };
    });
  };

  const removeGalleryImage = id => {
    setMedia(prev => {
      const target = prev.galleryImages.find(image => image.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return { ...prev, galleryImages: prev.galleryImages.filter(image => image.id !== id) };
    });
  };

  const handleDrop = (event, kind) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    if (!files.length) return;

    if (kind === "cover") {
      setMedia(prev => {
        if (prev.coverImage?.preview) URL.revokeObjectURL(prev.coverImage.preview);
        return { ...prev, coverImage: createFileItem(files[0]) };
      });
      return;
    }

    if (kind === "gallery") {
      setMedia(prev => {
        const remainingSlots = MAX_GALLERY_IMAGES - prev.galleryImages.length;
        const nextGallery = files.slice(0, remainingSlots).map(createFileItem);
        return { ...prev, galleryImages: [...prev.galleryImages, ...nextGallery] };
      });
    }
  };

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Media Uploads</h2>
      <p className="text-[13px] text-gray-400 mb-6">Upload high-quality visual assets to showcase your project.</p>
      <div className="flex flex-col gap-7">
        <div>
          <div className="text-[14px] font-bold text-gray-900 mb-1">Cover Image</div>
          <p className="text-[12px] text-gray-400 mb-2.5">Minimum resolution: 1920×1080px (16:9 ratio). Max size: 5MB.</p>
          {media.coverImage ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <img src={media.coverImage.preview} alt="Project cover preview" className="w-full h-56 object-cover" />
              <div className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-bold text-gray-900">{media.coverImage.file.name}</div>
                  <div className="text-[11px] text-gray-400">{formatFileSize(media.coverImage.file.size)}</div>
                </div>
                <button onClick={removeCover} className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-[12px] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors">Remove</button>
              </div>
            </div>
          ) : (
            <>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={uploadCover} />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                onDragOver={event => event.preventDefault()}
                onDrop={event => handleDrop(event, "cover")}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg p-10 text-center cursor-pointer hover:border-brand transition-colors bg-white"
              >
                <div className="text-3xl text-gray-200 mb-2">⬆</div>
                <div className="text-[13px] text-brand font-semibold">Upload a file</div>
                <div className="text-[12px] text-gray-400">or drag and drop</div>
                <div className="text-[11px] text-gray-300 mt-1">PNG, JPG, WEBP UP TO 5MB</div>
              </button>
            </>
          )}
        </div>
        <div>
          <div className="text-[14px] font-bold text-gray-900 mb-1">Project Video</div>
          <p className="text-[12px] text-gray-400 mb-3">Provide a YouTube/Vimeo URL or upload directly.</p>
          <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">Video URL (Recommended)</label>
          <input value={media.videoUrl} onChange={e => setMedia(prev => ({ ...prev, videoUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors mb-2" />
          {media.videoFile ? (
            <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2">
              <div>
                <div className="text-[13px] font-bold text-gray-900">{media.videoFile.file.name}</div>
                <div className="text-[11px] text-gray-400">Uploaded video file</div>
              </div>
            </div>
          ) : null}
          <div className="text-center text-[12px] text-gray-300 my-2">OR UPLOAD</div>
          <div className="flex items-center gap-3">
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={uploadVideo} />
            <button type="button" onClick={() => videoInputRef.current?.click()} className="bg-white border border-brand text-brand rounded-md px-3 py-1.5 text-[12px] font-bold cursor-pointer hover:bg-red-50 transition-colors">↑ SELECT VIDEO FILE</button>
            <span className="text-[11px] text-gray-300">MP4, MOV UP TO 50MB</span>
          </div>
        </div>
        <div>
          <div className="text-[14px] font-bold text-gray-900 mb-1">Prototype Gallery</div>
          <p className="text-[12px] text-gray-400 mb-3">Upload up to 6 additional photos.</p>
          <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadGallery} />
          <div onDragOver={event => event.preventDefault()} onDrop={event => handleDrop(event, "gallery")} className="grid grid-cols-3 gap-2.5">
            {media.galleryImages.map(image => (
              <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-900 group">
                <img src={image.preview} alt={image.file.name} className="w-full h-full object-cover opacity-90" />
                <button type="button" onClick={() => removeGalleryImage(image.id)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 text-sm opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            ))}
            {media.galleryImages.length < MAX_GALLERY_IMAGES && (
              <button type="button" onClick={() => galleryInputRef.current?.click()} className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand transition-colors gap-1 bg-white">
                <span className="text-xl text-gray-300">+</span>
                <span className="text-[11px] text-gray-300">ADD PHOTO</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-300 mt-2">{media.galleryImages.length} of {MAX_GALLERY_IMAGES} photos uploaded.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 mb-0">
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
          <button onClick={() => { if (newMember.name && newMember.role) { setTeam([...team, { ...newMember, id: Date.now() }]); setNewMember({ name: "", role: "", rmitId: "" }); }}} className="w-full sm:w-9 h-9 bg-brand hover:bg-red-800 text-white border-none rounded-md text-lg cursor-pointer flex items-center justify-center transition-colors self-end mt-2 sm:mt-0">+</button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

function Step5({ basicData, media, team, tiers, onEdit }) {
  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Review & Submit</h2>
      <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">Confirm everything is ready before sending your project for approval.</p>
      <div className="grid grid-cols-1 gap-4">
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1">BASIC INFORMATION</div>
              <div className="text-lg font-extrabold text-gray-900">{basicData.title || "Untitled project"}</div>
            </div>
            <button type="button" onClick={() => onEdit(1)} className="text-[12px] font-bold text-brand hover:underline">Edit</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] text-gray-600">
            <div><span className="text-gray-400">School:</span> {basicData.school || "—"}</div>
            <div><span className="text-gray-400">Funding goal:</span> {formatCurrency(basicData.goal)}</div>
          </div>
          <div className="mt-4 text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{basicData.proposition || "No value proposition added yet."}</div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1">MEDIA</div>
              <div className="text-lg font-extrabold text-gray-900">Uploads ready for review</div>
            </div>
            <button type="button" onClick={() => onEdit(2)} className="text-[12px] font-bold text-brand hover:underline">Edit</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] text-gray-600">
            <div>
              <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-1">Cover image</div>
              <div>{fileLabel(media.coverImage)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-1">Project video</div>
              <div>{media.videoUrl || fileLabel(media.videoFile) || "Not uploaded"}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-2">Gallery</div>
            <div className="flex flex-wrap gap-2">
              {media.galleryImages.length > 0 ? media.galleryImages.map(image => (
                <span key={image.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[12px] text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-brand" />
                  {image.file.name}
                </span>
              )) : <span className="text-[13px] text-gray-400">No gallery images uploaded.</span>}
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1">TEAM</div>
              <div className="text-lg font-extrabold text-gray-900">{team.length} contributors</div>
            </div>
            <button type="button" onClick={() => onEdit(3)} className="text-[12px] font-bold text-brand hover:underline">Edit</button>
          </div>
          <div className="flex flex-col gap-3">
            {team.map(member => (
              <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 rounded-lg bg-gray-50 border border-gray-100 p-3">
                <div>
                  <div className="text-[13px] font-bold text-gray-900">{member.name}</div>
                  <div className="text-[11px] text-gray-400">RMIT ID: {member.rmitId || "—"}</div>
                </div>
                <span className={`self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-sm ${ROLE_BADGE[member.role] || "bg-gray-100 text-gray-600"}`}>{member.role}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1">FUNDING TIERS</div>
              <div className="text-lg font-extrabold text-gray-900">{tiers.length > 0 ? `${tiers.length} tier${tiers.length > 1 ? "s" : ""}` : "No tiers added"}</div>
            </div>
            <button type="button" onClick={() => onEdit(4)} className="text-[12px] font-bold text-brand hover:underline">Edit</button>
          </div>
          {tiers.length > 0 ? (
            <div className="flex flex-col gap-3">
              {tiers.map(tier => (
                <div key={tier.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[13px] font-bold text-gray-900">{tier.name}</div>
                  <div className="text-[12px] text-gray-500 mb-2">{tier.amount} CC minimum contribution</div>
                  <div className="flex flex-wrap gap-2">
                    {tier.privileges.filter(Boolean).map(privilege => (
                      <span key={privilege} className="rounded-full bg-white border border-gray-200 px-2.5 py-1 text-[12px] text-gray-600">{privilege}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-gray-400">You can submit without reward tiers, but you should add them before publishing.</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function CreateProject() {
  const [step, setStep] = useState(1);
  const [basicData, setBasicData] = useState({ title: "", school: "", goal: "", proposition: "" });
  const [media, setMedia] = useState({ coverImage: null, videoUrl: "", videoFile: null, galleryImages: [] });
  const [team, setTeam] = useState(MOCK_TEAM);
  const [tiers, setTiers] = useState(CREATE_PROJECT_TIERS);
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (media.coverImage?.preview) URL.revokeObjectURL(media.coverImage.preview);
      media.galleryImages.forEach(image => URL.revokeObjectURL(image.preview));
    };
  }, [media.coverImage, media.galleryImages]);

  const validateStep = targetStep => {
    if (targetStep === 1) {
      if (!hasText(basicData.title)) return "Add a project title before continuing.";
      if (!hasText(basicData.school)) return "Choose a school or department before continuing.";
      const goalValue = Number(String(basicData.goal).replace(/[^\d.]/g, ""));
      if (!hasText(basicData.goal) || Number.isNaN(goalValue) || goalValue < 500) return "Enter a funding goal of at least $500.";
      if (!hasText(basicData.proposition)) return "Add your value proposition before continuing.";
    }

    if (targetStep === 2) {
      if (!media.coverImage) return "Upload a cover image before continuing.";
      if (!hasText(media.videoUrl) && !media.videoFile) return "Add a project video URL or upload a video file before continuing.";
      if (media.galleryImages.length === 0) return "Upload at least one prototype gallery image before continuing.";
    }

    if (targetStep === 3) {
      if (team.length === 0) return "Add at least one team member before continuing.";
    }

    if (targetStep === 4) {
      if (tiers.some(tier => !hasText(tier.name) || !hasText(tier.amount))) return "Complete or remove any partially filled reward tiers before continuing.";
    }

    return "";
  };

  const goToStep = targetStep => {
    setIsSubmitted(false);

    if (targetStep < step) {
      setMessage("");
      setStep(targetStep);
      return;
    }

    for (let current = step; current < targetStep; current += 1) {
      const validation = validateStep(current);
      if (validation) {
        setMessage(validation);
        return;
      }
    }

    setMessage("");
    setStep(targetStep);
  };

  const advanceStep = () => {
    setIsSubmitted(false);

    const validation = validateStep(step);
    if (validation) {
      setMessage(validation);
      return;
    }

    setMessage("");
    setStep(current => Math.min(STEPS.length, current + 1));
  };

  const handlePrimaryFooterAction = () => {
    if (step === STEPS.length) {
      setMessage("");
      setIsSubmitted(false);
      setStep(STEPS.length - 1);
      return;
    }

    setMessage("Draft saved locally. Continue when you're ready.");
  };

  const handleSubmit = () => {
    const requiredStepError = [1, 2, 3, 4].map(validateStep).find(Boolean);
    if (requiredStepError) {
      setMessage(requiredStepError);
      return;
    }

    setMessage("");
    setIsSubmitted(true);
  };

  const renderStep = () => {
    if (isSubmitted) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-[11px] font-bold tracking-widest mb-4">SUBMISSION RECEIVED</div>
          <h2 className="text-[24px] font-extrabold text-gray-900 mb-2">Your project is ready for review</h2>
          <p className="text-[14px] text-gray-500 leading-relaxed">The submission has been prepared for admin review. You can return to the summary if you need to make a last edit.</p>
        </div>
      );
    }

    switch (step) {
      case 1: return <Step1 data={basicData} setData={setBasicData} />;
      case 2: return <Step2 media={media} setMedia={setMedia} />;
      case 3: return <Step3 team={team} setTeam={setTeam} />;
      case 4: return <Step4 tiers={tiers} setTiers={setTiers} />;
      case 5: return <Step5 basicData={basicData} media={media} team={team} tiers={tiers} onEdit={goToStep} />;
      default: return <div className="text-gray-400 text-sm">Step {step} — coming soon.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      <header className="bg-white border-b border-gray-200 h-13 flex items-center justify-between px-4 md:px-10">
        <div className="text-[15px] font-extrabold text-brand tracking-widest py-3">RMIT LAUNCHPAD</div>
        <button onClick={() => navigate(-1)} className="bg-transparent border-none text-[13px] text-gray-400 cursor-pointer hover:text-gray-600">× CANCEL</button>
      </header>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-12">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-gray-900 mb-1">Create Project</div>
          <div className="text-[12px] text-gray-400 mb-4 md:mb-6">Submit your proposal for review.</div>
          <StepIndicator steps={STEPS} current={step} />
          {message && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{message}</div>}
        </div>
        <div className="min-w-0">
          {renderStep()}
          <div className="flex flex-col sm:flex-row gap-3 justify-between mt-9 pt-5 border-t border-gray-100">
            <button onClick={handlePrimaryFooterAction} className="bg-white border border-gray-200 rounded-md px-6 py-2.5 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto">
              {step === STEPS.length ? "← BACK" : "SAVE DRAFT"}
            </button>
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 w-full sm:w-auto">
              {step > 1 && step < STEPS.length && (
                <button onClick={() => setStep(s => s - 1)} className="bg-white border border-gray-200 rounded-md px-5 py-2.5 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto">← Back</button>
              )}
              {step < STEPS.length ? (
                <button onClick={advanceStep} className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-7 py-2.5 text-[13px] font-bold cursor-pointer transition-colors w-full sm:w-auto">NEXT STEP →</button>
              ) : (
                <button onClick={handleSubmit} className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-7 py-2.5 text-[13px] font-bold cursor-pointer transition-colors w-full sm:w-auto">SUBMIT PROJECT FOR APPROVAL ▶</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}