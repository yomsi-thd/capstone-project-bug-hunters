const semesterRepository = require("../repositories/semesterRepository");
const { conflict, notFound } = require("../errors/AppError");

/**
 * Semester resolution, and the only place in the app that answers "which semester is it".
 *
 * The concept is derived rather than stored: there is no is_current column and there must
 * not be one, for the same reason archived_at has no companion status column. A second
 * copy of one fact is a fact that drifts.
 *
 * Two different questions, and keeping them apart is the point:
 *
 *   getOpenSemester()      the semester containing today. Guards writing, and is null in
 *                          the gap between two teaching periods.
 *   getBrowsableSemester() the most recently started semester. Guards reading and is what
 *                          Discover defaults to. Null only before the first semester.
 *
 * |                  | inside a semester | in the gap              |
 * |------------------|-------------------|-------------------------|
 * | browse           | current semester  | the one that just ended |
 * | create a project | yes               | no                      |
 * | invest           | yes               | no                      |
 * | admin approve    | yes               | yes                     |
 *
 * Both return null if today falls before every semester on record. That cannot happen
 * with real data, but nothing here may throw on it: Discover has to show an empty state
 * rather than a 500.
 */

function getOpenSemester(client) {
    return semesterRepository.findOpenSemester(client);
}

function getBrowsableSemester(client) {
    return semesterRepository.findBrowsableSemester(client);
}

function getNextSemester(client) {
    return semesterRepository.findNextSemester(client);
}

/**
 * The semester named by ?semester=, or a 404.
 *
 * 404 for a non-integer as well as for an id that names nothing, which is the same answer
 * numericParam gives every id in the path: an id that cannot exist names nothing.
 *
 * Filtering by an unknown id and returning an empty catalogue instead would report "this
 * semester has no projects" for a semester that does not exist.
 */
async function requireSemester(id) {
    // Not Number(), which accepts "12.5", " 7 " and "1e3", none of which is an id.
    if (!/^\d+$/.test(String(id))) {
        throw notFound("Semester not found");
    }

    const semester = await semesterRepository.findById(id);

    if (!semester) {
        throw notFound("Semester not found");
    }

    return semester;
}

function listSemesters() {
    return semesterRepository.findAll();
}

/**
 * The open semester, or a refusal saying when the door opens again.
 *
 * 409 rather than 422: nothing is badly shaped, it is the state of the world refusing the
 * request, the same class as "this project is archived". It also has to read the database
 * to know, which is the line between a zod schema and a service check.
 *
 * The date is passed through as the "YYYY-MM-DD" string the repository produced. Don't
 * build a Date from it to format it more prettily: that is the step that turns 26 Oct
 * into 25 Oct in another timezone, and a wrong date in the one sentence telling a creator
 * when to come back is worse than an unformatted one.
 *
 * Both sentences mention the draft on purpose. The wizard autosaves per account, so
 * nothing typed is lost, but the creator has no way of knowing unless the refusal says so.
 */
async function requireOpenSemester(client) {
    const open = await getOpenSemester(client);

    if (open) {
        return open;
    }

    const next = await getNextSemester(client);

    throw conflict(
        next
            ? `No semester is open right now. The next one starts on ${next.start_date}. Your draft is saved, so you can submit it then.`
            : "No semester is open right now, and the next one has not been scheduled yet. Your draft is saved. Ask an admin to open the new semester."
    );
}

module.exports = {
    getOpenSemester,
    getBrowsableSemester,
    getNextSemester,
    requireSemester,
    listSemesters,
    requireOpenSemester,
};
