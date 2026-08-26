/**
 * Support levels (project_tiers in the database).
 *
 * A level is a MINIMUM contribution plus the lines saying what choosing it signals —
 * not a reward, and nothing is owed. What that means for the code is recorded here:
 * levels are content, so they follow updateProject's permission rule rather than
 * createProjectUpdate's; a REJECTED project keeps its levels editable so the creator
 * can revise and resubmit; and a level somebody has already chosen is hidden, never
 * deleted, because their transaction points at the row.
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
    it("200 and a bare array, readable signed out", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await makeTier({ projectId: project.id, minAmount: 250, name: "Champion" });
        await makeTier({ projectId: project.id, minAmount: 50, name: "Supporter" });

        const res = await request(app).get(`/api/projects/${project.id}/tiers`);

        expect(res.status).toBe(200);
        // Pinned: the envelope commit changes this shape.
        expect(Array.isArray(res.body)).toBe(true);
        // Ordered by min_amount, with no sort_order column to drift out of step.
        expect(res.body.map((t) => Number(t.min_amount))).toEqual([50, 250]);
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

    it("400 for a creator who does not own the project, 401 signed out", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const stranger = await as(otherCreator.token).post(`/api/projects/${project.id}/tiers`).send(level());
        const anonymous = await request(app).post(`/api/projects/${project.id}/tiers`).send(level());

        expect(stranger.status).toBe(400);
        expect(stranger.body.message).toContain("Only the project's creator");
        expect(anonymous.status).toBe(401);
    });

    it("400 on a missing name, a non-integer minimum, and no bullets", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const post = (body) => as(creator.token).post(`/api/projects/${project.id}/tiers`).send(body);

        expect((await post(level({ name: "  " }))).status).toBe(400);
        expect((await post(level({ min_amount: 10.5 }))).status).toBe(400);
        expect((await post(level({ min_amount: 0 }))).status).toBe(400);
        expect((await post(level({ bullets: [] }))).status).toBe(400);
    });

    // Worded identically to the frontend copy in tierRules.js. A creator who gets past
    // one check and is refused by the other must read the same sentence, not wonder
    // whether they have hit a second, stricter rule.
    it("uses the same wording as the frontend rule for the minimum", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(creator.token).post(`/api/projects/${project.id}/tiers`).send(level({ min_amount: 0 }));

        expect(res.body.message).toBe(
            "A level needs a minimum above 0 CC — a whole number of Class Coins."
        );
    });

    it("400 on a second ACTIVE level at the same minimum", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(creator.token).post(`/api/projects/${project.id}/tiers`).send(level({ min_amount: 100 }));

        const res = await as(creator.token)
            .post(`/api/projects/${project.id}/tiers`)
            .send(level({ name: "Another", min_amount: 100 }));

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Another level already starts at 100 CC.");
    });

    // Only ACTIVE levels count. Treating a hidden one's amount as taken forever would
    // make hiding a level a permanent reservation of the number.
    it("allows a new level at the minimum of a HIDDEN one", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await makeTier({ projectId: project.id, minAmount: 100, isActive: false });

        const res = await as(creator.token).post(`/api/projects/${project.id}/tiers`).send(level({ min_amount: 100 }));

        expect(res.status).toBe(201);
    });

    // ⚠️ The max-5 check runs BEFORE field validation, so on a full project every
    // request is refused with "at most 5" whatever else is wrong with it.
    it("400 once the project already has five levels, before any other check", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        for (let i = 1; i <= MAX_TIERS; i += 1) {
            await makeTier({ projectId: project.id, minAmount: i * 10, name: `Level ${i}` });
        }

        const res = await as(creator.token).post(`/api/projects/${project.id}/tiers`).send(level({ name: "" }));

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("A project can have at most 5 support levels.");
    });

    // Levels follow updateProject's rule, NOT createProjectUpdate's: a rejected project
    // stays editable so the creator can revise it, and the levels are part of that.
    it("201 on a REJECTED project, but 400 on an archived one", async () => {
        const rejected = await makeProject({ creatorId: creator.id, status: "REJECTED" });
        const archived = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(creator.token).patch(`/api/projects/${archived.id}/archive`).send({});

        expect((await as(creator.token).post(`/api/projects/${rejected.id}/tiers`).send(level())).status).toBe(201);

        const frozen = await as(creator.token).post(`/api/projects/${archived.id}/tiers`).send(level());

        expect(frozen.status).toBe(400);
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
    it("400 for a level belonging to a different project", async () => {
        const mine = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const elsewhere = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const foreign = await makeTier({ projectId: elsewhere.id });

        const res = await as(creator.token).put(`/api/projects/${mine.id}/tiers/${foreign.id}`).send(level());

        expect(res.status).toBe(400);
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

    // Somebody's classcoin_transactions row points at this level. Deleting it would
    // erase what they signalled, so it is hidden and the caller is told which of the
    // two happened.
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
