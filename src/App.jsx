import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import RequireAccess from "./components/auth/RequireAccess";
import CreatorDashboard from "./pages/CreatorDashboard";
import CreatorMyProjects from "./pages/CreatorMyProjects";

import Discover from "./pages/Discover";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import Account from "./pages/Account";
import BackerInvestments from "./pages/BackerInvestments";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminApprovals from "./pages/AdminApprovals";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Inside the router on purpose: RouteErrorBoundary keys itself on the pathname,
            so navigating away from a crashed page rebuilds the boundary and the app
            recovers by itself. Outside the router it would hold the error state forever
            and F5 would be the only way out — most of what it exists to prevent. */}
        <RouteErrorBoundary>
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

        {/* ── Creators (and admins, who are superusers) ── */}
        <Route path="/creator-dashboard" element={
          <RequireAccess permission="canCreate"><CreatorDashboard /></RequireAccess>
        } />
        <Route path="/creator-my-projects" element={
          <RequireAccess permission="canCreate"><CreatorMyProjects /></RequireAccess>
        } />
        <Route path="/create-project" element={
          <RequireAccess permission="canCreate"><CreateProject /></RequireAccess>
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

        {/* This page used to live at /dashboard, which read as a fourth dashboard next
            to the creator and admin ones; it was renamed to /account on 2026-08-16 to
            match its own nav label. Nothing links to the old path any more — the
            redirect is only so a bookmark from an earlier demo does not land on the
            bare 404 page. Safe to delete once nobody is running an old build. */}
        <Route path="/dashboard" element={<Navigate to="/account" replace />} />

        <Route path="*" element={<NotFound />} />
        </Routes>
        </RouteErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
