import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import CreatorDashboard from "./pages/CreatorDashboard";
import CreatorMyProjects from "./pages/CreatorMyProjects";

import Discover from "./pages/Discover";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import MyProjects from "./pages/MyProjects";
import Dashboard from "./pages/Dashboard";
import BackerInvestments from "./pages/BackerInvestments";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminApprovals from "./pages/AdminApprovals";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Discover />} />

        <Route path="/creator-dashboard" element={<CreatorDashboard />} />
        <Route path="/creator-my-projects" element={<CreatorMyProjects/>} />

        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        
        <Route path="/admin-user-management" element={<AdminUserManagement />} />
        <Route path="/admin-approvals" element={<AdminApprovals />} />

        <Route path="/discover" element={<Discover />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/project/:id" element={<ProjectDetail />} />

        <Route path="/create-project" element={<CreateProject />} />

        <Route path="/my-projects" element={<MyProjects />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/investments" element={<BackerInvestments />} />

        <Route path="/admin" element={<Admin />} />

        <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;