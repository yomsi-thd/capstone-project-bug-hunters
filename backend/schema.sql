-- ============================================================================
-- RMIT Launchpad — database schema
--
-- Generated from the live Supabase database on 2026-08-06. Until now the schema
-- existed ONLY in that running database: there was no way to rebuild it, and no
-- record of what the code expects.
--
-- Run top to bottom on an empty database. Tables are ordered by dependency, so
-- no forward references.
--
--   psql "$DATABASE_URL" -f backend/schema.sql
--
-- This file reproduces the live database as it actually is, quirks included, so
-- that a fresh build behaves identically. Known issues are listed at the bottom
-- with the statements that fix them — deliberately NOT applied here, because
-- changing them is hiếu's call and they touch existing data.
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
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);
-- NOTE: email is compared exactly, so sign-in is case-sensitive by design
-- (findByEmail uses `WHERE email = $1`). See the known issues below.


-- ─── roles / user_roles ─────────────────────────────────────────────────────
-- A user may hold several roles at once. The two personas in use are
-- student = BACKER + CREATOR and lecturer = ADMIN + BACKER.
CREATE TABLE roles (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id  INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Required seed — the app validates role names against this table and the
-- register flow assigns BACKER by name.
INSERT INTO roles (id, name) VALUES (1, 'ADMIN'), (2, 'BACKER'), (3, 'CREATOR');
SELECT setval('roles_id_seq', 3, true);


-- ─── refresh_tokens ─────────────────────────────────────────────────────────
-- 7-day refresh tokens; the access token is 15 minutes and is not stored.
CREATE TABLE refresh_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT      NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ─── creator_requests ───────────────────────────────────────────────────────
-- Creator is a role you REQUEST and an admin grants — createProject must never
-- assign it automatically. Ticking "Creator" on the sign-up form writes a
-- PENDING row here; the admin grants it from AdminApprovals → Creator Requests.
CREATE TABLE creator_requests (
    id           SERIAL PRIMARY KEY,
    -- UNIQUE: a user can only ever file ONE request. See known issue 4.
    user_id      INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(20)  NOT NULL DEFAULT 'CREATOR',
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    -- No ON DELETE action on purpose: deleting a reviewer must not silently
    -- erase who reviewed what.
    reviewed_by  INTEGER      REFERENCES users(id),
    reviewed_at  TIMESTAMP,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);


-- ─── projects ───────────────────────────────────────────────────────────────
-- Renamed from `campaigns`; the sequence and primary key still carry the old
-- name, which is why projects.id draws from campaigns_id_seq.
CREATE TABLE projects (
    id                SERIAL PRIMARY KEY,
    creator_id        INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255)  NOT NULL,
    -- Short blurb: the Discover card text and the opening paragraph of About.
    description       TEXT          NOT NULL,
    -- numeric, so node-postgres returns these as STRINGS ("5000.00").
    -- src/api/mappers.js pushes every read through toNumber() for that reason.
    goal_amount       NUMERIC       NOT NULL,
    current_amount    NUMERIC       DEFAULT 0,
    image_url         TEXT,
    -- Free text, but the UI keys TAG_COLORS / FILTER_TAGS off the bare
    -- uppercase department ("ENGINEERING"), never "School of Engineering".
    category          VARCHAR(100),
    status            VARCHAR(20)   DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    -- Why the board rejected it, written by the admin in AdminApprovals and shown to
    -- the creator on their My Projects card. Cleared on approve and on resubmit, so it
    -- only ever describes the CURRENT verdict — a stale note on an approved project
    -- would be worse than none.
    review_note       TEXT,
    start_date        DATE,
    end_date          DATE,
    team_members      JSONB         NOT NULL DEFAULT '[]'::jsonb,
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
    -- link). Added 2026-08-18; the create wizard had required a video since the start
    -- and there was nowhere to put it. A LINK, never a file — the wizard's video-upload
    -- branch was removed with this, because a 50MB file base64'd into this row would
    -- never have been sent anywhere.
    video_url         TEXT,
    -- "RMIT Endorsed" badge. ADMIN-only (PATCH /projects/:id/endorse).
    endorsed          BOOLEAN       NOT NULL DEFAULT FALSE,
    -- ── Archive (soft delete). A SECOND axis, independent of `status` above.
    -- `status` is the moderation verdict (PENDING/APPROVED/REJECTED); these three
    -- are visibility. A project can be APPROVED *and* archived. Archived is
    -- `archived_at IS NOT NULL` — there is deliberately no PUBLISHED/ARCHIVED
    -- column, because a second copy of the same fact can drift out of step.
    -- Restoring NULLs all three, which is why `status` survives an archive round
    -- trip untouched and a restored project needs no re-approval.
    archived_at       TIMESTAMPTZ,
    -- Drives WHO may restore: a creator may only restore what they archived
    -- themselves, so an admin archiving their project locks them out.
    -- SET NULL, not CASCADE: deleting a user must not erase a project.
    archived_by       INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    -- Required when an admin archives someone else's project — they cannot undo
    -- it themselves, so they are at least told why.
    archive_reason    TEXT,
    created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_archived ON projects (archived_at);


