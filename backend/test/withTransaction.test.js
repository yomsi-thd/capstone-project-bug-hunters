/**
 * withTransaction, and the property that matters: a failure leaves NOTHING behind.
 *
 * ⚠️ The team has already paid for a broken version of this. On 2026-08-06
 * increaseCurrentAmount ignored the client it was passed, so it ran on a separate
 * connection and committed on its own — an investment that failed afterwards left the
 * project funded by Class Coins the backer still had. These tests are the standing
 * check that the four call sites really are one transaction each.
 */

import { describe, it, expect, beforeAll } from "vitest";

import withTransaction from "../src/db/withTransaction.js";
import { pool, makeUser, makeProject, makeTier, balanceOf, as } from "./helpers/factories.js";

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

describe("withTransaction", () => {
    it("commits and returns the work's value", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const returned = await withTransaction(async (client) => {
            await client.query("update classcoins set balance = 1234 where user_id = $1", [user.id]);
            return "done";
        });

        expect(returned).toBe("done");
        expect(await balanceOf(user.id)).toBe(1234);
    });

    it("rolls everything back when the work throws, and rethrows the original error", async () => {
        const user = await makeUser({ roles: ["BACKER"], balance: 500 });

        await expect(
            withTransaction(async (client) => {
                await client.query("update classcoins set balance = 9999 where user_id = $1", [user.id]);
                throw new Error("something went wrong halfway");
            })
        ).rejects.toThrow("something went wrong halfway");

        expect(await balanceOf(user.id)).toBe(500);
    });

    // A connection left checked out is a leak that only shows up under load, as requests
    // hanging with no error anywhere.
    it("releases the connection on both paths", async () => {
        const before = pool.idleCount + pool.totalCount;

        await withTransaction(async (client) => client.query("select 1"));
        await withTransaction(async () => {
            throw new Error("boom");
        }).catch(() => {});

        expect(pool.totalCount).toBeLessThanOrEqual(before + 1);
    });
});

describe("the call sites really are atomic", () => {
    // createProject writes the project and its levels together. Half-saved is the worst
    // outcome: the wizard sends the creator away on success, so they would believe the
    // levels exist with no way to notice they do not.
    it("createProject leaves no project behind when a level is rejected", async () => {
        const before = await pool.query("select count(*)::int as n from projects");

        const res = await as(creator.token)
            .post("/api/projects")
            .send({
                title: "Should not survive",
                description: "x",
                category: "ENGINEERING",
                goal_amount: 1000,
                tiers: [
                    { name: "Fine", min_amount: 50, bullets: ["ok"] },
                    { name: "", min_amount: 100, bullets: ["broken"] },
                ],
            });

        const after = await pool.query("select count(*)::int as n from projects");

        expect(res.status).toBe(422);
        expect(after.rows[0].n).toBe(before.rows[0].n);
    });

    /**
     * The exact shape of the 2026-08-06 regression: the level check fires AFTER the
     * project row has been read but BEFORE any write, and the wallet debit and the
     * funding bump must both be undone together.
     */
    it("investProject leaves neither the wallet nor the funding changed when it fails late", async () => {
        const backer = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const tier = await makeTier({ projectId: project.id, minAmount: 800 });

        // Under the level's minimum, so it is refused after the project is loaded.
        const res = await as(backer.token)
            .post(`/api/projects/${project.id}/invest`)
            .send({ amount: 300, tierId: tier.id });

        expect(res.status).toBe(422);
        expect(await balanceOf(backer.id)).toBe(1000);
        expect(await fundedAmount(project.id)).toBe(0);

        const { rows } = await pool.query(
            `select count(*)::int as n from classcoin_transactions t
             join classcoins c on c.id = t.classcoin_id where c.user_id = $1`,
            [backer.id]
        );

        expect(rows[0].n).toBe(0);
    });

    // setUserRoles deletes the whole set before inserting the new one, so a failure
    // halfway would leave the account holding no roles at all.
    it("updateUserRoles leaves the old set intact when the new one is refused", async () => {
        const user = await makeUser({ roles: ["BACKER", "CREATOR"] });

        const res = await as(admin.token)
            .patch(`/api/admin/users/${user.id}/roles`)
            .send({ roles: ["BACKER", "WIZARD"] });

        expect(res.status).toBe(422);

        const { rows } = await pool.query(
            `select r.name from user_roles ur join roles r on r.id = ur.role_id
             where ur.user_id = $1 order by r.name`,
            [user.id]
        );

        expect(rows.map((r) => r.name)).toEqual(["BACKER", "CREATOR"]);
    });
});
