import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthInput from "../components/auth/AuthInput";
import RegisterSuccessModal from "../components/auth/RegisterSuccessModal";
import useWindowWidth from "../hooks/useWindowWidth";

export default function Register() {
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isMobile = w < 640;

  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // TODO: call authService.register({ fullName, identifier, password }) when backend is ready
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
    }, 600);
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

        <div style={{ marginBottom: "22px" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={e => { setAgreeTerms(e.target.checked); setErrors(p => ({ ...p, agreeTerms: null })); }}
              style={{ width: "15px", height: "15px", accentColor: "#cc0000", cursor: "pointer", marginTop: "1px", flexShrink: 0 }}
            />
            <span>
              I agree to the{" "}
              <Link to="#" style={{ color: "#cc0000", fontWeight: 600, textDecoration: "none" }}>Terms of Service</Link>
              {" "}and{" "}
              <Link to="#" style={{ color: "#cc0000", fontWeight: 600, textDecoration: "none" }}>Privacy Policy</Link>
            </span>
          </label>
          {errors.agreeTerms && (
            <div style={{ fontSize: "12px", color: "#cc0000", marginTop: "5px" }}>{errors.agreeTerms}</div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: "100%", background: isSubmitting ? "#e88a8a" : "#cc0000",
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
            e.currentTarget.style.background = isSubmitting ? "#e88a8a" : "#cc0000";
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
          transition: "background 0.15s, transform 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#0d0d28"; e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#1a1a3d"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
        SIGN UP WITH RMIT SSO
      </button>

      {/* Login link */}
      <p style={{ textAlign: "center", fontSize: "13px", color: "#777", marginTop: "24px", marginBottom: 0 }}>
        Already have an account?{" "}
        <Link
          to="/login"
          style={{ color: "#cc0000", fontWeight: 700, textDecoration: "none", transition: "opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Login
        </Link>
      </p>
    </AuthLayout>

    {showSuccess && (
      <RegisterSuccessModal onGoToLogin={() => navigate("/login")} />
    )}
    </>
  );
}
