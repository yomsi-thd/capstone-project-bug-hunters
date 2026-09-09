/**
 * The project lifecycle: create, read, update, the approve, reject and resubmit verdicts,
 * endorse and permanent delete.
 *
 * This file is about the status code of every branch rather than the payload. The codes
 * are pinned so that changing one is a visible one-line diff rather than a silent side
 * effect.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, makeTier, as } from "./helpers/factories.js";

const validBody = (overrides = {}) => ({
    title: "A test project",
    description: "Short blurb.",
    category: "ENGINEERING",
    ...overrides,
});

let creator;
let otherCreator;
let backer;
let admin;
let secondAdmin;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR", "BACKER"] });
    otherCreator = await makeUser({ roles: ["CREATOR"] });
    backer = await makeUser({ roles: ["BACKER"] });
    admin = await makeUser({ roles: ["ADMIN"] });
    secondAdmin = await makeUser({ roles: ["ADMIN"] });
});

// Every POST here also passes the semester gate, silently, because globalSetup
// guarantees one semester contains today. The gate's own tests live in semesters.test.js,
// which is set up to rewrite that table safely.
describe("POST /api/projects", () => {
    it("201 for a creator, and the project starts PENDING", async () => {
        const res = await as(creator.token).post("/api/projects").send(validBody());

        expect(res.status).toBe(201);
        expect(res.body.project.status).toBe("PENDING");
        expect(Number(res.body.project.creator_id)).toBe(creator.id);
        expect(res.body.project.created_by_admin_id).toBeNull();
    });

    it("401 signed out, 403 for a pure backer", async () => {
        const anonymous = await request(app).post("/api/projects").send(validBody());
        const asBacker = await as(backer.token).post("/api/projects").send(validBody());

        expect(anonymous.status).toBe(401);
        expect(asBacker.status).toBe(403);
    });

    // resolveOwnership reads the caller's role first. A creator who names someone else is
    // refused rather than having the field ignored, since dropping it silently is how a
    // project ends up filed under another name with nothing recording the attempt.
    it("403 when a creator names a creator_id", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send(validBody({ creator_id: otherCreator.id }));

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("FORBIDDEN");
        expect(res.body.message).toContain("Only an admin can create a project on behalf");
    });

    // 422 with the field named: the body is readable, it is just missing something this
    // caller has to supply. Everything else in resolveOwnership is a 403 for "you may
    // not" or a 409 for "the account you named is unusable".
    it("422 with creator_id named when an admin omits it", async () => {
        const res = await as(admin.token).post("/api/projects").send(validBody());

        expect(res.status).toBe(422);
        expect(res.body.code).toBe("VALIDATION_FAILED");
        expect(res.body.details).toEqual([
            { field: "creator_id", message: "Choose the creator this project belongs to." },
        ]);
    });

    it("403 when an admin names themselves", async () => {
        const res = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: admin.id }));

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("An admin cannot own a project.");
    });

    // 409: the account exists and the id is fine, but its state, having no CREATOR role,
    // is what forbids the request. Same shape as "that account is deactivated".
    it("409 when the named account is not a creator", async () => {
        const res = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: backer.id }));

        expect(res.status).toBe(409);
        expect(res.body.code).toBe("CONFLICT");
        expect(res.body.message).toContain("not a creator");
    });

    // 422 rather than 409: an id pointing at nothing is a bad value, not a state
    // conflict.
    it("422 when creator_id names no account at all", async () => {
        const res = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: 99999999 }));

        expect(res.status).toBe(422);
        expect(res.body.message).toBe("That creator account does not exist.");
    });

    it("201 on behalf of a creator, with ownership going to the creator", async () => {
        const res = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: otherCreator.id }));

        expect(res.status).toBe(201);
        expect(Number(res.body.project.creator_id)).toBe(otherCreator.id);
        expect(Number(res.body.project.created_by_admin_id)).toBe(admin.id);
    });

    // There is no per-project campaign window to validate, and the schema is loose, so
    // these two fields are ignored rather than refused. That is what lets a stale browser
    // tab still submit successfully.
    it("ignores start_date / end_date instead of refusing them", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send(validBody({ start_date: "2026-09-01", end_date: "2026-08-01" }));

        expect(res.status).toBe(201);
        expect(res.body.project.start_date).toBeNull();
        expect(res.body.project.end_date).toBeNull();
    });

    // Support levels are validated before the transaction opens, so a bad level costs
    // nothing and leaves no half-created project behind.
    it("422 and creates nothing when a support level is invalid", async () => {
        const before = await pool.query("select count(*)::int as n from projects");

        const res = await as(creator.token)
            .post("/api/projects")
            .send(validBody({ tiers: [{ name: "", min_amount: 100, bullets: ["x"] }] }));

        const after = await pool.query("select count(*)::int as n from projects");

        expect(res.status).toBe(422);
        expect(after.rows[0].n).toBe(before.rows[0].n);
    });

    it("201 with levels, all committed together", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send(
                validBody({
                    tiers: [
                        { name: "Supporter", min_amount: 50, bullets: ["Signals support"] },
                        { name: "Champion", min_amount: 250, bullets: ["Signals strong support"] },
                    ],
                })
            );

        expect(res.status).toBe(201);

        const tiers = await pool.query("select * from project_tiers where project_id = $1", [res.body.project.id]);

        expect(tiers.rows).toHaveLength(2);
    });
});

describe("GET /api/projects", () => {
    it("200 and an envelope, signed out", async () => {
        const res = await request(app).get("/api/projects");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.total).toBe(res.body.items.length);
        // No limit was asked for, so none was applied. See http/envelope.js for why
        // there is no default.
        expect(res.body.limit).toBeNull();
        expect(res.body.offset).toBe(0);
    });

    it("lists APPROVED projects only", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED", title: "Listed" });
        const hidden = await makeProject({ creatorId: creator.id, status: "PENDING", title: "Not listed" });

        const res = await request(app).get("/api/projects");
        const ids = res.body.items.map((p) => p.id);

        expect(ids).toContain(project.id);
        expect(ids).not.toContain(hidden.id);
    });

    // backers_count counts distinct wallets, like findById's. Proved with two people,
    // since one person can only contribute once. The DISTINCT still earns its place:
    // transactions on a project can also come from the add and deduct side of a wallet,
    // and a future rule change must not be able to double-count somebody.
    it("counts distinct backers, not transactions", async () => {
        const one = await makeUser({ roles: ["BACKER"], balance: 5000 });
        const two = await makeUser({ roles: ["BACKER"], balance: 5000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED", title: "Counted" });

        await as(one.token).post(`/api/projects/${project.id}/invest`).send({ amount: 100 });
        await as(two.token).post(`/api/projects/${project.id}/invest`).send({ amount: 50 });

        const res = await request(app).get("/api/projects");
        const row = res.body.items.find((p) => p.id === project.id);

        expect(row.backers_count).toBe(2);
        expect(Number(row.current_amount)).toBe(150);
    });
});

describe("GET /api/projects/:id", () => {
    it("200 for an approved project, signed out", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await request(app).get(`/api/projects/${project.id}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(project.id);
    });

    it("404 for an id that does not exist", async () => {
        const res = await request(app).get("/api/projects/99999999");

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Project not found");
    });

    // A non-numeric id is refused by numericParam before any query runs, and answers 404
    // rather than 400: ProjectDetail shows its "Project not found" screen on that status,
    // which is the right screen for a mistyped link.
    it("404 for a non-numeric id, checked before it reaches a query", async () => {
        const res = await request(app).get("/api/projects/not-a-number");

        expect(res.status).toBe(404);
        expect(res.body.code).toBe("NOT_FOUND");
        expect(res.body.message).toBe("Project not found");
    });
});

describe("GET /api/projects/my and /my/backers", () => {
    it("200 with the caller's own projects only", async () => {
        const mine = await makeProject({ creatorId: otherCreator.id, title: "Mine" });
        const theirs = await makeProject({ creatorId: creator.id, title: "Theirs" });

        const res = await as(otherCreator.token).get("/api/projects/my");
        const ids = res.body.items.map((p) => p.id);

        expect(res.status).toBe(200);
        expect(ids).toContain(mine.id);
        expect(ids).not.toContain(theirs.id);
    });

    // /my and /my/backers are declared above /:id. Lose that order and Express matches
    // /:id with id = "my", turning both into 404s.
    it('the literal "my" routes are not swallowed by /:id', async () => {
        const projects = await as(creator.token).get("/api/projects/my");
        const backers = await as(creator.token).get("/api/projects/my/backers");

        expect(projects.status).toBe(200);
        expect(backers.status).toBe(200);
        expect(Array.isArray(backers.body.items)).toBe(true);
    });

    it("401 signed out", async () => {
        expect((await request(app).get("/api/projects/my")).status).toBe(401);
        expect((await request(app).get("/api/projects/my/backers")).status).toBe(401);
    });

    // A row here is one person grouped across every investment they made in this
    // creator's projects, so it has to pick one level to show, and it picks the highest
    // they ever chose. That has to match getInvestmentsByUser exactly, or the same person
    // reads as one level on their own card and another on the creator's dashboard.
    //
    // The higher level is chosen first and on a different project, so neither "latest" nor
    // "same project as the last one" would give the expected answer.
    it("names the HIGHEST level a backer ever chose, across all of the creator's projects", async () => {
        const owner = await makeUser({ roles: ["CREATOR"] });
        const investor = await makeUser({ roles: ["BACKER"], balance: 2000 });

        const first = await makeProject({ creatorId: owner.id, status: "APPROVED" });
        const second = await makeProject({ creatorId: owner.id, status: "APPROVED" });
        const champion = await makeTier({ projectId: first.id, name: "Champion", minAmount: 500 });
        const supporter = await makeTier({ projectId: second.id, name: "Supporter", minAmount: 100 });

        await as(investor.token).post(`/api/projects/${first.id}/invest`).send({ amount: 500, tierId: champion.id });
        await as(investor.token).post(`/api/projects/${second.id}/invest`).send({ amount: 100, tierId: supporter.id });

        const res = await as(owner.token).get("/api/projects/my/backers");
        const row = res.body.items.find((r) => Number(r.user_id) === investor.id);

        expect(row.top_tier_name).toBe("Champion");
        expect(row.top_tier_min).toBe(500);
        // The "N projects" line under the chip has to stay: the level is across all of
        // them, not from whichever project the row is sorted by.
        expect(row.project_count).toBe(2);
        expect(row.total_amount).toBe(600);
    });
});

describe("PUT /api/projects/:id", () => {
    it("200 for the owner", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await as(creator.token).put(`/api/projects/${project.id}`).send({ title: "Renamed" });

        expect(res.status).toBe(200);
        expect(res.body.project.title).toBe("Renamed");
    });

    /**
     * A missing project, somebody else's project and a dead database have to answer
     * differently. Collapsed into one status, no client can tell a user's mistake from an
     * outage.
     */
    it("404 for a project that does not exist", async () => {
        const res = await as(creator.token).put("/api/projects/99999999").send({ title: "x" });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe("NOT_FOUND");
        expect(res.body.message).toBe("Project not found");
    });

    it("403 for somebody else's project", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await as(otherCreator.token).put(`/api/projects/${project.id}`).send({ title: "x" });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("FORBIDDEN");
        expect(res.body.message).toBe("Unauthorized");
    });

    // updateProject compares creator_id to req.user.id and has no admin branch, so an
    // admin editing someone's project is refused exactly like a stranger.
    it("403 even for an admin", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await as(admin.token).put(`/api/projects/${project.id}`).send({ title: "x" });

        expect(res.status).toBe(403);
    });

    // Three cases rather than two: absent leaves the column alone, text stores it, and
    // empty stores NULL, so one column never holds both "" and null meaning "no video".
    it("normalises an empty video_url to NULL, and leaves an absent one alone", async () => {
        const project = await makeProject({ creatorId: creator.id });

        await as(creator.token).put(`/api/projects/${project.id}`).send({ video_url: "https://youtu.be/abc" });

        const untouched = await as(creator.token).put(`/api/projects/${project.id}`).send({ title: "Same" });

        expect(untouched.body.project.video_url).toBe("https://youtu.be/abc");

        const cleared = await as(creator.token).put(`/api/projects/${project.id}`).send({ video_url: "" });

        expect(cleared.body.project.video_url).toBeNull();
    });
});

