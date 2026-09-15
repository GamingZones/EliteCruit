/**
 * EliteCruit - Shared Filtering, Matching, Taxonomy & Competencies
 * Consolidated single source of truth for BSIT/BSCS job roles, keywords,
 * technical skills, educational qualifications, industry certifications,
 * location filters, distance calculations, and algorithmic match scoring.
 */

export const BSIT_BSCS_JOB_TITLES = [
  "Web Developer",
  "Full-Stack Developer",
  "IT Support Specialist / IT Support Staff",
  "Database Administrator",
  "System Administrator",
  "Network Engineer",
  "Software Engineer",
  "Quality Assurance (QA) Tester",
  "Business/Systems Analyst",
  "Cybersecurity Analyst Junior",
  "Cloud Support Associate",
  "Data Analyst Junior",
  "UI/UX Designer",
  "IT Project Coordinator",
] as const;

export const CAVITE_CITIES = [
  "Alfonso, Cavite",
  "Amadeo, Cavite",
  "Bacoor, Cavite",
  "Carmona, Cavite",
  "Cavite City, Cavite",
  "Dasmarinas, Cavite",
  "General Emilio Aguinaldo, Cavite",
  "General Mariano Alvarez (GMA), Cavite",
  "General Trias, Cavite",
  "Imus, Cavite",
  "Indang, Cavite",
  "Kawit, Cavite",
  "Magallanes, Cavite",
  "Maragondon, Cavite",
  "Mendez, Cavite",
  "Naic, Cavite",
  "Noveleta, Cavite",
  "Rosario, Cavite",
  "Silang, Cavite",
  "Tagaytay, Cavite",
  "Tanza, Cavite",
  "Ternate, Cavite",
  "Trece Martires, Cavite",
] as const;

export const WORK_ARRANGEMENTS = ["On-Site", "Hybrid", "Remote"] as const;

export const EXPERIENCE_LEVELS = [
  "Fresh Graduate",
  "Junior (1 - 2 years)",
  "Mid-level (3 - 5 years)",
  "Senior (5 - 8 years)",
  "Lead / Expert (8+ years)",
] as const;

export function formatExperienceLevel(level?: string | null): string {
  if (!level) return "";
  if (level.includes("Fresh Graduate") || level.includes("Entry-level")) {
    return "Fresh Graduate";
  }
  return level;
}

