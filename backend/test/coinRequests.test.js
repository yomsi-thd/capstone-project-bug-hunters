/**
 * Requests for Class Coins from people outside RMIT.
 *
 * The third way a wallet gets filled: the first is the automatic grant by email domain at
 * registration, the second an admin issuing to a pasted list. Nobody knows these people
 * in advance, so they ask for themselves and an admin decides.
 *
 * The test that matters most is not the happy path but "rolls the coins back when the
 * guarded UPDATE loses the race". That one proves the throw sits inside the transaction.
 * Written with `return` instead of `throw`, every other test stays green and only that
 * one fails.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";

import { app, pool, makeUser, balanceOf, as } from "./helpers/factories.js";
import { createRequire } from "node:module";

// createRequire rather than import. The service loads the repository with require(), so
// only the same object in the CommonJS cache can be spied on; an ESM default import can
// be a different wrapper, and the spy then does nothing.
const requireCjs = createRequire(import.meta.url);
const coinRequestRepository = requireCjs("../src/repositories/coinRequestRepository.js");

let admin;

beforeAll(async () => {
    admin = await makeUser({ roles: ["ADMIN"] });
});

const pendingCount = async (userId) => {
    const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM coin_requests WHERE user_id = $1 AND status = 'PENDING'`,
        [userId]
    );
    return rows[0].n;
};

describe("POST /api/classcoins/requests", () => {
    it("files a request for an empty wallet", async () => {
        const outsider = await makeUser({ roles: ["BACKER"], balance: 0 });

        const res = await as(outsider.token)
            .post("/api/classcoins/requests")
            .send({ note: "I am Minh's mother, invited to the showcase." });

        expect(res.status).toBe(201);
        expect(res.body.request.status).toBe("PENDING");
        expect(res.body.request.note).toBe("I am Minh's mother, invited to the showcase.");
        expect(await pendingCount(outsider.id)).toBe(1);
    });

    it("refuses a second request while one is still waiting", async () => {
        const outsider = await makeUser({ roles: ["BACKER"], balance: 0 });

        await as(outsider.token).post("/api/classcoins/requests").send({ note: "First ask." });

        const res = await as(outsider.token)
            .post("/api/classcoins/requests")
            .send({ note: "Second ask." });

        expect(res.status).toBe(409);
        // One waiting request only, decided by the partial index rather than an if.
        expect(await pendingCount(outsider.id)).toBe(1);
    });

    it("refuses somebody who still has Class Coins", async () => {
        const funded = await makeUser({ roles: ["BACKER"], balance: 250 });

        const res = await as(funded.token)
            .post("/api/classcoins/requests")
            .send({ note: "I would like more." });

        expect(res.status).toBe(409);
        expect(await pendingCount(funded.id)).toBe(0);
    });

    it("refuses an administrator", async () => {
        const res = await as(admin.token)
            .post("/api/classcoins/requests")
            .send({ note: "Coins for me." });

        expect(res.status).toBe(409);
    });

    it("422 on an empty note and on one past 200 characters", async () => {
        const outsider = await makeUser({ roles: ["BACKER"], balance: 0 });

        const empty = await as(outsider.token)
            .post("/api/classcoins/requests")
            .send({ note: "   " });
        expect(empty.status).toBe(422);

        const long = await as(outsider.token)
            .post("/api/classcoins/requests")
            .send({ note: "x".repeat(201) });
        expect(long.status).toBe(422);

        expect(await pendingCount(outsider.id)).toBe(0);
    });

    it("401 signed out", async () => {
        const res = await request(app)
            .post("/api/classcoins/requests")
            .send({ note: "Anyone home?" });

        expect(res.status).toBe(401);
    });
});

describe("GET /api/classcoins/requests/me", () => {
    it("answers null when the person has never asked", async () => {
        const fresh = await makeUser({ roles: ["BACKER"], balance: 0 });

        const res = await as(fresh.token).get("/api/classcoins/requests/me");

        // 200 with null rather than 404. "Never asked" is an ordinary answer, and the
        // Account page asks this every time it opens.
        expect(res.status).toBe(200);
        expect(res.body).toBeNull();
    });

    it("returns the waiting request", async () => {
        const waiting = await makeUser({ roles: ["BACKER"], balance: 0 });

        await as(waiting.token)
            .post("/api/classcoins/requests")
            .send({ note: "Family of a student." });

        const res = await as(waiting.token).get("/api/classcoins/requests/me");

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("PENDING");
        expect(res.body.note).toBe("Family of a student.");
    });
});

describe("GET /api/admin/coin-requests", () => {
    it("lists pending requests with the person's name and email", async () => {
        const asker = await makeUser({ roles: ["BACKER"], balance: 0, name: "Outside Guest" });

        await as(asker.token)
            .post("/api/classcoins/requests")
            .send({ note: "Invited to the showcase." });

        const res = await as(admin.token).get("/api/admin/coin-requests");

        expect(res.status).toBe(200);

        const mine = res.body.items.find((r) => r.user_id === asker.id);
        expect(mine).toBeDefined();
        expect(mine.full_name).toBe("Outside Guest");
        expect(mine.email).toBe(asker.email);
        expect(mine.note).toBe("Invited to the showcase.");
    });

    it("403 for a backer, 401 signed out", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 0 });

        expect((await as(backer.token).get("/api/admin/coin-requests")).status).toBe(403);
        expect((await request(app).get("/api/admin/coin-requests")).status).toBe(401);
    });
});

const requestFor = async (user, note = "Please.") => {
    const res = await as(user.token).post("/api/classcoins/requests").send({ note });
    return res.body.request;
};

const requestRow = async (id) => {
    const { rows } = await pool.query(`SELECT * FROM coin_requests WHERE id = $1`, [id]);
    return rows[0];
};

describe("PATCH /api/admin/coin-requests/:id/approve", () => {
    it("credits the wallet, writes the ledger row, and stamps the request", async () => {
        const asker = await makeUser({ roles: ["BACKER"], balance: 0 });
        const filed = await requestFor(asker);

        const res = await as(admin.token)
            .patch(`/api/admin/coin-requests/${filed.id}/approve`)
            .send({ amount: 4000 });

        expect(res.status).toBe(200);
        expect(await balanceOf(asker.id)).toBe(4000);

        const row = await requestRow(filed.id);
        expect(row.status).toBe("APPROVED");
        expect(row.amount_granted).toBe(4000);
        expect(row.reviewed_by).toBe(admin.id);

        const { rows: ledger } = await pool.query(
            `SELECT ct.granted_by, ct.type, ct.amount::int AS amount
             FROM classcoin_transactions ct
             JOIN classcoins c ON c.id = ct.classcoin_id
             WHERE c.user_id = $1`,
            [asker.id]
        );
        expect(ledger).toHaveLength(1);
        expect(ledger[0].granted_by).toBe(admin.id);
        expect(ledger[0].type).toBe("ADMIN_ADD");
        expect(ledger[0].amount).toBe(4000);
    });

    it("refuses a second verdict once the first is recorded", async () => {
        const asker = await makeUser({ roles: ["BACKER"], balance: 0 });
        const filed = await requestFor(asker);

        await as(admin.token)
            .patch(`/api/admin/coin-requests/${filed.id}/approve`)
            .send({ amount: 4000 });

        const second = await as(admin.token)
            .patch(`/api/admin/coin-requests/${filed.id}/approve`)
            .send({ amount: 4000 });

        // The easy path only: the second verdict is refused by the early check, since the
        // request is no longer PENDING, so it never reaches the transaction. The real race
        // is the test below.
        expect(second.status).toBe(409);
        expect(await balanceOf(asker.id)).toBe(4000);
    });

    it("rolls the coins back when the guarded UPDATE loses the race", async () => {
        const asker = await makeUser({ roles: ["BACKER"], balance: 0 });
        const filed = await requestFor(asker);

        // Builds the situation the early check cannot catch: the request is still PENDING
        // when the service reads it, but by the time the UPDATE runs another admin has
        // given a verdict, so it matches 0 rows.
        //
        // Not built from two parallel requests, whose ordering is not deterministic.
        // Forcing the repository to return undefined once is the only way to reach this
        // branch on purpose.
        const spy = vi.spyOn(coinRequestRepository, "approve").mockResolvedValueOnce(undefined);

        const res = await as(admin.token)
            .patch(`/api/admin/coin-requests/${filed.id}/approve`)
            .send({ amount: 4000 });

        spy.mockRestore();

        expect(res.status).toBe(409);
        // The real test of the throw inside the transaction. creditWallet ran before the
        // UPDATE, so only a throw from inside rolls it back. With `return` instead, the
        // line above is still 409 while the wallet keeps the coins.
        expect(await balanceOf(asker.id)).toBe(0);
        expect((await requestRow(filed.id)).status).toBe("PENDING");
    });

    it("422 on a zero or fractional amount", async () => {
        const asker = await makeUser({ roles: ["BACKER"], balance: 0 });
        const filed = await requestFor(asker);

        expect(
            (await as(admin.token).patch(`/api/admin/coin-requests/${filed.id}/approve`).send({ amount: 0 })).status
        ).toBe(422);
        expect(
            (await as(admin.token).patch(`/api/admin/coin-requests/${filed.id}/approve`).send({ amount: 12.5 })).status
        ).toBe(422);
        expect(await balanceOf(asker.id)).toBe(0);
    });

    it("404 for a request that does not exist", async () => {
        const res = await as(admin.token)
            .patch("/api/admin/coin-requests/99999999/approve")
            .send({ amount: 4000 });

        expect(res.status).toBe(404);
    });
});

describe("PATCH /api/admin/coin-requests/:id/reject", () => {
    it("marks the request rejected and credits nothing", async () => {
        const asker = await makeUser({ roles: ["BACKER"], balance: 0 });
        const filed = await requestFor(asker);

        const res = await as(admin.token).patch(`/api/admin/coin-requests/${filed.id}/reject`);

        expect(res.status).toBe(200);
        expect((await requestRow(filed.id)).status).toBe("REJECTED");
        expect(await balanceOf(asker.id)).toBe(0);
    });

    it("lets a rejected person ask again", async () => {
        const asker = await makeUser({ roles: ["BACKER"], balance: 0 });
        const filed = await requestFor(asker, "First try.");

        await as(admin.token).patch(`/api/admin/coin-requests/${filed.id}/reject`);

        const again = await as(asker.token)
            .post("/api/classcoins/requests")
            .send({ note: "Second try, with more detail." });

        expect(again.status).toBe(201);
    });
});
