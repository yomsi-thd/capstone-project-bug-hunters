/**
 * A project whose semester has ended is READ-ONLY (N2).
 *
 * Design: docs/superpowers/specs/2026-09-06-semester-readonly-design.md
 *
 * This file grows in two steps. Step 1 (here) pins only that the reads REPORT whether
 * the semester has closed — no rule is enforced yet and no behaviour changed. Step 2
 * adds assertSemesterOpen and the tests for what it blocks and, just as importantly,
 * what it must NOT block.
 *
 * ⚠️ LIKE semesters.test.js, THIS FILE REWRITES THE `semesters` TABLE, and it is safe
 * for the same reasons: vitest runs one file at a time in one process, and what
 * schema.sql seeded is restored in afterAll. Fixtures are offsets from CURRENT_DATE, not
 * fixed dates, so the suite does not start failing on a particular day of the calendar.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, as } from "./helpers/factories.js";

let creator;
let closedSemester;
let openSemester;
let seeded = [];

/** A semester spanning these day-offsets from today. Returns its row. */
async function addSemester(name, from, to) {
    const { rows } = await pool.query(
        `INSERT INTO semesters (name, start_date, end_date)
         VALUES ($1, CURRENT_DATE + $2::int, CURRENT_DATE + $3::int)
         RETURNING id, name`,
        [name, from, to]
    );

    return rows[0];
}

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR", "BACKER"] });

    const { rows } = await pool.query(
        `SELECT name,
                TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
                TO_CHAR(end_date,   'YYYY-MM-DD') AS end_date
         FROM semesters ORDER BY start_date`
    );
    seeded = rows;

    // Added ALONGSIDE the seeded rows rather than replacing them: makeProject files a
    // project under whichever semester contains today, and several other suites depend
    // on that still working.
    closedSemester = await addSemester("ZZ closed semester", -200, -100);
    openSemester = await addSemester("ZZ open semester", -5, 5);
});

afterAll(async () => {
    // The projects have to let go of these rows first: projects.semester_id has no
    // ON DELETE action, so RESTRICT stands.
    await pool.query(
        "UPDATE projects SET semester_id = NULL WHERE semester_id = ANY($1::int[])",
        [[closedSemester.id, openSemester.id]]
    );
    await pool.query("DELETE FROM semesters WHERE name LIKE 'ZZ %'");

    // Put back exactly what schema.sql seeded, in case a row was disturbed.
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM semesters");
    if (rows[0].n === 0) {
        for (const s of seeded) {
            await pool.query(
                `INSERT INTO semesters (name, start_date, end_date) VALUES ($1, $2::date, $3::date)`,
                [s.name, s.start_date, s.end_date]
            );
        }
    }
});

describe("GET /api/projects/:id reports its semester", () => {
    it("semester_closed is true once the semester has ended", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            status: "APPROVED",
            semesterId: closedSemester.id,
        });

        // Signed out on purpose: the detail page is public, and these three fields go
        // to every reader, not just the owner.
        const res = await request(app).get(`/api/projects/${project.id}`);

        expect(res.status).toBe(200);
        expect(res.body.semester_closed).toBe(true);
        expect(res.body.semester_name).toBe("ZZ closed semester");
    });

    it("semester_closed is false while the semester is still running", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            status: "APPROVED",
            semesterId: openSemester.id,
        });

        const res = await as(creator.token).get(`/api/projects/${project.id}`);

        expect(res.body.semester_closed).toBe(false);
        expect(res.body.semester_name).toBe("ZZ open semester");
    });

    // ⚠️ The COALESCE. semester_id is still nullable, and `NULL < CURRENT_DATE` is NULL —
    // falsy by accident. A project belonging to no semester must be reported as NOT
    // closed by decision, not by luck: failing open leaves an orphaned project editable,
    // where failing closed would silently freeze a live one.
    it("a project with no semester at all is not closed", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            status: "APPROVED",
            semesterId: null,
        });

        const res = await as(creator.token).get(`/api/projects/${project.id}`);

        expect(res.status).toBe(200);
        expect(res.body.semester_closed).toBe(false);
        expect(res.body.semester_name).toBeNull();
    });

    // The LEFT JOIN. A plain JOIN would drop that same project from the detail page
    // entirely — a 404 on a project that exists.
    it("still returns the project when it has no semester", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            status: "APPROVED",
            title: "Orphan of no semester",
            semesterId: null,
        });

        const res = await as(creator.token).get(`/api/projects/${project.id}`);

        expect(res.body.id).toBe(project.id);
        expect(res.body.title).toBe("Orphan of no semester");
    });

    // A DATE has no time of day, so it must never become a Date object: parsed as UTC
    // midnight and printed in the viewer's zone, 25 Oct reads as 24 Oct west of
    // Greenwich. Same reason semesterRepository sends strings.
    it("sends semester_end_date as a 'YYYY-MM-DD' string", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            status: "APPROVED",
            semesterId: closedSemester.id,
        });

        const res = await as(creator.token).get(`/api/projects/${project.id}`);

        expect(typeof res.body.semester_end_date).toBe("string");
        expect(res.body.semester_end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe("GET /api/projects/my reports the same three fields", () => {
    // My Projects needs them so a card can hide EDIT on a closed semester rather than
    // offering a button the API will refuse.
    it("carries semester_closed per project, closed and open side by side", async () => {
        const owner = await makeUser({ roles: ["CREATOR"] });

        const old = await makeProject({ creatorId: owner.id, semesterId: closedSemester.id });
        const current = await makeProject({ creatorId: owner.id, semesterId: openSemester.id });

        const res = await as(owner.token).get("/api/projects/my");

        expect(res.status).toBe(200);

        const byId = Object.fromEntries(res.body.items.map(p => [p.id, p]));

        expect(byId[old.id].semester_closed).toBe(true);
        expect(byId[old.id].semester_name).toBe("ZZ closed semester");
        expect(byId[current.id].semester_closed).toBe(false);
    });

    // ⚠️ GET /projects/my is NOT filtered by semester and must never be: a creator has to
    // be able to look back at what they did last term. Only Discover is scoped.
    it("still lists a project whose semester has ended", async () => {
        const owner = await makeUser({ roles: ["CREATOR"] });
        const old = await makeProject({ creatorId: owner.id, semesterId: closedSemester.id });

        const res = await as(owner.token).get("/api/projects/my");

        expect(res.body.items.map(p => p.id)).toContain(old.id);
    });
});
