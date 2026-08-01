const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
        },
        ACCESS_SECRET,
        { expiresIn: "15m" }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
        },
        REFRESH_SECRET,
        { expiresIn: "7d" }
    );
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, ACCESS_SECRET);
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_SECRET);
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};