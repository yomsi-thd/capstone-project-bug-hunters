import axios from "axios";

// Set VITE_API_URL in .env when the backend is not on localhost:3000.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";

// Fired when the session cannot be recovered, so AuthContext can drop the user.
// A plain DOM event keeps this module free of any React import.
export const SESSION_EXPIRED_EVENT = "rmit-launchpad:session-expired";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Every protected route on the backend goes through its `authenticate` middleware, which
// reads `Authorization: Bearer <token>`. Without this the requests come back 401 even
// while logged in.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 on these endpoints means bad credentials or a dead refresh token — retrying
// with a fresh access token would be pointless, and refreshing on a failed login
// would turn "wrong password" into a confusing logout.
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

// Only one refresh may be in flight. Without this, a page that fires several requests
// at once (Discover, My Investments) would kick off one refresh per 401, and every one
// but the first would fail because the backend rotates nothing but still races.
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

  // Deliberately a bare axios call, not `api` — going through this instance would
  // re-enter the interceptor and recurse if the refresh itself 401s.
  const { data } = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } }
  );

  if (!data?.accessToken) throw new Error("Refresh response had no accessToken");
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  return data.accessToken;
}

// Access tokens live 15 minutes. Without this, the app silently breaks mid-session:
// requests start coming back 401 and the UI looks like an integration bug.
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
      // The refresh token is gone or expired (7 days) — the session is over.
      clearSession();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  }
);

export default api;
