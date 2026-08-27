import React, { useEffect, useMemo, useState } from "react";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import "./Applicant-Dashboard.css";
import "./ApplicantDashboardOverrides.css";
import "./JobSearch.css";

type JobCard = {
  id: number;
  title: string;
  company: string;
  location: string;
  summary: string;
  salary: string;
  salaryMin: number;
  setup: string;
  jobType: "Full-time" | "Part-time" | "Contract" | "Internship" | "Remote";
  functionGroup: "Information Technology" | "Human Resources" | "Data and Analytics";
  distance: string;
  badges: string[];
  skillTags: string[];
  qualTags: string[];
  urgent?: boolean;
  createdAt: string | null;
  createdRank: number;
  status: "open" | "closed";
  closeDate: string;
  applicationLimit: number;
  applicantCount: number;
  qualifications: string;
  responsibilities: string;
  employerUserId?: number;
  rating?: string;
};

type FaqItem = {
  id: number;
  question: string;
  answer: string;
  question_type?: string;
  is_active?: number;
};

const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 101,
    question: "What is the recruitment and hiring process for this position?",
    answer: "Our hiring process involves initial application screening, a preliminary interview with HR, a technical assessment, and a final interview with the hiring manager.",
    question_type: "Hiring Process",
  },
  {
    id: 102,
    question: "What are the working hours and arrangement?",
    answer: "Standard office hours are 8:00 AM to 5:00 PM Monday through Friday. Work arrangement (remote/on-site/hybrid) is as specified in the job details.",
    question_type: "Work Setup",
  },
  {
    id: 103,
    question: "What employee benefits and perks are offered?",
    answer: "We offer competitive compensation, comprehensive health coverage (HMO), paid leave allocations, and career growth opportunities.",
    question_type: "Benefits",
  },
];

function RenderTagChips({
  items,
  type,
  maxVisible = 1,
}: {
  items: string[];
  type: "skill" | "qualification";
  maxVisible?: number;
}) {
  if (!items || items.length === 0) return null;
  const firstIsTooLong = Boolean(items[0] && items[0].length > 14);
  const visible = firstIsTooLong ? [] : items.slice(0, maxVisible);
  const hidden = firstIsTooLong ? items : items.slice(maxVisible);
  const fullListText = hidden.join(", ");

  return (
    <span className="js-chips-wrap">
      {visible.map((item) => (
        <span className={`js-tag-chip js-tag-${type}`} key={item}>
          {item}
        </span>
      ))}
      {hidden.length > 0 && (
        <span className="js-overflow-dots" tabIndex={0}>
          ...
          <span className="js-overflow-tip">
            <strong>{type === "skill" ? "Skills:" : "Qualifications:"}</strong>
            <span>{fullListText}</span>
          </span>
        </span>
      )}
    </span>
  );
}

type ApplicantMatchProfile = {
  desiredJobTitle: string;
  workArrangement: string;
  expectedSalary: number;
  city: string;
  skills: string[];
  qualifications: string[];
  certifications: string[];
};

type RankedCompany = {
  rank: string;
  name: string;
  reviews: string;
  score: string;
  note: string;
  rating: string;
};

