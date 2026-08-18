import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

// The guard reads one thing from AuthContext — the derived permission flags — so the
// context is stubbed rather than driven through a real login. That keeps each case to
// "these flags produce this outcome", which is exactly the rule being tested.
const auth = { isLoggedIn: false, canCreate: false, canInvest: false, isAdmin: false };
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => auth,
}));

// Header pulls in the nav config, the balance badge and its own breakpoint state. None
// of that is under test here, and rendering it would make a failure in the header look
// like a failure in the guard.
vi.mock("../layout/Header", () => ({ default: () => <header>header</header> }));
vi.mock("../layout/Footer", () => ({ default: () => <footer>footer</footer> }));

import RequireAccess from "./RequireAccess";

function setAuth(patch) {
  Object.assign(auth, { isLoggedIn: false, canCreate: false, canInvest: false, isAdmin: false }, patch);
}

// Stands in for the login page and reports the state the guard redirected with, so the
// "come back here after signing in" behaviour is observable.
function LoginProbe() {
  const location = useLocation();
  return <div data-testid="login">login:{location.state?.from ?? "none"}</div>;
}

function renderAt(path, permission) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/creator-dashboard"
          element={
            <RequireAccess permission={permission}>
              <div data-testid="page">the guarded page</div>
            </RequireAccess>
          }
        />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireAccess", () => {
  it("sends a signed-out visitor to /login", () => {
    setAuth({ isLoggedIn: false });
    renderAt("/creator-dashboard", "canCreate");

    expect(screen.getByTestId("login")).toBeInTheDocument();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
  });

  it("carries the attempted path so Login can return them to it", () => {
    // Without this, signing in from a guarded link drops you on Discover and you have
    // to find your way back to what you clicked.
    setAuth({ isLoggedIn: false });
    renderAt("/creator-dashboard", "canCreate");

    expect(screen.getByTestId("login")).toHaveTextContent("login:/creator-dashboard");
  });

  it("renders the page when the permission is held", () => {
    setAuth({ isLoggedIn: true, canCreate: true });
    renderAt("/creator-dashboard", "canCreate");

    expect(screen.getByTestId("page")).toBeInTheDocument();
  });

  it("shows the no-access page — NOT the login page — for a signed-in user without the role", () => {
    // This is the whole reason the branch exists: bouncing a signed-in user to /login
    // reads as "your session died" and sends them chasing a bug that is not there.
    setAuth({ isLoggedIn: true, canCreate: false });
    renderAt("/creator-dashboard", "canCreate");

    expect(screen.getByRole("heading", { name: /do not have access/i })).toBeInTheDocument();
    expect(screen.queryByTestId("login")).not.toBeInTheDocument();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
  });

  it("offers a way out of the no-access page", () => {
    setAuth({ isLoggedIn: true, isAdmin: false });
    renderAt("/creator-dashboard", "isAdmin");

    expect(screen.getByRole("link", { name: /back to discover/i })).toHaveAttribute("href", "/discover");
  });

  it("defaults to requiring only a session", () => {
    // The default `permission` is "isLoggedIn", which must not be looked up as a flag
    // and found falsy — that would lock every signed-in user out of the plain guard.
    setAuth({ isLoggedIn: true });
    renderAt("/creator-dashboard", undefined);

    expect(screen.getByTestId("page")).toBeInTheDocument();
  });

  it("gates each permission independently", () => {
    // An admin is a superuser for creator pages (canCreate is true for them), but the
    // flags are separate values and the guard must read the one it was given.
    setAuth({ isLoggedIn: true, isAdmin: true, canCreate: true });
    const { unmount } = renderAt("/creator-dashboard", "isAdmin");
    expect(screen.getByTestId("page")).toBeInTheDocument();
    unmount();

    setAuth({ isLoggedIn: true, canInvest: true });
    renderAt("/creator-dashboard", "isAdmin");
    expect(screen.getByRole("heading", { name: /do not have access/i })).toBeInTheDocument();
  });
});
