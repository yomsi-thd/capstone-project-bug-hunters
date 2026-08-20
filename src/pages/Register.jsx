import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthInput from "../components/auth/AuthInput";
import RegisterSuccessModal from "../components/auth/RegisterSuccessModal";
import useBreakpoint from "../hooks/useBreakpoint";
import * as authApi from "../api/authApi";

export default function Register() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Everyone signs up as a Backer; Creator is an optional request that an
  // admin must approve before the user can publish projects.
  const [requestCreator, setRequestCreator] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    const next = {};
    if (!fullName.trim()) next.fullName = "Full name is required";
    // Hiếu confirmed on 2026-08-06 that sign-up is email-only — the users table has
    // no rmit_id column and there is no plan to add one, so the RMIT ID branch that
    // used to pass validation and then fail at submit time is gone.
    if (!identifier.trim()) {
      next.identifier = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
      next.identifier = "Enter a valid email address";
    }
    if (!password) {
      next.password = "Password is required";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    if (confirmPassword !== password) next.confirmPassword = "Passwords do not match";
    if (!agreeTerms) next.agreeTerms = "You must agree to the terms to continue";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const email = identifier.trim();

    setIsSubmitting(true);
    try {
      // The backend assigns the BACKER role and creates a ClassCoin wallet (4500 CC).
      // wantCreator writes a PENDING row into creator_requests; an admin approves it
      // from GET /admin/creator-requests, which is what actually grants CREATOR.
      // Ticking the box never grants the role by itself, so the "pending admin review"
      // message in RegisterSuccessModal is now literally true.
      await authApi.register({
        fullName: fullName.trim(),
        email,
        password,
        wantCreator: requestCreator,
      });
      setShowSuccess(true);
    } catch (err) {
      setErrors({
        identifier: err.response?.data?.message || err.message || "Registration failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <AuthLayout isMobile={isMobile}>
      <h1 className="mx-0 mt-0 mb-1 text-center text-[18px] font-bold text-neutral-800">
        Create your account
      </h1>
      <p className="mx-0 mt-0 mb-6 text-center text-[13px] text-neutral-400">
        Join RMIT Launchpad and start validating ideas.
      </p>

      <form onSubmit={handleSubmit}>
        <AuthInput
          label="FULL NAME"
          value={fullName}
          onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: null })); }}
          placeholder="e.g. Nguyen Van Huy"
          error={errors.fullName}
        />

        {/* Deliberately not type="email" — the browser's native validation bubble
            would pre-empt the custom error line rendered under the field. */}
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
          placeholder="At least 8 characters"
          error={errors.password}
        />

        <AuthInput
          label="CONFIRM PASSWORD"
          type="password"
          value={confirmPassword}
          onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: null })); }}
          placeholder="Re-enter your password"
          error={errors.confirmPassword}
        />

        {/* Account type: Backer is granted to everyone; Creator is an
            approval-gated request. Admin is intentionally NOT self-requestable
            here — it's provisioned by an existing admin (least privilege). */}
        <div className="mb-[22px]">
          <div className="mb-2.5 text-[11px] font-bold tracking-[0.08em] text-neutral-500">
            ACCOUNT TYPE
          </div>
          <div className="flex flex-col gap-2.5">
            {/* Backer is checked and disabled: everyone signs up as one. The row keeps
                cursor-default and a lighter text colour so it reads as a statement rather
                than a control somebody failed to click. */}
            <label className="flex cursor-default items-start gap-2 text-[13px] text-neutral-500">
              <input
                type="checkbox"
                checked
                disabled
                className="mt-px h-[15px] w-[15px] shrink-0 accent-brand"
              />
              <span>
                <strong className="text-neutral-800">Backer</strong> — support and invest in projects{" "}
                <span className="text-neutral-400">(default, always on)</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2 text-[13px] text-neutral-600">
              <input
                type="checkbox"
                checked={requestCreator}
                onChange={e => setRequestCreator(e.target.checked)}
                className="mt-px h-[15px] w-[15px] shrink-0 cursor-pointer accent-brand"
              />
              <span>
                <strong className="text-neutral-800">Creator</strong> — publish and edit your own projects
                <span className="mt-0.5 block text-[12px] text-neutral-400">
                  Requires admin approval before you can publish.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="mb-[22px]">
          <label className="flex cursor-pointer items-start gap-2 text-[13px] text-neutral-600">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={e => { setAgreeTerms(e.target.checked); setErrors(p => ({ ...p, agreeTerms: null })); }}
              className="mt-px h-[15px] w-[15px] shrink-0 cursor-pointer accent-brand"
            />
            <span>
              I agree to the{" "}
              <Link to="#" className="font-semibold text-brand no-underline">Terms of Service</Link>
              {" "}and{" "}
              <Link to="#" className="font-semibold text-brand no-underline">Privacy Policy</Link>
            </span>
          </label>
          {errors.agreeTerms && (
            <div className="mt-[5px] text-[12px] text-brand">{errors.agreeTerms}</div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-brand p-3.5 text-[14px] font-bold tracking-[0.04em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_6px_16px_rgba(204,0,0,0.3)] disabled:cursor-default disabled:bg-[#e88a8a] disabled:hover:translate-y-0 disabled:hover:bg-[#e88a8a] disabled:hover:shadow-none"
        >
          {isSubmitting ? (
            <>
              <span className="lp-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" />
              CREATING ACCOUNT...
            </>
          ) : "CREATE ACCOUNT"}
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
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-[#1a1a3d] p-[13px] text-[13px] font-bold tracking-[0.03em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#0d0d28] hover:shadow-[0_6px_16px_rgba(26,26,61,0.35)]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
        SIGN UP WITH RMIT SSO
      </button>

      {/* Login link */}
      <p className="mt-6 mb-0 text-center text-[13px] text-neutral-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-bold text-brand no-underline transition-opacity hover:opacity-70"
        >
          Login
        </Link>
      </p>
    </AuthLayout>

    {showSuccess && (
      <RegisterSuccessModal
        requestedRole={requestCreator ? "Creator" : null}
        onGoToLogin={() => navigate("/login")}
      />
    )}
    </>
  );
}
