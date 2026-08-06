import api from "./axios";

export const getAllProjects = async () => {
  const response = await api.get("/projects");

  return response.data;
};

export const getProjectById = async (id) => {
  const response = await api.get(`/projects/${id}`);

  return response.data;
};

// Projects belonging to the signed-in creator. Requires a token.
export const getMyProjects = async () => {
  const response = await api.get("/projects/my");

  return response.data;
};

export const approveProject = async (id) => {
  const response = await api.patch(`/projects/${id}/approve`);

  return response.data;
};

export const rejectProject = async (id) => {
  const response = await api.patch(`/projects/${id}/reject`);

  return response.data;
};

export const createProject = async (projectData) => {
  const response = await api.post("/projects", projectData);

  return response.data;
};

export const updateProject = async (id, projectData) => {
  const response = await api.put(`/projects/${id}`, projectData);

  return response.data;
};

export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);

  return response.data;
};

// Comments. Reading is public; any signed-in user may post, and only the author (or an
// admin) may delete. Pass parent_id to reply to a top-level comment.
export const getProjectComments = async (id) => {
  const response = await api.get(`/projects/${id}/comments`);

  return response.data;
};

export const postComment = async (id, { body, parentId }) => {
  const response = await api.post(`/projects/${id}/comments`, {
    body,
    parent_id: parentId ?? null,
  });

  return response.data;
};

export const deleteComment = async (id, commentId) => {
  const response = await api.delete(`/projects/${id}/comments/${commentId}`);

  return response.data;
};

// ADMIN only — the "RMIT Endorsed" badge on the project page.
export const endorseProject = async (id, endorsed) => {
  const response = await api.patch(`/projects/${id}/endorse`, { endorsed });

  return response.data;
};

// Project updates. Reading is public; posting is restricted to the project's creator
// (or an admin) by the backend.
export const getProjectUpdates = async (id) => {
  const response = await api.get(`/projects/${id}/updates`);

  return response.data;
};

export const postProjectUpdate = async (id, { title, body }) => {
  const response = await api.post(`/projects/${id}/updates`, { title, body });

  return response.data;
};

export const deleteProjectUpdate = async (id, updateId) => {
  const response = await api.delete(`/projects/${id}/updates/${updateId}`);

  return response.data;
};

export const investProject = async (id, amount) => {
  const response = await api.post(`/projects/${id}/invest`, {
    amount,
  });

  return response.data;
};