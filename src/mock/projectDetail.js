export const PROJECT_DETAIL = {
  id: 1,
  tag: "ENGINEERING",
  title: "Autonomous Swarm Drones for Urban Search & Rescue",
  creator: {
    name: "David Chen",
    role: "Lead Researcher, RMIT Robotics Lab",
    avatar: null,
  },
  stats: {
    funded: 83,
    raised: 12450,
    goal: 15000,
    daysLeft: 12,
    backers: 142,
  },
  endorsed: true,
  totalComments: 24,
  img: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1200&q=80",
  gallery: [
    "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&q=80",
  ],
  about: "Our project aims to revolutionize initial response strategies in disaster zones by deploying a coordinated swarm of low-cost, highly intelligent autonomous drones to rapidly map hazardous environments and locate survivors.",
  challenge: "In the critical first 48 hours following an urban disaster, navigating unstable structures is incredibly dangerous for human rescue teams. Current drone technologies rely heavily on individual, manually piloted units, which are slow to deploy and limited in scope.",
  solution: {
    intro: "We are developing a decentralized communication protocol that allows dozens of small quadcopters to share spatial data in real time without relying on external GPS or cellular networks. This creates an instant, evolving 3D mesh map of the affected area, pinpointing thermal signatures of potential survivors.",
    bullets: [
      { title: "Decentralized Mesh Networking", desc: "Drones communicate directly with each other, bypassing damaged infrastructure." },
      { title: "AI-Driven Navigation", desc: "On-board processing allows real-time obstacle avoidance in dynamic environments." },
      { title: "Rapid Deployment", desc: "Entire swarm can be launched from a single, portable ground station in under 3 minutes." },
    ],
  },
  funding: "The initial prototype phase was fully funded by an RMIT internal grant. We are now raising capital to transition from simulated environments to real-world, high-fidelity testing. Your contribution will directly fund the procurement of high-resolution LiDAR sensors and edge-computing modules required for the next generation of our drone swarm.",
  updates: 3,
};

export const COMMENTS = [
  {
    id: 1,
    author: "Sarah Miller",
    role: "BACKER",
    time: "2 days ago",
    text: "This is a fantastic application of swarm technology. Will the 3D maps be compatible with standard CAD software for rescue planning?",
    replies: [
      {
        id: 11,
        author: "David Chen",
        role: "CREATOR",
        time: "1 day ago",
        text: "Great question, Sarah! Yes, we are exporting the point cloud data in .PLY and .LAS formats, which are industry standards for 3D mapping and CAD integration.",
      },
    ],
  },
  {
    id: 2,
    author: "Professor James Wilson",
    role: null,
    time: "3 days ago",
    text: "The decentralization aspect is key here. Have you tested the protocol in high-interference environments like collapsed steel structures?",
    replies: [],
  },
  {
    id: 3,
    author: "Elena Rodriguez",
    role: "BACKER",
    time: "5 days ago",
    text: "Proud to support this! RMIT engineering continues to lead the way in social impact robotics.",
    replies: [],
  },
];