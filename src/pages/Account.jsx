import { useState, useEffect, useMemo } from "react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import AuthInput from "../components/auth/AuthInput";
import useBreakpoint from "../hooks/useBreakpoint";
import { useAuth } from "../context/AuthContext";
import * as userApi from "../api/userApi";
import { toProfile } from "../api/mappers";

/* ── Small shared pieces ──────────────────────────────────────────────────────
   Top-level functions, never nested inside the page: a component defined during
   render remounts on every keystroke and loses the input's focus. */

function Card({ title, subtitle, children }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "24px",
        marginBottom: "20px",
      }}
    >
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111", margin: "0 0 4px" }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: "13px", color: "#888", margin: "0 0 20px" }}>{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function RoleBadge({ role }) {
  // Brand red for admin, neutral for the rest — the same "admin is different"
  // signal the nav bar gives, without inventing a third colour vocabulary.
  const isAdmin = role === "admin";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        padding: "4px 10px",
        borderRadius: "999px",
        background: isAdmin ? "rgba(204,0,0,0.08)" : "#f1f1ef",
        color: isAdmin ? "var(--color-brand)" : "#555",
        border: `1px solid ${isAdmin ? "rgba(204,0,0,0.2)" : "#e5e7eb"}`,
      }}
    >
      {role.toUpperCase()}
    </span>
  );
}

