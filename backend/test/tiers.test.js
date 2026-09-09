/**
 * Support levels, project_tiers in the database.
 *
 * A level is a minimum contribution plus the lines saying what choosing it signals: not a
 * reward, and nothing is owed. What that means for the code is recorded here. Levels are
 * content, so they follow updateProject's permission rule rather than
 * createProjectUpdate's; a rejected project keeps its levels editable so the creator can
 * revise and resubmit; and a level somebody already chose is hidden rather than deleted,
 * because their transaction points at the row.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, makeTier, as } from "./helpers/factories.js";

const MAX_TIERS = 5;

const level = (overrides = {}) => ({
    name: "Supporter",
    min_amount: 100,
    bullets: ["Signals support for the idea"],
    ...overrides,
});

let creator;
let otherCreator;
let admin;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    otherCreator = await makeUser({ roles: ["CREATOR"] });
    admin = await makeUser({ roles: ["ADMIN"] });
});

describe("GET /api/projects/:id/tiers", () => {
    it("200 and an envelope, readable signed out", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await makeTier({ projectId: project.id, minAmount: 250, name: "Champion" });
        await makeTier({ projectId: project.id, minAmount: 50, name: "Supporter" });

        const res = await request(app).get(`/api/projects/${project.id}/tiers`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.items)).toBe(true);
        // Ordered by min_amount, with no sort_order column to drift out of step.
        expect(res.body.items.map((t) => Number(t.min_amount))).toEqual([50, 250]);
    });

    it("404 for a project that does not exist", async () => {
        expect((await request(app).get("/api/projects/99999999/tiers")).status).toBe(404);
    });
});

describe("POST /api/projects/:id/tiers", () => {
    it("201 for the owner and 201 for an admin", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const owner = await as(creator.token).post(`/api/projects/${project.id}/tiers`).send(level());
        const byAdmin = await as(admin.token)
            .post(`/api/projects/${project.id}/tiers`)
            .send(level({ min_amount: 200, name: "Champion" }));

        expect(owner.status).toBe(201);
        expect(byAdmin.status).toBe(201);
    });

    it("403 for a creator who does not own the project, 401 signed out", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const stranger = await as(otherCreator.token).post(`/api/projects/${project.id}/tiers`).send(level());
        const anonymous = await request(app).post(`/api/projects/${project.id}/tiers`).send(level());

        expect(stranger.status).toBe(403);
        expect(stranger.body.code).toBe("FORBIDDEN");
        expect(stranger.body.message).toContain("Only the project's creator");
        expect(anonymous.status).toBe(401);
    });

    // 422: the level is well-formed JSON that says something unusable.
    it("422 on a missing name, a non-integer minimum, and no bullets", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const post = (body) => as(creator.token).post(`/api/projects/${project.id}/tiers`).send(body);

        expect((await post(level({ name: "  " }))).status).toBe(422);
        expect((await post(level({ min_amount: 10.5 }))).status).toBe(422);
        expect((await post(level({ min_amount: 0 }))).status).toBe(422);
        expect((await post(level({ bullets: [] }))).status).toBe(422);
    });

    // A level above the contribution cap is one nobody can reach, since a person may
    // contribute once and at most the cap. Allowing it would put a dead control on the
    // project page by construction.
    it("422 on a level that asks for more than a person may contribute", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const post = (body) => as(creator.token).post(`/api/projects/${project.id}/tiers`).send(body);

        const tooHigh = await post(level({ name: "Impossible", min_amount: 501 }));

        expect(tooHigh.status).toBe(422);
        expect(tooHigh.body.message).toBe("A support level cannot ask for more than 500 CC.");

        // The cap itself stays reachable: it is the number backers are shown.
        expect((await post(level({ name: "At the cap", min_amount: 500 }))).status).toBe(201);
    });

    // Worded to match the frontend copy in tierRules.js. A creator who gets past one
    // check and is refused by the other should read the same sentence rather than wonder
    // whether they hit a second, stricter rule.
    it("uses the same wording as the frontend rule for the minimum", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(creator.token).post(`/api/projects/${project.id}/tiers`).send(level({ min_amount: 0 }));

        expect(res.body.message).toBe(
            "A level needs a minimum above 0 CC — a whole number of Class Coins."
        );
    });

    it("409 on a second ACTIVE level at the same minimum", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(creator.token).post(`/api/projects/${project.id}/tiers`).send(level({ min_amount: 100 }));

        const res = await as(creator.token)
            .post(`/api/projects/${project.id}/tiers`)
            .send(level({ name: "Another", min_amount: 100 }));

        // 409 rather than 422: the amount is perfectly good, and what refuses it is
        // another row.
        expect(res.status).toBe(409);
        expect(res.body.code).toBe("CONFLICT");
        expect(res.body.message).toBe("Another level already starts at 100 CC.");
    });

    // Active levels only. Treating a hidden one's amount as taken would make hiding a
    // level a permanent reservation of that number.
    it("allows a new level at the minimum of a HIDDEN one", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await makeTier({ projectId: project.id, minAmount: 100, isActive: false });

        const res = await as(creator.token).post(`/api/projects/${project.id}/tiers`).send(level({ min_amount: 100 }));

        expect(res.status).toBe(201);
    });

    // The level-limit check runs before field validation, so on a full project every
    // request is refused with that message whatever else is wrong with it.
    it("409 once the project already has five levels, before any other check", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        for (let i = 1; i <= MAX_TIERS; i += 1) {
            await makeTier({ projectId: project.id, minAmount: i * 10, name: `Level ${i}` });
        }

        const res = await as(creator.token).post(`/api/projects/${project.id}/tiers`).send(level({ name: "" }));

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("A project can have at most 5 support levels.");
    });

    // Levels follow updateProject's rule rather than createProjectUpdate's: a rejected
    // project stays editable so the creator can revise it, levels included.
    it("201 on a REJECTED project, but 409 on an archived one", async () => {
        const rejected = await makeProject({ creatorId: creator.id, status: "REJECTED" });
        const archived = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(creator.token).patch(`/api/projects/${archived.id}/archive`).send({});

        expect((await as(creator.token).post(`/api/projects/${rejected.id}/tiers`).send(level())).status).toBe(201);

        const frozen = await as(creator.token).post(`/api/projects/${archived.id}/tiers`).send(level());

        expect(frozen.status).toBe(409);
        expect(frozen.body.code).toBe("CONFLICT");
        expect(frozen.body.message).toContain("archived");
    });
});

describe("PUT /api/projects/:id/tiers/:tierId", () => {
    it("200 for the owner", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const tier = await makeTier({ projectId: project.id, minAmount: 100 });

        const res = await as(creator.token)
            .put(`/api/projects/${project.id}/tiers/${tier.id}`)
            .send(level({ name: "Renamed", min_amount: 150 }));

        expect(res.status).toBe(200);
        expect(res.body.tier.name).toBe("Renamed");
        expect(Number(res.body.tier.min_amount)).toBe(150);
    });

    // Scoped to the project in the path, so a level id from another project cannot be
    // edited by putting it in this URL.
    it("404 for a level belonging to a different project", async () => {
        const mine = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const elsewhere = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const foreign = await makeTier({ projectId: elsewhere.id });

        const res = await as(creator.token).put(`/api/projects/${mine.id}/tiers/${foreign.id}`).send(level());

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Support level not found");
    });

    it("does not clash with its own current minimum", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const tier = await makeTier({ projectId: project.id, minAmount: 100 });

        const res = await as(creator.token)
            .put(`/api/projects/${project.id}/tiers/${tier.id}`)
            .send(level({ name: "Same amount, new name", min_amount: 100 }));

        expect(res.status).toBe(200);
    });
});

describe("DELETE /api/projects/:id/tiers/:tierId", () => {
    it("200 and really deletes a level nobody has chosen", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const tier = await makeTier({ projectId: project.id });

        const res = await as(creator.token).delete(`/api/projects/${project.id}/tiers/${tier.id}`);

        expect(res.status).toBe(200);
        expect(res.body.hidden).toBe(false);

        const { rows } = await pool.query("select id from project_tiers where id = $1", [tier.id]);

        expect(rows).toHaveLength(0);
    });

    // A transaction points at this level, so deleting it would erase what somebody
    // signalled. It is hidden instead, and the caller is told which happened.
    it("200 and only HIDES a level somebody has already chosen", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 5000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const tier = await makeTier({ projectId: project.id, minAmount: 100 });

        const invested = await as(backer.token)
            .post(`/api/projects/${project.id}/invest`)
            .send({ amount: 100, tierId: tier.id });

        expect(invested.status).toBe(200);

        const res = await as(creator.token).delete(`/api/projects/${project.id}/tiers/${tier.id}`);

        expect(res.status).toBe(200);
        expect(res.body.hidden).toBe(true);

        const { rows } = await pool.query("select is_active from project_tiers where id = $1", [tier.id]);

        expect(rows[0].is_active).toBe(false);
    });
});
