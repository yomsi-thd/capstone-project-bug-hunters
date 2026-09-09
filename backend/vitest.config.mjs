import "dotenv/config";
import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const { newSchemaName } = require("./test/testDatabase.js");

// Set here, once. This file runs in the main process before both globalSetup and the
// workers. globalSetup reads process.env directly (same process), the workers get it
// through `test.env`. Setting it in either of those places instead would give them
// different schema names.
process.env.TEST_SCHEMA = process.env.TEST_SCHEMA || newSchemaName();

export default defineConfig({
    test: {
        environment: "node",
        include: ["test/*.test.js", "test/**/*.test.js"],
        globalSetup: ["./test/globalSetup.js"],
        setupFiles: ["./test/setup.js"],
        env: { TEST_SCHEMA: process.env.TEST_SCHEMA },

        // One process, one file at a time. Every test shares one Postgres schema, so
        // parallel files would delete each other's rows. The suite also has a race test
        // that must be the only race in flight.
        // (Vitest 4 moved these up out of `poolOptions`.)
        pool: "forks",
        fileParallelism: false,
        maxWorkers: 1,
        minWorkers: 1,

        // Supabase is a network hop away and bcrypt is slow on purpose, so the 5s
        // default trips on tests that are fine.
        testTimeout: 30000,
        hookTimeout: 60000,
    },
});
