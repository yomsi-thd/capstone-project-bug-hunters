const semesterService = require("../services/semesterService");
const asyncHandler = require("../http/asyncHandler");
const { page } = require("../http/envelope");

// Every semester, newest first, each carrying `is_open` and `is_browsable` so the
// frontend never compares dates itself — that comparison is exactly where a DATE
// column loses a day in a UTC browser.
//
// An envelope like the other list endpoints. Paging is not offered: there are three
// rows a year and Discover wants all of them in its picker.
const listSemesters = asyncHandler(async (_req, res) => {
    const semesters = await semesterService.listSemesters();

    res.status(200).json(page(semesters));
});

module.exports = { listSemesters };
