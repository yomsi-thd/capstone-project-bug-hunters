import api from "./axios";

export const getAllProjects = async () => {
  const response = await api.get("/projects");

  // The API answers list endpoints with { items, total, limit, offset }. The envelope
  // is unwrapped HERE so pages and mappers keep the plain array they were built
  // against - eleven lines in this folder instead of a change in every page.
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

// Everyone who has invested in any project the signed-in creator owns, biggest first.
// Grouped per person, not per transaction. Requires a token; the creator is read from
// it, so there is no id to pass.
export const getMyBackers = async () => {
  const response = await api.get("/projects/my/backers");

  return response.data.items;
};

export const approveProject = async (id) => {
  const response = await api.patch(`/projects/${id}/approve`);

  return response.data;
};

// `note` explains the rejection and is shown to the creator on their project card.
// Optional — the queue's one-click REJECT sends none — but the review screen has always
// collected one, and until `projects.review_note` existed it was silently discarded.
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

// Archive replaced delete as the everyday "remove this project" action (demo feedback,
// 2026-08-11): nothing leaves the database on one click any more.
// Allowed for the project's creator or an admin. `reason` is required by the backend
// only when an admin archives someone else's project — they lock the creator out of
// restoring it, so the creator is owed an explanation.
export const archiveProject = async (id, reason) => {
  const response = await api.patch(`/projects/${id}/archive`, {
    reason: reason ?? "",
  });

  return response.data;
};

// Puts the project back at the status it already had — an APPROVED project returns to
// Discover without going round the approval queue again. The backend refuses this for a
// creator whose project was archived by an admin.
export const restoreProject = async (id) => {
  const response = await api.patch(`/projects/${id}/restore`);

  return response.data;
};

// PERMANENT and not undoable — it also takes the project's comments and updates with it.
// The backend accepts this from an ADMIN only, and only for an already-archived project,
// so it is the second step of the bin rather than a button anyone can reach by accident.
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

// ADMIN only — the "RMIT Endorsed" badge on the project page.
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

// Support levels. Reading is public and follows the project's own visibility rule;
// adding, editing and removing are restricted to the project's creator (or an admin)
// by the backend. `project_tiers` in the database, "Support Levels" on screen.
export const getProjectTiers = async (id) => {
  const response = await api.get(`/projects/${id}/tiers`);

  return response.data.items;
};

// `tier` is { name, min_amount, bullets } — the same shape for both of these.
export const createTier = async (id, tier) => {
  const response = await api.post(`/projects/${id}/tiers`, tier);

  return response.data;
};

export const updateTier = async (id, tierId, tier) => {
  const response = await api.put(`/projects/${id}/tiers/${tierId}`, tier);

  return response.data;
};

// Resolves to { hidden } — true when somebody had already chosen the level, so it was
// hidden instead of deleted and their investment history still points at a live row.
export const deleteTier = async (id, tierId) => {
  const response = await api.delete(`/projects/${id}/tiers/${tierId}`);

  return response.data;
};

// `tierId` is the support level the backer picked. Optional: the modal's
// "No level — just support" sends null, and the backend treats that as valid.
export const investProject = async (id, amount, tierId = null) => {
  const response = await api.post(`/projects/${id}/invest`, {
    amount,
    tierId,
  });

  return response.data;
};