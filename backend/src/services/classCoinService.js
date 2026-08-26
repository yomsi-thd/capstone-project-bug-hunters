const classCoinRepository = require("../repositories/classCoinRepository");
const { AppError, notFound } = require("../errors/AppError");

// Get ClassCoin account
async function getClassCoin(userId) {
    const classCoin = await classCoinRepository.getBalance(userId);

    if (!classCoin) {
        throw notFound("ClassCoin account not found");
    }

    return classCoin;
}

// Get transaction history
async function getTransactions(userId) {
    const classCoin = await classCoinRepository.getBalance(userId);

    if (!classCoin) {
        throw notFound("ClassCoin account not found");
    }

    return await classCoinRepository.getTransactions(classCoin.id);
}

// The user's investments, one row per project. Unlike getTransactions above this does
// NOT need the wallet first — the query joins through classcoins itself — so a user who
// somehow has no wallet row gets an empty list rather than a 404.
async function getMyInvestments(userId) {
    return await classCoinRepository.getInvestmentsByUser(userId);
}

// Add ClassCoins
async function addCoins(userId, amount) {
    const classCoin = await classCoinRepository.getBalance(userId);

    if (!classCoin) {
        throw notFound("ClassCoin account not found");
    }

    await classCoinRepository.addBalance(userId, amount);

    await classCoinRepository.createTransaction({
        classcoin_id: classCoin.id,
        project_id: null,
        type: "ADMIN_ADD",
        amount,
        description: "Added ClassCoins"
    });

    return await classCoinRepository.getBalance(userId);
}

// Deduct ClassCoins
async function deductCoins(userId, amount) {
    const classCoin = await classCoinRepository.getBalance(userId);

    if (!classCoin) {
        throw notFound("ClassCoin account not found");
    }

    if (classCoin.balance < amount) {
        // Its own code, not a generic conflict: "you do not have enough" is the one
        // refusal a backer meets often enough for the UI to want to recognise it
        // without matching on the sentence.
        throw new AppError(409, "INSUFFICIENT_FUNDS", "Insufficient ClassCoins");
    }

    await classCoinRepository.deductBalance(userId, amount);

    await classCoinRepository.createTransaction({
        classcoin_id: classCoin.id,
        project_id: null,
        type: "ADMIN_DEDUCT",
        amount,
        description: "Deducted ClassCoins"
    });

    return await classCoinRepository.getBalance(userId);
}

module.exports = {
    getClassCoin,
    getTransactions,
    getMyInvestments,
    addCoins,
    deductCoins,
};