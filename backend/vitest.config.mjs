import "dotenv/config";
import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const { newSchemaName } = require("./test/testDatabase.js");

// Decided HERE, once, because this file is evaluated in the main process before both
// globalSetup and the workers. globalSetup reads it straight from process.env (same
// process); the workers get it through `test.env`, which Vitest forwards. Deciding it
// in either of those two places instead would give them different names.
process.env.TEST_SCHEMA = process.env.TEST_SCHEMA || newSchemaName();

export default defineConfig({
    test: {
        environment: "node",
        include: ["test/*.test.js", "test/**/*.test.js"],
        globalSetup: ["./test/globalSetup.js"],
        setupFiles: ["./test/setup.js"],
        env: { TEST_SCHEMA: process.env.TEST_SCHEMA },

        // One process, one file at a time. Every test shares a single Postgres schema,
        // so running files in parallel would have them deleting each other's rows — and
        // the suite deliberately includes a race test, which needs to be the only race
        // in flight. (Vitest 4 moved these up from `poolOptions`.)
        pool: "forks",
        fileParallelism: false,
        maxWorkers: 1,
        minWorkers: 1,

        // Supabase is a network hop away and bcrypt is intentionally slow, so the
        // 5s default trips on honest tests.
        testTimeout: 30000,
        hookTimeout: 60000,
    },
});
