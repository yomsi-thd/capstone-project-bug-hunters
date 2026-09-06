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

import { app, pool, makeUser, makeProject, makeTier, as } from "./helpers/factories.js";

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

// ⚠️ Since 2026-09-06 every POST here also has to pass the SEMESTER gate. It passes
// silently because globalSetup guarantees one semester contains today; the gate's own
// tests (409 in the gap, which semester a project is filed under) live in
// semesters.test.js, which is the file set up to rewrite that table safely.
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
    it("403 when a creator names a creator_id", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send(validBody({ creator_id: otherCreator.id }));

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("FORBIDDEN");
        expect(res.body.message).toContain("Only an admin can create a project on behalf");
    });

    // 422 with the field named: the body is readable, it is just missing something this
    // caller has to supply. Everything else in resolveOwnership is a 403 (you may not) or
    // a 409 (the account you named is unusable), and the three are worth telling apart.
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

    // 409: the account exists and the id is fine, but its current state - no CREATOR
    // role - is what forbids the request. Same shape as "that account is deactivated".
    it("409 when the named account is not a creator", async () => {
        const res = await as(admin.token)
            .post("/api/projects")
            .send(validBody({ creator_id: backer.id }));

        expect(res.status).toBe(409);
        expect(res.body.code).toBe("CONFLICT");
        expect(res.body.message).toContain("not a creator");
    });

    // 422, not 409: an id pointing at nothing is a bad VALUE, not a state conflict.
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

    // Replaced the "422 when end_date is not after start_date" test on 2026-09-06.
    // That rule is gone with resolveCampaignDates: there is no per-project campaign
    // window to validate any more, and the schema is loose, so the two fields are now
    // ignored rather than refused. A browser tab left open across the deploy still
    // submits successfully, which is the reason they are ignored rather than rejected.
    it("ignores start_date / end_date instead of refusing them", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send(validBody({ start_date: "2026-09-01", end_date: "2026-08-01" }));

        expect(res.status).toBe(201);
        expect(res.body.project.start_date).toBeNull();
        expect(res.body.project.end_date).toBeNull();
    });

    // Support levels are validated before the transaction opens, so a bad level costs
    // nothing — and, crucially, leaves no half-created project behind.
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
        // there is deliberately no default.
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

    // A non-numeric id used to reach Postgres as a bad integer cast and answer 404 only
    // because getProjectById mapped every failure to 404. It is now refused by
    // numericParam before any query runs, at the same 404 - deliberately the same, since
    // ProjectDetail shows its "Project not found" screen on exactly that status.
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

    // /my and /my/backers are declared ABOVE /:id. If that order is ever lost, Express
    // matches /:id with id = "my" and these turn into 404s.
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

    // A row here is one PERSON grouped across every investment they made in this
    // creator's projects, so it has to pick ONE level to show — and it picks the
    // HIGHEST they ever chose, matching classCoinRepository.getInvestmentsByUser
    // exactly. The two queries must never disagree: the same person would then be a
    // Champion on their own My Investments card and a Supporter on the creator's
    // dashboard, and neither screen would say which one the creator should believe.
    //
    // The higher level is chosen FIRST and on a DIFFERENT project, so neither "latest"
    // nor "same project as the last one" would produce the expected answer.
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
        // them, not from the project the row happens to be sorted by.
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
     * These three are the example the restructure design leads with. Until the error
     * contract landed, a missing project, somebody else's project and a dead database
     * all answered 400, so no client could tell a user's mistake from an outage.
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
    // admin editing someone's project is refused exactly like a stranger. Behaviour left
    // as it was; only the status is now honest about which of the three cases it is.
    it("403 even for an admin", async () => {
        const project = await makeProject({ creatorId: creator.id });

        const res = await as(admin.token).put(`/api/projects/${project.id}`).send({ title: "x" });

        expect(res.status).toBe(403);
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
