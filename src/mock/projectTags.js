// UI configuration for project tags — NOT data.
//
// This file used to be `home.js` and held the mock project catalogue
// (HERO_PROJECTS / TRENDING / FRESH / ALL_PROJECTS). Those are gone: Discover now
// reads real projects from GET /api/projects and derives its hero and trending
// sections from the data. What is left is the tag vocabulary the UI styles and
// filters by, which the backend does not define, so it stays here.
//
// The backend's `category` column is free text. src/api/mappers.js uppercases it,
// so every key below must be uppercase to match. A category with no entry in
// TAG_COLORS falls back to <Tag>'s default colour rather than breaking.

export const FILTERS = ["ALL", "TECH", "ART", "SCIENCE"];

// Which tags each filter chip matches. A tag may sit under more than one
// filter — ENGINEERING is both applied tech and science, the same way
// MICROELECTRONICS and FASHION TECH already straddle two chips.
// BUSINESS is deliberately absent: no chip fits it.
export const FILTER_TAGS = {
  TECH: ["COMPUTER SCIENCE", "TECHNOLOGY", "MICROELECTRONICS", "FASHION TECH", "ENGINEERING", "MANUFACTURING"],
  ART: ["DESIGN", "FASHION TECH", "ARCHITECTURE"],
  SCIENCE: ["BIOTECH", "ACOUSTICS", "MICROELECTRONICS", "ENGINEERING"],
};

export const TAG_COLORS = {
  "COMPUTER SCIENCE": { bg: "#1a3a5c", text: "#fff" },
  DESIGN: { bg: "#2d1a5c", text: "#fff" },
  MANUFACTURING: { bg: "#1a3a2d", text: "#fff" },
  BUSINESS: { bg: "#3a2d1a", text: "#fff" },
  MICROELECTRONICS: { bg: "#1a2d3a", text: "#fff" },
  "FASHION TECH": { bg: "#3a1a2d", text: "#fff" },
  ACOUSTICS: { bg: "#1a3a3a", text: "#fff" },
  ENGINEERING: { bg: "#1a3a5c", text: "#fff" },
  BIOTECH: { bg: "#1a3a2d", text: "#fff" },
  ARCHITECTURE: { bg: "#3a2d1a", text: "#fff" },
  TECHNOLOGY: { bg: "#1a2d3a", text: "#fff" },
};
