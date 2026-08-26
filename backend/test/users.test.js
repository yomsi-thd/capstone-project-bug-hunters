/**
 * The account routes and the Class Coin wallet.
 *
 * Two things here are worth more than the status codes. `POST /classcoins/add|deduct`
 * are ADMIN-only and take the target wallet in the BODY: until 2026-08-21 they had no
 * role guard and read the wallet from the token, so any signed-in user could mint Class
 * Coins into their own balance — and Class Coins are the only measure of a project's
 * popularity, so that made the whole ranking meaningless.
 *
 * DELETE /users/profile exists and works, and the frontend deliberately never calls it:
 * projects.creator_id is ON DELETE CASCADE, so it erases the user's projects, comments
 * and history in one click. The cascade is measured below rather than described.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, balanceOf, as, PASSWORD } from "./helpers/factories.js";

let backer;
let creator;
let admin;

beforeAll(async () => {
    backer = await makeUser({ roles: ["BACKER"], balance: 2000, title: "Student" });
    creator = await makeUser({ roles: ["CREATOR"] });
    admin = await makeUser({ roles: ["ADMIN"] });
});

describe("GET /api/users/profile", () => {
    it("200 with the caller's own record, 401 signed out", async () => {
        const res = await as(backer.token).get("/api/users/profile");

        expect(res.status).toBe(200);
        expect(res.body.email).toBe(backer.email);
        expect((await request(app).get("/api/users/profile")).status).toBe(401);
    });
});

describe("PUT /api/users/profile", () => {
    it("200 and updates the name", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const res = await as(user.token)
            .put("/api/users/profile")
            .send({ fullName: "Renamed Person", email: user.email });

        expect(res.status).toBe(200);
        expect(res.body.full_name).toBe("Renamed Person");
    });

    // `title` absent means "keep what is stored", not "clear it".
    it("keeps the stored title when the field is omitted", async () => {
        const user = await makeUser({ roles: ["BACKER"], title: "PhD Candidate" });

        const res = await as(user.token).put("/api/users/profile").send({ fullName: "N", email: user.email });

        expect(res.body.title).toBe("PhD Candidate");
    });

    it("400 when the email already belongs to somebody else", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const res = await as(user.token).put("/api/users/profile").send({ fullName: "N", email: backer.email });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Email already exists");
    });

    it("200 when the email is unchanged, so saving your own record is not a clash", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const res = await as(user.token).put("/api/users/profile").send({ fullName: "N", email: user.email });

        expect(res.status).toBe(200);
    });
});

describe("PUT /api/users/change-password", () => {
    it("200, and the new password is the one that signs in", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const res = await as(user.token)
            .put("/api/users/change-password")
            .send({ oldPassword: PASSWORD, newPassword: "Brand5678" });

        expect(res.status).toBe(200);

        const withOld = await request(app).post("/api/auth/login").send({ email: user.email, password: PASSWORD });
        const withNew = await request(app).post("/api/auth/login").send({ email: user.email, password: "Brand5678" });

        expect(withOld.status).toBe(401);
        expect(withNew.status).toBe(200);
    });

    it("400 when the old password is wrong", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const res = await as(user.token)
            .put("/api/users/change-password")
            .send({ oldPassword: "nope", newPassword: "Brand5678" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Old password is incorrect");
    });
});

describe("DELETE /api/users/profile", () => {
    // Measured, not assumed: this is why the Account page has no delete button.
    it("200, and cascades the user's projects away with them", async () => {
        const doomed = await makeUser({ roles: ["CREATOR"] });
        const project = await makeProject({ creatorId: doomed.id, status: "APPROVED" });

        const res = await as(doomed.token).delete("/api/users/profile");

        expect(res.status).toBe(200);

        const { rows } = await pool.query("select id from projects where id = $1", [project.id]);

        expect(rows).toHaveLength(0);
    });
});

describe("GET /api/classcoins", () => {
    it("200 with the wallet, 401 signed out", async () => {
        const res = await as(backer.token).get("/api/classcoins");

        expect(res.status).toBe(200);
        expect(Number(res.body.balance)).toBe(2000);
        expect((await request(app).get("/api/classcoins")).status).toBe(401);
    });
});

describe("GET /api/classcoins/transactions and /investments", () => {
    it("200 and bare arrays", async () => {
        const transactions = await as(backer.token).get("/api/classcoins/transactions");
        const investments = await as(backer.token).get("/api/classcoins/investments");

        expect(transactions.status).toBe(200);
        expect(investments.status).toBe(200);
        // Pinned: the envelope commit changes both shapes.
        expect(Array.isArray(transactions.body)).toBe(true);
        expect(Array.isArray(investments.body)).toBe(true);
    });

    // One row per PROJECT, with the amounts summed — backing the same project three
    // times is one card on My Investments, not three identical-looking ones.
    it("groups investments by project and sums them", async () => {
        const investor = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(investor.token).post(`/api/projects/${project.id}/invest`).send({ amount: 100 });
        await as(investor.token).post(`/api/projects/${project.id}/invest`).send({ amount: 250 });

        const res = await as(investor.token).get("/api/classcoins/investments");
        const row = res.body.filter((r) => Number(r.project_id) === project.id);

        expect(row).toHaveLength(1);
        expect(row[0].invested_amount).toBe(350);
        expect(row[0].investment_count).toBe(2);
    });

    // The overwhelming majority of transactions carry tier_id = NULL, so the join to
    // project_tiers has to be a LEFT JOIN. A plain JOIN would empty this page for
    // almost everybody.
    it("still lists an investment made with no support level", async () => {
        const investor = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(investor.token).post(`/api/projects/${project.id}/invest`).send({ amount: 100 });

        const res = await as(investor.token).get("/api/classcoins/investments");

        expect(res.body.map((r) => Number(r.project_id))).toContain(project.id);
    });
});

describe("POST /api/classcoins/add and /deduct", () => {
    it("403 for a backer and for a creator, 401 signed out", async () => {
        const body = { user_id: backer.id, amount: 100 };

        expect((await request(app).post("/api/classcoins/add").send(body)).status).toBe(401);
        expect((await as(backer.token).post("/api/classcoins/add").send(body)).status).toBe(403);
        expect((await as(creator.token).post("/api/classcoins/deduct").send(body)).status).toBe(403);
    });

    it("200 for an admin, crediting the wallet named in the body", async () => {
        const target = await makeUser({ roles: ["BACKER"], balance: 500 });

        const res = await as(admin.token).post("/api/classcoins/add").send({ user_id: target.id, amount: 250 });

        expect(res.status).toBe(200);
        expect(await balanceOf(target.id)).toBe(750);
    });

    it("200 for an admin deducting, and 400 when the wallet is short", async () => {
        const target = await makeUser({ roles: ["BACKER"], balance: 500 });

        const ok = await as(admin.token).post("/api/classcoins/deduct").send({ user_id: target.id, amount: 200 });
        const tooMuch = await as(admin.token).post("/api/classcoins/deduct").send({ user_id: target.id, amount: 10000 });

        expect(ok.status).toBe(200);
        expect(tooMuch.status).toBe(400);
        expect(tooMuch.body.message).toBe("Insufficient ClassCoins");
        expect(await balanceOf(target.id)).toBe(300);
    });

    // The wallet is named in the body precisely so it cannot be taken from the token.
    it("400 when no user_id is given, rather than falling back to the caller", async () => {
        const before = await balanceOf(admin.id);

        const res = await as(admin.token).post("/api/classcoins/add").send({ amount: 100 });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("user_id is required");
        expect(await balanceOf(admin.id)).toBe(before);
    });
});
