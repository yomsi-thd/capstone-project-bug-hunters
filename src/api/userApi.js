import api from "./axios";

export const getProfile = async () => {
  const response = await api.get("/users/profile");

  return response.data;
};

export const updateProfile = async (userData) => {
  const response = await api.put("/users/profile", userData);

  return response.data;
};