export const HERO_PROJECTS = [
  {
    id: 1,
    tag: "ENGINEERING",
    title: "Next-Gen Prosthetics: Neural Interfaces",
    desc: "Developing affordable, neurally-controlled prosthetic limbs using advanced 3D printing and machine learning to restore natural movement and sensation.",
    img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80",
    funded: 87,
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
    id: 1,
    tag: "COMPUTER SCIENCE",
    title: "Quantum Encryption protocols for IoT devices",
    desc: "Securing the next generation of smart devices against quantum computing...",
    funded: 115,
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80",
  },
  {
    id: 2,
    tag: "DESIGN",
    title: "Generative Typography for Dyslexia",
    desc: "Adaptive font rendering systems that adjust in real-time to improve reading...",
    funded: 88,
    img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300&q=80",
  },
  {
    id: 3,
    tag: "MANUFACTURING",
    title: "Zero-Waste CNC Machining",
    desc: "Developing closed-loop recycling systems for metal chips in advanced manufacturing.",
    funded: 45,
    img: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=300&q=80",
  },
  {
    id: 4,
    tag: "BUSINESS",
    title: "Micro-Credit AI Analysis",
    desc: "Using machine learning to assess non-traditional creditworthiness for small businesses.",
    funded: 72,
    img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&q=80",
  },
];

export const FRESH = [
  {
    id: 1,
    tag: "MICROELECTRONICS",
    title: "Biodegradable Sensors",
    desc: "Creating environmental monitoring sensors that dissolve harmlessly after their operational lifespan.",
    funded: 12,
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
  },
  {
    id: 2,
    tag: "FASHION TECH",
    title: "Kinetic Energy Textiles",
    desc: "Weaving piezoelectric materials into everyday clothing to harvest energy from human movement.",
    funded: 5,
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
  },
  {
    id: 3,
    tag: "ACOUSTICS",
    title: "Active Noise Cancellation Windows",
    desc: "Applying metamaterials to glass to selectively block urban noise pollution while allowing airflow.",
    funded: 22,
    img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80",
  },
];

export const NAV_LINKS = [
  { label: "Discover", path: "/discover" },
  { label: "Departments", path: "#" },
  { label: "Impact", path: "#" },
];

export const FILTERS = ["ALL", "TECH", "ART", "SCIENCE"];

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
};
