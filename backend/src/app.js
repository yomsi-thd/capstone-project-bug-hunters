const express = require("express");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const classCoinRoutes = require("./routes/classCoinRoutes");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/classcoins", classCoinRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Backend is running"
    });
});

module.exports = app;