# Backend tests

```bash
cd backend
npm install     # first time, and after any pull that changes package.json
npm test        # one run, CI style
npm run test:watch
```

Vitest + supertest. Requests go straight into the Express app, so **no server has to be
running** and no port is opened — `npm start` in another terminal is neither needed nor
used.

## Where they run, and why that is safe

Every run gets **its own Postgres schema**, named `test_<timestamp>_<pid>`. `schema.sql`
is built into it before the first test and the whole schema is dropped afterwards, so the
tables the app normally talks to are never opened.

| `TEST_DATABASE_URL` | what happens |
|---|---|
| set | that server is used (CI's throwaway Postgres) |
| not set | falls back to `DATABASE_URL`, i.e. the **shared Supabase** — but still only inside its own `test_…` schema |

The fallback is deliberate: this machine has neither Docker nor psql, so the alternative
was no backend tests at all.

⚠️ **`test/testDatabase.js` refuses to run in the `public` schema, or in any schema not
named `test_…`, and says why.** That is not a convention to remember — it throws. The
e2e scripts of 2026-08-20 spent `TestBacker`'s real Class Coins and had to be repaid by
hand; this is the guard that makes that accident impossible rather than unlikely.

If a run is killed halfway the schema survives. Nothing else is harmed, and it can be
removed with `DROP SCHEMA test_… CASCADE`.

## What these tests are for

They **measure what the API does today**, including where today is wrong. `updateProject`
answering 400 for a project that does not exist is recorded as 400, not as the 404 it
ought to be.

That is the point. The API restructure changes a lot of those codes, and pinning them
first means every change arrives as a deliberate one-line diff in the same commit as the
code that caused it — never as a silent side effect nobody notices until a page breaks.

⚠️ **So when a test here goes red during the restructure, read it before fixing it.** If
the commit was meant to change that status, change the test in the same commit. If it was
not, the commit broke something.

## One real bug is pinned rather than fixed

`auth.test.js` records that **signing in twice within the same second returns 401 with a
raw Postgres constraint message**. `generateRefreshToken` signs only `{ id, roles }`, so
`iat` — one-second resolution — is the only thing that differs between two sign-ins by
the same account, and the identical JWT collides with the UNIQUE index on
`refresh_tokens.token`. Reachable by double-clicking SIGN IN.

It is left alone because the restructure is explicitly not a behaviour change. The test
is what stops it being buried, and it will fail loudly on the day it is fixed properly.
