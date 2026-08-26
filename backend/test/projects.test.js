/**
 * Characterisation tests for the project lifecycle: create, read, update, the
 * approve/reject/resubmit verdicts, endorse and permanent delete.
 *
 * The point of this file is the STATUS CODE of every branch, not the payload. Several
 * of the codes recorded here are the ones the API restructure sets out to correct —
 * `updateProject` answering 400 for a project that does not exist is the example the
 * design leads with. They are pinned as they are so that changing them is a visible
 * one-line diff rather than a silent side effect.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, as } from "./helpers/factories.js";

const validBody = (overrides = {}) => ({
    title: "A test project",
    description: "Short blurb.",
    category: "ENGINEERING",
    goal_amount: 5000,
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

    // resolveOwnership reads the CALLER's role first. A creator who names someone else
    // is refused rather than having the field ignored: silently dropping it is how a
    // project ends up filed under another name with nothing recording the attempt.
    it("400 when a creator names a creator_id", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send(validBody({ creator_id: otherCreator.id }));

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("Only an admin can create a project on behalf");
    });

    it("400 when an admin omits creator_id", async () => {
        const res = await as(admin.token).post("/api/projects").send(validBody());

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("on behalf of a creator");
    });

    it("400 when an admin names themselves", async () => {
        const res = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: admin.id }));

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("An admin cannot own a project.");
    });

    it("400 when the named account is not a creator", async () => {
        const res = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: backer.id }));

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("not a creator");
    });

    it("201 on behalf of a creator, with ownership going to the creator", async () => {
        const res = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: otherCreator.id }));

        expect(res.status).toBe(201);
        expect(Number(res.body.project.creator_id)).toBe(otherCreator.id);
        expect(Number(res.body.project.created_by_admin_id)).toBe(admin.id);
    });

    it("400 when end_date is not after start_date", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send(validBody({ start_date: "2026-09-01", end_date: "2026-08-01" }));

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("end_date must be after start_date.");
    });

    // Support levels are validated before the transaction opens, so a bad level costs
    // nothing — and, crucially, leaves no half-created project behind.
    it("400 and creates nothing when a support level is invalid", async () => {
        const before = await pool.query("select count(*)::int as n from projects");

        const res = await as(creator.token)
            .post("/api/projects")
            .send(validBody({ tiers: [{ name: "", min_amount: 100, bullets: ["x"] }] }));

        const after = await pool.query("select count(*)::int as n from projects");

        expect(res.status).toBe(400);
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
    it("200 and a bare array, signed out", async () => {
        const res = await request(app).get("/api/projects");

        expect(res.status).toBe(200);
        // Pinned deliberately: the envelope commit turns this into
        // { items, total, limit, offset } and must change this line with it.
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("lists APPROVED projects only", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED", title: "Listed" });
        const hidden = await makeProject({ creatorId: creator.id, status: "PENDING", title: "Not listed" });

        const res = await request(app).get("/api/projects");
        const ids = res.body.map((p) => p.id);

        expect(ids).toContain(project.id);
        expect(ids).not.toContain(hidden.id);
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

    // A non-numeric id reaches Postgres as a bad integer cast. It answers 404 today only
    // because getProjectById maps every failure to 404, not because anything checked it.
    it("404 for a non-numeric id", async () => {
        const res = await request(app).get("/api/projects/not-a-number");

        expect(res.status).toBe(404);
    });
});

describe("GET /api/projects/my and /my/backers", () => {
    it("200 with the caller's own projects only", async () => {
        const mine = await makeProject({ creatorId: otherCreator.id, title: "Mine" });
        const theirs = await makeProject({ creatorId: creator.id, title: "Theirs" });

        const res = await as(otherCreator.token).get("/api/projects/my");
        const ids = res.body.map((p) => p.id);

        expect(res.status).toBe(200);
        expect(ids).toContain(mine.id);
        expect(ids).not.toContain(theirs.id);
    });

    // /my and /my/backers are declared ABOVE /:id. If that order is ever lost, Express
    // matches /:id with id = "my" and these turn into 404s.
    it('the literal "my" routes are not swallowed by /:id', async () => {
        const projects = await as(creator.token).get("/api/projects/my");
        const backers = await as(creator.token).get("/api/projects/my/backers");

        expect(projects.status).toBe(200);
        expect(backers.status).toBe(200);
        expect(Array.isArray(backers.body)).toBe(true);
    });

    it("401 signed out", async () => {
        expect((await request(app).get("/api/projects/my")).status).toBe(401);
        expect((await request(app).get("/api/projects/my/backers")).status).toBe(401);
    });
});

describe("PUT /api/projects/:id", () => {
    it("200 for the owner", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await as(creator.token).put(`/api/projects/${project.id}`).send({ title: "Renamed" });

        expect(res.status).toBe(200);
        expect(res.body.project.title).toBe("Renamed");
    });

    // The three lines below are the example the restructure design leads with: a missing
    // project, someone else's project and a database failure all answer 400 today, so a
    // client cannot tell a user error from a system one.
    it("400 (not 404) for a project that does not exist", async () => {
        const res = await as(creator.token).put("/api/projects/99999999").send({ title: "x" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Project not found");
    });

    it("400 (not 403) for somebody else's project", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await as(otherCreator.token).put(`/api/projects/${project.id}`).send({ title: "x" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Unauthorized");
    });

    // updateProject compares creator_id to req.user.id and has no admin branch, so an
    // admin editing someone's project is refused exactly like a stranger.
    it("400 even for an admin", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await as(admin.token).put(`/api/projects/${project.id}`).send({ title: "x" });

        expect(res.status).toBe(400);
    });

    // Three cases, not two: absent leaves the column alone, text stores it, empty stores
    // NULL — so one column never holds both "" and null meaning "no video".
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

    it("approving clears a previous rejection note", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "PENDING" });

        await as(admin.token).patch(`/api/projects/${project.id}/reject`).send({ note: "No." });

        const res = await as(admin.token).patch(`/api/projects/${project.id}/approve`);

        expect(res.body.review_note).toBeNull();
    });

    // These two are the only handlers that already read error.status, so "not found"
    // keeps its 404 while everything else falls to 400.
    it("404 for an id that does not exist", async () => {
        const res = await as(admin.token).patch("/api/projects/99999999/approve");

        expect(res.status).toBe(404);
    });

    it("403 for a non-admin", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "PENDING" });

        expect((await as(creator.token).patch(`/api/projects/${project.id}/approve`)).status).toBe(403);
        expect((await as(backer.token).patch(`/api/projects/${project.id}/reject`)).status).toBe(403);
    });

    // The conflict-of-interest rule. It is why the system needs a second admin account
    // at all: without one, an on-behalf project is stuck in the queue forever.
    it("400 when the reviewing admin is the one who filed the project", async () => {
        const created = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: otherCreator.id }));

        const own = await as(admin.token).patch(`/api/projects/${created.body.project.id}/approve`);
        const other = await as(secondAdmin.token).patch(`/api/projects/${created.body.project.id}/approve`);

        expect(own.status).toBe(400);
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

    it("400 from any status other than REJECTED", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(creator.token).patch(`/api/projects/${project.id}/resubmit`);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("Only a rejected project");
    });

    it("400 for someone who is neither the creator nor an admin", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "REJECTED" });

        const res = await as(otherCreator.token).patch(`/api/projects/${project.id}/resubmit`);

        expect(res.status).toBe(400);
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
    it("400 for an admin while the project is not archived", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await as(admin.token).delete(`/api/projects/${project.id}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("Only an archived project");
    });

    it("400 for the creator even once it is archived", async () => {
        const project = await makeProject({ creatorId: creator.id });

        await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        const res = await as(creator.token).delete(`/api/projects/${project.id}`);

        expect(res.status).toBe(400);
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
