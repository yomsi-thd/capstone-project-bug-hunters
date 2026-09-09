import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DeadEndPage from "../layout/DeadEndPage";

/**
 * Route guard.
 *
 * `permission` names a derived flag on AuthContext ("canCreate", "canInvest", "isAdmin",
 * "canOpenProjectWizard"), or defaults to "isLoggedIn" for pages that only need a
 * session. Reusing the context's flags keeps the routes and the nav bar on one source of
 * truth, so a visible link can never point somewhere the guard rejects.
 *
 * It takes one flag name rather than a list, which is why AuthContext exposes the
 * combined canOpenProjectWizard: /create-project is the one route two roles reach for
 * two different reasons.
 *
 * Without a guard the dashboards render while signed out and every API call answers
 * "Access token required", which reads as a broken backend rather than a missing login.
 */
export default function RequireAccess({ permission = "isLoggedIn", children }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isLoggedIn) {
    // Remember where they were headed so Login can send them back afterwards.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Not a redirect to /login. Bouncing a signed-in user to the login page reads as
  // "your session died" and sends them chasing a bug that isn't there.
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
