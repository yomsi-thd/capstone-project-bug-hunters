const pool = require("../config/db");

/**
 * Runs `work` inside one transaction and hands it the client to use. Commits when it
 * returns, rolls back when it throws, releases the connection either way.
 *
 *     const project = await withTransaction(async (client) => {
 *         const created = await projectRepository.createProject(row, client);
 *         await tierRepository.create({ project_id: created.id, ...tier }, client);
 *         return created;
 *     });
 *
 * Every query inside `work` has to be given `client`. One that forgets takes its own
 * connection from the pool, commits on its own, and survives the rollback.
 */
async function withTransaction(work) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await work(client);

        await client.query("COMMIT");

        return result;
    } catch (err) {
        // Swallowed on purpose. A failing ROLLBACK means the connection is already
        // broken, and throwing here would replace the real error with that one.
        await client.query("ROLLBACK").catch(() => {});

        throw err;
    } finally {
        client.release();
    }
}

module.exports = withTransaction;
