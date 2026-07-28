import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const STORAGE_KEY = "rmit_launchpad_user";
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

// Log a mock account in and return the fresh hook result.
function renderAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

function login(result, id, pw) {
  let res;
  act(() => {
    res = result.current.login(id, pw);
  });
  return res;
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts logged out with no permissions", () => {
    const { result } = renderAuth();
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.roles).toEqual([]);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canInvest).toBe(false);
    expect(result.current.balance).toBe(0);
  });

  it("rejects invalid credentials and stays logged out", () => {
    const { result } = renderAuth();
    const res = login(result, "student1", "wrong-password");
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("logs in student1 (backer + creator) with both create and invest access", () => {
    const { result } = renderAuth();
    const res = login(result, "student1", "student1@");
    expect(res.ok).toBe(true);
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.roles).toEqual(["backer", "creator"]);
    expect(result.current.canCreate).toBe(true);
    expect(result.current.canInvest).toBe(true);
    expect(result.current.balance).toBe(4500);
  });

  it("logs in creator1 (pure creator) who can create but CANNOT invest", () => {
    const { result } = renderAuth();
    login(result, "creator1", "creator1@");
    expect(result.current.isCreator).toBe(true);
    expect(result.current.canCreate).toBe(true);
    // A pure creator is not a backer -> no invest access. This is the key
    // asymmetry: canInvest is backer|admin, not creator.
    expect(result.current.canInvest).toBe(false);
  });

  it("logs in admin1 (superuser) with both create and invest access", () => {
    const { result } = renderAuth();
    login(result, "admin1", "admin1@");
    expect(result.current.isAdmin).toBe(true);
    // Admin implies both creator-level and backer-level permissions.
    expect(result.current.canCreate).toBe(true);
    expect(result.current.canInvest).toBe(true);
    // ...but isCreator stays literal role membership, not the derived permission.
    expect(result.current.isCreator).toBe(false);
  });

  it("is case-insensitive and trims the identifier", () => {
    const { result } = renderAuth();
    const res = login(result, "  Student1  ", "student1@");
    expect(res.ok).toBe(true);
    expect(result.current.user.username).toBe("student1");
  });

  it("persists the session to localStorage and clears it on logout", () => {
    const { result } = renderAuth();
    login(result, "student1", "student1@");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).username).toBe("student1");

    act(() => {
      result.current.logout();
    });
    expect(result.current.isLoggedIn).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("restores a persisted session on mount", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ username: "lecturer1", name: "Lecturer One", roles: ["backer"], balance: 4500 })
    );
    const { result } = renderAuth();
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.canInvest).toBe(true);
    expect(result.current.canCreate).toBe(false);
  });
});
