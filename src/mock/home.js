// Ids are unique across HERO_PROJECTS / TRENDING / FRESH — they are three
// orderings over one project pool, not three separate entities. Ids that have
// a mock detail page live in PROJECT_DETAILS (mock/projectDetail.js).
export const HERO_PROJECTS = [
  {
    id: 1,
    tag: "ENGINEERING",
    title: "Autonomous Swarm Drones for Urban Search & Rescue",
    desc: "Deploying a coordinated swarm of low-cost autonomous drones to rapidly map hazardous disaster zones and locate survivors.",
    img: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80",
    funded: 83,
    large: true,
  },
  {
    id: 2,
    tag: "BIOTECH",
    title: "Algae-Based Biofuels",
    img: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80",
    funded: 60,
    large: false,
  },
  {
    id: 3,
    tag: "ARCHITECTURE",
    title: "Modular Urban Libraries",
    img: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80",
    funded: 34,
    large: false,
  },
];

export const TRENDING = [
  {
    id: 4,
    tag: "COMPUTER SCIENCE",
    title: "Quantum Encryption protocols for IoT devices",
    desc: "Securing the next generation of smart devices against quantum computing...",
    funded: 115,
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80",
  },
  {
    id: 5,
    tag: "DESIGN",
    title: "Generative Typography for Dyslexia",
    desc: "Adaptive font rendering systems that adjust in real-time to improve reading...",
    funded: 88,
    img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300&q=80",
  },
  {
    id: 6,
    tag: "MANUFACTURING",
    title: "Zero-Waste CNC Machining",
    desc: "Developing closed-loop recycling systems for metal chips in advanced manufacturing.",
    funded: 45,
    img: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=300&q=80",
  },
  {
    id: 7,
    tag: "BUSINESS",
    title: "Micro-Credit AI Analysis",
    desc: "Using machine learning to assess non-traditional creditworthiness for small businesses.",
    funded: 72,
    img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&q=80",
  },
];

export const FRESH = [
  {
    id: 8,
    tag: "MICROELECTRONICS",
    title: "Biodegradable Sensors",
    desc: "Creating environmental monitoring sensors that dissolve harmlessly after their operational lifespan.",
    funded: 12,
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
  },
  {
    id: 9,
    tag: "FASHION TECH",
    title: "Kinetic Energy Textiles",
    desc: "Weaving piezoelectric materials into everyday clothing to harvest energy from human movement.",
    funded: 5,
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
  },
  {
    id: 10,
    tag: "ACOUSTICS",
    title: "Active Noise Cancellation Windows",
    desc: "Applying metamaterials to glass to selectively block urban noise pollution while allowing airflow.",
    funded: 22,
    img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80",
  },
  {
    id: 11,
    tag: "ENGINEERING",
    title: "Eco-Concrete RMIT",
    desc: "Developing sustainable construction materials using recycled waste from RMIT campus renovations.",
    funded: 85,
    img: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=400&q=80",
  },
  {
    id: 12,
    tag: "TECHNOLOGY",
    title: "Cyber-Shield AI",
    desc: "Autonomous threat detection system designed for small business cybersecurity infrastructure.",
    funded: 42,
    img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=80",
  },
  {
    id: 13,
    tag: "BIOTECH",
    title: "Mycelium Packaging Lab",
    desc: "Growing compostable protective packaging from fungal mycelium and agricultural waste in seven days.",
    funded: 17,
    img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80",
  },
];

export const NAV_LINKS = [
  { label: "Discover", path: "/discover" },
  { label: "Departments", path: "#" },
  { label: "Impact", path: "#" },
];

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
