const express = require("express");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const classCoinRoutes = require("./routes/classCoinRoutes");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auths", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/classcoins", classCoinRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Backend is running"
    });
});

module.exports = app;