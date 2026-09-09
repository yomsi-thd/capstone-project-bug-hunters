/**
 * The account routes and the Class Coin wallet.
 *
 * Two things here matter more than the status codes. POST /classcoins/add and /deduct are
 * admin only and take the target wallet in the body: with no role guard and the wallet
 * read from the token, any signed-in user could mint coins into their own balance, and
 * coins are the only measure of a project's popularity.
 *
 * DELETE /users/profile works and the frontend never calls it: projects.creator_id is ON
 * DELETE CASCADE, so it erases the user's projects, comments and history in one click.
 * The cascade is measured below rather than described.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, makeTier, balanceOf, as, uniqueEmail, PASSWORD } from "./helpers/factories.js";

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

    // An absent `title` means "keep what is stored" rather than "clear it".
    it("keeps the stored title when the field is omitted", async () => {
        const user = await makeUser({ roles: ["BACKER"], title: "PhD Candidate" });

        const res = await as(user.token).put("/api/users/profile").send({ fullName: "N", email: user.email });

        expect(res.body.title).toBe("PhD Candidate");
    });

    it("409 when the email already belongs to somebody else", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const res = await as(user.token).put("/api/users/profile").send({ fullName: "N", email: backer.email });

        expect(res.status).toBe(409);
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

    // 422 rather than 401: the caller is authenticated and holding a valid token for this
    // account. What is wrong is a value they typed, and naming the field lets the form put
    // the error on the right input.
    it("422 with the field named when the old password is wrong", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const res = await as(user.token)
            .put("/api/users/change-password")
            .send({ oldPassword: "nope", newPassword: "Brand5678" });

        expect(res.status).toBe(422);
        expect(res.body.message).toBe("Old password is incorrect");
        expect(res.body.details).toEqual([
            { field: "oldPassword", message: "Old password is incorrect" },
        ]);
    });
});

describe("DELETE /api/users/profile", () => {
    // Measured rather than assumed, and why the Account page has no delete button.
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
        expect(Array.isArray(transactions.body.items)).toBe(true);
        expect(Array.isArray(investments.body.items)).toBe(true);
    });

    // One row per project, proved with two projects since one person can only contribute
    // once. The grouping is what the page renders a card from.
    it("returns one row per project backed", async () => {
        const investor = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const one = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        const two = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(investor.token).post(`/api/projects/${one.id}/invest`).send({ amount: 100 });
        await as(investor.token).post(`/api/projects/${two.id}/invest`).send({ amount: 250 });

        const res = await as(investor.token).get("/api/classcoins/investments");
        const mine = res.body.items.filter((r) => [one.id, two.id].includes(Number(r.project_id)));

        expect(mine).toHaveLength(2);
        expect(mine.find((r) => Number(r.project_id) === one.id).invested_amount).toBe(100);
        expect(mine.find((r) => Number(r.project_id) === two.id).invested_amount).toBe(250);
    });

    // Most transactions carry tier_id NULL, so the join to project_tiers has to be a LEFT
    // JOIN. A plain join would empty this page for almost everybody.
    it("still lists an investment made with no support level", async () => {
        const investor = await makeUser({ roles: ["BACKER"], balance: 1000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });

        await as(investor.token).post(`/api/projects/${project.id}/invest`).send({ amount: 100 });

        const res = await as(investor.token).get("/api/classcoins/investments");

        expect(res.body.items.map((r) => Number(r.project_id))).toContain(project.id);
    });

    // The card names the level the backer chose. One contribution per project means one
    // level per card here; the "highest across several" rule still governs
    // GET /projects/my/backers, and projects.test.js pins it there.
    it("names the level the backer chose", async () => {
        const investor = await makeUser({ roles: ["BACKER"], balance: 2000 });
        const project = await makeProject({ creatorId: creator.id, status: "APPROVED" });
        await makeTier({ projectId: project.id, name: "Supporter", minAmount: 100 });
        const champion = await makeTier({ projectId: project.id, name: "Champion", minAmount: 500 });

        await as(investor.token)
            .post(`/api/projects/${project.id}/invest`)
            .send({ amount: 500, tierId: champion.id });

        const res = await as(investor.token).get("/api/classcoins/investments");
        const row = res.body.items.find((r) => Number(r.project_id) === project.id);

        expect(row.top_tier_name).toBe("Champion");
        expect(row.top_tier_min).toBe(500);
        expect(row.invested_amount).toBe(500);
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

    it("200 for an admin deducting, and 409 when the wallet is short", async () => {
        const target = await makeUser({ roles: ["BACKER"], balance: 500 });

        const ok = await as(admin.token).post("/api/classcoins/deduct").send({ user_id: target.id, amount: 200 });
        const tooMuch = await as(admin.token).post("/api/classcoins/deduct").send({ user_id: target.id, amount: 10000 });

        expect(ok.status).toBe(200);
        expect(tooMuch.status).toBe(409);
        expect(tooMuch.body.code).toBe("INSUFFICIENT_FUNDS");
        expect(tooMuch.body.message).toBe("Insufficient ClassCoins");
        expect(await balanceOf(target.id)).toBe(300);
    });

    // The wallet is named in the body precisely so it cannot come from the token.
    it("422 when no user_id is given, rather than falling back to the caller", async () => {
        const before = await balanceOf(admin.id);

        const res = await as(admin.token).post("/api/classcoins/add").send({ amount: 100 });

        expect(res.status).toBe(422);
        expect(res.body.message).toContain("user_id is required");
        expect(res.body.details).toEqual([
            { field: "user_id", message: "user_id is required - name the account to adjust." },
        ]);
        expect(await balanceOf(admin.id)).toBe(before);
    });
});

/**
 * Where a new account's Class Coins come from.
 *
 * A wallet starts empty and is filled either by the domain rule below or by an admin. A
 * column default would make every throwaway account worth real influence over the
 * ranking.
 */
