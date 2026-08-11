const express = require("express");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const classCoinRoutes = require("./routes/classCoinRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cors = require("cors");

const app = express();

app.use(cors({origin: process.env.FRONTEND_URL, credentials: true }));

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