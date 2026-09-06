const express = require("express");
const router = express.Router();

const semesterController = require("../controllers/semesterController");

// PUBLIC, no auth at all. Discover's semester picker has to work for a signed-out
// visitor, and a semester's name and dates are not private — they are the university's
// own timetable.
//
// A full router → controller → service → repository stack, unlike /api/health, which is
// declared straight in app.js: that one is an infrastructure probe with nothing to
// model, this is a real domain resource.
router.get("/", semesterController.listSemesters);

module.exports = router;