function MiniIcon({ name }: { name: "filters" | "company" | "location" | "bookmark" | "bookmarkFilled" | "chevronDown" }) {
  const icons: Record<string, JSX.Element> = {
    filters: <path d="M4 6h16M7 12h10M10 18h4" />,
    company: <path d="M5 20V7l5-2 5 2v13M3 20h18M9 11h2m2 0h2M9 15h2m2 0h2" />,
    location: <path d="M12 21s6-5 6-10a6 6 0 1 0-12 0c0 5 6 10 6 10Zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />,
    bookmark: <path d="M7 4h10v16l-5-3-5 3V4Z" />,
    bookmarkFilled: <path d="M7 4h10v16l-5-3-5 3V4Z" />,
    chevronDown: <path d="M6 9l6 6 6-6" />,
  };

  return (
    <svg className={`mini-icon-svg ${name === "bookmarkFilled" ? "filled" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function parseSkills(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function shortenText(raw: string | null | undefined, fallback: string, limit = 84) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return fallback;
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function formatSalary(minSalary: number | null, maxSalary: number | null) {
  const min = Number.isFinite(Number(minSalary)) ? Number(minSalary).toLocaleString("en-US") : "0";
  const max = Number.isFinite(Number(maxSalary)) ? Number(maxSalary).toLocaleString("en-US") : "0";
  return `PHP ${min} - ${max}`;
}

function inferMatchScore(index: number) {
  const base = 80 - index * 7;
  const bounded = Math.max(35, Math.min(92, base));
  return bounded;
}

function inferFunctionGroup(title: string, skills: string[]) {
  const raw = `${title} ${skills.join(" ")}`.toLowerCase();
  if (raw.includes("hr") || raw.includes("recruit") || raw.includes("people")) {
    return "Human Resources" as const;
  }
  if (raw.includes("data") || raw.includes("analyst") || raw.includes("analytics")) {
    return "Data and Analytics" as const;
  }
  return "Information Technology" as const;
}

function splitProfileTags(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseExpectedSalary(raw: string | null | undefined) {
  if (!raw) return 0;
  const amount = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function calculateJobMatchDetails(job: JobCard, profile: ApplicantMatchProfile | null) {
  if (!profile) {
    const score = inferMatchScore(job.createdRank);
    return { score, breakdown: "Sign in to view personalized match breakdown" };
  }

  let skillsPts = 0;
  const jobSkills = (job.skillTags || []).map((s) => s.toLowerCase());
  const profileSkills = [
    ...(profile.skills || []),
    ...(profile.certifications || []),
  ].map((s) => s.toLowerCase());

  if (jobSkills.length > 0) {
    const matched = jobSkills.filter((js) =>
      profileSkills.some((ps) => ps.includes(js) || js.includes(ps))
    ).length;
    skillsPts = Math.round((matched / jobSkills.length) * 25);
  } else {
    skillsPts = 25;
  }

  let qualPts = 0;
  const jobQuals = (job.qualTags || []).map((q) => q.toLowerCase());
  const profileQuals = (profile.qualifications || []).map((q) => q.toLowerCase());

  if (jobQuals.length > 0) {
    const matchedQuals = jobQuals.filter((jq) =>
      profileQuals.some((pq) => pq.includes(jq) || jq.includes(pq))
    ).length;
    qualPts = Math.round((matchedQuals / jobQuals.length) * 25);
  } else {
    qualPts = 25;
  }

  let setupPts = 0;
  const pSetup = (profile.workArrangement || "").toLowerCase();
  const jSetup = (job.setup || "").toLowerCase();
  if (!pSetup || pSetup === "any" || jSetup === "flexible" || pSetup === jSetup) {
    setupPts = 20;
  } else if (
    (pSetup.includes("remote") && jSetup.includes("hybrid")) ||
    (pSetup.includes("hybrid") && jSetup.includes("on-site"))
  ) {
    setupPts = 10;
  } else {
    setupPts = 5;
  }

  let salaryPts = 0;
  if (profile.expectedSalary > 0 && job.salaryMin > 0) {
    if (job.salaryMin >= profile.expectedSalary * 0.8) {
      salaryPts = 15;
    } else if (job.salaryMin >= profile.expectedSalary * 0.5) {
      salaryPts = 10;
    } else {
      salaryPts = 5;
    }
  } else {
    salaryPts = 15;
  }

  let locationPts = 0;
  const pCity = (profile.city || "").toLowerCase();
  const jLoc = (job.location || "").toLowerCase();
  if (!pCity || !jLoc || pCity.includes(jLoc) || jLoc.includes(pCity)) {
    locationPts = 15;
  } else {
    locationPts = 8;
  }

  let titleBonus = 0;
  const pTitle = (profile.desiredJobTitle || "").toLowerCase();
  const jTitle = (job.title || "").toLowerCase();
  if (pTitle && (jTitle.includes(pTitle) || pTitle.includes(jTitle))) {
    titleBonus = 10;
  }

  const score = Math.max(35, Math.min(100, skillsPts + qualPts + setupPts + salaryPts + locationPts + titleBonus));

  const missing: string[] = [];
  if (skillsPts < 25) missing.push(`Skills (${skillsPts}/25)`);
  if (qualPts < 25) missing.push(`Qualifications (${qualPts}/25)`);
  if (setupPts < 20) missing.push(`Work Setup (${setupPts}/20)`);
  if (salaryPts < 15) missing.push(`Salary (${salaryPts}/15)`);
  if (locationPts < 15) missing.push(`Location (${locationPts}/15)`);

  const breakdown = missing.length > 0
    ? `Match Score: ${score}%\n• Skills: ${skillsPts}/25\n• Qualifications: ${qualPts}/25\n• Work Setup: ${setupPts}/20\n• Salary: ${salaryPts}/15\n• Location: ${locationPts}/15`
    : `100% Match on all criteria!`;

  return { score, breakdown };
}

function getMatchColorClass(score: number): "red" | "orange" | "green" {
  if (score <= 40) return "red";
  if (score <= 75) return "orange";
  return "green";
}

function calculateJobMatch(job: JobCard, profile: ApplicantMatchProfile | null) {
  return calculateJobMatchDetails(job, profile).score;
}

const rankedCompanies: RankedCompany[] = [
  {
    rank: "Rank 1",
    name: "Tech Solutions Inc.",
    reviews: "2",
    score: "85/100",
    note: "Clear application updates and responsive recruiter communication.",
    rating: "5.0",
  },
  {
    rank: "Rank 2",
    name: "Digital Innovations",
    reviews: "2",
    score: "71/100",
    note: "Helpful job details and fair screening process.",
    rating: "4.0",
  },
];

export default function JobSearch() {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [mode, setMode] = useState<"standard" | "easy">("standard");
  const [applicantLabel, setApplicantLabel] = useState("Applicant");
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [jobsMessage, setJobsMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All locations");
  const [selectedWorkArrangement, setSelectedWorkArrangement] = useState("Any arrangement");
  const [selectedMinSalary, setSelectedMinSalary] = useState("Any salary");
  const [selectedFunction, setSelectedFunction] = useState("All skills");
  const [sortBy, setSortBy] = useState<"Newest" | "Match" | "Bookmarked">("Newest");
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [applicantMatchProfile, setApplicantMatchProfile] = useState<ApplicantMatchProfile | null>(null);
  const [applicantUserId, setApplicantUserId] = useState<number | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [initialAppliedJobIds, setInitialAppliedJobIds] = useState<number[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [detailsJob, setDetailsJob] = useState<JobCard | null>(null);
  const [isFaqDrawerOpen, setIsFaqDrawerOpen] = useState(false);
  const [companyFaqs, setCompanyFaqs] = useState<FaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [expandedFaqIds, setExpandedFaqIds] = useState<number[]>([]);

  const handleOpenFaqs = (job: JobCard) => {
    setIsFaqDrawerOpen(true);
    setFaqLoading(true);
    setExpandedFaqIds([]);

    if (job.employerUserId) {
      fetch(`/api/employers/${job.employerUserId}/faqs`)
        .then((res) => res.json())
        .then((data) => {
          const rows = Array.isArray(data?.faqs)
            ? data.faqs.filter((f: any) => f.is_active !== 0)
            : [];
          if (rows.length > 0) {
            setCompanyFaqs(rows);
          } else {
            setCompanyFaqs(DEFAULT_FAQS);
          }
        })
        .catch(() => setCompanyFaqs(DEFAULT_FAQS))
        .finally(() => setFaqLoading(false));
    } else {
      setCompanyFaqs(DEFAULT_FAQS);
      setFaqLoading(false);
    }
  };

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setApplicantLabel("Applicant");
      return;
    }

    try {
      const savedUser = JSON.parse(savedUserRaw) as {
        id?: number;
        role?: "applicant" | "employer";
        first_name?: string;
        firstName?: string;
        last_name?: string;
        lastName?: string;
        email?: string;
      };

      const first = savedUser.first_name || savedUser.firstName || "";
      const last = savedUser.last_name || savedUser.lastName || "";
      const fallbackName = `${first} ${last}`.trim() || savedUser.email || "Applicant";
      setApplicantLabel(fallbackName);

      if (savedUser.role !== "applicant" || !savedUser.id) {
        return;
      }

      setApplicantUserId(savedUser.id);

      fetch(`/api/applicants/${savedUser.id}/profile`)
        .then((response) => response.json())
        .then((data) => {
          const profile = data?.profile;
          const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(" ");
          if (fullName) {
            setApplicantLabel(fullName);
          }
          setApplicantMatchProfile({
            desiredJobTitle: profile?.desired_job_title || "",
            workArrangement: profile?.work_arrangement || "",
            expectedSalary: parseExpectedSalary(profile?.expected_salary || ""),
            city: profile?.city || "",
            skills: splitProfileTags(profile?.skills),
            certifications: splitProfileTags(profile?.certifications),
            qualifications: splitProfileTags(profile?.qualifications),
          });
        })
        .catch(() => {
          // Keep local fallback name when profile API is unavailable.
        });
    } catch {
      setApplicantLabel("Applicant");
    }
  }, []);

  useEffect(() => {
    if (!applicantUserId) return;
    fetch(`/api/applicants/${applicantUserId}/applications`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Unable to load your applications.");
        const ids = Array.isArray(data?.applications)
          ? data.applications
              .map((item: any) => Number(item?.job_post_id))
              .filter((id: number) => Number.isInteger(id) && id > 0)
          : [];
        setAppliedJobIds(ids);
        setInitialAppliedJobIds(ids);
      })
      .catch(() => {
        // Keep UI usable even when applications endpoint is temporarily unavailable.
      });
  }, [applicantUserId]);

  useEffect(() => {
    const savedBookmarks = localStorage.getItem("elitecruit-bookmarked-jobs");
    if (!savedBookmarks) return;
    try {
      const parsed = JSON.parse(savedBookmarks);
      if (Array.isArray(parsed)) {
        setBookmarkedIds(parsed.filter((id) => Number.isInteger(id)));
      }
    } catch {
      // Ignore malformed bookmark storage.
    }
  }, []);

  useEffect(() => {
    fetch("/api/job-posts")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Unable to load job postings.");
        const rows = Array.isArray(data?.jobPosts) ? data.jobPosts : [];
        const mapped: JobCard[] = rows.map((row: any, index: number) => ({
          id: Number(row.id),
          title: row.title || "Untitled Job",
          company: row.company_name || "Employer",
          location: row.company_address || row.location || "Cavite",
          summary: row.description || "No job description provided yet.",
          salary: formatSalary(row.salary_min ?? null, row.salary_max ?? null),
          salaryMin: Number.isFinite(Number(row.salary_min)) ? Number(row.salary_min) : 0,
          setup: row.work_arrangement || "Flexible",
          status: row.status === "closed" ? "closed" : "open",
          closeDate: row.close_date || "-",
          applicationLimit: Number.isFinite(Number(row.application_limit)) ? Number(row.application_limit) : 0,
          applicantCount: Number.isFinite(Number(row.applicant_count)) ? Number(row.applicant_count) : 0,
          qualifications: row.qualifications || "Not provided",
          responsibilities: row.responsibilities || "Not provided",
          skillTags: parseSkills(row.required_skills),
          qualTags: row.qualifications
            ? String(row.qualifications).split(",").map((q: string) => q.trim()).filter(Boolean)
            : [],
          jobType: row.work_arrangement === "Remote" ? "Remote" : "Full-time",
          functionGroup: inferFunctionGroup(row.title || "", parseSkills(row.required_skills)),
          distance: "Cavite",
          badges: parseSkills(row.required_skills),
          urgent: Boolean(Number(row.is_urgent || 0)),
          createdAt: typeof row.created_at === "string" ? row.created_at : null,
          createdRank: index,
          employerUserId: Number(row.employer_user_id) || undefined,
          rating: row.rating ? String(row.rating) : "0.0",
        }));
        setJobs(mapped);
      })
      .catch((error) => setJobsMessage(error instanceof Error ? error.message : "Unable to load job postings."));
  }, []);

  const visibleJobs = useMemo(() => {
    const normalizedSearch = appliedSearch.trim().toLowerCase();
    const minSalary = selectedMinSalary === "Any salary" ? 0 : Number(selectedMinSalary.replace(/\D/g, "")) || 0;

    const filtered = jobs.filter((job) => {
      const combined = `${job.title} ${job.company} ${job.location} ${job.summary} ${job.badges.join(" ")}`.toLowerCase();
      const bySearch = !normalizedSearch || combined.includes(normalizedSearch);
      const byLocation =
        selectedLocation === "All locations" ||
        job.location.toLowerCase().includes(selectedLocation.toLowerCase()) ||
        selectedLocation.toLowerCase().includes(job.location.toLowerCase());
      const byWorkArrangement = selectedWorkArrangement === "Any arrangement" || job.setup === selectedWorkArrangement;
      const bySalary = minSalary === 0 || job.salaryMin >= minSalary;
      const byFunction =
        selectedFunction === "All functions" ||
        selectedFunction === "All skills" ||
        job.skillTags.some((skill) => skill.toLowerCase().includes(selectedFunction.toLowerCase())) ||
        job.badges.some((badge) => badge.toLowerCase().includes(selectedFunction.toLowerCase())) ||
        job.functionGroup === selectedFunction ||
        job.title.toLowerCase().includes(selectedFunction.toLowerCase()) ||
        job.summary.toLowerCase().includes(selectedFunction.toLowerCase()) ||
        job.qualifications.toLowerCase().includes(selectedFunction.toLowerCase());
      return bySearch && byLocation && byWorkArrangement && bySalary && byFunction;
    });

    const scope = sortBy === "Bookmarked" ? filtered.filter((job) => bookmarkedIds.includes(job.id)) : filtered;

    const sorted = [...scope].sort((a, b) => {
      const aApplied = initialAppliedJobIds.includes(a.id);
      const bApplied = initialAppliedJobIds.includes(b.id);
      if (aApplied !== bApplied) {
        return aApplied ? 1 : -1;
      }

      if (sortBy === "Match") {
        return calculateJobMatch(b, applicantMatchProfile) - calculateJobMatch(a, applicantMatchProfile);
      }

      const aTime = a.createdAt ? Date.parse(a.createdAt) : NaN;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : NaN;
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
        return bTime - aTime;
      }
      return a.createdRank - b.createdRank;
    });

    return sorted;
  }, [jobs, appliedSearch, selectedLocation, selectedWorkArrangement, selectedMinSalary, selectedFunction, sortBy, bookmarkedIds, applicantMatchProfile, initialAppliedJobIds]);

  const applySearch = () => setAppliedSearch(searchInput);

  const applyToJob = async (jobId: number) => {
    if (!applicantUserId) {
      setJobsMessage("Sign in as applicant to apply for jobs.");
      return;
    }
    if (appliedJobIds.includes(jobId)) return;

    setApplyingJobId(jobId);
    setJobsMessage("");
    try {
      const response = await fetch(`/api/applicants/${applicantUserId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_post_id: jobId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to submit application.");
      setAppliedJobIds((current) => (current.includes(jobId) ? current : [...current, jobId]));
      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j))
      );
      setDetailsJob((current) => {
        if (!current || current.id !== jobId) return current;
        return { ...current, applicantCount: current.applicantCount + 1 };
      });
    } catch (error) {
      setJobsMessage(error instanceof Error ? error.message : "Unable to submit application.");
    } finally {
      setApplyingJobId(null);
    }
  };

  const toggleBookmark = (jobId: number) => {
    setBookmarkedIds((current) => {
      const next = current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId];
      localStorage.setItem("elitecruit-bookmarked-jobs", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="jobsearch-page appdash-page sidebar-visible">
      <aside className="appdash-sidebar" aria-label="Applicant Navigation">
        <a href="/" className="appdash-brand">
          <strong>EliteCruit</strong>
          <span>Candidate Workspace</span>
        </a>

        <div className="appdash-menu-block">
          <button className="appdash-menu-title workspace-route-title" type="button" onClick={() => setIsWorkspaceOpen((value) => !value)}>
            <span className="title-main">
              <span className="item-icon"><SideIcon name="overview" /></span>
              Applicant Workspace
            </span>
            <span className={`title-caret ${isWorkspaceOpen ? "open" : "closed"}`}>
              <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
            </span>
          </button>

          {isWorkspaceOpen && (
            <ul className="appdash-menu-list">
              <li><a href="/applicant-dashboard#section-overview"><span className="item-icon"><SideIcon name="overview" /></span><span>Overview</span></a></li>
              <li><a href="/applicant-dashboard#section-smart-matches"><span className="item-icon"><SideIcon name="star" /></span><span>Smart Matches</span></a></li>
              <li><a href="/applicant-dashboard#section-applications"><span className="item-icon"><SideIcon name="applications" /></span><span>My Applications</span></a></li>
              <li><a href="/applicant-dashboard#section-invitations"><span className="item-icon"><SideIcon name="notifications" /></span><span>Job Invitations</span></a></li>
            </ul>
          )}
        </div>

        <ul className="appdash-secondary-list">
          <li className="active"><a href="/job-search"><span className="item-icon"><SideIcon name="search" /></span><span>Job Search</span></a></li>
          <li><a href="/applicant-document-converter"><span className="item-icon"><SideIcon name="documents" /></span><span>Document Converter</span></a></li>
          <li><a href="/messages"><span className="item-icon"><SideIcon name="messages" /></span><span>Messages</span></a></li>
          <li><a href="/notifications"><span className="item-icon"><SideIcon name="notifications" /></span><span>Notifications</span><span className="item-badge">8</span></a></li>
          <li><a href="/feedback"><span className="item-icon"><SideIcon name="feedback" /></span><span>Feedback</span></a></li>
        </ul>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)}>
            <span className="item-icon"><SideIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{applicantLabel}</strong><small>Applicant</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && (
            <div className="appdash-profile-menu">
              <a href="/my-profile"><SideIcon name="profile" />My Profile</a>
              <a href="/"><SideIcon name="logout" />Logout</a>
            </div>
          )}
        </div>
      </aside>

      <main className="appdash-main jobsearch-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>Job Search</strong>
            </div>
          </div>

          <div className="appdash-top-right">
            <button type="button" className="chatbot-button"><SideIcon name="chat" />ChatBot</button>
          </div>
        </header>

        <section className="dashboard-block job-rank-block">
          <div className="block-head">
            <div>
              <h3>Top-Rated Companies</h3>
              <p>Ranked from approved applicant and former employee feedback.</p>
            </div>
            <span className="outline-pill">Approved only</span>
          </div>

          <div className="job-rank-grid">
            {rankedCompanies.map((company) => (
              <article key={company.rank} className="rank-item">
                <div className="rank-item-head">
                  <small>{company.rank}</small>
                  <span className="outline-pill">★ {company.rating}</span>
                </div>
                <h4>{company.name}</h4>
                <div className="rank-meta">
                  <div>
                    <small>Approved Reviews</small>
                    <b>{company.reviews}</b>
                  </div>
                  <div>
                    <small>Reputation Score</small>
                    <b>{company.score}</b>
                  </div>
                </div>
                <p>{company.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mode-toggle-card">
          <p>Choose how you want to browse jobs.</p>
          <div className="mode-actions">
            <button type="button" className={mode === "standard" ? "mode-active" : ""} onClick={() => setMode("standard")}>Standard Mode</button>
            <button type="button" className={mode === "easy" ? "mode-active" : ""} onClick={() => setMode("easy")}>Easy Browsing Mode</button>
          </div>
        </section>

        <section className="search-bar-card">
          <div className="search-input-row">
            <input type="text" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applySearch(); }} placeholder="Search roles, skills, companies, or locations" />
            <button type="button" className="find-jobs-btn" onClick={applySearch}>Search Jobs</button>
          </div>
        </section>

        <section className="jobsearch-content-grid">
          <aside className="filters-panel">
            <h2><MiniIcon name="filters" />Filters</h2>
            <label>
              Location
              <select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)}>
                <option>All locations</option>
                <option>Alfonso, Cavite</option>
                <option>Amadeo, Cavite</option>
                <option>Bacoor, Cavite</option>
                <option>Carmona, Cavite</option>
                <option>Cavite City, Cavite</option>
                <option>Dasmariñas, Cavite</option>
                <option>General Emilio Aguinaldo, Cavite</option>
                <option>General Trias, Cavite</option>
                <option>Imus, Cavite</option>
                <option>Indang, Cavite</option>
                <option>Kawit, Cavite</option>
                <option>Magallanes, Cavite</option>
                <option>Maragondon, Cavite</option>
                <option>Mendez, Cavite</option>
                <option>Naic, Cavite</option>
                <option>Noveleta, Cavite</option>
                <option>Rosario, Cavite</option>
                <option>Silang, Cavite</option>
                <option>Tagaytay, Cavite</option>
                <option>Tanza, Cavite</option>
                <option>Ternate, Cavite</option>
                <option>Trece Martires, Cavite</option>
                <option>General Mariano Alvarez, Cavite</option>
              </select>
            </label>
            <label>
              Work Arrangement
              <select value={selectedWorkArrangement} onChange={(event) => setSelectedWorkArrangement(event.target.value)}>
                <option>Any arrangement</option>
                <option>Remote</option>
                <option>On-Site</option>
                <option>Hybrid</option>
                <option>Flexible</option>
              </select>
            </label>
            <label>
              Salary Range
              <select value={selectedMinSalary} onChange={(event) => setSelectedMinSalary(event.target.value)}>
                <option>Any salary</option>
                <option>PHP 10,000+</option>
                <option>PHP 15,000+</option>
                <option>PHP 20,000+</option>
                <option>PHP 25,000+</option>
                <option>PHP 30,000+</option>
                <option>PHP 35,000+</option>
                <option>PHP 40,000+</option>
                <option>PHP 45,000+</option>
                <option>PHP 50,000+</option>
              </select>
            </label>
            <label>
              Skills
              <select value={selectedFunction} onChange={(event) => setSelectedFunction(event.target.value)}>
                <option>All skills</option>
                <option>Java</option>
                <option>Python</option>
                <option>JavaScript</option>
                <option>TypeScript</option>
                <option>SQL</option>
                <option>Database Management</option>
                <option>Data Structures and Algorithms</option>
                <option>Object-Oriented Programming</option>
                <option>Web Development</option>
                <option>API Development</option>
                <option>React</option>
                <option>Node.js</option>
                <option>Git Version Control</option>
                <option>Software Testing</option>
                <option>UI/UX Fundamentals</option>
                <option>Cloud Fundamentals</option>
              </select>
            </label>
            <label>
              Sort
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "Newest" | "Match" | "Bookmarked")}>
                <option value="Newest">By Newest</option>
                <option value="Match">By Match</option>
                <option value="Bookmarked">By Bookmarked</option>
              </select>
            </label>
          </aside>

          <div className="job-results-col">
            <section className="results-container">
              <header className="results-head">
                <p>{visibleJobs.length} jobs found</p>
              </header>

              {jobsMessage ? <p className="profile-message">{jobsMessage}</p> : null}

              {visibleJobs.length === 0 ? (
                <article className="result-card empty-state">
                  <div className="result-top">
                    <div>
                      <h3>No jobs found for current filters.</h3>
                      <p>Try changing one or more filters to see more job postings.</p>
                    </div>
                  </div>
                </article>
              ) : (
                visibleJobs.map((job) => (
                  <article key={job.id} className="result-card">
                    <div className="result-card-main">
                      <div className="result-left-col">
                        <div className="result-title-row">
                          <h3 title={job.title}>{job.title}</h3>
                        </div>
                        <p className="meta-line">
                          <span><MiniIcon name="company" />{job.company}</span>
                          <span><MiniIcon name="location" />{job.location}</span>
                        </p>
                        <p className="result-summary">{shortenText(job.summary, "No job description provided yet.")}</p>
                        <div className="result-tags">
                          <span className={`status-chip ${job.status === "open" ? "open" : "closed"}`}>{job.status === "open" ? "Open" : "Closed"}</span>
                          {job.urgent ? <span className="status-chip urgent">Urgent</span> : null}
                          <span className="setup-pill">{job.setup}</span>
                          <span className="salary-pill">{job.salary}</span>
                        </div>
                      </div>

                      <div className="result-middle-col">
                        <div className="result-middle-meta">
                          <span>Applications: {job.applicantCount}/{job.applicationLimit}</span>
                          <span>Close Date: {job.closeDate}</span>
                          {job.skillTags.length > 0 && (
                            <div className="js-meta-tag-line">
                              <span className="js-meta-label">Skills: </span>
                              <RenderTagChips items={job.skillTags} type="skill" maxVisible={1} />
                            </div>
                          )}
                          {job.qualTags.length > 0 && (
                            <div className="js-meta-tag-line">
                              <span className="js-meta-label">Qualifications: </span>
                              <RenderTagChips items={job.qualTags} type="qualification" maxVisible={1} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="result-right-col">
                        <div className="card-top-actions">
                          <div className="rating-score-box" title="Company rating">
                            <span className="star-icon">★</span>
                            <span>{job.rating ? Number(job.rating).toFixed(1) : "0.0"}</span>
                          </div>
                          {(() => {
                            const matchInfo = calculateJobMatchDetails(job, applicantMatchProfile);
                            return (
                              <div className={`match-score-box ${getMatchColorClass(matchInfo.score)}`} title={matchInfo.breakdown}>
                                <small>Match</small>
                                <b>{matchInfo.score}%</b>
                              </div>
                            );
                          })()}
                        </div>
                        <button type="button" className="details-btn" onClick={() => setDetailsJob(job)}>Details</button>
                        <div className="card-bottom-actions">
                          <button type="button" className={`solid-btn apply-right-btn ${appliedJobIds.includes(job.id) ? "applied-btn" : ""}`} onClick={() => applyToJob(job.id)} disabled={appliedJobIds.includes(job.id) || applyingJobId === job.id}>{appliedJobIds.includes(job.id) ? "Applied" : applyingJobId === job.id ? "Applying..." : "Apply"}</button>
                          <button type="button" className="bookmark-icon-btn" aria-label={bookmarkedIds.includes(job.id) ? "Remove bookmark" : "Bookmark job"} onClick={() => toggleBookmark(job.id)}>
                            <MiniIcon name={bookmarkedIds.includes(job.id) ? "bookmarkFilled" : "bookmark"} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        </section>
      </main>

      {/* ── Job Details Modal ── */}
      {detailsJob && (
        <div className="jd-overlay" role="dialog" aria-modal="true" aria-label="Job Details" onClick={(e) => { if (e.target === e.currentTarget) setDetailsJob(null); }}>
          <div className="jd-panel">
            {/* Cover banner */}
            <div className="jd-cover-banner">
              <div className="jd-cover-placeholder">
                <span>Cover photo</span>
              </div>
              <div className="jd-employer-strip">
                <div className="jd-employer-logo-info">
                  <div className="jd-employer-logo" aria-label="Company logo">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" /></svg>
                  </div>
                  <div>
                    <strong className="jd-employer-name">{detailsJob.company}</strong>
                    <span className="jd-employer-location"><MiniIcon name="location" />{detailsJob.location}</span>
                  </div>
                </div>
                <div className="jd-header-right-actions">
                  <div className="rating-score-box" title="Company rating">
                    <span className="star-icon">★</span>
                    <span>{detailsJob.rating ? Number(detailsJob.rating).toFixed(1) : "0.0"}</span>
                  </div>
                  {(() => {
                    const detailsMatchInfo = calculateJobMatchDetails(detailsJob, applicantMatchProfile);
                    return (
                      <div className={`match-score-box ${getMatchColorClass(detailsMatchInfo.score)}`} title={detailsMatchInfo.breakdown}>
                        <small>Match</small>
                        <b>{detailsMatchInfo.score}%</b>
                      </div>
                    );
                  })()}
                  <button
                    type="button"
                    className={`jd-faq-btn ${isFaqDrawerOpen ? "active" : ""}`}
                    onClick={() => {
                      if (isFaqDrawerOpen) {
                        setIsFaqDrawerOpen(false);
                      } else {
                        handleOpenFaqs(detailsJob);
                      }
                    }}
                  >
                    FAQ's
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable body & drawer container */}
            <div className="jd-body-wrapper">
              <div className="jd-body">
                {/* Title row */}
                <div className="jd-top-section">
                  <div className="jd-title-row">
                    <h2 className="jd-title-h2">{detailsJob.title}</h2>
                  </div>
                  <div className="jd-chips-inline">
                    <span className={`status-chip ${detailsJob.status === "open" ? "open" : "closed"}`}>{detailsJob.status === "open" ? "Open" : "Closed"}</span>
                    {detailsJob.urgent && <span className="status-chip urgent">Urgent</span>}
                    <span className="setup-pill">{detailsJob.setup}</span>
                    <span className="salary-pill">{detailsJob.salary}</span>
                  </div>
                </div>

                <div className="jd-section">
                  <h3>Job Description</h3>
                  <p>{detailsJob.summary || "No description provided."}</p>
                </div>

                {detailsJob.skillTags.length > 0 && (
                  <div className="jd-section">
                    <h3>Required Skills</h3>
                    <div className="jd-tags-wrap">
                      {detailsJob.skillTags.map((s) => (
                        <span className="js-tag-chip js-tag-skill" key={s}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {detailsJob.qualTags.length > 0 && (
                  <div className="jd-section">
                    <h3>Required Qualifications</h3>
                    <div className="jd-tags-wrap">
                      {detailsJob.qualTags.map((q) => (
                        <span className="js-tag-chip js-tag-qualification" key={q}>{q}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Slide-in FAQ Drawer */}
              <div className={`jd-faq-drawer ${isFaqDrawerOpen ? "open" : ""}`}>
                <div className="jd-faq-header">
                  <h3>Company FAQ's</h3>
                  <button type="button" className="jd-faq-back-btn" aria-label="Back to job details" onClick={() => setIsFaqDrawerOpen(false)}>
                    ←
                  </button>
                </div>
                <div className="jd-faq-body">
                  {faqLoading ? (
                    <p className="jd-faq-loading">Loading FAQ's...</p>
                  ) : companyFaqs.length === 0 ? (
                    <p className="jd-faq-empty">No FAQ's created by this company yet.</p>
                  ) : (
                    companyFaqs.map((faq) => {
                      const isExpanded = expandedFaqIds.includes(faq.id);
                      return (
                        <div key={faq.id} className={`jd-faq-item ${isExpanded ? "expanded" : ""}`}>
                          <button
                            type="button"
                            className="jd-faq-question-btn"
                            onClick={() => {
                              setExpandedFaqIds((prev) =>
                                prev.includes(faq.id) ? prev.filter((id) => id !== faq.id) : [...prev, faq.id]
                              );
                            }}
                          >
                            <div className="jd-faq-q-left">
                              {faq.question_type && <span className="jd-faq-type-badge">{faq.question_type}</span>}
                              <span className="jd-faq-question-text">{faq.question}</span>
                            </div>
                            <span className="jd-faq-toggle-icon">{isExpanded ? "−" : "+"}</span>
                          </button>
                          {isExpanded && (
                            <div className="jd-faq-answer">
                              <p>{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="jd-panel-footer">
              <div className="jd-footer-meta">
                <span><strong>Applications:</strong> {detailsJob.applicantCount} / {detailsJob.applicationLimit}</span>
                <span><strong>Close Date:</strong> {detailsJob.closeDate}</span>
              </div>
              <div className="jd-footer-actions">
                <button type="button" className="jd-cancel-btn" onClick={() => { setDetailsJob(null); setIsFaqDrawerOpen(false); }}>Close</button>
                <button
                  type="button"
                  className={`solid-btn ${appliedJobIds.includes(detailsJob.id) ? "applied-btn" : ""}`}
                  onClick={() => applyToJob(detailsJob.id)}
                  disabled={appliedJobIds.includes(detailsJob.id) || applyingJobId === detailsJob.id}
                >
                  {appliedJobIds.includes(detailsJob.id) ? "Applied" : applyingJobId === detailsJob.id ? "Applying..." : "Apply Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
