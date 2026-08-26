/**
 * The validation layer, and specifically the line it draws.
 *
 * zod checks the SHAPE of a request. Everything that has to read the database first
 * stays in the service. The tests below are arranged around that line, because it is the
 * easiest thing to get wrong later: moving a business rule up to a schema looks tidier
 * and quietly makes it skippable, since a rule on a route only guards the callers that
 * come through that route.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, makeUser, makeProject, makeTier, as, uniqueEmail, PASSWORD } from "./helpers/factories.js";

let creator;
let backer;
let admin;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    backer = await makeUser({ roles: ["BACKER"], balance: 5000 });
    admin = await makeUser({ roles: ["ADMIN"] });
});

describe("what the schema catches", () => {
    // The capability the API simply did not have before: several fields at once, each
    // named, so a form can mark every wrong input instead of one per round trip.
    it("reports every wrong field in one answer", async () => {
        const res = await as(creator.token).post("/api/projects").send({ category: "ENGINEERING" });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe("VALIDATION_FAILED");
        expect(res.body.details.map((d) => d.field).sort()).toEqual([
            "description",
            "goal_amount",
            "title",
        ]);
        expect(res.body.details.every((d) => typeof d.message === "string" && d.message.length > 0)).toBe(true);
    });

    // The message is a sentence for a person, not zod's default
    // "Invalid input: expected string, received undefined".
    it("gives a readable sentence, not a type-checker's", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: "someone@test.invalid" });

        expect(res.status).toBe(422);
        expect(res.body.details).toEqual([{ field: "password", message: "A password is required." }]);
    });

    it("coerces a numeric string, so a hand-made request still works", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send({ title: "Coerced", description: "x", category: "ENGINEERING", goal_amount: "5000" });

        expect(res.status).toBe(201);
        expect(Number(res.body.project.goal_amount)).toBe(5000);
    });
});

describe("what the schema must NOT reject", () => {
    /**
     * These are the shapes the app itself sends. A schema that tightened any of them
     * would not be catching a bug, it would be one — and it would only show up when a
     * creator tried to submit.
     */
    it("accepts the whole create-wizard payload, empty optional prose included", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send({
                title: "Full wizard payload",
                description: "The short blurb.",
                category: "ENGINEERING",
                goal_amount: 5000,
                image_url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
                // Skipped by the creator. The service stores "" as NULL.
                challenge: "",
                solution: "",
                funding_usage: "",
                video_url: "",
                // Whatever keys the form collected, not a shape this layer gets to police.
                team_members: [{ name: "A", role: "Lead", rmitId: "s123" }],
                gallery: ["data:image/jpeg;base64,/9j/4AAQSkZJRg=="],
                solution_bullets: [{ title: "One", desc: "Two" }],
                tiers: [{ name: "Supporter", min_amount: 50, bullets: ["Signals support"] }],
            });

        expect(res.status).toBe(201);
    });

    // Three cases, not two: absent leaves the column, text stores it, EMPTY stores NULL.
    // An empty string therefore has to pass validation rather than be refused as blank.
    it("accepts an empty video_url on edit, which is how a video is cleared", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(creator.token).put(`/api/projects/${project.id}`).send({ video_url: "" });

        expect(res.status).toBe(200);
        expect(res.body.project.video_url).toBeNull();
    });

    it("accepts a partial edit, since an absent field means leave the column alone", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED", title: "Before" });

        const res = await as(creator.token).put(`/api/projects/${project.id}`).send({ title: "After" });

        expect(res.status).toBe(200);
        expect(res.body.project.title).toBe("After");
        expect(res.body.project.description).toBe("A description used by the backend test suite.");
    });

    // The email rule is presence, not format. The seeded accounts end in @test.com and
    // this suite uses .invalid; deciding which addresses may hold an account is not a
    // decision the validation layer gets to make.
    it("does not police the shape of an email address", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ fullName: "Odd Address", email: uniqueEmail("odd"), password: PASSWORD });

        expect(res.status).toBe(201);
    });
});

describe("the line between the schema and the service", () => {
    /**
     * Every rule below needs to read the database, so none of them can live in a schema
     * — and, more importantly, a rule in the service has no way around it while a rule
     * on a route only guards the callers that use that route. It is the same reasoning
     * that keeps resolveOwnership out of the route guard.
     */
    it("at most five support levels stays a 409 from the service", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        for (let i = 1; i <= 5; i += 1) {
            await makeTier({ projectId: project.id, minAmount: i * 10, name: `Level ${i}` });
        }

        const res = await as(creator.token)
            .post(`/api/projects/${project.id}/tiers`)
            .send({ name: "Sixth", min_amount: 999, bullets: ["x"] });

        expect(res.status).toBe(409);
    });

    it("an archived project stays frozen by the service, not by a schema", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(creator.token).patch(`/api/projects/${project.id}/archive`).send({});

        const res = await as(creator.token).put(`/api/projects/${project.id}`).send({ title: "Sneaky" });

        expect(res.status).toBe(409);
    });

    it("who may own a project stays with resolveOwnership", async () => {
        const res = await as(admin.token)
            .post("/api/projects")
            .send({ title: "On behalf", description: "x", category: "ENGINEERING", goal_amount: 100 });

        // 422 from the service, not the schema: whether creator_id is required depends on
        // the CALLER's role, which a schema cannot see.
        expect(res.status).toBe(422);
        expect(res.body.details).toEqual([
            { field: "creator_id", message: "Choose the creator this project belongs to." },
        ]);
    });

    it("an amount of zero is still the service's refusal, not the schema's", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        // 0 is a valid number, so the schema passes it through; the rule that an
        // investment must be positive is the service's.
        const res = await as(backer.token).post(`/api/projects/${project.id}/invest`).send({ amount: 0 });

        expect(res.status).toBe(422);
        expect(res.body.message).toBe("Investment amount must be greater than 0.");
    });
});

describe("one wording, two checks", () => {
    /**
     * The schema catches an empty comment first, and projectService still checks it too —
     * a service must not depend on a middleware having run. What must never differ is the
     * SENTENCE, so both read it from src/validation/messages.js.
     *
     * This is not hypothetical: the support-level rules were enforced on both sides and
     * the minimum-amount message had drifted, so a creator refused by the API read a
     * different sentence and had every reason to think they had hit a stricter rule.
     */
    it("the schema and the service say the same thing about an empty comment", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const viaSchema = await as(backer.token)
            .post(`/api/projects/${project.id}/comments`)
            .send({ body: "   " });

        const { COMMENT_EMPTY } = await import("../src/validation/messages.js");

        expect(viaSchema.status).toBe(422);
        expect(viaSchema.body.message).toBe(COMMENT_EMPTY);
    });
});
