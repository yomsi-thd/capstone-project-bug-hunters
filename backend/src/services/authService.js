const bcrypt = require("bcryptjs");

const { conflict, unauthenticated, validationFailed } = require("../errors/AppError");

const userRepository = require("../repositories/userRepository");
const refreshTokenRepository = require("../repositories/refreshTokenRepository");
const classCoinRepository = require("../repositories/classCoinRepository");
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
        // 409, not 400: the request is well-formed and understood, it just collides
        // with a row that already exists.
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

    if (wantCreator) {
        await creatorRequestRepository.create(user.id);
    }

    return user;
}

async function login(email, password) {

    const user =
        await userRepository.findByEmail(email);

    if (!user) {
        // Deliberately the same sentence for "no such email" and "wrong password":
        // telling them apart is an account-enumeration oracle.
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
        throw validationFailed("Refresh token is required", [
            { field: "refreshToken", message: "Send the refresh token in the body." },
        ]);
    }

    // Check if token exists in database
    const storedToken =
        await refreshTokenRepository.findByToken(token);

    if (!storedToken) {
        throw unauthenticated("Invalid refresh token");
    }

    //Check Expiration in database
    if (new Date() > storedToken.expires_at) {
        await refreshTokenRepository.deleteToken(token);
        throw unauthenticated("Refresh token expired");
    }
    // Verify JWT.
    //
    // Wrapped rather than left to throw: jsonwebtoken raises its own error type, which
    // would now reach errorHandler as an unexpected failure and answer 500. The
    // controller's old blanket catch turned every failure in here into a 401, and for
    // this one that answer was right — a token whose signature or expiry does not check
    // out is exactly "your session is not valid".
    let payload;

    try {
        payload = verifyRefreshToken(token);
    } catch {
        throw unauthenticated("Invalid refresh token");
    }

    const user = await userRepository.findById(payload.id);

    if (!user) {
        // 401, not 404. The caller is asking to renew THEIR session, and the session is
        // what is gone - which is also what the frontend's interceptor needs to hear in
        // order to clear storage rather than show a "not found" page.
        throw unauthenticated("User not found");
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
