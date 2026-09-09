const express = require("express");
const router = express.Router();

const semesterController = require("../controllers/semesterController");

// Public, with no auth at all. Discover's semester picker has to work for a signed-out
// visitor, and a semester's name and dates are the university's own timetable.
//
// It gets a full router, controller, service and repository stack, unlike /api/health,
// which is declared straight in app.js: that one is an infrastructure probe with nothing
// to model, while this is a real domain resource.
router.get("/", semesterController.listSemesters);

module.exports = router;
