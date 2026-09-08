const classCoinRepository = require("../repositories/classCoinRepository");
const userRepository = require("../repositories/userRepository");
const withTransaction = require("../db/withTransaction");
const M = require("../validation/messages");
const { AppError, notFound, conflict } = require("../errors/AppError");

// ⚠️ "test.com" is a DEMO ALLOWANCE, not an RMIT domain. While it is in this list anyone
// who knows the URL can mint themselves 4,000 CC by registering batky@test.com — which is
// precisely the hole that admin-issued coins exist to close. It is here because every test
// and demo account in the shared database uses that domain, and a demo with empty wallets
// shows nothing at all. REMOVE IT the day this serves real students.
const AUTO_GRANT_DOMAINS = ["rmit.edu.vn", "rmit.edu.au", "student.rmit.edu.au", "test.com"];

// 4,000 CC against a 500 CC cap per project means a person can spread across at most
// eight projects. Huy's number, 2026-09-07 — the client fixed the CAP at 500 but has not
// said how much anybody starts with.
const REGISTRATION_GRANT = 4000;

/**
 * The Class Coins a new account starts with, or none.
 *
 * Lives here rather than in authService on purpose: how much a new account is worth is a
 * rule about wallets, and the sign-up flow has no business knowing the number.
 *
 * Returns the amount granted (0 when the domain does not qualify) so the caller can log
 * or report it without asking a second question.
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

    // ⚠️ ONE transaction, and this was learned the hard way on 2026-09-07: written as two
    // separate statements, the balance moved first and the ledger row failed second,
    // leaving a wallet holding 4,000 CC that nothing in the system could account for.
    // Never move a balance without the row that explains it - and "never" has to mean
    // "not even when the second statement throws".
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

// The user's investments, one row per project. Unlike getTransactions above this does
// NOT need the wallet first — the query joins through classcoins itself — so a user who
// somehow has no wallet row gets an empty list rather than a 404.
async function getMyInvestments(userId) {
    return await classCoinRepository.getInvestmentsByUser(userId);
}

/**
 * Credit ONE wallet and write the ledger row that explains it.
 *
 * ⚠️ Takes a `client` and NEVER opens a transaction of its own. Both callers already run
 * inside one — grantToUsers for the whole pasted list, coinRequestService.approve for the
 * request it is approving — and withTransaction takes a NEW connection per call, so a
 * transaction opened in here would commit independently of its caller's and could not be
 * rolled back with it. That is the exact failure this function exists to make impossible:
 * approving a request whose UPDATE then returns 0 rows must take the coins back with it.
 *
 * `wallet` is an optimisation for the bulk path, which already fetched every wallet in
 * one query — without it a class of thirty would cost thirty extra lookups.
 *
 * ⚠️ Every query below is passed `client`. One that forgets takes its own connection from
 * the pool: the 2026-08-06 regression, in the one function written to prevent it.
 */
async function creditWallet(userId, amount, { grantedBy, description, wallet }, client) {
    // Make one if this account never had it. Inside the caller's transaction, so a
    // failure later takes the new wallet back with it.
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
 * Grant Class Coins to a list of accounts.
 *
 * ⚠️ ONE transaction for the whole list, and that is the entire reason this endpoint
 * exists rather than the screen looping over POST /add. An admin issuing coins to a class
 * of thirty must never be left with fifteen done and no way to tell which fifteen.
 *
 * ⚠️ Every query below is passed `client`. One that forgets takes its own connection and
 * commits independently — the 2026-08-06 regression, where ROLLBACK could not undo a
 * funding bump.
 */
async function grantToUsers(userIds, amount, grantedBy) {
    // A pasted list can repeat an id; granting twice for one checkbox is not what the
    // admin asked for.
    const ids = [...new Set(userIds.map(Number))];

    return await withTransaction(async (client) => {

        // ⚠️ Existence is checked against USERS, not wallets. Six accounts on the shared
        // database predate createClassCoin and have no wallet row; refusing those with
        // "no longer exists" would be a lie about an account sitting right there in the
        // table, and would leave them unable to receive coins for ever. Measured
        // 2026-09-07 by trying to grant to two of them.
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
    // The same rule the bulk route runs. Leaving it out here would let the batch rule be
    // walked around one request at a time.
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