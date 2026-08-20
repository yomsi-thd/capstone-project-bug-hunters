import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthInput from "../components/auth/AuthInput";
import useBreakpoint from "../hooks/useBreakpoint";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { isMobile } = useBreakpoint();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    // Email-only by Hiếu's decision (2026-08-06): users has no rmit_id column and
    // findByEmail is the only lookup, so an RMIT ID would just 401.
    if (!identifier.trim()) next.identifier = "Email is required";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // AuthContext.login() calls POST /api/auth/login and only falls back to a mock
  // account when the backend is unreachable. Hiếu's old handleBackendLogin was folded
  // into it — the whole app reads the session from the context, so that is the right
  // place for the API call.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const result = await login(identifier, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors({ password: result.error });
      return;
    }

    // RequireAccess sends the attempted path along, so a user bounced off a guarded
    // page lands back on it instead of on a generic dashboard.
    const from = location.state?.from;
    if (from) {
      navigate(from, { replace: true });
      return;
    }

    const roles = result.user?.roles || [];
    if (roles.includes("creator")) {
      navigate("/creator-dashboard");
    } else if (roles.includes("admin")) {
      navigate("/admin-dashboard");
    } else {
      navigate("/discover");
    }
  };

  return (
    <AuthLayout isMobile={isMobile}>
      <h1 className="mx-0 mt-0 mb-7 text-center text-[18px] font-bold text-neutral-800">
        Sign in to your account
      </h1>

      <form onSubmit={handleSubmit}>
        <AuthInput
          label="EMAIL"
          value={identifier}
          onChange={e => { setIdentifier(e.target.value); setErrors(p => ({ ...p, identifier: null })); }}
          placeholder="e.g. s1234567@rmit.edu.vn"
          error={errors.identifier}
        />

        <AuthInput
          label="PASSWORD"
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: null })); }}
          placeholder="••••••••"
          error={errors.password}
          rightSlot={
            <Link
              to="#"
              className="text-[12px] font-semibold text-brand no-underline transition-opacity hover:opacity-70"
            >
              Forgot Password?
            </Link>
          }
        />

        <label className="mb-[22px] flex cursor-pointer items-center gap-2 text-[13px] text-neutral-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="h-[15px] w-[15px] cursor-pointer accent-brand"
          />
          Remember me
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          /* The lift-and-shadow hover is Tailwind now rather than two mouse handlers.
             disabled: carries the submitting state, so "do not lift while submitting" is
             stated once instead of being re-tested inside the hover handler. */
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-brand p-3.5 text-[14px] font-bold tracking-[0.04em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_6px_16px_rgba(204,0,0,0.3)] disabled:cursor-default disabled:bg-[#e88a8a] disabled:hover:translate-y-0 disabled:hover:bg-[#e88a8a] disabled:hover:shadow-none"
        >
          {isSubmitting ? (
            <>
              <span className="lp-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" />
              SIGNING IN...
            </>
          ) : "LOGIN"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-[26px] flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-100" />
        <span className="text-[11px] font-semibold text-neutral-400">OR</span>
        <div className="h-px flex-1 bg-neutral-100" />
      </div>

      {/* SSO button */}
      <button
        type="button"
        onClick={() => {/* TODO: integrate RMIT SSO */}}
        /* The hover shadow is navy, not brand red, and that is deliberate: this is RMIT
           SSO rather than the app own primary action, and a red glow under a navy button
           would read as the same button painted twice. */
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-[#1a1a3d] p-[13px] text-[13px] font-bold tracking-[0.03em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#0d0d28] hover:shadow-[0_6px_16px_rgba(26,26,61,0.35)]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
        SIGN IN WITH RMIT SSO
      </button>

      {/* Register link */}
      <p className="mt-6 mb-0 text-center text-[13px] text-neutral-500">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-bold text-brand no-underline transition-opacity hover:opacity-70"
        >
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
