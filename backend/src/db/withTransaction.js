const pool = require("../config/db");

/**
 * Runs `work` inside one database transaction and hands it the client to use.
 *
 * Commits when it returns, rolls back when it throws, and releases the connection
 * either way.
 *
 *     const project = await withTransaction(async (client) => {
 *         const created = await projectRepository.createProject(row, client);
 *         await tierRepository.create({ project_id: created.id, ...tier }, client);
 *         return created;
 *     });
 *
 * ⚠️ THE ONE RULE: every query inside `work` must be given `client`. A repository call
 * that forgets it takes a SEPARATE connection from the pool, outside the transaction —
 * so it commits on its own and the ROLLBACK cannot undo it.
 *
 * This is not hypothetical. On 2026-08-06 `increaseCurrentAmount` ignored the client it
 * was passed: an investment that failed after the funding bump left the project funded
 * by Class Coins the backer still had. The helper cannot detect that mistake, but having
 * one place where the client is created makes it the obvious thing to look for.
 *
 * There were four hand-copied BEGIN/COMMIT/ROLLBACK blocks before this, and the danger
 * of a copied shape is not that one is written wrong today — it is that a fix applied to
 * one of them silently leaves the other three behind.
 */
async function withTransaction(work) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await work(client);

        await client.query("COMMIT");

        return result;
    } catch (err) {
        // Deliberately swallowed: if ROLLBACK itself fails the connection is already
        // broken, and letting that error escape would REPLACE the real reason the
        // transaction failed with a confusing one about connection state. The original
        // is what the caller needs.
        await client.query("ROLLBACK").catch(() => {});

        throw err;
    } finally {
        client.release();
    }
}

module.exports = withTransaction;
