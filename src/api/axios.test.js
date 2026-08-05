import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import axios from "axios";
import api, {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  SESSION_EXPIRED_EVENT,
} from "./axios";

// The interceptor is exercised through a fake adapter instead of the network, so the
// tests can decide exactly which request 401s and count how many times each one ran.
function unauthorized(config) {
  return Promise.reject({
    config,
    isAxiosError: true,
    response: { status: 401, data: { message: "Invalid or expired token" } },
  });
}

function ok(config, data = { ok: true }) {
  return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config });
}

const realAdapter = api.defaults.adapter;

describe("axios auth interceptor", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    api.defaults.adapter = realAdapter;
  });

  it("attaches the stored access token", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "token-123");
    const seen = [];
    api.defaults.adapter = (config) => {
      seen.push(config.headers.Authorization);
      return ok(config);
    };

    await api.get("/projects");
    expect(seen[0]).toBe("Bearer token-123");
  });

  it("refreshes once on 401 and retries the original request", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "expired");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-abc");

    const post = vi
      .spyOn(axios, "post")
      .mockResolvedValue({ data: { accessToken: "fresh-token" } });

    const authHeaders = [];
    let calls = 0;
    api.defaults.adapter = (config) => {
      authHeaders.push(config.headers.Authorization);
      calls += 1;
      return calls === 1 ? unauthorized(config) : ok(config, { projects: [] });
    };

    const res = await api.get("/projects");

    expect(res.data).toEqual({ projects: [] });
    expect(post).toHaveBeenCalledTimes(1);
    // The retry must carry the NEW token, not the expired one.
    expect(authHeaders[0]).toBe("Bearer expired");
    expect(authHeaders[1]).toBe("Bearer fresh-token");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("fresh-token");
  });

  it("refreshes only once when several requests 401 at the same time", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "expired");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-abc");

    const post = vi
      .spyOn(axios, "post")
      .mockResolvedValue({ data: { accessToken: "fresh-token" } });

    const failedOnce = new Set();
    api.defaults.adapter = (config) => {
      if (!failedOnce.has(config.url)) {
        failedOnce.add(config.url);
        return unauthorized(config);
      }
      return ok(config);
    };

    // Discover and My Investments both fire multiple calls on mount; without the
    // shared in-flight promise this would trigger one refresh per failing request.
    await Promise.all([
      api.get("/projects"),
      api.get("/classcoins"),
      api.get("/classcoins/transactions"),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
  });

  it("does NOT refresh when the login request itself 401s", async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-abc");
    const post = vi.spyOn(axios, "post");

    let calls = 0;
    api.defaults.adapter = (config) => {
      calls += 1;
      return unauthorized(config);
    };

    // A wrong password must surface as a wrong password, not as a token refresh
    // followed by a confusing logout.
    await expect(api.post("/auth/login", {})).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(post).not.toHaveBeenCalled();
    expect(calls).toBe(1);
  });

  it("clears the session and fires the expiry event when refreshing fails", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "expired");
    localStorage.setItem(REFRESH_TOKEN_KEY, "stale-refresh");

    vi.spyOn(axios, "post").mockRejectedValue(new Error("Refresh token expired"));

    const onExpired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);

    api.defaults.adapter = (config) => unauthorized(config);

    await expect(api.get("/projects")).rejects.toBeTruthy();

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);

    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  });

  it("does not try to refresh when no refresh token is stored", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "expired");
    const post = vi.spyOn(axios, "post");

    api.defaults.adapter = (config) => unauthorized(config);

    await expect(api.get("/projects")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(post).not.toHaveBeenCalled();
  });
});
