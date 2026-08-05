// What lives in this folder is now UI CONFIGURATION, not mock data.
//
// The project / user / investment fixtures were deleted once every page was wired to
// the real API — see docs/superpowers/specs/2026-08-05-wire-frontend-to-backend-design.md.
// `projectDetail.js`, `myInvestments.js` and `creatorMyProjects.js` are gone, and
// `home.js` became `projectTags.js` because only the tag vocabulary survived.
//
// The one real exception is the mock ACCOUNTS in src/context/AuthContext.jsx, kept so
// the UI stays browsable when the backend cannot be reached.
export * from "./projectTags";
export * from "./adminDashboard";
export * from "./adminUserManagement";
export * from "./adminApprovals";
export * from "./createProject";
export * from "./creatorDashboard";
export * from "./editProject";
