/**
 * Project updates. Ownership, not role, is the gate: POST and DELETE compare the
 * project's creator_id to req.user.id inside the service (admins pass too), which is
 * why there is no authorize() on those routes. Reading is public.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, as } from "./helpers/factories.js";

let creator;
let otherCreator;
let admin;
let project;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    otherCreator = await makeUser({ roles: ["CREATOR"] });
    admin = await makeUser({ roles: ["ADMIN"] });
    project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
});

const body = { title: "Week one", body: "We built the first prototype." };

describe("GET /api/projects/:id/updates", () => {
    it("200 and a bare array, signed out", async () => {
        const res = await request(app).get(`/api/projects/${project.id}/updates`);

        expect(res.status).toBe(200);
        // Pinned: the envelope commit changes this shape.
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("404 for a project that does not exist", async () => {
        expect((await request(app).get("/api/projects/99999999/updates")).status).toBe(404);
    });
});

describe("POST /api/projects/:id/updates", () => {
    it("201 for the project's creator", async () => {
        const res = await as(creator.token).post(`/api/projects/${project.id}/updates`).send(body);

        expect(res.status).toBe(201);
        expect(res.body.update.title).toBe("Week one");
    });

    it("201 for an admin", async () => {
        const res = await as(admin.token).post(`/api/projects/${project.id}/updates`).send(body);

        expect(res.status).toBe(201);
    });

    it("403 for a creator who does not own the project", async () => {
        const res = await as(otherCreator.token).post(`/api/projects/${project.id}/updates`).send(body);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("FORBIDDEN");
        expect(res.body.message).toBe("Only the project's creator can post an update.");
    });

    it("401 signed out", async () => {
        expect((await request(app).post(`/api/projects/${project.id}/updates`).send(body)).status).toBe(401);
    });

    it("422 on a missing title or body, and on a title over 200 characters", async () => {
        const noTitle = await as(creator.token).post(`/api/projects/${project.id}/updates`).send({ body: "x" });
        const noBody = await as(creator.token).post(`/api/projects/${project.id}/updates`).send({ title: "x" });
        const longTitle = await as(creator.token)
            .post(`/api/projects/${project.id}/updates`)
            .send({ title: "t".repeat(201), body: "x" });

        expect(noTitle.status).toBe(422);
        expect(noBody.status).toBe(422);
        expect(longTitle.status).toBe(422);
    });

    // An update is a public announcement. A rejected project is not on Discover and has
    // no audience, and if it were later approved the post would surface carrying a
    // timestamp from a period during which nobody could see it.
    it("409 while the project is REJECTED", async () => {
        const rejected = await makeProject({ creatorId: creator.id, status: "REJECTED" });

        const res = await as(creator.token).post(`/api/projects/${rejected.id}/updates`).send(body);

        expect(res.status).toBe(409);
        expect(res.body.message).toContain("cannot post updates");
    });
});

describe("DELETE /api/projects/:id/updates/:updateId", () => {
    const postOne = async () => {
        const res = await as(creator.token).post(`/api/projects/${project.id}/updates`).send(body);
        return res.body.update.id;
    };

    it("200 for the creator and 200 for an admin", async () => {
        const mine = await postOne();
        const theirs = await postOne();

        expect((await as(creator.token).delete(`/api/projects/${project.id}/updates/${mine}`)).status).toBe(200);
        expect((await as(admin.token).delete(`/api/projects/${project.id}/updates/${theirs}`)).status).toBe(200);
    });

    it("403 for another creator, and 404 for an update that does not exist", async () => {
        const id = await postOne();

        expect((await as(otherCreator.token).delete(`/api/projects/${project.id}/updates/${id}`)).status).toBe(403);
        expect((await as(admin.token).delete(`/api/projects/${project.id}/updates/99999999`)).status).toBe(404);
    });

    // author_id is ON DELETE SET NULL, not CASCADE, on purpose: deleting a user must
    // not erase a project's history. The mapper then falls back to "Unknown creator".
    // Written with an ADMIN author so the deleted account is not also the project's
    // owner — creator_id IS a cascade, and it would take the whole project with it.
    it("keeps the update when its author's account is deleted", async () => {
        const guestAdmin = await makeUser({ roles: ["ADMIN"] });

        const created = await as(guestAdmin.token).post(`/api/projects/${project.id}/updates`).send(body);
        const updateId = created.body.update.id;

        await pool.query("delete from users where id = $1", [guestAdmin.id]);

        const { rows } = await pool.query("select author_id from project_updates where id = $1", [updateId]);

        expect(rows).toHaveLength(1);
        expect(rows[0].author_id).toBeNull();
    });
});
