import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DeadEndPage from "../layout/DeadEndPage";

/**
 * Route guard.
 *
 * `permission` is the name of a derived flag on AuthContext — "canCreate",
 * "canInvest", "isAdmin", "canOpenProjectWizard" — or the default "isLoggedIn" for
 * pages that only need a session. Reusing the context's own flags keeps the routing
 * rules and the nav-bar visibility rules on one source of truth, so a link can never
 * point somewhere the guard rejects.
 *
 * It takes ONE flag name, not a list, which is why AuthContext exposes the combined
 * `canOpenProjectWizard` (creator OR admin) rather than making this guard understand
 * unions — /create-project is the one route two different roles reach for two
 * different reasons.
 *
 * Without this the dashboards were reachable while signed out: the page rendered and
 * every API call came back "Access token required", which looks like a broken backend
 * rather than a missing login.
 */
export default function RequireAccess({ permission = "isLoggedIn", children }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isLoggedIn) {
    // Remember where they were headed so Login can send them back after signing in.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Deliberately not a redirect to /login: bouncing a SIGNED-IN user to the login page
  // reads as "your session died", which sends them chasing a bug that is not there.
  if (permission !== "isLoggedIn" && !auth[permission]) {
    return (
      <DeadEndPage
        icon="🔒"
        title="You do not have access to this page"
        detail="Your account does not hold the role this page requires."
      />
    );
  }

  return children;
}
