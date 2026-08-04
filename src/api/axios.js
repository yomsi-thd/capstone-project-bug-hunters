import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api", //backend port
  headers: {
    "Content-Type": "application/json",
  },
});

// Every protected route on the backend goes through its `authenticate` middleware, which
// reads `Authorization: Bearer <token>`. Without this the requests come back 401 even
// while logged in.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// TODO: on 401, call POST /auth/refresh with the stored refreshToken and retry once.
// Access tokens expire after 15m, so without this the user is silently logged out.
// Deferred: the backend's refresh endpoint currently throws (verifyRefreshToken is not
// imported in authService.js) — see BACKEND-REVIEW-FOR-HIEU.md §2.1a.

export default api;
