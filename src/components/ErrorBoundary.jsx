import { Component } from "react";
import { useLocation } from "react-router-dom";

/**
 * Keeps its inline styles on purpose. Everything else in the app is Tailwind; this file
 * is the exception.
 *
 * This is the screen shown after everything else has failed, so it depends on as little
 * as possible. Inline styles render even if the stylesheet never loaded, while a
 * Tailwind class assumes a separate file arrived and parsed.
 *
 * The fallback is self-contained for the same reason: no Header, no Footer, no useAuth,
 * no router Link. If the crash came from the Header or from AuthContext, which sit on
 * every page, rendering them again would throw inside the fallback. React would then
 * look for the next boundary up, find none, and unmount everything, which is the blank
 * page this component exists to prevent.
 *
 * Defined at the top level rather than inside ErrorBoundary's render, since a component
 * created during render remounts on every render.
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
 * Catches render errors so one broken component cannot take the whole app down. Without
 * a boundary, React unmounts the entire tree on an uncaught render error and the user is
 * left on a blank page with no way back but a refresh.
 *
 * Only render errors reach a boundary. Throws inside event handlers and async code do
 * not, so the pages handle those with their own try/catch and error states.
 *
 * It has to be a class: getDerivedStateFromError and componentDidCatch have no hook
 * equivalent.
 */
export default class ErrorBoundary extends Component {
  state = { error: null, componentStack: null };

  static getDerivedStateFromError(error) {
    // Returning state is what stops the unmount: the next render draws the fallback
    // instead of the subtree that threw.
    return { error };
  }

  componentDidCatch(error, info) {
    // Logging only. getDerivedStateFromError has already decided what to show.
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
 * The boundary as App mounts it, keyed on the pathname so navigating away builds a fresh
 * one and the app recovers by itself. Without the key it would hold its error state for
 * good, leaving the user on the error screen even after routing to a healthy page.
 */
export function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}
