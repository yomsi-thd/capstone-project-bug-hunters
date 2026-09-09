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

// My Investments: one row per project, already joined, so the page needs no follow-up
// request per investment.
router.get(
    "/investments",
    authenticate,
    classCoinController.getMyInvestments
);

// Somebody asking an admin for Class Coins. It sits under /classcoins because it is about
// the caller's own wallet; the review routes sit under /admin because they are an admin's
// work.
//
// No authorize() here: anyone signed in may file one, and the three real rules (an empty
// wallet, nothing already waiting, not an admin) all need the database, so they live in
// the service where there is no way around them.
router.post(
    "/requests",
    authenticate,
    validateBody(coinRequestSchema),
    coinRequestController.createRequest
);

// The caller's own waiting request, or null. The Account page asks so it doesn't invite
// somebody who has already asked to ask again.
router.get(
    "/requests/me",
    authenticate,
    coinRequestController.getMyPending
);

// Add and deduct Class Coins by hand. Admin only.
//
// With `authenticate` alone and the target taken from the token, any signed-in user could
// credit their own wallet. Class Coins are the only measure of a project's popularity, so
// self-minting would make the whole ranking meaningless.
//
// The wallet is named in the body as { user_id, amount } rather than read from the token:
// an admin topping up their own wallet is not what either route is for, and an admin has
// no balance of their own anyway.
router.post(
    "/add",
    authenticate,
    authorize("ADMIN"),
    validateBody(walletAdjustmentSchema),
    classCoinController.addCoins
);

// Bulk grant. Separate from /add because it is atomic across the whole list: looping
// /add from the browser could leave an admin with half a class credited and no way to
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