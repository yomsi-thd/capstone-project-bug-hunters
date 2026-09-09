const express = require("express");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const classCoinRoutes = require("./routes/classCoinRoutes");
const adminRoutes = require("./routes/adminRoutes");
const semesterRoutes = require("./routes/semesterRoutes");
const cors = require("cors");
const pool = require("./config/db");
const errorHandler = require("./errors/errorHandler");

const app = express();

// FRONTEND_URL is a comma-separated list rather than a single origin. Production has to
// allow the deployed frontend, while we still run `npm run dev` on localhost against a
// deployed backend, and one origin forces a choice between the two.
//
// The failure is disguised, which is why this matters: a blocked request reaches axios as
// a network error rather than an HTTP one, AuthContext reads that as "backend
// unreachable", and a correct password comes back on screen as "Invalid email or
// password".
//
// Trailing slashes are stripped because a browser's Origin header never has one, so a URL
// pasted with one would match nothing while looking correct.
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

// An unset FRONTEND_URL blocks every browser origin rather than falling through to `*`.
// Blocking is the safer default but it is silent from the browser's side, so say so once
// at boot: the log is the only place this is diagnosable.
if (ALLOWED_ORIGINS.length === 0) {
    console.warn("[cors] FRONTEND_URL is empty - every browser origin will be blocked.");
}

app.use(cors({
    // A function rather than the array, since `origin: []` would reject everything.
    // This way a request with no Origin header, such as a health check, is still
    // allowed: CORS governs browsers only.
    origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        // callback(null, false) rather than callback(new Error(...)). An Error turns a
        // blocked origin into a 500 with a stack trace, which in the logs reads as the
        // backend crashing. Passing false omits the header, which is what the browser
        // needs in order to block the response itself.
        console.warn(`[cors] blocked origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
}));

// The default body limit is 100kb, which POST /projects goes straight past: the wizard
// sends the cover image and up to six gallery images as base64 data URIs inside the JSON,
// and base64 inflates by about a third. One ordinary photo would 413 before the request
// reached a controller.
//
// 10mb is a ceiling rather than a target. The client downscales images before encoding, so
// a full submission lands around 1mb; raising this without that downscaling would only
// trade the 413 for a bloated gallery column that every Discover request carries.
app.use(express.json({ limit: "10mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/classcoins", classCoinRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/semesters", semesterRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Backend is running"
    });
});

// The endpoint the uptime ping calls. It has two jobs: hold the web service awake, and
// prove the database is reachable, which the route above cannot do.
//
// The body is a fixed few bytes and cannot grow with the data. Pointing the ping at a
// real listing route instead would work until that response outgrew the ping service's
// size limit, which then records it as a failure.
//
// SELECT 1 is the point rather than decoration. Answering from Node alone wakes the web
// service but not the database, and a free Postgres project pauses after about a week
// idle, which from outside looks exactly like a broken backend. One round trip keeps both
// awake.
//
// A failing database answers 503 rather than 200. A health check that reports "ok" while
// the database is down tells us nothing. The cost is accepted: a long outage makes the
// ping fail repeatedly and the cron service will disable the job, which then has to be
// re-enabled by hand.
app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({ status: "ok", db: "up" });
    } catch (error) {
        // The logs are the only place this is diagnosable, so say which half failed.
        console.error("[health] database unreachable:", error.message);

        res.status(503).json({ status: "error", db: "down" });
    }
});

// Last, after every route: the one place that turns an error into a status code and a
// JSON body. Anything reaching here either called next(err) or threw out of an async
// handler.
//
// It also catches what no controller can. express.json() rejects an oversized or
// malformed body before the router runs, so without this those come back as Express's
// default HTML error page with nothing in the service logs, because no service code ran.
app.use(errorHandler);

module.exports = app;