-- ─── project_tiers ──────────────────────────────────────────────────────────
-- Support Levels: "Support Levels" on screen, project_tiers in here. A level is a
-- MINIMUM contribution plus the lines saying what choosing it SIGNALS - it is not
-- a reward. The creator owes nothing (Class Coins have no real-world value and
-- creators never receive them), which is exactly why there is no quantity, no
-- delivery date and no "fulfilled" column: under this reading they have no
-- meaning, rather than being deferred.
--
-- is_active exists because a level somebody has already chosen must never be
-- deleted - their classcoin_transactions row points at it. Removing such a level
-- hides it instead (projectService.deleteTier).
--
-- No UNIQUE (project_id, min_amount): the "no two levels at the same amount" rule
-- applies only to ACTIVE levels, and is_active cannot go in the key. A UNIQUE
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
-- Class Coins are an internal popularity score with NO real-world value.
-- Every account gets one wallet, seeded with 4500 CC at registration.
CREATE TABLE classcoins (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER   NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance     INTEGER   NOT NULL DEFAULT 4500,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- type is one of INVEST / ADMIN_ADD / ADMIN_DEDUCT.
-- project_id is SET NULL rather than CASCADE: deleting a project must not erase
-- the record that a user once spent coins.
-- tier_id is the Support Level the backer picked, and it is NULLABLE on purpose:
-- choosing one is optional ("No level - just support"), and every transaction made
-- before 2026-08-20 has none. It is stored at INVESTMENT TIME rather than derived
-- later from the amount - min_amount is editable, so derived buckets would
-- silently rewrite what somebody signalled.
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
    created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_classcoin_transactions_tier
    ON classcoin_transactions (tier_id);
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
-- There is no `role` column — the CREATOR / BACKER badge is derived in SQL at
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
-- KNOWN ISSUES IN THE LIVE DATABASE — not applied above, listed so they are not
-- lost. Each is safe to run against the live database when the team agrees.
-- ============================================================================
--
-- 1. TIMESTAMP WITHOUT TIME ZONE on the older tables.
--    CURRENT_TIMESTAMP stores the database's local time (UTC+7) while
--    node-postgres reads it back as UTC, so values come out 7 hours off. It was
--    caught when a comment posted seconds earlier rendered as "7 hours ago".
--    project_updates and comments already use TIMESTAMPTZ. The rest do not, and
--    refresh_tokens.expires_at is where it actually bites — tokens expire at the
--    wrong moment.
--
--      ALTER TABLE users                  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
--      ALTER TABLE projects               ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
--      ALTER TABLE projects               ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
--      ALTER TABLE classcoins             ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
--      ALTER TABLE classcoins             ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
--      ALTER TABLE classcoin_transactions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
--      ALTER TABLE creator_requests       ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
--      ALTER TABLE creator_requests       ALTER COLUMN reviewed_at TYPE TIMESTAMPTZ USING reviewed_at AT TIME ZONE 'UTC';
--      ALTER TABLE refresh_tokens         ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
--      ALTER TABLE refresh_tokens         ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
--
-- 2. Duplicate constraints on the live database, omitted above because they are
--    exact copies of ones already declared:
--      classcoins : classcoins_user_id_key AND unique_user_wallet — both UNIQUE (user_id)
--      projects   : chk_project_status AND chk_campaign_status    — identical CHECKs
--    Dropping the redundant half is harmless:
--      ALTER TABLE classcoins DROP CONSTRAINT unique_user_wallet;
--      ALTER TABLE projects   DROP CONSTRAINT chk_campaign_status;
--
-- 3. Sign-in is case-sensitive by team decision, but the UNIQUE constraint on
--    users.email is case-sensitive too — so 'A@x.com' and 'a@x.com' can both be
--    registered. Blocking that without changing sign-in behaviour:
--      CREATE UNIQUE INDEX users_email_lower_key ON users (LOWER(email));
--
-- 4. creator_requests.user_id is UNIQUE, so a user who is declined can never
--    apply again — POST /auth/register would fail on the second attempt and
--    there is no other way in. Either drop the constraint and filter on
--    status = 'PENDING' in the queries, or add a route that reopens a request.
--
-- 5. projects still carries its pre-rename names: the sequence is
--    campaigns_id_seq and the primary key is campaigns_pkey. Cosmetic, but
--    confusing when reading errors.
--
-- 6. RESOLVED 2026-08-20 - support levels are real. project_tiers and
--    classcoin_transactions.tier_id are declared above, and all three pieces this
--    entry warned about were built together: the table, a level choice in the
--    invest modal WITH a tier_id on the transaction, and the per-level backer
--    count that replaced the "distribution across tiers" view nobody needed.
--
--    Two things the old sketch got wrong, recorded so the reasoning is not lost:
--      * It assumed the EditProject textarea shape. The LIST won - CreateProject
--        already collected one, so the textarea was the form losing structure.
--        The column is `bullets JSONB`, and EditProject was rebuilt to match.
--      * It called them rewards. They are not: nobody is owed anything, which is
--        what removes the need for quantity / delivery date / fulfilment state.
--        Design record: docs/superpowers/specs/2026-08-19-support-levels-design.md
--
--    (Items 7 and the old review_note note are resolved and no longer listed.
--     `review_note` landed 2026-08-11 and `video_url` on 2026-08-18; both are
--     declared in the projects table above.)
