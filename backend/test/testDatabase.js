/**
 * Where the backend tests are allowed to run, and how they are kept away from the team's
 * real data.
 *
 * Two ways in:
 *
 *   TEST_DATABASE_URL set  ->  use that server, which is CI's throwaway Postgres.
 *   not set                ->  fall back to DATABASE_URL, the shared database.
 *
 * The fallback is the dangerous one, and it is deliberate: without a local Postgres the
 * alternative is no backend tests at all. What makes it safe is that the tests never run
 * in the `public` schema. Every run gets its own, schema.sql is built into it, and it is
 * dropped at the end, so the tables the app normally uses are never opened.
 *
 * One rule, enforced here rather than remembered: the schema has to be named `test_...`
 * and must never be `public`. A script that got this wrong once spent a real account's
 * Class Coins, which had to be repaid by hand.
 */

const SCHEMA_PREFIX = "test_";

/** The schema a connection string asks for, or null when it names none. */
function schemaOf(url) {
    const options = new URL(url).searchParams.get("options");

    if (!options) return null;

    const match = /search_path\s*=\s*([^\s]+)/.exec(options);

    return match ? match[1] : null;
}

/** The same connection string, pinned to one schema. */
function withSchema(url, schema) {
    const parsed = new URL(url);

    parsed.searchParams.set("options", `-c search_path=${schema}`);

    return parsed.toString();
}

/** A name that cannot collide with a previous run, or with a second one today. */
function newSchemaName() {
    return `${SCHEMA_PREFIX}${Date.now()}_${process.pid}`;
}

/**
 * Resolves the database this run uses. Throws with the reason rather than falling back to
 * anything that could touch real rows.
 */
function resolveTestDatabase(schemaName) {
    const base = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

    if (!base) {
        throw new Error(
            "Neither TEST_DATABASE_URL nor DATABASE_URL is set, so there is no database " +
            "to test against. Copy backend/.env into place first."
        );
    }

    // A schema named in TEST_DATABASE_URL wins, so CI can pin one. Otherwise this run
    // invents its own.
    const schema = schemaOf(base) || schemaName || newSchemaName();

    if (schema === "public") {
        throw new Error(
            "The backend tests refuse to run in the `public` schema — that is where the " +
            "team's real data lives, and these tests create, invest and delete freely. " +
            "Point TEST_DATABASE_URL at a schema named test_… instead."
        );
    }

    if (!schema.startsWith(SCHEMA_PREFIX)) {
        throw new Error(
            `The test schema must be named ${SCHEMA_PREFIX}… so that dropping it at the ` +
            `end can never destroy anything else. Got "${schema}".`
        );
    }

    return { url: withSchema(base, schema), schema };
}

module.exports = { resolveTestDatabase, newSchemaName, schemaOf, withSchema, SCHEMA_PREFIX };
