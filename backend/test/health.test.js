/**
 * The two infrastructure probes, declared straight in app.js rather than behind a
 * router because there is nothing to model and every extra layer is one more thing that
 * can break and make the probe lie.
 *
 * GET /api/health is what the uptime cron calls. Its body must stay TINY and fixed:
 * the job previously pointed at GET /api/projects, which runs SELECT * and therefore
 * carries every approved project's base64 gallery — the endpoint most likely to grow
 * without warning was the one holding the live demo awake.
 */

import { describe, it, expect } from "vitest";
import request from "supertest";

import { app } from "./helpers/factories.js";

describe("GET /", () => {
    it("200 and needs no auth", async () => {
        const res = await request(app).get("/");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "Backend is running" });
    });
});

describe("GET /api/health", () => {
    it("200 with both halves reported, and no auth required", async () => {
        const res = await request(app).get("/api/health");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "ok", db: "up" });
    });

    // SELECT 1 is the point, not decoration: `/` proves only that Node answers, which
    // wakes Render but leaves a free Supabase project paused. One round trip keeps both
    // awake, and a dead database has to answer 503 rather than a reassuring 200.
    it("stays a fixed 25 bytes, so it cannot grow with the data", async () => {
        const res = await request(app).get("/api/health");

        expect(JSON.stringify(res.body)).toHaveLength(25);
    });
});

describe("an unknown route", () => {
    it("404", async () => {
        const res = await request(app).get("/api/does-not-exist");

        expect(res.status).toBe(404);
    });
});
