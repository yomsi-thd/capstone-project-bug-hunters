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
    -- "RMIT Endorsed" badge. ADMIN-only (PATCH /projects/:id/endorse).
    endorsed          BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);


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
CREATE TABLE classcoin_transactions (
    id            SERIAL PRIMARY KEY,
    classcoin_id  INTEGER     NOT NULL REFERENCES classcoins(id) ON DELETE CASCADE,
    project_id    INTEGER     REFERENCES projects(id) ON DELETE SET NULL,
    type          VARCHAR(20) NOT NULL,
    amount        INTEGER     NOT NULL,
    description   TEXT,
    created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);
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
-- 6. Reward tiers have no table at all. CreateProject still lets a creator type
--    them and drops them on submit — the last place the app loses user input.
--    Suggested shape:
--      CREATE TABLE project_tiers (
--        id          SERIAL PRIMARY KEY,
--        project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
--        name        VARCHAR(100) NOT NULL,
--        min_amount  INTEGER NOT NULL,
--        description TEXT
--      );
--
-- 7. There is nowhere to store the video the create wizard REQUIRES, nor the
--    feedback an admin types when rejecting a project. Both are collected and
--    thrown away:
--      ALTER TABLE projects ADD COLUMN video_url   TEXT;
--      ALTER TABLE projects ADD COLUMN review_note TEXT;
