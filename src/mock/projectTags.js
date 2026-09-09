// UI configuration for project tags, not data. Discover reads real projects from
// GET /api/projects; what lives here is the tag vocabulary the UI styles and filters by,
// which the backend does not define.
//
// The `category` column is free text and mappers.js uppercases it, so every key below
// has to be uppercase to match. A category with no entry falls back to <Tag>'s default
// colour rather than breaking.

export const FILTERS = ["ALL", "TECH", "ART", "SCIENCE"];

// Which tags each filter chip matches. A tag may sit under more than one chip:
// ENGINEERING is both applied tech and science, as are MICROELECTRONICS and FASHION
// TECH. BUSINESS is absent on purpose, since no chip fits it.
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
