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

export const investProject = async (id, amount) => {
  const response = await api.post(`/projects/${id}/invest`, {
    amount,
  });

  return response.data;
};