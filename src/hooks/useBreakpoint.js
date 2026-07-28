import useWindowWidth from "./useWindowWidth";

// Single source for the app's responsive breakpoints (px), so the 640/1024/1200
// thresholds aren't retyped as loose literals across pages.
//   width <  MOBILE_MAX            -> mobile stack
//   MOBILE_MAX <= width < desktop  -> tablet
//   width >= desktop               -> desktop
// Pages use a 1024 desktop threshold. The Header deliberately uses a tighter
// 1200 (HEADER_DESKTOP_MIN): its full nav — links + balance + CTA + account +
// logout, plus search on Discover — needs ~1180px and overflows below that, so
// it collapses to the hamburger on 1024–1199 even though page content still
// lays out as desktop there. Keep the two thresholds distinct on purpose.
export const BREAKPOINTS = {
  MOBILE_MAX: 640,
  DESKTOP_MIN: 1024,
  HEADER_DESKTOP_MIN: 1200,
};

// Returns the current width plus derived isMobile/isTablet/isDesktop flags.
// Pass a custom desktopMin (e.g. BREAKPOINTS.HEADER_DESKTOP_MIN) when a component
// needs a different desktop threshold than the page default.
export default function useBreakpoint(desktopMin = BREAKPOINTS.DESKTOP_MIN) {
  const width = useWindowWidth();
  return {
    width,
    isMobile: width < BREAKPOINTS.MOBILE_MAX,
    isTablet: width >= BREAKPOINTS.MOBILE_MAX && width < desktopMin,
    isDesktop: width >= desktopMin,
  };
}
