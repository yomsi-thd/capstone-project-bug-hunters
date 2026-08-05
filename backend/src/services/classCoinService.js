const classCoinRepository = require("../repositories/classCoinRepository");

// Get ClassCoin account
async function getClassCoin(userId) {
    const classCoin = await classCoinRepository.findByUserId(userId);

    if (!classCoin) {
        throw new Error("ClassCoin account not found");
    }

    return classCoin;
}

// Get transaction history
async function getTransactions(userId) {
    const classCoin = await classCoinRepository.getBalance(userId);

    if (!classCoin) {
        throw new Error("ClassCoin account not found");
    }

    return await classCoinRepository.getTransactions(classCoin.id);
}

// Add ClassCoins
async function addCoins(userId, amount) {
    const classCoin = await classCoinRepository.getBalance(userId);

    if (!classCoin) {
        throw new Error("ClassCoin account not found");
    }

    const newBalance = classCoin.balance + amount;

    await classCoinRepository.updateBalance(
        classCoin.id,
        newBalance
    );

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
        throw new Error("ClassCoin account not found");
    }

    if (classCoin.balance < amount) {
        throw new Error("Insufficient ClassCoins");
    }

    const newBalance = classCoin.balance - amount;

    await classCoinRepository.updateBalance(
        classCoin.id,
        newBalance
    );

    await classCoinRepository.createTransaction({
        classcoin_id: classCoin.id,
        project_id: null,
        type: "ADMIN_DEDUCT",
        amount,
        description: "Deducted ClassCoins"
    });

    return await classCoinRepository.getBalance(userId);
}

// Support a project (used later)
//async function transferToProject(userId, projectId, amount) {
//    const classCoin = await classCoinRepository.findByUserId(userId);
//
//    if (!classCoin) {
//        throw new Error("ClassCoin account not found");
//    }

//    if (classCoin.balance < amount) {
//        throw new Error("Insufficient ClassCoins");
//    }
//
//    const newBalance = classCoin.balance - amount;

//  await classCoinRepository.updateBalance(
//       classCoin.id,
//        newBalance
//    );

//    await classCoinRepository.createTransaction({
//        classcoin_id: classCoin.id,
//        project_id: projectId,
//        type: "SUPPORT",
//        amount,
//        description: "Supported a project"
//    });

//   return await classCoinRepository.findByUserId(userId);
//}

module.exports = {
    getClassCoin,
    getTransactions,
    addCoins,
    deductCoins,
    //transferToProject
};