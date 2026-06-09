import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import CreatorDashboard from "./pages/CreatorDashboard";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/creatorDashboard" element={<CreatorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;