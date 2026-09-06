/**
 * Semester resolution (N1) and GET /api/semesters.
 *
 * ⚠️ THIS FILE REWRITES THE `semesters` TABLE. That is safe here and only here:
 * vitest.config.mjs runs one file at a time in one process, and the seed from
 * schema.sql is put back in afterAll so a later file finds the schema as it was built.
 * Every other suite only ever reads the semester the factories pick for it.
 *
 * Fixtures are written as OFFSETS FROM CURRENT_DATE rather than as fixed dates. Fixed
 * dates would make "today is inside a semester" a fact about the calendar, so the suite
 * would start failing on 26 Oct 2026 for reasons that have nothing to do with the code.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, as } from "./helpers/factories.js";
import semesterRepository from "../src/repositories/semesterRepository.js";

// What schema.sql seeded, read once so it can be restored exactly.
let seeded = [];

/** Replace the table with these rows. Offsets are whole days from today. */
async function setSemesters(rows) {
    // projects.semester_id has no ON DELETE action, so the default RESTRICT stands and
    // a semester holding projects cannot be removed. That is the right behaviour for
    // the real database and simply has to be unhooked here — the tests below file real
    // projects against these fixtures. It only ever touches rows created earlier in the
    // run, and nothing reads semester_id back out of them.
    await pool.query("UPDATE projects SET semester_id = NULL");
    await pool.query("DELETE FROM semesters");

    for (const { name, from, to } of rows) {
        await pool.query(
            `INSERT INTO semesters (name, start_date, end_date)
             VALUES ($1, CURRENT_DATE + $2::int, CURRENT_DATE + $3::int)`,
            [name, from, to]
        );
    }
}

let creator;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });

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

describe("findNextSemester", () => {
    // The forward-looking one. It exists so a creator refused in the gap is told WHEN
    // they can submit, rather than meeting a door with no sign on it.
    it("in the gap: the semester that has not started yet", async () => {
        await setSemesters([
            { name: "Just ended", from: -100, to: -1 },
            { name: "Next", from: 10, to: 100 },
            { name: "The one after", from: 110, to: 200 },
        ]);

        const next = await semesterRepository.findNextSemester();

        expect(next.name).toBe("Next");
    });

    // Null is a real answer, not a failure: after the last row on record there is no
    // next semester until somebody inserts one. The caller has to word its refusal
    // without a date rather than print `undefined`.
    it("null when nothing is scheduled after today", async () => {
        await setSemesters([{ name: "Just ended", from: -100, to: -1 }]);

        await expect(semesterRepository.findNextSemester()).resolves.toBeNull();
    });
});

describe("POST /api/projects - the semester gate", () => {
    // These live here rather than in projects.test.js because they REWRITE the
    // semesters table, and this file is the one set up to put it back.
    const body = {
        title: "A project filed against a semester",
        description: "Short blurb.",
        category: "ENGINEERING",
        goal_amount: 5000,
    };

    it("201 inside a semester, filed under the open one", async () => {
        await setSemesters([
            { name: "Past", from: -200, to: -100 },
            { name: "Now", from: -10, to: 10 },
        ]);

        const open = await semesterRepository.findOpenSemester();
        const res = await as(creator.token).post("/api/projects").send(body);

        expect(res.status).toBe(201);
        expect(res.body.project.semester_id).toBe(open.id);
    });

    // 409, not 422: nothing about the request is malformed, the world is simply not
    // in a state that accepts it — the same class as "this project is archived".
    it("409 in the gap, and the message names the day it reopens", async () => {
        await setSemesters([
            { name: "Just ended", from: -100, to: -1 },
            { name: "Next", from: 10, to: 100 },
        ]);

        const { rows } = await pool.query(
            "SELECT TO_CHAR(start_date, 'YYYY-MM-DD') AS d FROM semesters WHERE name = 'Next'"
        );

        const res = await as(creator.token).post("/api/projects").send(body);

        expect(res.status).toBe(409);
        expect(res.body.code).toBe("CONFLICT");
        expect(res.body.message).toContain(rows[0].d);
    });

    it("409 with no date, and no 'undefined', when no semester is scheduled", async () => {
        await setSemesters([{ name: "Just ended", from: -100, to: -1 }]);

        const res = await as(creator.token).post("/api/projects").send(body);

        expect(res.status).toBe(409);
        expect(res.body.message).not.toContain("undefined");
        expect(res.body.message).toContain("not been scheduled");
    });

    it("creates nothing when it refuses", async () => {
        await setSemesters([{ name: "Just ended", from: -100, to: -1 }]);

        const before = await pool.query("select count(*)::int as n from projects");
        await as(creator.token).post("/api/projects").send(body);
        const after = await pool.query("select count(*)::int as n from projects");

        expect(after.rows[0].n).toBe(before.rows[0].n);
    });

    // The semester is decided by the server from the day, exactly like creator_id is
    // decided by the caller's role. A creator picking their own teaching period would
    // let a project be filed into a semester whose results are already settled.
    it("ignores a semester_id sent in the body", async () => {
        await setSemesters([
            { name: "Past", from: -200, to: -100 },
            { name: "Now", from: -10, to: 10 },
        ]);

        const { rows } = await pool.query("SELECT id FROM semesters WHERE name = 'Past'");
        const open = await semesterRepository.findOpenSemester();

        const res = await as(creator.token)
            .post("/api/projects")
            .send({ ...body, semester_id: rows[0].id });

        expect(res.status).toBe(201);
        expect(res.body.project.semester_id).toBe(open.id);
    });
});

