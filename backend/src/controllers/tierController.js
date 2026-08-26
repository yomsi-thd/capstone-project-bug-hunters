const tierService = require("../services/tierService");
const asyncHandler = require("../http/asyncHandler");

// Support levels. "Support Level" on screen, project_tiers in the database and `tier` in
// the code - the wording may change again, the column names should not.
// Routes are unchanged: these still answer /api/projects/:id/tiers.

const getProjectTiers = asyncHandler(async (req, res) => {
    const tiers = await tierService.getProjectTiers(req.params.id, req.user);

    res.status(200).json(tiers);
});

const createTier = asyncHandler(async (req, res) => {
    const tier = await tierService.createTier(req.params.id, req.user.id, req.user.roles, req.body);

    res.status(201).json({ message: "Support level added", tier });
});

const updateTier = asyncHandler(async (req, res) => {
    const tier = await tierService.updateTier(
        req.params.id,
        req.params.tierId,
        req.user.id,
        req.user.roles,
        req.body
    );

    res.status(200).json({ message: "Support level updated", tier });
});

const deleteTier = asyncHandler(async (req, res) => {
    // `hidden` tells the UI which of the two things happened: a level nobody chose is
    // really gone, one somebody chose is only hidden so their history still points at a
    // row that exists.
    const result = await tierService.deleteTier(
        req.params.id,
        req.params.tierId,
        req.user.id,
        req.user.roles
    );

    res.status(200).json({
        message: result.hidden
            ? "Hidden. Backers who chose it keep their history."
            : "Support level deleted",
        hidden: result.hidden,
    });
});

module.exports = { getProjectTiers, createTier, updateTier, deleteTier };
