import { useEffect } from "react";
import { createPortal } from "react-dom";

// The shared dialog frame: overlay, stacking order, scroll behaviour and entrance
// animation, so no screen has to rebuild them. Every modal in the app goes through it.
//
// The z-index sits above the header on purpose. A dialog the nav bar can paint over is
// a dialog you can click through.
//
// `closable = false` is in use, not a spare knob: AdminUserManagement locks its Manage
// Access dialog while roles are saving so nobody dismisses it mid-write.
//
// `panelClassName` is for what a dialog owns itself, such as its padding or the brand
// rule across the top of the success dialogs. It is not a way to redo the frame.
//
// `panelScroll = false` hands scrolling back to the caller. EditProject needs it: that
// dialog has a fixed header and tab bar over a scrolling body, and scrolling the whole
// panel would carry the tabs off the top of the screen. It is a prop rather than a
// class through panelClassName because Tailwind classes don't resolve by their order in
// the string, so overflow-y-auto and overflow-hidden would fight unpredictably.
//
// The sidebar overlays and the header's mobile menu don't use this component. They are
// not dialogs: they sit below the header and scroll by their own rules.
export default function Modal({
  onClose,
  maxWidth = 500,
  closable = true,
  panelScroll = true,
  panelClassName = "",
  children,
}) {
  // Escape closes the dialog. The listener goes on `document` rather than the panel,
  // which takes no focus: a handler bound there would do nothing until the user had
  // already clicked inside. It honours `closable`, so a locked dialog stays locked.
  useEffect(() => {
    if (!closable) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closable, onClose]);

  // Rendered into document.body, which is load-bearing rather than tidiness.
  //
  // `position: fixed` resolves against the nearest ancestor carrying a transform, not
  // against the viewport, and `.lp-reveal` leaves an identity transform behind once its
  // animation finishes. A modal mounted inside a revealed block therefore renders its
  // overlay somewhere off-screen: on screen that reads as "the page went dark and no
  // dialog appeared". The portal removes the trap for every caller.
  //
  // React still routes events through the React tree, so the stopPropagation below and
  // every caller's handlers behave as they would without the portal.
  return createPortal(
    <div
      className="lp-overlay fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onClick={closable ? onClose : undefined}
    >
      <div
        className={`lp-modal relative w-full rounded-xl bg-white shadow-2xl ${panelScroll ? "max-h-full overflow-y-auto" : ""} ${panelClassName}`}
        // A runtime value, one of the few cases where inline style beats a class.
        style={{ maxWidth: `${maxWidth}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