describe("GET /api/projects - the semester filter", () => {
    // Two approved projects, one in each of two semesters, so "the filter did nothing"
    // and "the filter worked" cannot look the same.
    let past;
    let now;
    let inPast;
    let inNow;

    beforeEach(async () => {
        await setSemesters([
            { name: "Past", from: -200, to: -100 },
            { name: "Now", from: -10, to: 10 },
        ]);

        const { rows } = await pool.query("SELECT id, name FROM semesters ORDER BY start_date");
        past = rows[0].id;
        now = rows[1].id;

        inPast = await makeProject({ creatorId: creator.id, status: "APPROVED", semesterId: past });
        inNow = await makeProject({ creatorId: creator.id, status: "APPROVED", semesterId: now });
    });

    it("defaults to the browsable semester, and leaves the older term out", async () => {
        const res = await request(app).get("/api/projects");

        const ids = res.body.items.map((p) => p.id);

        expect(ids).toContain(inNow.id);
        expect(ids).not.toContain(inPast.id);
    });

    it("?semester=<old id> shows that term instead", async () => {
        const res = await request(app).get(`/api/projects?semester=${past}`);

        const ids = res.body.items.map((p) => p.id);

        expect(ids).toContain(inPast.id);
        expect(ids).not.toContain(inNow.id);
    });

    // 404, matching every other id in this API. Returning an empty catalogue would
    // report "this term has no projects" about a term that does not exist.
    it("404 for a semester id that is not a number", async () => {
        const res = await request(app).get("/api/projects?semester=abc");

        expect(res.status).toBe(404);
        expect(res.body.code).toBe("NOT_FOUND");
    });

    it("404 for a numeric semester id that names nothing", async () => {
        const res = await request(app).get("/api/projects?semester=99999999");

        expect(res.status).toBe(404);
    });

    // The filter goes into the WHERE clause, so limit/offset shifted from $1/$2 to
    // $2/$3. Getting that wrong throws rather than misbehaving quietly - but only on
    // the paged path, which nothing on Discover uses today.
    it("still pages, with the filter applied", async () => {
        const res = await request(app).get(`/api/projects?semester=${now}&limit=1&offset=0`);

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body).toMatchObject({ limit: 1, offset: 0 });
        // total is the COUNT for that semester alone, not the whole catalogue.
        expect(res.body.items[0].semester_id).toBe(now);
    });

    it("in the gap: still serves the term that just ended", async () => {
        await setSemesters([
            { name: "Just ended", from: -100, to: -1 },
            { name: "Next", from: 10, to: 100 },
        ]);

        const { rows } = await pool.query("SELECT id FROM semesters WHERE name = 'Just ended'");
        const project = await makeProject({
            creatorId: creator.id,
            status: "APPROVED",
            semesterId: rows[0].id,
        });

        const res = await request(app).get("/api/projects");

        expect(res.status).toBe(200);
        expect(res.body.items.map((p) => p.id)).toContain(project.id);
    });

    it("with no semesters at all: an empty catalogue, not an error", async () => {
        await setSemesters([]);

        const res = await request(app).get("/api/projects");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ items: [], total: 0, limit: null, offset: 0 });
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
