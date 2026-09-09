/* eslint-disable react-refresh/only-export-components -- provider + useAuth hook intentionally colocated */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi";
import * as classCoinApi from "../api/classCoinApi";
import { toNumber } from "../api/mappers";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, SESSION_EXPIRED_EVENT } from "../api/axios";
import { serverMessage } from "../api/apiError";

// Fallback accounts, used only when the backend cannot be reached at all, so the UI
// stays browsable while the API is down. See login().
//
// A non-admin may hold two roles, and the four below cover every case the app has:
//   student1  = Backer + Creator  -> sees everything a member can own
//   lecturer1 = Backer            -> a plain member
//   creator1  = Creator           -> no balance, cannot invest
//   admin1    = Admin             -> owns nothing at all
//
// Admin implies neither creator nor backer. An admin reaches the project wizard through
// canCreateForOthers, filing on a creator's behalf. See the permissions below.
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

  // The axios interceptor fires this when a 401 could not be recovered by refreshing,
  // so drop the user rather than let the UI keep acting signed in.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Signs in with a mock account. Only reached when the backend is unreachable.
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
   * Calls the backend, and falls back to a mock account only when the backend cannot be
   * reached at all.
   *
   * An error answer (401, 500) is surfaced rather than fallen back on. Falling back on a
   * 401 would let a wrong password sign in as a mock user, which is very hard to spot.
   *
   * Returns { ok: true, user } or { ok: false, error }.
   */
  const login = useCallback(async (identifier, password) => {
    const id = (identifier || "").trim();

    let data;
    try {
      // The backend looks users up by email only, so the identifier goes into the email
      // field. An RMIT ID will 401 until there is a column to match it against.
      data = await authApi.login(id, password);
    } catch (err) {
      if (err?.response) {
        return {
          ok: false,
          // serverMessage rather than errorMessage, so this falls through to the
          // sentence below instead of axios's "Request failed with status code 401".
          error: serverMessage(err) || "Invalid email or password",
        };
      }
      // No response means the backend is down, on the wrong port, or blocked by CORS.
      //
      // In dev, fall back to the mock accounts so the UI stays browsable with nothing
      // running. In production, don't: the free Render service sleeps after 15 minutes
      // and takes about 50s to wake, and a request that dies mid-wake looks exactly like
      // this. Falling back there would report "invalid password" for a correct one.
      if (!import.meta.env.DEV) {
        return {
          ok: false,
          error: "Cannot reach the server. It may be starting up — please try again in a moment.",
        };
      }
      return loginWithMock(id, password);
    }

    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }

    // The backend stores roles uppercase ("BACKER"), the UI gates on lowercase.
    const roles = (data.user?.roles ?? []).map((r) => String(r).toLowerCase());

    // The balance has its own endpoint, and a user with no wallet gets a 404. Treat
    // that as 0 rather than failing the sign-in.
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

  // Re-reads the balance after investing so the Header updates at once. A mock session
  // has no access token, so the guard skips it too.
  const refreshBalance = useCallback(async () => {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) return;
    try {
      const wallet = await classCoinApi.getBalance();
      setUser((prev) => (prev ? { ...prev, balance: toNumber(wallet?.balance) } : prev));
    } catch {
      /* keep the previous balance if the call fails */
    }
  }, []);

  // Merges a patch into the signed-in user. Account calls it after saving the profile
  // so the Header picks up the new name; the session is restored from localStorage
  // rather than refetched, so otherwise the old name lasts until the next sign-in.
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
      // Permissions. An admin is not a superuser: the account holds ADMIN alone and
      // owns no projects and no Class Coins. Every page reads these flags rather than
      // `roles`, so this is the only file to change if that rule is ever reversed.

      // Owns and manages projects of their own. Deliberately not "|| isAdmin".
      canCreate: isCreator,
      // Backers only, so a pure creator and an admin both cannot invest. The backend
      // enforces the same rule; this flag is for the UI, not for security.
      canInvest: isBacker,
      // May open the wizard for somebody else. Separates owning projects from being
      // allowed to file one.
      canCreateForOthers: isAdmin,
      // The union of the two, because RequireAccess takes one permission name rather
      // than a list. Keeps the /create-project guard agreeing with the buttons that
      // lead to it.
      canOpenProjectWizard: isCreator || isAdmin,
      balance: user?.balance ?? 0,
      // True on a mock account. The Header shows a marker so it isn't mistaken for
      // real data.
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
