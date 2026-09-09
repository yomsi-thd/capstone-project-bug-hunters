// The brand-red circle with a white tick at the top of a success dialog, shared by the
// investment and registration dialogs. A new backer sees both within one flow, so they
// have to match.
//
// CreateProject's SubmitSuccessModal does not use this. Its tick is green, because that
// dialog reports something sent for review rather than completed, and brand red there
// would promise the project is already live.
export default function SuccessCheck() {
  return (
    <div className="mx-auto mb-5 flex h-15 w-15 items-center justify-center rounded-full bg-brand">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}
