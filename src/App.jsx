import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import RequireAccess from "./components/auth/RequireAccess";

// Discover is the landing page at "/", so it is imported eagerly. Lazy-loading the first
// thing every visitor sees would only add a spinner to the request that decides how fast
// the app feels.
import Discover from "./pages/Discover";

// Everything else is code-split. In one bundle a signed-out visitor downloads the whole
// admin area and the five-step create wizard just to read one project page.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const BackerInvestments = lazy(() => import("./pages/BackerInvestments"));
const Account = lazy(() => import("./pages/Account"));
const NotFound = lazy(() => import("./pages/NotFound"));

const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const CreatorMyProjects = lazy(() => import("./pages/CreatorMyProjects"));
const CreateProject = lazy(() => import("./pages/CreateProject"));

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUserManagement = lazy(() => import("./pages/AdminUserManagement"));
const AdminApprovals = lazy(() => import("./pages/AdminApprovals"));

// Shown while a route's chunk downloads. Plain on purpose: a skeleton for a page whose
// shape we don't know yet would flash a layout that is about to be replaced.
function RouteFallback() {
  return (
    <div style={{
      minHeight: "100vh", background: "#f7f7f5",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
      fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", color: "#999",
    }}>
      LOADING…
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Inside the router on purpose: RouteErrorBoundary keys itself on the pathname,
            so navigating away from a crashed page rebuilds the boundary and the app
            recovers by itself. Outside the router it would hold the error state for good
            and a refresh would be the only way out. */}
        <RouteErrorBoundary>
        {/* Inside the boundary, not outside: a chunk that fails to download throws
            during render, and the boundary is what turns that into the error screen
            with a way out instead of a blank page. */}
        <Suspense fallback={<RouteFallback />}>
        <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<Discover />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* /investments stays public on purpose: signed out it shows its own empty
            state with a login call to action, which reads better than a redirect. */}
        <Route path="/investments" element={<BackerInvestments />} />

        {/* Creators. An admin is not let in here: they own no projects, so both of
            these would be empty pages about somebody else's work. */}
        <Route path="/creator-dashboard" element={
          <RequireAccess permission="canCreate"><CreatorDashboard /></RequireAccess>
        } />
        <Route path="/creator-my-projects" element={
          <RequireAccess permission="canCreate"><CreatorMyProjects /></RequireAccess>
        } />
        {/* Deep link to one project's edit form. It renders the SAME page rather than a
            page of its own, because EditProject is a modal that needs a fully mapped
            creator-shaped project: a standalone route would have to refetch it, remap it
            and re-implement the loading, error and not-yours handling this page already
            has. Closing the modal drops back to /creator-my-projects, which is where the
            creator expects to land. */}
        <Route path="/creator-my-projects/:id/edit" element={
          <RequireAccess permission="canCreate"><CreatorMyProjects /></RequireAccess>
        } />
        {/* The one creator route an admin keeps, since filing a project on behalf of a
            creator uses the same wizard. canOpenProjectWizard is creator or admin. */}
        <Route path="/create-project" element={
          <RequireAccess permission="canOpenProjectWizard"><CreateProject /></RequireAccess>
        } />

        {/* ── Admins only ── */}
        <Route path="/admin-dashboard" element={
          <RequireAccess permission="isAdmin"><AdminDashboard /></RequireAccess>
        } />
        <Route path="/admin-user-management" element={
          <RequireAccess permission="isAdmin"><AdminUserManagement /></RequireAccess>
        } />
        <Route path="/admin-approvals" element={
          <RequireAccess permission="isAdmin"><AdminApprovals /></RequireAccess>
        } />

        {/* Target of the "Account" link in the Header. Guarded with no permission:
            any signed-in user has an account, whatever their roles. */}
        <Route path="/account" element={
          <RequireAccess><Account /></RequireAccess>
        } />

        {/* This page used to live at /dashboard, which read as a fourth dashboard
            beside the creator and admin ones. Nothing links to the old path any more;
            the redirect is only so an old bookmark does not land on the 404 page, and
            it can go once nobody is running an old build. */}
        <Route path="/dashboard" element={<Navigate to="/account" replace />} />

        <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
