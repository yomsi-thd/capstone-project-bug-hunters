import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useWindowWidth from "../../hooks/useWindowWidth";

function Avatar({ userName }) {
  return (
    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-[10px] md:text-[11px] font-bold text-gray-600 shrink-0">
      {userName ? userName.charAt(0).toUpperCase() : "U"}
    </div>
  );
}

export default function DashboardHeader({ onToggleSidebar }) {
  const auth = useAuth();
  const w = useWindowWidth();
  const isMobile = w < 640;
  const navigate = useNavigate();

  const handleLogout = () => {
    if (auth.logout) auth.logout();
    navigate("/");
  };

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 md:px-9 shrink-0 sticky top-0 z-30 w-full">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-gray-500 hover:text-gray-900 focus:outline-none text-xl cursor-pointer bg-transparent border-none p-0"
        >
          ☰
        </button>
        <Link to="/" className="no-underline flex-shrink-0 ml-1 md:ml-0">
          <div className="font-extrabold text-brand leading-tight" style={{ fontSize: isMobile ? "16px" : "18px" }}>
            RMIT<br /><span className="font-normal text-gray-900" style={{ fontSize: isMobile ? "12px" : "14px" }}>Launchpad</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Avatar userName={auth.user?.name} />
          <Link
            to="/dashboard"
            className="no-underline text-[12px] md:text-[13px] text-gray-800 font-medium hover:text-brand transition-colors hidden sm:block"
          >
            Account
          </Link>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[12px] md:text-[13px] text-gray-500 font-medium hover:text-brand transition-colors p-0 flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
