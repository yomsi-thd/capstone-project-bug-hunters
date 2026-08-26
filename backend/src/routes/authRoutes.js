const express = require("express");

const router = express.Router();

const authController =
    require("../controllers/authController");

const { validateBody } = require("../validation/validate");
const {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
} = require("../validation/schemas/authSchemas");

router.post("/register", validateBody(registerSchema), authController.register);

router.post("/login", validateBody(loginSchema), authController.login);

router.post("/refresh", validateBody(refreshTokenSchema), authController.refreshToken);

router.post("/logout", validateBody(refreshTokenSchema), authController.logout);

module.exports = router;