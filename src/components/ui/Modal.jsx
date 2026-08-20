// The shared dialog frame.
//
// Before 20/08 ten modals across nine files built their own overlay, and they had drifted
// four ways — all four visible to a user:
//
//   · 4 of the 10 were missing the .lp-modal class, so they appeared with no entrance
//     animation while the other 6 eased in;
//   · z-index was 1000, 50 or 100 depending on the file, against a header at 100;
//   · the backdrop came in two opacities, black/40 and black/50;
//   · most had no max-height, so a long dialog overflowed a short screen with no way to
//     scroll to the buttons at the bottom.
//
// The z-index is deliberately ABOVE the header rather than a tidy z-50: a dialog that the
// nav bar can paint over is a dialog you can click through.
//
// ⚠️ `closable = false` is a behaviour in use, not a spare knob. AdminUserManagement locks
// its Manage Access dialog while it is saving roles, so that nobody dismisses it
// mid-write. Removing this prop would quietly reopen that hole.
//
// ⚠️ The four sidebar overlays and the header's mobile menu do NOT use this component.
// They are not dialogs: they already agree with each other, they sit BELOW the header on
// purpose, and they scroll with their own rules.
// `panelClassName` is for what a dialog genuinely owns — its padding, and the details that
// identify it, like the 5px brand rule across the top of the two success dialogs. It is
// NOT a way to re-do the frame: the overlay, the stacking order, the scroll behaviour and
// the entrance animation are exactly what this component exists to stop each screen from
// reinventing.
// `panelScroll = false` hands the scrolling back to the caller, and EditProject is why it
// exists: that dialog is a column with a fixed header and tab bar and a scrolling body, so
// letting the whole panel scroll instead would carry its tabs off the top of the screen.
//
// ⚠️ It is a PROP rather than something a caller overrides through panelClassName, because
// Tailwind classes do not resolve by their order in the string — `overflow-y-auto` and
// `overflow-hidden` would both be applied and which one won would depend on the order
// Tailwind happened to emit them in the stylesheet. This repo has no tailwind-merge.
export default function Modal({
  onClose,
  maxWidth = 500,
  closable = true,
  panelScroll = true,
  panelClassName = "",
  children,
}) {
  return (
    <div
      className="lp-overlay fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onClick={closable ? onClose : undefined}
    >
      <div
        className={`lp-modal relative w-full rounded-xl bg-white shadow-2xl ${panelScroll ? "max-h-full overflow-y-auto" : ""} ${panelClassName}`}
        // A runtime value, which is one of the three cases where inline style is still
        // the right answer (CODE-GUIDE §7.1).
        style={{ maxWidth: `${maxWidth}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
