const projectRepository = require("../repositories/projectRepository");
const classCoinRepository = require("../repositories/classCoinRepository");
const tierRepository = require("../repositories/tierRepository");
const withTransaction = require("../db/withTransaction");
const { AppError, notFound, conflict, forbidden, validationFailed } = require("../errors/AppError");
const M = require("../validation/messages");
const { assertSemesterOpen } = require("./projectAccess");

// `tierId` is the support level the backer picked, and it is OPTIONAL — the modal
// offers "No level — just support" and that is a first-class choice, not a fallback.
async function investProject(userId, projectId, amount, tierId = null) {

    if (!amount || amount <= 0) {
        throw validationFailed("Investment amount must be greater than 0.");
    }

    try {
        return await runInvestment(userId, projectId, amount, tierId);
    } catch (error) {
        // The unique index caught what the service's own read could not: two requests
        // that both saw "not backed yet" before either committed. The person double-
        // clicked a button - they must read the same sentence either way, not Postgres's.
        if (error && error.code === "23505") {
            throw conflict(M.CONTRIBUTION_ALREADY_MADE);
        }

        throw error;
    }
}

async function runInvestment(userId, projectId, amount, tierId) {

    return await withTransaction(async (client) => {

        // Read inside the transaction, so an archive or a hidden level landing mid-flight
        // rolls the whole thing back rather than being recorded against stale state.
        const project = await projectRepository.findById(projectId, client);

        if (!project) {
            throw notFound("Project not found.");
        }

        if (project.status !== "APPROVED") {
            throw conflict("Only approved projects can receive investments.");
        }

        // Checked inside the transaction alongside the status, so an archive landing
        // mid-flight rolls the investment back rather than funding a hidden project.
        if (project.archived_at) {
            throw conflict("This project has been archived and is no longer accepting investments.");
        }

        // The second freeze axis, checked in the same place and for the same reason: the
        // clock can pass the semester's end_date while an investment is in flight, and
        // the right answer then is a rollback, not a transaction recorded against a term
        // that has closed.
        //
        // ⚠️ The archived check above is a hand-written copy of projectAccess's
        // assertNotArchived, kept because its wording speaks to a backer's wallet
        // ("no longer accepting investments") where the shared one speaks to a creator
        // ("Restore it first"). Losing that sentence would be a worse trade than the
        // duplication. assertSemesterOpen has no such conflict, so it is imported.
        assertSemesterOpen(project);

        // ⚠️ Until 2026-09-07 this was a UI gate ONLY. The sidebar hides the invest
        // button from the owner (it shows EDIT THIS PROJECT instead) and nothing behind
        // it checked, so a hand-made request walked straight through - and one did:
        // project 6 on the shared database carried its own creator's 300 CC. Same class
        // of hole as canInvest before authorize("BACKER") landed on 2026-08-24, and as
        // POST /classcoins/add before it grew authorize("ADMIN") on 2026-08-21.
        //
        // 403 rather than 409: this is not "the current state refuses it", it is a door
        // that is not yours - the same answer the route guard gives a non-BACKER.
        if (project.creator_id === userId) {
            throw forbidden(M.CONTRIBUTION_OWN_PROJECT);
        }

        // One contribution per person per project. Read on the transaction's client so
        // two requests arriving together cannot both see "nothing here yet"; the partial
        // unique index on (classcoin_id, project_id) is the line under this one, and it
        // is what makes the double-clicked CONFIRM impossible rather than unlikely.
        //
        // ⚠️ Placed AFTER the project-level rules on purpose. Somebody who already
        // backed a project that has since been archived should read "this project has
        // been archived" - that is the truer answer, and it is the same answer everyone
        // else gets.
        const existing = await classCoinRepository.findContribution(userId, projectId, client);

        if (existing) {
            throw conflict(M.CONTRIBUTION_ALREADY_MADE);
        }

        // Resolved INSIDE the transaction, for the same reason archived_at is: the
        // creator can hide a level or raise its minimum while this investment is in
        // flight, and the right answer then is to roll back rather than to record a
        // tier_id that no longer means what the backer was shown.
        let tier = null;

        if (tierId) {

            // Scoped to this project, so a level id belonging to another project cannot
            // be attached to this investment by editing the request body.
            tier = await tierRepository.findForProject(tierId, projectId, client);

            if (!tier || !tier.is_active) {
                throw conflict("That support level is no longer available.");
            }

            if (amount < tier.min_amount) {
                throw validationFailed(`This level needs at least ${tier.min_amount} CC.`);
            }
        }

        // Atomically deduct balance
        const wallet = await classCoinRepository.deductBalance(
            userId,
            amount,
            client
        );

        if (!wallet) {
            throw new AppError(409, "INSUFFICIENT_FUNDS", "Insufficient ClassCoins.");
        }

        // Increase project funding
        await projectRepository.increaseCurrentAmount(
            projectId,
            amount,
            client
        );

        // Save transaction
        const transaction = await classCoinRepository.createTransaction(
            {
                classcoin_id: wallet.id,
                project_id: projectId,
                type: "INVEST",
                amount,
                description: `Invested in project #${projectId}`,
                tier_id: tier ? tier.id : null
            },
            client
        );

        return {
            message: "Investment successful.",
            transaction
        };
    });
}

module.exports = { investProject };