describe("the grant at registration", () => {
    const registerAs = (email) =>
        request(app).post("/api/auth/register").send({ fullName: "Grant Test", email, password: PASSWORD });

    const walletOf = async (email) => {
        const { rows } = await pool.query(
            `SELECT cc.id, cc.balance::int AS balance
             FROM classcoins cc JOIN users u ON u.id = cc.user_id
             WHERE u.email = $1`,
            [email]
        );
        return rows[0];
    };

    it("grants 4000 CC to an RMIT address, and records where it came from", async () => {
        const email = uniqueEmail("granted").replace(/@.*/, "@rmit.edu.vn");

        expect((await registerAs(email)).status).toBe(201);

        const wallet = await walletOf(email);
        expect(wallet.balance).toBe(4000);

        // Coins must never appear without a transaction to explain them.
        const { rows } = await pool.query(
            `SELECT type, amount::int AS amount, granted_by
             FROM classcoin_transactions WHERE classcoin_id = $1`,
            [wallet.id]
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].type).toBe("ADMIN_ADD");
        expect(rows[0].amount).toBe(4000);
        // NULL means the system granted it; an admin's grant carries their id.
        expect(rows[0].granted_by).toBeNull();
    });

    it("leaves a non-RMIT address at zero, with no transaction", async () => {
        const email = uniqueEmail("outsider").replace(/@.*/, "@gmail.com");

        expect((await registerAs(email)).status).toBe(201);

        const wallet = await walletOf(email);
        expect(wallet.balance).toBe(0);

        const { rows } = await pool.query(
            "SELECT 1 FROM classcoin_transactions WHERE classcoin_id = $1",
            [wallet.id]
        );
        expect(rows).toHaveLength(0);
    });

    // A balance and its explanation land together or not at all. As two statements, the
    // balance moves first and a failure on the second leaves a wallet holding coins
    // nothing can account for. This test fails the moment somebody splits them.
    it("never leaves a balance without the row that explains it", async () => {
        const email = uniqueEmail("atomic").replace(/@.*/, "@rmit.edu.vn");

        expect((await registerAs(email)).status).toBe(201);

        const wallet = await walletOf(email);
        const { rows } = await pool.query(
            "SELECT COALESCE(SUM(amount), 0)::int AS total FROM classcoin_transactions WHERE classcoin_id = $1",
            [wallet.id]
        );

        // The ledger has to account for the balance down to the last coin.
        expect(rows[0].total).toBe(wallet.balance);
    });

    it("matches the domain case-insensitively", async () => {
        const email = uniqueEmail("shouty").replace(/@.*/, "@RMIT.EDU.VN");

        expect((await registerAs(email)).status).toBe(201);
        expect((await walletOf(email)).balance).toBe(4000);
    });
});
