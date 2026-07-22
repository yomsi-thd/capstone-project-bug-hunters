const express = require("express");
const router = express.Router();

const classCoinController = require("../controllers/classCoinController");
const authenticate = require("../middlewares/authMiddleware");

// Get balance
router.get(
    "/",
    authenticate,
    classCoinController.getClassCoin
);

// Get transaction history
router.get(
    "/transactions",
    authenticate,
    classCoinController.getTransactions
);

// Add ClassCoins
router.post(
    "/add",
    authenticate,
    classCoinController.addCoins
);

// Deduct ClassCoins
router.post(
    "/deduct",
    authenticate,
    classCoinController.deductCoins
);

module.exports = router;