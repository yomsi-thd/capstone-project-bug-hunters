const bcrypt = require("bcryptjs");

const { conflict, unauthenticated, validationFailed } = require("../errors/AppError");

const userRepository = require("../repositories/userRepository");
const refreshTokenRepository = require("../repositories/refreshTokenRepository");
const classCoinRepository = require("../repositories/classCoinRepository");
const classCoinService = require("./classCoinService");
const creatorRequestRepository = require("../repositories/creatorRequestRepository");

const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
} = require("../utils/jwt");

async function register(fullName, email, password, wantCreator) {

    const existing =
        await userRepository.findByEmail(email);

    if (existing) {
        // 409 rather than 400: the request is well-formed and understood, it just
        // collides with a row that already exists.
        throw conflict("Email already exists");
    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    const user =
        await userRepository.createUser(
            fullName,
            email,
            hashedPassword,
            wantCreator
        );

    await userRepository.assignRole(user.id, "BACKER");

    await classCoinRepository.createClassCoin(user.id);

    // Swallowed on purpose. A wallet that could not be topped up must not turn a
    // successful registration into an error: the account and the wallet both exist, and
    // an admin can grant later.
    try {
        await classCoinService.grantOnRegistration(user.id, email);
    } catch (error) {
        console.error("[warn] registration grant failed:", error.message);
    }

    if (wantCreator) {
        await creatorRequestRepository.create(user.id);
    }

    return user;
}

async function login(email, password) {

    const user =
        await userRepository.findByEmail(email);

    if (!user) {
        // The same sentence for "no such email" and "wrong password". Telling them apart
        // would let anyone test which addresses have accounts.
        throw unauthenticated("Invalid email or password");
    }

    const match =
        await bcrypt.compare(password, user.password);

    if (!match) {
        throw unauthenticated("Invalid email or password");
    }

    const roles = await userRepository.getUserRoles(user.id);

    const accessToken = generateAccessToken(user, roles);
    const refreshToken = generateRefreshToken(user, roles);

    // Expires in 7 days.
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
        throw validationFailed("Refresh token is required", [
            { field: "refreshToken", message: "Send the refresh token in the body." },
        ]);
    }

    // The token has to exist in the database.
    const storedToken =
        await refreshTokenRepository.findByToken(token);

    if (!storedToken) {
        throw unauthenticated("Invalid refresh token");
    }

    // ...and not have expired.
    if (new Date() > storedToken.expires_at) {
        await refreshTokenRepository.deleteToken(token);
        throw unauthenticated("Refresh token expired");
    }
    // Wrapped rather than left to throw. jsonwebtoken raises its own error type, which
    // would reach errorHandler as an unexpected failure and answer 500, where a token
    // whose signature or expiry does not check out is exactly "your session is not
    // valid".
    let payload;

    try {
        payload = verifyRefreshToken(token);
    } catch {
        throw unauthenticated("Invalid refresh token");
    }

    const user = await userRepository.findById(payload.id);

    if (!user) {
        // 401 rather than 404. The caller is asking to renew their session and the
        // session is what is gone, which is also what the frontend's interceptor needs to
        // hear in order to clear storage rather than show a "not found" page.
        throw unauthenticated("User not found");
    }

    const roles = await userRepository.getUserRoles(user.id);

    // Issue a new access token.
    const accessToken = generateAccessToken(user, roles);

    return {
        accessToken
    };
}

async function logout(token) {

    if (!token) {
        throw validationFailed("Refresh token is required", [
            { field: "refreshToken", message: "Send the refresh token in the body." },
        ]);
    }

    await refreshTokenRepository.deleteToken(token);
}

module.exports = {
    register,
    login,
    refreshToken,
    logout
};
