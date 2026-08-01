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

// Add ClassCoins (Development/Admin)
async function addCoins(req, res) {
    try {
        const { amount } = req.body;

        const classCoin = await classCoinService.addCoins(
            req.user.id,
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

// Deduct ClassCoins (Development/Admin)
async function deductCoins(req, res) {
    try {
        const { amount } = req.body;

        const classCoin = await classCoinService.deductCoins(
            req.user.id,
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
    addCoins,
    deductCoins
};