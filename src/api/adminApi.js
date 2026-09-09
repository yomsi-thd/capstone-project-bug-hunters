import api from "./axios";

export const getAllUsers = async () => {
  const response = await api.get("/admin/users");

  // List endpoints answer { items, total, limit, offset }. Unwrapped here so pages and
  // mappers keep the plain array they were written against.
  return response.data.items;
};

export const getUsersById = async (id) => {
  const response = await api.get(`/admin/users/${id}`);

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

// Replaces the whole role set, so send every role the user should end up with, e.g.
// ["BACKER", "CREATOR"]. The only way to grant a role by hand.
export const updateUserRoles = async (id, roles) => {
  const response = await api.patch(`/admin/users/${id}/roles`, { roles });

  return response.data;
};

export const getAllProject = async () => {
  const response = await api.get("/admin/projects");

  return response.data.items;
};

export const getProjectById = async (id) => {
  const response = await api.get(`/admin/projects/${id}`);

  return response.data;
};

export const getAllCreatorRequests = async () => {
  const response = await api.get("/admin/creator-requests");

  return response.data.items;
};

export const approveCreatorRequest = async (id) => {
  const response = await api.patch(`/admin/creator-requests/${id}/approve`);
  return response.data;
} 

export const rejectCreatorRequest = async (id) => {
  const response = await api.patch(`/admin/creator-requests/${id}/reject`);
  return response.data;
}
// Pending coin requests only.
export const getAllCoinRequests = async () => {
  const response = await api.get("/admin/coin-requests");

  return response.data.items;
};

// The admin types the amount when approving; the person asking never names one.
export const approveCoinRequest = async (id, amount) => {
  const response = await api.patch(`/admin/coin-requests/${id}/approve`, { amount });
  return response.data;
};

export const rejectCoinRequest = async (id) => {
  const response = await api.patch(`/admin/coin-requests/${id}/reject`);
  return response.data;
};
