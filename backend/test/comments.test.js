/**
 * Comments: posting, one-level threading, and who may delete.
 *
 * The delete rule is the one worth guarding. It is the comment's own AUTHOR, or an
 * ADMIN — and deliberately NOT the project's creator. The platform exists so backers
 * can signal what they think of an idea; a creator who could delete criticism would
 * make the discussion worthless as a signal, so abuse escalates to an admin instead.
 * A refactor that "tidies" this into the same ownership check the rest of the project
 * uses would quietly reverse the product decision.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, makeComment, as } from "./helpers/factories.js";

let creator;
let backer;
let otherBacker;
let admin;
let project;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    backer = await makeUser({ roles: ["BACKER"] });
    otherBacker = await makeUser({ roles: ["BACKER"] });
    admin = await makeUser({ roles: ["ADMIN"] });
    project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
});

describe("GET /api/projects/:id/comments", () => {
    it("200 and a bare array, readable signed out", async () => {
        const res = await request(app).get(`/api/projects/${project.id}/comments`);

        expect(res.status).toBe(200);
        // Pinned: the envelope commit changes this shape and must change this line too.
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("404 for a project that does not exist", async () => {
        const res = await request(app).get("/api/projects/99999999/comments");

        expect(res.status).toBe(404);
    });
});

describe("POST /api/projects/:id/comments", () => {
    it("201 for any signed-in user", async () => {
        const res = await as(backer.token).post(`/api/projects/${project.id}/comments`).send({ body: "Good idea." });

        expect(res.status).toBe(201);
        expect(res.body.comment.body).toBe("Good idea.");
    });

    it("401 signed out", async () => {
        const res = await request(app).post(`/api/projects/${project.id}/comments`).send({ body: "Hi" });

        expect(res.status).toBe(401);
    });

    it("422 on an empty body and on one over 2000 characters", async () => {
        const empty = await as(backer.token).post(`/api/projects/${project.id}/comments`).send({ body: "   " });
        const huge = await as(backer.token)
            .post(`/api/projects/${project.id}/comments`)
            .send({ body: "x".repeat(2001) });

        expect(empty.status).toBe(422);
        expect(empty.body.code).toBe("VALIDATION_FAILED");
        expect(empty.body.message).toBe("A comment cannot be empty.");
        expect(huge.status).toBe(422);
    });

    it("404 for a project that does not exist", async () => {
        const res = await as(backer.token).post("/api/projects/99999999/comments").send({ body: "Hi" });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Project not found");
    });

    // The UI draws exactly one level of nesting, so a reply to a reply is re-parented
    // onto the top-level comment rather than creating depth nobody can see.
    it("re-parents a reply-to-a-reply onto the top-level comment", async () => {
        const top = await makeComment({ projectId: project.id, userId: backer.id, body: "Top" });

        const reply = await as(otherBacker.token)
            .post(`/api/projects/${project.id}/comments`)
            .send({ body: "Reply", parent_id: top.id });

        const nested = await as(backer.token)
            .post(`/api/projects/${project.id}/comments`)
            .send({ body: "Reply to the reply", parent_id: reply.body.comment.id });

        expect(nested.status).toBe(201);
        expect(nested.body.comment.parent_id).toBe(top.id);
    });

    it("422 when the parent belongs to another project", async () => {
        const elsewhere = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const foreign = await makeComment({ projectId: elsewhere.id, userId: backer.id });

        const res = await as(backer.token)
            .post(`/api/projects/${project.id}/comments`)
            .send({ body: "Hi", parent_id: foreign.id });

        expect(res.status).toBe(422);
        expect(res.body.message).toContain("does not belong to this project");
    });
});

describe("DELETE /api/projects/:id/comments/:commentId", () => {
    it("200 for the comment's own author", async () => {
        const comment = await makeComment({ projectId: project.id, userId: backer.id });

        const res = await as(backer.token).delete(`/api/projects/${project.id}/comments/${comment.id}`);

        expect(res.status).toBe(200);
    });

    it("200 for an admin", async () => {
        const comment = await makeComment({ projectId: project.id, userId: backer.id });

        const res = await as(admin.token).delete(`/api/projects/${project.id}/comments/${comment.id}`);

        expect(res.status).toBe(200);
    });

    // The product decision, not an oversight.
    it("403 for the CREATOR of the project the comment sits on", async () => {
        const comment = await makeComment({ projectId: project.id, userId: backer.id });

        const res = await as(creator.token).delete(`/api/projects/${project.id}/comments/${comment.id}`);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("FORBIDDEN");
        expect(res.body.message).toBe("You can only delete your own comment.");
    });

    it("403 for an unrelated user", async () => {
        const comment = await makeComment({ projectId: project.id, userId: backer.id });

        const res = await as(otherBacker.token).delete(`/api/projects/${project.id}/comments/${comment.id}`);

        expect(res.status).toBe(403);
    });

    it("404 for a comment that does not exist", async () => {
        const res = await as(admin.token).delete(`/api/projects/${project.id}/comments/99999999`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Comment not found");
    });

    // comments.parent_id is ON DELETE CASCADE: deleting a top-level comment destroys
    // its replies too, INCLUDING replies by other people. The team chose the hard
    // delete over a soft one; the confirmation dialog naming the count is the only
    // warning anyone gets, so the cascade itself has to stay measured.
    it("takes other people's replies with it", async () => {
        const top = await makeComment({ projectId: project.id, userId: backer.id, body: "Top" });
        const reply = await makeComment({ projectId: project.id, userId: otherBacker.id, parentId: top.id });

        await as(backer.token).delete(`/api/projects/${project.id}/comments/${top.id}`);

        const { rows } = await pool.query("select id from comments where id = $1", [reply.id]);

        expect(rows).toHaveLength(0);
    });

    // Deleting is NOT gated on the archive lock that closes the thread to new posts:
    // abusive text does not become acceptable because a project was archived.
    it("still works while the project is archived, even though posting does not", async () => {
        const archived = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const comment = await makeComment({ projectId: archived.id, userId: backer.id });

        await as(creator.token).patch(`/api/projects/${archived.id}/archive`).send({});

        const posting = await as(backer.token).post(`/api/projects/${archived.id}/comments`).send({ body: "Hi" });
        const deleting = await as(backer.token).delete(`/api/projects/${archived.id}/comments/${comment.id}`);

        expect(posting.status).toBe(409);
        expect(deleting.status).toBe(200);
    });
});
