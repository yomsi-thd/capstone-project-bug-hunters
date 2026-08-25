const express = require("express");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const classCoinRoutes = require("./routes/classCoinRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cors = require("cors");

const app = express();

// FRONTEND_URL is a COMMA-SEPARATED LIST, not a single origin.
//
// It held one origin until deployment made that a problem: production must allow
// the deployed frontend, but the three of us still run `npm run dev` on
// localhost:5173 against a deployed backend, and a single-origin value forces a
// choice between the two. Worse, the failure is disguised — a blocked request
// reaches axios as a network error rather than an HTTP one, and AuthContext reads
// that as "backend unreachable", so on screen a correct password comes back as
// "Invalid email or password". Exactly the 5173/5174 trap, one layer further out.
//
// Trailing slashes are stripped because a browser's `Origin` header never has one,
// and `https://x.onrender.com/` pasted into Render's dashboard would otherwise
// match nothing while looking perfectly correct.
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

// Unset FRONTEND_URL now blocks every browser origin, where it previously fell
// through to the cors package's default of `*`. Blocking is the safer default, but
// it is also silent from the browser's side, so say so once at boot — a Render log
// line is the only place this is diagnosable.
if (ALLOWED_ORIGINS.length === 0) {
    console.warn("[cors] FRONTEND_URL is empty - every browser origin will be blocked.");
}

app.use(cors({
    // A function, not the array: `origin: []` would reject everything, and this
    // way a request with NO Origin header (curl, a health check, a server-to-server
    // call) is still allowed — CORS only governs browsers.
    origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        // `callback(null, false)` — NOT `callback(new Error(...))`. An Error turns a
        // blocked origin into a 500 with a stack trace, which in Render's log tab
        // reads as the backend crashing rather than as a rejected origin. Passing
        // false just omits the header, which is what the single-origin version did
        // and what the browser needs in order to block the response itself.
        console.warn(`[cors] blocked origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
}));

// The default body limit is 100kb, which POST /projects blows straight past: the create
// wizard sends the cover image and up to six gallery images as base64 data URIs inside
// the JSON, and base64 inflates by ~33%. A single ordinary photo returned 413 before the
// request ever reached a controller.
// 10mb is a ceiling, not a target — the client downscales images before encoding, so a
// full submission lands around 1mb. Raising this without that downscaling would only
// trade the 413 for a bloated `gallery` column that every Discover request has to carry.
app.use(express.json({ limit: "10mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/classcoins", classCoinRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Backend is running"
    });
});

module.exports = app;