describe("PATCH /api/projects/:id/approve and /reject", () => {
    it("200 and the project becomes APPROVED", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "PENDING" });

        const res = await as(admin.token).patch(`/api/projects/${project.id}/approve`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("APPROVED");
    });

    it("200 and the reviewer's note is stored on reject", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "PENDING" });

        const res = await as(admin.token)
            .patch(`/api/projects/${project.id}/reject`)
            .send({ note: "Needs a clearer budget." });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("REJECTED");
        expect(res.body.review_note).toBe("Needs a clearer budget.");
    });

    // The note is seeded directly rather than by rejecting first, because the race guard
    // refuses approve on a REJECTED project. The thing being measured, that approve clears
    // review_note, is still measured, from a status the verdict is legal from.
    it("approving clears a review note left on the project", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            status: "PENDING",
            reviewNote: "An earlier reviewer's note.",
        });

        const res = await as(admin.token).patch(`/api/projects/${project.id}/approve`);

        expect(res.status).toBe(200);
        expect(res.body.review_note).toBeNull();
    });

    // Two admins on one queue. Guarded by `AND status = 'PENDING'` in the UPDATE rather
    // than a read-then-write in the service: both admins read PENDING, so any check
    // before the write passes for both. Postgres decides, and exactly one wins.
    it("409 when a second verdict lands on a project already reviewed", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "PENDING" });

        const first = await as(admin.token).patch(`/api/projects/${project.id}/approve`);
        const second = await as(secondAdmin.token).patch(`/api/projects/${project.id}/approve`);

        expect(first.status).toBe(200);
        expect(second.status).toBe(409);
        expect(second.body.code).toBe("CONFLICT");
        expect(second.body.message).toContain("already been reviewed");
    });

    // The dangerous direction: without the guard a stale REJECT overwrites a live
    // APPROVED project, takes it off Discover and staples a rejection note to it, while
    // answering 200 to the admin who did it.
    it("a late REJECT cannot overwrite an approved project", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "PENDING" });

        await as(admin.token).patch(`/api/projects/${project.id}/approve`);

        const late = await as(secondAdmin.token)
            .patch(`/api/projects/${project.id}/reject`)
            .send({ note: "Written against a stale queue." });

        expect(late.status).toBe(409);

        const after = await as(admin.token).get(`/api/admin/projects/${project.id}`);
        expect(after.body.status).toBe("APPROVED");
        expect(after.body.review_note).toBeNull();
    });

    // A verdict only applies from PENDING, so a hand-made request cannot approve a
    // REJECTED project directly. No UI path is lost, since the queue lists PENDING only,
    // and resubmit is the route back.
    it("409 approving a REJECTED project directly; resubmit is the way back", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "REJECTED" });

        expect((await as(admin.token).patch(`/api/projects/${project.id}/approve`)).status).toBe(409);

        await as(creator.token).patch(`/api/projects/${project.id}/resubmit`);

        expect((await as(admin.token).patch(`/api/projects/${project.id}/approve`)).status).toBe(200);
    });

    // "Not found" keeps its own 404 here rather than collapsing into the generic
    // failure status.
    it("404 for an id that does not exist", async () => {
        const res = await as(admin.token).patch("/api/projects/99999999/approve");

        expect(res.status).toBe(404);
    });

    it("403 for a non-admin", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "PENDING" });

        expect((await as(creator.token).patch(`/api/projects/${project.id}/approve`)).status).toBe(403);
        expect((await as(backer.token).patch(`/api/projects/${project.id}/reject`)).status).toBe(403);
    });

    // The conflict-of-interest rule, and why the system needs a second admin account at
    // all: without one, an on-behalf project sits in the queue for good.
    it("409 when the reviewing admin is the one who filed the project", async () => {
        const created = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: otherCreator.id }));

        const own = await as(admin.token).patch(`/api/projects/${created.body.project.id}/approve`);
        const other = await as(secondAdmin.token).patch(`/api/projects/${created.body.project.id}/approve`);

        expect(own.status).toBe(409);
        expect(own.body.code).toBe("CONFLICT");
        expect(own.body.message).toContain("another admin has to review it");
        expect(other.status).toBe(200);
    });
});

