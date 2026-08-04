const bcrypt = require("bcryptjs");

const userRepository = require("../repositories/userRepository");
const refreshTokenRepository = require("../repositories/refreshTokenRepository");
const classCoinRepository = require("../repositories/classCoinRepository");

const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
} = require("../utils/jwt");

async function register(fullName, email, password) {

    const existing =
        await userRepository.findByEmail(email);

    if (existing) {
        throw new Error("Email already exists");
    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    const user =
        await userRepository.createUser(
            fullName,
            email,
            hashedPassword
        );

    await userRepository.assignRole(user.id, "BACKER");

    await classCoinRepository.createClassCoin(user.id);

    return user;
}

async function login(email, password) {

    const user =
        await userRepository.findByEmail(email);

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const match =
        await bcrypt.compare(password, user.password);

    if (!match) {
        throw new Error("Invalid email or password");
    }

    const roles = await userRepository.getUserRoles(user.id);

    const accessToken = generateAccessToken(user, roles);
    const refreshToken = generateRefreshToken(user, roles);

    // expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await refreshTokenRepository.createToken(
        user.id,
        refreshToken,
        expiresAt
    );

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            roles
        }
    };
}

async function refreshToken(token) {

    if (!token) {
        throw new Error("Refresh token is required");
    }

    // Check if token exists in database
    const storedToken =
        await refreshTokenRepository.findByToken(token);

    if (!storedToken) {
        throw new Error("Invalid refresh token");
    }

    //Check Expiration in database
    if (new Date() > storedToken.expires_at) {
        await refreshTokenRepository.deleteToken(token);
        throw new Error("Refresh token expired");
    }
    // Verify JWT
    const payload = verifyRefreshToken(token);

    const user = await userRepository.findById(payload.id);

    if (!user) {
        throw new Error("User not found");
    }

    const roles = await userRepository.getUserRoles(user.id);

    // Create a new access token
    const accessToken = generateAccessToken(user, roles);

    return {
        accessToken
    };
}

async function logout(token) {

    if (!token) {
        throw new Error("Refresh token is required");
    }

    await refreshTokenRepository.deleteToken(token);
}

module.exports = {
    register,
    login,
    refreshToken,
    logout
};
