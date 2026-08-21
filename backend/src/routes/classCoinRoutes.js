const express = require("express");
const router = express.Router();

const classCoinController = require("../controllers/classCoinController");
const authenticate = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");

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

// My Investments: one row per project, already joined to it. Replaces the page's old
// "read every transaction, then fetch each project" loop.
router.get(
    "/investments",
    authenticate,
    classCoinController.getMyInvestments
);

// Add / deduct ClassCoins by hand. ADMIN ONLY.
//
// ⚠️ Both routes shipped with `authenticate` alone until 2026-08-21, so ANY signed-in
// user could credit their own wallet - the controller took the target from the token.
// Class Coins are the only measure of a project's popularity, so self-minting made the
// whole ranking meaningless. The transaction types have said ADMIN_ADD / ADMIN_DEDUCT
// from the start; only the guard was missing.
//
// The wallet is named in the body ({ user_id, amount }), not taken from the token: an
// admin topping up their OWN wallet is not what either route is for, and after the admin
// role separation an admin has no balance of their own at all.
router.post(
    "/add",
    authenticate,
    authorize("ADMIN"),
    classCoinController.addCoins
);

router.post(
    "/deduct",
    authenticate,
    authorize("ADMIN"),
    classCoinController.deductCoins
);

module.exports = router;