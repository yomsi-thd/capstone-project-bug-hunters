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
    if (!identifier.trim()) next.identifier = "RMIT ID or email is required";
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
      <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#333", textAlign: "center", margin: "0 0 28px" }}>
        Sign in to your account
      </h1>

      <form onSubmit={handleSubmit}>
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
          placeholder="••••••••"
          error={errors.password}
          rightSlot={
            <Link
              to="#"
              style={{ fontSize: "12px", color: "var(--color-brand)", fontWeight: 600, textDecoration: "none", transition: "opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Forgot Password?
            </Link>
          }
        />

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#555", marginBottom: "22px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            style={{ width: "15px", height: "15px", accentColor: "var(--color-brand)", cursor: "pointer" }}
          />
          Remember me
        </label>

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
              SIGNING IN...
            </>
          ) : "LOGIN"}
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
        SIGN IN WITH RMIT SSO
      </button>

      {/* Register link */}
      <p style={{ textAlign: "center", fontSize: "13px", color: "#777", marginTop: "24px", marginBottom: 0 }}>
        Don't have an account?{" "}
        <Link
          to="/register"
          style={{ color: "var(--color-brand)", fontWeight: 700, textDecoration: "none", transition: "opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
