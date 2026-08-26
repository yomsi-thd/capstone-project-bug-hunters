import { useState } from "react";
import Modal from "../ui/Modal";
import * as projectApi from "../../api/projectApi";
import { errorMessage } from "../../api/apiError";

/**
 * "Post Project Update", opened from the UPDATE button on a project card.
 *
 * POST /api/projects/:id/updates — the backend only accepts it from the project's own
 * creator (or an admin), so a backer opening this by other means gets a 400 back rather
 * than a silent no-op.
 *
 * `project` is required: an update with no project has nowhere to appear, so the caller
 * mounts this only when it has one (`{target && <PostUpdateModal project={target} …/>}`,
 * the same pattern as EditProject). Mounting per open is also what keeps the draft from
 * leaking between projects — closing unmounts the component, so the next open is empty.
 */
export default function PostUpdateModal({ project, onClose, onPosted }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const canPost = title.trim() && body.trim() && !posting;

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    try {
      await projectApi.postProjectUpdate(project.id, { title: title.trim(), body: body.trim() });
      onPosted?.();
      onClose?.();
    } catch (err) {
      setError(errorMessage(err, "Could not post this update"));
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={500} panelClassName="p-6">
        <button onClick={onClose} className="absolute top-4 right-4 bg-transparent border-none text-xl text-gray-400 hover:text-gray-600 cursor-pointer">×</button>

        <h2 className="text-lg font-extrabold text-gray-900 mb-1">Post Project Update</h2>
        <p className="text-[13px] text-gray-400 mb-4">
          For <span className="font-semibold text-gray-600">{project.title}</span>
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[12px] text-blue-700 mb-4 leading-relaxed">
          ℹ Updates are posted publicly on your project page for backers to read.
        </div>

        <div className="mb-3">
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">UPDATE TITLE</label>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setError(null); }}
            maxLength={200}
            placeholder="e.g., Prototype Phase 1 Completed!"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors"
          />
        </div>

        <div className="mb-4">
          <label className="text-[11px] font-bold text-gray-500 tracking-widest block mb-1.5">UPDATE CONTENT</label>
          <textarea
            value={body}
            onChange={e => { setBody(e.target.value); setError(null); }}
            placeholder="Share the details of your progress..."
            className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-[13px] min-h-[110px] resize-y outline-none focus:border-brand transition-colors leading-relaxed"
          />
        </div>

        {/* The rich-text toolbar and the media dropzone that used to sit here were
            removed: neither button did anything, and project_updates stores plain text
            with nowhere to keep an attachment. Bring them back with the backend. */}

        {error && (
          <div className="text-[12px] text-brand mb-4">{error}</div>
        )}

        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="bg-white border border-gray-200 rounded-md px-5 py-2 text-[13px] text-gray-600 cursor-pointer hover:bg-gray-50">CANCEL</button>
          <button
            onClick={handlePost}
            disabled={!canPost}
            className={`border-none rounded-md px-5 py-2 text-[13px] font-bold transition-colors ${
              canPost
                ? "bg-brand hover:bg-red-800 text-white cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {posting ? "POSTING…" : "POST UPDATE"}
          </button>
        </div>
    </Modal>
  );
}
