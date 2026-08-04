import api from "./axios";

export const getAllUsers = async () => {
  const response = await api.get("/admin/users");

  return response.data;
};

export const deactivateUser = async (id) => {
  const response = await api.patch(`/admin/users/${id}/deactivate`);

  return response.data;
};

export const activateUser = async (id) => {
  const response = await api.patch(`/admin/users/${id}/activate`);

  return response.data;
};