import { useEffect, useRef, useState } from "react";
import Modal from "../components/ui/Modal";
import { useNavigate, Link } from "react-router-dom";
import {
  CREATE_PROJECT_STEPS as STEPS,
  SCHOOLS,
  MOCK_TEAM,
  ROLE_BADGE,
} from "../mock";
import * as projectApi from "../api/projectApi";
// Only reached when the signed-in account is an admin filing on somebody's behalf; see
// the guarded effect below. A creator never calls an admin route from this page.
import * as adminApi from "../api/adminApi";
import { parseAmount, toAdminUser } from "../api/mappers";
import { useAuth } from "../context/AuthContext";
import { draftStorageKey } from "./draftStorageKey";
import { isLinkable } from "../components/project/videoUrl";
import { MAX_TIERS, validateTiers } from "../components/project/tierRules";
import { validateTeamMember } from "../components/creator/teamRules";
import { errorMessage } from "../api/apiError";

const MAX_GALLERY_IMAGES = 6;

// The dropdown offers "School of Engineering", but projects.category holds the bare
// department ("ENGINEERING"), which is what TAG_COLORS and FILTER_TAGS key on. Storing
// the label verbatim would give the project a category no filter chip matches, leaving
// it out of TECH, ART and SCIENCE and rendered with the fallback grey tag.
function toCategory(school) {
  return String(school || "").replace(/^School of\s+/i, "").trim().toUpperCase();
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 102.4) / 10)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isObjectUrl(value) {
  return typeof value === "string" && value.startsWith("blob:");
}

// Images are stored as base64 data URIs inside the project row, so an untouched phone
// photo (2-5 MB, and a third larger again once encoded) blows past the server's body
// limit and would then ride along in every Discover response. Downscaling first is what
// makes that storage choice workable: 1600px at quality 0.8 takes a 4 MB photo to about
// 200 KB, with no visible loss at the sizes this UI renders.
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 0.8;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file preview."));
    reader.readAsDataURL(file);
  });
}

/**
 * Reads an image file and returns a downscaled JPEG data URI.
 *
 * Falls back to the original data URI whenever the browser cannot decode the file, such
 * as an SVG or a corrupt upload. Sending a large image is a better outcome than losing
 * it, and the server limit has room for one.
 */
async function readImageAsCompressedDataUrl(file) {
  const original = await readFileAsDataUrl(file);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Not a decodable image."));
      image.src = original;
    });

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));

    // Already small enough, and re-encoding a modest PNG as JPEG can make it bigger.
    if (scale === 1 && original.length <= 400 * 1024) return original;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

    const compressed = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);

    // toDataURL returns "data:," for a tainted or zero-sized canvas.
    return compressed.length > 32 && compressed.length < original.length ? compressed : original;
  } catch {
    return original;
  }
}

function createFileItem(file, dataUrl = "") {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    preview: URL.createObjectURL(file),
    dataUrl,
  };
}

// The size that will actually be submitted, not the size of the file on disk. Images are
// downscaled before encoding, so quoting the original would alarm the creator at exactly
// the moment they are deciding whether to submit. base64 carries 3 bytes per 4
// characters, and the "data:...;base64," prefix is negligible.
function submittedSize(fileItem) {
  const dataUrl = fileItem.dataUrl;
  if (!dataUrl) return fileItem.file?.size ?? 0;
  return Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
}

function fileLabel(fileItem) {
  if (!fileItem) return "Not uploaded";
  return `${fileItem.file.name} · ${formatFileSize(submittedSize(fileItem))}`;
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function serializeMedia(media) {
  return {
    coverImage: media.coverImage
      ? {
          id: media.coverImage.id,
          fileName: media.coverImage.file?.name ?? media.coverImage.fileName,
          fileSize: media.coverImage.file?.size ?? media.coverImage.fileSize,
          previewDataUrl: media.coverImage.dataUrl || (media.coverImage.preview && !isObjectUrl(media.coverImage.preview) ? media.coverImage.preview : ""),
        }
      : null,
    videoUrl: media.videoUrl || "",
    galleryImages: (media.galleryImages || []).map(image => ({
      id: image.id,
      fileName: image.file?.name ?? image.fileName,
      fileSize: image.file?.size ?? image.fileSize,
      previewDataUrl: image.dataUrl || (image.preview && !isObjectUrl(image.preview) ? image.preview : ""),
    })),
  };
}

function restoreMedia(mediaDraft) {
  return {
    coverImage: mediaDraft?.coverImage
      ? {
          id: mediaDraft.coverImage.id,
          file: {
            name: mediaDraft.coverImage.fileName || "Uploaded image",
            size: mediaDraft.coverImage.fileSize || 0,
          },
          preview: mediaDraft.coverImage.previewDataUrl || null,
          dataUrl: mediaDraft.coverImage.previewDataUrl || "",
        }
      : null,
    videoUrl: mediaDraft?.videoUrl || "",
    // An old draft may still carry a videoFile key. It is ignored rather than restored:
    // the upload control is gone, and the file handle never survived a reload anyway.
    galleryImages: (mediaDraft?.galleryImages || []).map(image => ({
      id: image.id,
      file: {
        name: image.fileName || "Uploaded image",
        size: image.fileSize || 0,
      },
      preview: image.previewDataUrl || null,
      dataUrl: image.previewDataUrl || "",
    })),
  };
}

// `key` comes from draftStorageKey(user.id), and is null when nobody is signed in. There
// is nothing to read in that case: a shared key would hand one person's half-written
// project to whoever signs in next.
function getStoredDraft(key) {
  if (typeof window === "undefined" || !key) return null;

  try {
    const storedDraft = window.localStorage.getItem(key);
    return storedDraft ? JSON.parse(storedDraft) : null;
  } catch {
    return null;
  }
}

// Is there anything in this draft worth mentioning? Autosave writes one on mount, so a
// draft can be present and still completely blank.
function draftHasContent(draft) {
  if (!draft) return false;

  const { title, school, proposition } = draft.basicData || {};
  if ([title, school, proposition].some(hasText)) return true;
  if (Object.values(draft.story || {}).some(v => typeof v === "string" && hasText(v))) return true;

  return Boolean(draft.media?.coverImage) || (draft.media?.galleryImages || []).length > 0;
}

function saveDraftToStorage(key, draft) {
  if (typeof window === "undefined" || !key) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Ignore storage errors so the form still works when storage is unavailable.
  }
}

