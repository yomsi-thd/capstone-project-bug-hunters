/**
 * assertVisibleTo — who may read an unapproved project, and everything hanging off it.
 *
 * This is the rule most at risk from the restructure, because §7 of the design moves
 * comments, updates and tiers into services of their own. Each of the four public reads
 * calls assertVisibleTo today; a copy that gets left behind during the split would hide
 * a project while leaving its discussion readable one URL over, which hides nothing.
 *
 * Two properties are load-bearing and both are pinned below:
 *
 *   404, never 403 — "this exists but is pending review" already tells a stranger the
 *   project exists, and ids are sequential integers.
 *
 *   The test is `status`, never `archived_at` — an archived project MUST stay readable,
 *   because a backer's investment card still links to it.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, makeUser, makeProject, makeTier, makeComment, as, pool } from "./helpers/factories.js";

const readsFor = (id) => [
    `/api/projects/${id}`,
    `/api/projects/${id}/comments`,
    `/api/projects/${id}/updates`,
    `/api/projects/${id}/tiers`,
];

let creator;
let stranger;
let admin;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    stranger = await makeUser({ roles: ["BACKER"] });
    admin = await makeUser({ roles: ["ADMIN"] });
});

describe.each(["PENDING", "REJECTED"])("a %s project", (status) => {
    let project;

    beforeAll(async () => {
        project = await makeProject({ creatorId: creator.id, status });

        await makeComment({ projectId: project.id, userId: creator.id });
        await makeTier({ projectId: project.id });
        await pool.query(
            `INSERT INTO project_updates (project_id, author_id, title, body) VALUES ($1, $2, $3, $4)`,
            [project.id, creator.id, "An update", "Body text."]
        );
    });

    it("404s all four public reads for a signed-out visitor", async () => {
        for (const url of readsFor(project.id)) {
            const res = await request(app).get(url);

            expect(res.status, url).toBe(404);
            // The same sentence a missing row produces. Anything more specific would
            // confirm the project exists.
            expect(res.body.message, url).toBe("Project not found");
        }
    });

    it("404s all four for a signed-in stranger", async () => {
        for (const url of readsFor(project.id)) {
            const res = await as(stranger.token).get(url);

            expect(res.status, url).toBe(404);
        }
    });

    it("200s all four for the creator who owns it", async () => {
        for (const url of readsFor(project.id)) {
            const res = await as(creator.token).get(url);

            expect(res.status, url).toBe(200);
        }
    });

    it("200s all four for an admin", async () => {
        for (const url of readsFor(project.id)) {
            const res = await as(admin.token).get(url);

            expect(res.status, url).toBe(200);
        }
    });
});

describe("an APPROVED project", () => {
    it("200s all four for a signed-out visitor", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        for (const url of readsFor(project.id)) {
            const res = await request(app).get(url);

            expect(res.status, url).toBe(200);
        }
    });
});

describe("an ARCHIVED project", () => {
    // The visibility rule added for unapproved projects must not accidentally hide
    // archived ones: a backer who already invested has a card linking straight here.
    it("stays readable to everyone while it is still APPROVED", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        for (const url of readsFor(project.id)) {
            const res = await request(app).get(url);

            expect(res.status, url).toBe(200);
        }

        const detail = await request(app).get(`/api/projects/${project.id}`);

        expect(detail.body.archived_at).not.toBeNull();
    });

    it("is still hidden from Discover", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        const res = await request(app).get("/api/projects");

        expect(res.body.map((p) => p.id)).not.toContain(project.id);
    });
});

describe("GET /api/admin/projects/:id", () => {
    // The admin read passes req.user through for the same reason: without it an admin
    // loses the ability to open a PENDING project, i.e. the whole review screen.
    it("200 for an admin on a PENDING project", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "PENDING" });

        const res = await as(admin.token).get(`/api/admin/projects/${project.id}`);

        expect(res.status).toBe(200);
    });
});
