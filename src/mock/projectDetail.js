// Keyed by project id so /project/:id can look up its own detail.
// Ids match the listing entries in mock/home.js: 1 = HERO_PROJECTS[0],
// 11 / 12 = FRESH, which are also MY_INVESTMENTS[].projectId.
// Listing ids without an entry here render the "not found" state.
export const PROJECT_DETAILS = {
  1: {
    id: 1,
    // Owner is the account (AuthContext username) that created this project.
    // When that user views the page they get "EDIT THIS PROJECT" instead of invest.
    // TODO: replace with the ownerId returned by GET /projects/:id when backend is ready.
    ownerId: "student1",
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
    totalComments: 7,
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
  },

  11: {
    id: 11,
    tag: "ENGINEERING",
    title: "Eco-Concrete RMIT",
    creator: {
      name: "Mai Tran",
      role: "PhD Candidate, RMIT School of Civil Engineering",
      avatar: null,
    },
    stats: {
      funded: 85,
      raised: 8500,
      goal: 10000,
      daysLeft: 9,
      backers: 96,
    },
    endorsed: true,
    totalComments: 6,
    img: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
    ],
    about: "Eco-Concrete RMIT turns demolition rubble from campus renovation works into a structural concrete mix, cutting both landfill waste and the cement content that makes conventional concrete so carbon-intensive.",
    challenge: "Cement production accounts for roughly 8% of global CO2 emissions, and every RMIT building refurbishment sends tonnes of crushed masonry straight to landfill. Existing recycled-aggregate mixes lose too much compressive strength to be approved for structural use.",
    solution: {
      intro: "We mill demolition waste into a graded aggregate and pair it with a geopolymer binder activated by fly ash, replacing up to 40% of the Portland cement. Our lab batches have held 32 MPa at 28 days, which clears the threshold for non-primary structural elements.",
      bullets: [
        { title: "Campus Waste Loop", desc: "Rubble is sourced, crushed, and re-poured within the same RMIT construction site." },
        { title: "Geopolymer Binder", desc: "Fly-ash activation replaces up to 40% of Portland cement with no strength penalty." },
        { title: "Verified Mix Design", desc: "Every batch is compression-tested against AS 3600 targets before it leaves the lab." },
      ],
    },
    funding: "Funding covers a compression testing rig, six months of aggregate milling, and the third-party certification needed before the mix can be poured into a real campus footpath trial in 2027.",
    updates: 2,
  },

  12: {
    id: 12,
    tag: "TECHNOLOGY",
    title: "Cyber-Shield AI",
    creator: {
      name: "Daniel Okafor",
      role: "Final Year Student, RMIT Computer Science",
      avatar: null,
    },
    stats: {
      funded: 42,
      raised: 5040,
      goal: 12000,
      daysLeft: 21,
      backers: 58,
    },
    endorsed: false,
    totalComments: 5,
    img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80",
    ],
    about: "Cyber-Shield AI is a lightweight threat detection agent built for small businesses that cannot afford a security operations centre — it learns what normal looks like on your network and flags what isn't.",
    challenge: "Small businesses absorb a large share of ransomware incidents, yet commercial detection platforms are priced and staffed for enterprises. The result is that the organisations least able to recover from a breach are the ones running with no monitoring at all.",
    solution: {
      intro: "Our agent runs on commodity hardware and builds a behavioural baseline of the local network over its first two weeks. Anomalies are scored on-device rather than shipped to a vendor cloud, so nothing sensitive leaves the premises and the whole thing runs without a dedicated analyst.",
      bullets: [
        { title: "On-Device Inference", desc: "Traffic is scored locally — no data leaves the business network." },
        { title: "Zero-Config Baseline", desc: "The agent learns normal behaviour automatically over a two-week window." },
        { title: "Plain-Language Alerts", desc: "Findings are written for an owner-operator, not for a security analyst." },
      ],
    },
    funding: "Your contribution funds a year of threat-intelligence feed access, a penetration test of the agent itself, and the pilot deployment across ten Melbourne small businesses that have already signed on.",
    updates: 1,
  },
};

// Back-compat: the original single-project export.
export const PROJECT_DETAIL = PROJECT_DETAILS[1];

