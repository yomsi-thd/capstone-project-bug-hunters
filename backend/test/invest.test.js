/**
 * Investing. The one transaction in the app where getting it wrong costs real state:
 * a wallet debited without the project funded, or the reverse.
 *
 * The race at the bottom is carried over from scripts/e2e-support-levels.js, where it
 * has to run against the SHARED database and spend real Class Coins. Here it runs in a
 * throwaway schema, which is the whole reason this suite exists.
 *
 * ⚠️ The team has already paid for a broken version of this transaction: on 2026-08-06
 * increaseCurrentAmount ignored the client it was passed, ran on its own connection,
 * and ROLLBACK could not undo the funding it had added. The `withTransaction` commit in
 * the restructure removes that class of bug by construction; these tests are what prove
 * it removed nothing else along with it.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, makeTier, balanceOf, as } from "./helpers/factories.js";

let creator;
let admin;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    admin = await makeUser({ roles: ["ADMIN"] });
});

const fundedAmount = async (projectId) => {
    const { rows } = await pool.query("select current_amount from projects where id = $1", [projectId]);
    return Number(rows[0].current_amount);
};

describe("POST /api/projects/:id/invest", () => {
    it("200, debits the wallet and funds the project by the same amount", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(backer.token).post(`/api/projects/${project.id}/invest`).send({ amount: 250 });

        expect(res.status).toBe(200);
        expect(await balanceOf(backer.id)).toBe(750);
        expect(await fundedAmount(project.id)).toBe(250);
    });

    // authorize("BACKER") landed with the admin role separation. Before it, canInvest
    // was a UI gate only and one hand-made request walked straight past it.
    it("403 for a pure creator and for an admin", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        expect((await as(creator.token).post(`/api/projects/${project.id}/invest`).send({ amount: 10 })).status).toBe(403);
        expect((await as(admin.token).post(`/api/projects/${project.id}/invest`).send({ amount: 10 })).status).toBe(403);
    });

    it("401 signed out", async () => {
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        expect((await request(app).post(`/api/projects/${project.id}/invest`).send({ amount: 10 })).status).toBe(401);
    });

    it("400 on a missing, zero or negative amount", async () => {
        const backer = await makeUser({ roles: ["BACKER"] });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const post = (body) => as(backer.token).post(`/api/projects/${project.id}/invest`).send(body);

        expect((await post({})).status).toBe(400);
        expect((await post({ amount: 0 })).status).toBe(400);
        expect((await post({ amount: -50 })).status).toBe(400);
    });

    it("400 and no state change when the wallet is short", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 100 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(backer.token).post(`/api/projects/${project.id}/invest`).send({ amount: 500 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Insufficient ClassCoins.");
        expect(await balanceOf(backer.id)).toBe(100);
        expect(await fundedAmount(project.id)).toBe(0);
    });

    it("400 for a project that is not APPROVED", async () => {
        const backer = await makeUser({ roles: ["BACKER"] });
        const pending = await makeProject({ creatorId: creator.id, status: "PENDING" });

        const res = await as(backer.token).post(`/api/projects/${pending.id}/invest`).send({ amount: 50 });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("Only approved projects");
    });

    it("400 for a project that does not exist", async () => {
        const backer = await makeUser({ roles: ["BACKER"] });

        const res = await as(backer.token).post("/api/projects/99999999/invest").send({ amount: 50 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Project not found.");
    });
});

describe("investing at a support level", () => {
    it("200 and stores the level on the transaction", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const tier = await makeTier({ projectId: project.id, minAmount: 100 });

        const res = await as(backer.token)
            .post(`/api/projects/${project.id}/invest`)
            .send({ amount: 150, tierId: tier.id });

        expect(res.status).toBe(200);
        expect(res.body.transaction.tier_id).toBe(tier.id);
    });

    // "No level — just support" is a first-class choice, not a fallback.
    it("200 with no level at all, and tier_id stays NULL", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const res = await as(backer.token).post(`/api/projects/${project.id}/invest`).send({ amount: 50 });

        expect(res.status).toBe(200);
        expect(res.body.transaction.tier_id).toBeNull();
    });

    it("400 and no debit when the amount is under the level's minimum", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const tier = await makeTier({ projectId: project.id, minAmount: 500 });

        const res = await as(backer.token)
            .post(`/api/projects/${project.id}/invest`)
            .send({ amount: 100, tierId: tier.id });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("This level needs at least 500 CC.");
        expect(await balanceOf(backer.id)).toBe(1000);
    });

    it("400 for a hidden level", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const tier = await makeTier({ projectId: project.id, minAmount: 100, isActive: false });

        const res = await as(backer.token)
            .post(`/api/projects/${project.id}/invest`)
            .send({ amount: 150, tierId: tier.id });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("That support level is no longer available.");
    });

    // Scoped to the project, so a level id belonging to another project cannot be
    // attached to this investment by editing the request body.
    it("400 for a level belonging to another project", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const elsewhere = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const foreign = await makeTier({ projectId: elsewhere.id, minAmount: 100 });

        const res = await as(backer.token)
            .post(`/api/projects/${project.id}/invest`)
            .send({ amount: 150, tierId: foreign.id });

        expect(res.status).toBe(400);
    });
});

describe("eight investments racing for one wallet", () => {
    /**
     * The wallet holds exactly enough for four of the eight. The deduction is a single
     * `UPDATE … WHERE balance >= $2` inside the transaction, so the database decides who
     * wins; nothing in Node reads-then-writes.
     *
     * What must hold afterwards: exactly four succeed, the balance lands on zero, it
     * never goes negative, and the project is funded by precisely what left the wallet.
     */
    it("lets exactly four through, and the balance never goes negative", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        const attempts = Array.from({ length: 8 }, () =>
            as(backer.token).post(`/api/projects/${project.id}/invest`).send({ amount: 250 })
        );

        const results = await Promise.all(attempts);

        const succeeded = results.filter((res) => res.status === 200);
        const refused = results.filter((res) => res.status === 400);

        expect(succeeded).toHaveLength(4);
        expect(refused).toHaveLength(4);
        expect(refused.every((res) => res.body.message === "Insufficient ClassCoins.")).toBe(true);

        const balance = await balanceOf(backer.id);

        expect(balance).toBe(0);
        expect(balance).toBeGreaterThanOrEqual(0);

        // The half that the 2026-08-06 regression got wrong: the project must be funded
        // by exactly what left the wallet, with no rolled-back investment left counted.
        expect(await fundedAmount(project.id)).toBe(1000);

        const { rows } = await pool.query(
            `select count(*)::int as n from classcoin_transactions t
             join classcoins c on c.id = t.classcoin_id
             where c.user_id = $1 and t.type = 'INVEST'`,
            [backer.id]
        );

        expect(rows[0].n).toBe(4);
    });
});
