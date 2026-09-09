/**
 * The one query that decides whether somebody is on a project's team. Both the invest
 * rule and the project page read it, so its edge cases are pinned here rather than in
 * either caller: old rows carry shapes the wizard can no longer produce.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import { app, pool, makeUser, makeProject, as } from "./helpers/factories.js";
import projectRepository from "../src/repositories/projectRepository.js";

let creator;
let member;
let stranger;

beforeAll(async () => {
    creator = await makeUser({ roles: ["CREATOR"] });
    member = await makeUser({ roles: ["BACKER"], balance: 1000 });
    stranger = await makeUser({ roles: ["BACKER"], balance: 1000 });
});

describe("projectRepository.isTeamMemberByEmail", () => {
    it("true when the email matches a listed member", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: [{ name: "A member", role: "Student Developer", email: member.email }],
        });

        expect(await projectRepository.isTeamMemberByEmail(project.id, member.id)).toBe(true);
    });

    it("false for somebody not listed", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: [{ name: "A member", role: "Student Developer", email: member.email }],
        });

        expect(await projectRepository.isTeamMemberByEmail(project.id, stranger.id)).toBe(false);
    });

    it("matches regardless of case, so changing one letter is not a way around it", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: [
                { name: "A member", role: "Student Developer", email: member.email.toUpperCase() },
            ],
        });

        expect(await projectRepository.isTeamMemberByEmail(project.id, member.id)).toBe(true);
    });

    it("false for an empty team", async () => {
        const project = await makeProject({ creatorId: creator.id, teamMembers: [] });

        expect(await projectRepository.isTeamMemberByEmail(project.id, member.id)).toBe(false);
    });

    it("ignores a member with no email rather than matching everybody", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: [{ name: "No address", role: "Co-Investigator" }],
        });

        expect(await projectRepository.isTeamMemberByEmail(project.id, member.id)).toBe(false);
    });

    // Older rows can hold a bare string where the wizard now writes an object.
    it("ignores a member stored as a bare string", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: ["Just a name"],
        });

        expect(await projectRepository.isTeamMemberByEmail(project.id, member.id)).toBe(false);
    });

    // jsonb_array_elements raises an error on a value that is not an array, so the query
    // has to check the type before expanding it.
    it("returns false rather than throwing when team_members is not an array", async () => {
        const project = await makeProject({ creatorId: creator.id });
        await pool.query("update projects set team_members = '{}'::jsonb where id = $1", [project.id]);

        expect(await projectRepository.isTeamMemberByEmail(project.id, member.id)).toBe(false);
    });
});

describe("GET /api/projects/:id and team emails", () => {
    it("hides team emails from a reader who is not the creator", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: [{ name: "A member", role: "Student Developer", email: member.email }],
        });

        const res = await as(stranger.token).get(`/api/projects/${project.id}`);

        expect(res.status).toBe(200);
        expect(res.body.team_members[0].name).toBe("A member");
        expect(res.body.team_members[0].email).toBeUndefined();
    });

    // EditProject has to show the creator what they typed, or they can never correct it.
    it("keeps team emails for the creator", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: [{ name: "A member", role: "Student Developer", email: member.email }],
        });

        const res = await as(creator.token).get(`/api/projects/${project.id}`);

        expect(res.body.team_members[0].email).toBe(member.email);
    });

    it("tells a listed member that they are on the team", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: [{ name: "A member", role: "Student Developer", email: member.email }],
        });

        const res = await as(member.token).get(`/api/projects/${project.id}`);

        expect(res.body.viewer_is_team_member).toBe(true);
    });

    it("false for a reader who is not on the team", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: [{ name: "A member", role: "Student Developer", email: member.email }],
        });

        const res = await as(stranger.token).get(`/api/projects/${project.id}`);

        expect(res.body.viewer_is_team_member).toBe(false);
    });

    // The route is authOptional, so a signed-out reader must not cost a query or an error.
    it("false for a signed-out reader", async () => {
        const project = await makeProject({
            creatorId: creator.id,
            teamMembers: [{ name: "A member", role: "Student Developer", email: member.email }],
        });

        const res = await request(app).get(`/api/projects/${project.id}`);

        expect(res.status).toBe(200);
        expect(res.body.viewer_is_team_member).toBe(false);
    });
});
