const pool = require("../config/db");

// Create Project.
// `client = pool` so projectService can wrap the project and its support levels in one
// transaction — a project that saved but whose levels did not is the worst outcome
// there, because the wizard latches after a successful submit and the creator would
// believe the levels exist.
async function createProject(project, client = pool) {
    const result = await client.query(
        `
        INSERT INTO projects
        (
            creator_id,
            title,
            description,
            category,
            goal_amount,
            current_amount,
            image_url,
            status,
            team_members,
            start_date,
            end_date,
            challenge,
            solution,
            funding_usage,
            gallery,
            solution_bullets,
            video_url,
            created_by_admin_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING *
        `,
        [
            project.creator_id,
            project.title,
            project.description,
            project.category,
            project.goal_amount,
            project.current_amount,
            project.image_url,
            project.status,
            JSON.stringify(project.team_members),
            project.start_date,
            project.end_date,
            project.challenge,
            project.solution,
            project.funding_usage,
            JSON.stringify(project.gallery ?? []),
            JSON.stringify(project.solution_bullets ?? []),
            // A link, not a file. The wizard has always REQUIRED a video and had
            // nowhere to put it (schema.sql known issue #7) — this is that column.
            project.video_url,
            // NULL unless an ADMIN filed this for the creator named in creator_id.
            // projectService.resolveOwnership is the only thing that ever sets it.
            project.created_by_admin_id ?? null
        ]
    );

    return result.rows[0];
}

// Get all projects.
// ADMIN-ONLY (adminController.getAllProjects) — it returns every status AND the
// creator's email, so do not reuse it for a public route.
// The join replaces the "Creator #14" placeholder in AdminDashboard / AdminApprovals.
async function findAll() {
    const result = await pool.query(
        `
        SELECT p.*,
               u.full_name AS creator_name,
               u.email     AS creator_email,
               -- The admin dashboard lists archived projects too, and has to name who
               -- archived each one before offering RESTORE / DELETE PERMANENTLY.
               a.full_name AS archived_by_name,
               -- Who FILED it, when that was not the owner. The reviewer needs the
               -- name on screen ("Created on behalf by …") and AdminApprovals needs
               -- the id to hide APPROVE/REJECT from the admin who filed it.
               b.full_name AS created_by_admin_name
        FROM projects p
        LEFT JOIN users u ON u.id = p.creator_id
        LEFT JOIN users a ON a.id = p.archived_by
        LEFT JOIN users b ON b.id = p.created_by_admin_id
        ORDER BY p.created_at DESC
        `
    );

    return result.rows;
}

// The PUBLIC catalogue behind Discover. `archived_at IS NULL` is the whole reason
// archiving hides a project: this is the only list a backer browses from.
// findAll (admin), findByCreatorId (My Projects) and findById (detail page) all keep
// returning archived rows on purpose — those three are exactly where you go to see,
// restore or permanently delete one.
async function findAllApprovedProjects() {
    const result = await pool.query(
        `
        SELECT *
        FROM projects
        WHERE status = 'APPROVED'
          AND archived_at IS NULL
        ORDER BY created_at DESC;
        `
    );

    return result.rows;
}

// Get project by ID.
// Serves the PUBLIC route GET /projects/:id, so it joins the creator's NAME only —
// never the email, which would then be readable by anyone.
// backers_count is DISTINCT wallets, not rows: investing three times still counts
// as one backer.
async function findById(id, client = pool) {
    const result = await client.query(
        `
        SELECT p.*,
               u.full_name AS creator_name,
               u.title     AS creator_title,
               -- Who archived it, by name. The UI has to say "Archived by <someone>",
               -- and a bare id would render as a number. NULL when not archived, and
               -- also when the archiver's account was since deleted (SET NULL).
               a.full_name AS archived_by_name,
               (
                   SELECT COUNT(DISTINCT ct.classcoin_id)::int
                   FROM classcoin_transactions ct
                   WHERE ct.project_id = p.id
                     AND ct.type = 'INVEST'
               ) AS backers_count,
               (
                   SELECT COUNT(*)::int
                   FROM comments c
                   WHERE c.project_id = p.id
               ) AS comments_count
        FROM projects p
        LEFT JOIN users u ON u.id = p.creator_id
        LEFT JOIN users a ON a.id = p.archived_by
        WHERE p.id = $1
        `,
        [id]
    );

    return result.rows[0];
}

