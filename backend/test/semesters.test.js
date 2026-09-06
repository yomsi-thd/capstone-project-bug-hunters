/**
 * Semester resolution (N1) and GET /api/semesters.
 *
 * ⚠️ THIS FILE REWRITES THE `semesters` TABLE. That is safe here and only here:
 * vitest.config.mjs runs one file at a time in one process, no other suite reads the
 * table yet, and every project the factories build leaves `semester_id` NULL, so the
 * RESTRICT foreign key never stands in the way. The seed from schema.sql is put back in
 * afterAll so a later file finds the schema as it was built.
 *
 * Fixtures are written as OFFSETS FROM CURRENT_DATE rather than as fixed dates. Fixed
 * dates would make "today is inside a semester" a fact about the calendar, so the suite
 * would start failing on 26 Oct 2026 for reasons that have nothing to do with the code.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

import { app, pool } from "./helpers/factories.js";
import semesterRepository from "../src/repositories/semesterRepository.js";

// What schema.sql seeded, read once so it can be restored exactly.
let seeded = [];

/** Replace the table with these rows. Offsets are whole days from today. */
async function setSemesters(rows) {
    await pool.query("DELETE FROM semesters");

    for (const { name, from, to } of rows) {
        await pool.query(
            `INSERT INTO semesters (name, start_date, end_date)
             VALUES ($1, CURRENT_DATE + $2::int, CURRENT_DATE + $3::int)`,
            [name, from, to]
        );
    }
}

beforeAll(async () => {
    const { rows } = await pool.query(
        `SELECT name,
                TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
                TO_CHAR(end_date,   'YYYY-MM-DD') AS end_date
         FROM semesters ORDER BY start_date`
    );
    seeded = rows;
});

afterAll(async () => {
    await pool.query("DELETE FROM semesters");

    for (const s of seeded) {
        await pool.query(
            `INSERT INTO semesters (name, start_date, end_date) VALUES ($1, $2::date, $3::date)`,
            [s.name, s.start_date, s.end_date]
        );
    }
});

describe("findOpenSemester / findBrowsableSemester", () => {
    it("today inside a semester: both answer with that semester", async () => {
        await setSemesters([
            { name: "Past", from: -200, to: -100 },
            { name: "Now", from: -10, to: 10 },
        ]);

        const open = await semesterRepository.findOpenSemester();
        const browsable = await semesterRepository.findBrowsableSemester();

        expect(open.name).toBe("Now");
        expect(browsable.name).toBe("Now");
    });

    // The rule the whole design rests on: no open semester stops WRITING, never READING.
    it("today in the gap: open is null, browsable is the semester that just ended", async () => {
        await setSemesters([
            { name: "Just ended", from: -100, to: -1 },
            { name: "Not started", from: 10, to: 100 },
        ]);

        const open = await semesterRepository.findOpenSemester();
        const browsable = await semesterRepository.findBrowsableSemester();

        expect(open).toBeNull();
        expect(browsable.name).toBe("Just ended");
    });

    // Cannot happen with the real data. It must still not throw: Discover has to show
    // an empty state, and a 500 on the landing page is the worst way to learn about a
    // date range somebody typed wrong.
    it("today before every semester: both null, and neither throws", async () => {
        await setSemesters([{ name: "Future", from: 10, to: 100 }]);

        await expect(semesterRepository.findOpenSemester()).resolves.toBeNull();
        await expect(semesterRepository.findBrowsableSemester()).resolves.toBeNull();
    });

    it("no semesters at all: both null", async () => {
        await setSemesters([]);

        await expect(semesterRepository.findOpenSemester()).resolves.toBeNull();
        await expect(semesterRepository.findBrowsableSemester()).resolves.toBeNull();
    });

    // There is no constraint against overlapping ranges - an EXCLUDE USING gist would be
    // heavy for three hand-entered rows a year. What replaces it is that both resolvers
    // order by start_date DESC, so two overlapping rows still give ONE answer, and the
    // same one every time.
    it("two overlapping semesters: the later start wins, in both", async () => {
        await setSemesters([
            { name: "Earlier start", from: -30, to: 30 },
            { name: "Later start", from: -5, to: 60 },
        ]);

        expect((await semesterRepository.findOpenSemester()).name).toBe("Later start");
        expect((await semesterRepository.findBrowsableSemester()).name).toBe("Later start");
    });
});

describe("dates leaving the repository", () => {
    // The trap this layer exists to close. node-postgres reads a DATE into a Date at
    // LOCAL midnight, so on a UTC+7 machine 2026-03-02 leaves as 2026-03-01T17:00:00Z
    // and a browser in UTC (which is what Render runs) renders 1 March. TIMESTAMPTZ
    // cannot help: a DATE has no instant to attach a zone to. TO_CHAR does.
    it("are 'YYYY-MM-DD' strings, not Date objects", async () => {
        await setSemesters([{ name: "Now", from: -10, to: 10 }]);

        const open = await semesterRepository.findOpenSemester();

        expect(typeof open.start_date).toBe("string");
        expect(open.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(open.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe("GET /api/semesters", () => {
    beforeEach(async () => {
        await setSemesters([
            { name: "Past", from: -200, to: -100 },
            { name: "Now", from: -10, to: 10 },
            { name: "Future", from: 20, to: 100 },
        ]);
    });

    it("needs no auth - Discover's picker works signed out", async () => {
        const res = await request(app).get("/api/semesters");

        expect(res.status).toBe(200);
    });

    it("answers with the envelope, newest first", async () => {
        const res = await request(app).get("/api/semesters");

        expect(res.body).toMatchObject({ total: 3, limit: null, offset: 0 });
        expect(res.body.items.map((s) => s.name)).toEqual(["Future", "Now", "Past"]);
    });

    it("marks exactly one row is_browsable, and it is the one the resolver picks", async () => {
        const res = await request(app).get("/api/semesters");

        const browsable = res.body.items.filter((s) => s.is_browsable);

        expect(browsable).toHaveLength(1);
        expect(browsable[0].name).toBe("Now");
        expect(browsable[0].name).toBe((await semesterRepository.findBrowsableSemester()).name);
    });

    it("marks is_open only on the semester containing today", async () => {
        const res = await request(app).get("/api/semesters");

        expect(res.body.items.filter((s) => s.is_open).map((s) => s.name)).toEqual(["Now"]);
    });

    // In the gap the picker must still open on something, or Discover has nothing to
    // show. is_browsable stays set; is_open goes empty.
    it("in the gap: still exactly one is_browsable, and nothing is_open", async () => {
        await setSemesters([
            { name: "Just ended", from: -100, to: -1 },
            { name: "Not started", from: 10, to: 100 },
        ]);

        const res = await request(app).get("/api/semesters");

        expect(res.body.items.filter((s) => s.is_browsable).map((s) => s.name)).toEqual(["Just ended"]);
        expect(res.body.items.filter((s) => s.is_open)).toHaveLength(0);
    });

    it("with no semesters at all: an empty envelope, not an error", async () => {
        await setSemesters([]);

        const res = await request(app).get("/api/semesters");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ items: [], total: 0, limit: null, offset: 0 });
    });

    it("sends the dates as strings, so a UTC browser cannot lose a day", async () => {
        const res = await request(app).get("/api/semesters");

        for (const s of res.body.items) {
            expect(s.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(s.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });
});