describe("PATCH /api/projects/:id/resubmit", () => {
    it("200 from REJECTED, back to PENDING with the note cleared", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "PENDING" });

        await as(admin.token).patch(`/api/projects/${project.id}/reject`).send({ note: "Revise it." });

        const res = await as(creator.token).patch(`/api/projects/${project.id}/resubmit`);

        expect(res.status).toBe(200);
        expect(res.body.project.status).toBe("PENDING");
        expect(res.body.project.review_note).toBeNull();
    });

    it("409 from any status other than REJECTED", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(creator.token).patch(`/api/projects/${project.id}/resubmit`);

        expect(res.status).toBe(409);
        expect(res.body.message).toContain("Only a rejected project");
    });

    it("403 for someone who is neither the creator nor an admin", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "REJECTED" });

        const res = await as(otherCreator.token).patch(`/api/projects/${project.id}/resubmit`);

        expect(res.status).toBe(403);
    });
});

describe("PATCH /api/projects/:id/endorse", () => {
    it("200 and the badge flips", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const on = await as(admin.token).patch(`/api/projects/${project.id}/endorse`).send({ endorsed: true });
        const off = await as(admin.token).patch(`/api/projects/${project.id}/endorse`).send({ endorsed: false });

        expect(on.status).toBe(200);
        expect(on.body.endorsed).toBe(true);
        expect(off.body.endorsed).toBe(false);
    });

    it("403 for a creator, 404 for an unknown id", async () => {
        const project = await makeProject({ creatorId: creator.id });

        expect((await as(creator.token).patch(`/api/projects/${project.id}/endorse`).send({ endorsed: true })).status).toBe(403);
        expect((await as(admin.token).patch("/api/projects/99999999/endorse").send({ endorsed: true })).status).toBe(404);
    });
});

describe("DELETE /api/projects/:id", () => {
    it("409 for an admin while the project is not archived", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await as(admin.token).delete(`/api/projects/${project.id}`);

        expect(res.status).toBe(409);
        expect(res.body.message).toContain("Only an archived project");
    });

    it("403 for the creator even once it is archived", async () => {
        const project = await makeProject({ creatorId: creator.id });

        await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        const res = await as(creator.token).delete(`/api/projects/${project.id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized");
    });

    it("200 for an admin on an archived project, and it is really gone", async () => {
        const project = await makeProject({ creatorId: creator.id });

        await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        const res = await as(admin.token).delete(`/api/projects/${project.id}`);

        expect(res.status).toBe(200);
        expect((await request(app).get(`/api/projects/${project.id}`)).status).toBe(404);
    });
});