//Find all projects by User ID
async function findByCreatorId(userId) {

    const result = await pool.query(
        `
        SELECT p.*,
               -- My Projects shows archived cards too. When an ADMIN archived it the
               -- creator cannot restore it, so the card names who did and why.
               a.full_name AS archived_by_name,
               -- Same two subqueries findById already runs. They are here so the creator
               -- dashboard can total backers and comments from THIS one request instead
               -- of calling GET /projects/:id once per project.
               (
                   SELECT COUNT(DISTINCT ct.classcoin_id)::int
                   FROM classcoin_transactions ct
                   WHERE ct.project_id = p.id
                     AND ct.type = 'INVEST'
               ) AS backers_count,
               (
                   SELECT COUNT(*)::int
                   FROM comments c
                   WHERE c.project_id = p.id
               ) AS comments_count
        FROM projects p
        LEFT JOIN users a ON a.id = p.archived_by
        WHERE p.creator_id = $1
        ORDER BY p.created_at DESC
        `,
        [userId]
    );

    return result.rows;
}

// Everyone who has invested in ANY project owned by this creator, biggest first.
//
// Grouped by WALLET OWNER, not by transaction: investing three times into two of the
// creator's projects is one row totalling all three. That matches backers_count above,
// which also counts distinct wallets.
//
// The JOIN to projects is what scopes this to one creator — a transaction whose project
// was deleted carries project_id = NULL (ON DELETE SET NULL) and drops out here, which
// is what we want: it is no longer a backer of anything.
async function findBackersByCreatorId(userId) {

    const result = await pool.query(
        `
        SELECT u.id                                AS user_id,
               u.full_name,
               SUM(ct.amount)::int                 AS total_amount,
               COUNT(DISTINCT ct.project_id)::int  AS project_count,
               MAX(ct.created_at)                  AS last_invested_at,
               -- The row is one PERSON across several investments, so it has to pick
               -- ONE support level to show: the highest they ever chose. That is the
               -- strongest signal they sent, and the one people describe themselves by.
               MAX(t.min_amount)::int                                       AS top_tier_min,
               (ARRAY_AGG(t.name ORDER BY t.min_amount DESC NULLS LAST))[1] AS top_tier_name
        FROM classcoin_transactions ct
        JOIN classcoins c ON c.id = ct.classcoin_id
        JOIN users u      ON u.id = c.user_id
        JOIN projects p   ON p.id = ct.project_id
        -- LEFT, never a plain JOIN: most transactions have tier_id = NULL (everything
        -- before 2026-08-20, plus every "no level — just support" choice), and an inner
        -- join would delete those backers from this list entirely.
        LEFT JOIN project_tiers t ON t.id = ct.tier_id
        WHERE p.creator_id = $1
          AND ct.type = 'INVEST'
        GROUP BY u.id, u.full_name
        ORDER BY total_amount DESC, last_invested_at DESC
        `,
        [userId]
    );

    return result.rows;
}

// Update project
async function updateProject(id, project) {
    const result = await pool.query(
        `
        UPDATE projects
        SET
            title=$1,
            description=$2,
            category=$3,
            goal_amount=$4,
            image_url=$5,
            team_members=$6,
            challenge=$7,
            solution=$8,
            funding_usage=$9,
            gallery=$10,
            solution_bullets=$11,
            video_url=$12,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$13
        RETURNING *
        `,
        [
            project.title,
            project.description,
            project.category,
            project.goal_amount,
            project.image_url,
            // MUST be stringified, exactly like createProject does. team_members is a
            // jsonb column; handing node-postgres a raw JS array makes it send a Postgres
            // array literal ({...}) and every save failed with
            // "invalid input syntax for type json" — so PUT /projects/:id never worked.
            JSON.stringify(project.team_members ?? []),
            project.challenge,
            project.solution,
            project.funding_usage,
            JSON.stringify(project.gallery ?? []),
            JSON.stringify(project.solution_bullets ?? []),
            project.video_url,
            id
        ]
    );

    return result.rows[0];
}

