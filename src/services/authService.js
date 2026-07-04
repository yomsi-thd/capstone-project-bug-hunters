const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRepository = require("../repositories/userRepository");

async function register(fullName, email, password) {

    const existing =
        await userRepository.findByEmail(email);

    if (existing) {
        throw new Error("Email already exists");
    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    return await userRepository.createUser(
        fullName,
        email,
        hashedPassword
    );
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

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );

    return {
        token,
        user: {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            role: user.role
        }
    };
}

module.exports = {
    register,
    login
};