import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Login from "./pages/Login";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import MyProjects from "./pages/MyProjects";
import Dashboard from "./pages/Dashboard";
import Investments from "./pages/Investments";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/discover" element={<Discover />} />

        <Route path="/login" element={<Login />} />

        <Route path="/project/:id" element={<ProjectDetail />} />

        <Route path="/create-project" element={<CreateProject />} />

        <Route path="/my-projects" element={<MyProjects />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/investments" element={<Investments />} />

        <Route path="/admin" element={<Admin />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;