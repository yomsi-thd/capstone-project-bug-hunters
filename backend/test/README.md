# Backend tests

```bash
cd backend
npm install     # first time, and after any pull that changes package.json
npm test        # one run, CI style
npm run test:watch
```

Vitest + supertest. Requests go straight into the Express app, so **no server has to be
running** and no port is opened. `npm start` in another terminal is neither needed nor
used.

## Where they run, and why that is safe

Every run gets **its own Postgres schema**, named `test_<timestamp>_<pid>`. `schema.sql`
is built into it before the first test and the whole schema is dropped afterwards, so the
tables the app normally talks to are never opened.

| `TEST_DATABASE_URL` | what happens |
|---|---|
| set | that server is used (CI's throwaway Postgres) |
| not set | falls back to `DATABASE_URL`, the **shared Supabase**, but still only inside its own `test_…` schema |

The fallback is deliberate: this machine has neither Docker nor psql, so the alternative
was no backend tests at all.

**`test/testDatabase.js` throws rather than run in the `public` schema, or in any schema
not named `test_…`.** It is a guard, not a convention to remember. Earlier e2e scripts
spent `TestBacker`'s real Class Coins and the balance had to be repaid by hand.

If a run is killed halfway the schema survives. Nothing else is harmed, and it can be
removed with `DROP SCHEMA test_… CASCADE`.

## What these tests are for

They **measure what the API does today**, including where today is wrong. `updateProject`
answering 400 for a project that does not exist is recorded as 400, not as the 404 it
ought to be.

That is the point. Pinning the current codes means any change to one arrives as a
deliberate one-line diff in the same commit as the code that caused it, instead of a
silent side effect nobody notices until a page breaks.

**So when a test here goes red, read it before fixing it.** If the commit was meant to
change that status, change the test in the same commit. If it was not, the commit broke
something.

## One real bug is pinned rather than fixed

`auth.test.js` records that **signing in twice within the same second returns 401 with a
raw Postgres constraint message**. `generateRefreshToken` signs only `{ id, roles }`, so
`iat`, which has one-second resolution, is the only thing that differs between two
sign-ins by the same account. The identical JWT then collides with the UNIQUE index on
`refresh_tokens.token`. Double-clicking SIGN IN is enough to reach it.

It is left alone because the work that added these tests was explicitly not a behaviour
change. The test is what stops the bug being buried, and it fails loudly on the day it is
fixed properly.
