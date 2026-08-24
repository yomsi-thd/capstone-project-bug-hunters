import { useEffect } from "react";
import { createPortal } from "react-dom";

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
  // Escape closes the dialog. Added 20/08 — this ADDS behaviour rather than moving style,
  // which is why it landed in its own commit.
  //
  // ⚠️ The listener goes on `document`, not on the panel. The panel takes no focus, so a
  // handler bound to it would silently do nothing until the user had already clicked
  // inside — which is the one case where they do not need a shortcut.
  //
  // It honours `closable`, so the three dialogs that must not be dismissed by accident
  // are not suddenly dismissable by keyboard instead.
  useEffect(() => {
    if (!closable) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closable, onClose]);

  // ⚠️ Rendered into document.body, and this is load-bearing rather than tidiness.
  //
  // `position: fixed` is resolved against the nearest ancestor carrying a transform,
  // filter, perspective, contain or will-change — not against the viewport. `.lp-reveal`
  // leaves `transform: matrix(1,0,0,1,0,0)` behind once its entrance animation finishes,
  // and an IDENTITY transform is still a transform for this purpose. So a Modal mounted
  // inside a revealed block (measured on ProjectDetail 24/08: the panel landed at
  // y = -414, entirely above the screen) shows a dark overlay and NO dialog.
  //
  // The nine modals that existed before this change all happened to be mounted at page
  // level, outside any `.lp-*` wrapper, which is the only reason nobody had hit it. The
  // portal removes the trap for every caller instead of asking each one to know about it.
  //
  // React still routes events through the React tree rather than the DOM tree, so the
  // stopPropagation below and every caller's handlers behave exactly as before.
  return createPortal(
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
    </div>,
    document.body
  );
}
