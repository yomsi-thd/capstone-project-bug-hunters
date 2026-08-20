import { useState, useEffect, useMemo } from "react";
import RoleBadge from "../components/ui/RoleBadge";
import EmptyState from "../components/ui/EmptyState";
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
    <section className="mb-5 rounded-[10px] border border-neutral-200 bg-white p-6">
      <h2 className="mx-0 mt-0 mb-1 text-[16px] font-bold text-neutral-900">{title}</h2>
      {subtitle && (
        <p className="mx-0 mt-0 mb-5 text-[13px] text-neutral-500">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function SummaryRow({ label, children }) {
  return (
    <div className="min-w-[140px]">
      <div className="mb-1.5 text-[11px] font-bold tracking-[0.06em] text-neutral-400">
        {label}
      </div>
      <div className="text-[14px] font-medium text-neutral-800">{children}</div>
    </div>
  );
}

// A block-level message above a form. Deliberately NOT built on ui/Badge: a badge is an
// inline label on something else, this is a paragraph the user has to read, and the two
// only look related because both carry a tone.
//
// role is "alert" for errors so a screen reader interrupts, and "status" otherwise so it
// does not — a saved-successfully message should not cut across what is being read.
const NOTICE_TONES = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
};

function Notice({ tone, children }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 rounded-lg border px-3.5 py-2.5 text-[13px] leading-normal ${NOTICE_TONES[tone] ?? NOTICE_TONES.warning}`}
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
      className="inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-brand px-[22px] py-[11px] text-[13px] font-bold tracking-[0.03em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_3px_8px_rgba(204,0,0,0.3)] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:hover:translate-y-0 disabled:hover:bg-neutral-300 disabled:hover:shadow-none"
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
    <div className="min-h-screen bg-surface font-[\'DM_Sans\',\'Helvetica_Neue\',Arial,sans-serif] text-neutral-900">

      <Header
        showSearch={false}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
      />

      {/* `pad` is computed from the breakpoint hook, so it stays inline — a runtime value
          is one of the three cases where that is still correct. */}
      <div className="lp-stagger mx-auto max-w-[760px]" style={{ padding: pad }}>
        <h1 className={`mx-0 mt-0 mb-1.5 font-extrabold text-neutral-900 ${isMobile ? "text-[24px]" : "text-[30px]"}`}>
          My Account
        </h1>
        <p className="mx-0 mt-0 mb-7 text-[14px] text-neutral-500">
          Your details, how you appear on your projects, and your password.
        </p>

        {isLoading ? (
          <div className="px-5 py-15 text-center text-[14px] text-neutral-500">
            Loading your account…
          </div>
        ) : loadError ? (
          <EmptyState
            className="py-15"
            icon="⚠️"
            title={<span className="text-red-700">Could not load your account</span>}
            detail={loadError}
          />
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
              <div className="flex flex-wrap gap-7">
                <SummaryRow label="NAME">{shown.name || "—"}</SummaryRow>
                <SummaryRow label="EMAIL">{shown.email || "—"}</SummaryRow>
                <SummaryRow label="ROLES">
                  <span className="flex flex-wrap gap-1.5">
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
              <p className="mx-0 mt-[18px] mb-0 text-[12px] leading-relaxed text-neutral-400">
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
                <p className="mx-0 -mt-2 mb-[18px] text-[12px] leading-relaxed text-neutral-400">
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
