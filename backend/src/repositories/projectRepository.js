const pool = require("../config/db");

// Create project. `client = pool` so projectService can wrap the project and its support
// levels in one transaction: a project that saved without its levels is the worst
// outcome, since the wizard latches after a successful submit and the creator would
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
            current_amount,
            image_url,
            status,
            team_members,
            -- The teaching period this project counts towards, decided by
            -- semesterService from whichever semester is open on the day. start_date and
            -- end_date are still on the table, holding an old per-project window on some
            -- rows, but nothing writes them any more.
            semester_id,
            challenge,
            solution,
            funding_usage,
            gallery,
            solution_bullets,
            video_url,
            created_by_admin_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING *
        `,
        [
            project.creator_id,
            project.title,
            project.description,
            project.category,
            project.current_amount,
            project.image_url,
            project.status,
            JSON.stringify(project.team_members),
            project.semester_id,
            project.challenge,
            project.solution,
            project.funding_usage,
            JSON.stringify(project.gallery ?? []),
            JSON.stringify(project.solution_bullets ?? []),
            // A link, not a file.
            project.video_url,
            // NULL unless an admin filed this for the creator named in creator_id.
            // projectService.resolveOwnership is the only thing that sets it.
            project.created_by_admin_id ?? null
        ]
    );

    return result.rows[0];
}

// Every project, for the admin screens only: it returns every status and the creator's
// email, so it must not be reused on a public route. The join is what gives those screens
// a creator name rather than an id.
async function findAll() {
    const result = await pool.query(
        `
        SELECT p.*,
               u.full_name AS creator_name,
               u.email     AS creator_email,
               -- The admin dashboard lists archived projects too, and names who
               -- archived each one before offering restore or permanent delete.
               a.full_name AS archived_by_name,
               -- Who filed it, when that was not the owner. The reviewer needs the name
               -- on screen, and the queue needs the id to hide APPROVE and REJECT from
               -- the admin who filed it.
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

/**
 * The teaching period a project belongs to, joined into the two reads that need it:
 * findById, for the detail page and every write that loads the project first, and
 * findByCreatorId, for My Projects.
 *
 * Postgres computes `semester_closed`, and that is the point. Handing the service
 * `end_date` to compare against new Date() brings back a timezone bug: end_date is a DATE
 * column, so node-postgres reads it as local midnight, and new Date() is the server's
 * clock, which is UTC on Render and UTC+7 on a dev machine. The two would lock a project
 * at different moments. CURRENT_DATE settles it in one place.
 *
 * COALESCE(..., false) is load-bearing, since semester_id is nullable and
 * NULL < CURRENT_DATE is NULL. It states outright that a project belonging to no semester
 * is not locked: failing open leaves an orphan editable, where failing closed would
 * freeze a live project.
 *
 * LEFT JOIN, never JOIN. A plain join would drop those same rows from the detail page.
 *
 * `semester_end_date` goes out as a "YYYY-MM-DD" string, like semesterRepository does: a
 * string with no time of day has no timezone to be shifted by.
 */
const SEMESTER_COLUMNS = `
               COALESCE(s.end_date < CURRENT_DATE, false) AS semester_closed,
               s.name                                     AS semester_name,
               TO_CHAR(s.end_date, 'YYYY-MM-DD')          AS semester_end_date`;

// The public catalogue behind Discover. `archived_at IS NULL` is what makes archiving
// hide a project, since this is the only list a backer browses from. findAll,
// findByCreatorId and findById all keep returning archived rows, because those three are
// where you go to see, restore or delete one.
//
// `limit` is optional with no default. Discover loads the whole catalogue and filters it
// in the browser, so a default page size would quietly reduce its search box to the first
// page. See http/envelope.js.
async function findAllApprovedProjects({ semesterId, limit = null, offset = 0 } = {}) {
    const result = await pool.query(
        `
        -- Named columns rather than SELECT *, and the omissions are the point.
        --
        -- This is the most-requested query in the app: every visit to Discover, and every
        -- keystroke in its search box, runs it. SELECT * would make each row carry the
        -- project's whole story and its gallery, a jsonb array of base64 data URIs.
        -- Images live inside the project row, which is a known schema issue, so a handful
        -- of real photo projects turn this response from kilobytes into megabytes on the
        -- one endpoint nobody can avoid.
        --
        -- The columns and the subquery below are exactly what mappers.toCard reads.
        -- Adding a field to the Discover card means adding it here too, which is the
        -- intended friction: it makes the cost visible at the point of choosing to pay it.
        --
        -- semester_id is the exception to "only what the card renders". The card shows
        -- the semester's name rather than its id, and there is no join to semesters here:
        -- the frontend has already loaded the semester list for its picker, so it can
        -- name the id itself, and a join for one short string is a cost paid on every
        -- keystroke.
        --
        -- backers_count is a subquery on the app's busiest read, which is worth naming.
        -- It is the same one findById and findByCreatorId already run, returns a single
        -- integer, and is the card's second real number now that there is no percentage.
        SELECT p.id,
               p.creator_id,
               p.title,
               p.description,
               p.category,
               p.status,
               p.image_url,
               p.current_amount,
               p.semester_id,
               p.created_at,
               -- Distinct wallets rather than transactions, so backing twice still
               -- counts as one person. The number is a head count.
               (
                   SELECT COUNT(DISTINCT ct.classcoin_id)::int
                   FROM classcoin_transactions ct
                   WHERE ct.project_id = p.id
                     AND ct.type = 'INVEST'
               ) AS backers_count
        FROM projects p
        WHERE p.status = 'APPROVED'
          AND p.archived_at IS NULL
          AND p.semester_id = $1
        -- created_at rather than current_amount. Ranking by support belongs to Discover,
        -- in its Most Supported row and its sort control, and this list has one caller
        -- that re-sorts in the browser, so ordering by the total here would change
        -- nothing anybody can see.
        ORDER BY p.created_at DESC
        ${limit == null ? "" : "LIMIT $2 OFFSET $3"};
        `,
        limit == null ? [semesterId] : [semesterId, limit, offset]
    );

    return result.rows;
}

