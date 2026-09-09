import { useLocation, useNavigate } from "react-router-dom";
import { CREATOR_SIDEBAR_LINKS } from "../../mock";

const ROUTE_BY_ID = {
  dashboard: "/creator-dashboard",
  myprojects: "/creator-my-projects",
};

/**
 * The creator area's left nav, shared by CreatorDashboard and CreatorMyProjects so the
 * two cannot drift apart. It is just the two links; starting a project is a header
 * action, reachable from anywhere.
 *
 * Active state comes from the URL rather than a prop. Both destinations are real routes,
 * so a prop would mean keeping a second copy of "where am I" in sync.
 *
 * Positioning matches the other dashboard shells: fixed under the 56px header on mobile,
 * relative from 768px where it becomes a permanent column. `md:top-0` is load-bearing,
 * since leaving top-14 on at md+ would push the whole column down by the header.
 */
export default function CreatorSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = (id) => {
    navigate(ROUTE_BY_ID[id]);
    onClose?.();
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-14 bottom-0 left-0 md:top-0 z-40 w-48 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        <nav className="flex-1 p-2 pt-4">
          {CREATOR_SIDEBAR_LINKS.map(link => {
            const isActive = pathname === ROUTE_BY_ID[link.id];
            return (
              <button
                key={link.id}
                onClick={() => go(link.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold tracking-wide rounded text-left mb-0.5 transition-colors cursor-pointer border-none ${
                  isActive ? "bg-brand text-white" : "bg-transparent text-gray-400 hover:bg-gray-50"
                }`}
              >
                <span>{link.icon}</span>{link.label}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-gray-200">
          <button className="w-full bg-transparent border-none text-left px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer">? Support</button>
        </div>
      </aside>
    </>
  );
}
