import api from "./axios";

/**
 * The teaching periods projects are filed under. Needs no token, because Discover's
 * semester picker has to work for signed-out visitors.
 *
 * Rows carry `is_open` (today falls inside it) and `is_browsable` (the most recently
 * started one, which Discover opens on). Postgres computes both from CURRENT_DATE.
 * Don't re-derive them here: `start_date` and `end_date` arrive as "YYYY-MM-DD" strings
 * and are meant to stay strings. See formatSemesterDate in mappers.
 */
export const getSemesters = async () => {
  const response = await api.get("/semesters");

  // Unwrapped like every other list endpoint.
  return response.data.items;
};
