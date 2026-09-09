import api from "./axios";

// `semesterId` is optional. Left out, the API answers with the semester Discover opens
// on, so a first visit doesn't have to wait for GET /semesters first.
export const getAllProjects = async (semesterId = null) => {
  const response = await api.get("/projects", {
    params: semesterId == null ? {} : { semester: semesterId },
  });

  // List endpoints answer { items, total, limit, offset }. Unwrapped here so pages and
  // mappers keep the plain array they were written against.
  return response.data.items;
};

export const getProjectById = async (id) => {
  const response = await api.get(`/projects/${id}`);

  return response.data;
};

// Projects belonging to the signed-in creator. Requires a token.
export const getMyProjects = async () => {
  const response = await api.get("/projects/my");

  return response.data.items;
};

// Everyone who has invested in the signed-in creator's projects, biggest first, grouped
// per person rather than per transaction. The creator is read from the token.
export const getMyBackers = async () => {
  const response = await api.get("/projects/my/backers");

  return response.data.items;
};

export const approveProject = async (id) => {
  const response = await api.patch(`/projects/${id}/approve`);

  return response.data;
};

// `note` explains the rejection and shows on the creator's project card. Optional,
// since the queue's one-click REJECT sends none.
export const rejectProject = async (id, note) => {
  const response = await api.patch(`/projects/${id}/reject`, { note: note ?? "" });

  return response.data;
};

// Puts a REJECTED project back into the approval queue after the creator has revised it,
// clearing the old review note. Creator (or admin) only, and only from REJECTED.
export const resubmitProject = async (id) => {
  const response = await api.patch(`/projects/${id}/resubmit`);

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

// Archiving is the everyday "remove this project" action; nothing leaves the database
// on one click. Creator or admin. The backend requires `reason` only when an admin
// archives someone else's project, since that locks the creator out of restoring it.
export const archiveProject = async (id, reason) => {
  const response = await api.patch(`/projects/${id}/archive`, {
    reason: reason ?? "",
  });

  return response.data;
};

// Puts the project back at the status it already had, so an APPROVED one returns to
// Discover without re-entering the queue. Refused for a creator whose project an admin
// archived.
export const restoreProject = async (id) => {
  const response = await api.patch(`/projects/${id}/restore`);

  return response.data;
};

// Permanent, and takes the project's comments and updates with it. Admin only, and only
// for an already-archived project, so it is the second step of the bin.
export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);

  return response.data;
};

// Comments. Reading is public; any signed-in user may post, and only the author (or an
// admin) may delete. Pass parent_id to reply to a top-level comment.
export const getProjectComments = async (id) => {
  const response = await api.get(`/projects/${id}/comments`);

  return response.data.items;
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

// Admin only. Drives the "RMIT Endorsed" badge on the project page.
export const endorseProject = async (id, endorsed) => {
  const response = await api.patch(`/projects/${id}/endorse`, { endorsed });

  return response.data;
};

// Project updates. Reading is public; posting is restricted to the project's creator
// (or an admin) by the backend.
export const getProjectUpdates = async (id) => {
  const response = await api.get(`/projects/${id}/updates`);

  return response.data.items;
};

export const postProjectUpdate = async (id, { title, body }) => {
  const response = await api.post(`/projects/${id}/updates`, { title, body });

  return response.data;
};

export const deleteProjectUpdate = async (id, updateId) => {
  const response = await api.delete(`/projects/${id}/updates/${updateId}`);

  return response.data;
};

// Support levels. Reading is public; adding, editing and removing are creator or admin
// only. Called `project_tiers` in the database, "Support Levels" on screen.
export const getProjectTiers = async (id) => {
  const response = await api.get(`/projects/${id}/tiers`);

  return response.data.items;
};

// `tier` is { name, min_amount, bullets }, the same shape for create and update.
export const createTier = async (id, tier) => {
  const response = await api.post(`/projects/${id}/tiers`, tier);

  return response.data;
};

export const updateTier = async (id, tierId, tier) => {
  const response = await api.put(`/projects/${id}/tiers/${tierId}`, tier);

  return response.data;
};

// Resolves to { hidden }, true when somebody had already chosen the level. Those are
// hidden rather than deleted so existing investments still point at a live row.
export const deleteTier = async (id, tierId) => {
  const response = await api.delete(`/projects/${id}/tiers/${tierId}`);

  return response.data;
};

// `tierId` is the support level the backer picked. Null is valid: the modal offers
// "no level, just support".
export const investProject = async (id, amount, tierId = null) => {
  const response = await api.post(`/projects/${id}/invest`, {
    amount,
    tierId,
  });

  return response.data;
};