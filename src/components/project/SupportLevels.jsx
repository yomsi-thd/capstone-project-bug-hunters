import EmptyState from "../ui/EmptyState";

/**
 * The read-only list of a project's Support Levels.
 *
 * Shared by THREE screens — ProjectDetail's tab, AdminApprovals' review panel and
 * EditProject's preview — because three hand-written copies of the same list are three
 * places to drift apart, and the admin's copy is the one that decides whether a project
 * gets approved.
 *
 * Tailwind, like the rest of the app since 20/08. It renders inside three very different
 * shells — a public tab, an admin review panel and an edit preview — so it deliberately
 * brings no page background or outer margin of its own.
 *
 * ⚠️ The explanatory line at the bottom is not decoration. A support level is a
 * COMMITMENT LEVEL, not a reward: the backer declares what they care about, and the
 * creator owes nothing — Class Coins have no real-world value and creators never receive
 * them, so the platform must not imply anything is being bought. Without that line the
 * data model is one thing and every reader assumes another.
 */
export default function SupportLevels({ levels, emptyMessage, compact = false }) {
  const list = Array.isArray(levels) ? levels : [];

  if (list.length === 0) {
    return (
      <EmptyState
        compact={compact}
        title="No support levels yet"
        detail={emptyMessage || "The creator has not set any levels for this project."}
      />
    );
  }

  return (
    <div>
      <ul className={`m-0 flex list-none flex-col p-0 ${compact ? "gap-2.5" : "gap-3.5"}`}>
        {list.map((level) => (
          <li
            key={level.id}
            className={`rounded-lg border border-neutral-200 bg-white ${compact ? "px-4 py-3.5" : "px-5 py-4.5"}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className={`font-extrabold text-neutral-900 ${compact ? "text-[14px]" : "text-[16px]"}`}>
                {level.name}
              </div>
              <div className={`font-extrabold whitespace-nowrap text-brand ${compact ? "text-[15px]" : "text-[18px]"}`}>
                {level.minAmount.toLocaleString()} CC
                <span className="text-[12px] font-normal text-neutral-400"> or more</span>
              </div>
            </div>

            {level.bullets.length > 0 && (
              <ul className="mx-0 mt-2.5 mb-0 flex list-none flex-col gap-1.5 p-0">
                {level.bullets.map((line, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-neutral-600">
                    <span className="shrink-0 text-brand">›</span>
                    {line}
                  </li>
                ))}
              </ul>
            )}

            {/* The count is the whole reason levels are worth recording: it answers
                "which level do people actually pick". Rendered even at 0 — an empty
                level is a real answer, and hiding it would make the busy ones look
                like the only ones that exist. */}
            <div className="mt-2.5 text-[11px] tracking-[0.04em] text-neutral-400">
              {level.backersCount === 0
                ? "No backers at this level yet"
                : `${level.backersCount} ${level.backersCount === 1 ? "backer" : "backers"} at this level`}
            </div>
          </li>
        ))}
      </ul>

      <p className="mx-0 mt-3.5 mb-0 text-[12px] leading-[1.7] text-neutral-400 italic">
        Levels tell the creator what backers care about — they are not rewards, and
        nothing is owed or shipped.
      </p>
    </div>
  );
}
