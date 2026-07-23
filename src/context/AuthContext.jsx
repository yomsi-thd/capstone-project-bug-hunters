/* eslint-disable react-refresh/only-export-components -- provider + useAuth hook intentionally colocated */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Mock accounts for testing until a real backend is wired in.
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
    roles: ["admin", "backer"],
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

  // TODO: replace with authService.login() when the backend is ready.
  // Returns { ok: true } on success, or { ok: false, error } on failure.
  const login = (identifier, password) => {
    const key = (identifier || "").trim().toLowerCase();
    const account = ACCOUNTS[key];
    if (!account || account.password !== password) {
      return { ok: false, error: "Invalid username or password" };
    }
    setUser({ username: key, name: account.name, roles: account.roles, balance: account.balance });
    return { ok: true };
  };

  const logout = () => setUser(null);

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
      login,
      logout,
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