export function formatLocationWithCavite(loc?: string | null): string {
  if (!loc || !loc.trim()) return "Cavite";
  const trimmed = loc.trim();
  if (/cavite/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}, Cavite`;
}

export const EXP_YEARS_OPTIONS = [
  "Less than a year",
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5+ years",
] as const;

/**
 * 1. Technical Skills (Languages, Frameworks, Developer Tools & Technical Capabilities)
 */
export const BSIT_BSCS_SKILLS = [
  "HTML / HTML5",
  "CSS / CSS3",
  "JavaScript",
  "TypeScript",
  "PHP",
  "React / Next.js",
  "Node.js / Express",
  "Python",
  "Java",
  "C# / .NET",
  "C++",
  "SQL / Relational Databases",
  "NoSQL / MongoDB",
  "Git / GitHub Version Control",
  "Figma / UI/UX Prototyping",
  "REST API / Web Services",
  "Linux / Bash Scripting",
  "Docker / Containerization",
  "Manual & Automation Testing",
  "Networking / TCP/IP & LAN/WAN",
  "Cybersecurity & Vulnerability Assessment",
  "Technical Support & Hardware Troubleshooting",
  "Data Analytics & Power BI / Tableau",
  "Cloud Computing (AWS / Azure / GCP)",
  "WordPress / CMS Development",
  "Agile / Scrum Methodologies",
];

export const AVAILABLE_SKILLS_LIST = BSIT_BSCS_SKILLS;

/**
 * 2. Educational Qualifications (Degrees, Bootcamps, OJT, & Formal Training)
 */
export const BSIT_BSCS_QUALIFICATIONS = [
  "BS Information Technology (BSIT)",
  "BS Computer Science (BSCS)",
  "BS Information Systems (BSIS)",
  "Associate in Computer Technology (ACT)",
  "Internship / OJT Completion",
  "Capstone / Thesis Project Completion",
  "Web Development Bootcamp Completion",
  "Full-Stack Web Development Training",
  "Software Engineering Training",
  "Database Management & SQL Training",
  "Network Administration & Routing Training",
  "Cybersecurity & SOC Fundamentals Training",
  "Data Analytics & Business Intelligence Training",
  "Cloud Architecture & Operations Training",
  "UI/UX Design Bootcamp Completion",
  "IT Helpdesk & Technical Support Training",
];

/**
 * 3. Professional Certifications (Recognized Industry Credentials & Vendor Certificates)
 */
export const BSIT_BSCS_CERTIFICATIONS = [
  "CompTIA IT Fundamentals (ITF+)",
  "CompTIA A+",
  "CompTIA Network+",
  "CompTIA Security+",
  "Cisco Certified Network Associate (CCNA)",
  "AWS Certified Cloud Practitioner",
  "Microsoft Certified: Azure Fundamentals (AZ-900)",
  "Google Cloud Certified Associate Cloud Engineer",
  "Oracle Certified Professional: Java / Database",
  "Fortinet Certified Associate Cybersecurity",
  "Scrum Fundamentals Certified (SFC)",
  "Information Technology Specialist (ITS) - JavaScript / Python / HTML",
  "ISTQB Certified Tester Foundation Level (CTFL)",
  "Certified Associate in Python Programming (PCAP)",
  "Microsoft Certified: Power BI Data Analyst Associate",
];

export interface JobRoleDefinition {
  title: string;
  category: "Software & Web" | "Infrastructure & Systems" | "Data & Security" | "Design & Management";
  aliases: string[];
  keywords: string[];
  description: string;
}

export const IT_JOB_ROLES_TAXONOMY: JobRoleDefinition[] = [
  {
    title: "Web Developer",
    category: "Software & Web",
    aliases: [
      "Web Developer",
      "Web Development",
      "Frontend Developer",
      "Backend Developer",
      "Web Engineer",
      "Web Programmer",
      "PHP Developer",
      "JavaScript Developer",
      "React Developer",
    ],
    keywords: [
      "HTML",
      "HTML5",
      "CSS",
      "CSS3",
      "JavaScript",
      "TypeScript",
      "PHP",
      "React",
      "Node.js",
      "Vue.js",
      "Angular",
      "Next.js",
      "Bootstrap",
      "Tailwind CSS",
      "Sass",
      "REST API",
      "WordPress",
      "Laravel",
      "Web Development",
      "Frontend",
      "Backend",
      "MySQL",
      "Responsive Design",
      "JSON",
    ],
    description: "Builds and maintains websites, web applications, and web services using modern frontend and backend technologies.",
  },
  {
    title: "Full-Stack Developer",
    category: "Software & Web",
    aliases: [
      "Full-Stack Developer",
      "Full Stack Developer",
      "Full-Stack Engineer",
      "Full Stack Engineer",
      "Fullstack Developer",
    ],
    keywords: [
      "HTML",
      "CSS",
      "JavaScript",
      "TypeScript",
      "Node.js",
      "React",
      "Express",
      "Python",
      "Django",
      "MongoDB",
      "PostgreSQL",
      "SQL",
      "REST API",
      "GraphQL",
      "Git",
      "Full-Stack",
      "Full Stack Development",
      "API Development",
      "MySQL",
      "Docker",
    ],
    description: "Designs and develops both client-side and server-side components of web applications.",
  },
  {
    title: "Software Engineer",
    category: "Software & Web",
    aliases: [
      "Software Engineer",
      "Software Developer",
      "Application Developer",
      "Programmer",
      "Java Developer",
      "C# Developer",
      "Python Developer",
    ],
    keywords: [
      "Java",
      "Python",
      "C#",
      "C++",
      ".NET",
      "Object-Oriented Programming (OOP)",
      "Data Structures and Algorithms",
      "Software Engineering",
      "Design Patterns",
      "Git",
      "Unit Testing",
      "CI/CD",
      "API Development",
      "Software Testing",
      "Algorithms",
      "Clean Architecture",
    ],
    description: "Applies computer science engineering principles to design, construct, test, and maintain robust software systems.",
  },
  {
    title: "IT Support Specialist / IT Support Staff",
    category: "Infrastructure & Systems",
    aliases: [
      "IT Support Specialist",
      "IT Support Staff",
      "Technical Support Specialist",
      "IT Helpdesk",
      "Desktop Support",
      "Helpdesk Technician",
      "Technical Support Staff",
    ],
    keywords: [
      "Technical Support",
      "Helpdesk",
      "Hardware",
      "Troubleshooting",
      "Windows 10/11",
      "Software Installation",
      "PC Assembly",
      "Printer Troubleshooting",
      "LAN",
      "CompTIA A+",
      "CompTIA IT Fundamentals (ITF+)",
      "Customer Support",
      "Networking Basics",
      "Active Directory Basics",
      "Desktop Support",
      "Ticketing System",
    ],
    description: "Provides frontline hardware, software, and networking technical support to end users and organizations.",
  },
  {
    title: "Database Administrator",
    category: "Data & Security",
    aliases: [
      "Database Administrator",
      "DBA",
      "Database Engineer",
      "Database Specialist",
      "SQL Developer",
      "Database Developer",
    ],
    keywords: [
      "SQL",
      "Database Management",
      "MySQL",
      "PostgreSQL",
      "Oracle",
      "MS SQL Server",
      "MongoDB",
      "Query Optimization",
      "Stored Procedures",
      "ETL",
      "Data Modeling",
      "Database Design",
      "Backup and Recovery",
      "Database Security",
      "Database Administration",
      "Database Indexing",
    ],
    description: "Manages, optimizes, secures, and maintains relational and non-relational database management systems.",
  },
  {
    title: "System Administrator",
    category: "Infrastructure & Systems",
    aliases: [
      "System Administrator",
      "SysAdmin",
      "Server Administrator",
      "Linux Administrator",
      "Windows Administrator",
      "Systems Engineer",
    ],
    keywords: [
      "Linux",
      "Ubuntu",
      "CentOS",
      "Windows Server",
      "Active Directory",
      "Bash",
      "PowerShell",
      "Virtualization",
      "VMware",
      "VirtualBox",
      "Server Management",
      "System Administration",
      "DNS",
      "DHCP",
      "SysAdmin",
      "Server Configuration",
    ],
    description: "Oversees the uptime, configuration, security, and operation of multi-user computing systems and servers.",
  },
  {
    title: "Network Engineer",
    category: "Infrastructure & Systems",
    aliases: [
      "Network Engineer",
      "Network Administrator",
      "Network Specialist",
      "Network Technician",
    ],
    keywords: [
      "Cisco",
      "CCNA",
      "Cisco Certified Network Associate (CCNA)",
      "Routing and Switching",
      "TCP/IP",
      "LAN/WAN",
      "Subnetting",
      "VLAN",
      "Firewalls",
      "VPN",
      "Network Troubleshooting",
      "Wireshark",
      "Network Security",
      "Network Protocols",
      "Routers",
      "Switches",
      "Packet Tracer",
    ],
    description: "Plans, implements, optimizes, and secures enterprise telecommunications and computer network infrastructures.",
  },
  {
    title: "Quality Assurance (QA) Tester",
    category: "Software & Web",
    aliases: [
      "Quality Assurance (QA) Tester",
      "QA Tester",
      "Software QA Engineer",
      "Test Engineer",
      "QA Analyst",
      "Software Tester",
    ],
    keywords: [
      "Software Testing",
      "Quality Assurance",
      "QA",
      "Manual Testing",
      "Test Cases",
      "Test Plans",
      "Bug Tracking",
      "Jira",
      "Selenium",
      "Postman",
      "API Testing",
      "Regression Testing",
      "Automation Testing",
      "Black Box Testing",
      "Cypress",
      "Quality Control",
    ],
    description: "Tests software products to identify bugs, verify functional requirements, and ensure optimal user experiences.",
  },
  {
    title: "Cybersecurity Analyst Junior",
    category: "Data & Security",
    aliases: [
      "Cybersecurity Analyst Junior",
      "Cybersecurity Analyst",
      "Information Security Analyst",
      "SOC Analyst",
      "Security Analyst",
    ],
    keywords: [
      "Cybersecurity",
      "Network Security",
      "Vulnerability Assessment",
      "Firewalls",
      "Incident Response",
      "Fortinet",
      "Fortinet Certified Associate Cybersecurity",
      "CompTIA Security+",
      "Penetration Testing",
      "Information Security",
      "SIEM",
      "Malware Analysis",
      "Ethical Hacking",
      "Threat Detection",
      "Data Protection",
    ],
    description: "Monitors, detects, investigates, and responds to cybersecurity events, vulnerabilities, and threats.",
  },
  {
    title: "Cloud Support Associate",
    category: "Infrastructure & Systems",
    aliases: [
      "Cloud Support Associate",
      "Cloud Engineer",
      "Cloud Specialist",
      "Cloud Associate",
      "AWS Cloud Associate",
    ],
    keywords: [
      "AWS",
      "Amazon Web Services",
      "Microsoft Azure",
      "Google Cloud",
      "GCP",
      "Cloud Fundamentals",
      "AWS Certified Cloud Practitioner",
      "Microsoft Certified: Azure Fundamentals (AZ-900)",
      "Docker",
      "Virtual Machines",
      "Cloud Storage",
      "Cloud Computing",
      "Cloud Support",
      "Terraform",
    ],
    description: "Assists organizations in deploying, monitoring, troubleshooting, and supporting cloud infrastructure environments.",
  },
  {
    title: "Data Analyst Junior",
    category: "Data & Security",
    aliases: [
      "Data Analyst Junior",
      "Data Analyst",
      "Junior Data Analyst",
      "BI Analyst",
      "Data Analytics Specialist",
    ],
    keywords: [
      "Data Analytics",
      "Data Analytics Training",
      "SQL",
      "Python",
      "Pandas",
      "Excel",
      "Power BI",
      "Tableau",
      "Data Visualization",
      "Data Cleaning",
      "Statistics",
      "Reporting",
      "BigQuery",
      "Data Extraction",
      "Business Intelligence",
    ],
    description: "Cleans, analyzes, and visualizes complex data sets to help organizations make informed business decisions.",
  },
  {
    title: "UI/UX Designer",
    category: "Design & Management",
    aliases: [
      "UI/UX Designer",
      "UI Designer",
      "UX Designer",
      "Product Designer",
      "User Interface Designer",
    ],
    keywords: [
      "Figma",
      "Adobe XD",
      "UI/UX Fundamentals",
      "Wireframing",
      "Prototyping",
      "User Research",
      "Usability Testing",
      "Design Systems",
      "HTML",
      "CSS",
      "Interaction Design",
      "Visual Design",
      "User Flow",
      "Mockups",
    ],
    description: "Crafts intuitive, user-friendly digital product interfaces, wireframes, prototypes, and user experiences.",
  },
  {
    title: "Business/Systems Analyst",
    category: "Design & Management",
    aliases: [
      "Business/Systems Analyst",
      "Business Analyst",
      "Systems Analyst",
      "IT Business Analyst",
    ],
    keywords: [
      "System Analysis",
      "Requirements Gathering",
      "UML",
      "Use Cases",
      "Business Process Modeling",
      "Flowcharts",
      "Agile",
      "Scrum",
      "Documentation",
      "Functional Specifications",
      "Gap Analysis",
      "Stakeholder Analysis",
    ],
    description: "Bridges the gap between business stakeholders and IT engineering teams by analyzing requirements and workflows.",
  },
  {
    title: "IT Project Coordinator",
    category: "Design & Management",
    aliases: [
      "IT Project Coordinator",
      "Project Coordinator",
      "Associate Project Manager",
      "Scrum Coordinator",
    ],
    keywords: [
      "Project Management",
      "Agile",
      "Scrum",
      "Scrum Fundamentals Certified (SFC)",
      "Jira",
      "Trello",
      "Sprint Planning",
      "Milestone Tracking",
      "Stakeholder Communication",
      "Documentation",
      "Resource Allocation",
      "Project Scheduling",
    ],
    description: "Coordinates technical projects, schedules sprints, tracks deliverables, and facilitates team communication.",
  },
];

/**
 * Top popular filter keywords displayed as clickable pill badges in search & filter UI.
 */
export const POPULAR_KEYWORD_FILTERS: string[] = [
  "HTML",
  "CSS",
  "PHP",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "SQL",
  "C#",
  "Figma",
  "AWS",
  "CCNA",
  "Linux",
  "Docker",
  "QA / Testing",
  "WordPress",
];

/**
 * Returns all keywords associated with a given job role.
 */
export function getKeywordsForJobRole(roleTitle: string): string[] {
  if (!roleTitle || !roleTitle.trim()) return [];
  const normalized = roleTitle.trim().toLowerCase();

  const matchedDef = IT_JOB_ROLES_TAXONOMY.find((role) => {
    if (role.title.toLowerCase() === normalized) return true;
    if (role.aliases.some((alias) => alias.toLowerCase() === normalized || normalized.includes(alias.toLowerCase()))) {
      return true;
    }
    return false;
  });

  return matchedDef ? matchedDef.keywords : [];
}

/**
 * Given a keyword (e.g. "PHP", "HTML", "SQL", "Figma"), returns all role definitions that use that keyword.
 */
export function getRelatedJobRolesForKeyword(keyword: string): JobRoleDefinition[] {
  if (!keyword || !keyword.trim()) return [];
  const query = keyword.trim().toLowerCase();

  return IT_JOB_ROLES_TAXONOMY.filter((role) => {
    if (role.title.toLowerCase().includes(query) || query.includes(role.title.toLowerCase())) {
      return true;
    }
    if (role.aliases.some((alias) => alias.toLowerCase().includes(query) || query.includes(alias.toLowerCase()))) {
      return true;
    }
    return role.keywords.some((kw) => kw.toLowerCase() === query || kw.toLowerCase().includes(query));
  });
}

/**
 * Checks if a job listing matches a search query using direct text match AND semantic role keyword matching.
 */
export function matchesJobWithTaxonomy(
  job: {
    title: string;
    description?: string | null;
    qualifications?: string | null;
    required_skills?: string | null;
    badges?: string[];
  },
  query: string
): boolean {
  if (!query || !query.trim()) return true;
  const q = query.trim().toLowerCase();

  // 1. Direct match on title, description, skills, qualifications, badges
  const textHaystack = [
    job.title,
    job.description || "",
    job.qualifications || "",
    job.required_skills || "",
    ...(job.badges || []),
  ].join(" ").toLowerCase();

  if (textHaystack.includes(q)) return true;

  // 2. Keyword-to-Role Expansion:
  const rolesMatchingQuery = getRelatedJobRolesForKeyword(q);
  const jobTitleLower = job.title.toLowerCase();
  for (const role of rolesMatchingQuery) {
    if (
      jobTitleLower.includes(role.title.toLowerCase()) ||
      role.aliases.some((alias) => jobTitleLower.includes(alias.toLowerCase()))
    ) {
      return true;
    }
  }

  // 3. Role-to-Keyword Expansion:
  const roleKeywords = getKeywordsForJobRole(q);
  if (roleKeywords.length > 0) {
    const hasAnyKeyword = roleKeywords.some((kw) => textHaystack.includes(kw.toLowerCase()));
    if (hasAnyKeyword) return true;
  }

  return false;
}

/**
 * 100% Local Haversine Distance Calculation (in kilometers).
 * Computes direct spherical distance between two sets of GPS coordinates.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Parses raw text, JSON arrays, or comma/newline/bullet-delimited strings
 * into a clean array of string tokens.
 */
export function parseItemList(
  raw?: string | null,
  fallback: string[] = []
): string[] {
  if (!raw || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const res = parsed
        .map((item) => {
          if (typeof item === "object" && item !== null && item.name) {
            return item.years ? `${item.name} (${item.years})` : String(item.name);
          }
          return String(item).trim();
        })
        .filter(Boolean);
      if (res.length > 0) return res;
    }
  } catch {}
  return raw
    .split(/[\n,;•|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        return `${match[1].trim()} (${match[2].trim()})`;
      }
      return token;
    });
}

/**
 * Checks if a combined haystack string matches a search query keyword.
 */
export function matchesKeyword(haystack: string, keyword: string): boolean {
  if (!keyword || !keyword.trim()) return true;
  return haystack.toLowerCase().includes(keyword.trim().toLowerCase());
}

/**
 * Matches a candidate distance against a selected radius filter.
 */
export function matchesRadius(
  distanceKm: number | undefined,
  selectedRadius: "all" | "5" | "10" | "15" | string
): boolean {
  if (selectedRadius === "all" || !selectedRadius) return true;
  if (distanceKm === undefined || Number.isNaN(distanceKm)) return false;
  const radiusNum = Number(selectedRadius);
  return distanceKm <= radiusNum;
}

export function parseExpectedSalary(raw: string | number | null | undefined): number {
  if (!raw) return 0;
  if (typeof raw === "number") return raw;
  const amount = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export type CandidateMatchInput = {
  desired_job_title?: string | null;
  work_arrangement?: string | null;
  expected_salary?: number | string | null;
  distance_km?: number;
  city?: string | null;
  address?: string | null;
  skills?: string | null;
  qualifications?: string | null;
  certifications?: string | null;
};

export type JobMatchInput = {
  title?: string;
  work_arrangement?: string;
  location?: string;
  city?: string;
  required_skills?: string | null;
  skills?: string | null;
  required_qualifications?: string | null;
  qualifications?: string | null;
  required_certifications?: string | null;
  certifications?: string | null;
  salary_min?: number | string;
  salary_max?: number | string;
  min_salary?: number | string;
  max_salary?: number | string;
};

export function calculateCandidateMatch(
  cand?: CandidateMatchInput | null,
  job?: JobMatchInput | null
): number {
  if (!cand || !job) return 0;

  const jobCard: JobCardInput = {
    id: 0,
    title: job.title || "",
    location: job.location || job.city || "Cavite",
    salaryMin: Number(job.salary_min ?? job.min_salary) || 0,
    setup: job.work_arrangement || "On-Site",
    skillTags: parseCompetencyDisplayTags(job.required_skills ?? job.skills),
    qualTags: parseCompetencyDisplayTags(job.required_qualifications ?? job.qualifications),
    certTags: parseCompetencyDisplayTags(job.required_certifications ?? job.certifications),
  };

  const applicantProfile: ApplicantProfileInput = {
    desiredJobTitle: cand.desired_job_title || "",
    workArrangement: cand.work_arrangement || "Any",
    expectedSalary: cand.expected_salary ? parseExpectedSalary(cand.expected_salary) : 0,
    city: cand.city || cand.address || "Cavite",
    skills: parseCompetencyDisplayTags(cand.skills),
    qualifications: parseCompetencyDisplayTags(cand.qualifications),
    certifications: parseCompetencyDisplayTags(cand.certifications),
  };

  return calculateJobMatchDetails(jobCard, applicantProfile).score;
}

export type ApplicantProfileInput = {
  desiredJobTitle?: string;
  workArrangement?: string;
  expectedSalary?: number;
  city?: string;
  preferredCities?: string[];
  skills?: string[];
  qualifications?: string[];
  certifications?: string[];
  shsStrand?: string;
  shsSchool?: string;
  shsGradYear?: string;
  collegeGradYear?: string;
  vocationalGradYear?: string;
  isNonGraduateCertHolder?: boolean;
};

export type JobCardInput = {
  id: number;
  title: string;
  location: string;
  salaryMin: number;
  setup: string;
  skillTags?: string[];
  qualTags?: string[];
  certTags?: string[];
  createdRank?: number;
};

export function inferMatchScore(index: number = 0): number {
  const base = 80 - index * 7;
  return Math.max(35, Math.min(92, base));
}

/**
 * Jobseeker / Applicant perspective:
 * Calculates personalized match score (0-100%) and criteria breakdown.
 */
export type JobMatchDetailsResult = {
  score: number;
  breakdown: string;
  skillsPts: number;
  qualPts: number;
  setupPts: number;
  salaryPts: number;
  locationPts: number;
  titleBonus: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedQuals: string[];
  missingQuals: string[];
  setupSummary: string;
  salarySummary: string;
  locationSummary: string;
  recommendations: string[];
};

// Skill / competency keyword ontology mapping
export const SKILL_KEYWORD_TAXONOMY: Record<string, string[]> = {
  "web development": [
    "html", "html5", "css", "css3", "javascript", "js", "typescript", "ts",
    "frontend", "front-end", "backend", "back-end", "fullstack", "full-stack", "full stack",
    "web design", "web development", "web dev", "react", "reactjs", "react.js",
    "vue", "vuejs", "vue.js", "angular", "angularjs", "node", "nodejs", "node.js",
    "express", "expressjs", "php", "laravel", "django", "flask", "ruby on rails", "rails",
    "asp.net", "dotnet", ".net", "bootstrap", "tailwind", "tailwind css", "sass", "scss",
    "webpack", "vite", "rest api", "graphql", "next.js", "nextjs", "web development bootcamp",
    "jquery", "redux", "web"
  ],
  "frontend": [
    "html", "html5", "css", "css3", "javascript", "js", "typescript", "ts",
    "react", "reactjs", "vue", "vuejs", "angular", "tailwind", "bootstrap",
    "sass", "scss", "ui/ux", "frontend", "front-end", "next.js", "nextjs", "web design"
  ],
  "backend": [
    "node", "nodejs", "node.js", "express", "expressjs", "python", "java", "c#", "c++",
    "php", "laravel", "django", "flask", "ruby", "rails", "asp.net", "dotnet", ".net",
    "sql", "mysql", "postgresql", "postgres", "mongodb", "nosql", "redis", "rest api",
    "graphql", "backend", "back-end", "database", "microservices", "api development"
  ],
  "database": [
    "sql", "mysql", "postgresql", "postgres", "nosql", "mongodb", "sqlite",
    "oracle", "redis", "firebase", "supabase", "database", "database management",
    "dbms", "rdbms", "mariadb", "cassandra", "dynamodb"
  ],
  "mobile development": [
    "android", "ios", "react native", "flutter", "swift", "kotlin", "mobile app",
    "mobile development", "dart", "xcode", "android studio"
  ],
  "programming": [
    "javascript", "typescript", "python", "java", "c++", "c#", "c", "php", "ruby",
    "go", "golang", "rust", "kotlin", "swift", "dart", "software development",
    "software engineering", "coding", "oop", "algorithms"
  ],
  "devops & cloud": [
    "aws", "amazon web services", "azure", "gcp", "google cloud", "docker",
    "kubernetes", "k8s", "ci/cd", "jenkins", "git", "github", "gitlab", "linux",
    "terraform", "ansible", "cloud computing", "devops", "cloud practitioner"
  ],
  "quality assurance": [
    "qa", "testing", "quality assurance", "manual testing", "automation testing",
    "automated testing", "selenium", "cypress", "jest", "unit testing", "test automation"
  ],
  "ui/ux design": [
    "ui", "ux", "ui/ux", "user interface", "user experience", "figma", "adobe xd",
    "wireframing", "prototyping", "web design", "graphic design", "photoshop", "illustrator"
  ],
  "data science & analytics": [
    "data science", "data analysis", "data analyst", "machine learning", "ml", "ai",
    "artificial intelligence", "pandas", "numpy", "python", "power bi", "tableau",
    "excel", "data visualization", "sql", "r", "statistics", "deep learning"
  ],
  "cybersecurity & networking": [
    "cybersecurity", "cyber security", "network security", "networking", "network",
    "firewall", "comptia", "comptia security+", "comptia network+", "comptia it fundamentals",
    "itf+", "cisco", "ccna", "ethical hacking", "penetration testing", "information security"
  ],
  "it support": [
    "it support", "technical support", "helpdesk", "help desk", "it fundamentals",
    "comptia it fundamentals", "itf+", "computer hardware", "troubleshooting",
    "network administration", "system administration", "sysadmin", "it operations"
  ],
  "computer science": [
    "computer science", "cs", "bs computer science", "bscs", "information technology",
    "it", "bsit", "bs information technology", "computer engineering", "bscpe",
    "software engineering", "computer studies"
  ]
};

export function isSkillMatch(itemA: string, itemB: string): boolean {
  if (!itemA || !itemB) return false;

  const cleanA = itemA.toLowerCase().replace(/\s*\(.*?\)/g, "").trim();
  const cleanB = itemB.toLowerCase().replace(/\s*\(.*?\)/g, "").trim();
  if (!cleanA || !cleanB) return false;

  // 1. Direct equality or substring match
  if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
    return true;
  }

  // 2. Tokenize by slashes, commas, and hyphens (e.g., "HTML / HTML5" -> ["html", "html5"])
  const splitRegex = /[/,+&|;]|\s+and\s+|\s+or\s+/i;
  const tokensA = cleanA.split(splitRegex).map((t) => t.trim()).filter(Boolean);
  const tokensB = cleanB.split(splitRegex).map((t) => t.trim()).filter(Boolean);

  for (const tA of tokensA) {
    for (const tB of tokensB) {
      if (tA === tB || (tA.length >= 3 && tB.includes(tA)) || (tB.length >= 3 && tA.includes(tB))) {
        return true;
      }
    }
  }

  // 3. Taxonomy / Subcategory lookup
  for (const [category, keywords] of Object.entries(SKILL_KEYWORD_TAXONOMY)) {
    const isCategoryA = cleanA === category || cleanA.includes(category) || category.includes(cleanA) || tokensA.some((t) => t === category || category.includes(t));
    const isCategoryB = cleanB === category || cleanB.includes(category) || category.includes(cleanB) || tokensB.some((t) => t === category || category.includes(t));

    const matchesKeywordA = keywords.some((kw) => cleanA === kw || cleanA.includes(kw) || kw.includes(cleanA) || tokensA.some((t) => t === kw || kw.includes(t)));
    const matchesKeywordB = keywords.some((kw) => cleanB === kw || cleanB.includes(kw) || kw.includes(cleanB) || tokensB.some((t) => t === kw || kw.includes(t)));

    // Case A: Item A is the broad category (e.g. "Web Development") and Item B is a subcategory (e.g. "HTML")
    if (isCategoryA && matchesKeywordB) return true;
    // Case B: Item B is the broad category and Item A is a subcategory
    if (isCategoryB && matchesKeywordA) return true;
  }

  return false;
}

export function calculateJobMatchDetails(
  job: JobCardInput,
  profile: ApplicantProfileInput | null
): JobMatchDetailsResult {
  if (!profile) {
    const score = inferMatchScore(job.createdRank || 0);
    return {
      score,
      breakdown: "Sign in to view personalized match breakdown",
      skillsPts: 15,
      qualPts: 10,
      setupPts: 10,
      salaryPts: 0,
      locationPts: 0,
      titleBonus: 0,
      matchedSkills: [],
      missingSkills: job.skillTags || [],
      matchedQuals: [],
      missingQuals: job.qualTags || [],
      setupSummary: job.setup || "Standard",
      salarySummary: "Sign in to compare with your expected salary",
      locationSummary: job.location || "Cavite",
      recommendations: ["Sign in to get a personalized profile match breakdown."],
    };
  }

  let skillsPts = 0;
  const rawJobSkills = [...(job.skillTags || []), ...(job.certTags || [])];
  const profileSkills = [
    ...(profile.skills || []),
    ...(profile.certifications || []),
  ];

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  rawJobSkills.forEach((item) => {
    const isMatched = profileSkills.some((ps) => isSkillMatch(item, ps));
    if (isMatched) {
      matchedSkills.push(item);
    } else {
      missingSkills.push(item);
    }
  });

  if (rawJobSkills.length > 0) {
    skillsPts = Math.round((matchedSkills.length / rawJobSkills.length) * 25);
  } else {
    skillsPts = 25;
  }

  let qualPts = 0;
  const rawJobQuals = job.qualTags || [];
  const profileQuals = profile.qualifications || [];
  const matchedQuals: string[] = [];
  const missingQuals: string[] = [];

  rawJobQuals.forEach((item) => {
    const isMatched = profileQuals.some((pq) => isSkillMatch(item, pq)) || profileSkills.some((ps) => isSkillMatch(item, ps));
    if (isMatched) {
      matchedQuals.push(item);
    } else {
      missingQuals.push(item);
    }
  });

  if (rawJobQuals.length > 0) {
    qualPts = Math.round((matchedQuals.length / rawJobQuals.length) * 25);
  } else {
    qualPts = 25;
  }

  let setupPts = 0;
  let setupSummary = "";
  const pSetup = (profile.workArrangement || "").toLowerCase().trim();
  const jSetup = (job.setup || "").toLowerCase().trim();
  if (!pSetup || pSetup === "any" || jSetup === "flexible" || pSetup === jSetup) {
    setupPts = 20;
    setupSummary = `Matches your preferred ${job.setup || "setup"}`;
  } else if (
    (pSetup.includes("remote") && jSetup.includes("hybrid")) ||
    (pSetup.includes("hybrid") && jSetup.includes("on-site"))
  ) {
    setupPts = 10;
    setupSummary = `Partial match (${job.setup || "Setup"})`;
  } else {
    setupPts = 5;
    setupSummary = `Job requires ${job.setup || "On-Site"}`;
  }

  let salaryPts = 0;
  let salarySummary = "";
  const expectedSalary = profile.expectedSalary || 0;
  if (expectedSalary > 0 && job.salaryMin > 0) {
    if (job.salaryMin >= expectedSalary * 0.8) {
      salaryPts = 15;
      salarySummary = `Meets or exceeds your expected PHP ${expectedSalary.toLocaleString()}`;
    } else if (job.salaryMin >= expectedSalary * 0.5) {
      salaryPts = 10;
      salarySummary = `Within 50%–79% of expected PHP ${expectedSalary.toLocaleString()}`;
    } else {
      salaryPts = 5;
      salarySummary = `Below expected PHP ${expectedSalary.toLocaleString()}`;
    }
  } else {
    salaryPts = 15;
    salarySummary = "Competitive compensation aligned with market rates";
  }

  let locationPts = 0;
  let locationSummary = "";
  const pCity = (profile.city || "").toLowerCase();
  const jLoc = (job.location || "").toLowerCase();
  if (!pCity || !jLoc || pCity.includes(jLoc) || jLoc.includes(pCity) || jSetup.includes("remote")) {
    locationPts = 15;
    locationSummary = jSetup.includes("remote") ? "Remote Opportunity" : `Nearby in ${formatLocationWithCavite(job.location)}`;
  } else {
    locationPts = 8;
    locationSummary = `${formatLocationWithCavite(job.location)}`;
  }

  let titleBonus = 0;
  const pTitle = (profile.desiredJobTitle || "").toLowerCase();
  const jTitle = (job.title || "").toLowerCase();
  if (pTitle && (jTitle.includes(pTitle) || pTitle.includes(jTitle))) {
    titleBonus = 10;
  }

  const score = Math.max(
    35,
    Math.min(
      100,
      skillsPts + qualPts + setupPts + salaryPts + locationPts + titleBonus
    )
  );

  const missing: string[] = [];
  if (skillsPts < 25) missing.push(`Skills (${skillsPts}/25)`);
  if (qualPts < 25) missing.push(`Qualifications (${qualPts}/25)`);
  if (setupPts < 20) missing.push(`Work Setup (${setupPts}/20)`);
  if (salaryPts < 15) missing.push(`Salary (${salaryPts}/15)`);
  if (locationPts < 15) missing.push(`Location (${locationPts}/15)`);

  const breakdown =
    missing.length > 0
      ? `Match Score: ${score}%\n• Skills: ${skillsPts}/25\n• Qualifications: ${qualPts}/25\n• Work Setup: ${setupPts}/20\n• Salary: ${salaryPts}/15\n• Location: ${locationPts}/15`
      : `100% Match on all criteria!`;

  const recommendations: string[] = [];
  if (missingSkills.length > 0) {
    recommendations.push(
      `Add "${missingSkills.slice(0, 2).join('", "')}" to your profile skills or certifications to increase your match score.`
    );
  }
  if (missingQuals.length > 0) {
    recommendations.push(
      `Highlight "${missingQuals.slice(0, 2).join('", "')}" under your qualifications.`
    );
  }
  if (score >= 80) {
    recommendations.push(
      "You are a top candidate for this role! We recommend submitting your application immediately."
    );
  } else if (recommendations.length === 0) {
    recommendations.push(
      "Ensure your resume and documents are up-to-date before applying."
    );
  }

  return {
    score,
    breakdown,
    skillsPts,
    qualPts,
    setupPts,
    salaryPts,
    locationPts,
    titleBonus,
    matchedSkills,
    missingSkills,
    matchedQuals,
    missingQuals,
    setupSummary,
    salarySummary,
    locationSummary,
    recommendations,
  };
}

/**
 * Returns color category for match score badges: 'red' | 'yellow' | 'green'.
 * Thresholds:
 *   0 - 50:  red
 *  51 - 80:  yellow
 *  81 - 100: green
 */
export function getMatchColorClass(score: number): "red" | "yellow" | "orange" | "green" {
  if (score <= 50) return "red";
  if (score <= 80) return "yellow";
  return "green";
}

export function calculateJobMatch(
  job: JobCardInput,
  profile: ApplicantProfileInput | null
): number {
  return calculateJobMatchDetails(job, profile).score;
}

/**
 * Parses competency items (skills, qualifications, certifications) from JSON or delimited strings
 * and formats them for display with their experience years (e.g. "Web Development (1 year)").
 */
export function parseCompetencyDisplayTags(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "object" && item !== null && item.name) {
            return item.years ? `${item.name} (${item.years})` : String(item.name);
          }
          return String(item).trim();
        })
        .filter(Boolean);
    }
  } catch {}

  return raw
    .split(/[\n,;•|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        return `${match[1].trim()} (${match[2].trim()})`;
      }
      return token;
    });
}

