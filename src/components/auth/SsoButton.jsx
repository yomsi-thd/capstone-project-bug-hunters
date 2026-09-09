// The "SIGN IN / SIGN UP WITH RMIT SSO" button, shared by Login and Register, which
// differ only in the word after WITH.
//
// The navy hover shadow is deliberate and should not become the brand red the primary
// buttons use: this is RMIT's sign-in, not the app's own primary action.
//
// SSO is not integrated yet, so the button does nothing. It stays because both designs
// show it and the university expects that route, but it is the one placeholder control
// left in the app.
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
