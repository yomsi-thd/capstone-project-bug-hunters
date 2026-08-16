import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

// React itself logs every caught error to console.error, so a passing run would
// otherwise bury the real output under stack traces.
let consoleError;
beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
});

function Boom({ shouldThrow }) {
  if (shouldThrow) throw new Error("gallery is not defined");
  return <p>the page rendered</p>;
}

describe("ErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("the page rendered")).toBeInTheDocument();
  });

  // The whole point: without this, React unmounts the entire tree and the user is
  // left on a blank white page with no way out but F5.
  it("shows the fallback instead of a blank page when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText("the page rendered")).not.toBeInTheDocument();
  });

  it("surfaces the error message so the failure is identifiable without DevTools", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/gallery is not defined/)).toBeInTheDocument();
  });

  it("offers both an in-place retry and a full reload out to Discover", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>
    );
    // A real anchor, not a router Link: reloading the document is what clears the
    // state that caused the crash.
    expect(screen.getByRole("link", { name: /discover/i })).toHaveAttribute("href", "/discover");
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("recovers when TRY AGAIN is pressed and the child no longer throws", () => {
    // The flag is flipped by the test rather than by the component: React re-renders a
    // failed subtree once more to collect a better stack, so a "throw only the first
    // time" fixture would silently succeed on that retry and never show the fallback.
    const cause = { throwing: true };
    function Flaky() {
      if (cause.throwing) throw new Error("transient");
      return <p>the page rendered</p>;
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    cause.throwing = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("the page rendered")).toBeInTheDocument();
  });

  it("logs the error so it is still recoverable from the console", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
