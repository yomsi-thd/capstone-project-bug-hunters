import { Component } from "react";
import { useLocation } from "react-router-dom";

/**
 * ⚠️ THIS FILE KEEPS ITS INLINE STYLES ON PURPOSE — do not convert it to Tailwind.
 *
 * The rest of the app moved to Tailwind on 2026-08-20. This is the ONE exception left,
 * and it is a decision rather than an oversight: if the measuring command in
 * CODE-GUIDE §7.2 prints this file, that is the right answer.
 *
 * This is the screen that appears when everything else has already failed. Inline styles
 * are the last link in the chain of things it refuses to depend on: they render correctly
 * EVEN IF THE STYLESHEET NEVER LOADED. A Tailwind class is a promise that a separate file
 * arrived and parsed; on the one screen whose whole job is to work when promises are
 * broken, that is the wrong trade. Consistency is worth less here than certainty.
 *
 * The fallback is deliberately SELF-CONTAINED: no Header, no Footer, no useAuth, no
 * router Link.
 *
 * If the crash came from the Header or from AuthContext — which sit on every page —
 * a fallback that rendered them again would throw while rendering the fallback. React
 * then looks for the NEXT boundary up, finds none, and unmounts everything: the blank
 * page this component exists to prevent, only harder to diagnose. Plain markup cannot
 * fail that way.
 *
 * Defined at the top level, not inside ErrorBoundary's render — see the convention
 * note in CLAUDE.md: a component created during render remounts on every render.
 */
function Fallback({ error, componentStack, onRetry }) {
  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
        background: "#f7f7f5",
        minHeight: "100vh",
        color: "#111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "520px", width: "100%", textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: "18px", color: "var(--color-brand, #cc0000)", letterSpacing: "0.02em" }}>
          RMIT
        </div>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "28px" }}>Launchpad</div>

        <div style={{ fontSize: "32px", marginBottom: "10px" }}>⚠️</div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 6px" }}>Something went wrong</h1>
        <p style={{ fontSize: "14px", color: "#888", margin: "0 0 18px", lineHeight: 1.6 }}>
          This page hit an unexpected error. Nothing you had already saved is affected —
          the rest of the app still works.
        </p>

        {/* The message is always shown: during a demo, "gallery is not defined" on screen
            beats an empty page plus a console nobody is going to open. */}
        {error?.message && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "12px 14px",
              fontSize: "13px",
              color: "#991b1b",
              textAlign: "left",
              marginBottom: "22px",
              wordBreak: "break-word",
            }}
          >
            {error.message}
          </div>
        )}

        {/* The stack is developer-only noise, so it stays out of a production build. */}
        {import.meta.env.DEV && componentStack && (
          <details style={{ textAlign: "left", marginBottom: "22px" }}>
            <summary style={{ cursor: "pointer", fontSize: "12px", color: "#888" }}>
              Component stack (development only)
            </summary>
            <pre
              style={{
                fontSize: "11px",
                color: "#555",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "12px",
                overflowX: "auto",
                marginTop: "8px",
              }}
            >
              {componentStack}
            </pre>
          </details>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={onRetry}
            style={{
              background: "var(--color-brand, #cc0000)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "12px 28px",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
              transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#aa0000";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(204,0,0,0.35)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--color-brand, #cc0000)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            TRY AGAIN
          </button>

          {/* A real anchor, not a router Link: this is the last way out, and reloading
              the document is what guarantees the broken state is gone. A Link would
              re-route inside the same tree that just crashed. */}
          <a
            href="/discover"
            style={{
              display: "inline-block",
              background: "#fff",
              color: "#333",
              border: "1px solid #ddd",
              textDecoration: "none",
              borderRadius: "6px",
              padding: "12px 28px",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--color-brand, #cc0000)";
              e.currentTarget.style.color = "var(--color-brand, #cc0000)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "#ddd";
              e.currentTarget.style.color = "#333";
            }}
          >
            BACK TO DISCOVER
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Catches render errors so one broken component cannot take the whole app down.
 *
 * Without a boundary anywhere in the tree, React's default for an uncaught render
 * error is to unmount EVERYTHING — the user gets a blank white page and F5 is the only
 * way back. That has already happened once here (AdminApprovals read `project.gallery[0]`
 * on a mapper that returned no gallery, and clicking REVIEW blanked the app).
 *
 * Only render errors are caught. Errors thrown inside event handlers or in async code
 * never reach a boundary — the pages handle those with their own try/catch and error
 * states, so the gap is covered.
 *
 * A class is not a style choice: getDerivedStateFromError / componentDidCatch have no
 * hook equivalent, so a boundary cannot be a function component.
 */
export default class ErrorBoundary extends Component {
  state = { error: null, componentStack: null };

  static getDerivedStateFromError(error) {
    // Returning state here is what stops the unmount: the next render draws the
    // fallback instead of the subtree that threw.
    return { error };
  }

  componentDidCatch(error, info) {
    // Logging only — the display is already decided by getDerivedStateFromError.
    console.error("Render error caught by ErrorBoundary:", error, info?.componentStack);
    this.setState({ componentStack: info?.componentStack ?? null });
  }

  handleRetry = () => {
    this.setState({ error: null, componentStack: null });
  };

  render() {
    if (this.state.error) {
      return (
        <Fallback
          error={this.state.error}
          componentStack={this.state.componentStack}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}

/**
 * The boundary as mounted in App: keyed on the pathname so navigating away builds a
 * fresh boundary and the app recovers on its own.
 *
 * Without the key the boundary holds its error state forever — the user could route to
 * a perfectly healthy page and still be looking at the error screen, with F5 the only
 * escape, which is most of what the boundary was meant to fix.
 */
export function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}
