import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useBreakpoint, { BREAKPOINTS } from "../../hooks/useBreakpoint";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";
import { getNavLinksForUser } from "../../mock/navLinks";

function CCBadge({ ccBalance }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-[5px]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-brand" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H9m0 0h4.5a1.5 1.5 0 0 1 0 3H9" />
      </svg>
      <span className="text-[12px] font-bold whitespace-nowrap text-neutral-900">
        BALANCE&nbsp;
        <span className="text-brand">{ccBalance.toLocaleString()} CC</span>
      </span>
    </div>
  );
}

export default function Header(props = {}) {
  // Self-sufficient: it reads the signed-in user from AuthContext and owns its menu and
  // search state. A prop still overrides the internal default where one is passed.
  const auth = useAuth();
  const [menuOpenState, setMenuOpenState] = useState(false);
  const [searchOpenState, setSearchOpenState] = useState(false);
  const [searchState, setSearchState] = useState("");

  const pick = (value, fallback) => (value !== undefined ? value : fallback);

  // The header keeps its own breakpoints and uses a tighter desktop threshold than the
  // pages do, so between 1024 and 1199px it collapses to the hamburger while the page
  // below still lays out as desktop. See useBreakpoint for why.
  const { isMobile, isTablet, isDesktop } = useBreakpoint(BREAKPOINTS.HEADER_DESKTOP_MIN);

  const isLoggedIn = pick(props.isLoggedIn, auth.isLoggedIn);
  const ccBalance = pick(props.ccBalance, auth.balance);
  const userName = pick(props.userName, auth.user?.name ?? "");
  const onLogout = pick(props.onLogout, auth.logout);
  const navLinks = pick(props.navLinks, getNavLinksForUser(auth.user));

  // Only creators start projects, and only backers hold a Class Coin balance.
  const canCreate = pick(props.canCreate, auth.canCreate);
  // An admin owns nothing, so their route into the wizard is worded differently: the
  // project is filed under a creator they pick in step 1. An admin account holds no
  // other role, so the two gates are already exclusive and nobody sees both buttons.
  const canCreateForOthers = pick(props.canCreateForOthers, auth.canCreateForOthers);
  const showBalance = pick(props.showBalance, auth.canInvest);
  // Search belongs only on pages with a catalogue to search. Pages without one pass
  // showSearch={false} to hide the box, the toggle and the dropdown.
  const showSearch = pick(props.showSearch, true);
  // Dashboard pages render a sidebar and pass this in so the header can toggle it when
  // narrow. Public pages omit it and get no button.
  const onToggleSidebar = props.onToggleSidebar;

  const search = pick(props.search, searchState);
  const setSearch = pick(props.setSearch, setSearchState);
  const menuOpen = pick(props.menuOpen, menuOpenState);
  const setMenuOpen = pick(props.setMenuOpen, setMenuOpenState);
  const searchOpen = pick(props.searchOpen, searchOpenState);
  const setSearchOpen = pick(props.setSearchOpen, setSearchOpenState);

  const { pathname } = useLocation();

  const isActive = (path) => {
    if (path === "/discover") return pathname === "/" || pathname === "/discover";
    return pathname === path;
  };

  return (
    <>
      {/* Sticky header stack: the bar + the mobile/tablet search dropdown. The
          search dropdown lives in-flow here so it PUSHES page content down
          instead of covering the results it just filtered. */}
      <div className="sticky top-0 z-100">
      {/* h-14 is 56px, and every sidebar offsets itself by exactly that with
          top-14. Change one and the rest gain or lose a gap. */}
      <nav className={`flex h-14 items-center border-b border-neutral-200 bg-white ${isMobile ? "gap-2 px-4" : "gap-4 px-10"}`}>
        {/* Sidebar toggle, dashboard pages only. Visibility is driven by Tailwind's
            `md:hidden` rather than this header's own isMobile/isDesktop, because it
            has to disappear at exactly the width where the sidebar stops sliding and
            becomes permanent — and that is the sidebar's own `md:relative` breakpoint
            (768px). The header's thresholds are 640 and 1200, so using either would
            leave a dead button on screens where the sidebar is already visible.
            No `display` in the style object: an inline display would beat md:hidden. */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="cursor-pointer rounded border-none bg-none p-1 text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 shrink-0 text-[20px] md:hidden"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        )}

        {/* Logo */}
        <Link to="/" className="mr-1 shrink-0 no-underline">
          <div className={`leading-[1.1] font-extrabold text-brand ${isMobile ? "text-[16px]" : "text-[18px]"}`}>
            RMIT<br /><span className={`font-normal text-neutral-900 ${isMobile ? "text-[12px]" : "text-[14px]"}`}>Launchpad</span>
          </div>
        </Link>

        {/* Desktop nav links (tablet folds these into the hamburger to avoid overflow) */}
        {isDesktop && (
          <div className="flex flex-1 gap-1">
            {navLinks.map(({ label, path }) => (
              path.startsWith("#") ? (
                <a
                  key={label} href={path}
                  className="lp-navlink px-3 py-1.5 text-[14px] font-normal"
                >{label}</a>
              ) : (
                <Link
                  key={label} to={path}
                  className={`lp-navlink px-3 py-1.5 text-[14px] ${isActive(path) ? "is-active font-semibold" : "font-normal"}`}
                >{label}</Link>
              )
            ))}
          </div>
        )}

        {!isDesktop && <div className="flex-1" />}

        {/* Desktop search */}
        {isDesktop && showSearch && (
          <div className="flex items-center gap-2 rounded-md bg-[#f5f5f3] w-50 px-3 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="w-full border-none bg-none text-neutral-800 outline-none text-[13px]" />
          </div>
        )}

        {/* Mobile/tablet search toggle */}
        {(isTablet || isMobile) && showSearch && (
          <button
            onClick={() => setSearchOpen(v => !v)}
            className={`cursor-pointer rounded border-none bg-none p-1 text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 text-[18px] ${isMobile ? "p-1" : "p-1.5"}`}
            aria-label="Toggle search"
          >🔍</button>
        )}

        {/* Desktop, logged out */}
        {isDesktop && !isLoggedIn && (
          <Link
            to="/login"
            className="shrink-0 text-[13px] font-medium text-neutral-700 no-underline transition-colors duration-150 hover:text-brand"
          >LOGIN</Link>
        )}

        {/* Desktop, logged in */}
        {isDesktop && isLoggedIn && (
          <>
            {showBalance && <CCBadge ccBalance={ccBalance} />}
            {canCreate && (
              <Link
                to="/create-project"
                className="shrink-0 rounded-[5px] bg-brand px-4 py-2 text-[13px] font-bold tracking-[0.03em] text-white no-underline transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_3px_8px_rgba(204,0,0,0.3)]"
              >START A PROJECT</Link>
            )}
            {canCreateForOthers && (
              <Link
                to="/create-project"
                className="shrink-0 rounded-[5px] bg-brand px-4 py-2 text-[13px] font-bold tracking-[0.03em] text-white no-underline transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_3px_8px_rgba(204,0,0,0.3)]"
              >CREATE FOR A CREATOR</Link>
            )}
            <div className="flex shrink-0 items-center gap-1.5">
              <Avatar name={userName} size={30} max={1} fallback="U" />
              <Link
                to="/account"
                className="text-[13px] font-medium text-neutral-800 no-underline transition-colors duration-150 hover:text-brand"
              >Account</Link>
            </div>
            <button
              onClick={onLogout}
              className="flex shrink-0 cursor-pointer items-center gap-1 border-none bg-none p-0 text-[13px] font-medium text-neutral-600 transition-colors duration-150 hover:text-brand"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Logout
            </button>
          </>
        )}

        {/* Tablet, logged out */}
        {isTablet && !isLoggedIn && (
          <Link
            to="/login"
            className="text-[12px] font-medium whitespace-nowrap text-neutral-700 no-underline transition-colors duration-150 hover:text-brand"
          >LOGIN</Link>
        )}

        {/* Tablet, logged in */}
        {isTablet && isLoggedIn && (
          <>
            {showBalance && (
              <div className="text-[12px] font-bold whitespace-nowrap text-brand">
                {ccBalance.toLocaleString()} CC
              </div>
            )}
            {canCreate && (
              <Link
                to="/create-project"
                className="rounded-[5px] bg-brand px-3 py-[7px] text-[12px] font-bold whitespace-nowrap text-white no-underline transition-colors duration-150 hover:bg-brand-dark"
              >START A PROJECT</Link>
            )}
            {canCreateForOthers && (
              <Link
                to="/create-project"
                className="rounded-[5px] bg-brand px-3 py-[7px] text-[12px] font-bold whitespace-nowrap text-white no-underline transition-colors duration-150 hover:bg-brand-dark"
              >CREATE FOR A CREATOR</Link>
            )}
            <Avatar name={userName} size={30} max={1} fallback="U" />
          </>
        )}

        {/* Hamburger (mobile + tablet) */}
        {!isDesktop && (
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="cursor-pointer rounded border-none bg-none p-1 text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 text-[22px]"
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
      </nav>

      {/* The mobile and tablet search dropdown, in flow inside the sticky header so
          it pushes content down rather than covering the results it just filtered. */}
      {(isMobile || isTablet) && showSearch && searchOpen && (
        <div className="border-b border-neutral-200 bg-white px-4 py-2.5 shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 rounded-md bg-[#f5f5f3] px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." autoFocus className="w-full border-none bg-none text-neutral-800 outline-none text-[14px]" />
          </div>
        </div>
      )}
      </div>

      {/* The dropdown menu, on mobile and tablet. Tablet lists nav links only, since
          its balance, create and login controls already sit on the bar, so the blocks
          below are mobile-only. A fixed overlay under the sticky nav, so it opens at the
          current scroll position rather than the top of the page. */}
      {/* Fixed, and one z below the nav: the bar has to stay on top of its own menu.
          top-14 and the max-height both track the 56px bar. */}
      {!isDesktop && menuOpen && (
        <div className="fixed top-14 right-0 left-0 z-99 max-h-[calc(100vh-56px)] overflow-y-auto border-b border-neutral-200 bg-white px-4 pt-2 pb-4 shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
          {navLinks.map(({ label, path }) => (
            path.startsWith("#") ? (
              <a
                key={label} href={path} onClick={() => setMenuOpen(false)}
                className="block border-b border-neutral-100 py-2.5 pl-1 no-underline transition-[background,padding-left] duration-150 hover:bg-neutral-50 hover:pl-2.5 pr-1 text-[15px] font-normal text-neutral-700"
              >{label}</a>
            ) : (
              <Link
                key={label} to={path} onClick={() => setMenuOpen(false)}
                className={`block border-b border-neutral-100 py-2.5 pl-1 no-underline transition-[background,padding-left] duration-150 hover:bg-neutral-50 hover:pl-2.5 pr-1 text-[15px] ${isActive(path) ? "font-bold text-brand" : "font-normal text-neutral-700"}`}
              >{label}</Link>
            )
          ))}

          {isMobile && !isLoggedIn && (
            <div className="mt-3">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-[5px] bg-brand p-2.5 text-center text-[13px] font-bold text-white no-underline transition-colors duration-150 hover:bg-brand-dark">LOGIN</Link>
            </div>
          )}

          {isLoggedIn && (
            <div className="mt-3">
              {/* Balance + Start already sit on the tablet bar, so show them in
                  the menu on mobile only; Account + Logout show on both. */}
              {isMobile && showBalance && (
                <div className="border-b border-neutral-100 px-1 py-2 text-[13px] font-bold text-brand">
                  Balance: {ccBalance.toLocaleString()} CC
                </div>
              )}
              {isMobile && canCreate && (
                <Link
                  to="/create-project" onClick={() => setMenuOpen(false)}
                  className="block rounded-[5px] bg-brand p-2.5 text-center text-[13px] font-bold text-white no-underline transition-colors duration-150 hover:bg-brand-dark my-2.5"
                >START A PROJECT</Link>
              )}
              {isMobile && canCreateForOthers && (
                <Link
                  to="/create-project" onClick={() => setMenuOpen(false)}
                  className="block rounded-[5px] bg-brand p-2.5 text-center text-[13px] font-bold text-white no-underline transition-colors duration-150 hover:bg-brand-dark my-2.5"
                >CREATE FOR A CREATOR</Link>
              )}
              <Link
                to="/account" onClick={() => setMenuOpen(false)}
                className="block border-b border-neutral-100 py-2.5 pl-1 no-underline transition-[background,padding-left] duration-150 hover:bg-neutral-50 hover:pl-2.5 pr-1 text-[14px] text-neutral-800"
              >Account</Link>
              <button
                onClick={() => { setMenuOpen(false); onLogout?.(); }}
                className="block w-full cursor-pointer border-none bg-none py-2.5 pr-1 pl-1 text-left text-[14px] font-semibold text-brand transition-[background,padding-left] duration-150 hover:bg-neutral-50 hover:pl-2.5"
              >Logout</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
