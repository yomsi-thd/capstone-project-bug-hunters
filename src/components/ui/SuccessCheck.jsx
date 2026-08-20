// The brand-red circle with a white tick, shown at the top of a success dialog.
//
// It was byte-identical in BackerInvestmentSuccessModal and RegisterSuccessModal — the
// same 60px circle, the same 28px stroke-3 polyline. Two copies of a decoration is not a
// crisis, but it is two places for the circle to stop matching, and the two dialogs sit
// one flow apart: a backer sees one right after the other on their first visit.
//
// ⚠️ CreateProject's SubmitSuccessModal deliberately does NOT use this. Its tick is green
// on a pale green disc, because that dialog reports something SENT FOR REVIEW rather than
// something completed — brand red there would promise the project is live.
export default function SuccessCheck() {
  return (
    <div className="mx-auto mb-5 flex h-15 w-15 items-center justify-center rounded-full bg-brand">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}
