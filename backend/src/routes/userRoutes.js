const express = require("express");

const router = express.Router();

const userController =
    require("../controllers/userController");

const authenticate =
    require("../middlewares/authMiddleware");

const { validateBody } = require("../validation/validate");
const {
    updateProfileSchema,
    changePasswordSchema,
} = require("../validation/schemas/accountSchemas");

router.get(
    "/profile",
    authenticate,
    userController.getProfile
);

router.put(
    "/profile",
    authenticate,
    validateBody(updateProfileSchema),
    userController.updateProfile
);

router.put(
    "/change-password",
    authenticate,
    validateBody(changePasswordSchema),
    userController.changePassword
);

router.delete(
    "/profile",
    authenticate,
    userController.deleteAccount
);

module.exports = router;