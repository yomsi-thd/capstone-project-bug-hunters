import { useState } from "react";

import Modal from "../ui/Modal";
import * as classCoinApi from "../../api/classCoinApi";
import { errorMessage } from "../../api/apiError";
import { NOTE_MAX_LENGTH, validateNote } from "./coinRequestRules";

// Asks an admin for Class Coins. Opened from the Account page and from the invest
// modal's empty-wallet state, so it knows nothing about any project and takes no project
// prop.
//
// The note is required by design. The admin reviewing the queue does not know who is
// asking, so a name and an email alone would leave nothing to judge by and the queue
// would become a rubber stamp.
export default function RequestCoinsModal({ onClose, onSent }) {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  // The error only appears after the first attempt. Telling somebody they are wrong
  // before they have typed anything is rude.
  const [tried, setTried] = useState(false);

  const noteError = validateNote(note);
  const remaining = NOTE_MAX_LENGTH - note.trim().length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTried(true);

    if (noteError) return;

    setSending(true);
    setError(null);

    try {
      const result = await classCoinApi.requestCoins(note.trim());
      onSent?.(result.request);
    } catch (err) {
      setError(errorMessage(err, "Could not send your request"));
      setSending(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={480} closable={!sending} panelClassName="p-7">
      <h2 className="mb-1 text-[20px] font-extrabold text-gray-900">Request Class Coins</h2>
      <p className="mb-5 text-[13px] leading-relaxed text-neutral-500">
        Class Coins measure how popular an idea is — they have no real-world value. Tell the
        administrator who you are and why you would like some, and they will decide how many
        to issue.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <label
          htmlFor="coin-request-note"
          className="mb-1.5 block text-[11px] font-bold tracking-wide text-neutral-400"
        >
          WHY DO YOU NEED CLASS COINS?
        </label>
        <textarea
          id="coin-request-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          autoFocus
          disabled={sending}
          placeholder="e.g. I am a parent invited to the Semester 2 showcase."
          className="w-full resize-y rounded-md border border-gray-200 px-3 py-2.5 text-[14px] text-gray-700 outline-none transition-colors placeholder-gray-300 focus:border-brand disabled:bg-neutral-50"
        />

        <div className="mt-1.5 flex items-start justify-between gap-3">
          <span className="text-[12px] text-brand">{tried ? noteError : ""}</span>
          <span
            className={`shrink-0 text-[12px] ${remaining < 0 ? "text-brand" : "text-neutral-400"}`}
          >
            {remaining}
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-brand">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="flex-1 cursor-pointer rounded-md border border-gray-200 bg-white p-[13px] text-[14px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={sending}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border-none bg-brand p-[13px] text-[14px] font-bold text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_4px_12px_rgba(204,0,0,0.3)] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {sending && (
              <span className="lp-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" />
            )}
            {sending ? "SENDING…" : "SEND REQUEST"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
