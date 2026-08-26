/**
 * Where the backend tests are allowed to run, and how they are kept away from the
 * team's real data.
 *
 * Two ways in:
 *
 *   TEST_DATABASE_URL set    -> use that server (CI's throwaway Postgres).
 *   not set                  -> fall back to DATABASE_URL, i.e. the SHARED Supabase.
 *
 * The second one is the dangerous default, and it is deliberate: this machine has
 * neither Docker nor psql, so a local Postgres is not an option and the alternative
 * would be "no backend tests at all". What makes it safe is that the tests never run
 * in the `public` schema. Every run gets its OWN schema, `schema.sql` is built into
 * it, and it is dropped again at the end — so the tables the app normally talks to
 * are never opened.
 *
 * ⚠️ ONE RULE, enforced here rather than remembered: the schema must be named
 * `test_…` and must never be `public`. The e2e scripts of 2026-08-20 spent
 * TestBacker's real Class Coins and had to be repaid by hand; that is the accident
 * this guard exists to make impossible, not merely unlikely.
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
 * Resolve the database this run uses. Throws — loudly, with the reason — rather than
 * falling back to anything that could touch real rows.
 */
function resolveTestDatabase(schemaName) {
    const base = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

    if (!base) {
        throw new Error(
            "Neither TEST_DATABASE_URL nor DATABASE_URL is set, so there is no database " +
            "to test against. Copy backend/.env into place first."
        );
    }

    // A schema named in TEST_DATABASE_URL wins, so CI can pin one; otherwise this run
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
