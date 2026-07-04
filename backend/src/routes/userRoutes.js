const express = require("express");

const router = express.Router();

const userController =
    require("../controllers/userController");

const authenticate =
    require("../middlewares/authMiddleware");

router.get(
    "/profile",
    authenticate,
    userController.getProfile
);

router.put(
    "/profile",
    authenticate,
    userController.updateProfile
);

router.put(
    "/change-password",
    authenticate,
    userController.changePassword
);

router.delete(
    "/profile",
    authenticate,
    userController.deleteAccount
);

module.exports = router;