// review_note is cleared here on purpose: it explains the CURRENT verdict, so leaving a
// rejection note on a now-approved project would show the creator a stale complaint about
// something they have already fixed.
async function approveProject(id) {

    const result = await pool.query(
        `
        UPDATE projects
        SET status = 'APPROVED',
            review_note = NULL
        WHERE id = $1
        RETURNING *;
        `,
        [id]
    );

    return result.rows[0];
}

// Back into the approval queue after the creator has revised a rejected project.
// Clears the old note for the same reason approve does — the board is about to write a
// new verdict, and the previous one no longer describes what they are looking at.
async function resubmitProject(id) {

    const result = await pool.query(
        `
        UPDATE projects
        SET status = 'PENDING',
            review_note = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
        `,
        [id]
    );

    return result.rows[0];
}

// The "RMIT Endorsed" badge on the project page. Admin-only — it is a university
// endorsement, so a creator must not be able to award it to themselves.
async function setEndorsed(id, endorsed) {

    const result = await pool.query(
        `
        UPDATE projects
        SET endorsed = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
        `,
        [endorsed, id]
    );

    return result.rows[0];
}

// `note` is the reviewer's explanation. AdminApprovals has always collected it in the
// review screen's feedback box and then thrown it away, because there was nowhere to put
// it — that is what the review_note column is for.
async function rejectProject(id, note) {

    const result = await pool.query(
        `
        UPDATE projects
        SET status = 'REJECTED',
            review_note = $2
        WHERE id = $1
        RETURNING *;
        `,
        [id, note || null]
    );

    return result.rows[0];
}

// Archive (soft delete). Writes the visibility axis only — `status` is NOT touched,
// which is what lets restoreProject put the project back on Discover with the same
// APPROVED verdict instead of sending it round the moderation queue again.
async function archiveProject(id, archivedBy, reason) {

    const result = await pool.query(
        `
        UPDATE projects
        SET archived_at    = CURRENT_TIMESTAMP,
            archived_by    = $2,
            archive_reason = $3,
            updated_at     = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
        `,
        [id, archivedBy, reason || null]
    );

    return result.rows[0];
}

// Restore. Clears all three columns together — "archived" is `archived_at IS NOT NULL`,
// so leaving archived_by or archive_reason behind would show a stale "archived by X"
// note on a live project.
async function restoreProject(id) {

    const result = await pool.query(
        `
        UPDATE projects
        SET archived_at    = NULL,
            archived_by    = NULL,
            archive_reason = NULL,
            updated_at     = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
        `,
        [id]
    );

    return result.rows[0];
}

// Permanent delete. Still a hard DELETE with the same cascade as before (comments and
// project_updates go with it, classcoin_transactions.project_id is set to NULL) — but
// the service now only reaches it for an ADMIN acting on an already-archived project,
// so it can no longer be the first thing a mis-click does.
async function deleteProject(id) {
    await pool.query(
        "DELETE FROM projects WHERE id=$1",
        [id]
    );
}

// `client` is REQUIRED to be the caller's transaction client during an investment.
// Without the parameter this ran on its own pool connection, so a later ROLLBACK in
// investProject left the project funded with coins that were never deducted.
async function increaseCurrentAmount(projectId, amount, client = pool) {
    const result = await client.query(
        `
        UPDATE projects
        SET
            current_amount = current_amount + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
        `,
        [amount, projectId]
    );

    return result.rows[0];
}

module.exports = {
    createProject,
    findAll,
    findAllApprovedProjects,
    findById,
    findByCreatorId,
    findBackersByCreatorId,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    approveProject,
    resubmitProject,
    rejectProject,
    setEndorsed,
    increaseCurrentAmount
};