/**
 * The list envelope, and the one property that keeps it from breaking the product.
 *
 * `{ items, total, limit, offset }` on all eleven list endpoints. Only two of them
 * ACCEPT ?limit=&offset=, and neither applies a default — which is the part worth
 * testing, not the shape.
 *
 * ⚠️ Discover deliberately loads the whole catalogue and searches, filters and sorts it
 * client-side. A default page size would quietly reduce its search box to the first page
 * and report nothing wrong at all. The test at the bottom is what stops somebody adding
 * "a sensible default of 20" a month from now.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, makeUser, makeProject, makeTier, makeComment, as } from "./helpers/factories.js";

let creator;
let backer;
let admin;
let project;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    backer = await makeUser({ roles: ["BACKER"], balance: 5000 });
    admin = await makeUser({ roles: ["ADMIN"] });
    project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

    await makeComment({ projectId: project.id, userId: backer.id });
    await makeTier({ projectId: project.id, minAmount: 100 });
    await as(creator.token).post(`/api/projects/${project.id}/updates`).send({ title: "T", body: "B" });
    await as(backer.token).post(`/api/projects/${project.id}/invest`).send({ amount: 100 });
});

describe("all eleven list endpoints answer with the same envelope", () => {
    const shape = (body) => {
        expect(Array.isArray(body.items)).toBe(true);
        expect(typeof body.total).toBe("number");
        expect(body.total).toBe(body.items.length);
        expect("limit" in body).toBe(true);
        expect("offset" in body).toBe(true);
    };

    it("the public reads", async () => {
        for (const url of [
            "/api/projects",
            `/api/projects/${project.id}/comments`,
            `/api/projects/${project.id}/updates`,
            `/api/projects/${project.id}/tiers`,
        ]) {
            const res = await request(app).get(url);

            expect(res.status, url).toBe(200);
            shape(res.body);
        }
    });

    it("the creator's own lists", async () => {
        for (const url of ["/api/projects/my", "/api/projects/my/backers"]) {
            const res = await as(creator.token).get(url);

            expect(res.status, url).toBe(200);
            shape(res.body);
        }
    });

    it("the wallet lists", async () => {
        for (const url of ["/api/classcoins/transactions", "/api/classcoins/investments"]) {
            const res = await as(backer.token).get(url);

            expect(res.status, url).toBe(200);
            shape(res.body);
        }
    });

    it("the admin lists", async () => {
        for (const url of ["/api/admin/users", "/api/admin/projects", "/api/admin/creator-requests"]) {
            const res = await as(admin.token).get(url);

            expect(res.status, url).toBe(200);
            shape(res.body);
        }
    });

    // Single-object endpoints are untouched. Wrapping them would have been a change with
    // no purpose, and it would have broken every page that reads a project.
    it("but a single object is still a single object", async () => {
        const detail = await request(app).get(`/api/projects/${project.id}`);
        const balance = await as(backer.token).get("/api/classcoins");
        const profile = await as(backer.token).get("/api/users/profile");

        expect(detail.body.id).toBe(project.id);
        expect(detail.body.items).toBeUndefined();
        expect(balance.body.items).toBeUndefined();
        expect(profile.body.items).toBeUndefined();
    });
});

describe("pagination is opt-in", () => {
    /**
     * THE test of this commit. Discover sends no limit and must therefore receive
     * everything — a default of 20 would silently cap its search to the first twenty
     * projects with no error anywhere.
     */
    it("returns the WHOLE catalogue when no limit is sent", async () => {
        for (let i = 0; i < 25; i += 1) {
            await makeProject({ creatorId: creator.id, status: "APPROVED", title: `Bulk ${i}` });
        }

        const res = await request(app).get("/api/projects");

        expect(res.body.items.length).toBeGreaterThan(20);
        expect(res.body.total).toBe(res.body.items.length);
        expect(res.body.limit).toBeNull();
    });

    it("pages only when asked, and total then counts the whole set", async () => {
        const res = await request(app).get("/api/projects?limit=5");

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(5);
        expect(res.body.limit).toBe(5);
        expect(res.body.offset).toBe(0);
        // The real count, not the page's length - that is what a COUNT(*) is for.
        expect(res.body.total).toBeGreaterThan(5);
    });

    it("offset moves the window without changing the total", async () => {
        const first = await request(app).get("/api/projects?limit=3&offset=0");
        const second = await request(app).get("/api/projects?limit=3&offset=3");

        expect(second.body.offset).toBe(3);
        expect(second.body.total).toBe(first.body.total);

        const firstIds = first.body.items.map((p) => p.id);
        const secondIds = second.body.items.map((p) => p.id);

        expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
    });

    it("offset is ignored when no limit is sent, rather than silently dropping rows", async () => {
        const res = await request(app).get("/api/projects?offset=10");

        expect(res.body.offset).toBe(0);
        expect(res.body.total).toBe(res.body.items.length);
    });

    it("the admin user list pages the same way", async () => {
        const res = await as(admin.token).get("/api/admin/users?limit=2");

        expect(res.body.items).toHaveLength(2);
        expect(res.body.limit).toBe(2);
        expect(res.body.total).toBeGreaterThan(2);
    });

    // limit and offset are validated like any other input, and answer 422 with the
    // field named - not a silent clamp, which would hide a caller's mistake.
    it("422 for a limit that is out of range, zero, or not a number", async () => {
        for (const query of ["limit=0", "limit=101", "limit=abc", "offset=-1"]) {
            const res = await request(app).get(`/api/projects?${query}`);

            expect(res.status, query).toBe(422);
            expect(res.body.code, query).toBe("VALIDATION_FAILED");
            expect(res.body.details.length, query).toBeGreaterThan(0);
        }
    });

    // The other nine ignore the two parameters rather than refusing them: comments,
    // updates and levels of one project are small sets with a natural ceiling, and
    // CommentList already pages on the client.
    it("the other endpoints ignore limit instead of failing on it", async () => {
        const res = await request(app).get(`/api/projects/${project.id}/comments?limit=1`);

        expect(res.status).toBe(200);
        expect(res.body.limit).toBeNull();
    });
});
