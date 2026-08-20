// The "SIGN IN / SIGN UP WITH RMIT SSO" button, shared by Login and Register.
//
// It was the same markup in both files, differing only in the word after WITH. That was
// already a duplicate before the Tailwind pass; converting it turned the duplicate into
// two copies of a 320-character class string, which is the version that actually drifts.
//
// ⚠️ The navy hover shadow is deliberate and must not be swapped for the brand red one the
// primary buttons use. This is RMIT's sign-in, not the app's own primary action, and a red
// glow under a navy button reads as one button painted two ways.
//
// It does nothing yet: SSO is not integrated. It stays on screen because both designs show
// it, and a button that visibly does nothing is a smaller problem than silently dropping a
// sign-in route the university expects — but it is worth remembering that this is the one
// control in the app that is still a placeholder.
export default function SsoButton({ label }) {
  return (
    <button
      type="button"
      onClick={() => {/* TODO: integrate RMIT SSO */}}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-[#1a1a3d] p-[13px] text-[13px] font-bold tracking-[0.03em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#0d0d28] hover:shadow-[0_6px_16px_rgba(26,26,61,0.35)]"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
      {label}
    </button>
  );
}
