export const CREATE_PROJECT_STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Story & Media" },
  { id: 3, label: "Team Members" },
  // Matches the step's own heading. Projects have no funding goal, so naming one here
  // would describe something the wizard does not collect.
  { id: 4, label: "Support Levels" },
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

// Step 4 starts empty on purpose. It used to be seeded with an example support level,
// which meant every new project began with a level the creator never wrote, phrased as
// a reward rather than a commitment.