function SummaryRow({ label, children }) {
  return (
    <div style={{ minWidth: "140px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "#999", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", color: "#222", fontWeight: 500 }}>{children}</div>
    </div>
  );
}

function Notice({ tone, children }) {
  const tones = {
    success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
    error: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
    warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
  };
  const t = tones[tone] || tones.warning;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.color,
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "13px",
        marginBottom: "16px",
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function SaveButton({ children, disabled, busy }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        background: disabled ? "#ddd" : "var(--color-brand)",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "11px 22px",
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.03em",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
      }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.background = "#aa0000";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 3px 8px rgba(204,0,0,0.3)";
      }}
      onMouseLeave={e => {
        if (disabled) return;
        e.currentTarget.style.background = "var(--color-brand)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {busy && <span className="lp-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Account() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const { user, roles, canInvest, balance, isMockSession, updateUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Profile form
  const [form, setForm] = useState({ name: "", email: "", title: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password form — deliberately separate state, so a failed password change
  // never clears or blocks the profile fields the user is halfway through editing.
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  // A mock session has no access token, so every call here would 401. Everything the
  // summary needs is already on the context, so read it from there and skip the call
  // rather than showing an error the user cannot act on.
  const readOnly = isMockSession;
  const mockProfile = useMemo(() => ({
    name: user?.name ?? "",
    email: user?.username ?? "",
    title: "",
    joinedOn: "",
  }), [user?.name, user?.username]);

  useEffect(() => {
    // Nothing to fetch on a mock session, and nothing to wait for either — see
    // `isLoading` below, which is derived rather than switched off in here.
    if (readOnly) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await userApi.getProfile();
        if (cancelled) return;
        const p = toProfile(row);
        setProfile(p);
        setForm({ name: p.name, email: p.email, title: p.title });
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.message || err.message || "Could not load your profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [readOnly]);

  // What the summary shows and what the (disabled) inputs hold on a mock session.
  const isLoading = !readOnly && loading;
  const shown = readOnly ? mockProfile : profile;
  const values = readOnly ? mockProfile : form;

  const emailChanged = !readOnly && profile && form.email.trim() !== profile.email;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaved(false);

    // Client-side first, then the server's own message — the order the rest of
    // the app uses (Register, Login).
    const next = {};
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const row = await userApi.updateProfile({
        fullName: form.name.trim(),
        email: form.email.trim(),
        // Sent as null rather than "" so the column is cleared instead of holding
        // an empty string that the project page would render as a blank line.
        title: form.title.trim() || null,
      });
      const p = toProfile(row);
      // The API answers with the updated row but without created_at, so keep the
      // join date already on screen instead of blanking it.
      setProfile(prev => ({ ...p, joinedOn: p.joinedOn || prev?.joinedOn || "" }));
      setForm({ name: p.name, email: p.email, title: p.title });
      // The Header reads name/username off the context, and the session is restored
      // from localStorage rather than refetched — without this the old name survives
      // until the next sign-in.
      updateUser({ name: p.name, username: p.email });
      setSaved(true);
      setErrors({});
    } catch (err) {
      setErrors({ form: err.response?.data?.message || err.message || "Could not save your profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwSaved(false);

    const next = {};
    if (!pw.current) next.current = "Enter your current password";
    if (!pw.next) next.next = "Enter a new password";
    else if (pw.next.length < 8) next.next = "Password must be at least 8 characters";
    else if (pw.next === pw.current) next.next = "The new password must be different";
    if (pw.confirm !== pw.next) next.confirm = "Passwords do not match";
    setPwErrors(next);
    if (Object.keys(next).length) return;

    setPwSaving(true);
    try {
      await userApi.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setPwErrors({});
      setPwSaved(true);
    } catch (err) {
      setPwErrors({ form: err.response?.data?.message || err.message || "Could not change your password" });
    } finally {
      setPwSaving(false);
    }
  };

  const pad = isMobile ? "24px 16px" : isTablet ? "28px 24px" : "32px 40px";

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      <Header
        showSearch={false}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
      />

      <div className="lp-stagger" style={{ maxWidth: "760px", margin: "0 auto", padding: pad }}>
        <h1 style={{ fontSize: isMobile ? "24px" : "30px", fontWeight: 800, margin: "0 0 6px", color: "#111" }}>
          My Account
        </h1>
        <p style={{ fontSize: "14px", color: "#888", margin: "0 0 28px" }}>
          Your details, how you appear on your projects, and your password.
        </p>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#888", fontSize: "14px" }}>
            Loading your account…
          </div>
        ) : loadError ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚠️</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#a11" }}>Could not load your account</div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>{loadError}</div>
          </div>
        ) : (
          <>
            {readOnly && (
              <Notice tone="warning">
                You are signed in on a demo account because the server could not be reached, so
                your details cannot be changed here. Sign in again once the server is back.
              </Notice>
            )}

            {/* ── Read-only summary ── */}
            <Card title="Account summary">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
                <SummaryRow label="NAME">{shown.name || "—"}</SummaryRow>
                <SummaryRow label="EMAIL">{shown.email || "—"}</SummaryRow>
                <SummaryRow label="ROLES">
                  <span style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {roles.length ? roles.map(r => <RoleBadge key={r} role={r} />) : "—"}
                  </span>
                </SummaryRow>
                {/* A pure creator has no wallet and no balance badge in the nav bar —
                    showing a balance here would contradict that. */}
                {canInvest && (
                  <SummaryRow label="CLASS COINS">{balance.toLocaleString()} CC</SummaryRow>
                )}
                {shown.joinedOn && <SummaryRow label="MEMBER SINCE">{shown.joinedOn}</SummaryRow>}
              </div>
              <p style={{ fontSize: "12px", color: "#aaa", margin: "18px 0 0", lineHeight: 1.6 }}>
                Roles are granted by an administrator — request the Creator role from the sign-up
                form, or ask an admin to change them.
              </p>
            </Card>

            {/* ── Profile ── */}
            <Card
              title="Profile"
              subtitle="This is what other people see on your project pages and comments."
            >
              <form onSubmit={handleSaveProfile} noValidate>
                {saved && <Notice tone="success">Your profile has been saved.</Notice>}
                {errors.form && <Notice tone="error">{errors.form}</Notice>}

                <AuthInput
                  label="FULL NAME"
                  value={values.name}
                  onChange={e => { setForm({ ...form, name: e.target.value }); setSaved(false); }}
                  placeholder="e.g. Nguyen Van Huy"
                  error={errors.name}
                  disabled={readOnly}
                />
                <AuthInput
                  label="EMAIL"
                  value={values.email}
                  onChange={e => { setForm({ ...form, email: e.target.value }); setSaved(false); }}
                  placeholder="e.g. s1234567@rmit.edu.vn"
                  error={errors.email}
                  disabled={readOnly}
                />
                {emailChanged && !errors.email && (
                  <Notice tone="warning">
                    This is also the email you sign in with, and sign-in is case-sensitive — you
                    will need to use <strong>{form.email.trim()}</strong> exactly next time.
                  </Notice>
                )}
                <AuthInput
                  label="TITLE (OPTIONAL)"
                  value={values.title}
                  onChange={e => { setForm({ ...form, title: e.target.value }); setSaved(false); }}
                  placeholder="e.g. PhD Candidate, School of Engineering"
                  error={errors.title}
                  disabled={readOnly}
                />
                <p style={{ fontSize: "12px", color: "#aaa", margin: "-8px 0 18px", lineHeight: 1.6 }}>
                  Your title appears under your name on every project you create.
                </p>

                <SaveButton disabled={readOnly || saving} busy={saving}>
                  {saving ? "SAVING…" : "SAVE CHANGES"}
                </SaveButton>
              </form>
            </Card>

            {/* ── Password ── */}
            <Card
              title="Change password"
              subtitle="Choose a password of at least 8 characters."
            >
              <form onSubmit={handleChangePassword} noValidate>
                {pwSaved && <Notice tone="success">Your password has been changed.</Notice>}
                {pwErrors.form && <Notice tone="error">{pwErrors.form}</Notice>}

                <AuthInput
                  label="CURRENT PASSWORD"
                  type="password"
                  value={pw.current}
                  onChange={e => { setPw({ ...pw, current: e.target.value }); setPwSaved(false); }}
                  placeholder="••••••••"
                  error={pwErrors.current}
                  disabled={readOnly}
                />
                <AuthInput
                  label="NEW PASSWORD"
                  type="password"
                  value={pw.next}
                  onChange={e => { setPw({ ...pw, next: e.target.value }); setPwSaved(false); }}
                  placeholder="At least 8 characters"
                  error={pwErrors.next}
                  disabled={readOnly}
                />
                <AuthInput
                  label="CONFIRM NEW PASSWORD"
                  type="password"
                  value={pw.confirm}
                  onChange={e => { setPw({ ...pw, confirm: e.target.value }); setPwSaved(false); }}
                  placeholder="Re-enter your new password"
                  error={pwErrors.confirm}
                  disabled={readOnly}
                />

                <SaveButton disabled={readOnly || pwSaving} busy={pwSaving}>
                  {pwSaving ? "UPDATING…" : "UPDATE PASSWORD"}
                </SaveButton>
              </form>
            </Card>
          </>
        )}
      </div>

      <Footer isMobile={isMobile} />
    </div>
  );
}
