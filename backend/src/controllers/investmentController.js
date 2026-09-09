const investmentService = require("../services/investmentService");
const asyncHandler = require("../http/asyncHandler");

// Route is unchanged: this still answers POST /api/projects/:id/invest.

const investProject = asyncHandler(async (req, res) => {
    // tierId is optional: "just support" sends none, which is a real choice rather than
    // a fallback.
    const { amount, tierId } = req.body;

    const result = await investmentService.investProject(
        req.user.id,
        req.params.id,
        amount,
        tierId ?? null
    );

    res.status(200).json(result);
});

module.exports = { investProject };
