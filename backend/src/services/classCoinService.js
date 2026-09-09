const classCoinRepository = require("../repositories/classCoinRepository");
const userRepository = require("../repositories/userRepository");
const withTransaction = require("../db/withTransaction");
const M = require("../validation/messages");
const { AppError, notFound, conflict } = require("../errors/AppError");

// "test.com" is a demo allowance rather than an RMIT domain. While it is in this list,
// anyone who knows the URL can mint themselves coins by registering an address on it,
// which is the hole admin-issued coins exist to close. It is here because every test and
// demo account uses that domain and a demo with empty wallets shows nothing. Remove it
// before this serves real students.
const AUTO_GRANT_DOMAINS = ["rmit.edu.vn", "rmit.edu.au", "student.rmit.edu.au", "test.com"];

// Against the 500 CC cap per project, this lets one person back at most eight projects.
// Our number, not the client's: they fixed the cap but not the starting balance.
const REGISTRATION_GRANT = 4000;

/**
 * The Class Coins a new account starts with, or none.
 *
 * It lives here rather than in authService because how much a new account is worth is a
 * rule about wallets, and the sign-up flow has no business knowing the number.
 *
 * Returns the amount granted, 0 when the domain does not qualify, so the caller can log
 * it without asking a second question.
 */
async function grantOnRegistration(userId, email) {
    const domain = String(email || "").split("@").pop().toLowerCase();

    if (!AUTO_GRANT_DOMAINS.includes(domain)) {
        return 0;
    }

    const wallet = await classCoinRepository.getBalance(userId);

    if (!wallet) {
        return 0;
    }

    // One transaction. As two separate statements the balance moves first and the ledger
    // row can fail second, leaving a wallet holding coins nothing can account for. Never
    // move a balance without the row that explains it.
    await withTransaction(async (client) => {
        await classCoinRepository.addBalance(userId, REGISTRATION_GRANT, client);
        await classCoinRepository.createTransaction(
            {
                classcoin_id: wallet.id,
                project_id: null,
                type: "ADMIN_ADD",
                amount: REGISTRATION_GRANT,
                description: "Automatic grant on registration",
                granted_by: null
            },
            client
        );
    });

    return REGISTRATION_GRANT;
}

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

// The user's investments, one row per project. Unlike getTransactions this needs no
// wallet lookup first, since the query joins through classcoins itself, so a user with no
// wallet row gets an empty list rather than a 404.
async function getMyInvestments(userId) {
    return await classCoinRepository.getInvestmentsByUser(userId);
}

/**
 * Credits one wallet and writes the ledger row that explains it.
 *
 * It takes a `client` and never opens a transaction of its own. Both callers already run
 * inside one, and withTransaction takes a new connection per call, so a transaction
 * opened here would commit independently of its caller's and could not be rolled back
 * with it. That is the failure this function exists to prevent: approving a request whose
 * UPDATE then returns 0 rows has to take the coins back with it.
 *
 * `wallet` is an optimisation for the bulk path, which already fetched every wallet in
 * one query; without it a class of thirty would cost thirty extra lookups.
 *
 * Every query below is passed `client`. One that forgets takes its own connection.
 */
async function creditWallet(userId, amount, { grantedBy, description, wallet }, client) {
    // Make one if this account never had it, inside the caller's transaction so a later
    // failure takes the new wallet back with it.
    const target =
        wallet ??
        (await classCoinRepository.findWalletsByUserIds([userId], client))[0] ??
        (await classCoinRepository.createClassCoin(userId, client));

    await classCoinRepository.addBalance(userId, amount, client);

    await classCoinRepository.createTransaction(
        {
            classcoin_id: target.id,
            project_id: null,
            type: "ADMIN_ADD",
            amount,
            description,
            granted_by: grantedBy
        },
        client
    );

    return target;
}

/**
 * Grants Class Coins to a list of accounts.
 *
 * One transaction for the whole list, which is why this endpoint exists rather than the
 * screen looping over a single-grant route. An admin issuing coins to a class of thirty
 * must never end up with fifteen done and no way to tell which fifteen.
 *
 * Every query below is passed `client`. One that forgets takes its own connection and
 * commits independently of the rollback.
 */
async function grantToUsers(userIds, amount, grantedBy) {
    // A pasted list can repeat an id, and granting twice for one checkbox is not what
    // the admin asked for.
    const ids = [...new Set(userIds.map(Number))];

    return await withTransaction(async (client) => {

        // Existence is checked against `users` rather than wallets. Some accounts predate
        // automatic wallet creation and have no wallet row, and refusing those with "no
        // longer exists" would be untrue and would leave them unable to receive coins.
        const existing = await userRepository.findExistingIdsAmong(ids, client);

        if (existing.length !== ids.length) {
            throw notFound(M.GRANT_TARGET_MISSING);
        }

        const admins = await userRepository.findAdminIdsAmong(ids, client);

        if (admins.length > 0) {
            throw conflict(M.GRANT_TO_ADMIN);
        }

        const wallets = await classCoinRepository.findWalletsByUserIds(ids, client);
        const walletByUser = new Map(wallets.map((w) => [w.user_id, w]));

        for (const userId of ids) {
            await creditWallet(
                userId,
                amount,
                {
                    grantedBy,
                    description: "Granted by an administrator",
                    wallet: walletByUser.get(userId)
                },
                client
            );
        }

        return { granted: ids.length, amount };
    });
}

// Add ClassCoins
async function addCoins(userId, amount) {
    // The same rule the bulk route runs, or the batch limit could be walked around one
    // request at a time.
    const admins = await userRepository.findAdminIdsAmong([userId]);

    if (admins.length > 0) {
        throw conflict(M.GRANT_TO_ADMIN);
    }

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
        // Its own code rather than a generic conflict. "You don't have enough" is the
        // one refusal a backer meets often enough for the UI to recognise without
        // matching on the sentence.
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
    AUTO_GRANT_DOMAINS,
    REGISTRATION_GRANT,
    grantOnRegistration,
    creditWallet,
    grantToUsers,
    getClassCoin,
    getTransactions,
    getMyInvestments,
    addCoins,
    deductCoins,
};