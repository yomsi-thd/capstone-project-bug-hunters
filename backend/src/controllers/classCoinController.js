const classCoinService = require("../services/classCoinService");
const asyncHandler = require("../http/asyncHandler");
const { page } = require("../http/envelope");
const { validationFailed } = require("../errors/AppError");
const M = require("../validation/messages");

// Get ClassCoin balance
const getClassCoin = asyncHandler(async (req, res) => {
    const classCoin = await classCoinService.getClassCoin(req.user.id);

    res.status(200).json(classCoin);
});

// Get transaction history
const getTransactions = asyncHandler(async (req, res) => {
    const transactions = await classCoinService.getTransactions(req.user.id);

    res.status(200).json(page(transactions));
});

// One row per project this user has invested in, for My Investments.
const getMyInvestments = asyncHandler(async (req, res) => {
    const investments = await classCoinService.getMyInvestments(req.user.id);

    res.status(200).json(page(investments));
});

/**
 * The wallet to credit or debit is named in the body, never taken from the token.
 *
 * Reading req.user.id here, on routes with no role guard, would let any signed-in user
 * mint Class Coins into their own wallet, and coins are the only measure of a project's
 * popularity. An admin topping up their own wallet is not what the endpoint is for
 * either: an admin has no balance at all.
 */
function targetWallet(req) {
    const { user_id: userId, amount } = req.body;

    // The schema on the route catches this first. Kept here as well, from the same
    // constant, because a controller should not depend on a middleware having run.
    if (!userId) {
        throw validationFailed(M.WALLET_TARGET_REQUIRED, [
            { field: "user_id", message: M.WALLET_TARGET_REQUIRED },
        ]);
    }

    return { userId, amount };
}

const addCoins = asyncHandler(async (req, res) => {
    const { userId, amount } = targetWallet(req);

    const classCoin = await classCoinService.addCoins(userId, amount);

    res.status(200).json({ message: "ClassCoins added successfully", classCoin });
});

// Bulk and single are the same call, since granting to one person is a list of one. The
// grantor comes from the token rather than the body: it is an audit trail, and a claim
// the caller could type would be worth nothing.
const grantCoins = asyncHandler(async (req, res) => {
    const result = await classCoinService.grantToUsers(req.body.user_ids, req.body.amount, req.user.id);

    res.status(200).json({ message: "Class Coins granted.", ...result });
});

const deductCoins = asyncHandler(async (req, res) => {
    const { userId, amount } = targetWallet(req);

    const classCoin = await classCoinService.deductCoins(userId, amount);

    res.status(200).json({ message: "ClassCoins deducted successfully", classCoin });
});

module.exports = { getClassCoin, getTransactions, getMyInvestments, addCoins, grantCoins, deductCoins };
