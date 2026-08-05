import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import useBreakpoint from "../../hooks/useBreakpoint";

// Shown when the user IS signed in but lacks the permission. Deliberately not a
// redirect to /login: bouncing a signed-in user to the login page reads as "your
// session died", which sends them chasing a bug that is not there.
function NotAuthorized({ isMobile }) {
  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>
      <Header showSearch={false} />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔒</div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 6px" }}>You do not have access to this page</h1>
        <p style={{ fontSize: "14px", color: "#888", margin: "0 0 24px" }}>
          Your account does not hold the role this page requires.
        </p>
        <Link
          to="/discover"
          style={{
            display: "inline-block", background: "var(--color-brand)", color: "#fff",
            textDecoration: "none", borderRadius: "6px",
            fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em",
            padding: "12px 28px", transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#aa0000";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(204,0,0,0.35)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "var(--color-brand)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          BACK TO DISCOVER
        </Link>
      </div>
      <Footer isMobile={isMobile} />
    </div>
  );
}

/**
 * Route guard.
 *
 * `permission` is the name of a derived flag on AuthContext — "canCreate",
 * "canInvest", "isAdmin" — or the default "isLoggedIn" for pages that only need a
 * session. Reusing the context's own flags keeps the routing rules and the nav-bar
 * visibility rules on one source of truth, so a link can never point somewhere the
 * guard rejects.
 *
 * Without this the dashboards were reachable while signed out: the page rendered and
 * every API call came back "Access token required", which looks like a broken backend
 * rather than a missing login.
 */
export default function RequireAccess({ permission = "isLoggedIn", children }) {
  const auth = useAuth();
  const location = useLocation();
  const { isMobile } = useBreakpoint();

  if (!auth.isLoggedIn) {
    // Remember where they were headed so Login can send them back after signing in.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (permission !== "isLoggedIn" && !auth[permission]) {
    return <NotAuthorized isMobile={isMobile} />;
  }

  return children;
}
