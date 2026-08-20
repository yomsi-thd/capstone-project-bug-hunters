import { useState } from "react";
import CommentItem from "./CommentItem";

const PREVIEW_COUNT = 3;

/**
 * `onPost(text, parentId)` posts a comment and resolves true on success, so this
 * component only clears its box when the request actually landed. The parent owns the
 * data — it reloads the thread, which is what fills in the author name and the
 * CREATOR / BACKER badge the server derives.
 */
export default function CommentList({
  comments = [],
  totalComments = 0,
  isLoggedIn = false,
  onPost,
  error = null,
  // Closes the thread to new posts for a reason OTHER than being signed out — today
  // that is an archived project, whose comments the backend rejects. It is a separate
  // prop rather than `isLoggedIn={isLoggedIn && !archived}` because the two states need
  // different explanations: telling a signed-in reader to "sign in" would be a lie.
  // Existing comments stay readable either way.
  locked = false,
  lockedMessage = "This discussion is closed.",
}) {
  // One flag for every "can this person post" check below, so the box, the button and
  // the reply forms can never disagree about it.
  const canPost = isLoggedIn && !locked;
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [posting, setPosting] = useState(false);
  // id of the comment currently being replied to, or null.
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const visibleComments = expanded ? comments : comments.slice(0, PREVIEW_COUNT);

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    const ok = await onPost?.(text.trim(), null);
    setPosting(false);
    if (ok) setText("");
  };

  const handleReply = async (parentId) => {
    if (!replyText.trim() || posting) return;
    setPosting(true);
    const ok = await onPost?.(replyText.trim(), parentId);
    setPosting(false);
    if (ok) {
      setReplyText("");
      setReplyTo(null);
    }
  };

  return (
    <div>
      <h2 className="mx-0 mt-0 mb-5 text-[20px] font-extrabold text-neutral-900">
        Feedback &amp; Discussion
      </h2>

      {/* Leave a comment */}
      <div className="mb-7 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mx-0 mt-0 mb-2 text-[11px] font-bold tracking-[0.06em] text-neutral-500">
          LEAVE A COMMENT
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ask a question or share your thoughts with the team..."
          disabled={!canPost}
          className={`min-h-20 w-full resize-y border-none bg-transparent font-[inherit] text-[14px] leading-relaxed text-neutral-800 outline-none ${canPost ? "opacity-100" : "opacity-50"}`}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handlePost}
            disabled={!canPost || !text.trim() || posting}
            className="cursor-pointer rounded-[5px] border-none bg-brand px-5 py-2 text-[12px] font-bold tracking-[0.06em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_4px_12px_rgba(204,0,0,0.3)] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:hover:translate-y-0 disabled:hover:bg-neutral-300 disabled:hover:shadow-none"
          >
            {posting ? "POSTING…" : "POST COMMENT"}
          </button>
        </div>
        {error && (
          <div className="mt-2 text-[12px] text-brand">{error}</div>
        )}
        {/* `locked` is checked first: a signed-in reader on a closed thread must not be
            told to sign in. */}
        {locked ? (
          <div className="mt-2 text-[12px] text-neutral-400">
            {lockedMessage}
          </div>
        ) : !isLoggedIn && (
          <div className="mt-2 text-[12px] text-neutral-400">
            Sign in to join the discussion.
          </div>
        )}
      </div>

      {/* Comment list */}
      <div className="flex flex-col gap-5">
        {visibleComments.map(comment => (
          <div key={comment.id}>
            <CommentItem comment={comment} />
            {comment.replies?.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}

            {/* Replies are one level deep only — a reply has no Reply button of its
                own, matching what CommentItem can render. */}
            {canPost && (
              replyTo === comment.id ? (
                <div className="mt-3 pl-[46px]">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Reply to ${comment.author}…`}
                    autoFocus
                    className="min-h-[62px] w-full resize-y rounded-md border border-neutral-200 p-2.5 font-[inherit] text-[13px] leading-relaxed text-neutral-800 outline-none"
                  />
                  <div className="mt-1.5 flex justify-end gap-2">
                    <button
                      onClick={() => { setReplyTo(null); setReplyText(""); }}
                      className="cursor-pointer rounded-[5px] border border-neutral-200 bg-none px-3.5 py-1.5 text-[11px] font-semibold text-neutral-600"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyText.trim() || posting}
                      className="cursor-pointer rounded-[5px] border-none bg-brand px-4 py-1.5 text-[11px] font-bold tracking-[0.06em] text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                      {posting ? "POSTING…" : "REPLY"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 pl-[46px]">
                  <button
                    onClick={() => { setReplyTo(comment.id); setReplyText(""); }}
                    className="cursor-pointer border-none bg-none p-0 text-[12px] font-semibold text-neutral-500 transition-colors duration-150 hover:text-brand"
                  >
                    ↩ Reply
                  </button>
                </div>
              )
            )}

            <div className="mt-5 border-b border-neutral-100" />
          </div>
        ))}

        {comments.length === 0 && (
          <div className="py-2 text-[13px] text-neutral-400">
            No comments yet — be the first to ask the team something.
          </div>
        )}
      </div>

      {/* View all */}
      {!expanded && comments.length > PREVIEW_COUNT && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setExpanded(true)}
            className="cursor-pointer rounded-[5px] border border-neutral-200 bg-none px-6 py-2.5 text-[13px] font-semibold text-neutral-600 transition-all duration-150 hover:border-brand"
          >
            VIEW ALL {totalComments} COMMENTS
          </button>
        </div>
      )}
    </div>
  );
}
