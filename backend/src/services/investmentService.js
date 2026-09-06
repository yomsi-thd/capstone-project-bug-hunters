const projectRepository = require("../repositories/projectRepository");
const classCoinRepository = require("../repositories/classCoinRepository");
const tierRepository = require("../repositories/tierRepository");
const withTransaction = require("../db/withTransaction");
const { AppError, notFound, conflict, validationFailed } = require("../errors/AppError");
const { assertSemesterOpen } = require("./projectAccess");

// `tierId` is the support level the backer picked, and it is OPTIONAL — the modal
// offers "No level — just support" and that is a first-class choice, not a fallback.
async function investProject(userId, projectId, amount, tierId = null) {

    if (!amount || amount <= 0) {
        throw validationFailed("Investment amount must be greater than 0.");
    }

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
