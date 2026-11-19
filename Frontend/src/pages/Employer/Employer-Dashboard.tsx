import React, { useEffect, useState, useMemo } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import ApplicantDetailsModal, { type CandidateModalData } from "../../components/modals/ApplicantDetailsModal";
import { authFetch } from "../../utils/auth";
import {
  parseLocations,
  calculateCandidateMatch,
  parseCompetencyDisplayTags,
} from "../../utils/filters";
import "../Applicant/Applicant-Dashboard.css";
import "./Employer-Dashboard.css";

type EmployerIconName =
  | "dashboard"
  | "jobposts"
  | "applicant"
  | "screening"
  | "discovery"
  | "nearby"
  | "shortlisted"
  | "faq"
  | "feedback"
  | "company"
  | "messages"
  | "notifications"
  | "profile"
  | "chat"
  | "logout";

function EmployerIcon({ name }: { name: EmployerIconName }) {
  const icons: Record<EmployerIconName, JSX.Element> = {
    dashboard: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
    jobposts: <path d="M3 8h18v11H3V8Zm5-3h8v3H8V5Zm4 5v4m-2-2h4" />,
    applicant: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    screening: <path d="M11 4a7 7 0 1 0 4.4 12.4l4.1 4.1 1.5-1.5-4.1-4.1A7 7 0 0 0 11 4Z" />,
    discovery: <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4l-8 5-8-5V6l8 5 8-5v2Z" />,
    nearby: <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />,
    shortlisted: <path d="M12 2 5 5v6c0 5.5 3.9 9.9 7 11 3.1-1.1 7-5.5 7-11V5l-7-3Zm-1 12-3-3 1.4-1.4 1.6 1.6 3.6-3.6L16 9l-5 5Z" />,
    faq: <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1.6-6.5a2.5 2.5 0 0 0-2.1-2.5 2.5 2.5 0 0 0-2.5 2.5H7.5a4 4 0 0 1 4-4 4 4 0 0 1 4 4c0 1.5-1 2.3-1.9 3-.7.5-1.1.9-1.1 1.5h-2c0-1.5 1-2.3 1.9-3 .7-.5 1.2-.9 1.2-1.5Z" />,
    feedback: <path d="M4 11h3v9H4v-9Zm5 9V9.5L12.5 6h4.2c1 0 1.7 1 1.4 2l-1 3h2.6c1.1 0 1.9 1 1.5 2l-1.8 5.6c-.2.6-.8 1-1.4 1H9Z" />,
    company: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />,
    messages: <path d="M3 6h18v11H8l-5 4v-4H3V6Zm3 3h12M6 12h8" />,
    notifications: <path d="M12 3a5 5 0 0 1 5 5v2.8l1.4 2.3c.5.8 0 1.9-.9 1.9H6.5c-.9 0-1.4-1.1-.9-1.9L7 10.8V8a5 5 0 0 1 5-5Zm-2 14a2 2 0 1 0 4 0" />,
    profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    chat: <path d="M4 5h16v10H9l-5 4v-4H4V5Zm3 4h10M7 12h7" />,
    logout: <path d="M9 4H5v16h4M14 8l4 4-4 4M10 12h8" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

type ActiveJobPost = {
  id: number;
  title: string;
  location: string | null;
  status: string;
  applicant_count: number;
  salary_min?: number;
  salary_max?: number;
  employment_type?: string;
  work_arrangement?: string;
  skills?: string | string[];
  required_skills?: string | string[];
  qualifications?: string | string[];
  certifications?: string | string[];
  employer_user_id?: number;
};

type RecentApplication = {
  id: number;
  status: string;
  submitted_at: string | null;
  job_title: string | null;
  applicant_name: string | null;
  applicant_user_id?: number;
  profile_picture_path?: string | null;
};

type TalentPoolCandidate = {
  user_id: number;
  email: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  applicant_name?: string;
  phone?: string;
  city?: string;
  province?: string;
  address?: string;
  summary?: string;
  desired_job_title?: string;
  target_roles_json?: string;
  expected_salary?: string | number;
  expected_salary_min?: number;
  expected_salary_max?: number;
  work_arrangement?: string;
  years_of_experience?: number;
  skills?: string;
  qualifications?: string;
  certifications?: string;
  profile_picture_path?: string | null;
  matchScore?: number;
  rating?: number;
};

type DirectInvitation = {
  id: number;
  applicant_user_id: number;
  applicant_name: string;
  job_title: string;
  status: string;
  created_at: string;
  profile_picture_path?: string | null;
};

type ScheduledInterview = {
  id: number;
  job_title?: string;
  applicant_name?: string;
  applicant_user_id?: number;
  applicant_profile_picture_path?: string | null;
  interview_date: string;
  start_time: string;
  end_time?: string;
  interview_type: string;
  meeting_link?: string;
  location_details?: string;
  status: string;
  cancellation_reason?: string;
};

type ApprovedApplication = {
  id: number;
  applicant_user_id: number;
  applicant_name: string;
  job_title: string;
  job_post_id: number;
  status: string;
  submitted_at: string;
  profile_picture_path?: string | null;
  decision_message?: string | null;
  decision_message_type?: string | null;
  response_decision?: string | null;
  response_message?: string | null;
  response_letter?: string | null;
  response_date?: string | null;
  responded_at?: string | null;
  proposed_start_date?: string | null;
  start_date?: string | null;
  rating?: number | null;
  email?: string;
  phone?: string;
  city?: string;
  province?: string;
  skills?: string;
  qualifications?: string;
  certifications?: string;
  work_arrangement?: string;
  expected_salary?: number | string | null;
  gender?: string;
};

type DashboardSummary = {
  stats: {
    activeJobs: number;
    applications: number;
    shortlisted: number;
    toReview: number;
    underReview?: number;
    approved?: number;
    interview?: number;
    recruited?: number;
    hired?: number;
    rejected?: number;
    closed?: number;
  };
  activeJobPosts: ActiveJobPost[];
  recentApplications: RecentApplication[];
};

const WORKSPACE_TABS = [
  { id: "section-insights", label: "Recruitment Insights", num: 1 },
  { id: "section-smart-matches", label: "Smart Matches", num: 2 },
  { id: "section-approved-interviews", label: "Approved Candidates", num: 3 },
] as const;

function initialsFromName(name: string | null | undefined) {
  const raw = (name || "").trim();
  if (!raw) return "AP";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getCandidateLetterStatus(app: ApprovedApplication): {
  statusKey: "offer_extended" | "offer_accepted" | "offer_declined" | "approved";
  badgeLabel: string;
  badgeClass: string;
  buttonLabel: string;
  buttonClass: string;
} {
  if (app.decision_message) {
    const dec = (app.response_decision || "").toLowerCase();
    const appStatus = (app.status || "").toLowerCase();

    if (
      dec === "accept" ||
      dec === "accepted" ||
      dec === "approved" ||
      appStatus === "recruited" ||
      appStatus === "accepted"
    ) {
      return {
        statusKey: "offer_accepted",
        badgeLabel: "Offer Accepted",
        badgeClass: "status-offer-accepted",
        buttonLabel: "Offer Accepted",
        buttonClass: "btn-offer-accepted",
      };
    }

    if (
      dec === "decline" ||
      dec === "declined" ||
      dec === "rejected" ||
      dec === "denied"
    ) {
      return {
        statusKey: "offer_declined",
        badgeLabel: "Offer Declined",
        badgeClass: "status-offer-declined",
        buttonLabel: "Offer Declined",
        buttonClass: "btn-offer-declined",
      };
    }

    return {
      statusKey: "offer_extended",
      badgeLabel: "Offer Extended",
      badgeClass: "status-offer-extended",
      buttonLabel: "Offer Extended",
      buttonClass: "btn-offer-extended",
    };
  }

  return {
    statusKey: "approved",
    badgeLabel: "Approved",
    badgeClass: "status-approved",
    buttonLabel: "Approved",
    buttonClass: "btn-approved",
  };
}

function RenderLocationMeta({ location }: { location?: string | null }) {
  const locItems = parseLocations(location);

  if (locItems.length === 0) {
    return (
      <span className="location-meta">
        <svg className="location-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
        </svg>
        <span>Location not set</span>
      </span>
    );
  }

  if (locItems.length === 1) {
    return (
      <span className="location-meta">
        <svg className="location-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
        </svg>
        <span>{locItems[0]}</span>
      </span>
    );
  }

  const fullListText = locItems.join(", ");

  return (
    <span className="location-meta">
      <svg className="location-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
      </svg>
      <span>{locItems[0]}</span>
      <span className="overflow-dots-badge" tabIndex={0} aria-label="View all locations" title={fullListText}>
        ...
        <span className="overflow-tooltip">
          <strong>Locations:</strong>
          <span>{fullListText}</span>
        </span>
      </span>
    </span>
  );
}

export default function EmployerDashboard() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return false;
    }
    return true;
  });

  const [activeSection, setActiveSection] = useState<
    "section-insights" | "section-smart-matches" | "section-approved-interviews"
  >(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (
        hash === "section-smart-matches" ||
        hash === "section-approved-interviews"
      ) {
        return hash as any;
      }
      if (hash === "section-insights" || hash === "section-postings") {
        return "section-insights";
      }
    }
    return "section-insights";
  });

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [summary, setSummary] = useState<DashboardSummary>({
    stats: {
      activeJobs: 0,
      applications: 0,
      shortlisted: 0,
      toReview: 0,
      underReview: 0,
      approved: 0,
      interview: 0,
      recruited: 0,
      hired: 0,
      rejected: 0,
      closed: 0,
    },
    activeJobPosts: [],
    recentApplications: [],
  });

  const [talentPool, setTalentPool] = useState<TalentPoolCandidate[]>([]);
  const [directInvitations, setDirectInvitations] = useState<DirectInvitation[]>([]);
  const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
  const [approvedApplications, setApprovedApplications] = useState<ApprovedApplication[]>([]);
  const [selectedEvalJobId, setSelectedEvalJobId] = useState<number | null>(null);
  const [selectedApprovedJobId, setSelectedApprovedJobId] = useState<number | "all">("all");
  const [selectedLetterStatus, setSelectedLetterStatus] = useState<"all" | "offer_extended" | "offer_accepted" | "offer_declined">("all");

  // Modals state
  const [detailsModalCandidate, setDetailsModalCandidate] = useState<CandidateModalData | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewOfferLetterModal, setViewOfferLetterModal] = useState<{
    candidateName: string;
    jobTitle: string;
    letterText?: string | null;
    status: string;
    responseDecision?: string | null;
    responseMessage?: string | null;
    responseDate?: string | null;
    proposedStartDate?: string | null;
  } | null>(null);

  const companyLabel = useEmployerCompanyLabel("Employer");

  const dashboardFaqs: FAQItem[] = [
    {
      question: "How do I create and publish a new job post?",
      answer: "1. Click 'Job Posts' on the left sidebar.\n2. Click the 'Create Job Post' button.\n3. Fill in job details (Title, Location, Salary, Application Limit, Skills).\n4. Click 'Publish Job Post'.",
      actionLabel: "Go to Job Posts",
      actionHref: "/employer-job-posts",
    },
    {
      question: "How do I review candidate applications and shortlist them?",
      answer: "Go to 'Applicant Management' on the sidebar. Review candidate profiles, match scores, and resumes. Use action icons to Shortlist, Approve, or Reject applicants.",
      actionLabel: "Go to Applicant Management",
      actionHref: "/employer-applicant-management",
    },
    {
      question: "Where can I find applicants near my Cavite company location?",
      answer: "Click 'Applicant Finder' on the sidebar. You can view nearby candidates on an interactive map of Cavite and send direct recruitment invitations.",
      actionLabel: "Open Applicant Finder",
      actionHref: "/employer-applicant-finder",
    },
    {
      question: "How do direct recruitment invitations work?",
      answer: "When you send a direct invitation from Applicant Finder, it creates a candidate entry in your Recruitment List and opens a conversation thread in Messages.",
      actionLabel: "View Messages",
      actionHref: "/messages",
    },
    {
      question: "How do I update company branding and details?",
      answer: "Click 'Company Profile' in the bottom-left profile control menu to update your business name, description, address, contact number, and branding assets.",
      actionLabel: "Company Profile",
      actionHref: "/employer-company-profile",
    },
  ];

  const handleSectionClick = (
    sectionId: "section-insights" | "section-smart-matches" | "section-approved-interviews"
  ) => {
    setActiveSection(sectionId);
    setIsMobileNavOpen(false);
    if (typeof window !== "undefined") {
      window.location.hash = sectionId;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (
        hash === "section-smart-matches" ||
        hash === "section-approved-interviews"
      ) {
        setActiveSection(hash as any);
      } else if (hash === "section-insights" || hash === "section-postings") {
        setActiveSection("section-insights");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setProfileMessage("Sign in as employer to view dashboard data.");
      return;
    }

    try {
      const savedUser = JSON.parse(savedUserRaw) as { id?: number; role?: string };
      if (savedUser.role !== "employer" || !savedUser.id) {
        setProfileMessage("This page is available to employer accounts.");
        return;
      }

      const empId = savedUser.id;

      // 1. Dashboard summary
      authFetch(`/api/employers/${empId}/dashboard-summary`)
        .then(async (response) => {
          const data = await response.json();
          if (response.ok) {
            setSummary({
              stats: data?.stats || { activeJobs: 0, applications: 0, shortlisted: 0, toReview: 0 },
              activeJobPosts: Array.isArray(data?.activeJobPosts) ? data.activeJobPosts : [],
              recentApplications: Array.isArray(data?.recentApplications) ? data.recentApplications : [],
            });
          }
        })
        .catch((error) => setProfileMessage(error instanceof Error ? error.message : "Unable to load dashboard data."));

      // 2. Talent pool for Smart Matches
      authFetch(`/api/employers/${empId}/talent-pool`)
        .then(async (response) => {
          const data = await response.json();
          if (response.ok && Array.isArray(data?.candidates)) {
            setTalentPool(data.candidates);
          }
        })
        .catch(() => {});

      // 3. Direct invitations
      authFetch(`/api/employers/${empId}/direct-invitations`)
        .then(async (response) => {
          const data = await response.json();
          if (response.ok && Array.isArray(data?.invitations)) {
            setDirectInvitations(data.invitations);
          }
        })
        .catch(() => {});

      // 4. Scheduled interviews
      authFetch(`/api/interviews?user_id=${empId}&role=employer`)
        .then(async (response) => {
          const data = await response.json();
          if (response.ok && Array.isArray(data?.interviews)) {
            setInterviews(data.interviews);
          }
        })
        .catch(() => {});

      // 5. Approved / Hired applications (Master Roster)
      authFetch(`/api/employers/${empId}/applications?status=approved`)
        .then(async (response) => {
          const data = await response.json();
          if (response.ok && Array.isArray(data?.applications)) {
            setApprovedApplications(data.applications);
          }
        })
        .catch(() => {});
    } catch {
      setProfileMessage("Unable to read account session.");
    }
  }, []);

  // Compute Smart Matches
  const targetJobForEval = useMemo(() => {
    if (selectedEvalJobId) {
      return summary.activeJobPosts.find((j) => j.id === selectedEvalJobId) || summary.activeJobPosts[0] || null;
    }
    return summary.activeJobPosts[0] || null;
  }, [summary.activeJobPosts, selectedEvalJobId]);

  const talentMatches = useMemo(() => {
    if (!talentPool || talentPool.length === 0) return [];

    const scored = talentPool.map((c) => {
      let score = 0;
      if (targetJobForEval) {
        score = calculateCandidateMatch(
          {
            skills: c.skills,
            qualifications: c.qualifications,
            certifications: c.certifications,
            desired_job_title: c.desired_job_title,
            city: c.city,
            expected_salary: c.expected_salary,
            work_arrangement: c.work_arrangement,
          },
          {
            title: targetJobForEval.title,
            skills: targetJobForEval.required_skills || targetJobForEval.skills,
            required_skills: targetJobForEval.required_skills,
            qualifications: targetJobForEval.qualifications,
            certifications: targetJobForEval.certifications,
            city: targetJobForEval.location || "Cavite",
            salary_min: targetJobForEval.salary_min,
            salary_max: targetJobForEval.salary_max,
          }
        );
      }
      return {
        ...c,
        matchScore: score,
      };
    });

    return scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [talentPool, targetJobForEval]);

  const upcomingInterviews = useMemo(() => {
    return interviews.filter((i) => (i.status || "").toLowerCase() !== "cancelled");
  }, [interviews]);

  // Funnel conversion velocity stats (Direction 3: Recruitment Insights)
  const funnelData = useMemo(() => {
    const applied = summary.stats.applications || summary.recentApplications.length || 0;
    const screened =
      (summary.stats.underReview || 0) +
      (summary.stats.shortlisted || 0) +
      (summary.stats.interview || 0) +
      (summary.stats.approved || 0) +
      (summary.stats.recruited || 0) +
      (summary.stats.hired || 0);
    const interviewed = summary.stats.interview || upcomingInterviews.length || 0;
    const hired =
      (summary.stats.approved || 0) +
      (summary.stats.recruited || 0) +
      (summary.stats.hired || 0) ||
      approvedApplications.length ||
      0;

    const base = Math.max(applied, 1);
    const screenedConv = applied > 0 ? Math.min(100, Math.round((screened / base) * 100)) : 0;
    const interviewConv = applied > 0 ? Math.min(100, Math.round((interviewed / base) * 100)) : 0;
    const hiredConv = applied > 0 ? Math.min(100, Math.round((hired / base) * 100)) : 0;

    return {
      applied,
      screened,
      screenedConv,
      interviewed,
      interviewConv,
      hired,
      hiredConv,
    };
  }, [summary.stats, summary.recentApplications, upcomingInterviews, approvedApplications]);

  // Ranked active job posts by demand / applicant inflow
  const sortedJobPosts = useMemo(() => {
    return [...summary.activeJobPosts].sort(
      (a, b) => (b.applicant_count || 0) - (a.applicant_count || 0)
    );
  }, [summary.activeJobPosts]);

  // Job posts with approved counts for Tab 3 filter
  const availableApprovedJobs = useMemo(() => {
    const jobMap = new Map<number, { id: number; title: string; count: number }>();
    for (const job of summary.activeJobPosts) {
      jobMap.set(job.id, { id: job.id, title: job.title, count: 0 });
    }
    for (const app of approvedApplications) {
      const jid = Number(app.job_post_id);
      if (jid) {
        if (jobMap.has(jid)) {
          jobMap.get(jid)!.count += 1;
        } else {
          jobMap.set(jid, { id: jid, title: app.job_title || `Job #${jid}`, count: 1 });
        }
      }
    }
    return Array.from(jobMap.values());
  }, [summary.activeJobPosts, approvedApplications]);

  // Filtered approved applications based on chosen vacancy and chosen letter status
  const approvedStatusCounts = useMemo(() => {
    const baseList =
      selectedApprovedJobId === "all"
        ? approvedApplications
        : approvedApplications.filter((app) => Number(app.job_post_id) === Number(selectedApprovedJobId));

    let offerExtendedCount = 0;
    let offerAcceptedCount = 0;
    let offerDeclinedCount = 0;

    for (const app of baseList) {
      const { statusKey } = getCandidateLetterStatus(app);
      if (statusKey === "offer_extended") offerExtendedCount++;
      else if (statusKey === "offer_accepted") offerAcceptedCount++;
      else if (statusKey === "offer_declined") offerDeclinedCount++;
    }

    return {
      all: baseList.length,
      offer_extended: offerExtendedCount,
      offer_accepted: offerAcceptedCount,
      offer_declined: offerDeclinedCount,
    };
  }, [approvedApplications, selectedApprovedJobId]);

  const filteredApprovedApplications = useMemo(() => {
    let list = approvedApplications;
    if (selectedApprovedJobId !== "all") {
      list = list.filter((app) => Number(app.job_post_id) === Number(selectedApprovedJobId));
    }
    if (selectedLetterStatus !== "all") {
      list = list.filter((app) => getCandidateLetterStatus(app).statusKey === selectedLetterStatus);
    }
    return list;
  }, [approvedApplications, selectedApprovedJobId, selectedLetterStatus]);

  const openCandidateDetails = (candidate: any) => {
    setDetailsModalCandidate({
      ...candidate,
      id: candidate.user_id || candidate.applicant_user_id || candidate.id,
      user_id: candidate.user_id || candidate.applicant_user_id || candidate.id,
      applicant_user_id: candidate.user_id || candidate.applicant_user_id || candidate.id,
      applicant_name:
        candidate.applicant_name ||
        (candidate.first_name ? `${candidate.first_name} ${candidate.last_name || ""}`.trim() : "Candidate"),
      job_title: candidate.job_title || candidate.desired_job_title,
      profile_picture_path: candidate.profile_picture_path,
      city: candidate.city,
      province: candidate.province,
      skills: candidate.skills,
      qualifications: candidate.qualifications,
      certifications: candidate.certifications,
    });
    setIsDetailsModalOpen(true);
  };

  const getTabBadgeCount = (tabId: string) => {
    if (tabId === "section-insights" || tabId === "section-postings") return summary.activeJobPosts.length;
    if (tabId === "section-smart-matches") return talentMatches.filter((c) => (c.matchScore || 0) >= 50).length;
    if (tabId === "section-approved-interviews") return approvedApplications.length;
    return 0;
  };

  const activeTabObj = WORKSPACE_TABS.find((t) => t.id === activeSection) || WORKSPACE_TABS[0];

  return (
    <div className={`appdash-page employer-page ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
      <aside className="appdash-sidebar" aria-label="Employer Navigation">
        <div className="appdash-brand">
          <a href="/" className="appdash-brand-link">
            <strong>EliteCruit</strong>
            <span>Employer Workspace</span>
          </a>
          <button
            type="button"
            className="appdash-sidebar-toggle"
            aria-label="Close sidebar menu"
            onClick={() => setIsSidebarVisible(false)}
          >
            <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>☰</span>
          </button>
        </div>

        <div className="employer-links-wrap">
          <ul className="appdash-secondary-list">
            <li className="active"><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
            <li className="employer-screening-item">
              <a
                href="/employer-applicant-management"
                className="employer-screening-title"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest(".title-caret-btn")) {
                    e.preventDefault();
                    setIsScreeningOpen((prev) => !prev);
                  }
                }}
              >
                <span className="title-main">
                  <span className="item-icon"><EmployerIcon name="applicant" /></span>
                  <span>Applicant Management</span>
                </span>
                <span className="title-caret-btn" title="Toggle sub-menu">
                  <ChevronIcon direction={isScreeningOpen ? "down" : "up"} />
                </span>
              </a>

              {isScreeningOpen && (
                <ul className="appdash-menu-list">
                  <li><a href="/employer-applicant-management#applicant-screening"><span className="item-icon"><EmployerIcon name="screening" /></span><span>Applicant Screening</span></a></li>
                  <li><a href="/employer-applicant-management#shortlisted-candidates"><span className="item-icon"><EmployerIcon name="shortlisted" /></span><span>Shortlisted Candidates</span></a></li>
                  <li><a href="/employer-applicant-management#direct-invitations"><span className="item-icon"><EmployerIcon name="discovery" /></span><span>Recruitment List</span></a></li>
                </ul>
              )}
            </li>
            <li><a href="/employer-applicant-finder"><span className="item-icon"><EmployerIcon name="nearby" /></span><span>Applicant Finder</span></a></li>
            <li><a href="/employer-notices-faqs"><span className="item-icon"><EmployerIcon name="faq" /></span><span>Notices & FAQs</span></a></li>
            <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
            <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span>{unreadNotifCount > 0 && <span className="item-badge">{unreadNotifCount}</span>}</a></li>
            <li><a href="/feedback"><span className="item-icon"><EmployerIcon name="feedback" /></span><span>Feedback</span></a></li>
          </ul>
        </div>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)}>
            <span className="item-icon"><EmployerIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{companyLabel}</strong><small>Employer</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && (
            <div className="appdash-profile-menu">
              <a href="/employer-company-profile"><EmployerIcon name="profile" />Company Profile</a>
              <a href="/settings"><SideIcon name="settings" />Settings</a>
              <button
                type="button"
                className="appdash-profile-menu-btn"
                onClick={() => setIsLogoutModalOpen(true)}
              >
                <EmployerIcon name="logout" />Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="appdash-main employer-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <button
              type="button"
              className="appdash-mobile-nav-toggle"
              aria-label={isSidebarVisible ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setIsSidebarVisible((prev) => !prev)}
            >
              <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>☰</span>
            </button>
            <div><strong>Employer Workspace</strong></div>
          </div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Employer Dashboard"
                customFaqs={dashboardFaqs}
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        {profileMessage && <p className="profile-message">{profileMessage}</p>}

        {/* ── 3-SECTION NAVIGATION TABS (Postings & Inflow, Smart Matches, Approved & Interviews) ── */}
        <div className="dash-nav-container">
          {/* Desktop Tab Row (Hidden on mobile <= 768px) */}
          <nav className="profile-section-nav dash-section-nav dash-desktop-tabs" aria-label="Workspace Sections">
            {WORKSPACE_TABS.map((tab) => {
              const count = getTabBadgeCount(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`section-nav-btn ${activeSection === tab.id ? "active" : ""}`}
                  onClick={() => handleSectionClick(tab.id)}
                >
                  <span className="nav-num">{tab.num}</span>
                  <span className="nav-label">{tab.label}</span>
                  {count > 0 && <span className="tab-count-pill">{count}</span>}
                </button>
              );
            })}
          </nav>

          {/* Mobile Switcher (Visible on mobile <= 768px) */}
          <div className="dash-mobile-switcher">
            <button
              type="button"
              className="dash-mobile-switcher-btn"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              aria-expanded={isMobileNavOpen}
              aria-label="Toggle section menu"
            >
              <span className="dash-mobile-switcher-curr">
                <span className="nav-num">{activeTabObj.num}</span>
                <strong>{activeTabObj.label}</strong>
              </span>
              <ChevronIcon direction={isMobileNavOpen ? "up" : "down"} />
            </button>

            {isMobileNavOpen && (
              <div className="dash-mobile-dropdown">
                {WORKSPACE_TABS.map((tab) => {
                  const count = getTabBadgeCount(tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`dash-mobile-option ${activeSection === tab.id ? "active" : ""}`}
                      onClick={() => handleSectionClick(tab.id)}
                    >
                      <span className="dash-mobile-opt-title">
                        <span className="nav-num">{tab.num}</span>
                        <span>{tab.label}</span>
                      </span>
                      {count > 0 && <span className="tab-count-pill">{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: RECRUITMENT INSIGHTS & HIRING FUNNEL
           ══════════════════════════════════════════════════════════════════ */}
        {activeSection === "section-insights" && (
          <div className="section-anchor" id="section-insights">
            {/* VISUAL HIRING FUNNEL CONVERSION CHART */}
            <article className="employer-block hiring-funnel-card" style={{ margin: "16px 28px 16px" }}>
              <header>
                <div>
                  <h2>Visual Hiring Funnel</h2>
                  <small className="block-sub-text">Stage-by-stage candidate conversion rates across your open jobs</small>
                </div>
                <span className="funnel-summary-badge">
                  Hiring Conversion: <strong>{funnelData.hiredConv}%</strong>
                </span>
              </header>

              <div className="funnel-steps-container">
                <div className="funnel-step-item step-applied">
                  <div className="funnel-step-top">
                    <span className="funnel-step-icon" title="Initial candidate applications">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <polyline points="9 15 12 18 15 15" />
                      </svg>
                    </span>
                    <span className="funnel-step-conv" title="Stage baseline volume">100% Volume</span>
                  </div>
                  <strong className="funnel-step-number">{funnelData.applied}</strong>
                  <span className="funnel-step-label">Applied</span>
                  <div className="funnel-bar-track">
                    <div className="funnel-bar-fill" style={{ width: "100%" }} />
                  </div>
                </div>

                <span className="funnel-arrow">→</span>

                <div className="funnel-step-item step-screened">
                  <div className="funnel-step-top">
                    <span className="funnel-step-icon" title="Candidates reviewed and screened">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <path d="m8 11 2 2 4-4" />
                      </svg>
                    </span>
                    <span className="funnel-step-conv" title="Percentage of applicants screened through">{funnelData.screenedConv}% Conversion</span>
                  </div>
                  <strong className="funnel-step-number">{funnelData.screened}</strong>
                  <span className="funnel-step-label">Screened</span>
                  <div className="funnel-bar-track">
                    <div className="funnel-bar-fill" style={{ width: `${Math.max(8, funnelData.screenedConv)}%` }} />
                  </div>
                </div>

                <span className="funnel-arrow">→</span>

                <div className="funnel-step-item step-interviewed">
                  <div className="funnel-step-top">
                    <span className="funnel-step-icon" title="Candidates scheduled for interview">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <path d="m9 16 2 2 4-4" />
                      </svg>
                    </span>
                    <span className="funnel-step-conv" title="Percentage of applicants reaching interview">{funnelData.interviewConv}% Conversion</span>
                  </div>
                  <strong className="funnel-step-number">{funnelData.interviewed}</strong>
                  <span className="funnel-step-label">Interviewed</span>
                  <div className="funnel-bar-track">
                    <div className="funnel-bar-fill" style={{ width: `${Math.max(8, funnelData.interviewConv)}%` }} />
                  </div>
                </div>

                <span className="funnel-arrow">→</span>

                <div className="funnel-step-item step-hired">
                  <div className="funnel-step-top">
                    <span className="funnel-step-icon" title="Candidates approved and hired">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </span>
                    <span className="funnel-step-conv" title="Overall hiring conversion rate">{funnelData.hiredConv}% Conversion</span>
                  </div>
                  <strong className="funnel-step-number">{funnelData.hired}</strong>
                  <span className="funnel-step-label">Offers & Hired</span>
                  <div className="funnel-bar-track">
                    <div className="funnel-bar-fill" style={{ width: `${Math.max(8, funnelData.hiredConv)}%` }} />
                  </div>
                </div>
              </div>
            </article>

            {/* TOP PERFORMING JOB POSTS */}
            <article className="employer-block top-jobs-block" style={{ margin: "0 28px 24px" }}>
              <header>
                <div>
                  <h2>Top Performing Job Posts</h2>
                  <small className="block-sub-text">Ranked by applicant demand & hiring velocity</small>
                </div>
                <a href="/employer-job-posts/create" className="post-job-action-btn">Post New Job +</a>
              </header>

              {sortedJobPosts.length === 0 ? (
                <div className="job-post-row">
                  <div>
                    <strong>No active posts yet.</strong>
                    <small>Publish job vacancies to start tracking recruitment interest.</small>
                  </div>
                </div>
              ) : (
                <div className="top-jobs-grid">
                  {sortedJobPosts.slice(0, 6).map((job, idx) => {
                    const count = job.applicant_count || 0;
                    const badgeClass = count >= 3 ? "high" : count > 0 ? "active" : "low";
                    const badgeInfo = count >= 3
                      ? {
                          label: "High Inflow",
                          tooltip: "High applicant demand (3+ candidates received)",
                          icon: (
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M12 23c-4.97 0-9-3.96-9-8.83 0-3.32 1.84-6.3 4.8-7.77.34-.17.75-.02.92.32.17.34.02.75-.32.92-2.4 1.2-3.9 3.63-3.9 6.33 0 3.97 3.36 7.2 7.5 7.2 4.14 0 7.5-3.23 7.5-7.2 0-2.31-1.12-4.43-3-5.78-.3-.21-.37-.62-.16-.92.21-.3.62-.37.92-.16 2.32 1.66 3.74 4.29 3.74 7.16 0 4.87-4.03 8.83-9 8.83Zm.28-7.98c-1.28 0-2.32-1.01-2.32-2.26 0-.8.44-1.54 1.15-1.92.33-.18.74-.06.92.27.18.33.06.74-.27.92-.35.19-.57.56-.57.96 0 .57.48 1.03 1.09 1.03.6 0 1.08-.46 1.08-1.03 0-.32-.14-.62-.38-.82-.29-.24-.33-.67-.1-1 .24-.29.67-.33 1-.1.49.4.78 1 .78 1.64 0 1.25-1.05 2.26-2.33 2.26Z" />
                            </svg>
                          ),
                        }
                      : count > 0
                      ? {
                          label: "Active Inflow",
                          tooltip: "Steady applicant flow received",
                          icon: (
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.08-.14 1.33-2.33 3.48-6.1 6.8-11.2h1l-1 7h4.5c.47 0 .54.34.42.59l-.08.17-6.84 11.24Z" />
                            </svg>
                          ),
                        }
                      : {
                          label: "Low Inflow",
                          tooltip: "No recent applicants; vacancy may need promotion",
                          icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          ),
                        };
                    const maxCount = Math.max(sortedJobPosts[0]?.applicant_count || 1, 4);
                    const fillPct = Math.min(100, Math.max(12, Math.round((count / maxCount) * 100)));

                    return (
                      <div className="top-job-item" key={job.id}>
                        <div className="top-job-header">
                          <div className="top-job-title-col">
                            <span className="top-job-rank">#{idx + 1}</span>
                            <div>
                              <strong className="top-job-name" title={job.title}>{job.title}</strong>
                              <div className="job-post-location">
                                <RenderLocationMeta location={job.location} />
                              </div>
                            </div>
                          </div>
                          <span className={`inflow-badge ${badgeClass}`} title={badgeInfo.tooltip}>
                            {badgeInfo.icon}
                            <span>{badgeInfo.label}</span>
                          </span>
                        </div>

                        <div className="top-job-velocity-row">
                          <div className="velocity-bar-track">
                            <div className={`velocity-bar-fill ${badgeClass}`} style={{ width: `${fillPct}%` }} />
                          </div>
                          <span className="velocity-count-text">
                            <strong>{count}</strong> {count === 1 ? "applicant" : "applicants"}
                          </span>
                        </div>

                        <div className="top-job-footer">
                          <span className="status-green">{job.status || "open"}</span>
                          <a href={`/employer-applicant-management?jobId=${job.id}`} className="view-applicants-btn">
                            View Candidates →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: SMART MATCHES
           ══════════════════════════════════════════════════════════════════ */}
        {activeSection === "section-smart-matches" && (
          <section className="matches-card section-anchor" id="section-smart-matches" style={{ margin: "16px 28px 24px" }}>
            <div className="matches-head">
              <div>
                <small className="matches-head-eyebrow">AI-POWERED CANDIDATE DISCOVERY</small>
                <h2>Smart Candidate Matches</h2>
                <p>Top nearby candidates in Cavite automatically matched against your active vacancies by skills, qualifications, and location.</p>
              </div>
              <a href="/employer-applicant-finder" className="matches-head-action-btn">
                <span>Explore on Map (Applicant Finder)</span>
                <span className="action-arrow">→</span>
              </a>
            </div>

            {/* VACANCY EVALUATION SELECTOR */}
            {summary.activeJobPosts.length > 0 && (
              <div className="smart-matches-head-bar">
                <div className="smart-matches-job-selector">
                  <span className="selector-label">Evaluating Candidates for:</span>
                  <select
                    value={selectedEvalJobId || ""}
                    onChange={(e) => setSelectedEvalJobId(e.target.value ? Number(e.target.value) : null)}
                  >
                    {summary.activeJobPosts.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} ({job.applicant_count || 0} applicants)
                      </option>
                    ))}
                  </select>
                </div>
                <span className="talent-pool-count-label">
                  Showing top matches from <strong>{talentPool.length}</strong> available candidates in Cavite
                </span>
              </div>
            )}

            {/* CANDIDATE MATCHES LIST */}
            {talentMatches.length === 0 ? (
              <article className="result-card empty-state">
                <div className="empty-roster-box">
                  <strong>No candidate recommendations yet.</strong>
                  <p>Publish active job posts with required skills to see matched local candidates.</p>
                  <a href="/employer-job-posts/create" className="dash-text-link-btn">Post a Job Vacancy →</a>
                </div>
              </article>
            ) : (
              <div className="talent-matches-list">
                {talentMatches.slice(0, 8).map((cand) => {
                  const score = cand.matchScore || 0;
                  const skillsList = parseCompetencyDisplayTags(cand.skills || "");
                  const picUrl = cand.profile_picture_path
                    ? (cand.profile_picture_path.startsWith("http") || cand.profile_picture_path.startsWith("/api")
                        ? cand.profile_picture_path
                        : `/api/applicants/${cand.user_id}/profile-picture`)
                    : null;

                  return (
                    <article className="talent-match-card" key={cand.user_id}>
                      <div className="talent-match-left">
                        <div className="talent-match-avatar">
                          {picUrl ? (
                            <img
                              src={picUrl}
                              alt={cand.applicant_name || "Candidate"}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span>{initialsFromName(cand.applicant_name || cand.first_name)}</span>
                          )}
                        </div>

                        <div className="talent-match-info">
                          <div className="talent-match-name-row">
                            <strong className="talent-match-name">
                              {cand.applicant_name || `${cand.first_name || ""} ${cand.last_name || ""}`.trim() || "Candidate"}
                            </strong>
                            <span className={`talent-match-badge ${score >= 75 ? "rec" : "good"}`}>
                              {score >= 75 ? "★ Recommended" : "Good Fit"} ({score}%)
                            </span>
                            {targetJobForEval && (
                              <span className="talent-eval-job-pill">
                                Vacancy: {targetJobForEval.title}
                              </span>
                            )}
                          </div>

                          <div className="talent-match-meta">
                            <span>{cand.desired_job_title || "Open to Opportunities"}</span>
                            <span className="meta-dot">•</span>
                            <span>{cand.city || "Cavite"}</span>
                            {cand.work_arrangement && (
                              <>
                                <span className="meta-dot">•</span>
                                <span className="meta-pill">{cand.work_arrangement}</span>
                              </>
                            )}
                          </div>

                          {skillsList.length > 0 && (
                            <div className="talent-match-skills">
                              {skillsList.slice(0, 5).map((sk, idx) => (
                                <span key={idx} className="talent-skill-tag">{sk}</span>
                              ))}
                              {skillsList.length > 5 && (
                                <span className="talent-skill-tag more">+{skillsList.length - 5} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="talent-match-actions">
                        <button
                          type="button"
                          className="talent-btn-view"
                          onClick={() => openCandidateDetails(cand)}
                        >
                          View Profile
                        </button>
                        <a
                          href={`/employer-applicant-finder?candidateId=${cand.user_id}`}
                          className="talent-btn-invite"
                        >
                          Offer Job / Invite
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* DIRECT RECRUITMENT INVITATIONS TRACKER */}
            {directInvitations.length > 0 && (
              <div className="direct-invitations-tracker-card" style={{ marginTop: "24px" }}>
                <div className="section-subhead">
                  <h3>Recent Candidate Invitations</h3>
                  <a href="/employer-applicant-management#direct-invitations">View Recruitment List →</a>
                </div>
                <div className="direct-invitations-grid">
                  {directInvitations.slice(0, 4).map((inv) => (
                    <div className="direct-inv-row" key={inv.id}>
                      <div className="direct-inv-info">
                        <strong>{inv.applicant_name}</strong>
                        <span>Invited for: {inv.job_title}</span>
                        <small>{formatDate(inv.created_at)}</small>
                      </div>
                      <div className="direct-inv-status">
                        <span className={`status-chip ${(inv.status || "pending").toLowerCase()}`}>
                          {inv.status || "Pending"}
                        </span>
                        <a href="/messages" className="review-btn">Message</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: APPROVED CANDIDATES ROSTER
           ══════════════════════════════════════════════════════════════════ */}
        {activeSection === "section-approved-interviews" && (
          <section className="matches-card section-anchor" id="section-approved-interviews" style={{ margin: "16px 28px 24px" }}>
            <div className="matches-head">
              <div>
                <small className="matches-head-eyebrow">APPROVED TALENT & HIRES</small>
                <h2>Approved Candidates Roster</h2>
                <p>Master roster of all approved candidates across your vacancies, applicant profiles, and formal offer letters.</p>
              </div>
              <a
                href="/employer-applicant-management"
                className="matches-head-action-btn"
              >
                <span>Applicant Management</span>
                <span className="action-arrow">→</span>
              </a>
            </div>

            {/* VACANCY APPROVED SELECTOR BAR + 3-STATUS LETTER FILTER */}
            {availableApprovedJobs.length > 0 && (
              <div className="smart-matches-head-bar">
                <div className="smart-matches-job-selector">
                  <span className="selector-label">Job Vacancy:</span>
                  <select
                    className="approved-job-select"
                    value={selectedApprovedJobId}
                    onChange={(e) => setSelectedApprovedJobId(e.target.value === "all" ? "all" : Number(e.target.value))}
                  >
                    <option value="all">All Job Vacancies</option>
                    {availableApprovedJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="approved-letter-status-tabs" role="tablist" aria-label="Offer letter status filter">
                  <button
                    type="button"
                    className={`letter-status-tab ${selectedLetterStatus === "all" ? "active" : ""}`}
                    onClick={() => setSelectedLetterStatus("all")}
                    title="Show all approved candidates"
                  >
                    All <span className="tab-count">({approvedStatusCounts.all})</span>
                  </button>
                  <button
                    type="button"
                    className={`letter-status-tab tab-extended ${selectedLetterStatus === "offer_extended" ? "active" : ""}`}
                    onClick={() => setSelectedLetterStatus(selectedLetterStatus === "offer_extended" ? "all" : "offer_extended")}
                    title="Formal offer letter extended to candidate (awaiting response)"
                  >
                    <span className="status-indicator-dot dot-extended" />
                    Offer Extended <span className="tab-count">({approvedStatusCounts.offer_extended})</span>
                  </button>
                  <button
                    type="button"
                    className={`letter-status-tab tab-accepted ${selectedLetterStatus === "offer_accepted" ? "active" : ""}`}
                    onClick={() => setSelectedLetterStatus(selectedLetterStatus === "offer_accepted" ? "all" : "offer_accepted")}
                    title="Candidate accepted the formal offer letter"
                  >
                    <span className="status-indicator-dot dot-accepted" />
                    Offer Accepted <span className="tab-count">({approvedStatusCounts.offer_accepted})</span>
                  </button>
                  <button
                    type="button"
                    className={`letter-status-tab tab-declined ${selectedLetterStatus === "offer_declined" ? "active" : ""}`}
                    onClick={() => setSelectedLetterStatus(selectedLetterStatus === "offer_declined" ? "all" : "offer_declined")}
                    title="Candidate declined the formal offer letter"
                  >
                    <span className="status-indicator-dot dot-declined" />
                    Offer Declined <span className="tab-count">({approvedStatusCounts.offer_declined})</span>
                  </button>
                </div>
              </div>
            )}

            {filteredApprovedApplications.length === 0 ? (
              <article className="result-card empty-state" style={{ margin: "14px 0 6px" }}>
                <div className="empty-roster-box">
                  <strong>
                    {selectedLetterStatus !== "all"
                      ? `No candidates found with "${selectedLetterStatus === "offer_extended" ? "Offer Extended" : selectedLetterStatus === "offer_accepted" ? "Offer Accepted" : "Offer Declined"}" status.`
                      : selectedApprovedJobId === "all"
                      ? "No approved candidates yet."
                      : "No approved candidates for this job vacancy yet."}
                  </strong>
                  <p>
                    {selectedLetterStatus !== "all"
                      ? "Try selecting another status tab above or view all approved candidates."
                      : selectedApprovedJobId === "all"
                      ? "When you approve candidates or extend formal offers in Applicant Management, they will be tracked here in this master roster."
                      : "Select another job vacancy above or view all approved candidates."}
                  </p>
                  {selectedLetterStatus !== "all" ? (
                    <button
                      type="button"
                      className="dash-text-link-btn"
                      onClick={() => setSelectedLetterStatus("all")}
                    >
                      Show All Statuses →
                    </button>
                  ) : selectedApprovedJobId !== "all" ? (
                    <button
                      type="button"
                      className="dash-text-link-btn"
                      onClick={() => setSelectedApprovedJobId("all")}
                    >
                      Show All Vacancies →
                    </button>
                  ) : (
                    <a href="/employer-applicant-management" className="dash-text-link-btn">
                      Go to Applicant Management →
                    </a>
                  )}
                </div>
              </article>
            ) : (
              <div className="approved-candidates-list">
                {filteredApprovedApplications.map((app) => {
                  const letterStatus = getCandidateLetterStatus(app);
                  const picUrl = app.profile_picture_path
                    ? (app.profile_picture_path.startsWith("http") || app.profile_picture_path.startsWith("/api")
                        ? app.profile_picture_path
                        : `/api/applicants/${app.applicant_user_id}/profile-picture`)
                    : null;
                  const skillsList = parseCompetencyDisplayTags(app.skills || "");
                  const locationText = app.city ? (app.city.toLowerCase().includes("cavite") ? app.city : `${app.city}, Cavite`) : (app.province || "Cavite");
                  const genderText = app.gender || "Applicant";
                  const workText = app.work_arrangement ? (app.work_arrangement.toLowerCase() === "onsite" ? "On-Site" : app.work_arrangement) : "On-Site";
                  const rawSalary = app.expected_salary != null ? String(app.expected_salary).replace(/^\$/, "₱ ") : null;
                  const salaryText = rawSalary
                    ? `Expected: ${typeof app.expected_salary === "number" ? `₱${app.expected_salary.toLocaleString()}` : rawSalary}`
                    : null;

                  return (
                    <article className="approved-applicant-card" key={app.id}>
                      <div className="approved-card-main">
                        {/* Left Column: Full-Square Profile Picture */}
                        <div
                          className="approved-avatar-box"
                          onClick={() => openCandidateDetails(app)}
                          title="Click to view candidate details"
                        >
                          {picUrl ? (
                            <img
                              src={picUrl}
                              alt={app.applicant_name || "Candidate"}
                              className="approved-avatar-img"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="approved-avatar-initials">{initialsFromName(app.applicant_name)}</span>
                          )}
                        </div>

                        {/* Center Column: Profile Info + Role + Meta Inline + Skills */}
                        <div className="approved-card-left">
                          <div className="approved-candidate-info">
                            <div className="approved-name-row">
                              <span className="approved-star-pill">
                                <span className="star-icon">★</span> {app.rating ? Number(app.rating).toFixed(1) : "0.0"}
                              </span>
                              <h3 className="approved-candidate-name">{app.applicant_name || "Candidate"}</h3>
                              <span className="approved-target-role-pill" title={`Vacancy: ${app.job_title || "Job Position"}`}>
                                {app.job_title || app.desired_job_title || "Applicant"}
                              </span>
                              <span className={`approved-status-pill ${letterStatus.badgeClass}`}>
                                {letterStatus.badgeLabel}
                              </span>
                            </div>

                            <div className="approved-candidate-meta-inline">
                              <span className="approved-meta-inline-item">
                                <svg className="mini-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M12 21s-6-4.35-6-9a6 6 0 1 1 12 0c0 4.65-6 9-6 9z" />
                                  <circle cx="12" cy="12" r="2.5" />
                                </svg>
                                <span>{locationText}</span>
                              </span>

                              <span className="approved-meta-inline-item">
                                <svg className="mini-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                                <span>{genderText}</span>
                              </span>

                              <span className="approved-meta-inline-item">
                                <svg className="mini-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                </svg>
                                <span>{workText}</span>
                              </span>

                              {salaryText ? (
                                <span className="approved-meta-inline-item">
                                  <svg className="mini-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M6 3h6a4.5 4.5 0 0 1 0 9H6V3z" />
                                    <line x1="6" y1="21" x2="6" y2="3" />
                                    <line x1="3" y1="7.5" x2="15" y2="7.5" />
                                    <line x1="3" y1="11.5" x2="15" y2="11.5" />
                                  </svg>
                                  <span>{salaryText}</span>
                                </span>
                              ) : (
                                <span className="approved-meta-inline-item">
                                  <svg className="mini-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  <span>Submitted: {formatDate(app.submitted_at)}</span>
                                </span>
                              )}
                            </div>

                            {/* Skills Row */}
                            {skillsList.length > 0 && (
                              <div className="approved-skills-row">
                                <span className="approved-skills-label">SKILLS:</span>
                                <div className="approved-skills-wrap">
                                  {skillsList.slice(0, 6).map((sk, idx) => (
                                    <span className="approved-skill-pill" key={idx}>
                                      {sk}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Actions Stack */}
                        <div className="approved-card-right">
                          <div className="approved-actions-stack">
                            <a
                              href="/messages"
                              className="approved-card-btn btn-message"
                            >
                              Message
                            </a>

                            <button
                              type="button"
                              className="approved-card-btn btn-details"
                              onClick={() => openCandidateDetails(app)}
                            >
                              Details
                            </button>

                            <button
                              type="button"
                              className={`approved-card-btn ${letterStatus.buttonClass}`}
                              onClick={() => {
                                setViewOfferLetterModal({
                                  candidateName: app.applicant_name,
                                  jobTitle: app.job_title,
                                  letterText: app.decision_message,
                                  status: app.status,
                                  responseDecision: app.response_decision,
                                  responseMessage: app.decision_message ? (app.response_message || app.response_letter) : null,
                                  responseDate: app.response_date || app.responded_at,
                                  proposedStartDate: app.proposed_start_date || app.start_date,
                                });
                              }}
                              title={
                                app.decision_message
                                  ? `Click to view ${letterStatus.buttonLabel} letter & details`
                                  : "Click to view application approval details"
                              }
                            >
                              {letterStatus.buttonLabel}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {isSidebarVisible && (
        <button
          type="button"
          className="appdash-backdrop"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      {/* ── APPLICANT DETAILS MODAL ── */}
      {isDetailsModalOpen && detailsModalCandidate && (
        <ApplicantDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setDetailsModalCandidate(null);
          }}
          candidate={detailsModalCandidate}
          employerJobs={summary.activeJobPosts.map((j) => ({ ...j, location: j.location || undefined }))}
          currentEmployerUserId={summary.activeJobPosts[0]?.employer_user_id}
        />
      )}

      {/* ── VIEW FORMAL OFFER LETTER MODAL (MATCHING MESSAGES DESIGN) ── */}
      {viewOfferLetterModal && (() => {
        const hasOffer = Boolean(viewOfferLetterModal.letterText && viewOfferLetterModal.letterText.trim());
        const isAcc = Boolean(
          (viewOfferLetterModal.responseDecision || "").toLowerCase().includes("accept") ||
          (viewOfferLetterModal.responseDecision || "").toLowerCase() === "approved" ||
          (hasOffer && (viewOfferLetterModal.status || "").toLowerCase() === "recruited")
        );
        const isDec = Boolean(
          (viewOfferLetterModal.responseDecision || "").toLowerCase().includes("decline") ||
          (viewOfferLetterModal.responseDecision || "").toLowerCase().includes("reject") ||
          (viewOfferLetterModal.responseDecision || "").toLowerCase() === "denied"
        );
        const hasResponse = hasOffer && (isAcc || isDec || Boolean(viewOfferLetterModal.responseMessage));

        const offerText = viewOfferLetterModal.letterText ||
          `This candidate's application has been officially approved.\n\nYou can create and extend an official formal employment offer letter with compensation details, proposed start date, and terms directly from the Applicant Management page.`;

        const responseText = viewOfferLetterModal.responseMessage || (isAcc
          ? `Dear ${companyLabel || "Hiring Team"},\n\nThank you for extending the offer for the position of "${viewOfferLetterModal.jobTitle}". I am pleased to accept your offer and excited to join the team.\n\nSincerely,\n${viewOfferLetterModal.candidateName}`
          : `Dear ${companyLabel || "Hiring Team"},\n\nThank you for considering me for the position of "${viewOfferLetterModal.jobTitle}". After careful consideration, I regret to inform you that I must decline this offer.\n\nSincerely,\n${viewOfferLetterModal.candidateName}`);

        return (
          <div className="view-letter-backdrop" onClick={() => setViewOfferLetterModal(null)}>
            <div className="view-letter-pair-row" onClick={(e) => e.stopPropagation()}>
              {/* ── CARD 1: FORMAL OFFER LETTER / APPROVAL RECORD ── */}
              <div className="view-letter-modal-card">
                <div className="view-letter-header">
                  <div>
                    <span className="view-letter-eyebrow">
                      {hasOffer ? "OFFICIAL CORRESPONDENCE" : "OFFICIAL APPLICATION RECORD"}
                    </span>
                    <h3 className="view-letter-title">{viewOfferLetterModal.jobTitle}</h3>
                    <p className="view-letter-company">Candidate: {viewOfferLetterModal.candidateName}</p>
                  </div>
                  <button
                    type="button"
                    className="view-letter-close-btn"
                    onClick={() => setViewOfferLetterModal(null)}
                    title="Close"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="view-letter-body-content">
                  <div className="view-letter-meta-row">
                    {hasOffer ? (
                      <span className={`view-letter-badge ${isAcc ? "accepted" : isDec ? "declined" : "extended"}`}>
                        {isAcc ? "Offer Accepted" : isDec ? "Offer Declined" : "Offer Extended"}
                      </span>
                    ) : (
                      <span className="view-letter-badge accepted">Application Approved</span>
                    )}
                    {viewOfferLetterModal.proposedStartDate && (
                      <span className="view-letter-start-date-tag">
                        Proposed Start Date: <strong>{viewOfferLetterModal.proposedStartDate}</strong>
                      </span>
                    )}
                  </div>

                  <div className={`view-letter-body-box ${hasOffer ? "view-letter-offer-box" : ""}`}>
                    <div className="view-letter-box-header">
                      <span className={`view-letter-box-label ${hasOffer ? "offer-label" : ""}`}>
                        {hasOffer
                          ? `EMPLOYMENT OFFER LETTER FROM ${companyLabel?.toUpperCase() || "EMPLOYER"}`
                          : "APPLICATION APPROVAL RECORD"}
                      </span>
                    </div>
                    <pre className="view-letter-pre-text">{offerText}</pre>
                  </div>
                </div>

                <div className="view-letter-footer">
                  {!hasOffer && (
                    <a
                      href="/employer-applicant-management"
                      className="view-letter-link-btn"
                    >
                      Manage in Applicant Management →
                    </a>
                  )}
                  <button
                    type="button"
                    className="view-letter-done-btn"
                    onClick={() => setViewOfferLetterModal(null)}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* ── CARD 2: CANDIDATE'S RESPONSE LETTER (When candidate responded) ── */}
              {hasResponse && (
                <div className="view-letter-modal-card view-letter-response-modal">
                  <div className="view-letter-header" style={{ alignItems: "center" }}>
                    <div>
                      <span className="view-letter-eyebrow">CANDIDATE RESPONSE</span>
                      <h3 className="view-letter-title" style={{ fontSize: "1.15rem" }}>
                        Response Letter ({isAcc ? "Accepted" : "Declined"})
                      </h3>
                      <p className="view-letter-company">From: {viewOfferLetterModal.candidateName}</p>
                    </div>
                    <button
                      type="button"
                      className="view-letter-close-btn"
                      onClick={() => setViewOfferLetterModal(null)}
                      title="Close"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="view-letter-body-content">
                    {viewOfferLetterModal.responseDate && (
                      <div className="view-letter-meta-row" style={{ marginBottom: "12px" }}>
                        <span className="view-letter-start-date-tag">
                          Submitted: {formatDate(viewOfferLetterModal.responseDate)}
                        </span>
                      </div>
                    )}

                    <div className="view-letter-body-box">
                      <div className="view-letter-box-header">
                        <span className="view-letter-box-label">
                          FORMAL RESPONSE LETTER FROM CANDIDATE
                        </span>
                      </div>
                      <pre className="view-letter-pre-text">{responseText}</pre>
                    </div>
                  </div>

                  <div className="view-letter-footer">
                    <button
                      type="button"
                      className="view-letter-done-btn"
                      onClick={() => setViewOfferLetterModal(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* DOUBLE VERIFICATION: LOGOUT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        type="warning"
        title="Log Out of EliteCruit"
        message="Are you sure you want to log out of your employer account?"
        cancelLabel="Stay Signed In"
        confirmLabel="Log Out"
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          localStorage.removeItem("elitecruit-user");
          window.location.href = "/";
        }}
      />
    </div>
  );
}
