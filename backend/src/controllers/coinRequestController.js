const coinRequestService = require("../services/coinRequestService");
const asyncHandler = require("../http/asyncHandler");
const { page } = require("../http/envelope");

// The person filing is the signed-in user, TAKEN FROM THE TOKEN and never from the body -
// same reason as targetWallet in classCoinController: an identity the caller could type is
// worth nothing.
const createRequest = asyncHandler(async (req, res) => {
    const request = await coinRequestService.createRequest(req.user.id, req.body.note);

    res.status(201).json({ message: "Request sent.", request });
});

const getMyPending = asyncHandler(async (req, res) => {
    const request = await coinRequestService.getMyPending(req.user.id);

    res.status(200).json(request);
});

const getAllPending = asyncHandler(async (req, res) => {
    const requests = await coinRequestService.getAllPending();

    res.status(200).json(page(requests));
});

// The amount comes from the BODY (the admin types it); the reviewer comes from the TOKEN.
// The reviewer is an audit trail, and a claim the caller could type would be worth nothing.
const approve = asyncHandler(async (req, res) => {
    const request = await coinRequestService.approve(req.params.id, req.user.id, req.body.amount);

    res.status(200).json({ message: "Class Coins granted.", request });
});

const reject = asyncHandler(async (req, res) => {
    const request = await coinRequestService.reject(req.params.id, req.user.id);

    res.status(200).json({ message: "Coin request declined.", request });
});

module.exports = { createRequest, getMyPending, getAllPending, approve, reject };
