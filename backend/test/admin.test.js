/**
 * The admin area: user listing, activation, role assignment and the creator-request
 * queue.
 *
 * updateUserRoles carries two guards whose ORDER matters, and both are pinned here.
 * An admin editing their own account trips both; the role-exclusion message is the one
 * that explains the rule, so it has to be the one they read.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, as, uniqueEmail, PASSWORD } from "./helpers/factories.js";

let admin;
let otherAdmin;
let creator;
let backer;

beforeAll(async () => {
    admin = await makeUser({ roles: ["ADMIN"] });
    otherAdmin = await makeUser({ roles: ["ADMIN"] });
    creator = await makeUser({ roles: ["CREATOR"] });
    backer = await makeUser({ roles: ["BACKER"] });
});

describe("the admin routes are ADMIN-only", () => {
    const routes = [
        ["get", "/api/admin/users"],
        ["get", "/api/admin/projects"],
        ["get", "/api/admin/creator-requests"],
    ];

    it.each(routes)("%s %s answers 401 signed out and 403 for a backer", async (method, url) => {
        expect((await request(app)[method](url)).status).toBe(401);
        expect((await as(backer.token)[method](url)).status).toBe(403);
    });
});

describe("GET /api/admin/users and /users/:id", () => {
    it("200 and an envelope", async () => {
        const res = await as(admin.token).get("/api/admin/users");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.total).toBe(res.body.items.length);
    });

    it("200 for one user, 404 for an id that does not exist", async () => {
        expect((await as(admin.token).get(`/api/admin/users/${backer.id}`)).status).toBe(200);

        // This handler maps EVERY failure to 404 — right for "not found", wrong for a
        // database error, which the restructure separates.
        const missing = await as(admin.token).get("/api/admin/users/99999999");

        expect(missing.status).toBe(404);
        expect(missing.body.message).toBe("User not found");
    });
});

describe("GET /api/admin/projects", () => {
    it("200 and includes projects of every status", async () => {
        const pending = await makeProject({ creatorId: creator.id, status: "PENDING" });

        const res = await as(admin.token).get("/api/admin/projects");

        expect(res.status).toBe(200);
        expect(res.body.items.map((p) => p.id)).toContain(pending.id);
    });

    // Once creator_id points at the creator, created_by_admin_id is the ONLY remaining
    // trace of who actually filed an on-behalf project — and this listing is the only
    // place it is joined to a name. Two screens depend on it: AdminApprovals reads the
    // id to HIDE approve/reject from the admin who filed the project, and the review
    // panel prints the name. Losing the join costs the id as well, and the
    // conflict-of-interest rule then holds only in the service, with the buttons back
    // on screen for the one admin who must not press them.
    it("joins the name of the admin who filed an on-behalf project", async () => {
        const filingAdmin = await makeUser({ roles: ["ADMIN"], name: "Filing Admin" });
        const onBehalf = await makeProject({
            creatorId: creator.id,
            status: "PENDING",
            createdByAdminId: filingAdmin.id,
        });
        const ownProject = await makeProject({ creatorId: creator.id, status: "PENDING" });

        const res = await as(admin.token).get("/api/admin/projects");
        const filed = res.body.items.find((p) => p.id === onBehalf.id);
        const unfiled = res.body.items.find((p) => p.id === ownProject.id);

        expect(Number(filed.created_by_admin_id)).toBe(filingAdmin.id);
        expect(filed.created_by_admin_name).toBe("Filing Admin");

        // NULL means "the creator filed it themselves", which is every project made
        // before 2026-08-24 — so the join must not invent a name for those.
        expect(unfiled.created_by_admin_id).toBeNull();
        expect(unfiled.created_by_admin_name).toBeNull();
    });
});

describe("PATCH /api/admin/users/:id/deactivate and /activate", () => {
    it("200, and the deactivated account is refused by authenticate on its next request", async () => {
        const victim = await makeUser({ roles: ["BACKER"] });

        const res = await as(admin.token).patch(`/api/admin/users/${victim.id}/deactivate`);

        expect(res.status).toBe(200);
        expect((await as(victim.token).get("/api/users/profile")).status).toBe(403);

        expect((await as(admin.token).patch(`/api/admin/users/${victim.id}/activate`)).status).toBe(200);
        expect((await as(victim.token).get("/api/users/profile")).status).toBe(200);
    });

    // Without this guard an admin can deactivate themselves and be signed out on the
    // next request with no route back — authenticate rejects an inactive account.
    it("403 when an admin deactivates their own account", async () => {
        const res = await as(admin.token).patch(`/api/admin/users/${admin.id}/deactivate`);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You cannot deactivate your own account.");
    });

    it("409 on a repeated deactivate or activate", async () => {
        const victim = await makeUser({ roles: ["BACKER"] });

        await as(admin.token).patch(`/api/admin/users/${victim.id}/deactivate`);

        expect((await as(admin.token).patch(`/api/admin/users/${victim.id}/deactivate`)).status).toBe(409);

        await as(admin.token).patch(`/api/admin/users/${victim.id}/activate`);

        expect((await as(admin.token).patch(`/api/admin/users/${victim.id}/activate`)).status).toBe(409);
    });
});

describe("PATCH /api/admin/users/:id/roles", () => {
    it("200 and REPLACES the whole set", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const res = await as(admin.token)
            .patch(`/api/admin/users/${user.id}/roles`)
            .send({ roles: ["BACKER", "CREATOR"] });

        expect(res.status).toBe(200);
        expect(res.body.user.roles.sort()).toEqual(["BACKER", "CREATOR"]);

        const stripped = await as(admin.token).patch(`/api/admin/users/${user.id}/roles`).send({ roles: ["BACKER"] });

        expect(stripped.body.user.roles).toEqual(["BACKER"]);
    });

    it("422 when roles is not an array, or names a role that does not exist", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const notArray = await as(admin.token).patch(`/api/admin/users/${user.id}/roles`).send({ roles: "ADMIN" });
        const unknown = await as(admin.token).patch(`/api/admin/users/${user.id}/roles`).send({ roles: ["WIZARD"] });

        expect(notArray.status).toBe(422);
        expect(unknown.status).toBe(422);
        expect(unknown.body.message).toContain("Unknown role(s): WIZARD");
        expect(unknown.body.details).toEqual([{ field: "roles", message: "Unknown role(s): WIZARD" }]);
    });

    // An admin account holds ADMIN and nothing else: it owns no projects and no Class
    // Coins, so the combinations refused here have no meaning left.
    it("409 for ADMIN combined with any other role", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        const res = await as(admin.token)
            .patch(`/api/admin/users/${user.id}/roles`)
            .send({ roles: ["ADMIN", "BACKER"] });

        // 409, not 422: every name in the set is real and spelled right. What is refused
        // is the combination, which is a rule about the domain rather than the shape.
        expect(res.status).toBe(409);
        expect(res.body.message).toContain("holds the ADMIN role only");
    });

    it("403 when an admin removes their own ADMIN role", async () => {
        const res = await as(otherAdmin.token)
            .patch(`/api/admin/users/${otherAdmin.id}/roles`)
            .send({ roles: ["BACKER"] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You cannot remove your own ADMIN role.");
    });

    // ⚠️ Order: the exclusion check runs BEFORE the self-lockout guard, so an admin
    // editing their own account reads the rule rather than the lockout.
    it("reports the ADMIN-only rule, not the lockout, when an admin adds a role to themselves", async () => {
        const res = await as(otherAdmin.token)
            .patch(`/api/admin/users/${otherAdmin.id}/roles`)
            .send({ roles: ["ADMIN", "CREATOR"] });

        expect(res.status).toBe(409);
        expect(res.body.message).toContain("holds the ADMIN role only");
    });
});

describe("the creator-request queue", () => {
    const registerWanting = async (wantCreator) => {
        const email = uniqueEmail("creator-request");

        await request(app)
            .post("/api/auth/register")
            .send({ fullName: "Applicant", email, password: PASSWORD, wantCreator });

        const login = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });

        return { email, token: login.body.accessToken, id: login.body.user.id };
    };

    it("ticking the box at sign-up files a PENDING request", async () => {
        const applicant = await registerWanting(true);

        const res = await as(admin.token).get("/api/admin/creator-requests");

        expect(res.status).toBe(200);
        expect(res.body.items.map((r) => r.user_id)).toContain(applicant.id);
    });

    it("not ticking it files nothing", async () => {
        const applicant = await registerWanting(false);

        const res = await as(admin.token).get("/api/admin/creator-requests");

        expect(res.body.items.map((r) => r.user_id)).not.toContain(applicant.id);
    });

    // Approving is the only route to CREATOR besides an admin assigning it by hand:
    // createProject deliberately no longer grants the role.
    it("approving grants CREATOR, and the account can then create a project", async () => {
        const applicant = await registerWanting(true);

        const queue = await as(admin.token).get("/api/admin/creator-requests");
        const row = queue.body.items.find((r) => r.user_id === applicant.id);

        const approved = await as(admin.token).patch(`/api/admin/creator-requests/${row.id}/approve`);

        expect(approved.status).toBe(200);

        const { rows } = await pool.query(
            `select r.name from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1 order by r.name`,
            [applicant.id]
        );

        expect(rows.map((r) => r.name)).toEqual(["BACKER", "CREATOR"]);
    });

    it("rejecting leaves the account a BACKER", async () => {
        const applicant = await registerWanting(true);

        const queue = await as(admin.token).get("/api/admin/creator-requests");
        const row = queue.body.items.find((r) => r.user_id === applicant.id);

        expect((await as(admin.token).patch(`/api/admin/creator-requests/${row.id}/reject`)).status).toBe(200);

        const { rows } = await pool.query(
            `select r.name from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1`,
            [applicant.id]
        );

        expect(rows.map((r) => r.name)).toEqual(["BACKER"]);
    });

    it("409 on a second verdict for the same request, and 404 on an id that does not exist", async () => {
        const applicant = await registerWanting(true);

        const queue = await as(admin.token).get("/api/admin/creator-requests");
        const row = queue.body.items.find((r) => r.user_id === applicant.id);

        await as(admin.token).patch(`/api/admin/creator-requests/${row.id}/approve`);

        const again = await as(admin.token).patch(`/api/admin/creator-requests/${row.id}/reject`);

        expect(again.status).toBe(409);
        expect(again.body.message).toBe("Creator request has already been reviewed.");

        expect((await as(admin.token).patch("/api/admin/creator-requests/99999999/approve")).status).toBe(404);
    });
});
