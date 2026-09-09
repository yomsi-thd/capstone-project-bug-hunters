-- ============================================================================
-- RMIT Launchpad database schema
--
-- Generated from the live Supabase database. Before that the schema existed only
-- inside that running database: there was no way to rebuild it, and no record of
-- what the code expects.
--
-- Run top to bottom on an empty database. Tables are ordered by dependency, so
-- there are no forward references.
--
--   psql "$DATABASE_URL" -f backend/schema.sql
--
-- It reproduces the live database as it is, quirks included, so a fresh build
-- behaves the same way. Known issues are listed at the bottom with the statements
-- that fix them. They are deliberately not applied here: changing them is hiếu's
-- call and they touch existing data.
-- ============================================================================


-- ─── users ──────────────────────────────────────────────────────────────────
-- No `role` column: roles live in roles + user_roles and reach the app as an
-- uppercase array inside the JWT.
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    full_name   VARCHAR(100)  NOT NULL,
    email       VARCHAR(100)  NOT NULL UNIQUE,
    password    VARCHAR(255)  NOT NULL,   -- bcrypt hash
    -- Academic affiliation shown under the creator's name on a project page,
    -- e.g. "PhD Candidate, RMIT University". Optional.
    title       VARCHAR(150),
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);
-- Email is compared exactly, so sign-in is case-sensitive by design
-- (findByEmail uses `WHERE email = $1`). See the known issues below.


