/**
 * Bulk granting, POST /api/classcoins/grant.
 *
 * The point of the endpoint is that it is atomic. An admin issuing coins to a class of
 * thirty must never be left with fifteen done and no way to tell which fifteen, which is
 * what looping the single-grant route from the browser would produce. The refusal tests
 * below matter more than the happy path for that reason: each checks that nobody was
 * credited, not merely that the request failed.
 *
 * An admin account may not hold Class Coins, and the rule is enforced here rather than by
 * hiding a checkbox: a UI-only rule is one a hand-made request walks straight past.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, balanceOf, as } from "./helpers/factories.js";

let admin;
let backer;

beforeAll(async () => {
    admin = await makeUser({ roles: ["ADMIN"] });
    backer = await makeUser({ roles: ["BACKER"], balance: 0 });
});

const grantedRows = async (userIds) => {
    const { rows } = await pool.query(
        `SELECT ct.granted_by, ct.type, ct.amount::int AS amount, ct.description
         FROM classcoin_transactions ct
         JOIN classcoins c ON c.id = ct.classcoin_id
         WHERE c.user_id = ANY($1)`,
        [userIds]
    );
    return rows;
};

describe("POST /api/classcoins/grant", () => {
    it("credits everybody named, and records who granted it", async () => {
        const one = await makeUser({ roles: ["BACKER"], balance: 0 });
        const two = await makeUser({ roles: ["BACKER"], balance: 100 });

        const res = await as(admin.token)
            .post("/api/classcoins/grant")
            .send({ user_ids: [one.id, two.id], amount: 4000 });

        expect(res.status).toBe(200);
        expect(res.body.granted).toBe(2);
        expect(await balanceOf(one.id)).toBe(4000);
        // Added to what was already there rather than replacing it.
        expect(await balanceOf(two.id)).toBe(4100);

        const rows = await grantedRows([one.id, two.id]);
        expect(rows).toHaveLength(2);
        // The audit trail this endpoint exists to leave. Issuing coins is the
        // anti-gaming mechanism, and one nobody can audit is not a mechanism.
        expect(rows.every((r) => r.granted_by === admin.id)).toBe(true);
        expect(rows.every((r) => r.type === "ADMIN_ADD" && r.amount === 4000)).toBe(true);
    });

    it("grants to a single person, which is a list of one", async () => {
        const alone = await makeUser({ roles: ["BACKER"], balance: 0 });

        const res = await as(admin.token)
            .post("/api/classcoins/grant")
            .send({ user_ids: [alone.id], amount: 250 });

        expect(res.status).toBe(200);
        expect(await balanceOf(alone.id)).toBe(250);
    });

    // Some accounts predate automatic wallet creation and have no wallet row. Refusing
    // them with "no longer exists" would be untrue about an account sitting in the admin's
    // table, and would leave them unable to receive coins. A grant makes the wallet.
    it("creates a wallet for an account that never had one", async () => {
        const walletless = await makeUser({ roles: ["BACKER"] });
        await pool.query("DELETE FROM classcoins WHERE user_id = $1", [walletless.id]);

        const res = await as(admin.token)
            .post("/api/classcoins/grant")
            .send({ user_ids: [walletless.id], amount: 4000 });

        expect(res.status).toBe(200);
        expect(await balanceOf(walletless.id)).toBe(4000);
        expect(await grantedRows([walletless.id])).toHaveLength(1);
    });

    // The most important test here. It checks atomicity: a loop over the single-grant
    // route would credit the first account and only then meet the admin.
    it("refuses the whole batch when one target is an ADMIN, crediting nobody", async () => {
        const ordinary = await makeUser({ roles: ["BACKER"], balance: 0 });
        const target = await makeUser({ roles: ["ADMIN"] });

        const res = await as(admin.token)
            .post("/api/classcoins/grant")
            .send({ user_ids: [ordinary.id, target.id], amount: 4000 });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("An administrator account cannot hold Class Coins.");
        expect(await balanceOf(ordinary.id)).toBe(0);
        expect(await grantedRows([ordinary.id])).toHaveLength(0);
    });

    it("refuses the whole batch when one id does not exist", async () => {
        const ordinary = await makeUser({ roles: ["BACKER"], balance: 0 });

        const res = await as(admin.token)
            .post("/api/classcoins/grant")
            .send({ user_ids: [ordinary.id, 999999], amount: 4000 });

        expect(res.status).toBe(404);
        expect(await balanceOf(ordinary.id)).toBe(0);
    });

    it("403 for a backer, 401 signed out", async () => {
        const body = { user_ids: [backer.id], amount: 100 };

        expect((await as(backer.token).post("/api/classcoins/grant").send(body)).status).toBe(403);
        expect((await request(app).post("/api/classcoins/grant").send(body)).status).toBe(401);
    });

    it("422 on an empty list, a zero amount, and an absurd amount", async () => {
        const post = (body) => as(admin.token).post("/api/classcoins/grant").send(body);

        expect((await post({ user_ids: [], amount: 100 })).status).toBe(422);
        expect((await post({ user_ids: [backer.id], amount: 0 })).status).toBe(422);
        // The realistic mistake is a typed extra zero rather than a malicious admin.
        expect((await post({ user_ids: [backer.id], amount: 100001 })).status).toBe(422);
    });
});

describe("POST /api/classcoins/add and the admin rule", () => {
    // The single-target route runs the same rule, or the batch rule can be walked around
    // one request at a time.
    it("refuses to credit an administrator's wallet", async () => {
        const target = await makeUser({ roles: ["ADMIN"] });

        const res = await as(admin.token)
            .post("/api/classcoins/add")
            .send({ user_id: target.id, amount: 100 });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("An administrator account cannot hold Class Coins.");
    });

    // Deducting from an admin stays legal: cleaning up a wallet that should never have
    // held coins is a real operation. The rule is "no granting to an admin", not "an
    // admin's wallet is untouchable".
    it("still lets an admin's wallet be deducted", async () => {
        const target = await makeUser({ roles: ["ADMIN"], balance: 500 });

        const res = await as(admin.token)
            .post("/api/classcoins/deduct")
            .send({ user_id: target.id, amount: 500 });

        expect(res.status).toBe(200);
        expect(await balanceOf(target.id)).toBe(0);
    });
});
