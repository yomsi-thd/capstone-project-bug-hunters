import axios from "axios";

// Set VITE_API_URL in .env when the backend is not on localhost:3000.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";

// Lets AuthContext sign the user out when the session cannot be recovered. A plain DOM
// event keeps this file free of any React import.
export const SESSION_EXPIRED_EVENT = "rmit-launchpad:session-expired";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Protected routes read `Authorization: Bearer <token>`, so attach it to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 from these means bad credentials or a dead refresh token. Refreshing would be
// pointless, and on a failed login it would turn "wrong password" into a logout.
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

// Only one refresh at a time. A page that fires several requests at once would
// otherwise start a refresh per 401 and race.
let refreshPromise = null;

function clearSession() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("No refresh token stored");

  // Bare axios, not `api`. Going through the instance would re-enter the interceptor
  // below and recurse if the refresh itself 401s.
  const { data } = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } }
  );

  if (!data?.accessToken) throw new Error("Refresh response had no accessToken");
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  return data.accessToken;
}

// Access tokens last 15 minutes. Retry once with a fresh one, otherwise the app just
// starts failing mid-session and looks broken.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const shouldTryRefresh =
      status === 401 &&
      original &&
      !original._retried &&
      !NO_REFRESH_PATHS.some((path) => (original.url || "").includes(path)) &&
      localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!shouldTryRefresh) return Promise.reject(error);

    original._retried = true;

    try {
      refreshPromise = refreshPromise || refreshAccessToken();
      const newToken = await refreshPromise;
      original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
      return api(original);
    } catch (refreshError) {
      // Refresh token gone or expired (7 days). The session is over.
      clearSession();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  }
);

export default api;
