/**
 * What /api/auth and the two auth middlewares answer, pinned status code by status code.
 *
 * Changing one of these is meant to be a visible diff rather than a side effect, since a
 * wrong status here logs people out mid-session.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

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

    // 409: the request is well-formed and understood, it just collides with a row that
    // already exists.
    it("409 on a duplicate email", async () => {
        const email = uniqueEmail("dupe");

        await request(app).post("/api/auth/register").send({ fullName: "A", email, password: PASSWORD });

        const res = await request(app)
            .post("/api/auth/register")
            .send({ fullName: "B", email, password: PASSWORD });

        expect(res.status).toBe(409);
        expect(res.body.code).toBe("CONFLICT");
        expect(res.body.message).toBe("Email already exists");
    });

    /**
     * What the validation layer is for: 422 naming every field that is wrong at once.
     * Checking one field at a time means a form can never mark more than one input, and
     * letting the body reach a NOT NULL constraint echoes Postgres at the caller.
     */
    it("422 naming every missing field at once when the body is incomplete", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: uniqueEmail("incomplete") });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe("VALIDATION_FAILED");
        expect(res.body.details).toEqual([
            { field: "fullName", message: "A full name is required." },
            { field: "password", message: "A password is required." },
        ]);
        expect(res.body.message).toBe("2 fields need attention.");
        // The database's own words must never reach the client.
        expect(JSON.stringify(res.body)).not.toContain("not-null");
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
     * Two sign-ins inside the same second have to produce different refresh tokens.
     *
     * Signing { id, roles } alone leaves `iat`, with its one-second resolution, as the
     * only thing separating them, so two logins in the same second produce a
     * byte-identical JWT that collides with the unique index on refresh_tokens.token and
     * fails a correct password. Double-clicking SIGN IN is enough to reach it.
     *
     * The `jti` claim is what prevents it, and this test is what catches a tidy-up that
     * drops it and brings the collision back.
     */
    it("lets the same account sign in six times inside one second", async () => {
        const email = uniqueEmail("login-twice");

        await request(app).post("/api/auth/register").send({ fullName: "T", email, password: PASSWORD });

        // Six back to back take well under two seconds, so several share one.
        const attempts = [];

        for (let i = 0; i < 6; i += 1) {
            attempts.push(await request(app).post("/api/auth/login").send({ email, password: PASSWORD }));
        }

        expect(attempts.map((res) => res.status)).toEqual([200, 200, 200, 200, 200, 200]);

        // Every sign-in is a separate session. Identical strings would mean the second
        // login overwrote the first device's token rather than colliding.
        const tokens = attempts.map((res) => res.body.refreshToken);

        expect(new Set(tokens).size).toBe(6);
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

    // Case-sensitive sign-in is a decision rather than an oversight, pinned here so a
    // cleanup to LOWER(email) has to argue with a red test first.
    it("401 for the right password on a differently-cased email", async () => {
        const user = await makeUser();

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: user.email.toUpperCase(), password: PASSWORD });

        expect(res.status).toBe(401);
    });

    // login() has no is_active check of its own, so a deactivated account still signs in
    // and gets a token. The refusal happens one layer later, in authenticate().
    it("issues a token to a deactivated account, and the middleware is what refuses it", async () => {
        const user = await makeUser({ active: false });

        expect(user.token).toBeTruthy();

        const res = await as(user.token).get("/api/users/profile");

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("FORBIDDEN");
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

    // 422 rather than 401: nothing was presented to authenticate. Safe for the
    // interceptor, which only refreshes on a 401 from a non-auth path and treats a failed
    // refresh as the end of the session.
    it("422 with the field named when the token is missing", async () => {
        const res = await request(app).post("/api/auth/refresh").send({});

        expect(res.status).toBe(422);
        expect(res.body.code).toBe("VALIDATION_FAILED");
        expect(res.body.details).toEqual([
            { field: "refreshToken", message: "Send the refresh token in the body." },
        ]);
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

    it("422 when no token is sent", async () => {
        const res = await request(app).post("/api/auth/logout").send({});

        expect(res.status).toBe(422);
        expect(res.body.code).toBe("VALIDATION_FAILED");
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
        expect(res.body.code).toBe("UNAUTHENTICATED");
        expect(res.body.message).toBe("Invalid or expired token");
    });

    /**
     * The most expensive status in the API to get wrong.
     *
     * The frontend refreshes the access token when it sees a 401 and only then, and
     * access tokens last 15 minutes, so this path runs constantly. If an expired token
     * started answering 403 or 422, nothing would refresh and every user would land back
     * on the sign-in screen a quarter of an hour in.
     */
    it("401 on a genuinely EXPIRED token, so the interceptor still refreshes", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const expired = jwt.sign(
            { id: user.id, email: user.email, roles: ["BACKER"] },
            process.env.JWT_SECRET,
            { expiresIn: "-1s" }
        );

        const res = await as(expired).get("/api/users/profile");

        expect(res.status).toBe(401);
        expect(res.body.code).toBe("UNAUTHENTICATED");
    });

    // A deactivated account must not be 401. The refresh endpoint does not check
    // is_active, so a 401 here would have the interceptor refresh, retry, be refused
    // again, and loop.
    it("403 for a deactivated account, never 401", async () => {
        const user = await makeUser({ roles: ["BACKER"], active: false });

        const res = await as(user.token).get("/api/users/profile");

        expect(res.status).toBe(403);
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
        expect(res.body.code).toBe("FORBIDDEN");
        expect(res.body.message).toBe("Forbidden");
    });

    // authOptional lets a signed-out visitor through, but a broken token still 401s so
    // the interceptor gets its chance to refresh. Downgrading an expired token to
    // anonymous would 404 a creator on their own pending project.
    it("authOptional: no header is fine, a broken header is still 401", async () => {
        const anonymous = await request(app).get(`/api/projects/${project.id}`);
        const broken = await as("expired.token.value").get(`/api/projects/${project.id}`);

        expect(anonymous.status).toBe(200);
        expect(broken.status).toBe(401);
    });
});
