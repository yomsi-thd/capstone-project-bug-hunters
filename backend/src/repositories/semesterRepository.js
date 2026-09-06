const pool = require("../config/db");

/**
 * The `semesters` table — the teaching period a project belongs to, and the only
 * source of a project's closing date since 2026-09-06.
 *
 * ⚠️ EVERY DATE LEAVES THIS FILE AS A 'YYYY-MM-DD' STRING, never as a Date.
 *
 * node-postgres reads a `DATE` column into a JS Date at LOCAL midnight. Node on the dev
 * machine runs UTC+7, so `2026-03-02` leaves the API as `2026-03-01T17:00:00.000Z` and a
 * browser in UTC — which is what Render runs — renders it as 1 March. Measured on the
 * shared database the day the table was seeded. It is the same family as the investment
 * dates that read a day early until 2026-08-21, and `TIMESTAMPTZ` cannot help here: a
 * `DATE` has no time of day, so there is no instant to attach a zone to.
 *
 * TO_CHAR in the query is the fix, applied at the one place every reader passes through.
 * A string with no time has no timezone to be shifted by.
 */

// The two flags are computed by Postgres from CURRENT_DATE, so they never travel
// through JS and cannot be shifted by a zone the way the dates themselves can. That is
// why they live in SQL rather than being re-derived by the frontend from the dates.
const COLUMNS = `
    id,
    name,
    TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
    TO_CHAR(end_date,   'YYYY-MM-DD') AS end_date
`;

/**
 * The semester CONTAINING today, or null when today falls in the gap between two.
 *
 * This is the one that guards WRITING: creating a project, and (from N2) investing.
 * A null here is a real answer, not an error — between two teaching periods there
 * genuinely is no semester to file anything under.
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
 * The most recently STARTED semester, whether or not it has ended.
 *
 * This is the one that guards READING — it is what Discover defaults to.
 *
 * ⚠️ It is a SUPERSET of findOpenSemester, and that is the whole trick. While today
 * sits inside a semester, that semester is also the most recently started one, so both
 * functions return the same row. In the gap between two, this one returns the semester
 * that just finished. No `if` anywhere above needs to know which case it is in.
 *
 * The rule in one line: having no open semester blocks WRITING, never READING.
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
 * The next semester due to START, or null when none has been scheduled yet.
 *
 * ⚠️ This is NOT findBrowsableSemester's opposite and the two are easy to confuse.
 * In the gap, `browsable` looks BACKWARDS (the one that just ended, so Discover still
 * has something to show) while this one looks FORWARDS. It exists for one reason: a
 * creator refused because no semester is open has to be told WHEN they can submit.
 * A greyed-out control that explains nothing is the exact failure the team deleted
 * across the app on 2026-08-18 and again with InvestBlockedNote on 2026-08-24.
 *
 * Null is a real answer — after the last semester on record (23 Jan 2027 today) there
 * is no next one until somebody INSERTs it. The caller must word its message without
 * a date rather than print `undefined`.
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
 * `is_browsable` marks exactly one row — the same row findBrowsableSemester returns,
 * expressed as the same subquery so the two cannot drift.
 *
 * `is_open` is per-row ("does today fall inside this one"), so if two rows were ever
 * entered overlapping, both could be true while findOpenSemester still answers with
 * one. Three hand-entered rows a year do not justify an EXCLUDE constraint; the
 * resolvers stay deterministic either way via ORDER BY start_date DESC LIMIT 1.
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
