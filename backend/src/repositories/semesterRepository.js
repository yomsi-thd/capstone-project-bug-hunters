const pool = require("../config/db");

/**
 * The `semesters` table: the teaching period a project belongs to, and the only source of
 * a project's closing date.
 *
 * Every date leaves this file as a "YYYY-MM-DD" string rather than a Date.
 *
 * node-postgres reads a DATE column into a JS Date at local midnight, so on a UTC+7
 * machine "2026-03-02" leaves the API as 2026-03-01T17:00:00Z and a browser in UTC shows
 * 1 March. TIMESTAMPTZ cannot help: a DATE has no time of day, so there is no instant to
 * attach a zone to.
 *
 * TO_CHAR in the query is the fix, applied at the one place every reader passes through.
 * A string with no time has no timezone to be shifted by.
 */

// Postgres computes both flags from CURRENT_DATE, so they never travel through JS and
// cannot be shifted by a timezone the way the dates themselves can. That is why they live
// in SQL rather than being re-derived in the frontend.
const COLUMNS = `
    id,
    name,
    TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
    TO_CHAR(end_date,   'YYYY-MM-DD') AS end_date
`;

/**
 * The semester containing today, or null when today falls in the gap between two.
 *
 * This is the one that guards writing: creating a project, and investing. Null is a real
 * answer rather than an error, since between two teaching periods there genuinely is no
 * semester to file anything under.
 */
async function findOpenSemester(client = pool) {
    const result = await client.query(
        `
        SELECT ${COLUMNS}
        FROM semesters
        WHERE CURRENT_DATE BETWEEN start_date AND end_date
        ORDER BY start_date DESC
        LIMIT 1;
        `
    );

    return result.rows[0] || null;
}

/**
 * The most recently started semester, whether or not it has ended. This is what guards
 * reading, and what Discover defaults to.
 *
 * It is a superset of findOpenSemester, which is the trick. While today sits inside a
 * semester, that semester is also the most recently started one and both functions return
 * the same row; in the gap between two, this one returns the semester that just finished.
 * No caller has to know which case it is in.
 *
 * In one line: having no open semester blocks writing, never reading.
 */
async function findBrowsableSemester(client = pool) {
    const result = await client.query(
        `
        SELECT ${COLUMNS}
        FROM semesters
        WHERE start_date <= CURRENT_DATE
        ORDER BY start_date DESC
        LIMIT 1;
        `
    );

    return result.rows[0] || null;
}

/**
 * The next semester due to start, or null when none has been scheduled.
 *
 * Not the opposite of findBrowsableSemester, though the two are easy to confuse: in the
 * gap, browsable looks backwards to the term that just ended so Discover still has
 * something to show, while this looks forwards. It exists so a creator refused because no
 * semester is open can be told when they may submit.
 *
 * Null is a real answer: after the last semester on record there is no next one until
 * somebody inserts it, and the caller has to word its message without a date rather than
 * print "undefined".
 */
async function findNextSemester(client = pool) {
    const result = await client.query(
        `
        SELECT ${COLUMNS}
        FROM semesters
        WHERE start_date > CURRENT_DATE
        ORDER BY start_date ASC
        LIMIT 1;
        `
    );

    return result.rows[0] || null;
}

/** One semester by id, or null. Behind `?semester=` on Discover. */
async function findById(id, client = pool) {
    const result = await client.query(
        `SELECT ${COLUMNS} FROM semesters WHERE id = $1;`,
        [id]
    );

    return result.rows[0] || null;
}

/**
 * Every semester, newest first, for the picker on Discover.
 *
 * `is_browsable` marks exactly one row, the same one findBrowsableSemester returns and
 * written as the same subquery so the two cannot drift.
 *
 * `is_open` is per-row, meaning "does today fall inside this one", so two overlapping
 * rows could both be true while findOpenSemester still answers with one. Three
 * hand-entered rows a year don't justify an EXCLUDE constraint, and the resolvers stay
 * deterministic through ORDER BY start_date DESC LIMIT 1 either way.
 */
async function findAll(client = pool) {
    const result = await client.query(
        `
        SELECT ${COLUMNS},
               (CURRENT_DATE BETWEEN start_date AND end_date) AS is_open,
               (id = (
                   SELECT id FROM semesters
                   WHERE start_date <= CURRENT_DATE
                   ORDER BY start_date DESC
                   LIMIT 1
               )) AS is_browsable
        FROM semesters
        ORDER BY start_date DESC;
        `
    );

    return result.rows;
}

module.exports = { findOpenSemester, findBrowsableSemester, findNextSemester, findById, findAll };
