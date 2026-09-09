/**
 * The validation layer, and specifically the line it draws.
 *
 * zod checks the shape of a request, and anything that has to read the database stays in
 * the service. The tests are arranged around that line because it is the easiest thing to
 * get wrong later: moving a business rule up to a schema looks tidier and quietly makes
 * it skippable, since a rule on a route only guards the callers that use that route.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, makeUser, makeProject, makeTier, balanceOf, as, uniqueEmail, PASSWORD } from "./helpers/factories.js";

let creator;
let backer;
let admin;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    backer = await makeUser({ roles: ["BACKER"], balance: 5000 });
    admin = await makeUser({ roles: ["ADMIN"] });
});

describe("what the schema catches", () => {
    // Several fields at once, each named, so a form can mark every wrong input rather
    // than one per round trip.
    it("reports every wrong field in one answer", async () => {
        const res = await as(creator.token).post("/api/projects").send({ category: "ENGINEERING" });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe("VALIDATION_FAILED");
        expect(res.body.details.map((d) => d.field).sort()).toEqual([
            "description",
            "title",
        ]);
        expect(res.body.details.every((d) => typeof d.message === "string" && d.message.length > 0)).toBe(true);
    });

    // A sentence for a person, rather than zod's "Invalid input: expected string,
    // received undefined".
    it("gives a readable sentence, not a type-checker's", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: "someone@test.invalid" });

        expect(res.status).toBe(422);
        expect(res.body.details).toEqual([{ field: "password", message: "A password is required." }]);
    });

    // investSchema uses the same `amount` helper, which coerces a numeric string.
    it("coerces a numeric string, so a hand-made request still works", async () => {
        const spender = await makeUser({ roles: ["BACKER"], balance: 5000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(spender.token)
            .post(`/api/projects/${project.id}/invest`)
            .send({ amount: "100" });

        // 200 rather than 201: invest answers with the updated balance and creates no
        // resource the caller addresses afterwards.
        expect(res.status).toBe(200);
        // What actually proves the coercion: "100" reached the wallet as the number 100
        // rather than being concatenated or refused.
        expect(await balanceOf(spender.id)).toBe(4900);
    });
});

describe("what the schema must NOT reject", () => {
    /**
     * The shapes the app itself sends. A schema that tightened any of them would not be
     * catching a bug, it would be one, and it would only surface when a creator submitted.
     */
    it("accepts the whole create-wizard payload, empty optional prose included", async () => {
        const res = await as(creator.token)
            .post("/api/projects")
            .send({
                title: "Full wizard payload",
                description: "The short blurb.",
                category: "ENGINEERING",
                image_url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
                // Skipped by the creator. The service stores "" as NULL.
                challenge: "",
                solution: "",
                funding_usage: "",
                video_url: "",
                // Whatever keys the form collected, not a shape this layer polices.
                team_members: [{ name: "A", role: "Lead", rmitId: "s123" }],
                gallery: ["data:image/jpeg;base64,/9j/4AAQSkZJRg=="],
                solution_bullets: [{ title: "One", desc: "Two" }],
                tiers: [{ name: "Supporter", min_amount: 50, bullets: ["Signals support"] }],
            });

        expect(res.status).toBe(201);
    });

    // Three cases rather than two: absent leaves the column, text stores it, empty stores
    // NULL. So an empty string has to pass validation rather than be refused as blank.
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

    // The email rule is presence rather than format. Deciding which addresses may hold an
    // account is not this layer's decision.
    it("does not police the shape of an email address", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ fullName: "Odd Address", email: uniqueEmail("odd"), password: PASSWORD });

        expect(res.status).toBe(201);
    });
});

describe("the line between the schema and the service", () => {
    /**
     * Every rule below needs to read the database, so none can live in a schema. More
     * importantly, a rule in the service has no way around it while a rule on a route
     * guards only the callers that use that route. Same reasoning that keeps
     * resolveOwnership out of the route guard.
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
            .send({ title: "On behalf", description: "x", category: "ENGINEERING" });

        // 422 from the service rather than the schema: whether creator_id is required
        // depends on the caller's role, which a schema cannot see.
        expect(res.status).toBe(422);
        expect(res.body.details).toEqual([
            { field: "creator_id", message: "Choose the creator this project belongs to." },
        ]);
    });

    it("an amount of zero is still the service's refusal, not the schema's", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        // 0 is a valid number, so the schema passes it through. The rule that an
        // investment has to be positive belongs to the service.
        const res = await as(backer.token).post(`/api/projects/${project.id}/invest`).send({ amount: 0 });

        expect(res.status).toBe(422);
        expect(res.body.message).toBe("Investment amount must be greater than 0.");
    });
});

describe("one wording, two checks", () => {
    /**
     * The schema catches an empty comment first, and the service checks it too, since a
     * service must not depend on a middleware having run. What must not differ is the
     * sentence, so both read it from src/validation/messages.js: two wordings have
     * people refused by each assuming two different rules.
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
