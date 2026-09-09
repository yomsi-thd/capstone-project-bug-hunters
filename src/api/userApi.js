import api from "./axios";

export const getProfile = async () => {
  const response = await api.get("/users/profile");

  return response.data;
};

export const updateProfile = async (userData) => {
  const response = await api.put("/users/profile", userData);

  return response.data;
};

// Takes { oldPassword, newPassword } and answers { message }.
export const changePassword = async (oldPassword, newPassword) => {
  const response = await api.put("/users/change-password", { oldPassword, newPassword });

  return response.data;
};

export const deleteProfile = async () => {
  const response = await api.delete("/users/profile");

  return response.data;
};