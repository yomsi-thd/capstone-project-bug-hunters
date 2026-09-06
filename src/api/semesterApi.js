import api from "./axios";

/**
 * The teaching periods projects are filed under.
 *
 * Public — no token — because Discover's semester picker has to work for a signed-out
 * visitor, which is most of the people who ever open the landing page.
 *
 * Each row carries `is_open` (today falls inside it) and `is_browsable` (the most
 * recently started one, which is what Discover opens on). ⚠️ Both are computed by
 * Postgres from CURRENT_DATE. Do not re-derive them here by comparing the dates in
 * JavaScript: `start_date` and `end_date` arrive as plain "YYYY-MM-DD" strings for the
 * express purpose of never becoming Date objects — see formatSemesterDate in mappers.
 */
export const getSemesters = async () => {
  const response = await api.get("/semesters");

  // Unwrapped here like every other list endpoint, so pages receive a plain array.
  return response.data.items;
};
