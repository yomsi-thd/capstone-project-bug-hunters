import { describe, it, expect } from "vitest";
import { pool, makeUser } from "./helpers/factories.js";

describe("test harness", () => {
    it("runs inside a throwaway schema, never public", async () => {
        const { rows } = await pool.query("select current_schema() as schema");

        expect(rows[0].schema).toBe(process.env.TEST_SCHEMA);
        expect(rows[0].schema).not.toBe("public");
        expect(rows[0].schema.startsWith("test_")).toBe(true);
    });

    it("built schema.sql, roles seed included", async () => {
        const { rows } = await pool.query("select name from roles order by id");

        expect(rows.map((r) => r.name)).toEqual(["ADMIN", "BACKER", "CREATOR"]);
    });

    it("can make a signed-in user", async () => {
        const user = await makeUser({ roles: ["BACKER"] });

        expect(user.token).toBeTruthy();
    });
});