// Keyed by project id, mirroring PROJECT_DETAILS.
// Each array's length matches that project's `totalComments`.
export const COMMENTS_BY_PROJECT = {
  1: [
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
    {
      id: 4,
      author: "Tom Nguyen",
      role: "BACKER",
      time: "6 days ago",
      text: "What happens to the mesh if half the swarm loses power mid-mission? Does the map survive or do you lose the whole scan?",
      replies: [
        {
          id: 41,
          author: "David Chen",
          role: "CREATOR",
          time: "6 days ago",
          text: "Every drone carries a full replica of the map, so as long as one unit makes it home the scan is intact. Redundancy was the first thing we designed for.",
        },
      ],
    },
    {
      id: 5,
      author: "Priya Sharma",
      role: null,
      time: "1 week ago",
      text: "Is there a plan to publish the mesh protocol as open source? A lot of university teams would build on this.",
      replies: [],
    },
    {
      id: 6,
      author: "Marcus Webb",
      role: "BACKER",
      time: "1 week ago",
      text: "The three-minute deployment figure is the part that sold me. That is faster than most teams can unpack a single unit.",
      replies: [],
    },
    {
      id: 7,
      author: "Aisha Rahman",
      role: null,
      time: "2 weeks ago",
      text: "Have emergency services been consulted on this? Curious whether the workflow matches how a real incident command actually runs.",
      replies: [],
    },
  ],

  11: [
    {
      id: 1,
      author: "Lucas Meyer",
      role: "BACKER",
      time: "1 day ago",
      text: "32 MPa from a 40% cement replacement is genuinely impressive. Is that number from a single batch or across a full test series?",
      replies: [
        {
          id: 11,
          author: "Mai Tran",
          role: "CREATOR",
          time: "1 day ago",
          text: "Across twelve batches so far. The spread is wider than standard mixes, which is exactly what the funded testing rig is meant to tighten up.",
        },
      ],
    },
    {
      id: 2,
      author: "Dr. Helen Park",
      role: null,
      time: "3 days ago",
      text: "How consistent is the rubble feedstock? Demolition waste varies enormously between buildings, and that usually kills the mix design.",
      replies: [],
    },
    {
      id: 3,
      author: "Sam Whitfield",
      role: "BACKER",
      time: "4 days ago",
      text: "Closing the loop on the same construction site is the clever bit here. No haulage emissions at either end.",
      replies: [],
    },
    {
      id: 4,
      author: "Ngoc Vu",
      role: "BACKER",
      time: "6 days ago",
      text: "Any idea what the cost per cubic metre looks like against a conventional mix? That is what will decide whether contractors adopt it.",
      replies: [],
    },
    {
      id: 5,
      author: "Oliver Grant",
      role: null,
      time: "1 week ago",
      text: "Fly ash supply is getting tighter as coal plants retire. Has the team looked at slag as a fallback activator?",
      replies: [],
    },
    {
      id: 6,
      author: "Rachel Simmons",
      role: "BACKER",
      time: "2 weeks ago",
      text: "Would love to see the footpath trial happen. Walking on recycled campus rubble would be a great story for the university.",
      replies: [],
    },
  ],

  12: [
    {
      id: 1,
      author: "Ben Castellano",
      role: "BACKER",
      time: "5 hours ago",
      text: "Keeping inference on-device is the right call. Half the small businesses I work with would never agree to ship traffic to a vendor cloud.",
      replies: [
        {
          id: 11,
          author: "Daniel Okafor",
          role: "CREATOR",
          time: "3 hours ago",
          text: "That was the deciding constraint. It costs us some model size, but it removes the entire compliance conversation before it starts.",
        },
      ],
    },
    {
      id: 2,
      author: "Hannah Liu",
      role: null,
      time: "2 days ago",
      text: "Two weeks of baselining sounds long. What protects the business during that window, or is it just unmonitored?",
      replies: [],
    },
    {
      id: 3,
      author: "Kwame Boateng",
      role: "BACKER",
      time: "4 days ago",
      text: "What is the false positive rate looking like? Plain-language alerts do not help much if the owner gets five a day and starts ignoring them.",
      replies: [],
    },
    {
      id: 4,
      author: "Sophie Bennett",
      role: null,
      time: "1 week ago",
      text: "Ten pilot businesses already signed on is a strong signal. Is the pilot list public?",
      replies: [],
    },
    {
      id: 5,
      author: "Arjun Patel",
      role: "BACKER",
      time: "1 week ago",
      text: "Good luck with the pen test. Getting a security tool audited before launch says a lot about how seriously this is being taken.",
      replies: [],
    },
  ],
};

// Back-compat: the original single-project export.
export const COMMENTS = COMMENTS_BY_PROJECT[1];
