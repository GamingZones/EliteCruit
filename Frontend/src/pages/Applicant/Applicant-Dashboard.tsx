import React, { useEffect, useMemo, useRef, useState } from "react";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import {
  calculateJobMatch,
  calculateJobMatchDetails,
  getMatchColorClass,
  inferMatchScore,
  parseCompetencyDisplayTags,
  formatExperienceLevel,
  formatLocationWithCavite,
} from "../../utils/filters";
import "./Applicant-Dashboard.css";

type SideNavItem = {
  label: string;
  icon: "overview" | "star" | "applications" | "documents" | "feedback" | "profile" | "search" | "chat" | "messages" | "notifications" | "logout";
  badge?: string;
  sectionId?: string;
  href?: string;
};

type StatCard = {
  label: string;
  value: string;
  hint: string;
  icon: SideNavItem["icon"];
};

type JobCard = {
  id: number;
  title: string;
  company: string;
  location: string;
  summary: string;
  salary: string;
  salaryMin: number;
  setup: string;
  experienceLevel?: string | null;
  status: "open" | "closed";
  closeDate: string;
  applicationLimit: number;
  applicantCount: number;
  qualifications: string;
  certifications?: string;
  responsibilities: string;
  skillTags: string[];
  qualTags: string[];
  certTags: string[];
  jobType: string;
  functionGroup: string;
  distance: string;
  badges: string[];
  urgent: boolean;
  matchScore?: number;
  matchBreakdown?: string;
  matchColor?: "red" | "orange" | "green";
  createdAt?: string | null;
  createdRank?: number;
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

type ApplicantMatchProfile = {
  desiredJobTitle: string;
  workArrangement: string;
  expectedSalary: number;
  city: string;
  skills: string[];
  qualifications: string[];
  certifications: string[];
};

type JobInvitationItem = {
  id: number;
  job_post_id: number;
  employer_user_id: number;
  status: string;
  custom_message?: string;
  created_at: string;
  updated_at: string;
  job_title: string;
  job_location?: string;
  salary_min?: number;
  salary_max?: number;
  work_arrangement?: string;
  job_description?: string;
  required_skills?: string;
  job_qualifications?: string;
  close_date?: string;
  application_limit?: number;
  job_status?: string;
  business_name?: string;
  contact_number?: string;
  company_address?: string;
  industry?: string;
  employer_email?: string;
};

const baseStatCards: StatCard[] = [
  { label: "Applications", value: "0", hint: "Submitted roles", icon: "applications" },
  { label: "Under Review", value: "0", hint: "Recruiter opened", icon: "notifications" },
  { label: "Shortlisted", value: "0", hint: "Ready for next step", icon: "star" },
  { label: "Smart Matches", value: "0", hint: "Ranked recommendations", icon: "search" },
];

const navWorkspace: SideNavItem[] = [
  { label: "Overview", icon: "overview", sectionId: "section-overview" },
  { label: "Smart Matches", icon: "star", sectionId: "section-smart-matches" },
  { label: "My Applications", icon: "applications", sectionId: "section-applications" },
  { label: "Job Invitations", icon: "notifications", sectionId: "section-invitations" },
];

const navGeneral: SideNavItem[] = [
  { label: "Job Search", icon: "search", href: "/job-search" },
  { label: "Messages", icon: "messages", href: "/messages" },
  { label: "Notifications", icon: "notifications", href: "/notifications" },
  { label: "Feedback", icon: "feedback", href: "/feedback" },
];

function RenderTagChips({
  items,
  type,
  maxVisible = 1,
}: {
  items: string[];
  type: "skill" | "qualification" | "certification";
  maxVisible?: number;
}) {
  if (!items || items.length === 0) return null;
  const firstIsTooLong = Boolean(items[0] && items[0].length > 15);
  const visible = firstIsTooLong ? [] : items.slice(0, maxVisible);
  const hidden = firstIsTooLong ? items : items.slice(maxVisible);
  const fullListText = items.join(", ");
  const typeLabel =
    type === "skill" ? "SKILLS:" : type === "qualification" ? "QUALIFICATIONS:" : "CERTIFICATIONS:";

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
            <strong>{typeLabel}</strong>
            <span>{fullListText}</span>
          </span>
        </span>
      )}
    </span>
  );
}

