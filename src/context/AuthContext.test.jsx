import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// AuthContext calls the backend before falling back to the mock accounts, so both
// API modules are stubbed — no test may touch the real network.
vi.mock("../api/authApi", () => ({
  login: vi.fn(),
  logout: vi.fn(() => Promise.resolve()),
  register: vi.fn(),
  refreshToken: vi.fn(),
}));
vi.mock("../api/classCoinApi", () => ({
  getBalance: vi.fn(),
  getTransactions: vi.fn(),
}));

import * as authApi from "../api/authApi";
import * as classCoinApi from "../api/classCoinApi";
import { AuthProvider, useAuth } from "./AuthContext";

const STORAGE_KEY = "rmit_launchpad_user";
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

// An axios network error has no `response` property — that is the "backend is
// unreachable" signal AuthContext uses to decide whether to fall back.
function networkError() {
  return new Error("Network Error");
}

function httpError(status, message) {
  const err = new Error(message);
  err.response = { status, data: { message } };
  return err;
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

async function login(result, id, pw) {
  let res;
  await act(async () => {
    res = await result.current.login(id, pw);
  });
  return res;
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Default in tests: pretend the backend is down -> use the mock accounts.
    authApi.login.mockRejectedValue(networkError());
    classCoinApi.getBalance.mockResolvedValue({ balance: 0 });
  });

  it("starts logged out with no permissions", () => {
    const { result } = renderAuth();
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.roles).toEqual([]);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canInvest).toBe(false);
    expect(result.current.balance).toBe(0);
  });

  it("rejects invalid credentials and stays logged out", async () => {
    const { result } = renderAuth();
    const res = await login(result, "student1", "wrong-password");
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("logs in student1 (backer + creator) with both create and invest access", async () => {
    const { result } = renderAuth();
    const res = await login(result, "student1", "student1@");
    expect(res.ok).toBe(true);
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.roles).toEqual(["backer", "creator"]);
    expect(result.current.canCreate).toBe(true);
    expect(result.current.canInvest).toBe(true);
    expect(result.current.balance).toBe(4500);
  });

  it("logs in creator1 (pure creator) who can create but CANNOT invest", async () => {
    const { result } = renderAuth();
    await login(result, "creator1", "creator1@");
    expect(result.current.isCreator).toBe(true);
    expect(result.current.canCreate).toBe(true);
    // A pure creator is not a backer -> no invest access.
    expect(result.current.canInvest).toBe(false);
    // A creator opens the wizard for themselves, never for anybody else.
    expect(result.current.canOpenProjectWizard).toBe(true);
    expect(result.current.canCreateForOthers).toBe(false);
  });

  it("logs in admin1, who owns nothing but may file for a creator", async () => {
    const { result } = renderAuth();
    await login(result, "admin1", "admin1@");
    expect(result.current.isAdmin).toBe(true);
    // The 2026-08-24 role separation: an admin holds ADMIN alone, owns no projects
    // and no Class Coins. Both of these were true before that date.
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canInvest).toBe(false);
    // What replaced it: an admin may open the wizard, but only on behalf of someone.
    expect(result.current.canCreateForOthers).toBe(true);
    expect(result.current.canOpenProjectWizard).toBe(true);
    // isCreator stays literal role membership, not the derived permission.
    expect(result.current.isCreator).toBe(false);
  });

  it("is case-insensitive and trims the identifier", async () => {
    const { result } = renderAuth();
    const res = await login(result, "  Student1  ", "student1@");
    expect(res.ok).toBe(true);
    expect(result.current.user.username).toBe("student1");
  });

  it("persists the session to localStorage and clears it on logout", async () => {
    const { result } = renderAuth();
    await login(result, "student1", "student1@");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).username).toBe("student1");

    act(() => {
      result.current.logout();
    });
    expect(result.current.isLoggedIn).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // The Account page saves the profile and then calls updateUser, so the Header shows
  // the new name without a sign-out. The session is restored from localStorage rather
  // than refetched, so the patch has to reach storage too.
  it("merges a patch into the signed-in user and persists it", async () => {
    const { result } = renderAuth();
    await login(result, "student1", "student1@");

    act(() => {
      result.current.updateUser({ name: "Renamed Student", username: "new@test.com" });
    });

    expect(result.current.user.name).toBe("Renamed Student");
    expect(result.current.user.username).toBe("new@test.com");
    // Untouched fields survive the merge — a patch must not wipe the roles.
    expect(result.current.roles).toEqual(["backer", "creator"]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).name).toBe("Renamed Student");
  });

  it("ignores an updateUser patch while logged out", () => {
    const { result } = renderAuth();
    act(() => {
      result.current.updateUser({ name: "Nobody" });
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
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

  describe("with the backend running", () => {
    it("signs in through the API, lowercases roles and loads the balance", async () => {
      authApi.login.mockResolvedValue({
        accessToken: "access-123",
        refreshToken: "refresh-456",
        user: { id: 14, fullName: "Huy Test", email: "huy@test.com", roles: ["BACKER", "CREATOR"] },
      });
      classCoinApi.getBalance.mockResolvedValue({ balance: 4200 });

      const { result } = renderAuth();
      const res = await login(result, "huy@test.com", "HuyTest123");

      expect(res.ok).toBe(true);
      expect(result.current.roles).toEqual(["backer", "creator"]);
      expect(result.current.balance).toBe(4200);
      expect(result.current.user.id).toBe(14);
      expect(result.current.isMockSession).toBe(false);
      // Tokens must be stored under the exact keys api/axios.js reads.
      expect(localStorage.getItem("accessToken")).toBe("access-123");
      expect(localStorage.getItem("refreshToken")).toBe("refresh-456");
    });

    it("still signs in when the user has no ClassCoin wallet (balance = 0)", async () => {
      authApi.login.mockResolvedValue({
        accessToken: "a",
        refreshToken: "r",
        user: { id: 12, fullName: "No Wallet", email: "nowallet@test.com", roles: [] },
      });
      classCoinApi.getBalance.mockRejectedValue(httpError(404, "ClassCoin account not found"));

      const { result } = renderAuth();
      const res = await login(result, "nowallet@test.com", "pw");

      expect(res.ok).toBe(true);
      expect(result.current.balance).toBe(0);
    });

    it("does NOT fall back to a mock account when the backend returns 401", async () => {
      authApi.login.mockRejectedValue(httpError(401, "Invalid email or password"));

      const { result } = renderAuth();
      // These are VALID mock credentials. If a 401 also fell back, this would sign
      // in — exactly the hole this test guards.
      const res = await login(result, "student1", "student1@");

      expect(res.ok).toBe(false);
      expect(res.error).toBe("Invalid email or password");
      expect(result.current.isLoggedIn).toBe(false);
    });

    it("does NOT fall back to a mock account when the backend errors with 500", async () => {
      authApi.login.mockRejectedValue(httpError(500, "column \"role\" does not exist"));

      const { result } = renderAuth();
      const res = await login(result, "student1", "student1@");

      expect(res.ok).toBe(false);
      // The backend's real error must surface instead of being swallowed.
      expect(res.error).toContain("role");
      expect(result.current.isLoggedIn).toBe(false);
    });

    it("flags the session as mock when the backend is unreachable", async () => {
      const { result } = renderAuth();
      await login(result, "student1", "student1@");
      expect(result.current.isMockSession).toBe(true);
    });

    // The fallback is a DEV convenience. A production build must report the
    // outage instead, or Render's ~50s cold start reads as a wrong password.
    // vi.stubEnv reaches import.meta.env, and unstubEnvs in afterEach puts it
    // back so the surrounding tests keep their DEV behaviour.
    describe("in a production build", () => {
      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it("does NOT fall back to a mock account when the backend is unreachable", async () => {
        vi.stubEnv("DEV", false);
        const { result } = renderAuth();
        // Valid mock credentials: if the fallback still ran, this would sign in.
        const res = await login(result, "student1", "student1@");

        expect(res.ok).toBe(false);
        expect(result.current.isLoggedIn).toBe(false);
        expect(result.current.isMockSession).toBe(false);
      });

      it("says the server is unreachable, not that the password is wrong", async () => {
        vi.stubEnv("DEV", false);
        const { result } = renderAuth();
        const res = await login(result, "student1", "student1@");

        expect(res.error).toMatch(/reach the server/i);
        expect(res.error).not.toMatch(/password/i);
      });

      it("still surfaces a real 401 as a wrong password", async () => {
        vi.stubEnv("DEV", false);
        authApi.login.mockRejectedValue(httpError(401, "Invalid email or password"));
        const { result } = renderAuth();
        const res = await login(result, "TestStudent@test.com", "wrong");

        expect(res.error).toBe("Invalid email or password");
      });
    });
  });
});
