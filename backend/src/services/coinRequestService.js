const coinRequestRepository = require("../repositories/coinRequestRepository");
const classCoinRepository = require("../repositories/classCoinRepository");
const userRepository = require("../repositories/userRepository");
const classCoinService = require("./classCoinService");
const withTransaction = require("../db/withTransaction");
const M = require("../validation/messages");
const { notFound, conflict } = require("../errors/AppError");

// Postgres unique_violation. Here it can only come from coin_requests_one_pending.
const UNIQUE_VIOLATION = "23505";

/**
 * Files a request for Class Coins.
 *
 * There is no "is one already waiting" read before the insert, because two tabs posting
 * at once would both read nothing. The partial unique index decides, and its 23505 is
 * translated into a 409 rather than left as a 500.
 */
async function createRequest(userId, note) {
    const admins = await userRepository.findAdminIdsAmong([userId]);

    if (admins.length > 0) {
        throw conflict(M.GRANT_TO_ADMIN);
    }

    const wallet = await classCoinRepository.getBalance(userId);

    // No wallet row at all counts as empty. Some accounts predate automatic wallet
    // creation, and refusing those would lock out the people who most need to ask.
    if (wallet && Number(wallet.balance) > 0) {
        throw conflict(M.COIN_REQUEST_WALLET_NOT_EMPTY);
    }

    try {
        return await coinRequestRepository.create(userId, note);
    } catch (err) {
        if (err.code === UNIQUE_VIOLATION) {
            throw conflict(M.COIN_REQUEST_PENDING);
        }

        throw err;
    }
}

// Returns null rather than throwing: "never asked" is the ordinary state of almost every
// account, and the Account page asks this on every visit.
async function getMyPending(userId) {
    const request = await coinRequestRepository.findPendingByUserId(userId);

    return request ?? null;
}

async function getAllPending() {
    return await coinRequestRepository.findAllPending();
}

/**
 * Approves a request: credit the wallet, write the ledger row and close the request, in
 * one transaction or not at all.
 *
 * The PENDING check below is a read-then-write and closes nothing on its own, since two
 * admins can both read PENDING and both pass it. `AND status = 'PENDING'` in the UPDATE
 * decides, and 0 rows means the other admin got there first.
 */
async function approve(requestId, adminId, amount) {
    const request = await coinRequestRepository.findById(requestId);

    if (!request) {
        throw notFound("Coin request not found.");
    }

    if (request.status !== "PENDING") {
        throw conflict(M.COIN_REQUEST_ALREADY_REVIEWED);
    }

    return await withTransaction(async (client) => {
        await classCoinService.creditWallet(
            request.user_id,
            amount,
            { grantedBy: adminId, description: "Granted from a coin request" },
            client
        );

        const approved = await coinRequestRepository.approve(requestId, adminId, amount, client);

        // Thrown inside the transaction rather than returned. creditWallet has already
        // run, so the throw is what rolls the coins back; returning would leave coins
        // granted against a request another admin had just rejected, with nothing to
        // account for them. Same shape and reason as approveCreatorRequest.
        if (!approved) {
            throw conflict(M.COIN_REQUEST_ALREADY_REVIEWED);
        }

        return approved;
    });
}

// No transaction needed: one UPDATE, and it touches nobody's wallet.
async function reject(requestId, adminId) {
    const request = await coinRequestRepository.findById(requestId);

    if (!request) {
        throw notFound("Coin request not found.");
    }

    if (request.status !== "PENDING") {
        throw conflict(M.COIN_REQUEST_ALREADY_REVIEWED);
    }

    const rejected = await coinRequestRepository.reject(requestId, adminId);

    // Same race, same reason as approve above.
    if (!rejected) {
        throw conflict(M.COIN_REQUEST_ALREADY_REVIEWED);
    }

    return rejected;
}

module.exports = { createRequest, getMyPending, getAllPending, approve, reject };
