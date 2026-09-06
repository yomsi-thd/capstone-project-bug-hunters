/**
 * Builds the throwaway schema once per run and drops it again at the end.
 *
 * This runs in Vitest's MAIN process, before any worker starts, which is the only
 * place a one-off setup belongs: `setupFiles` runs once per test FILE and would
 * rebuild the schema underneath tests that are already using it.
 *
 * The schema name is decided in vitest.config.mjs (see the note there) so that this
 * file and the workers agree on it without having to pass anything between processes.
 *
 * ESM rather than the CommonJS the rest of `backend/` uses: Vitest reads `setup` and
 * `teardown` as named exports, and a CommonJS `module.exports = { setup, teardown }`
 * arrives as a single `default` object that it rejects.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "dotenv/config";
import pg from "pg";

import { resolveTestDatabase } from "./testDatabase.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_SQL = path.join(HERE, "..", "schema.sql");

function adminPool() {
    // Deliberately NOT the scoped connection: creating and dropping the schema has to
    // happen from outside it.
    return new pg.Pool({
        connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
}

export async function setup() {
    const { url, schema } = resolveTestDatabase(process.env.TEST_SCHEMA);

    const admin = adminPool();

    try {
        await admin.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    } finally {
        await admin.end();
    }

    // `schema.sql` is the team's single source of truth for the database and is kept in
    // step BY HAND — there is no migrations folder. Building it here is therefore also a
    // standing check that it still builds at all.
    const scoped = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

    try {
        await scoped.query(fs.readFileSync(SCHEMA_SQL, "utf8"));

        // ⚠️ Guarantee that ONE semester contains today, whenever "today" happens to be.
        //
        // Since 2026-09-06 `POST /api/projects` refuses with 409 unless a semester is
        // open, so every creation test in the suite silently depends on the wall clock
        // falling inside one of the three rows schema.sql seeds. Those run out on
        // 23 Jan 2027, and the failure would arrive as a dozen red tests across four
        // files with nothing in the diff to explain them.
        //
        // Widening the latest already-started semester keeps that from ever happening,
        // and deliberately does NOT insert a row: an extra overlapping semester would
        // change what findOpenSemester answers and quietly weaken semesters.test.js.
        await scoped.query(`
            UPDATE semesters SET end_date = GREATEST(end_date, CURRENT_DATE + 30)
            WHERE start_date = (SELECT MAX(start_date) FROM semesters WHERE start_date <= CURRENT_DATE);
        `);
    } finally {
        await scoped.end();
    }

    console.log(`[test-db] built schema.sql into "${schema}"`);
}

export async function teardown() {
    const { schema } = resolveTestDatabase(process.env.TEST_SCHEMA);

    const admin = adminPool();

    try {
        await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
        console.log(`[test-db] dropped "${schema}"`);
    } finally {
        await admin.end();
    }
}