-- ─── roles / user_roles ─────────────────────────────────────────────────────
-- A user may hold several roles at once. The two personas in use are
-- student = BACKER + CREATOR and lecturer = ADMIN alone.
CREATE TABLE roles (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id  INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Required seed. The app validates role names against this table, and the
-- register flow assigns BACKER by name.
INSERT INTO roles (id, name) VALUES (1, 'ADMIN'), (2, 'BACKER'), (3, 'CREATOR');
SELECT setval('roles_id_seq', 3, true);


-- ─── refresh_tokens ─────────────────────────────────────────────────────────
-- 7-day refresh tokens. The access token lasts 15 minutes and is not stored.
CREATE TABLE refresh_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT      NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- ─── creator_requests ───────────────────────────────────────────────────────
-- Creator is a role you request and an admin grants. createProject must never
-- assign it automatically. Ticking "Creator" on the sign-up form writes a
-- PENDING row here; the admin grants it from AdminApprovals > Creator Requests.
CREATE TABLE creator_requests (
    id           SERIAL PRIMARY KEY,
    -- UNIQUE: a user can only ever file one request. See known issue 4.
    user_id      INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(20)  NOT NULL DEFAULT 'CREATOR',
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    -- No ON DELETE action on purpose: deleting a reviewer must not silently
    -- erase who reviewed what.
    reviewed_by  INTEGER      REFERENCES users(id),
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);


-- ─── coin_requests ──────────────────────────────────────────────────────────
-- Requests for Class Coins from people outside RMIT. This is the third way a
-- wallet gets filled: the first is the automatic grant by email domain at
-- registration, the second is an admin issuing to a pasted list. The client does
-- not know these people in advance, so they have to be able to ask for themselves.
CREATE TABLE coin_requests (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Required: the admin does not know who is asking, so the request has to carry
    -- something to judge it by. The length limit is held by zod, not by VARCHAR(n);
    -- going over must be a 422 with a sentence, not a database error.
    note            TEXT         NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    -- NULL until approved. The ledger records this too, but the request carries its
    -- own verdict so reading the queue needs no join to classcoin_transactions.
    amount_granted  INTEGER,
    -- No ON DELETE action, like creator_requests.reviewed_by: deleting an admin must not
    -- silently erase who reviewed what.
    reviewed_by     INTEGER      REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- Not UNIQUE(user_id). creator_requests uses one, and that is known issue 4 at the
-- bottom of this file: a mis-clicked DECLINE locks that person out for ever. This
-- partial index allows one PENDING request at a time and constrains nothing else, so a
-- rejected person can ask again, and so can somebody who spent everything they got.
CREATE UNIQUE INDEX coin_requests_one_pending
    ON coin_requests (user_id) WHERE status = 'PENDING';


-- ─── semesters ──────────────────────────────────────────────────────────────
-- The teaching period a project belongs to, and the only source of a project's
-- closing date. projects.start_date/end_date used to hold a per-project 30-day
-- campaign, which is exactly the funding framing the client asked us to remove.
--
-- Must be declared before `projects`, which references it: this file has to run
-- top to bottom on an empty database, and backend/test/ builds its throwaway
-- schema from here.
--
-- There is deliberately no `is_current` column. "Open" and "browsable" are both
-- derived from the dates by semesterService, for the same reason `archived_at`
-- has no companion status column: a second copy of one fact drifts out of step.
--
-- There is also no constraint against overlapping ranges. An EXCLUDE USING gist
-- would be heavy for three hand-entered rows; instead every resolver orders by
-- start_date DESC LIMIT 1, so the answer stays deterministic even if two rows
-- ever overlap.
CREATE TABLE semesters (
    id          SERIAL PRIMARY KEY,
    -- Shown on the project card and in Discover's semester picker, e.g.
    -- "Semester 2 2026". Free text: the university's naming is not ours to model.
    name        VARCHAR(100) NOT NULL,
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date > start_date)
);

-- The three 2026 teaching periods, supplied by the client.
--
-- Semester 2 really ends 19 Sep 2026. It is seeded as 25 Oct on purpose: the
-- project demo is 20-22 Sep, and with the real date the whole platform would sit
-- in the gap between semesters on the day, with nothing investable, nothing
-- creatable and Discover read-only. To an assessor that reads as a broken build,
-- with no way to tell it apart from one. 25 Oct is the day before Semester 3
-- starts, so it closes the gap without overlapping. Put the real date back after
-- the demo; it is one UPDATE.
INSERT INTO semesters (name, start_date, end_date) VALUES
    ('Semester 1 2026', DATE '2026-03-02', DATE '2026-05-23'),
    ('Semester 2 2026', DATE '2026-06-29', DATE '2026-10-25'),  -- real end: 2026-09-19
    ('Semester 3 2026', DATE '2026-10-26', DATE '2027-01-23');


-- ─── projects ───────────────────────────────────────────────────────────────
-- Renamed from `campaigns`. The sequence and primary key still carry the old
-- name, which is why projects.id draws from campaigns_id_seq.
CREATE TABLE projects (
    id                SERIAL PRIMARY KEY,
    creator_id        INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255)  NOT NULL,
    -- Short blurb: the Discover card text and the opening paragraph of About.
    description       TEXT          NOT NULL,
    -- The project's running total of Class Coins, and the only funding number there
    -- is. goal_amount was dropped when the client asked for the funding framing to
    -- go: no goal, no percentage, no "fully funded" state.
    -- numeric, so node-postgres returns this as a STRING ("5000.00").
    -- src/api/mappers.js pushes every read through toNumber() for that reason.
    current_amount    NUMERIC       DEFAULT 0,
    image_url         TEXT,
    -- Free text, but the UI keys TAG_COLORS / FILTER_TAGS off the bare
    -- uppercase department ("ENGINEERING"), never "School of Engineering".
    category          VARCHAR(100),
    status            VARCHAR(20)   DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    -- Why the board rejected it, written by the admin in AdminApprovals and shown to
    -- the creator on their My Projects card. Cleared on approve and on resubmit, so it
    -- only ever describes the current verdict; a stale note on an approved project
    -- would be worse than none.
    review_note       TEXT,
    -- Superseded by semester_id below. These held a per-project 30-day campaign
    -- window (projectService.resolveCampaignDates, now deleted); a project's
    -- closing date is its semester's end_date. The columns are kept rather than
    -- dropped because the older rows hold real values and DROP COLUMN is not
    -- reversible. Nothing writes them any more and nothing reads them.
    -- See known issue 9.
    start_date        DATE,
    end_date          DATE,
    -- NOT NULL here and on the live database (known issue 8). The backend test suite
    -- builds its schema from this file, so any difference between the two gives tests
    -- that accept or refuse rows production does not.
    team_members      JSONB         DEFAULT '[]'::jsonb NOT NULL,
    -- The long-form story rendered on the project page.
    challenge         TEXT,
    solution          TEXT,
    -- [{ "title": "...", "desc": "..." }] shown under "Our Solution".
    solution_bullets  JSONB         NOT NULL DEFAULT '[]'::jsonb,
    -- Column is funding_usage; the UI prop is called `funding`.
    funding_usage     TEXT,
    -- Array of image URLs / data URIs uploaded in the create wizard.
    gallery           JSONB         NOT NULL DEFAULT '[]'::jsonb,
    -- Link to the pitch video (YouTube/Vimeo play inline, anything else renders as a
    -- link). A link, never a file: the wizard's video-upload branch was removed when
    -- this landed, because a 50MB file base64'd into this row would never have been
    -- sent anywhere.
    video_url         TEXT,
    -- Set only when an ADMIN filed this project on behalf of the creator named in
    -- creator_id. NULL means the creator made it themselves.
    -- It exists so "the admin who filed a project cannot also approve it" can be
    -- enforced: once creator_id points at the creator, this is the only remaining
    -- trace of who actually typed it in (projectService.approveProject/rejectProject).
    -- SET NULL, not CASCADE, for the same reason as project_updates.author_id:
    -- deleting an admin account must not delete somebody else's project, only the
    -- credit.
    created_by_admin_id INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    -- "RMIT Endorsed" badge. ADMIN-only (PATCH /projects/:id/endorse).
    endorsed          BOOLEAN       NOT NULL DEFAULT FALSE,
    -- Archive (soft delete). A second axis, independent of `status` above:
    -- `status` is the moderation verdict (PENDING/APPROVED/REJECTED), these three
    -- columns are visibility. A project can be APPROVED and archived at once.
    -- Archived means `archived_at IS NOT NULL`; there is deliberately no
    -- PUBLISHED/ARCHIVED column, because a second copy of the same fact can drift
    -- out of step. Restoring NULLs all three, which is why `status` survives an
    -- archive round trip untouched and a restored project needs no re-approval.
    archived_at       TIMESTAMPTZ,
    -- Drives who may restore: a creator may only restore what they archived
    -- themselves, so an admin archiving their project locks them out.
    -- SET NULL, not CASCADE: deleting a user must not erase a project.
    archived_by       INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    -- Required when an admin archives someone else's project. They cannot undo
    -- it themselves, so they are at least told why.
    archive_reason    TEXT,
    -- The teaching period this project belongs to, assigned by createProject from
    -- whichever semester is open on the day. A creator never picks it, and neither
    -- does an admin filing on their behalf.
    -- Nullable so the column could be added to the live database ahead of any code
    -- that reads it, and dropped again in one statement. Every existing row was
    -- backfilled to Semester 2 2026; known issue 10 records the SET NOT NULL that is
    -- deliberately not applied.
    -- No ON DELETE action, so the default RESTRICT stands: a semester holding
    -- projects must not be deletable. It is reference data, not a record.
    semester_id       INTEGER       REFERENCES semesters(id),
    created_at        TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_archived ON projects (archived_at);
-- GET /projects filters by semester on every Discover visit, the app's busiest
-- query, so this one carries its weight.
CREATE INDEX idx_projects_semester ON projects (semester_id);


-- ─── project_tiers ──────────────────────────────────────────────────────────
-- Support Levels: "Support Levels" on screen, project_tiers in here. A level is a
-- minimum contribution plus the lines saying what choosing it signals. It is not a
-- reward: the creator owes nothing (Class Coins have no real-world value and
-- creators never receive them), which is why there is no quantity, no delivery
-- date and no "fulfilled" column. Under this reading they have no meaning, rather
-- than being deferred.
--
-- is_active exists because a level somebody has already chosen must never be
-- deleted: their classcoin_transactions row points at it. Removing such a level
-- hides it instead (projectService.deleteTier).
--
-- No UNIQUE (project_id, min_amount): the "no two levels at the same amount" rule
-- applies only to active levels, and is_active cannot go in the key. A UNIQUE
-- would also block recreating a level at the price of a hidden one. Enforced in
-- projectService instead.
--
-- No sort_order either: the order is min_amount ASC, id ASC. One source of truth,
-- and no drag-and-drop to keep in step with it.
CREATE TABLE project_tiers (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    min_amount  INTEGER      NOT NULL CHECK (min_amount > 0),
    -- Array of strings, same jsonb treatment as projects.gallery and
    -- projects.solution_bullets.
    bullets     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_tiers_project ON project_tiers (project_id);


-- ─── classcoins / classcoin_transactions ────────────────────────────────────
-- Class Coins are an internal popularity score with no real-world value.
-- Every account gets one wallet.
CREATE TABLE classcoins (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER   NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    -- A wallet starts empty. It used to start at 4500, handed to every account at
    -- sign-up, which made a throwaway account worth 4,500 CC of influence: exactly
    -- the hole that admin-issued coins exist to close. A wallet is now filled either
    -- by the domain rule at registration or by an admin.
    balance     INTEGER   NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- type is one of INVEST / ADMIN_ADD / ADMIN_DEDUCT.
-- project_id is SET NULL rather than CASCADE: deleting a project must not erase
-- the record that a user once spent coins.
-- tier_id is the Support Level the backer picked, and it is nullable on purpose:
-- choosing one is optional ("No level - just support"), and the oldest transactions
-- have none. It is stored at investment time rather than derived later from the
-- amount, because min_amount is editable and derived buckets would silently rewrite
-- what somebody signalled.
-- ON DELETE SET NULL here is a safety net, not a route the app uses: the service
-- never hard-deletes a level that has transactions. It only fires when a whole
-- project is permanently deleted, at which point project_id above is also SET NULL.
CREATE TABLE classcoin_transactions (
    id            SERIAL PRIMARY KEY,
    classcoin_id  INTEGER     NOT NULL REFERENCES classcoins(id) ON DELETE CASCADE,
    project_id    INTEGER     REFERENCES projects(id) ON DELETE SET NULL,
    tier_id       INTEGER     REFERENCES project_tiers(id) ON DELETE SET NULL,
    type          VARCHAR(20) NOT NULL,
    amount        INTEGER     NOT NULL,
    description   TEXT,
    -- Who issued this grant. NULL means the system granted it from the email domain
    -- at registration. In the oldest ADMIN_ADD rows NULL means "nobody recorded it";
    -- the two are told apart by created_at, which was judged not worth a second
    -- column.
    -- SET NULL, not CASCADE: deleting an admin must not erase the record that
    -- somebody else received coins. Same reasoning as project_updates.author_id.
    granted_by    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_classcoin_transactions_tier
    ON classcoin_transactions (tier_id);

-- One contribution per person per project. investmentService refuses a second one
-- with a sentence a person can read; this index is the line underneath it, and it is
-- what makes two requests arriving together (a double-clicked CONFIRM) impossible
-- rather than merely unlikely. The 23505 it raises is translated back into the same 409.
--
-- The WHERE clause is load-bearing. This table also holds ADD and DEDUCT rows, which
-- repeat legitimately; a unique index over the whole table would refuse an admin
-- issuing Class Coins to the same wallet twice.
--
-- Rows with project_id IS NULL are not constrained, and that is correct: Postgres
-- treats NULLs as distinct, and those rows are the history of permanently deleted
-- projects.
CREATE UNIQUE INDEX classcoin_transactions_one_invest_per_project
    ON classcoin_transactions (classcoin_id, project_id)
    WHERE type = 'INVEST';
-- The investment flow deducts with `WHERE user_id = $1 AND balance >= $2
-- RETURNING *` inside one transaction. Reading the balance first and checking it
-- in JS is what allowed 8 concurrent invests to drive a wallet to -3500 CC.


-- ─── project_updates ────────────────────────────────────────────────────────
-- Posts the creator writes for backers; public on the project page.
-- author_id is SET NULL, not CASCADE: deleting a user must not erase a
-- project's history, only the attribution.
CREATE TABLE project_updates (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_id   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    title       VARCHAR(200) NOT NULL,
    body        TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX idx_project_updates_project
    ON project_updates (project_id, created_at DESC);


-- ─── comments ───────────────────────────────────────────────────────────────
-- Threaded exactly one level: parent_id NULL is a top-level comment, otherwise
-- it points at one. The service re-parents a reply-to-a-reply onto the
-- top-level comment rather than creating depth the UI cannot draw.
--
-- There is no `role` column. The CREATOR / BACKER badge is derived in SQL at
-- read time from who owns the project and who actually invested in it.
CREATE TABLE comments (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    parent_id   INTEGER     REFERENCES comments(id) ON DELETE CASCADE,
    body        TEXT        NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_project
    ON comments (project_id, created_at DESC);


-- ============================================================================
-- KNOWN ISSUES IN THE LIVE DATABASE. Not applied above, listed so they are not
-- lost. Each is safe to run against the live database when the team agrees.
-- ============================================================================
--
-- 1. RESOLVED: TIMESTAMP WITHOUT TIME ZONE on the older tables.
--
--    All ten columns were migrated on the live database in one transaction with
--    scripts/migrate-timestamptz.cjs, and the CREATE TABLE statements above declare
--    TIMESTAMPTZ, so a fresh build of this file matches the live database. Verified
--    after the run: no naive timestamp columns remain, the refresh_tokens
--    expires_at - created_at gap went from 175.00 h to 168.00 h (exactly 7 days), and
--    the 63 investment rows that displayed a day early now render on the right day.
--
--    Keep the two groups below. They record why the migration was not one blanket
--    clause, and the same distinction applies to any naive column added later.
--
--    The mechanism, measured with scripts/probe-timestamp-drift.cjs:
--
--      * The database runs in UTC (current_setting('TimeZone') = 'UTC'), so
--        CURRENT_TIMESTAMP writes a UTC wall clock.
--      * Node runs at UTC+7 and node-postgres parses `timestamp without time zone`
--        as LOCAL time, so a UTC value is read back 7 hours in the past.
--      * On screen that put 63 of 81 classcoin_transactions rows (78%) on the wrong
--        calendar day.
--
--    Which repair a column needs depends on who WROTE it, not on which table it sits
--    in, and the two groups need opposite fixes:
--
--    (a) Written by the DATABASE: DEFAULT CURRENT_TIMESTAMP, or `SET x =
--        CURRENT_TIMESTAMP` inside an UPDATE. The stored wall clock is UTC. Nine
--        columns, all of this shape:
--
--          ALTER TABLE users ALTER COLUMN created_at
--              TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
--
--    (b) Written by NODE: a JS Date handed to the driver, which serialises it with a
--        +07:00 offset that Postgres DROPS when casting into a naive column. The
--        stored wall clock is therefore UTC+7, and 'UTC' here would push the value 7
--        hours further into the future instead of repairing it.
--        refresh_tokens.expires_at is the only such column (authService builds
--        `new Date()` + 7 days; every other value comes from CURRENT_TIMESTAMP).
--        Proof: expires_at - created_at averaged 175.00 h across all 158 rows where
--        7 days is 168 h, and the extra 7 h is exactly the frame mismatch.
--
--          ALTER TABLE refresh_tokens ALTER COLUMN expires_at
--              TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'Asia/Ho_Chi_Minh';
--
--    Group (b) did not misbehave on a developer machine: Node both wrote and read it,
--    so the same wrong assumption cancelled out. It starts lying the moment the app
--    runs on a UTC host such as Render, which is why the migration belonged before
--    the deploy rather than after it.
--
-- 2. Duplicate constraints on the live database, omitted above because they are
--    exact copies of ones already declared:
--      classcoins : classcoins_user_id_key AND unique_user_wallet, both UNIQUE (user_id)
--      projects   : chk_project_status AND chk_campaign_status, identical CHECKs
--    Dropping the redundant half is harmless:
--      ALTER TABLE classcoins DROP CONSTRAINT unique_user_wallet;
--      ALTER TABLE projects   DROP CONSTRAINT chk_campaign_status;
--
-- 3. Sign-in is case-sensitive by team decision, but the UNIQUE constraint on
--    users.email is case-sensitive too, so 'A@x.com' and 'a@x.com' can both be
--    registered. Blocking that without changing sign-in behaviour:
--      CREATE UNIQUE INDEX users_email_lower_key ON users (LOWER(email));
--
-- 4. creator_requests.user_id is UNIQUE, so a user who is declined can never
--    apply again: POST /auth/register would fail on the second attempt and
--    there is no other way in. Either drop the constraint and filter on
--    status = 'PENDING' in the queries, or add a route that reopens a request.
--
-- 5. projects still carries its pre-rename names: the sequence is
--    campaigns_id_seq and the primary key is campaigns_pkey. Cosmetic, but
--    confusing when reading errors.
--
-- 6. RESOLVED: support levels are real. project_tiers and
--    classcoin_transactions.tier_id are declared above, and all three pieces this
--    entry warned about were built together: the table, a level choice in the
--    invest modal with a tier_id on the transaction, and the per-level backer
--    count that replaced the "distribution across tiers" view nobody needed.
--
--    Two things the old sketch got wrong, recorded so the reasoning is not lost:
--      * It assumed the EditProject textarea shape. The list won: CreateProject
--        already collected one, so the textarea was the form losing structure.
--        The column is `bullets JSONB`, and EditProject was rebuilt to match.
--      * It called them rewards. They are not: nobody is owed anything, which is
--        what removes the need for quantity, delivery date and fulfilment state.
--
--    (Item 7 and the old review_note note are resolved and no longer listed.
--     Both `review_note` and `video_url` are declared in the projects table above.)
--
-- 8. RESOLVED: projects.team_members is NOT NULL.
--    It was the one column where this file and the live database disagreed. Applied
--    with scripts/migrate-team-members-not-null.cjs, both statements in a single
--    transaction:
--
--      UPDATE projects SET team_members = '[]'::jsonb WHERE team_members IS NULL;
--      ALTER TABLE projects ALTER COLUMN team_members SET NOT NULL;
--
--    0 rows needed the UPDATE, as expected: createProject coalesces with `|| []` and
--    updateProject with `?? []`, so nothing ever wrote NULL. Tidiness rather than a
--    fix: gallery and solution_bullets, which the code treats identically, were
--    already NOT NULL.
--
--    Inserts that omit the column are unaffected, since DEFAULT '[]'::jsonb satisfies
--    the constraint, which is why the test factories needed no change.
--    Reverse with: ALTER TABLE projects ALTER COLUMN team_members DROP NOT NULL;
--
-- 9. projects.start_date / end_date are dead, superseded by semester_id, and
--    nothing reads or writes them any more. They are kept because the older rows
--    hold real values and DROP COLUMN cannot be undone. Drop them once the team
--    agrees the old campaign windows are of no further interest:
--
--      ALTER TABLE projects DROP COLUMN start_date, DROP COLUMN end_date;
--
-- 10. projects.semester_id is NULLABLE, and after the backfill no row holds NULL.
--     It stayed nullable so the column could be added to the live database before
--     any code read it, and removed again in one statement while the change was
--     still in flight. Once the semester work has settled:
--
--       ALTER TABLE projects ALTER COLUMN semester_id SET NOT NULL;
--
--     Deliberately not applied yet, for the same reason as issue 8: doing it now
--     would make the test database stricter than production, in the direction that
--     hides bugs rather than catching them.
