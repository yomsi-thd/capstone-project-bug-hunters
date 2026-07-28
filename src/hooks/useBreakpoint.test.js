import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useBreakpoint, { BREAKPOINTS } from "./useBreakpoint";

const originalWidth = window.innerWidth;

// jsdom lets us assign innerWidth directly; set it BEFORE render so the hook's
// initial useState picks it up.
function setWidth(w) {
  window.innerWidth = w;
}

afterEach(() => {
  window.innerWidth = originalWidth;
});

describe("useBreakpoint", () => {
  it("reports mobile below MOBILE_MAX", () => {
    setWidth(500);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it("reports tablet between MOBILE_MAX and the desktop threshold", () => {
    setWidth(800);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it("reports desktop at/above the default 1024 threshold", () => {
    setWidth(1100);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isDesktop).toBe(true);
  });

  it("honours a custom desktopMin: the Header's 1200 threshold keeps 1100 as tablet", () => {
    setWidth(1100);
    const { result } = renderHook(() => useBreakpoint(BREAKPOINTS.HEADER_DESKTOP_MIN));
    // At 1100 the page default (1024) is desktop, but the Header's tighter 1200
    // threshold treats it as tablet -> the deliberate divergence stays intact.
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isTablet).toBe(true);
  });

  it("updates on window resize", () => {
    setWidth(500);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(true);

    act(() => {
      window.innerWidth = 1300;
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });
});
