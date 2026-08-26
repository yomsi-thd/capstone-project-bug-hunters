/**
 * Runs inside each worker BEFORE any test file is evaluated — which is the whole
 * point. `src/config/db.js` reads process.env.DATABASE_URL once, at require time, so
 * the only moment the app's pool can be pointed at the test schema is before the
 * first `require("../src/app")`.
 */

require("dotenv").config({ quiet: true });

const { resolveTestDatabase } = require("./testDatabase");

const { url, schema } = resolveTestDatabase(process.env.TEST_SCHEMA);

// dotenv never overwrites a variable that is already set, so assigning here wins over
// the .env file no matter which module calls config() next.
process.env.DATABASE_URL = url;
process.env.TEST_SCHEMA = schema;

// utils/jwt.js reads both of these at module load and does not call dotenv itself; it
// only works today because config/db.js happens to be required first. Defaults keep the
// suite runnable on a machine that has DATABASE_URL but no secrets (CI).
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
