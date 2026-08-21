const classCoinService = require("../services/classCoinService");

// Get ClassCoin balance
async function getClassCoin(req, res) {
    try {
        const classCoin = await classCoinService.getClassCoin(req.user.id);

        res.status(200).json(classCoin);
    } catch (error) {
        res.status(404).json({
            message: error.message
        });
    }
}

// Get transaction history
async function getTransactions(req, res) {
    try {
        const transactions = await classCoinService.getTransactions(req.user.id);

        res.status(200).json(transactions);
    } catch (error) {
        res.status(404).json({
            message: error.message
        });
    }
}

// One row per project this user has invested in, for My Investments.
async function getMyInvestments(req, res) {
    try {
        const investments = await classCoinService.getMyInvestments(req.user.id);

        res.status(200).json(investments);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
}

// Add ClassCoins. ADMIN-only - see the guard in classCoinRoutes.
//
// The wallet to credit is named in the BODY, not taken from the token. Reading
// req.user.id here was the whole bug (fixed 2026-08-21): the route had no role guard
// either, so ANY signed-in user could POST /classcoins/add and mint Class Coins into
// their own wallet. An admin crediting their own wallet is also meaningless - the point
// of the endpoint is to top somebody else up.
async function addCoins(req, res) {
    try {
        const { user_id: userId, amount } = req.body;

        if (!userId) {
            throw new Error("user_id is required - name the account to credit.");
        }

        const classCoin = await classCoinService.addCoins(
            userId,
            amount
        );

        res.status(200).json({
            message: "ClassCoins added successfully",
            classCoin
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
}

// Deduct ClassCoins. ADMIN-only, and the wallet is named in the body for the same
// reasons as addCoins above.
async function deductCoins(req, res) {
    try {
        const { user_id: userId, amount } = req.body;

        if (!userId) {
            throw new Error("user_id is required - name the account to debit.");
        }

        const classCoin = await classCoinService.deductCoins(
            userId,
            amount
        );

        res.status(200).json({
            message: "ClassCoins deducted successfully",
            classCoin
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
}

module.exports = {
    getClassCoin,
    getTransactions,
    getMyInvestments,
    addCoins,
    deductCoins
};