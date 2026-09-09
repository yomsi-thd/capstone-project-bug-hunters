/**
 * Builds the throwaway schema once per run and drops it again at the end.
 *
 * It runs in Vitest's main process, before any worker starts, which is where a one-off
 * setup belongs: `setupFiles` runs once per test file and would rebuild the schema
 * underneath tests already using it.
 *
 * The schema name is decided in vitest.config.mjs so this file and the workers agree on
 * it without passing anything between processes.
 *
 * ESM rather than the CommonJS the rest of backend/ uses, because Vitest reads `setup`
 * and `teardown` as named exports and rejects a CommonJS module.exports object.
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
    // Not the scoped connection: creating and dropping the schema happens from outside
    // it.
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

    // schema.sql is the single source of truth for the database and is kept in step by
    // hand, since there is no migrations folder. Building it here is also a standing
    // check that it still builds.
    const scoped = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

    try {
        await scoped.query(fs.readFileSync(SCHEMA_SQL, "utf8"));

        // Guarantees that one semester contains today, whatever the date is.
        //
        // POST /api/projects refuses with 409 unless a semester is open, so every
        // creation test depends on the clock falling inside one of the rows schema.sql
        // seeds. Once those run out the failure would arrive as a dozen red tests across
        // four files with nothing in the diff to explain them.
        //
        // It widens the latest already-started semester rather than inserting a row: an
        // extra overlapping semester would change what findOpenSemester answers and
        // quietly weaken semesters.test.js.
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
