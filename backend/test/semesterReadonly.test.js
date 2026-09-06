/**
 * A project whose semester has ended is READ-ONLY (N2).
 *
 * Design: docs/superpowers/specs/2026-09-06-semester-readonly-design.md
 *
 * Two halves. The first pins that the reads REPORT whether the semester has closed; the
 * second pins what assertSemesterOpen blocks and — just as importantly — what it must
 * NOT block. The second half is the one that matters: nearly every way of getting this
 * feature wrong is the rule applied one place too far.
 *
 * ⚠️ LIKE semesters.test.js, THIS FILE REWRITES THE `semesters` TABLE, and it is safe
 * for the same reasons: vitest runs one file at a time in one process, and what
 * schema.sql seeded is restored in afterAll. Fixtures are offsets from CURRENT_DATE, not
 * fixed dates, so the suite does not start failing on a particular day of the calendar.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, makeTier, makeComment, balanceOf, as } from "./helpers/factories.js";

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

// ─────────────────────────────────────────────────────────────────────────────
// The rule itself.
// ─────────────────────────────────────────────────────────────────────────────

describe("a project whose semester has ended", () => {
    let owner;
    let backer;
    let admin;
    let secondAdmin;

    beforeAll(async () => {
        owner = await makeUser({ roles: ["CREATOR"] });
        backer = await makeUser({ roles: ["BACKER"], balance: 5000 });
        admin = await makeUser({ roles: ["ADMIN"] });
        secondAdmin = await makeUser({ roles: ["ADMIN"] });
    });

    // Fresh per test: several of these change the project, and one has to be able to
    // prove that nothing changed.
    const closedProject = (overrides = {}) =>
        makeProject({ creatorId: owner.id, status: "APPROVED", semesterId: closedSemester.id, ...overrides });

    describe("is frozen for writing", () => {
        it("409 on invest, and neither the wallet nor the funding moves", async () => {
            const project = await closedProject();

            const before = await balanceOf(backer.id);
            const res = await as(backer.token).post(`/api/projects/${project.id}/invest`).send({ amount: 100 });
            const after = await balanceOf(backer.id);

            expect(res.status).toBe(409);
            expect(res.body.code).toBe("CONFLICT");
            expect(res.body.message).toContain("read-only");
            expect(after).toBe(before);

            const { rows } = await pool.query("select current_amount from projects where id = $1", [project.id]);
            expect(Number(rows[0].current_amount)).toBe(0);
        });

        it("409 on editing the project", async () => {
            const project = await closedProject();

            const res = await as(owner.token).put(`/api/projects/${project.id}`).send({ title: "Renamed" });

            expect(res.status).toBe(409);
        });

        it("409 on posting a comment", async () => {
            const project = await closedProject();

            const res = await as(backer.token)
                .post(`/api/projects/${project.id}/comments`)
                .send({ body: "Still here?" });

            expect(res.status).toBe(409);
        });

        it("409 on posting a project update", async () => {
            const project = await closedProject();

            const res = await as(owner.token)
                .post(`/api/projects/${project.id}/updates`)
                .send({ title: "News", body: "Something happened." });

            expect(res.status).toBe(409);
        });

        // One check in loadProjectForTierWrite covers all three, so all three are pinned.
        it("409 on creating, editing and deleting a support level", async () => {
            const project = await closedProject();
            const tier = await makeTier({ projectId: project.id });

            const created = await as(owner.token)
                .post(`/api/projects/${project.id}/tiers`)
                .send({ name: "New level", min_amount: 200, bullets: ["Signals support"] });

            const updated = await as(owner.token)
                .put(`/api/projects/${project.id}/tiers/${tier.id}`)
                .send({ name: "Renamed", min_amount: 150, bullets: ["Signals support"] });

            const deleted = await as(owner.token).delete(`/api/projects/${project.id}/tiers/${tier.id}`);

            expect([created.status, updated.status, deleted.status]).toEqual([409, 409, 409]);
        });

        // Locked because updateProject is locked: a creator who cannot fix what was
        // rejected has nothing to resubmit. See the note in moderationService.
        it("409 on resubmitting a rejected project", async () => {
            const project = await closedProject({ status: "REJECTED" });

            const res = await as(owner.token).patch(`/api/projects/${project.id}/resubmit`);

            expect(res.status).toBe(409);
        });
    });

    describe("is still fully readable", () => {
        it("200 on the project, its comments, its updates and its levels - signed out", async () => {
            const project = await closedProject();
            await makeTier({ projectId: project.id });
            await makeComment({ projectId: project.id, userId: backer.id });

            const [detail, comments, updates, tiers] = await Promise.all([
                request(app).get(`/api/projects/${project.id}`),
                request(app).get(`/api/projects/${project.id}/comments`),
                request(app).get(`/api/projects/${project.id}/updates`),
                request(app).get(`/api/projects/${project.id}/tiers`),
            ]);

            expect([detail.status, comments.status, updates.status, tiers.status]).toEqual([200, 200, 200, 200]);
            expect(comments.body.items.length).toBeGreaterThan(0);
        });
    });

    // ⚠️ THE HALF THAT PROTECTS THE FEATURE FROM A TIDY-UP.
    //
    // Every test below goes red the moment somebody adds assertSemesterOpen "for
    // consistency" to a place that must not have it. Read the reason before changing any
    // of them to expect a 409.
    describe("still allows the things that must never be blocked", () => {
        it("an admin can APPROVE a project whose term already ended", async () => {
            const project = await closedProject({ status: "PENDING" });

            const res = await as(admin.token).patch(`/api/projects/${project.id}/approve`);

            // A project left PENDING when the term closed would otherwise be stuck in the
            // queue for ever. Approved, it simply belongs to that term's record.
            expect(res.status).toBe(200);
        });

        it("an admin can REJECT a project whose term already ended", async () => {
            const project = await closedProject({ status: "PENDING" });

            const res = await as(secondAdmin.token)
                .patch(`/api/projects/${project.id}/reject`)
                .send({ note: "Out of scope." });

            expect(res.status).toBe(200);
        });

        it("a comment can still be DELETED", async () => {
            const project = await closedProject();
            const comment = await makeComment({ projectId: project.id, userId: backer.id });

            const res = await as(backer.token)
                .delete(`/api/projects/${project.id}/comments/${comment.id}`);

            // Abusive text does not become acceptable because a term ended - the same
            // reasoning that keeps deletion open on an archived project.
            expect(res.status).toBe(200);
        });

        it("a project update can still be DELETED", async () => {
            // Posted while the term was open, and then the term ended.
            const live = await makeProject({ creatorId: owner.id, status: "APPROVED", semesterId: openSemester.id });
            const posted = await as(owner.token)
                .post(`/api/projects/${live.id}/updates`)
                .send({ title: "News", body: "Something happened." });

            await pool.query("UPDATE projects SET semester_id = $1 WHERE id = $2", [closedSemester.id, live.id]);

            const res = await as(owner.token)
                .delete(`/api/projects/${live.id}/updates/${posted.body.update.id}`);

            expect(res.status).toBe(200);
        });

        it("an admin can still ENDORSE it", async () => {
            const project = await closedProject();

            const res = await as(admin.token)
                .patch(`/api/projects/${project.id}/endorse`)
                .send({ endorsed: true });

            // Curation, the same family as approving. Nothing about it belongs to the
            // creator's editing rights.
            expect(res.status).toBe(200);
        });

        it("it can still be ARCHIVED and RESTORED", async () => {
            const project = await closedProject();

            const archived = await as(admin.token)
                .patch(`/api/projects/${project.id}/archive`)
                .send({ reason: "Housekeeping." });

            const restored = await as(admin.token).patch(`/api/projects/${project.id}/restore`);

            // Two independent axes: the calendar closing a term must not take away the
            // admin's ability to hide or unhide a project.
            expect([archived.status, restored.status]).toEqual([200, 200]);
        });
    });

    describe("while the semester is still open", () => {
        it("everything the closed one refuses still works", async () => {
            const live = await makeProject({
                creatorId: owner.id,
                status: "APPROVED",
                semesterId: openSemester.id,
            });

            const edited = await as(owner.token).put(`/api/projects/${live.id}`).send({ title: "Renamed while open" });
            const commented = await as(backer.token).post(`/api/projects/${live.id}/comments`).send({ body: "Nice." });
            const posted = await as(owner.token).post(`/api/projects/${live.id}/updates`).send({ title: "News", body: "Body." });

            expect([edited.status, commented.status, posted.status]).toEqual([200, 201, 201]);
        });

        // The COALESCE again, this time on the rule rather than on the read: an orphaned
        // project must stay editable rather than be frozen by accident.
        it("a project with no semester is not frozen either", async () => {
            const orphan = await makeProject({ creatorId: owner.id, status: "APPROVED", semesterId: null });

            const res = await as(owner.token).put(`/api/projects/${orphan.id}`).send({ title: "Still editable" });

            expect(res.status).toBe(200);
        });
    });
});
