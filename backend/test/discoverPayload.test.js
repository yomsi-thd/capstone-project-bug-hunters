/**
 * GET /projects is the busiest query in the app — every visit to Discover and every
 * keystroke in its search box runs it — and it is the one endpoint whose response can
 * grow without anybody choosing to make it grow.
 *
 * ⚠️ Images are stored INSIDE the project row as base64 data URIs (schema known issue:
 * they belong in Supabase Storage). Under SELECT * every Discover request therefore
 * carried every approved project's whole gallery. Harmless at today's handful of
 * pictureless demo rows; megabytes the moment somebody uploads real photos.
 *
 * It has already cost the team once: the uptime cron pinged this route, cron-job.org
 * aborts a response past its size cap, and the endpoint most likely to grow without
 * warning was the one holding the live demo awake.
 *
 * These tests are what stop a later SELECT * putting it back.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject } from "./helpers/factories.js";

// Exactly what src/api/mappers.js toCard reads. Adding a field to the Discover card
// means adding it to the query AND to this list — the friction is deliberate.
const CARD_COLUMNS = [
    "id",
    "creator_id",
    "title",
    "description",
    "category",
    "status",
    "image_url",
    "goal_amount",
    "current_amount",
    // Added 2026-09-06. The one column here that the card does not render directly: it
    // shows the semester's NAME, which the frontend resolves from GET /semesters rather
    // than making this query JOIN for a short string on every keystroke.
    "semester_id",
    "start_date",
    "end_date",
    "created_at",
];

let creator;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
});

describe("GET /api/projects carries only what a card needs", () => {
    it("returns exactly the card's columns and nothing else", async () => {
        await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await request(app).get("/api/projects");

        expect(res.status).toBe(200);
        expect(res.body.items.length).toBeGreaterThan(0);
        expect(Object.keys(res.body.items[0]).sort()).toEqual([...CARD_COLUMNS].sort());
    });

    // The one that matters. A photo project must not weigh the listing down.
    it("does not carry the gallery, even for a project full of base64 images", async () => {
        const heavy = await makeProject({ creatorId: creator.id, status: "APPROVED", title: "Photo heavy" });

        // ~120 KB of data URI, roughly one real downscaled photo.
        const image = "data:image/jpeg;base64," + "A".repeat(120_000);

        await pool.query(
            `UPDATE projects
                SET gallery = $2::jsonb,
                    image_url = $3,
                    challenge = $4,
                    solution = $4,
                    funding_usage = $4
              WHERE id = $1`,
            [heavy.id, JSON.stringify([image, image]), "", "x".repeat(5000)]
        );

        const res = await request(app).get("/api/projects");
        const row = res.body.items.find((p) => p.id === heavy.id);

        expect(row).toBeTruthy();
        expect(row.gallery).toBeUndefined();
        expect(row.challenge).toBeUndefined();
        expect(row.solution).toBeUndefined();
        expect(row.funding_usage).toBeUndefined();
        expect(row.team_members).toBeUndefined();
        expect(row.solution_bullets).toBeUndefined();

        // 240 KB of gallery on one project must not reach the listing at all.
        expect(JSON.stringify(res.body).length).toBeLessThan(100_000);
    });

    // The detail page is where the gallery belongs, and it must still be there.
    it("but GET /projects/:id still carries the full row", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await pool.query(`UPDATE projects SET gallery = $2::jsonb WHERE id = $1`, [
            project.id,
            JSON.stringify(["data:image/jpeg;base64,AAAA"]),
        ]);

        const res = await request(app).get(`/api/projects/${project.id}`);

        expect(res.status).toBe(200);
        expect(res.body.gallery).toEqual(["data:image/jpeg;base64,AAAA"]);
        expect(res.body.creator_name).toBeTruthy();
    });
});