// Only called when a caller asked for a page. An unpaginated read already knows its own
// total, so a second round trip would be waste.
async function countApprovedProjects({ semesterId } = {}) {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM projects
        WHERE status = 'APPROVED'
          AND archived_at IS NULL
          AND semester_id = $1;
        `,
        [semesterId]
    );

    return result.rows[0].total;
}

// One project. It serves the public route, so it joins the creator's name and never
// their email.
//
// backers_count counts distinct wallets rather than rows, so investing three times still
// counts as one backer.
//
// `viewerId` is whoever is reading the page and is used only by the my_contribution
// subquery. It defaults to null because most callers are writes that load the project
// first and have no reader.
async function findById(id, client = pool, viewerId = null) {
    const result = await client.query(
        `
        SELECT p.*,
               u.full_name AS creator_name,
               u.title     AS creator_title,
               -- Who archived it, by name, since the UI has to say "Archived by
               -- someone" and a bare id renders as a number. NULL when not archived, and
               -- also when the archiver's account has since been deleted.
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
               ) AS comments_count,
               -- What the reader already contributed, or NULL. It lets the sidebar
               -- replace the invest button with a confirmation rather than leave a
               -- control that can never work again.
               --
               -- NULL for a signed-out visitor, because the parameter is NULL and nothing
               -- joins, which is the right answer rather than a special case. It can only
               -- describe the caller: the id comes from the token, never the body.
               (
                   SELECT ct.amount::int
                   FROM classcoin_transactions ct
                   JOIN classcoins c ON c.id = ct.classcoin_id
                   WHERE ct.project_id = p.id
                     AND ct.type = 'INVEST'
                     AND c.user_id = $2
                   -- Deterministic: the earliest row. There is at most one per person
                   -- per project now, so this only decides the answer for older rows, but
                   -- an arbitrary LIMIT 1 would let the same page show different numbers
                   -- on two refreshes.
                   ORDER BY ct.created_at
                   LIMIT 1
               ) AS my_contribution,
               ${SEMESTER_COLUMNS}
        FROM projects p
        LEFT JOIN users u ON u.id = p.creator_id
        LEFT JOIN users a ON a.id = p.archived_by
        LEFT JOIN semesters s ON s.id = p.semester_id
        WHERE p.id = $1
        `,
        [id, viewerId]
    );

    return result.rows[0];
}

// Whether the reader is named on this project's team, matched by email.
//
// One query, called by both the invest rule and the project page, so the two can never
// answer differently. It is not folded into findById because loadVisibleProject shares
// that read with comments, updates and tiers, which would all pay for a subquery they
// discard.
//
// LOWER on both sides. Sign-in compares an address exactly and that is deliberate, but
// this is a rule rather than an authentication step, and a capital letter must not be a
// way around it.
//
// The CASE is not defensive noise. jsonb_array_elements raises an error on a value that
// is not an array, and it sits in a FROM clause, which is evaluated before any WHERE
// could filter the bad row out. Older rows hold shapes the wizard can no longer produce.
async function isTeamMemberByEmail(projectId, userId, client = pool) {
    const result = await client.query(
        `
        SELECT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(p.team_members) = 'array'
                     THEN p.team_members
                     ELSE '[]'::jsonb
                END
            ) m
            WHERE LOWER(m->>'email') = LOWER(u.email)
        ) AS is_team_member
        FROM projects p, users u
        WHERE p.id = $1
          AND u.id = $2;
        `,
        [projectId, userId]
    );

    // No row when either the project or the account is gone. Not on a team is the right
    // answer there: the callers already have their own "does this exist" checks.
    return result.rows[0]?.is_team_member === true;
}

//Find all projects by User ID
async function findByCreatorId(userId) {

    const result = await pool.query(
        `
        SELECT p.*,
               -- My Projects shows archived cards too. When an admin archived it the
               -- creator cannot restore it, so the card names who did and why.
               a.full_name AS archived_by_name,
               -- The same two subqueries findById runs. They are here so the creator
               -- dashboard can total backers and comments from this one request rather
               -- than calling GET /projects/:id per project.
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
               ) AS comments_count,
               ${SEMESTER_COLUMNS}
        FROM projects p
        LEFT JOIN users a ON a.id = p.archived_by
        LEFT JOIN semesters s ON s.id = p.semester_id
        WHERE p.creator_id = $1
        ORDER BY p.created_at DESC
        `,
        [userId]
    );

    return result.rows;
}

// Everyone who has invested in any project this creator owns, biggest first.
//
// Grouped by wallet owner rather than by transaction, so three investments across two of
// the creator's projects is one row totalling all three. That matches backers_count above,
// which also counts distinct wallets.
//
// The join to projects is what scopes this to one creator. A transaction whose project was
// deleted carries project_id NULL and drops out, which is right: it backs nothing now.
async function findBackersByCreatorId(userId) {

    const result = await pool.query(
        `
        SELECT u.id                                AS user_id,
               u.full_name,
               SUM(ct.amount)::int                 AS total_amount,
               COUNT(DISTINCT ct.project_id)::int  AS project_count,
               MAX(ct.created_at)                  AS last_invested_at,
               -- The row is one person across several investments, so it picks one
               -- support level: the highest they ever chose, which is the strongest
               -- signal they sent.
               MAX(t.min_amount)::int                                       AS top_tier_min,
               (ARRAY_AGG(t.name ORDER BY t.min_amount DESC NULLS LAST))[1] AS top_tier_name
        FROM classcoin_transactions ct
        JOIN classcoins c ON c.id = ct.classcoin_id
        JOIN users u      ON u.id = c.user_id
        JOIN projects p   ON p.id = ct.project_id
        -- LEFT rather than a plain join: most transactions have tier_id NULL, since
        -- "just support" is a real choice, and an inner join would delete those backers
        -- from this list entirely.
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
            image_url=$4,
            team_members=$5,
            challenge=$6,
            solution=$7,
            funding_usage=$8,
            gallery=$9,
            solution_bullets=$10,
            video_url=$11,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$12
        RETURNING *
        `,
        [
            project.title,
            project.description,
            project.category,
            project.image_url,
            // Stringified, as createProject does. team_members is jsonb, and handing
            // node-postgres a raw JS array makes it send a Postgres array literal, which
            // fails with "invalid input syntax for type json".
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

// review_note is cleared here because it explains the current verdict: leaving a
// rejection note on a now-approved project would show the creator a stale complaint about
// something they have already fixed.
//
// `AND status = 'PENDING'` is the race guard, and it has to be in the statement rather
// than a check in the service. Two admins working the same queue both read a PENDING
// project and both pass every service check, so a read-then-write closes nothing. In the
// statement, the second UPDATE matches no row and moderationService turns that into a 409.
//
// Only from PENDING: the queue lists nothing else, and a REJECTED project has to go
// through resubmit before a verdict applies again.
async function approveProject(id) {

    const result = await pool.query(
        `
        UPDATE projects
        SET status = 'APPROVED',
            review_note = NULL
        WHERE id = $1
          AND status = 'PENDING'
        RETURNING *;
        `,
        [id]
    );

    return result.rows[0];
}

// Back into the approval queue after the creator has revised a rejected project. It
// clears the old note for the same reason approve does: a new verdict is coming, and the
// previous one no longer describes what the reviewer is looking at.
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

// The "RMIT Endorsed" badge on the project page. Admin only, since it is a university
// endorsement and a creator must not award it to themselves.
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

// `note` is the reviewer's explanation, which the review screen collects and
// review_note stores. Same race guard as approveProject, for the same reason.
async function rejectProject(id, note) {

    const result = await pool.query(
        `
        UPDATE projects
        SET status = 'REJECTED',
            review_note = $2
        WHERE id = $1
          AND status = 'PENDING'
        RETURNING *;
        `,
        [id, note || null]
    );

    return result.rows[0];
}

// Archive, a soft delete. It writes the visibility columns only and leaves `status`
// alone, which is what lets restoreProject put the project back on Discover with the
// verdict it already had rather than round the queue again.
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

// Restore. It clears all three columns together, since "archived" means archived_at IS
// NOT NULL and leaving the other two behind would show a stale "archived by X" note on a
// live project.
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

// Permanent delete. A hard DELETE, cascading into comments and project_updates and
// setting classcoin_transactions.project_id to NULL. The service reaches it only for an
// admin acting on an already-archived project, so it is never one mis-click away.
async function deleteProject(id) {
    await pool.query(
        "DELETE FROM projects WHERE id=$1",
        [id]
    );
}

// `client` has to be the caller's transaction client during an investment. On its own
// pool connection, a later ROLLBACK in investProject would leave the project funded with
// coins that were never deducted.
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
    countApprovedProjects,
    findById,
    isTeamMemberByEmail,
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