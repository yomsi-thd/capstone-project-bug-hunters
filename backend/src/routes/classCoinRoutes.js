const express = require("express");
const router = express.Router();

const classCoinController = require("../controllers/classCoinController");
const authenticate = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");
const { validateBody } = require("../validation/validate");
const { walletAdjustmentSchema, grantSchema } = require("../validation/schemas/accountSchemas");
const coinRequestController = require("../controllers/coinRequestController");
const { coinRequestSchema } = require("../validation/schemas/coinRequestSchemas");

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

// A7 - somebody outside RMIT asking for Class Coins. It sits under /classcoins because it
// is about the signed-in user's own wallet; the REVIEW routes sit under /admin because
// they are about an admin's work.
//
// No authorize() here on purpose: anyone signed in may file one, and the three real rules
// (an empty wallet, no request already waiting, not an admin) all need the database, so
// they live in the service where there is no way around them.
router.post(
    "/requests",
    authenticate,
    validateBody(coinRequestSchema),
    coinRequestController.createRequest
);

// The caller's own waiting request, or null. The Account page asks so that it does not
// invite somebody who has already asked to ask again.
router.get(
    "/requests/me",
    authenticate,
    coinRequestController.getMyPending
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
    validateBody(walletAdjustmentSchema),
    classCoinController.addCoins
);

// Bulk grant. Separate from /add because it is ATOMIC across the whole list - looping
// /add from the browser would leave an admin with half a class credited and no way to
// tell which half.
router.post(
    "/grant",
    authenticate,
    authorize("ADMIN"),
    validateBody(grantSchema),
    classCoinController.grantCoins
);

router.post(
    "/deduct",
    authenticate,
    authorize("ADMIN"),
    validateBody(walletAdjustmentSchema),
    classCoinController.deductCoins
);

module.exports = router;