function MiniIcon({ name }: { name: "company" | "location" | "bookmark" | "bookmarkFilled" }) {
  const icons: Record<"company" | "location" | "bookmark" | "bookmarkFilled", JSX.Element> = {
    company: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />,
    location: <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />,
    bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />,
    bookmarkFilled: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" fill="currentColor" />,
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

function formatSalaryRange(minSalary: number | null, maxSalary: number | null) {
  const min = Number.isFinite(Number(minSalary)) ? Number(minSalary).toLocaleString("en-US") : "0";
  const max = Number.isFinite(Number(maxSalary)) ? Number(maxSalary).toLocaleString("en-US") : "0";
  return `PHP ${min} - ${max}`;
}

function parseExpectedSalary(raw: string | null | undefined) {
  if (!raw) return 0;
  const amount = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}


function statusChipBadgeClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "shortlisted") return "chip-shortlisted";
  if (s === "approved" || s === "accepted") return "chip-approved";
  if (s === "denied" || s === "rejected") return "chip-denied";
  return "chip-pending";
}

function statusChipClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "shortlisted") return "match-chip chip-amber";
  if (s === "approved" || s === "accepted") return "match-chip chip-green";
  if (s === "denied" || s === "rejected") return "match-chip chip-amber";
  return "match-chip chip-green";
}

function formatStatusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "shortlisted") return "Shortlisted";
  if (s === "approved" || s === "accepted") return "Approved";
  if (s === "denied" || s === "rejected") return "Denied";
  return "Pending";
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SideIcon({ name }: { name: SideNavItem["icon"] }) {
  const icons: Record<SideNavItem["icon"], JSX.Element> = {
    overview: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
    star: <path d="m12 3 2.8 5.6L21 9.5l-4.5 4.4 1.1 6.1L12 17.1 6.4 20l1.1-6.1L3 9.5l6.2-.9L12 3Z" />,
    applications: <path d="M7 4h10v4H7V4Zm-1 6h12v10H6V10Zm2 2v2h2v-2H8Zm0 4v2h2v-2H8Zm4-4v2h4v-2h-4Zm0 4v2h4v-2h-4Z" />,
    documents: <path d="M7 3h7l5 5v13H7V3Zm7 1.5V9h4.5M9 12h8M9 15h8M9 18h6" />,
    feedback: <path d="M4 11h3v9H4v-9Zm5 9V9.5L12.5 6h4.2c1 0 1.7 1 1.4 2l-1 3h2.6c1.1 0 1.9 1 1.5 2l-1.8 5.6c-.2.6-.8 1-1.4 1H9Z" />,
    profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    search: <path d="M11 4a7 7 0 1 0 4.4 12.4l4.1 4.1 1.5-1.5-4.1-4.1A7 7 0 0 0 11 4Z" />,
    chat: (
      <g stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="3" />
        <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
        <path d="M12 2v5m-4 4V7a4 4 0 0 1 8 0v4" />
      </g>
    ),
    messages: <path d="M3 6h18v11H8l-5 4v-4H3V6Zm3 3h12M6 12h8" />,
    notifications: <path d="M12 3a5 5 0 0 1 5 5v2.8l1.4 2.3c.5.8 0 1.9-.9 1.9H6.5c-.9 0-1.4-1.1-.9-1.9L7 10.8V8a5 5 0 0 1 5-5Zm-2 14a2 2 0 1 0 4 0" />,
    logout: <path d="M9 4H5v16h4M14 8l4 4-4 4M10 12h8" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

export function ChevronIcon({ direction }: { direction: "up" | "down" | "left" | "right" }) {
  const paths: Record<"up" | "down" | "left" | "right", string> = {
    up: "M6 14l6-6 6 6",
    down: "M6 10l6 6 6-6",
    left: "M14 6l-6 6 6 6",
    right: "M10 6l6 6-6 6",
  };

  return (
    <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true">
      <path d={paths[direction]} />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

function getInitialApplicantName() {
  if (typeof window === "undefined") return "Applicant";
  const raw = localStorage.getItem("elitecruit-user");
  if (!raw) return "Applicant";
  try {
    const u = JSON.parse(raw);
    if (u.full_name) return u.full_name;
    const full = [u.first_name || u.firstName, u.last_name || u.lastName].filter(Boolean).join(" ").trim();
    if (full) return full;
    return u.email || "Applicant";
  } catch {
    return "Applicant";
  }
}

export default function ApplicantDashboard() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("section-overview");
  const [applicantLabel, setApplicantLabel] = useState(getInitialApplicantName);
  const [dashboardStats, setDashboardStats] = useState<StatCard[]>(baseStatCards);
  const [myApplicationsList, setMyApplicationsList] = useState<any[]>([]);
  const [invitationsList, setInvitationsList] = useState<JobInvitationItem[]>([]);
  const [invitationFilter, setInvitationFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");
  const [isRespondingInvId, setIsRespondingInvId] = useState<number | null>(null);

  // Real job search state & details modal for Smart Matches
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [applicantUserId, setApplicantUserId] = useState<number | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [detailsJob, setDetailsJob] = useState<JobCard | null>(null);
  const [applicantMatchProfile, setApplicantMatchProfile] = useState<ApplicantMatchProfile | null>(null);

  // FAQ drawer state
  const [companyFaqs, setCompanyFaqs] = useState<FaqItem[]>(DEFAULT_FAQS);
  const [faqLoading, setFaqLoading] = useState(false);
  const [expandedFaqIds, setExpandedFaqIds] = useState<number[]>([]);
  const [isFaqDrawerOpen, setIsFaqDrawerOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);

  const navItemsWithSection = useMemo(
    () => [...navWorkspace, ...navGeneral].filter((item): item is SideNavItem & { sectionId: string } => Boolean(item.sectionId)),
    []
  );

  const scrollToHashSection = () => {
    const hash = window.location.hash;
    if (!hash) return;
    const sectionId = hash.replace("#", "");
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "auto", block: "start" });
    setActiveSection(sectionId);
  };

  useEffect(() => {
    const applyHashScroll = () => {
      requestAnimationFrame(scrollToHashSection);
    };
    applyHashScroll();
    window.addEventListener("hashchange", applyHashScroll);
    return () => window.removeEventListener("hashchange", applyHashScroll);
  }, []);

  useEffect(() => {
    const sectionIds = ["section-overview", "section-smart-matches", "section-applications", "section-invitations"];
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "-20% 0px -50% 0px",
      threshold: 0.1,
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

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

      if (savedUser.role !== "applicant" || !savedUser.id) return;
      setApplicantUserId(savedUser.id);

      fetch(`/api/applicants/${savedUser.id}/applications`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data?.message || "Unable to load applications.");
          const total = Number(data?.stats?.total || 0);
          const underReview = Number(data?.stats?.underReview || 0);
          const shortlisted = Number(data?.stats?.shortlisted || 0);
          setMyApplicationsList(Array.isArray(data?.applications) ? data.applications : []);

          const ids = Array.isArray(data?.applications)
            ? data.applications
                .map((item: any) => Number(item?.job_post_id))
                .filter((id: number) => Number.isInteger(id) && id > 0)
            : [];
          setAppliedJobIds(ids);

          setDashboardStats((current) => [
            { label: "Applications", value: String(total), hint: "Submitted roles", icon: "applications" },
            { label: "Under Review", value: String(underReview), hint: "Recruiter opened", icon: "notifications" },
            { label: "Shortlisted", value: String(shortlisted), hint: "Ready for next step", icon: "star" },
            current[3] || baseStatCards[3],
          ]);
        })
        .catch(() => {});

      fetch(`/api/applicants/${savedUser.id}/invitations`)
        .then((res) => res.json())
        .then((data) => {
          setInvitationsList(Array.isArray(data?.invitations) ? data.invitations : []);
        })
        .catch(() => {});

      fetch(`/api/applicants/${savedUser.id}/profile`)
        .then((response) => response.json())
        .then((data) => {
          const profile = data?.profile;
          const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(" ");
          if (fullName) {
            setApplicantLabel(fullName);
            try {
              const updated = {
                ...savedUser,
                first_name: profile?.first_name || "",
                last_name: profile?.last_name || "",
                full_name: fullName,
              };
              localStorage.setItem("elitecruit-user", JSON.stringify(updated));
            } catch {}
          }

          setApplicantMatchProfile({
            desiredJobTitle: profile?.desired_job_title || "",
            workArrangement: profile?.work_arrangement || "",
            expectedSalary: parseExpectedSalary(profile?.expected_salary),
            city: profile?.city || "",
            skills: parseCompetencyDisplayTags(profile?.skills),
            qualifications: parseCompetencyDisplayTags(profile?.qualifications),
            certifications: parseCompetencyDisplayTags(profile?.certifications),
          });
        })
        .catch(() => {});
    } catch {
      setApplicantLabel("Applicant");
    }
  }, []);

  const handleRespondInvitation = async (invitationId: number, action: "accept" | "decline") => {
    setIsRespondingInvId(invitationId);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvitationsList((prev) =>
          prev.map((inv) => (inv.id === invitationId ? { ...inv, status: data.status } : inv))
        );
        if (action === "accept" && applicantUserId) {
          fetch(`/api/applicants/${applicantUserId}/applications`)
            .then((r) => r.json())
            .then((d) => {
              setMyApplicationsList(Array.isArray(d?.applications) ? d.applications : []);
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error("Error responding to invitation:", err);
    } finally {
      setIsRespondingInvId(null);
    }
  };

  const handleReviewInvitation = (inv: JobInvitationItem) => {
    const jobObj: JobCard = {
      id: Number(inv.job_post_id),
      title: inv.job_title || "Invited Role",
      company: inv.business_name || "Employer",
      location: inv.job_location || "Cavite",
      summary: inv.job_description || "No job description provided yet.",
      salary: formatSalaryRange(inv.salary_min ?? null, inv.salary_max ?? null),
      salaryMin: Number(inv.salary_min) || 0,
      setup: inv.work_arrangement || "On-Site",
      status: inv.job_status === "closed" ? "closed" : "open",
      closeDate: inv.close_date || "-",
      applicationLimit: Number(inv.application_limit) || 10,
      applicantCount: 1,
      qualifications: inv.job_qualifications || "Not provided",
      responsibilities: "Not provided",
      skillTags: parseCompetencyDisplayTags(inv.required_skills),
      qualTags: parseCompetencyDisplayTags(inv.job_qualifications),
      certTags: parseCompetencyDisplayTags((inv as any).certifications),
      jobType: inv.work_arrangement === "Remote" ? "Remote" : "Full-time",
      functionGroup: "General",
      distance: "Cavite",
      badges: parseCompetencyDisplayTags(inv.required_skills),
      urgent: false,
      createdAt: inv.created_at,
      createdRank: 0,
      employerUserId: Number(inv.employer_user_id) || undefined,
      rating: (inv as any).rating ? String((inv as any).rating) : "0.0",
    };
    setDetailsJob(jobObj);
  };

  useEffect(() => {
    const savedBookmarks = localStorage.getItem("elitecruit-bookmarked-jobs");
    if (!savedBookmarks) return;
    try {
      const parsed = JSON.parse(savedBookmarks);
      if (Array.isArray(parsed)) {
        setBookmarkedIds(parsed.filter((id) => Number.isInteger(id)));
      }
    } catch {}
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
          location: formatLocationWithCavite(row.location || row.company_address),
          summary: row.description || "No job description provided yet.",
          salary: formatSalaryRange(row.salary_min ?? null, row.salary_max ?? null),
          salaryMin: Number.isFinite(Number(row.salary_min)) ? Number(row.salary_min) : 0,
          setup: row.work_arrangement || "Flexible",
          experienceLevel: row.experience_level || null,
          status: row.status === "closed" ? "closed" : "open",
          closeDate: row.close_date || "-",
          applicationLimit: Number.isFinite(Number(row.application_limit)) ? Number(row.application_limit) : 0,
          applicantCount: Number.isFinite(Number(row.applicant_count)) ? Number(row.applicant_count) : 0,
          qualifications: row.qualifications || "Not provided",
          certifications: row.certifications || "Not provided",
          responsibilities: row.responsibilities || "Not provided",
          skillTags: parseCompetencyDisplayTags(row.required_skills),
          qualTags: parseCompetencyDisplayTags(row.qualifications),
          certTags: parseCompetencyDisplayTags(row.certifications),
          jobType: row.work_arrangement === "Remote" ? "Remote" : "Full-time",
          functionGroup: "General",
          distance: "Cavite",
          badges: parseCompetencyDisplayTags(row.required_skills),
          urgent: Boolean(Number(row.is_urgent || 0)),
          createdAt: typeof row.created_at === "string" ? row.created_at : null,
          createdRank: index,
          employerUserId: Number(row.employer_user_id) || undefined,
          rating: row.rating ? String(row.rating) : "0.0",
        }));
        setJobs(mapped);
        setDashboardStats((current) => [
          current[0] || baseStatCards[0],
          current[1] || baseStatCards[1],
          current[2] || baseStatCards[2],
          { label: "Smart Matches", value: String(mapped.length), hint: "Ranked recommendations", icon: "search" },
        ]);
      })
      .catch(() => setJobs([]));
  }, []);

  const sortedSmartMatches = useMemo(() => {
    const unappliedJobs = jobs.filter((job) => !appliedJobIds.includes(job.id));
    return [...unappliedJobs].sort((a, b) => calculateJobMatch(b, applicantMatchProfile) - calculateJobMatch(a, applicantMatchProfile));
  }, [jobs, appliedJobIds, applicantMatchProfile]);

  const applyToJob = async (jobId: number) => {
    if (!applicantUserId) {
      alert("Sign in as applicant to apply for jobs.");
      return;
    }
    if (appliedJobIds.includes(jobId)) return;

    setApplyingJobId(jobId);
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
      alert(error instanceof Error ? error.message : "Unable to submit application.");
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

  const handleReviewApplication = (app: any) => {
    const existingJob = jobs.find((j) => j.id === Number(app.job_post_id));
    if (existingJob) {
      setDetailsJob(existingJob);
      return;
    }

    const jobObj: JobCard = {
      id: Number(app.job_post_id),
      title: app.job_title || app.title || "Applied Role",
      company: app.company_name || "Employer",
      location: app.location || app.city || "Cavite",
      summary: app.description || "No job description provided yet.",
      salary: formatSalaryRange(app.salary_min ?? null, app.salary_max ?? null),
      salaryMin: Number.isFinite(Number(app.salary_min)) ? Number(app.salary_min) : 0,
      setup: app.work_arrangement || "Flexible",
      status: app.status === "closed" ? "closed" : "open",
      closeDate: app.close_date || "-",
      applicationLimit: Number.isFinite(Number(app.application_limit)) ? Number(app.application_limit) : 0,
      applicantCount: Number.isFinite(Number(app.applicant_count)) ? Number(app.applicant_count) : 0,
      qualifications: app.qualifications || "Not provided",
      certifications: app.certifications || "Not provided",
      responsibilities: app.responsibilities || "Not provided",
      skillTags: parseCompetencyDisplayTags(app.required_skills),
      qualTags: parseCompetencyDisplayTags(app.qualifications),
      certTags: parseCompetencyDisplayTags(app.certifications),
      jobType: app.work_arrangement === "Remote" ? "Remote" : "Full-time",
      functionGroup: "General",
      distance: "Cavite",
      badges: parseCompetencyDisplayTags(app.required_skills),
      urgent: Boolean(Number(app.is_urgent || 0)),
      createdAt: typeof app.created_at === "string" ? app.created_at : null,
      createdRank: 0,
      employerUserId: Number(app.employer_user_id) || undefined,
      rating: app.rating ? String(app.rating) : "0.0",
    };
    setDetailsJob(jobObj);
  };

  const handleOpenFaqs = async (job: JobCard) => {
    setIsFaqDrawerOpen(true);
    if (!job.employerUserId) {
      setCompanyFaqs(DEFAULT_FAQS);
      return;
    }

    setFaqLoading(true);
    try {
      const res = await fetch(`/api/employers/${job.employerUserId}/faqs`);
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to load FAQs");
      const activeFaqs = Array.isArray(data.faqs)
        ? data.faqs.filter((f: FaqItem) => f.is_active === undefined || Number(f.is_active) === 1)
        : [];
      setCompanyFaqs(activeFaqs.length > 0 ? activeFaqs : DEFAULT_FAQS);
    } catch {
      setCompanyFaqs(DEFAULT_FAQS);
    } finally {
      setFaqLoading(false);
    }
  };

  const handleSectionClick = (event: React.MouseEvent<HTMLAnchorElement>, sectionId?: string) => {
    if (!sectionId) return;
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
  };

  return (
    <div className={`appdash-page ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
      <aside className="appdash-sidebar" aria-label="Applicant Navigation">
        <a href="/" className="appdash-brand">
          <strong>EliteCruit</strong>
          <span>Candidate Workspace</span>
        </a>

        <ul className="appdash-secondary-list">
          <li className="applicant-workspace-item active">
            <a
              href="/applicant-dashboard"
              className="applicant-workspace-title active"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest(".title-caret-btn")) {
                  e.preventDefault();
                  setIsWorkspaceOpen((prev) => !prev);
                }
              }}
            >
              <span className="title-main">
                <span className="item-icon">
                  <SideIcon name="overview" />
                </span>
                <span>Applicant Workspace</span>
              </span>
              <span className="title-caret-btn" title="Toggle sub-menu">
                <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
              </span>
            </a>

            {isWorkspaceOpen && (
              <ul id="workspace-links" className="appdash-menu-list">
                <li className={activeSection === "section-overview" ? "active" : ""}>
                  <a href="/applicant-dashboard#section-overview" onClick={(event) => handleSectionClick(event, "section-overview")}>
                    <span className="item-icon"><SideIcon name="overview" /></span>
                    <span>Overview</span>
                  </a>
                </li>
                <li className={activeSection === "section-smart-matches" ? "active" : ""}>
                  <a href="/applicant-dashboard#section-smart-matches" onClick={(event) => handleSectionClick(event, "section-smart-matches")}>
                    <span className="item-icon"><SideIcon name="star" /></span>
                    <span>Smart Matches</span>
                  </a>
                </li>
                <li className={activeSection === "section-applications" ? "active" : ""}>
                  <a href="/applicant-dashboard#section-applications" onClick={(event) => handleSectionClick(event, "section-applications")}>
                    <span className="item-icon"><SideIcon name="applications" /></span>
                    <span>My Applications</span>
                  </a>
                </li>
                <li className={activeSection === "section-invitations" ? "active" : ""}>
                  <a href="/applicant-dashboard#section-invitations" onClick={(event) => handleSectionClick(event, "section-invitations")}>
                    <span className="item-icon"><SideIcon name="notifications" /></span>
                    <span>Job Invitations</span>
                  </a>
                </li>
              </ul>
            )}
          </li>

          {navGeneral.map((item) => (
            <li key={item.label} className={item.sectionId === activeSection ? "active" : ""}>
              <a href={item.href ?? (item.sectionId ? `#${item.sectionId}` : "#applicant-overview")} onClick={(event) => handleSectionClick(event, item.sectionId)}>
                <span className="item-icon">
                  <SideIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
                {item.badge ? <span className="item-badge">{item.badge}</span> : null}
              </a>
            </li>
          ))}
        </ul>
        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)} aria-expanded={isProfileMenuOpen}>
            <span className="item-icon"><SideIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{applicantLabel}</strong><small>Applicant</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && <div className="appdash-profile-menu"><a href="/my-profile"><SideIcon name="profile" />My Profile</a><a href="/"><SideIcon name="logout" />Logout</a></div>}
        </div>
      </aside>

      <main className="appdash-main" id="applicant-overview" ref={mainRef}>
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>Applicant Workspace</strong>
            </div>
          </div>

          <div className="appdash-top-right">
            <ApplicantChatbotDrawer
              isOpen={isChatbotOpen}
              onToggle={() => setIsChatbotOpen((prev) => !prev)}
              pageTitle="Dashboard"
            />
          </div>
        </header>

        <section className="hero-card section-anchor" id="section-overview">
          <div>
            <small>Applicant Workspace</small>
            <h1>Dashboard</h1>
            <p>
              Track applications, review Smart Matches, and manage your applicant workflow.
            </p>
          </div>
        </section>

        <section className="stats-grid" aria-label="Dashboard metrics">
          {dashboardStats.map((card) => (
            <article key={card.label} className="stat-card">
              <div className="stat-head">
                <h2>{card.label}</h2>
                <span className="stat-icon" aria-hidden="true"><SideIcon name={card.icon} /></span>
              </div>
              <strong>{card.value}</strong>
              <p>{card.hint}</p>
            </article>
          ))}
        </section>

        {/* ── SMART MATCHES SECTION (Same UI as Job Search cards) ── */}
        <section className="matches-card section-anchor" id="section-smart-matches">
          <div className="matches-head">
            <div>
              <small>Dashboard Section</small>
              <h2>Smart Matches</h2>
              <p>Ranked by skills, qualifications, location, salary, and work arrangement.</p>
            </div>
            <a href="/job-search">View All</a>
          </div>

          {sortedSmartMatches.length === 0 ? (
            <article className="result-card empty-state">
              <div className="result-top">
                <div>
                  <h3>No smart matches yet.</h3>
                  <p>Job recommendations will appear here once active job posts are available.</p>
                </div>
              </div>
            </article>
          ) : (
            sortedSmartMatches.map((job) => (
              <article key={job.id} className="result-card" style={{ marginBottom: "12px" }}>
                <div className="result-card-main">
                  <div className="result-left-col">
                    <div className="result-title-row">
                      <h3 title={job.title}>{job.title}</h3>
                    </div>
                    <p className="meta-line">
                      <span><MiniIcon name="company" />{job.company}</span>
                      <span><MiniIcon name="location" />{job.location}</span>
                    </p>
                    <p className="result-summary">{job.summary || "No job description provided yet."}</p>
                    <div className="result-tags">
                      <span className={`status-chip ${job.status === "open" ? "open" : "closed"}`}>{job.status === "open" ? "Open" : "Closed"}</span>
                      {job.urgent ? <span className="status-chip urgent">Urgent</span> : null}
                      <span className="setup-pill">{job.setup}</span>
                      {job.experienceLevel && <span className="exp-level-pill">{formatExperienceLevel(job.experienceLevel)}</span>}
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
                      {job.certTags && job.certTags.length > 0 && (
                        <div className="js-meta-tag-line">
                          <span className="js-meta-label">Certifications: </span>
                          <RenderTagChips items={job.certTags} type="certification" maxVisible={1} />
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

        {/* ── MY APPLICATIONS SECTION ── */}
        <section className="matches-card section-anchor" id="section-applications" style={{ marginTop: "24px" }}>
          <div className="matches-head">
            <div>
              <small>Dashboard Section</small>
              <h2>My Applications</h2>
              <p>Positions you have applied for and their real-time application status.</p>
            </div>
            <a href="/job-search">Find More Jobs</a>
          </div>

          {myApplicationsList.length === 0 ? (
            <article className="job-card">
              <div>
                <h3>No applications submitted yet.</h3>
                <p>Browse open job listings on the Job Search page and submit applications.</p>
              </div>
              <div className="job-actions">
                <button type="button" className="solid-btn" onClick={() => { window.location.href = "/job-search"; }}>Browse Jobs</button>
              </div>
            </article>
          ) : (
            myApplicationsList.map((app: any) => (
              <article key={app.id || app.job_post_id} className="job-card">
                <div className="job-card-left">
                  <h3>{app.job_title || app.title || "Applied Role"}</h3>
                  <p>{app.company_name ? `${app.company_name} · ` : ""}{app.location || app.city || "Location not set"}</p>
                  <p style={{ marginTop: "4px", fontSize: "0.82rem", color: "#355172" }}>
                    Submitted on: {formatDate(app.submitted_at)}
                  </p>
                </div>
                <div className="job-card-middle">
                  <span className={`status-badge-chip ${statusChipBadgeClass(app.status)}`}>
                    {formatStatusLabel(app.status)}
                  </span>
                </div>
                <div className="job-actions">
                  <button type="button" className="solid-btn" onClick={() => handleReviewApplication(app)}>
                    Review
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => { window.location.href = "/messages"; }}>Message</button>
                </div>
              </article>
            ))
          )}
        </section>

        {/* ── JOB INVITATIONS SECTION ── */}
        <section className="matches-card section-anchor" id="section-invitations" style={{ marginTop: "24px" }}>
          <div className="matches-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <small>Direct Invitations</small>
              <h2>Job Invitations</h2>
              <p>Positions where employers reviewed your profile and directly invited you.</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["all", "pending", "accepted", "declined"] as const).map((key) => {
                const count = key === "all"
                  ? invitationsList.length
                  : invitationsList.filter((i) => (i.status || "pending").toLowerCase() === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInvitationFilter(key)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: invitationFilter === key ? "1px solid #0284c7" : "1px solid #cbd5e1",
                      background: invitationFilter === key ? "#e0f2fe" : "#f8fafc",
                      color: invitationFilter === key ? "#0369a1" : "#475569",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {key} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {invitationsList.filter((inv) => invitationFilter === "all" || (inv.status || "pending").toLowerCase() === invitationFilter).length === 0 ? (
            <article className="job-card">
              <div>
                <h3>No job invitations found under "{invitationFilter}".</h3>
                <p>When employers discover your profile and invite you to their open positions, they will appear here.</p>
              </div>
              <div className="job-actions">
                <a href="/job-search" className="solid-btn" style={{ textDecoration: "none" }}>Browse Job Search</a>
              </div>
            </article>
          ) : (
            invitationsList
              .filter((inv) => invitationFilter === "all" || (inv.status || "pending").toLowerCase() === invitationFilter)
              .map((inv) => {
                const status = (inv.status || "pending").toLowerCase();
                return (
                  <article key={inv.id} className="job-card" style={{ gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="job-card-left" style={{ flex: 1, minWidth: "260px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0 }}>{inv.job_title}</h3>
                        <span style={{ fontSize: "0.75rem", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                          Direct Invitation
                        </span>
                      </div>
                      <p style={{ margin: "4px 0" }}>
                        <strong>{inv.business_name || "Employer"}</strong> • {inv.job_location || "Cavite"} • {inv.work_arrangement || "On-Site"}
                      </p>
                      {inv.salary_min && (
                        <p style={{ margin: "2px 0", color: "#0284c7", fontWeight: 600, fontSize: "0.86rem" }}>
                          {formatSalaryRange(inv.salary_min ?? null, inv.salary_max ?? null)}
                        </p>
                      )}
                      <small style={{ color: "#64748b" }}>
                        Invited on: {formatDate(inv.created_at)}
                      </small>
                    </div>

                    <div className="job-actions invitation-card-actions">
                      <button type="button" className="inv-action-btn inv-details-btn" onClick={() => handleReviewInvitation(inv)}>
                        Details
                      </button>
                      {status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="inv-action-btn inv-accept-btn"
                            onClick={() => handleRespondInvitation(inv.id, "accept")}
                            disabled={isRespondingInvId === inv.id}
                          >
                            {isRespondingInvId === inv.id ? "..." : "Accept"}
                          </button>
                          <button
                            type="button"
                            className="inv-action-btn inv-decline-btn"
                            onClick={() => handleRespondInvitation(inv.id, "decline")}
                            disabled={isRespondingInvId === inv.id}
                          >
                            {isRespondingInvId === inv.id ? "..." : "Decline"}
                          </button>
                        </>
                      ) : status === "accepted" ? (
                        <button type="button" className="inv-action-btn inv-accepted-status-btn" disabled>
                          Accepted
                        </button>
                      ) : (
                        <button type="button" className="inv-action-btn inv-declined-status-btn" disabled>
                          Declined
                        </button>
                      )}
                      <a href="/messages" className="inv-action-btn inv-message-btn">
                        Message
                      </a>
                    </div>
                  </article>
                );
              })
          )}
        </section>
      </main>

      {/* ── JOB DETAILS MODAL ── */}
      {detailsJob && (
        <div className="jd-overlay" role="dialog" aria-modal="true" aria-label="Job Details" onClick={(e) => { if (e.target === e.currentTarget) setDetailsJob(null); }}>
          <div className="jd-panel">
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

            <div className="jd-body-wrapper">
              <div className="jd-body">
                <div className="jd-top-section">
                  <div className="jd-title-row">
                    <h2 className="jd-title-h2">{detailsJob.title}</h2>
                  </div>
                  <div className="jd-chips-inline">
                    <span className={`status-chip ${detailsJob.status === "open" ? "open" : "closed"}`}>{detailsJob.status === "open" ? "Open" : "Closed"}</span>
                    {detailsJob.urgent && <span className="status-chip urgent">Urgent</span>}
                    <span className="setup-pill">{detailsJob.setup}</span>
                    {detailsJob.experienceLevel && <span className="exp-level-pill">{formatExperienceLevel(detailsJob.experienceLevel)}</span>}
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
                        <span className="js-tag-chip js-tag-skill" key={s} title={s}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {detailsJob.qualTags.length > 0 && (
                  <div className="jd-section">
                    <h3>Required Qualifications</h3>
                    <div className="jd-tags-wrap">
                      {detailsJob.qualTags.map((q) => (
                        <span className="js-tag-chip js-tag-qualification" key={q} title={q}>{q}</span>
                      ))}
                    </div>
                  </div>
                )}

                {detailsJob.certTags && detailsJob.certTags.length > 0 && (
                  <div className="jd-section">
                    <h3>Required Certifications</h3>
                    <div className="jd-tags-wrap">
                      {detailsJob.certTags.map((c) => (
                        <span className="js-tag-chip js-tag-certification" key={c} title={c}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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

      {isSidebarVisible && (
        <button
          type="button"
          className="appdash-backdrop"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      {!isSidebarVisible && (
        <button
          type="button"
          className="appdash-fab"
          aria-label="Show sidebar"
          onClick={() => setIsSidebarVisible(true)}
        >
          <MenuIcon />
        </button>
      )}
    </div>
  );
}
