import api from "./axios";

export const getAllUsers = async () => {
  const response = await api.get("/admin/users");

  // The API answers list endpoints with { items, total, limit, offset }. The envelope
  // is unwrapped HERE so pages and mappers keep the plain array they were built
  // against - eleven lines in this folder instead of a change in every page.
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

// Replaces the user's whole role set — send every role they should end up with,
// e.g. ["BACKER", "CREATOR"]. This is the only way to grant a role by hand now that
// createProject no longer auto-grants CREATOR.
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