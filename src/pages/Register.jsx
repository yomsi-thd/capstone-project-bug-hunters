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
    if (!identifier.trim()) {
      next.identifier = "RMIT ID or email is required";
    } else if (!/^s\d{7}$/i.test(identifier.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
      next.identifier = "Use a valid RMIT ID (e.g. s1234567) or email";
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
    // The backend only accepts an email — the users table has no rmit_id / username.
    // TODO: drop this guard once the backend supports signing up with an RMIT ID.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({
        identifier: "The API only accepts an email address for now — RMIT ID sign-up needs a backend change",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // The backend assigns the BACKER role and creates a ClassCoin wallet (4500 CC).
      // TODO: the Creator role request is still mock — there is no POST /role-requests
      // and no admin approval queue behind it.
      await authApi.register({ fullName: fullName.trim(), email, password });
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
      <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#333", textAlign: "center", margin: "0 0 4px" }}>
        Create your account
      </h1>
      <p style={{ fontSize: "13px", color: "#999", textAlign: "center", margin: "0 0 24px" }}>
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

        <AuthInput
          label="RMIT ID OR EMAIL"
          value={identifier}
          onChange={e => { setIdentifier(e.target.value); setErrors(p => ({ ...p, identifier: null })); }}
          placeholder="e.g. s1234567 or staff@rmit.edu.au"
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
        <div style={{ marginBottom: "22px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#888", marginBottom: "10px" }}>
            ACCOUNT TYPE
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#777", cursor: "default" }}>
              <input
                type="checkbox"
                checked
                disabled
                style={{ width: "15px", height: "15px", accentColor: "var(--color-brand)", marginTop: "1px", flexShrink: 0 }}
              />
              <span>
                <strong style={{ color: "#333" }}>Backer</strong> — support and invest in projects{" "}
                <span style={{ color: "#aaa" }}>(default, always on)</span>
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={requestCreator}
                onChange={e => setRequestCreator(e.target.checked)}
                style={{ width: "15px", height: "15px", accentColor: "var(--color-brand)", cursor: "pointer", marginTop: "1px", flexShrink: 0 }}
              />
              <span>
                <strong style={{ color: "#333" }}>Creator</strong> — publish and edit your own projects
                <span style={{ display: "block", fontSize: "12px", color: "#999", marginTop: "2px" }}>
                  Requires admin approval before you can publish.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "22px" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={e => { setAgreeTerms(e.target.checked); setErrors(p => ({ ...p, agreeTerms: null })); }}
              style={{ width: "15px", height: "15px", accentColor: "var(--color-brand)", cursor: "pointer", marginTop: "1px", flexShrink: 0 }}
            />
            <span>
              I agree to the{" "}
              <Link to="#" style={{ color: "var(--color-brand)", fontWeight: 600, textDecoration: "none" }}>Terms of Service</Link>
              {" "}and{" "}
              <Link to="#" style={{ color: "var(--color-brand)", fontWeight: 600, textDecoration: "none" }}>Privacy Policy</Link>
            </span>
          </label>
          {errors.agreeTerms && (
            <div style={{ fontSize: "12px", color: "var(--color-brand)", marginTop: "5px" }}>{errors.agreeTerms}</div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: "100%", background: isSubmitting ? "#e88a8a" : "var(--color-brand)",
            color: "#fff", border: "none", borderRadius: "8px",
            fontSize: "14px", fontWeight: 700, letterSpacing: "0.04em",
            padding: "14px", cursor: isSubmitting ? "default" : "pointer",
            transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
          onMouseEnter={e => {
            if (isSubmitting) return;
            e.currentTarget.style.background = "#aa0000";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(204,0,0,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isSubmitting ? "#e88a8a" : "var(--color-brand)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {isSubmitting ? (
            <>
              <span className="lp-spin" style={{
                width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff", borderRadius: "50%", display: "inline-block",
              }} />
              CREATING ACCOUNT...
            </>
          ) : "CREATE ACCOUNT"}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "26px 0" }}>
        <div style={{ flex: 1, height: "1px", background: "#eee" }} />
        <span style={{ fontSize: "11px", color: "#aaa", fontWeight: 600 }}>OR</span>
        <div style={{ flex: 1, height: "1px", background: "#eee" }} />
      </div>

      {/* SSO button */}
      <button
        type="button"
        onClick={() => {/* TODO: integrate RMIT SSO */}}
        style={{
          width: "100%", background: "#1a1a3d", color: "#fff", border: "none",
          borderRadius: "8px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.03em",
          padding: "13px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "#0d0d28";
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(26,26,61,0.35)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "#1a1a3d";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
        SIGN UP WITH RMIT SSO
      </button>

      {/* Login link */}
      <p style={{ textAlign: "center", fontSize: "13px", color: "#777", marginTop: "24px", marginBottom: 0 }}>
        Already have an account?{" "}
        <Link
          to="/login"
          style={{ color: "var(--color-brand)", fontWeight: 700, textDecoration: "none", transition: "opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
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
