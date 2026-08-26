/**
 * Archive: the two-step bin that replaced plain delete, after the lecturer's demo note.
 *
 * Two rules here are load-bearing and easy to break by accident:
 *
 *   Archiving never touches `status`. That is exactly why restore returns a project to
 *   its previous verdict with no re-approval — APPROVED goes straight back to Discover.
 *
 *   An archived project is FROZEN: no edit, invest, comment, update, approve or reject.
 *   Freezing the edit is not tidiness. Without it, archive → edit → restore is a route
 *   onto Discover that skips moderation entirely. If editing while archived is ever
 *   allowed, restore MUST be changed to send the project back to PENDING.
 */

import { describe, it, expect, beforeAll } from "vitest";

import { makeUser, makeProject, makeTier, as } from "./helpers/factories.js";

let creator;
let backer;
let admin;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    backer = await makeUser({ roles: ["BACKER"], balance: 5000 });
    admin = await makeUser({ roles: ["ADMIN"] });
});

describe("PATCH /api/projects/:id/archive", () => {
    it("200 for the owner, with no reason required", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        expect(res.status).toBe(200);
        expect(res.body.project.archived_at).not.toBeNull();
        // The second axis: the verdict is untouched, which is what makes restore safe.
        expect(res.body.project.status).toBe("APPROVED");
    });

    // An admin archiving someone else's project locks the creator out of restoring it,
    // so the creator is at least owed the reason.
    it("400 when an admin archives someone else's project with no reason", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const withoutReason = await as(admin.token).patch(`/api/projects/${project.id}/archive`).send({});
        const withReason = await as(admin.token)
            .patch(`/api/projects/${project.id}/archive`)
            .send({ reason: "Duplicate submission." });

        expect(withoutReason.status).toBe(400);
        expect(withoutReason.body.message).toContain("reason is required");
        expect(withReason.status).toBe(200);
        expect(withReason.body.project.archive_reason).toBe("Duplicate submission.");
    });

    it("400 for an unrelated user, and 400 when it is already archived", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        expect((await as(backer.token).patch(`/api/projects/${project.id}/archive`).send({})).status).toBe(400);

        await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        const again = await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        expect(again.status).toBe(400);
        expect(again.body.message).toBe("This project is already archived.");
    });
});

describe("PATCH /api/projects/:id/restore", () => {
    it("200 for the creator when they archived it themselves", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        const res = await as(creator.token).patch(`/api/projects/${project.id}/restore`);

        expect(res.status).toBe(200);
        expect(res.body.project.archived_at).toBeNull();
        expect(res.body.project.archived_by).toBeNull();
        expect(res.body.project.archive_reason).toBeNull();
    });

    // The asymmetry IS the feature: a creator may only undo an archive they performed.
    // Otherwise they could simply reverse a moderation decision.
    it("400 for the creator when an ADMIN archived it, 200 for an admin", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(admin.token).patch(`/api/projects/${project.id}/archive`).send({ reason: "Under review." });

        const byCreator = await as(creator.token).patch(`/api/projects/${project.id}/restore`);

        expect(byCreator.status).toBe(400);
        expect(byCreator.body.message).toContain("can only be restored by one");

        expect((await as(admin.token).patch(`/api/projects/${project.id}/restore`)).status).toBe(200);
    });

    it("400 when the project is not archived", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(creator.token).patch(`/api/projects/${project.id}/restore`);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("This project is not archived.");
    });

    // No re-approval: a PENDING project comes back to the queue, an APPROVED one goes
    // straight back onto Discover.
    it("returns the project to the verdict it already had", async () => {
        const pending = await makeProject({ creatorId: creator.id, status: "PENDING" });

        await as(creator.token).patch(`/api/projects/${pending.id}/archive`).send({});

        const res = await as(creator.token).patch(`/api/projects/${pending.id}/restore`);

        expect(res.body.project.status).toBe("PENDING");
    });
});

describe("an archived project is frozen", () => {
    let project;
    let tier;

    beforeAll(async () => {
        project = await makeProject({ creatorId: creator.id, status: "PENDING" });
        tier = await makeTier({ projectId: project.id, minAmount: 100 });

        await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});
    });

    it("refuses an edit", async () => {
        const res = await as(creator.token).put(`/api/projects/${project.id}`).send({ title: "Sneaky" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("This project is archived. Restore it first.");
    });

    it("refuses a comment", async () => {
        const res = await as(backer.token).post(`/api/projects/${project.id}/comments`).send({ body: "Hi" });

        expect(res.status).toBe(400);
    });

    it("refuses a project update", async () => {
        const res = await as(creator.token)
            .post(`/api/projects/${project.id}/updates`)
            .send({ title: "T", body: "B" });

        expect(res.status).toBe(400);
    });

    it("refuses a change to its support levels", async () => {
        const res = await as(creator.token)
            .put(`/api/projects/${project.id}/tiers/${tier.id}`)
            .send({ name: "New", min_amount: 200, bullets: ["x"] });

        expect(res.status).toBe(400);
    });

    it("refuses approve and reject", async () => {
        expect((await as(admin.token).patch(`/api/projects/${project.id}/approve`)).status).toBe(400);
        expect((await as(admin.token).patch(`/api/projects/${project.id}/reject`).send({ note: "n" })).status).toBe(400);
    });

    it("refuses an investment even once it is approved elsewhere", async () => {
        const approved = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(creator.token).patch(`/api/projects/${approved.id}/archive`).send({});

        const res = await as(backer.token).post(`/api/projects/${approved.id}/invest`).send({ amount: 50 });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("archived");
    });

    it("refuses a resubmit", async () => {
        const rejected = await makeProject({ creatorId: creator.id, status: "REJECTED" });

        await as(creator.token).patch(`/api/projects/${rejected.id}/archive`).send({});

        expect((await as(creator.token).patch(`/api/projects/${rejected.id}/resubmit`)).status).toBe(400);
    });
});
