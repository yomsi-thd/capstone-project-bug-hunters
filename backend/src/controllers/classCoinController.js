const classCoinService = require("../services/classCoinService");
const asyncHandler = require("../http/asyncHandler");
const { validationFailed } = require("../errors/AppError");

// Get ClassCoin balance
const getClassCoin = asyncHandler(async (req, res) => {
    const classCoin = await classCoinService.getClassCoin(req.user.id);

    res.status(200).json(classCoin);
});

// Get transaction history
const getTransactions = asyncHandler(async (req, res) => {
    const transactions = await classCoinService.getTransactions(req.user.id);

    res.status(200).json(transactions);
});

// One row per project this user has invested in, for My Investments.
const getMyInvestments = asyncHandler(async (req, res) => {
    const investments = await classCoinService.getMyInvestments(req.user.id);

    res.status(200).json(investments);
});

/**
 * The wallet to credit or debit is named in the BODY, never taken from the token.
 *
 * Reading req.user.id here was the whole bug (fixed 2026-08-21): these routes had no
 * role guard either, so ANY signed-in user could mint Class Coins into their own wallet
 * — and Class Coins are the only measure of a project's popularity, so that made the
 * ranking meaningless. An admin topping up their OWN wallet is not what the endpoint is
 * for either; after the role separation an admin has no balance at all.
 */
function targetWallet(req, verb) {
    const { user_id: userId, amount } = req.body;

    if (!userId) {
        throw validationFailed(`user_id is required - name the account to ${verb}.`, [
            { field: "user_id", message: `Name the account to ${verb}.` },
        ]);
    }

    return { userId, amount };
}

const addCoins = asyncHandler(async (req, res) => {
    const { userId, amount } = targetWallet(req, "credit");

    const classCoin = await classCoinService.addCoins(userId, amount);

    res.status(200).json({ message: "ClassCoins added successfully", classCoin });
});

const deductCoins = asyncHandler(async (req, res) => {
    const { userId, amount } = targetWallet(req, "debit");

    const classCoin = await classCoinService.deductCoins(userId, amount);

    res.status(200).json({ message: "ClassCoins deducted successfully", classCoin });
});

module.exports = { getClassCoin, getTransactions, getMyInvestments, addCoins, deductCoins };
