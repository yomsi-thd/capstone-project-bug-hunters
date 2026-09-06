const semesterRepository = require("../repositories/semesterRepository");

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

function listSemesters() {
    return semesterRepository.findAll();
}

module.exports = { getOpenSemester, getBrowsableSemester, listSemesters };
