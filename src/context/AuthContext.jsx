/* eslint-disable react-refresh/only-export-components -- provider + useAuth hook intentionally colocated */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi";
import * as classCoinApi from "../api/classCoinApi";
import { toNumber } from "../api/mappers";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, SESSION_EXPIRED_EVENT } from "../api/axios";

// Fallback accounts, used ONLY when the backend cannot be reached at all.
// They exist so the UI is still browsable when the API is down — see login().
// A user can hold multiple roles; these two personas cover the app's cases.
//   student  = Backer + Creator  -> sees everything
//   lecturer = Admin  + Backer   -> Admin is a superuser, so this sees everything too
// Admins can access every function, so admin implies both creator (create/manage
// projects) and backer (invest) capabilities in the derived permissions below.
const ACCOUNTS = {
  student1: {
    password: "student1@",
    name: "Student One",
    roles: ["backer", "creator"],
    balance: 4500,
  },
  lecturer1: {
    password: "lecturer1@",
    name: "Lecturer One",
    roles: ["backer"],
    balance: 4500,
  },
  creator1: {
    password: "creator1@",
    name: "Creator One",
    roles: ["creator"],
    balance: 0,
  },
  admin1: {
    password: "admin1@",
    name: "Admin One",
    roles: ["admin"],
    balance: 0,
  },
};

const STORAGE_KEY = "rmit_launchpad_user";
function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Restore session on refresh so navigating around keeps you logged in.
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, [user]);

  // The axios interceptor fires this when a 401 could not be recovered by refreshing
  // (refresh token expired after 7 days, or revoked). Drop the user so the UI stops
  // pretending to be signed in.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Sign in with a mock account — only used when the backend is unreachable.
  const loginWithMock = useCallback((identifier, password) => {
    const key = (identifier || "").trim().toLowerCase();
    const account = ACCOUNTS[key];
    if (!account || account.password !== password) {
      return { ok: false, error: "Invalid username or password" };
    }
    const userObj = {
      id: null,
      username: key,
      name: account.name,
      roles: account.roles,
      balance: account.balance,
      source: "mock",
    };
    setUser(userObj);
    return { ok: true, user: userObj };
  }, []);

  /**
   * Call the backend first; only fall back to a mock account when the backend is
   * NOT reachable at all.
   *
   * Important: when the backend answers with an error (401 wrong password, 500 server
   * error) do NOT fall back — surface that error instead. Falling back on a 401 would
   * let a wrong password still sign in via a mock account, which is very hard to spot.
   *
   * Returns { ok: true, user } or { ok: false, error }.
   */
  const login = useCallback(async (identifier, password) => {
    const id = (identifier || "").trim();

    let data;
    try {
      // The backend only looks users up by email (userRepository.findByEmail), so the
      // identifier goes straight into the email field. Signing in with an RMIT ID will
      // 401 until the backend adds an rmit_id column.
      data = await authApi.login(id, password);
    } catch (err) {
      if (err?.response) {
        return {
          ok: false,
          error: err.response.data?.message || "Invalid email or password",
        };
      }
      // No response => backend down / wrong port / CORS => use the mock accounts.
      return loginWithMock(id, password);
    }

    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }

    // The backend stores roles uppercase ("BACKER"); the whole UI gates on lowercase.
    const roles = (data.user?.roles ?? []).map((r) => String(r).toLowerCase());

    // The balance lives on its own endpoint. A user with no wallet gets a 404 — treat
    // that as 0 rather than failing the whole sign-in.
    let balance = 0;
    try {
      const wallet = await classCoinApi.getBalance();
      balance = toNumber(wallet?.balance);
    } catch {
      /* no wallet yet -> leave it at 0, do not fail the sign-in */
    }

    const userObj = {
      id: data.user?.id ?? null,
      username: data.user?.email ?? id,
      name: data.user?.fullName ?? data.user?.email ?? id,
      roles,
      balance,
      source: "api",
    };
    setUser(userObj);
    return { ok: true, user: userObj };
  }, [loginWithMock]);

  // Re-read the balance after investing so the Header updates immediately.
  // A mock session has no access token, so this guard also skips mock sessions.
  const refreshBalance = useCallback(async () => {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) return;
    try {
      const wallet = await classCoinApi.getBalance();
      setUser((prev) => (prev ? { ...prev, balance: toNumber(wallet?.balance) } : prev));
    } catch {
      /* keep the previous balance if the call fails */
    }
  }, []);

  // Merge a patch into the signed-in user. The Account page calls this after saving
  // the profile so the Header shows the new name straight away — without it the old
  // name survives until the next sign-in, because the session is restored from
  // localStorage rather than refetched. The effect above persists the result.
  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    // Revoke the refresh token server-side, but never block the client-side logout.
    if (refreshToken) authApi.logout(refreshToken).catch(() => {});
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(() => {
    const roles = user?.roles ?? [];
    const isCreator = roles.includes("creator");
    const isAdmin = roles.includes("admin");
    const isBacker = roles.includes("backer");
    return {
      user,
      isLoggedIn: !!user,
      roles,
      isCreator,
      isAdmin,
      isBacker,
      // Who can create/manage projects: Creators, plus Admins (superuser).
      canCreate: isCreator || isAdmin,
      // Creators alone cannot invest; Backers and Admins can.
      canInvest: isBacker || isAdmin,
      balance: user?.balance ?? 0,
      // True when running on a mock account because the backend was unreachable —
      // the Header shows a marker so this is not mistaken for real data.
      isMockSession: user?.source === "mock",
      login,
      logout,
      refreshBalance,
      updateUser,
    };
  }, [user, login, logout, refreshBalance, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
