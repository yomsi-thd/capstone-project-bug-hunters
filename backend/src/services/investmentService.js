const projectRepository = require("../repositories/projectRepository");
const classCoinRepository = require("../repositories/classCoinRepository");
const tierRepository = require("../repositories/tierRepository");
const withTransaction = require("../db/withTransaction");
const { AppError, notFound, conflict, forbidden, validationFailed } = require("../errors/AppError");
const M = require("../validation/messages");
const { assertSemesterOpen } = require("./projectAccess");

// `tierId` is the support level the backer picked, and it is optional: the modal offers
// "just support", which is a real choice rather than a fallback.
async function investProject(userId, projectId, amount, tierId = null) {

    if (!amount || amount <= 0) {
        throw validationFailed("Investment amount must be greater than 0.");
    }

    try {
        return await runInvestment(userId, projectId, amount, tierId);
    } catch (error) {
        // The unique index catches what the service's own read cannot: two requests that
        // both saw "not backed yet" before either committed. The person double-clicked a
        // button, so they should read our sentence rather than Postgres's.
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

        // The second freeze axis, checked here for the same reason: the clock can pass
        // the semester's end_date while an investment is in flight, and a rollback is
        // better than a transaction recorded against a closed term.
        //
        // The archived check above is a hand-written copy of projectAccess's
        // assertNotArchived, kept because its wording speaks to a backer ("no longer
        // accepting investments") where the shared one speaks to a creator ("restore it
        // first"). assertSemesterOpen has no such conflict, so it is imported.
        assertSemesterOpen(project);

        // A creator cannot invest in their own project. The sidebar hides the button
        // from the owner, but that is a UI gate: without this check a hand-made request
        // walks straight through, and one did.
        //
        // 403 rather than 409, because this is not the current state refusing the request
        // but a door that isn't yours: the same answer the route guard gives a
        // non-backer.
        if (project.creator_id === userId) {
            throw forbidden(M.CONTRIBUTION_OWN_PROJECT);
        }

        // The rest of the team, matched by the email the creator listed them under. The
        // owner above is caught by creator_id, and nothing else ties a team row to an
        // account.
        //
        // 403 for the same reason as the rule above it: not a state refusing the request
        // but a door that isn't yours.
        //
        // Reads on the transaction's client, like everything else here.
        if (await projectRepository.isTeamMemberByEmail(projectId, userId, client)) {
            throw forbidden(M.CONTRIBUTION_TEAM_MEMBER);
        }

        // One contribution per person per project. Read on the transaction's client so
        // two requests arriving together cannot both see "nothing here yet", with the
        // partial unique index on (classcoin_id, project_id) underneath: that is what
        // makes a double-clicked CONFIRM impossible rather than merely unlikely.
        //
        // Placed after the project-level rules on purpose. Somebody who already backed a
        // project that has since been archived should read "this project has been
        // archived", which is the truer answer and the one everyone else gets.
        const existing = await classCoinRepository.findContribution(userId, projectId, client);

        if (existing) {
            throw conflict(M.CONTRIBUTION_ALREADY_MADE);
        }

        // Resolved inside the transaction, for the same reason archived_at is: the
        // creator can hide a level or raise its minimum while this investment is in
        // flight, and rolling back beats recording a tier_id that no longer means what
        // the backer was shown.
        let tier = null;

        if (tierId) {

            // Scoped to this project, so a level id from another project cannot be
            // attached to this investment by editing the request body.
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
