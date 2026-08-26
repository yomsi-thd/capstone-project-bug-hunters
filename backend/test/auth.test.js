/**
 * Characterisation tests: what /api/auth and the two auth middlewares answer TODAY.
 *
 * These record the CURRENT status codes, including the ones the API-restructure design
 * calls wrong. When that design changes one, the change belongs in the same commit as
 * the line below it, so every status change is a deliberate diff and never an accident.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, makeUser, makeProject, as, uniqueEmail, PASSWORD } from "./helpers/factories.js";

describe("POST /api/auth/register", () => {
    it("201 with the created user", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ fullName: "New Person", email: uniqueEmail("register"), password: PASSWORD });

        expect(res.status).toBe(201);
        expect(res.body.id).toBeTruthy();
    });

    it("gives the new account a BACKER role and a wallet", async () => {
        const email = uniqueEmail("register-roles");

        await request(app).post("/api/auth/register").send({ fullName: "R", email, password: PASSWORD });

        const login = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });

        expect(login.body.user.roles).toEqual(["BACKER"]);

        const balance = await as(login.body.accessToken).get("/api/classcoins");

        expect(balance.status).toBe(200);
    });

    it("400 on a duplicate email", async () => {
        const email = uniqueEmail("dupe");

        await request(app).post("/api/auth/register").send({ fullName: "A", email, password: PASSWORD });

        const res = await request(app)
            .post("/api/auth/register")
            .send({ fullName: "B", email, password: PASSWORD });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Email already exists");
    });

    // Nothing validates the body before it reaches the database today, so a missing
    // password fails on a NOT NULL constraint and surfaces as a raw Postgres message.
    // The design replaces this with 422 plus a `details` array naming the field.
    it("400 with a database-level message when the body is incomplete", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: uniqueEmail("incomplete") });

        expect(res.status).toBe(400);
        expect(res.body.message).toBeTruthy();
    });
});

describe("POST /api/auth/login", () => {
    it("200 with both tokens", async () => {
        const email = uniqueEmail("login-ok");

        await request(app).post("/api/auth/register").send({ fullName: "L", email, password: PASSWORD });

        const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
        expect(res.body.refreshToken).toBeTruthy();
        expect(res.body.user.roles).toEqual(["BACKER"]);
    });

    /**
     * A REAL BUG, recorded rather than fixed here.
     *
     * generateRefreshToken signs { id, roles } only, so `iat` is the sole thing that
     * changes between two sign-ins by the same account — and it has one-second
     * resolution. Two logins inside the same second therefore produce a byte-identical
     * JWT, which collides with the UNIQUE index on refresh_tokens.token.
     *
     * What the user sees is a 401 whose message is a raw Postgres constraint name, on a
     * password that is correct. Reachable by double-clicking SIGN IN, or by two devices
     * signing in together.
     *
     * It is left alone because the API restructure is explicitly not a behaviour change;
     * this test is what stops the restructure hiding it, and what will fail loudly on
     * the day it is fixed properly (a jti in the payload, or an upsert on the token).
     */
    it("401 with a raw database message when the same account signs in twice in one second", async () => {
        const email = uniqueEmail("login-twice");

        await request(app).post("/api/auth/register").send({ fullName: "T", email, password: PASSWORD });

        // Six sign-ins back to back take well under two seconds, so at least two of them
        // must share a second and collide. Asserting on a single pair instead would make
        // this test depend on which side of a second boundary it happened to start.
        const attempts = [];

        for (let i = 0; i < 6; i += 1) {
            attempts.push(await request(app).post("/api/auth/login").send({ email, password: PASSWORD }));
        }

        const rejected = attempts.filter((res) => res.status === 401);

        expect(attempts.some((res) => res.status === 200)).toBe(true);
        expect(rejected.length).toBeGreaterThan(0);
        expect(rejected[0].body.message).toContain("refresh_tokens_token_key");
    });

    it("401 on a wrong password", async () => {
        const user = await makeUser();

        const res = await request(app).post("/api/auth/login").send({ email: user.email, password: "wrong" });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid email or password");
    });

    it("401 on an unknown email", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "nobody@test.invalid", password: PASSWORD });

        expect(res.status).toBe(401);
    });

    // Case-sensitive sign-in is a DECISION (Huy, 2026-08-06), not an oversight. Pinned
    // here so a future "cleanup" to LOWER(email) has to argue with a red test first.
    it("401 for the right password on a differently-cased email", async () => {
        const user = await makeUser();

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: user.email.toUpperCase(), password: PASSWORD });

        expect(res.status).toBe(401);
    });

    // login() has no is_active check of its own: a deactivated account still signs in
    // and still gets a token. The refusal happens one layer later, in authenticate().
    it("issues a token to a deactivated account, and the middleware is what refuses it", async () => {
        const user = await makeUser({ active: false });

        expect(user.token).toBeTruthy();

        const res = await as(user.token).get("/api/users/profile");

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Your account has been deactivated.");
    });
});

describe("POST /api/auth/refresh", () => {
    it("200 with a fresh access token", async () => {
        const user = await makeUser();

        const res = await request(app).post("/api/auth/refresh").send({ refreshToken: user.refreshToken });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
    });

    it("401 when the token is missing", async () => {
        const res = await request(app).post("/api/auth/refresh").send({});

        expect(res.status).toBe(401);
    });

    it("401 when the token is not one we issued", async () => {
        const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "not-a-token" });

        expect(res.status).toBe(401);
    });

    it("401 after logout", async () => {
        const user = await makeUser();

        await request(app).post("/api/auth/logout").send({ refreshToken: user.refreshToken });

        const res = await request(app).post("/api/auth/refresh").send({ refreshToken: user.refreshToken });

        expect(res.status).toBe(401);
    });
});

describe("POST /api/auth/logout", () => {
    it("200", async () => {
        const user = await makeUser();

        const res = await request(app).post("/api/auth/logout").send({ refreshToken: user.refreshToken });

        expect(res.status).toBe(200);
    });

    it("400 when no token is sent", async () => {
        const res = await request(app).post("/api/auth/logout").send({});

        expect(res.status).toBe(400);
    });
});

describe("authenticate middleware", () => {
    it("401 without an Authorization header", async () => {
        const res = await request(app).get("/api/users/profile");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Access token required");
    });

    it("401 on a malformed token", async () => {
        const res = await as("rubbish").get("/api/users/profile");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid or expired token");
    });
});

describe("authorize middleware", () => {
    let backer;
    let project;

    beforeAll(async () => {
        backer = await makeUser({ roles: ["BACKER"] });
        const creator = await makeUser({ roles: ["CREATOR"] });
        project = await makeProject({ creatorId: creator.id });
    });

    it("403 when the caller holds none of the required roles", async () => {
        const res = await as(backer.token).patch(`/api/projects/${project.id}/approve`);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden");
    });

    // authOptional lets a signed-out visitor through, but a BROKEN token still 401s so
    // the frontend axios interceptor gets its chance to refresh. Quietly downgrading an
    // expired token to "anonymous" would 404 a creator on their own pending project.
    it("authOptional: no header is fine, a broken header is still 401", async () => {
        const anonymous = await request(app).get(`/api/projects/${project.id}`);
        const broken = await as("expired.token.value").get(`/api/projects/${project.id}`);

        expect(anonymous.status).toBe(200);
        expect(broken.status).toBe(401);
    });
});
