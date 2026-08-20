export const CREATE_PROJECT_STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Story & Media" },
  { id: 3, label: "Team Members" },
  { id: 4, label: "Funding Goals" },
  { id: 5, label: "Review & Submit" },
];

export const SCHOOLS = [
  "School of Engineering",
  "School of Design",
  "School of Business",
  "School of Science",
  "School of Computing"
];

export const MOCK_TEAM = [
  { id: 1, name: "Dr. Alexander Vance", role: "Lead Researcher",  rmitId: "a847291" },
  { id: 2, name: "Chloe Chen",          role: "Student Developer", rmitId: "s3984021" },
];

export const ROLE_BADGE = {
  "Lead Researcher":   "bg-blue-100 text-blue-700",
  "Student Developer": "bg-green-100 text-green-700",
  "Co-Investigator":   "bg-purple-100 text-purple-700",
  "Industry Advisor":  "bg-orange-100 text-orange-700",
};

// CREATE_PROJECT_TIERS was deleted on 2026-08-20. It was DATA, not UI config, and the
// wizard used it as the INITIAL state of step 4 - so every new project began with a
// support level the creator never wrote ("Name listed on digital contributor wall"),
// phrased as a reward, which is exactly what a support level is not. Harmless only
// while tiers were dropped on submit; the moment they were saved for real it would
// have been written straight into the database. Step 4 now starts empty.