// Called once a submit succeeds. A draft is a recovery aid for an unfinished project, so
// leaving one behind would mean opening the wizard again and finding the project you just
// submitted, filled in and ready to send twice.
//
// Cancelling does not clear it. That is the case the draft exists for.
function clearDraftFromStorage(key) {
  if (typeof window === "undefined" || !key) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors, as saveDraftToStorage does.
  }
}

/**
 * Shown after a successful submit, with no way back to the form. That is deliberate: an
 * inline success panel leaves the SUBMIT button live underneath it, and a second click
 * then creates a duplicate project.
 *
 * It navigates on an explicit click rather than on a timer, like RegisterSuccessModal.
 * The page should not disappear out from under someone mid-read.
 */
// `adminFiling` flips this dialog for an admin who filed the project for somebody else.
// The CTA has to change with it: /creator-my-projects sits behind canCreate, which an
// admin does not hold, so the creator's button would end the on-behalf flow on the "no
// access" screen.
//
// The button reads `adminFiling` rather than `onBehalf`, even though the two agree in
// practice. Label and destination must come from one value, or a missing owner name
// would leave the button saying MY PROJECTS while navigating to the admin dashboard;
// `onBehalf` is only the owner's name for the sentence above it.
function SubmitSuccessModal({ title, onBehalf, adminFiling, onGoToProjects }) {
  return (
    // closable={false} is the point of this dialog: the one CTA below is the only way
    // out. A dismissable backdrop would drop the submitter back onto a form whose
    // project has already been sent.
    <Modal maxWidth={460} closable={false} panelClassName="p-7 text-center">
        <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h2 className="text-[21px] font-extrabold text-gray-900 mb-2">Project submitted</h2>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-1">
          <span className="font-semibold text-gray-700">"{title}"</span> has been sent to the RMIT
          board for review. It stays in <span className="font-semibold text-gray-700">Pending Review</span> until
          an admin approves it, and appears on Discover once they do.
        </p>

        {onBehalf && (
          <p className="text-[13px] text-gray-500 leading-relaxed mt-3">
            It belongs to <span className="font-semibold text-gray-700">{onBehalf}</span> and is in
            their My Projects. Another admin has to review it — you cannot approve a
            project you filed.
          </p>
        )}

        <button
          onClick={onGoToProjects}
          className="w-full bg-brand hover:bg-red-800 text-white border-none rounded-md px-6 py-3 text-[13px] font-bold tracking-wide cursor-pointer transition-colors mt-6"
        >
          {adminFiling ? "GO TO PROJECT MANAGEMENT" : "GO TO MY PROJECTS"}
        </button>
    </Modal>
  );
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

/**
 * "Project owner", shown only to an admin.
 *
 * An admin owns nothing, so the wizard they open has to name the creator the project
 * will belong to. A creator filing their own project sees step 1 unchanged: no extra
 * field, no extra explanation.
 *
 * The list is every active account holding CREATOR. An empty list gets the instruction
 * rather than an empty dropdown, since granting CREATOR is a separate action in User
 * Management and the service refuses any other target anyway.
 */
function OwnerPicker({ creators, loading, error, ownerId, setOwnerId }) {
  return (
    <div className="border border-blue-200 bg-blue-50/60 rounded-lg p-4">
      <label className="text-[11px] font-bold text-blue-900 tracking-widest block mb-1.5">
        PROJECT OWNER
      </label>
      <p className="text-[12px] text-blue-800 mb-2.5 leading-relaxed">
        You are creating this project on behalf of a creator. It will belong to them —
        it appears in their My Projects and never in yours.
      </p>

      {loading ? (
        <div className="text-[13px] text-blue-800">Loading creator accounts…</div>
      ) : error ? (
        <div className="text-[13px] text-red-700">{error}</div>
      ) : creators.length === 0 ? (
        <div className="text-[13px] text-blue-900 leading-relaxed">
          No creator accounts yet — grant the CREATOR role in{" "}
          <Link to="/admin-user-management" className="font-bold underline">User Management</Link>{" "}
          first.
        </div>
      ) : (
        <select
          value={ownerId}
          onChange={e => setOwnerId(e.target.value)}
          className="w-full border border-blue-200 rounded-md px-3 py-2.5 text-[14px] outline-none focus:border-brand bg-white transition-colors"
        >
          <option value="">Select the creator this project belongs to…</option>
          {creators.map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function Step1({ data, setData, ownerPicker }) {
  return (
    <div>
      <h1 className="text-[32px] font-extrabold text-black mb-2">Basic Information</h1>
      <p className="text-[14px] text-gray-500 mb-7 leading-relaxed">Establish the core identity of your initiative. These details help potential backers understand the academic context and primary goal of your project.</p>
      <div className="flex flex-col gap-5">
        {/* Null for a creator, so this step is byte-for-byte what it always was. */}
        {ownerPicker}
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
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">VALUE PROPOSITION</label>
          <textarea value={data.proposition} onChange={e => setData({ ...data, proposition: e.target.value })} placeholder="Briefly describe the problem you are solving, your proposed solution, and the anticipated academic or societal impact..." className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[14px] outline-none focus:border-brand min-h-[100px] resize-y transition-colors leading-relaxed" />
        </div>
      </div>
    </div>
  );
}

// The three story fields behind ProjectDetail's "The Challenge", "Our Solution" and
// "How Support Would Be Used" sections. They sit in step 2, which is the story half of
// "Story & Media". All three are optional: a project that leaves them blank shows only
// its blurb.
const STORY_FIELDS = [
  {
    key: "challenge",
    label: "THE CHALLENGE",
    hint: "What problem are you tackling, and why does it matter?",
    placeholder: "Describe the gap or problem your project addresses…",
  },
  {
    key: "solution",
    label: "OUR SOLUTION",
    hint: "How does your project solve it?",
    placeholder: "Explain your approach, method or prototype…",
  },
  {
    key: "funding",
    // Worded to avoid sounding like a fundraising appeal, at the client's request. The
    // column is still funding_usage and the form field is still `funding`: renaming a
    // label is not renaming a schema.
    label: "HOW SUPPORT WOULD BE USED",
    hint: "What will the Class Coins be used for?",
    placeholder: "Break down what the support enables — equipment, lab time, materials…",
  },
];

function Step2({ media, setMedia, story, setStory }) {
  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const uploadCover = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readImageAsCompressedDataUrl(file);
    setMedia(prev => {
      if (prev.coverImage?.preview && isObjectUrl(prev.coverImage.preview)) URL.revokeObjectURL(prev.coverImage.preview);
      return { ...prev, coverImage: createFileItem(file, dataUrl) };
    });
    event.target.value = "";
  };


  const uploadGallery = async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const dataUrls = await Promise.all(files.map(file => readImageAsCompressedDataUrl(file)));
    setMedia(prev => {
      const remainingSlots = MAX_GALLERY_IMAGES - prev.galleryImages.length;
      const nextGallery = files.slice(0, remainingSlots).map((file, index) => createFileItem(file, dataUrls[index]));
      return { ...prev, galleryImages: [...prev.galleryImages, ...nextGallery] };
    });
    event.target.value = "";
  };

  const removeCover = () => {
    setMedia(prev => {
      if (prev.coverImage?.preview && isObjectUrl(prev.coverImage.preview)) URL.revokeObjectURL(prev.coverImage.preview);
      return { ...prev, coverImage: null };
    });
  };

  const removeGalleryImage = id => {
    setMedia(prev => {
      const target = prev.galleryImages.find(image => image.id === id);
      if (target?.preview && isObjectUrl(target.preview)) URL.revokeObjectURL(target.preview);
      return { ...prev, galleryImages: prev.galleryImages.filter(image => image.id !== id) };
    });
  };

  const handleDrop = async (event, kind) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    if (!files.length) return;

    if (kind === "cover") {
      const dataUrl = await readImageAsCompressedDataUrl(files[0]);
      setMedia(prev => {
        if (prev.coverImage?.preview && isObjectUrl(prev.coverImage.preview)) URL.revokeObjectURL(prev.coverImage.preview);
        return { ...prev, coverImage: createFileItem(files[0], dataUrl) };
      });
      return;
    }

    if (kind === "gallery") {
      const dataUrls = await Promise.all(files.map(file => readImageAsCompressedDataUrl(file)));
      setMedia(prev => {
        const remainingSlots = MAX_GALLERY_IMAGES - prev.galleryImages.length;
        const nextGallery = files.slice(0, remainingSlots).map((file, index) => createFileItem(file, dataUrls[index]));
        return { ...prev, galleryImages: [...prev.galleryImages, ...nextGallery] };
      });
    }
  };

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Story &amp; Media</h2>
      <p className="text-[13px] text-gray-400 mb-6">Tell backers what you are building, then upload the visuals that show it.</p>

      <div className="flex flex-col gap-5 mb-8">
        <div className="text-[14px] font-bold text-gray-900">Project Story <span className="font-normal text-gray-400">(optional)</span></div>
        {STORY_FIELDS.map(field => (
          <div key={field.key}>
            <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1">{field.label}</label>
            <p className="text-[12px] text-gray-400 mb-1.5">{field.hint}</p>
            <textarea
              value={story[field.key]}
              onChange={e => setStory({ ...story, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[14px] outline-none focus:border-brand min-h-[110px] resize-y transition-colors leading-relaxed"
            />

            {/* The bullet highlights render under "Our Solution" on the project page, so
                the editor for them lives with that field rather than in its own step. */}
            {field.key === "solution" && (
              <div className="mt-3 border-l-2 border-gray-100 pl-3">
                <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1.5">
                  KEY POINTS <span className="font-normal normal-case tracking-normal">(optional)</span>
                </div>
                <div className="flex flex-col gap-2">
                  {story.bullets.map((b, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <input
                        value={b.title}
                        onChange={e => {
                          const next = [...story.bullets];
                          next[i] = { ...next[i], title: e.target.value };
                          setStory({ ...story, bullets: next });
                        }}
                        placeholder="Short label"
                        className="w-1/3 border border-gray-200 rounded-md px-2.5 py-2 text-[13px] outline-none focus:border-brand transition-colors"
                      />
                      <input
                        value={b.desc}
                        onChange={e => {
                          const next = [...story.bullets];
                          next[i] = { ...next[i], desc: e.target.value };
                          setStory({ ...story, bullets: next });
                        }}
                        placeholder="One sentence explaining it"
                        className="flex-1 border border-gray-200 rounded-md px-2.5 py-2 text-[13px] outline-none focus:border-brand transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setStory({ ...story, bullets: story.bullets.filter((_, j) => j !== i) })}
                        className="text-gray-400 hover:text-brand bg-transparent border-none cursor-pointer px-1 py-2 text-[14px]"
                        aria-label="Remove key point"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStory({ ...story, bullets: [...story.bullets, { title: "", desc: "" }] })}
                  className="mt-2 text-[12px] font-bold text-brand bg-transparent border-none cursor-pointer p-0 hover:underline"
                >
                  + Add a key point
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

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
                  <div className="text-[11px] text-gray-400">{formatFileSize(submittedSize(media.coverImage))}</div>
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
          {/* A link, with no upload option beside it. Images are stored base64 inside
              the project row, so a 50MB video would be far past the body limit and the
              file would never reach the server: an upload control here would be the one
              route through this required step that guaranteed the video was lost. It
              comes back when uploads move to a real file store. */}
          <div className="text-[14px] font-bold text-gray-900 mb-1">Project Video</div>
          <p className="text-[12px] text-gray-400 mb-3">Paste a link to your pitch video on YouTube or Vimeo.</p>
          <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">Video URL</label>
          <input value={media.videoUrl} onChange={e => setMedia(prev => ({ ...prev, videoUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors mb-2" />
          <p className="text-[11px] text-gray-400">Shown on your project page. Any other link is kept as a plain link.</p>
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
  const [newMember, setNewMember] = useState({ name: "", role: "", email: "" });
  const [memberError, setMemberError] = useState(null);

  // The same rules the editor applies, so a team list means the same thing whether it was
  // typed here or corrected later. The role is required here and not there, because this
  // form has always asked for one.
  const addMember = () => {
    const problem =
      validateTeamMember(newMember) || (newMember.role ? null : "Choose a role for this member.");

    if (problem) {
      setMemberError(problem);
      return;
    }

    setMemberError(null);
    setTeam([
      ...team,
      { ...newMember, name: newMember.name.trim(), email: newMember.email.trim(), id: Date.now() },
    ]);
    setNewMember({ name: "", role: "", email: "" });
  };
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
            <input value={newMember.name} onChange={e => { setNewMember({ ...newMember, name: e.target.value }); setMemberError(null); }} placeholder="e.g., Dr. Jane Smith" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">PROJECT ROLE</label>
            <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none bg-white focus:border-brand transition-colors">
              <option value="">Select a role...</option>
              {Object.keys(ROLE_BADGE).map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 tracking-widest block mb-1">EMAIL</label>
            <input value={newMember.email} onChange={e => { setNewMember({ ...newMember, email: e.target.value }); setMemberError(null); }} placeholder="name@example.com" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
          </div>
          <button onClick={addMember} className="w-full sm:w-9 h-9 bg-brand hover:bg-red-800 text-white border-none rounded-md text-lg cursor-pointer flex items-center justify-center transition-colors self-end mt-2 sm:mt-0">+</button>
        </div>
        {memberError && <p role="alert" className="mx-0 mt-2 mb-0 text-[12px] text-brand">{memberError}</p>}
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
                <div className="text-[11px] text-gray-400">{m.email || "No email"}</div>
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

// Support Levels, "project_tiers" in the database. They are not rewards.
//
// A level is a minimum contribution plus the lines saying what choosing it signals. The
// backer is the one making a statement, and the creator owes nothing back: Class Coins
// have no real-world value and creators never receive them, so the platform must not
// imply anything is being bought. Every label and placeholder below is worded to push
// the creator into that voice, since no validation can read intent.
function Step4({ tiers, setTiers }) {
  const [newTier, setNewTier] = useState({ name: "", amount: "", bullets: [""] });
  const [editingTierId, setEditingTierId] = useState(null);
  const [tierError, setTierError] = useState("");

  const atLimit = tiers.length >= MAX_TIERS && editingTierId === null;

  const updateBullet = (i, val) => { const u = [...newTier.bullets]; u[i] = val; setNewTier({ ...newTier, bullets: u }); };
  const resetTierForm = () => { setEditingTierId(null); setNewTier({ name: "", amount: "", bullets: [""] }); setTierError(""); };

  const saveTier = () => {
    const nextTier = { ...newTier, id: editingTierId ?? Date.now() };
    const nextList = editingTierId
      ? tiers.map(tier => (tier.id === editingTierId ? nextTier : tier))
      : [...tiers, nextTier];

    // The same function the backend and EditProject use, so a level cannot pass here and
    // be refused there. It validates the whole list rather than one level, which is what
    // catches duplicate minimums and the level limit.
    const problem = validateTiers(nextList);
    if (problem) { setTierError(problem); return; }

    setTiers(nextList);
    resetTierForm();
  };

  const editTier = tier => {
    setEditingTierId(tier.id);
    setTierError("");
    setNewTier({
      name: tier.name,
      amount: tier.amount,
      bullets: tier.bullets.length > 0 ? [...tier.bullets] : [""]
    });
  };

  const deleteTier = tierId => {
    setTiers(prev => prev.filter(tier => tier.id !== tierId));
    if (editingTierId === tierId) resetTierForm();
  };

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Support Levels <span className="font-normal text-gray-400">(Optional)</span></h2>
      <p className="text-[13px] text-gray-400 mb-1 leading-relaxed">
        Levels let backers tell you how far they want to get involved. Each one is a minimum
        number of Class Coins plus the lines describing what choosing it says.
      </p>
      <p className="text-[13px] text-gray-400 mb-6 leading-relaxed italic">
        These are not rewards - you are not promising to deliver anything. Write what the
        backer is signalling, not what they receive. Up to {MAX_TIERS} levels.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-[14px] font-bold text-gray-900">{editingTierId ? "Edit Level" : "Create New Level"}</div>
            {editingTierId && <div className="text-[11px] font-bold text-brand uppercase tracking-widest">Editing saved level</div>}
          </div>
          <div className="mb-3.5">
            <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">LEVEL NAME</label>
            <input value={newTier.name} onChange={e => setNewTier({ ...newTier, name: e.target.value })} placeholder="e.g., Pilot partner" className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors" />
          </div>
          <div className="mb-3.5">
            <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">MINIMUM (CC)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">CC</span>
              <input value={newTier.amount} onChange={e => setNewTier({ ...newTier, amount: e.target.value })} placeholder="250" className="w-full border border-gray-200 rounded-md pl-10 pr-3 py-2.5 text-[13px] outline-none focus:border-brand transition-colors" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-[11px] font-bold text-gray-400 tracking-widest block mb-1.5">WHAT THIS LEVEL SIGNALS</label>
            {newTier.bullets.map((b, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <span className="text-brand text-sm">›</span>
                {/* Placeholders in the backer's voice, since they are the only
                    thing steering a creator away from typing "free t-shirt". */}
                <input value={b} onChange={e => updateBullet(i, e.target.value)} placeholder={i === 0 ? "I want to trial this on my own campus" : "I am happy to be interviewed for 30 minutes"} className="flex-1 border border-gray-200 rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-brand transition-colors" />
                {i > 0 && <button onClick={() => setNewTier({ ...newTier, bullets: newTier.bullets.filter((_, idx) => idx !== i) })} className="bg-transparent border-none cursor-pointer text-gray-300 hover:text-gray-500 text-base">×</button>}
              </div>
            ))}
            <button onClick={() => setNewTier({ ...newTier, bullets: [...newTier.bullets, ""] })} className="bg-transparent border-none text-[12px] text-brand font-bold cursor-pointer hover:underline">+ ADD ANOTHER LINE</button>
          </div>
          {tierError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-brand">{tierError}</div>
          )}
          {atLimit && !tierError && (
            <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-500">
              You have all {MAX_TIERS} levels. Edit or remove one to add another.
            </div>
          )}
          <div className="flex justify-end gap-2.5">
            <button onClick={resetTierForm} className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[12px] text-gray-600 cursor-pointer hover:bg-gray-50">CLEAR</button>
            <button onClick={saveTier} disabled={atLimit} className={`border-none rounded-md px-5 py-2 text-[12px] font-bold text-white transition-colors ${atLimit ? "bg-gray-300 cursor-not-allowed" : "bg-[#1a1a5c] hover:bg-blue-900 cursor-pointer"}`}>{editingTierId ? "UPDATE LEVEL" : "SAVE LEVEL"}</button>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-3">PROJECT PAGE PREVIEW</div>
          {tiers.length > 0 ? tiers.map((t, i) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-2.5">
              <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-1">LEVEL {i + 1}</div>
              <div className="text-lg font-extrabold text-gray-900 mb-1">{t.name}</div>
              <div className="text-[22px] font-extrabold text-gray-900 mb-2.5">{t.amount} CC <span className="text-[13px] font-normal text-gray-400">or more</span></div>
              {t.bullets.filter(Boolean).map((b, bi) => (
                <div key={bi} className="flex gap-2 text-[12px] text-gray-600 mb-1"><span className="text-brand">›</span>{b}</div>
              ))}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => editTier(t)}
                  className="rounded-md bg-[#1a1a5c] px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-blue-900"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteTier(t.id)}
                  className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          )) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-7 text-center">
              <div className="text-[12px] text-gray-300">NEW LEVEL PREVIEW WILL APPEAR HERE</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step5({ basicData, story, media, team, tiers, owner, onEdit }) {
  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Review & Submit</h2>
      <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">Confirm everything is ready before sending your project for approval.</p>

      {/* The last screen before data is written under somebody else's name, so it
          says whose rather than leaving it to be remembered from step 1. */}
      {owner && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg px-4 py-3 mb-4 text-[13px] text-blue-900 leading-relaxed">
          This project will belong to <strong>{owner.name}</strong> ({owner.email}).
          You are creating it on their behalf.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1">BASIC INFORMATION</div>
              <div className="text-lg font-extrabold text-gray-900">{basicData.title || "Untitled project"}</div>
            </div>
            <button type="button" onClick={() => onEdit(1)} className="text-[12px] font-bold text-brand hover:underline">Edit</button>
          </div>
          {/* One column, since there is no funding goal to sit beside School. */}
          <div className="text-[13px] text-gray-600">
            <div><span className="text-gray-400">School:</span> {basicData.school || "—"}</div>
          </div>
          <div className="mt-4 text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{basicData.proposition || "No value proposition added yet."}</div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1">PROJECT STORY</div>
              <div className="text-lg font-extrabold text-gray-900">
                {STORY_FIELDS.some(f => hasText(story[f.key])) ? "Sections backers will read" : "No story sections added"}
              </div>
            </div>
            <button type="button" onClick={() => onEdit(2)} className="text-[12px] font-bold text-brand hover:underline">Edit</button>
          </div>
          <div className="flex flex-col gap-4">
            {STORY_FIELDS.map(field => (
              <div key={field.key}>
                <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-1">{field.label}</div>
                <div className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
                  {hasText(story[field.key]) ? story[field.key] : <span className="text-gray-300">Left blank — this section will not appear on the project page.</span>}
                </div>
              </div>
            ))}
          </div>
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
              <div>{media.videoUrl || "Not provided"}</div>
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
                  <div className="text-[11px] text-gray-400">{member.email || "No email"}</div>
                </div>
                <span className={`self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-sm ${ROLE_BADGE[member.role] || "bg-gray-100 text-gray-600"}`}>{member.role}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-1">SUPPORT LEVELS</div>
              <div className="text-lg font-extrabold text-gray-900">{tiers.length > 0 ? `${tiers.length} level${tiers.length > 1 ? "s" : ""}` : "No levels added"}</div>
            </div>
            <button type="button" onClick={() => onEdit(4)} className="text-[12px] font-bold text-brand hover:underline">Edit</button>
          </div>
          {tiers.length > 0 ? (
            <div className="flex flex-col gap-3">
              {tiers.map(tier => (
                <div key={tier.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[13px] font-bold text-gray-900">{tier.name}</div>
                  <div className="text-[12px] text-gray-500 mb-2">{tier.amount} CC minimum</div>
                  <div className="flex flex-wrap gap-2">
                    {tier.bullets.filter(Boolean).map(line => (
                      <span key={line} className="rounded-full bg-white border border-gray-200 px-2.5 py-1 text-[12px] text-gray-600">{line}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-gray-400">You can submit without support levels and add them later from Edit Project.</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function CreateProject() {
  // The draft is scoped to the signed-in account, so one person's half-written project
  // is never handed to whoever signs in next on the same machine. A derived value rather
  // than a ref: user.id cannot change while this page is mounted, since the route sits
  // behind RequireAccess and signing out unmounts it.
  const { user, canCreateForOthers } = useAuth();
  const draftKey = draftStorageKey(user?.id);
  const storedDraft = getStoredDraft(draftKey);
  // Who the project will belong to. Only an admin sets it: a creator owns what they
  // create, and the service refuses a creator who sends creator_id at all.
  const [ownerId, setOwnerId] = useState(storedDraft?.ownerId ?? "");
  const [creators, setCreators] = useState([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [creatorsError, setCreatorsError] = useState(null);
  const [step, setStep] = useState(storedDraft?.step ?? 1);
  const [basicData, setBasicData] = useState(storedDraft?.basicData ?? { title: "", school: "", proposition: "" });
  const [media, setMedia] = useState(storedDraft?.media ? restoreMedia(storedDraft.media) : { coverImage: null, videoUrl: "", galleryImages: [] });
  const [story, setStory] = useState(
    storedDraft?.story
      ? { bullets: [], ...storedDraft.story }
      : { challenge: "", solution: "", funding: "", bullets: [] }
  );
  const [team, setTeam] = useState(storedDraft?.team ?? MOCK_TEAM);
  // Empty rather than a seeded example, so no project starts with a level its creator
  // never wrote. Older drafts store the lines under `privileges`, so read both names and
  // write one; otherwise restoring an old draft renders a level with no bullets.
  const [tiers, setTiers] = useState(() =>
    (storedDraft?.tiers ?? []).map(tier => ({
      ...tier,
      bullets: tier.bullets ?? tier.privileges ?? [],
      privileges: undefined,
    }))
  );
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Request in flight. Drives the button label and its disabled state.
  const [submitting, setSubmitting] = useState(false);
  // The real double-submit latch, and it has to be a ref rather than the state above.
  // State updates are asynchronous, so two clicks in the same tick both read a stale
  // `submitting === false` and both fire a POST; `disabled` doesn't help either, since
  // React has not re-rendered yet. A ref changes synchronously, so the second call sees
  // the lock immediately.
  const submitLockRef = useRef(false);
  // "Draft restored" only when there is something to restore. Autosave writes on mount,
  // so opening this page and leaving stores an empty draft, and announcing that over a
  // blank form on the next visit reads as a bug.
  const [hasRestoredDraft, setHasRestoredDraft] = useState(() => draftHasContent(storedDraft));
  const navigate = useNavigate();

  useEffect(() => {
    // Stop autosaving once the project is away, or this effect writes the draft straight
    // back over the one handleSubmit just cleared.
    if (isSubmitted) return;

    saveDraftToStorage(draftKey, {
      step,
      ownerId,
      basicData,
      story,
      media: serializeMedia(media),
      team,
      tiers,
    });
  }, [draftKey, ownerId, basicData, story, media, step, team, tiers, isSubmitted]);

  // Only an admin can call GET /admin/users, and only an admin needs the list, so this
  // never fires for a creator.
  useEffect(() => {
    if (!canCreateForOthers) return;

    let cancelled = false;
    (async () => {
      // Inside the async body rather than the effect body, where a synchronous setState
      // would cost an extra render pass for nothing.
      setCreatorsLoading(true);
      try {
        const rows = await adminApi.getAllUsers();
        if (cancelled) return;
        // Active CREATOR accounts only, which are the two conditions the service checks
        // before accepting the id. The dropdown cannot offer a choice submit refuses.
        setCreators(
          (rows || [])
            .map(toAdminUser)
            .filter(u => u.isActive && u.roles.includes("CREATOR"))
        );
        setCreatorsError(null);
      } catch (err) {
        if (!cancelled) {
          setCreators([]);
          setCreatorsError(
            errorMessage(err, "Could not load creator accounts")
          );
        }
      } finally {
        if (!cancelled) setCreatorsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [canCreateForOthers]);

  useEffect(() => {
    if (!hasRestoredDraft) return;

    const timer = window.setTimeout(() => setHasRestoredDraft(false), 3000);
    return () => window.clearTimeout(timer);
  }, [hasRestoredDraft]);

  useEffect(() => {
    return () => {
      if (media.coverImage?.preview && isObjectUrl(media.coverImage.preview)) URL.revokeObjectURL(media.coverImage.preview);
      media.galleryImages.forEach(image => {
        if (image.preview && isObjectUrl(image.preview)) URL.revokeObjectURL(image.preview);
      });
    };
  }, [media.coverImage, media.galleryImages]);

  // The chosen creator as a whole record, for the lines that name them in step 5 and in
  // the success dialog. Null both for a creator filing their own project and for an admin
  // who has not chosen yet, and neither should show an on-behalf banner.
  const selectedOwner =
    canCreateForOthers && ownerId
      ? creators.find(c => String(c.id) === String(ownerId)) || null
      : null;

  const validateStep = targetStep => {
    if (targetStep === 1) {
      // Checked first, because it decides whose project this is and everything below
      // describes that project. A creator never reaches this branch.
      if (canCreateForOthers && !String(ownerId)) {
        return "Choose which creator this project will belong to.";
      }
      if (!hasText(basicData.title)) return "Add a project title before continuing.";
      if (!hasText(basicData.school)) return "Choose a school or department before continuing.";
      if (!hasText(basicData.proposition)) return "Add your value proposition before continuing.";
    }

    if (targetStep === 2) {
      if (!media.coverImage) return "Upload a cover image before continuing.";
      if (!hasText(media.videoUrl)) return "Add a link to your project video before continuing.";
      // isLinkable is the same check ProjectDetail uses before putting the value in an
      // href, so the form and the page cannot disagree about what counts as a link.
      // Without it, any text passed this step and was stored as the project's video.
      if (!isLinkable(media.videoUrl)) return "That video link does not look like a web address — it should start with https://";
      if (media.galleryImages.length === 0) return "Upload at least one prototype gallery image before continuing.";
    }

    if (targetStep === 3) {
      if (team.length === 0) return "Add at least one team member before continuing.";
    }

    if (targetStep === 4) {
      // The same function the level form and the backend use, so a project cannot pass
      // this step and then be refused by the API.
      const tierProblem = validateTiers(tiers);
      if (tierProblem) return tierProblem;
    }

    return "";
  };

  // Neither of these clears isSubmitted. The success modal covers the page, so they are
  // unreachable after a submit, and clearing the flag would re-arm SUBMIT and restart
  // autosave: the duplicate-project bug over again.
  const goToStep = targetStep => {
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
    const validation = validateStep(step);
    if (validation) {
      setMessage(validation);
      return;
    }

    setMessage("");
    setStep(current => Math.min(STEPS.length, current + 1));
  };

  const handlePrimaryFooterAction = () => {
    // Same reasoning as goToStep and advanceStep: the modal covers the footer, so BACK
    // cannot be clicked after a submit, and clearing the flag would re-arm SUBMIT.
    if (step === STEPS.length) {
      setMessage("");
      setStep(STEPS.length - 1);
      return;
    }

    // `story` has to be included here as well as in the autosave effect. Clicking SAVE
    // DRAFT changes none of that effect's dependencies, so it does not re-run and this
    // write is the last one to land.
    saveDraftToStorage(draftKey, {
      step,
      ownerId,
      basicData,
      story,
      media: serializeMedia(media),
      team,
      tiers,
    });

    setMessage("Draft saved locally. Continue when you're ready.");
  };

  const handleSubmit = async () => {
    // Checked and taken synchronously, before any await, so two clicks cannot both get
    // through. Released only on failure: a success keeps it latched for the life of the
    // component, so this form creates at most one project.
    if (submitLockRef.current) return;

    const requiredStepError = [1, 2, 3, 4].map(validateStep).find(Boolean);
    if (requiredStepError) {
      setMessage(requiredStepError);
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setMessage("");
    try {
      // The backend accepts title, description, category, image_url, team_members,
      // challenge, solution, funding_usage, gallery, solution_bullets and video_url.
      //
      // It picks the semester itself from the day of the submit; it cannot be sent or
      // chosen here. Outside a teaching period the request comes back 409 naming the
      // date the next one opens, which lands in `setMessage` like any other server
      // error, and the draft is autosaved so nothing typed is lost in the meantime.
      await projectApi.createProject({
        title: basicData.title.trim(),
        description: basicData.proposition.trim(),
        category: toCategory(basicData.school),
        // Sent only by an admin. The service refuses a creator who sends it and an
        // admin who does not, so it is never optional on either side.
        ...(canCreateForOthers ? { creator_id: Number(ownerId) } : {}),
        image_url: media.coverImage?.dataUrl || media.coverImage?.preview || "",
        team_members: team.map(m => ({ name: m.name, role: m.role, email: m.email })),
        challenge: story.challenge.trim(),
        solution: story.solution.trim(),
        funding_usage: story.funding.trim(),
        // The same data-URL treatment the cover image gets, so the gallery survives the
        // submit.
        gallery: media.galleryImages
          .map(img => img.dataUrl || img.preview)
          .filter(Boolean),
        video_url: media.videoUrl.trim(),
        solution_bullets: story.bullets
          .filter(b => b.title.trim() && b.desc.trim())
          .map(b => ({ title: b.title.trim(), desc: b.desc.trim() })),
        // The service inserts the project and its levels in one transaction, so a level
        // that fails validation rolls the whole project back rather than leaving the
        // creator believing they saved levels that do not exist.
        tiers: tiers.map(tier => ({
          name: tier.name.trim(),
          min_amount: parseAmount(tier.amount, { integer: true }),
          bullets: tier.bullets.map(b => b.trim()).filter(Boolean),
        })),
      });

      // Clear the draft before flipping isSubmitted, so there is no render in between
      // where the autosave effect could write it back.
      clearDraftFromStorage(draftKey);

      setMessage("");
      setIsSubmitted(true);
    } catch (err) {
      // Stay on the form: the draft is intact and the error is usually retryable, so
      // release the latch and put SUBMIT back rather than stranding the work. This is
      // the only place the latch is released.
      submitLockRef.current = false;
      setMessage(errorMessage(err, "Could not submit the project"));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    // No isSubmitted branch here. An inline success panel would leave the footer's
    // SUBMIT button live underneath it, which is how a second click produced a duplicate
    // project. Success is a modal, and leaving is the only way out of it.
    switch (step) {
      case 1: return (
        <Step1
          data={basicData}
          setData={setBasicData}
          ownerPicker={canCreateForOthers ? (
            <OwnerPicker
              creators={creators}
              loading={creatorsLoading}
              error={creatorsError}
              ownerId={ownerId}
              setOwnerId={setOwnerId}
            />
          ) : null}
        />
      );
      case 2: return <Step2 media={media} setMedia={setMedia} story={story} setStory={setStory} />;
      case 3: return <Step3 team={team} setTeam={setTeam} />;
      case 4: return <Step4 tiers={tiers} setTiers={setTiers} />;
      case 5: return <Step5 basicData={basicData} story={story} media={media} team={team} tiers={tiers} owner={selectedOwner} onEdit={goToStep} />;
      default: return <div className="text-gray-400 text-sm">Step {step} — coming soon.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 h-13 flex items-center justify-between px-4 md:px-10">
        <div className="text-[15px] font-extrabold text-brand tracking-widest py-3">RMIT LAUNCHPAD</div>
        <button onClick={() => navigate(-1)} className="bg-transparent border-none text-[13px] text-gray-400 cursor-pointer hover:text-gray-600">× CANCEL</button>
      </header>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-12">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-gray-900 mb-1">Create Project</div>
          <div className="text-[12px] text-gray-400 mb-4 md:mb-6">Submit your proposal for review.</div>
          <StepIndicator steps={STEPS} current={step} />
          {hasRestoredDraft && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-700">
              Draft restored from your previous session.
            </div>
          )}
          {message && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{message}</div>}
        </div>
        <div className="min-w-0">
          {renderStep()}
          <div className="flex flex-col sm:flex-row gap-3 justify-between mt-9 pt-5 border-t border-gray-100">
            <button
              onClick={handlePrimaryFooterAction}
              disabled={submitting}
              className="bg-white border border-gray-200 rounded-md px-6 py-2.5 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === STEPS.length ? "← BACK" : "SAVE DRAFT"}
            </button>
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 w-full sm:w-auto">
              {step > 1 && step < STEPS.length && (
                <button onClick={() => setStep(s => s - 1)} className="bg-white border border-gray-200 rounded-md px-5 py-2.5 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto">← Back</button>
              )}
              {step < STEPS.length ? (
                <button onClick={advanceStep} className="bg-brand hover:bg-red-800 text-white border-none rounded-md px-7 py-2.5 text-[13px] font-bold cursor-pointer transition-colors w-full sm:w-auto">NEXT STEP →</button>
              ) : (
                // Disabled while the request is open. The visible half of the
                // double-submit guard, so nobody clicks a button that looks idle.
                <button
                  onClick={handleSubmit}
                  disabled={submitting || isSubmitted}
                  className={`border-none rounded-md px-7 py-2.5 text-[13px] font-bold transition-colors w-full sm:w-auto ${
                    submitting || isSubmitted
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : "bg-brand hover:bg-red-800 text-white cursor-pointer"
                  }`}
                >
                  {submitting ? "SUBMITTING…" : "SUBMIT PROJECT FOR APPROVAL ▶"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSubmitted && (
        <SubmitSuccessModal
          title={basicData.title.trim()}
          onBehalf={selectedOwner?.name || null}
          adminFiling={canCreateForOthers}
          onGoToProjects={() =>
            navigate(canCreateForOthers ? "/admin-dashboard" : "/creator-my-projects")
          }
        />
      )}
    </div>
  );
}