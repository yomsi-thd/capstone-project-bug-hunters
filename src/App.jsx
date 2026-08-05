import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import RequireAccess from "./components/auth/RequireAccess";
import CreatorDashboard from "./pages/CreatorDashboard";
import CreatorMyProjects from "./pages/CreatorMyProjects";

import Discover from "./pages/Discover";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import Dashboard from "./pages/Dashboard";
import BackerInvestments from "./pages/BackerInvestments";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminApprovals from "./pages/AdminApprovals";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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

        {/* Target of the "Account" link in both headers. Still a placeholder page.
            TODO: build it on GET/PUT /api/users/profile + PUT /api/users/change-password. */}
        <Route path="/dashboard" element={
          <RequireAccess><Dashboard /></RequireAccess>
        } />

        <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
