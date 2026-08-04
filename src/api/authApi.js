import api from "./axios";

export const login = async (email, password) => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};

export const register = async (userData) => {
  const response = await api.post("/auth/register", userData);

  return response.data;
};

export const refreshToken = async (refreshToken) => {
  const response = await api.post("/auth/refresh", {
    refreshToken,
  });

  return response.data;
};

export const logout = async (refreshToken) => {
  const response = await api.post("/auth/logout", {
    refreshToken,
  });

  return response.data;
};