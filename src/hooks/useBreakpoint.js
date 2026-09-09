import useWindowWidth from "./useWindowWidth";

// Single source for the app's responsive breakpoints in px, so 640/1024/1200 aren't
// retyped as loose literals across the pages.
//   width <  MOBILE_MAX            -> mobile stack
//   MOBILE_MAX <= width < desktop  -> tablet
//   width >= desktop               -> desktop
//
// Pages treat 1024 as desktop. The Header uses 1200 instead: its full nav needs about
// 1180px and overflows below that, so it collapses to the hamburger between 1024 and
// 1199 while the page content still lays out as desktop. The two are meant to differ.
export const BREAKPOINTS = {
  MOBILE_MAX: 640,
  DESKTOP_MIN: 1024,
  HEADER_DESKTOP_MIN: 1200,
};

// Returns the current width plus derived isMobile/isTablet/isDesktop flags. Pass a
// custom desktopMin when a component needs a different desktop threshold than the page.
export default function useBreakpoint(desktopMin = BREAKPOINTS.DESKTOP_MIN) {
  const width = useWindowWidth();
  return {
    width,
    isMobile: width < BREAKPOINTS.MOBILE_MAX,
    isTablet: width >= BREAKPOINTS.MOBILE_MAX && width < desktopMin,
    isDesktop: width >= desktopMin,
  };
}
