const semesterRepository = require("../repositories/semesterRepository");
const { conflict } = require("../errors/AppError");

/**
 * Semester resolution — deliberately the ONLY place in the app that answers
 * "which semester is it".
 *
 * The concept is derived, never stored: there is no `is_current` column and there must
 * not be one, for the same reason `archived_at` has no companion status column. A
 * second copy of one fact is a fact that drifts.
 *
 * Two DIFFERENT questions, and keeping them apart is the point:
 *
 *   getOpenSemester()      — the semester containing today. Guards WRITING.
 *                            NULL in the gap between two teaching periods.
 *   getBrowsableSemester() — the most recently started semester. Guards READING,
 *                            and is what Discover defaults to. NULL only before the
 *                            very first semester has begun.
 *
 * |                    | inside a semester | in the gap        |
 * |--------------------|-------------------|-------------------|
 * | browse             | current semester  | the one that just ended |
 * | create a project   | yes               | no                |
 * | invest             | yes               | no (N2)           |
 * | admin approve      | yes               | yes               |
 *
 * ⚠️ Both return NULL if today is before every semester on record. That cannot happen
 * with the real data, but nothing here may THROW on it: Discover has to show an empty
 * state, not a 500.
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

function listSemesters() {
    return semesterRepository.findAll();
}

/**
 * The open semester, or a refusal that says when the door opens again.
 *
 * 409 CONFLICT rather than 422: this is not a badly shaped field, it is the current
 * state of the world refusing the request — the same class as "this project is
 * archived". It also has to read the database to know, which is precisely the line
 * the team draws between a zod schema and a service check.
 *
 * ⚠️ The date is passed through as the 'YYYY-MM-DD' string the repository produced.
 * Do NOT `new Date()` it to format it more prettily: that is the exact step that turns
 * 26 Oct into 25 Oct on a machine in a different zone, and a wrong date in the one
 * sentence telling a creator when to come back is worse than an unformatted one.
 *
 * ⚠️ Both sentences mention the draft on purpose. The wizard autosaves per account
 * (pages/draftStorageKey.js), so nothing a creator typed is lost — but they have no
 * way of knowing that unless the refusal says so.
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
    listSemesters,
    requireOpenSemester,
};
