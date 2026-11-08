import React, { useEffect, useMemo, useRef, useState } from "react";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import ApplicantDecisionModal from "../../components/ApplicantDecisionModal";
import {
  calculateJobMatch,
  calculateJobMatchDetails,
  getMatchColorClass,
  inferMatchScore,
  parseCompetencyDisplayTags,
  formatExperienceLevel,
  formatLocationWithCavite,
  parseLocations,
} from "../../utils/filters";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import { usePendingInvitationsCount } from "../../hooks/usePendingInvitationsCount";
import { JobDetailsModal, EmployerDetailsModal, type JobModalData } from "../../components/modals";
import "./Applicant-Dashboard.css";
import { SideIcon, ChevronIcon, type SideNavItem } from "../../components/Icons";


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
  companyLogoPath?: string | null;
  companyCoverPath?: string | null;
  rating?: string;
};

type ApplicantMatchProfile = {
  desiredJobTitle?: string;
  workArrangement?: string;
  expectedSalary?: number | null;
  city?: string;
  skills?: string[];
  qualifications?: string[];
  certifications?: string[];
  rawSkills?: string;
  rawCertifications?: string;
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
  hide_salary?: number | boolean | null;
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
  { label: "My Applications", value: "0", hint: "Active submissions", icon: "applications" },
  { label: "Direct Invitations", value: "0", hint: "Employer invites", icon: "notifications" },
  { label: "Smart Matches", value: "0", hint: "High compatibility", icon: "search" },
  { label: "Saved Jobs", value: "0", hint: "Bookmarked openings", icon: "star" },
];

const navWorkspace: SideNavItem[] = [
  { label: "Overview", icon: "overview", sectionId: "section-overview" },
  { label: "Smart Matches", icon: "star", sectionId: "section-smart-matches" },
  { label: "My Applications", icon: "applications", sectionId: "section-applications" },
  { label: "Job Invitations", icon: "notifications", sectionId: "section-invitations" },
];

const navGeneral: SideNavItem[] = [
  { label: "Job Search", icon: "search", href: "/job-search" },
  { label: "Offer Letters", icon: "documents", href: "/applicant-offer-letter" },
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

function RenderLocationMeta({ location }: { location?: string | null }) {
  const locItems = parseLocations(location);

  if (locItems.length === 0) {
    return (
      <span className="location-meta">
        <MiniIcon name="location" />
        <span>Cavite</span>
      </span>
    );
  }

  if (locItems.length === 1) {
    return (
      <span className="location-meta">
        <MiniIcon name="location" />
        <span>{locItems[0]}</span>
      </span>
    );
  }

  const fullListText = locItems.join(", ");

  return (
    <span className="location-meta">
      <MiniIcon name="location" />
      <span>{locItems[0]}</span>
      <span className="overflow-dots-badge" tabIndex={0} aria-label="View all locations">
        ...
        <span className="overflow-tooltip">
          <strong>Locations:</strong>
          <span>{fullListText}</span>
        </span>
      </span>
    </span>
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

function formatSalaryRange(minSalary: number | null, maxSalary: number | null, hideSalary?: boolean | number | null) {
  if (hideSalary) return "Salary Confidential";
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
  if (s === "interviewing" || s === "interview") return "chip-interviewing";
  if (s === "recruited") return "chip-recruited";
  if (s === "approved" || s === "accepted") return "chip-approved";
  if (s === "shortlisted") return "chip-shortlisted";
  if (s === "denied" || s === "declined" || s === "rejected" || s === "withdrawn") return "chip-denied chip-declined";
  return "chip-pending";
}

function statusChipClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "interviewing" || s === "interview") return "match-chip chip-amber";
  if (s === "recruited" || s === "approved" || s === "accepted") return "match-chip chip-green";
  if (s === "shortlisted") return "match-chip chip-amber";
  if (s === "denied" || s === "declined" || s === "rejected" || s === "withdrawn") return "match-chip chip-amber";
  return "match-chip chip-green";
}

function formatStatusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "interviewing" || s === "interview") return "Interviewing";
  if (s === "recruited") return "Recruited";
  if (s === "approved" || s === "accepted") return "Approved";
  if (s === "shortlisted") return "Shortlisted";
  if (s === "withdrawn") return "Withdrawn";
  if (s === "denied" || s === "declined" || s === "rejected") return "Declined";
  return "Pending";
}

function getApplicationTimelineSteps(app: any) {
  const status = (app?.status || "submitted").toLowerCase();
  const submittedDate = app?.submitted_at ? formatDate(app.submitted_at) : "Submitted";
  const decidedDate = app?.decided_at ? formatDate(app.decided_at) : (app?.responded_at ? formatDate(app.responded_at) : null);

  let interview = app?.scheduled_interview;
  if (!interview) {
    try {
      const rawInt = localStorage.getItem("elitecruit_scheduled_interviews");
      if (rawInt) {
        const list = JSON.parse(rawInt);
        if (Array.isArray(list)) {
          interview = list.find((it: any) =>
            (app.job_post_id && it.job_post_id && String(it.job_post_id) === String(app.job_post_id)) ||
            (app.job_title && it.job_title && it.job_title.toLowerCase() === app.job_title.toLowerCase()) ||
            (app.user_id && Array.isArray(it.candidate_user_ids) && it.candidate_user_ids.includes(app.user_id))
          );
        }
      }
    } catch {}
  }

  const isFinalDecision = ["approved", "accepted", "recruited", "denied", "rejected", "withdrawn"].includes(status);
  const isApproved = ["approved", "accepted", "recruited"].includes(status);
  const isDenied = ["denied", "rejected", "withdrawn"].includes(status);
  const isDirectRecruited = status === "recruited" || Boolean(app?.is_direct_invitation) || String(app?.origin || "").toLowerCase() === "invitation";

  // Check if candidate actually passed through shortlisted / interview stages
  const wasShortlisted = Boolean(app?.was_shortlisted) ||
    ["shortlisted", "interviewing", "interview"].includes(String(app?.previous_status || "").toLowerCase()) ||
    ["shortlisted", "interviewing", "interview"].includes(status);

  const hadInterview = Boolean(app?.had_interview) ||
    ["interviewing", "interview"].includes(String(app?.previous_status || "").toLowerCase()) ||
    ["interviewing", "interview"].includes(status) ||
    Boolean(interview) ||
    Boolean(app?.interview_date);

  const isInterviewStage = ["interviewing", "interview"].includes(status) || Boolean(interview);

  // Compute a clean chronological fallback interview date if one isn't explicitly saved
  const fallbackInterviewDate = app?.interview_date
    ? formatDate(app.interview_date)
    : (app?.submitted_at
      ? formatDate(new Date(new Date(app.submitted_at).getTime() + 86400000 * 3))
      : formatDate(new Date()));

  return [
    {
      title: isDirectRecruited ? "Direct Invitation Accepted" : "Application Submitted",
      description: isDirectRecruited
        ? "Accepted employer's direct recruitment invitation to join the candidate pool."
        : "Application and profile details submitted to employer.",
      timestamp: isDirectRecruited
        ? (app?.responded_at ? formatDate(app.responded_at) : submittedDate)
        : submittedDate,
      state: "completed" as const,
    },
    {
      title: "Candidate Screening & Shortlist",
      description: isDirectRecruited
        ? "Direct Recruitment Pathway — Initial screening waived by employer."
        : isFinalDecision && !wasShortlisted
        ? (isDenied ? "Stage bypassed — Application concluded during initial review." : "Stage bypassed — Employer opted for immediate direct hiring decision.")
        : wasShortlisted
        ? "Profile screened and candidate shortlisted by recruitment team."
        : (status === "under_review" || status === "reviewed")
        ? "Application is under active candidate screening."
        : "Pending initial profile review by hiring manager.",
      timestamp: isDirectRecruited
        ? "Bypassed"
        : wasShortlisted
        ? (app?.updated_at ? formatDate(app.updated_at) : "Completed")
        : isFinalDecision
        ? "Bypassed"
        : null,
      state: isDirectRecruited || (isFinalDecision && !wasShortlisted)
        ? ("bypassed" as const)
        : wasShortlisted
        ? ("completed" as const)
        : ("active" as const),
    },
    {
      title: "Interviewing",
      description: isDirectRecruited
        ? "Direct Recruitment Pathway — Preliminary interviews waived by employer for direct talent pool recruitment."
        : isFinalDecision && !hadInterview
        ? (isDenied ? "Stage bypassed — Application concluded prior to interview stage." : "Stage bypassed — Interview evaluation was waived by employer for direct decision.")
        : interview
        ? `${interview.interview_stage || "Technical Interview"} (${interview.interview_type || "On-Site"})${interview.interview_date ? ` scheduled for ${interview.interview_date} ${interview.start_time ? `at ${interview.start_time}` : ""}` : ""}`
        : hadInterview && isFinalDecision
        ? "Technical & competency interview conducted with hiring manager."
        : isInterviewStage
        ? "Candidate advanced to active interview evaluation stage."
        : wasShortlisted
        ? "Candidate shortlisted. Awaiting interview schedule or hiring update."
        : "Awaiting interview invitation from hiring team.",
      timestamp: isDirectRecruited
        ? "Bypassed"
        : interview?.interview_date
        ? formatDate(interview.interview_date)
        : (hadInterview && isFinalDecision)
        ? fallbackInterviewDate
        : isFinalDecision && !hadInterview
        ? "Bypassed"
        : null,
      state: isDirectRecruited || (isFinalDecision && !hadInterview)
        ? ("bypassed" as const)
        : isFinalDecision && hadInterview
        ? ("completed" as const)
        : isInterviewStage
        ? ("active" as const)
        : ("upcoming" as const),
    },
    {
      title: status === "withdrawn"
        ? "Application Withdrawn"
        : status === "denied" || status === "rejected"
        ? "Application Declined"
        : status === "recruited"
        ? "Candidate Recruited"
        : status === "accepted"
        ? (Boolean(app?.offer_letter || app?.decision_message_type === "formal_offer" || app?.response_letter) ? "Formal Offer Accepted" : "Application Accepted")
        : status === "approved"
        ? (Boolean(app?.offer_letter || app?.decision_message_type === "formal_offer" || ["offered", "offer_extended"].includes(status)) ? "Formal Offer Extended" : "Application Approved")
        : status === "shortlisted"
        ? "Final Hiring Decision"
        : "Final Hiring Decision",
      description: status === "withdrawn"
        ? "You have withdrawn your application for this position."
        : status === "denied" || status === "rejected"
        ? (app?.decision_message
          ? "Application declined. Hiring team reviewed your application and chose to proceed with other candidates."
          : "Employer decided to pursue other applicants for this role.")
        : status === "recruited"
        ? "Congratulations! You have been successfully recruited for this role."
        : status === "accepted"
        ? "Offer accepted! Onboarding details will be communicated shortly."
        : status === "approved"
        ? (Boolean(app?.offer_letter || app?.decision_message_type === "formal_offer" || ["offered", "offer_extended"].includes(status))
          ? "Offer extended! Please review and respond to the formal offer letter."
          : "Your application has been approved by the hiring team. Awaiting official offer letter or onboarding schedule.")
        : status === "shortlisted"
        ? "Profile shortlisted. Pending final hiring review and employer decision."
        : "Pending final review and formal employment offer.",
      timestamp: decidedDate,
      state: isFinalDecision
        ? (isDenied ? ("concluded" as const) : ("completed" as const))
        : ("upcoming" as const),
    },
  ];
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ApplicationCardTimeline({
  app,
  onOpenTimeline,
}: {
  app: any;
  onOpenTimeline: () => void;
}) {
  const steps = getApplicationTimelineSteps(app);
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
  const status = (app?.status || "submitted").toLowerCase();

  // Compute progress line width (3 intervals between 4 steps: 0%, 33.33%, 66.66%, 100%)
  const lastCompletedIndex = steps.reduce(
    (max, s, idx) => (s.state === "completed" ? idx : max),
    -1
  );
  const activeIndex = steps.findIndex((s) => s.state === "active");
  const isFinalDecision = ["approved", "accepted", "recruited", "denied", "rejected", "withdrawn"].includes(status);
  const isDenied = ["denied", "rejected", "withdrawn"].includes(status);

  let progressPct = 0;
  if (isFinalDecision || lastCompletedIndex === 3) {
    progressPct = 100;
  } else if (status === "interviewing" || status === "interview" || activeIndex === 2) {
    progressPct = 66.67;
  } else if (status === "shortlisted" || (lastCompletedIndex === 1 && activeIndex === -1)) {
    progressPct = 33.33;
  } else if (activeIndex === 1) {
    progressPct = 16.67;
  } else if (lastCompletedIndex >= 0) {
    progressPct = Math.min(100, Math.max(0, (lastCompletedIndex / 3) * 100));
  }

  return (
    <div className="card-timeline-wrapper">
      <div className="card-timeline-badge-row">
        <span className={`status-badge-chip ${statusChipBadgeClass(app.status)}`}>
          {formatStatusLabel(app.status)}
        </span>
      </div>

      <div
        className="card-timeline-track"
        onClick={onOpenTimeline}
        title="Click to view detailed milestone timeline"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenTimeline();
          }
        }}
      >
        <div className="card-timeline-line-bg" />
        <div
          className={`card-timeline-line-fill ${isDenied ? "is-denied" : ""}`}
          style={{ width: `${progressPct}%` }}
        />

        <div className="card-timeline-nodes-row">
          {steps.map((step, idx) => {
            const isCompleted = step.state === "completed";
            const isActive = step.state === "active";
            const isConcluded = step.state === "concluded";
            const isBypassed = step.state === "bypassed";
            const isHovered = hoveredStepIndex === idx;

            return (
              <div
                key={idx}
                className={`card-timeline-node ${step.state} ${isHovered ? "is-hovered" : ""}`}
                onMouseEnter={() => setHoveredStepIndex(idx)}
                onMouseLeave={() => setHoveredStepIndex(null)}
              >
                <div className={`card-timeline-circle ${step.state}`}>
                  {isCompleted && (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {isConcluded && (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                  {isBypassed && (
                    <span className="card-timeline-bypassed-dash" title="Stage Bypassed">—</span>
                  )}
                  {isActive && <span className="card-timeline-pulse-core" />}
                  {!isCompleted && !isConcluded && !isActive && !isBypassed && <span className="card-timeline-dot-core" />}
                </div>

                {/* Floating Information Tooltip: ONLY shows on hover */}
                {isHovered && (
                  <div className="card-timeline-popover" onClick={(e) => e.stopPropagation()}>
                    <div className="popover-arrow" />
                    <div className="popover-header">
                      <span className="popover-title">{step.title}</span>
                      {step.timestamp && <span className="popover-date">{step.timestamp}</span>}
                    </div>
                    {step.description && <p className="popover-desc">{step.description}</p>}
                    <div className="popover-status-badge">
                      <span className={`popover-pill ${step.state}`}>
                        {isCompleted
                          ? "Completed"
                          : isConcluded
                          ? (isDenied ? "Declined" : "Concluded")
                          : isBypassed
                          ? "Bypassed"
                          : isActive
                          ? "Current Stage"
                          : "Upcoming"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { SideIcon, ChevronIcon } from "../../components/Icons";

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

const WORKSPACE_TABS = [
  { id: "section-smart-matches", label: "Smart Matches" },
  { id: "section-applications", label: "My Applications" },
  { id: "section-invitations", label: "Job Invitations" },
] as const;

export default function ApplicantDashboard() {
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const pendingInvitesCount = usePendingInvitationsCount();
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return false;
    }
    return true;
  });
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const h = window.location.hash.replace("#", "");
      if (["section-smart-matches", "section-applications", "section-invitations"].includes(h)) {
        return h;
      }
    }
    return "section-smart-matches";
  });
  const [applicantLabel, setApplicantLabel] = useState(getInitialApplicantName);
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
  const [reviewingInv, setReviewingInv] = useState<JobInvitationItem | null>(null);
  const [applicantMatchProfile, setApplicantMatchProfile] = useState<ApplicantMatchProfile | null>(null);
  const [selectedEmployerDetails, setSelectedEmployerDetails] = useState<any>(null);

  const handleOpenEmployerDetails = async (empUserId: number | string) => {
    try {
      const res = await fetch(`/api/employers/${empUserId}/profile`);
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          setSelectedEmployerDetails({
            ...data.profile,
            employer_user_id: empUserId,
            company_name: data.profile.business_name || data.profile.company_name,
            company_description: data.profile.company_description || data.profile.description,
            contact_number: data.profile.contact_number || data.profile.phone,
            business_email: data.profile.business_email || data.profile.email,
            company_address: data.profile.company_address || data.profile.location,
            rating: data.profile.rating || detailsJob?.rating,
          });
          return;
        }
      }
    } catch {}

    if (detailsJob) {
      setSelectedEmployerDetails({
        employer_user_id: empUserId,
        company_name: detailsJob.company || "Employer",
        business_name: detailsJob.company || "Employer",
        company_description: detailsJob.summary || "Employer organization description.",
        company_address: detailsJob.location || "Cavite",
        address: detailsJob.location || "Cavite",
        rating: detailsJob.rating || "0.0",
        company_logo_path: detailsJob.companyLogoPath || null,
        company_cover_path: detailsJob.companyCoverPath || null,
      });
    }
  };

  const jobModalData: JobModalData | null = useMemo(() => {
    if (!detailsJob) return null;
    return {
      id: detailsJob.id,
      title: detailsJob.title,
      job_title: detailsJob.title,
      company: detailsJob.company,
      company_name: detailsJob.company,
      employerUserId: detailsJob.employerUserId,
      employer_user_id: detailsJob.employerUserId,
      companyLogoPath: detailsJob.companyLogoPath,
      company_logo_path: detailsJob.companyLogoPath,
      companyCoverPath: detailsJob.companyCoverPath,
      company_cover_path: detailsJob.companyCoverPath,
      location: detailsJob.location,
      company_address: detailsJob.location,
      rating: detailsJob.rating,
      status: detailsJob.status,
      urgent: detailsJob.urgent,
      is_urgent: detailsJob.urgent,
      setup: detailsJob.setup,
      work_arrangement: detailsJob.setup,
      experienceLevel: detailsJob.experienceLevel,
      experience_level: detailsJob.experienceLevel,
      salary: detailsJob.salary,
      salary_min: detailsJob.salaryMin,
      hide_salary: (detailsJob as any).hideSalary || (detailsJob as any).hide_salary,
      summary: detailsJob.summary,
      description: detailsJob.summary || detailsJob.responsibilities,
      skillTags: detailsJob.skillTags,
      qualTags: detailsJob.qualTags,
      certTags: detailsJob.certTags,
      applicantCount: detailsJob.applicantCount,
      closeDate: detailsJob.closeDate,
      close_date: detailsJob.closeDate,
      applicationLimit: detailsJob.applicationLimit,
    };
  }, [detailsJob]);

  // DOUBLE VERIFICATION MODAL STATES
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [decisionModalTarget, setDecisionModalTarget] = useState<{
    inv: JobInvitationItem;
    action: "accept" | "decline";
  } | null>(null);
  const [appDecisionModalTarget, setAppDecisionModalTarget] = useState<{
    app: any;
    action: "accept" | "decline";
  } | null>(null);
  const [viewLetterModalTarget, setViewLetterModalTarget] = useState<{
    title: string;
    company: string;
    letterText: string;
    startDate?: string;
    respondedAt?: string;
    decision?: string;
  } | null>(null);
  const [applyJobTarget, setApplyJobTarget] = useState<{ jobId: number; title: string } | null>(null);
  const [timelineModalApp, setTimelineModalApp] = useState<any | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "approved" | "denied">("all");
  const [withdrawTargetApp, setWithdrawTargetApp] = useState<any | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null);

  const previousApplications = useMemo(() => {
    return myApplicationsList.filter((app: any) => {
      const st = (app?.status || "").toLowerCase();
      return ["approved", "accepted", "recruited", "denied", "rejected", "withdrawn"].includes(st);
    });
  }, [myApplicationsList]);

  const approvedHistoryCount = useMemo(() => {
    return myApplicationsList.filter((app: any) => {
      const st = (app?.status || "").toLowerCase();
      return ["approved", "accepted", "recruited"].includes(st);
    }).length;
  }, [myApplicationsList]);

  const deniedHistoryCount = useMemo(() => {
    return myApplicationsList.filter((app: any) => {
      const st = (app?.status || "").toLowerCase();
      return ["denied", "rejected", "withdrawn"].includes(st);
    }).length;
  }, [myApplicationsList]);

  const filteredHistoryApplications = useMemo(() => {
    return myApplicationsList.filter((app: any) => {
      const st = (app?.status || "").toLowerCase();
      const isApproved = ["approved", "accepted", "recruited"].includes(st);
      const isDenied = ["denied", "rejected", "withdrawn"].includes(st);
      if (historyFilter === "approved") return isApproved;
      if (historyFilter === "denied") return isDenied;
      return true;
    });
  }, [myApplicationsList, historyFilter]);

  const handleConfirmWithdraw = async () => {
    if (!withdrawTargetApp) return;
    setIsWithdrawing(true);
    try {
      const savedUserRaw = localStorage.getItem("elitecruit-user");
      const token = localStorage.getItem("elitecruit-token");
      const savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;
      const userId = savedUser?.id || applicantUserId;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/applicants/${userId}/applications/${withdrawTargetApp.id}/withdraw`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (res.ok) {
        setMyApplicationsList((prev) =>
          prev.map((a) => (a.id === withdrawTargetApp.id ? { ...a, status: "withdrawn" } : a))
        );
        window.dispatchEvent(new CustomEvent("elitecruit_application_update"));
        setWithdrawMessage(data?.message || "Application withdrawn successfully.");
      } else {
        setWithdrawMessage(data?.message || "Failed to withdraw application.");
      }
    } catch {
      setWithdrawMessage("Network error: Unable to withdraw application.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleConfirmApply = async () => {
    if (!applyJobTarget) return;
    const targetId = applyJobTarget.jobId;
    setApplyJobTarget(null);
    await applyToJob(targetId);
  };

  const mainRef = useRef<HTMLElement | null>(null);

  const navItemsWithSection = useMemo(
    () => [...navWorkspace, ...navGeneral].filter((item): item is SideNavItem & { sectionId: string } => Boolean(item.sectionId)),
    []
  );

  const scrollToHashSection = () => {
    const hash = window.location.hash;
    if (!hash) {
      setActiveSection("section-smart-matches");
      return;
    }
    const sectionId = hash.replace("#", "");
    if (sectionId === "applicant-overview" || sectionId === "section-overview" || sectionId === "section-smart-matches") {
      setActiveSection("section-smart-matches");
      if (mainRef.current) mainRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    if (["section-applications", "section-invitations"].includes(sectionId)) {
      setActiveSection(sectionId);
      if (mainRef.current) mainRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
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

      const refreshApplications = () => {
        fetch(`/api/applicants/${savedUser.id}/applications`)
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data?.message || "Unable to load applications.");
            setMyApplicationsList(Array.isArray(data?.applications) ? data.applications : []);

            const ids = Array.isArray(data?.applications)
              ? data.applications
                  .map((item: any) => Number(item?.job_post_id))
                  .filter((id: number) => Number.isInteger(id) && id > 0)
              : [];
            setAppliedJobIds(ids);
          })
          .catch(() => {});
      };

      refreshApplications();
      window.addEventListener("elitecruit-interviews-updated", refreshApplications);
      window.addEventListener("elitecruit_interviews_update", refreshApplications);

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
            skills: parseCompetencyDisplayTags(profile?.skills, "skills"),
            qualifications: parseCompetencyDisplayTags(profile?.qualifications, "qualifications"),
            certifications: parseCompetencyDisplayTags(profile?.certifications, "certifications"),
            rawSkills: typeof profile?.skills === "string" ? profile?.skills : JSON.stringify(profile?.skills || []),
            rawCertifications: typeof profile?.certifications === "string" ? profile?.certifications : JSON.stringify(profile?.certifications || []),
          });
        })
        .catch(() => {});
    } catch {
      setApplicantLabel("Applicant");
    }
  }, []);

  const handleRespondInvitation = async (
    invitationId: number,
    action: "accept" | "decline",
    letter_text?: string,
    letter_type?: string,
    start_date?: string
  ) => {
    setIsRespondingInvId(invitationId);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, letter_text, letter_type, start_date }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvitationsList((prev) =>
          prev.map((inv) =>
            inv.id === invitationId
              ? {
                  ...inv,
                  status: data.status || (action === "accept" ? "accepted" : "declined"),
                  response_letter: letter_text || inv.response_letter,
                  start_date: start_date || inv.start_date,
                  responded_at: new Date().toISOString(),
                }
              : inv
          )
        );
        if (action === "accept" && applicantUserId) {
          fetch(`/api/applicants/${applicantUserId}/applications`)
            .then((r) => r.json())
            .then((d) => {
              setMyApplicationsList(Array.isArray(d?.applications) ? d.applications : []);
            })
            .catch(() => {});
        }
        window.dispatchEvent(new Event("elitecruit_invitation_update"));
      }
    } catch (err) {
      console.error("Error responding to invitation:", err);
    } finally {
      setIsRespondingInvId(null);
    }
  };

  const handleRespondApplication = async (
    applicationId: number,
    action: "accept" | "decline",
    letter_text?: string,
    letter_type?: string,
    start_date?: string
  ) => {
    if (!applicantUserId) return;
    try {
      const res = await fetch(`/api/applicants/${applicantUserId}/applications/${applicationId}/offer-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("elitecruit-token") || ""}`,
        },
        body: JSON.stringify({ decision: action, letter_text, letter_type, start_date }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit formal offer response.");
      }
      setMyApplicationsList((prev: any[]) =>
        prev.map((a: any) =>
          a.id === applicationId
            ? {
                ...a,
                status: action === "accept" ? "accepted" : "declined",
                response_letter: letter_text,
                response_decision: action,
                start_date: start_date || a.start_date,
                responded_at: new Date().toISOString(),
              }
            : a
        )
      );
      setAppDecisionModalTarget(null);
    } catch (err: any) {
      alert(err.message || "Error submitting formal offer response.");
    }
  };

  const handleReviewInvitation = (inv: JobInvitationItem) => {
    setReviewingInv(inv);
    const jobObj: JobCard = {
      id: Number(inv.job_post_id),
      title: inv.job_title || "Invited Role",
      company: inv.business_name || "Employer",
      location: inv.job_location || "Cavite",
      summary: inv.job_description || "No job description provided yet.",
      salary: formatSalaryRange(inv.salary_min ?? null, inv.salary_max ?? null, inv.hide_salary),
      salaryMin: Number(inv.salary_min) || 0,
      setup: inv.work_arrangement || "On-Site",
      status: inv.job_status === "closed" ? "closed" : "open",
      closeDate: inv.close_date || "-",
      applicationLimit: Number(inv.application_limit) || 10,
      applicantCount: 1,
      qualifications: inv.job_qualifications || "Not provided",
      certifications: (inv as any).certifications || (inv as any).job_certifications || "Not provided",
      responsibilities: "Not provided",
      skillTags: parseCompetencyDisplayTags(inv.required_skills),
      qualTags: parseCompetencyDisplayTags(inv.job_qualifications),
      certTags: parseCompetencyDisplayTags((inv as any).certifications || (inv as any).job_certifications),
      jobType: inv.work_arrangement === "Remote" ? "Remote" : "Full-time",
      functionGroup: "General",
      distance: "Cavite",
      badges: parseCompetencyDisplayTags(inv.required_skills),
      urgent: false,
      createdAt: inv.created_at,
      createdRank: 0,
      employerUserId: Number(inv.employer_user_id) || undefined,
      companyLogoPath: (inv as any).company_logo_path || null,
      companyCoverPath: (inv as any).company_cover_path || null,
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
          salary: formatSalaryRange(row.salary_min ?? null, row.salary_max ?? null, row.hide_salary),
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
          skillTags: parseCompetencyDisplayTags(row.required_skills, "skills"),
          qualTags: parseCompetencyDisplayTags(row.qualifications, "qualifications"),
          certTags: parseCompetencyDisplayTags(row.certifications, "certifications"),
          jobType: row.work_arrangement === "Remote" ? "Remote" : "Full-time",
          functionGroup: "General",
          distance: "Cavite",
          badges: parseCompetencyDisplayTags(row.required_skills, "skills"),
          urgent: Boolean(Number(row.is_urgent || 0)),
          createdAt: typeof row.created_at === "string" ? row.created_at : null,
          createdRank: index,
          employerUserId: Number(row.employer_user_id) || undefined,
          companyLogoPath: row.company_logo_path || null,
          companyCoverPath: row.company_cover_path || null,
          rating: row.rating ? String(row.rating) : "0.0",
        }));
        setJobs(mapped);
      })
      .catch(() => setJobs([]));
  }, []);

  const sortedSmartMatches = useMemo(() => {
    const unappliedJobs = jobs.filter((job) => !appliedJobIds.includes(job.id));
    return [...unappliedJobs].sort((a, b) => calculateJobMatch(b, applicantMatchProfile) - calculateJobMatch(a, applicantMatchProfile));
  }, [jobs, appliedJobIds, applicantMatchProfile]);

  const dashboardStats: StatCard[] = useMemo(() => [
    {
      label: "My Applications",
      value: String(myApplicationsList.length),
      hint: "Active submissions",
      icon: "applications",
    },
    {
      label: "Direct Invitations",
      value: String(invitationsList.length),
      hint: "Employer invites",
      icon: "notifications",
    },
    {
      label: "Smart Matches",
      value: String(sortedSmartMatches.filter((job) => calculateJobMatch(job, applicantMatchProfile) > 0).length),
      hint: "High compatibility",
      icon: "search",
    },
    {
      label: "Saved Jobs",
      value: String(bookmarkedIds.length),
      hint: "Bookmarked openings",
      icon: "star",
    },
  ], [myApplicationsList.length, invitationsList.length, sortedSmartMatches.length, bookmarkedIds.length]);

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
      salary: formatSalaryRange(app.salary_min ?? null, app.salary_max ?? null, app.hide_salary),
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
      companyLogoPath: app.company_logo_path || null,
      companyCoverPath: app.company_cover_path || null,
      rating: app.rating ? String(app.rating) : "0.0",
    };
    setDetailsJob(jobObj);
  };

  const handleTabClick = (sectionId: string) => {
    setActiveSection(sectionId);
    window.location.hash = sectionId;
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentTabIndex = WORKSPACE_TABS.findIndex((tab) => tab.id === activeSection);
  const safeTabIndex = currentTabIndex >= 0 ? currentTabIndex : 0;

  const getTabBadgeCount = (tabId: string) => {
    if (tabId === "section-smart-matches") return sortedSmartMatches.length;
    if (tabId === "section-applications") return myApplicationsList.length;
    if (tabId === "section-invitations") return invitationsList.length;
    return 0;
  };

  const handlePrevTab = () => {
    const prev = (safeTabIndex - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length;
    handleTabClick(WORKSPACE_TABS[prev].id);
  };

  const handleNextTab = () => {
    const next = (safeTabIndex + 1) % WORKSPACE_TABS.length;
    handleTabClick(WORKSPACE_TABS[next].id);
  };

  const handleSectionClick = (event: React.MouseEvent<HTMLAnchorElement>, sectionId?: string) => {
    if (!sectionId) return;
    event.preventDefault();
    handleTabClick(sectionId);
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setIsSidebarVisible(false);
    }
  };

  return (
    <div className={`appdash-page ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
      <aside className="appdash-sidebar" aria-label="Applicant Navigation">
        <div className="appdash-brand">
          <a href="/" className="appdash-brand-link">
            <strong>EliteCruit</strong>
            <span>Candidate Workspace</span>
          </a>
          <button
            type="button"
            className="appdash-sidebar-toggle"
            aria-label="Close sidebar menu"
            onClick={() => setIsSidebarVisible(false)}
          >
            <MenuIcon />
          </button>
        </div>

        <ul className="appdash-secondary-list">
          <li className="applicant-workspace-item active">
            <a
              href="/applicant-dashboard"
              className="applicant-workspace-title active"
              onClick={(e) => {
                e.preventDefault();
                setIsWorkspaceOpen((prev) => !prev);
              }}
            >
              <span className="title-main">
                <span className="item-icon">
                  <SideIcon name="overview" />
                </span>
                <span>Applicant Workspace</span>
                {pendingInvitesCount > 0 && (
                  <span className="item-badge" title={`${pendingInvitesCount} pending job invitation${pendingInvitesCount > 1 ? "s" : ""}`} style={{ marginLeft: "auto", marginRight: 8 }}>
                    {pendingInvitesCount}
                  </span>
                )}
              </span>
              <span className="title-caret-btn" title="Toggle sub-menu">
                <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
              </span>
            </a>

            {isWorkspaceOpen && (
              <ul id="workspace-links" className="appdash-menu-list">
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
                    {pendingInvitesCount > 0 && <span className="item-badge">{pendingInvitesCount}</span>}
                  </a>
                </li>
              </ul>
            )}
          </li>

          {navGeneral.map((item) => {
            const isNotif = item.label === "Notifications";
            const isMessages = item.label === "Messages";
            const badgeCount = isNotif
              ? (unreadNotifCount > 0 ? unreadNotifCount : null)
              : isMessages
              ? (unreadMessagesCount > 0 ? unreadMessagesCount : null)
              : item.badge;
            return (
              <li key={item.label} className={item.sectionId === activeSection ? "active" : ""}>
                <a href={item.href ?? (item.sectionId ? `#${item.sectionId}` : "#applicant-overview")} onClick={(event) => handleSectionClick(event, item.sectionId)}>
                  <span className="item-icon">
                    <SideIcon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                  {badgeCount ? <span className="item-badge">{badgeCount}</span> : null}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)} aria-expanded={isProfileMenuOpen}>
            <span className="item-icon"><SideIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{applicantLabel}</strong><small>Applicant</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && (
            <div className="appdash-profile-menu">
              <a href="/my-profile"><SideIcon name="profile" />My Profile</a>
            <a href="/settings">
              <SideIcon name="settings" />
              Settings
            </a>
              <button type="button" className="appdash-profile-menu-btn" onClick={() => setIsLogoutModalOpen(true)}>
                <SideIcon name="logout" />Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="appdash-main" id="applicant-overview" ref={mainRef}>
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <button
              type="button"
              className="appdash-mobile-nav-toggle"
              aria-label={isSidebarVisible ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setIsSidebarVisible((prev) => !prev)}
            >
              <MenuIcon />
            </button>
            <div>
              <strong>Applicant Workspace</strong>
            </div>
          </div>

          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <ApplicantChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Dashboard"
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        {/* 3-SECTION NAVIGATION TABS (Smart Matches, My Applications, Job Invitations) */}
        <div className="dash-nav-container">
          {/* Desktop Tab Row (Hidden on mobile screens <= 768px) */}
          <nav className="profile-section-nav dash-section-nav dash-desktop-tabs" aria-label="Workspace Sections">
            {WORKSPACE_TABS.map((tab) => {
              const count = getTabBadgeCount(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`section-nav-btn ${activeSection === tab.id ? "active" : ""}`}
                  onClick={() => handleTabClick(tab.id)}
                >
                  <span>{tab.label}</span>
                  {count > 0 && <span className="tab-count-pill">{count}</span>}
                </button>
              );
            })}
          </nav>

          {/* Mobile Single Item Switcher with Swap Arrows (Visible on mobile <= 768px) */}
          <div className="dash-mobile-switcher" aria-label="Workspace Sections">
            <button
              type="button"
              className="dash-switcher-btn prev"
              onClick={handlePrevTab}
              aria-label="Previous Section"
            >
              <ChevronIcon direction="left" />
            </button>
            <div className="dash-switcher-center">
              <span className="dash-switcher-title">
                {WORKSPACE_TABS[safeTabIndex].label}
                {getTabBadgeCount(WORKSPACE_TABS[safeTabIndex].id) > 0 && (
                  <span className="tab-count-pill">{getTabBadgeCount(WORKSPACE_TABS[safeTabIndex].id)}</span>
                )}
              </span>
              <div className="dash-switcher-dots" aria-hidden="true">
                {WORKSPACE_TABS.map((tab, idx) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`dash-switcher-dot ${idx === safeTabIndex ? "active" : ""}`}
                    onClick={() => handleTabClick(tab.id)}
                    aria-label={tab.label}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              className="dash-switcher-btn next"
              onClick={handleNextTab}
              aria-label="Next Section"
            >
              <ChevronIcon direction="right" />
            </button>
          </div>
        </div>

        {/* ── SECTION 1: SMART MATCHES ── */}
        {activeSection === "section-smart-matches" && (
        <section className="matches-card section-anchor" id="section-smart-matches">
          <div className="matches-head">
            <div>
              <small className="matches-head-eyebrow">AI-POWERED RECOMMENDATIONS</small>
              <h2>Smart Matches</h2>
              <p>Ranked by skills, qualifications, location, salary, and work arrangement compatibility.</p>
            </div>
            <a href="/job-search" className="matches-head-action-btn">
              <span>View All Jobs</span>
              <span className="action-arrow">→</span>
            </a>
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
            sortedSmartMatches.slice(0, 5).map((job) => (
              <article key={job.id} className="result-card">
                <div className="result-card-main">
                  <div className="result-left-col">
                    <div className="result-title-row">
                      <h3 title={job.title}>{job.title}</h3>
                    </div>
                    <p className="meta-line">
                      <span className="company-meta-with-rating">
                        <MiniIcon name="company" />
                        <strong>{job.company}</strong>
                        <span className="company-inline-rating-pill" title="Company rating">
                          <span className="star-icon">★</span>
                          <span>{job.rating ? Number(job.rating).toFixed(1) : "0.0"}</span>
                        </span>
                      </span>
                      <span className="meta-divider">•</span>
                      <RenderLocationMeta location={job.location} />
                    </p>
                    <p className="result-summary">{job.summary || "No job description provided yet."}</p>
                    <div className="result-tags">
                      <span className={`status-chip ${job.status === "open" ? "open" : "closed"}`}>{job.status === "open" ? "Open" : "Closed"}</span>
                      {job.urgent ? <span className="status-chip urgent">Urgent</span> : null}
                      <span className="setup-pill">{job.setup}</span>
                      {job.experienceLevel && <span className="exp-level-pill">{formatExperienceLevel(job.experienceLevel)}</span>}
                      {(() => {
                        const isHidden = Boolean(
                          (job as any).hideSalary ||
                          (job as any).hide_salary === 1 ||
                          (job as any).hide_salary === "1" ||
                          (job as any).hide_salary === true ||
                          (job as any).hide_salary === "true" ||
                          job.salary === "Salary Confidential"
                        );
                        if (isHidden) {
                          return <span className="salary-pill confidential">Salary Confidential</span>;
                        }
                        if (job.salary) {
                          return <span className="salary-pill">{job.salary}</span>;
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="result-right-col">
                    <div className="card-top-actions">
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
                      <button
                        type="button"
                        className={`solid-btn apply-right-btn ${appliedJobIds.includes(job.id) ? "applied-btn" : ""}`}
                        onClick={() => setApplyJobTarget({ jobId: job.id, title: job.title })}
                        disabled={appliedJobIds.includes(job.id) || applyingJobId === job.id}
                      >
                        {appliedJobIds.includes(job.id) ? "Applied" : applyingJobId === job.id ? "Applying..." : "Apply"}
                      </button>
                      <button
                        type="button"
                        className="bookmark-icon-btn"
                        aria-label={bookmarkedIds.includes(job.id) ? "Remove bookmark" : "Bookmark job"}
                        onClick={() => toggleBookmark(job.id)}
                      >
                        <MiniIcon name={bookmarkedIds.includes(job.id) ? "bookmarkFilled" : "bookmark"} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
        )}

        {/* ── SECTION 2: MY APPLICATIONS ── */}
        {activeSection === "section-applications" && (
        <section className="matches-card section-anchor" id="section-applications">
          <div className="matches-head">
            <div>
              <small className="matches-head-eyebrow">APPLICATION TRACKER</small>
              <h2>My Applications</h2>
              <p>Positions you have applied for and their real-time application status.</p>
            </div>
            <div className="matches-head-actions-group">
              <button
                type="button"
                className="app-history-btn"
                onClick={() => setIsHistoryModalOpen(true)}
                title="View previous applications history"
              >
                <span>History</span>
                {previousApplications.length > 0 && (
                  <span className="app-history-badge">{previousApplications.length}</span>
                )}
              </button>
              <a href="/job-search" className="matches-head-action-btn">
                <span>Find More Jobs</span>
                <span className="action-arrow">→</span>
              </a>
            </div>
          </div>

          {myApplicationsList.length === 0 ? (
            <article className="job-card job-empty-card">
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
                  <p className="app-company-loc-line">
                    {app.company_name ? (
                      <span className="company-meta-with-rating">
                        <strong>{app.company_name}</strong>
                        <span className="company-inline-rating-pill" title="Company rating">
                          <span className="star-icon">★</span>
                          <span>{app.rating ? Number(app.rating).toFixed(1) : "0.0"}</span>
                        </span>
                      </span>
                    ) : null}
                    <span className="meta-divider">•</span>
                    <span>{app.location || app.city || "Location not set"}</span>
                  </p>
                  <p className="app-submitted-date">
                    <span>Submitted on: {formatDate(app.submitted_at)}</span>
                  </p>
                </div>
                <div className="job-card-middle">
                  <ApplicationCardTimeline
                    app={app}
                    onOpenTimeline={() => setTimelineModalApp(app)}
                  />
                </div>
                <div className="app-card-actions">
                  {/* Top Action Button: Withdraw if still not approved, or Offer Letter / View Letter if approved */}
                  {(() => {
                    const statusLower = (app.status || "").toLowerCase();
                    const isApproved = ["approved", "accepted", "recruited"].includes(statusLower);
                    const isConcluded = ["denied", "rejected", "withdrawn"].includes(statusLower);
                    const hasFormalOffer = Boolean(
                      app.offer_letter ||
                      app.decision_message_type === "formal_offer" ||
                      ["offered", "offer_extended"].includes(statusLower) ||
                      isApproved
                    );
                    const hasResponseLetter = Boolean(app.response_letter);

                    // When approved: Offer Letter (or View Letter if candidate already responded)
                    if (isApproved || hasResponseLetter || hasFormalOffer) {
                      if (hasResponseLetter) {
                        return (
                          <button
                            type="button"
                            className="solid-btn offer-letter-action-btn"
                            onClick={() => {
                              setViewLetterModalTarget({
                                title: app.job_title || app.title || "Applied Role",
                                company: app.company_name || "Employer",
                                letterText: app.response_letter,
                                startDate: app.start_date,
                                respondedAt: app.responded_at,
                                decision: app.response_decision || (app.status === "declined" ? "declined" : "accepted"),
                              });
                            }}
                          >
                            <span>View Letter</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          className="solid-btn offer-letter-action-btn"
                          title="Review formal offer letter and respond"
                          onClick={() => {
                            setAppDecisionModalTarget({
                              app,
                              action: "accept",
                            });
                          }}
                        >
                          <span>Offer Letter</span>
                        </button>
                      );
                    }

                    // If still not approved (and not already concluded): Withdraw button at top
                    if (!isConcluded) {
                      return (
                        <button
                          type="button"
                          className="ghost-btn withdraw-app-btn"
                          onClick={() => setWithdrawTargetApp(app)}
                          title="Withdraw application"
                        >
                          Withdraw
                        </button>
                      );
                    }

                    return null;
                  })()}

                  <button type="button" className="solid-btn review-app-btn" onClick={() => handleReviewApplication(app)}>
                    Review
                  </button>
                  <button type="button" className="ghost-btn message-app-btn" onClick={() => { window.location.href = "/messages"; }}>Message</button>
                </div>
              </article>
            ))
          )}
        </section>
        )}

        {/* ── SECTION 3: JOB INVITATIONS ── */}
        {activeSection === "section-invitations" && (
        <section className="matches-card section-anchor" id="section-invitations">
          <div className="matches-head inv-matches-head">
            <div>
              <small className="matches-head-eyebrow">DIRECT INVITATIONS</small>
              <h2>Job Invitations</h2>
              <p>Positions where employers reviewed your profile and directly invited you.</p>
            </div>
            <div className="inv-filters-pill-group">
              {(["all", "pending", "accepted", "declined"] as const).map((key) => {
                const count = key === "all"
                  ? invitationsList.length
                  : invitationsList.filter((i) => (i.status || "pending").toLowerCase() === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`inv-filter-btn ${invitationFilter === key ? "active" : ""}`}
                    onClick={() => setInvitationFilter(key)}
                  >
                    <span>{key}</span>
                    <span className="inv-filter-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {invitationsList.filter((inv) => invitationFilter === "all" || (inv.status || "pending").toLowerCase() === invitationFilter).length === 0 ? (
            <article className="job-card job-empty-card">
              <div>
                <h3>
                  {invitationFilter === "all"
                    ? "No job invitations found."
                    : `No ${invitationFilter} job invitations found.`}
                </h3>
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
                  <article key={inv.id} className="job-card invitation-job-card">
                    <div className="job-card-left">
                      <div className="inv-title-badge-row">
                        <h3>{inv.job_title}</h3>
                        <span className="inv-badge-direct">
                          Direct Invitation
                        </span>
                      </div>
                      <p className="app-company-loc-line">
                        <span className="company-meta-with-rating">
                          <strong>{inv.business_name || "Employer"}</strong>
                          <span className="company-inline-rating-pill" title="Company rating">
                            <span className="star-icon">★</span>
                            <span>{(inv as any).rating ? Number((inv as any).rating).toFixed(1) : "0.0"}</span>
                          </span>
                        </span>
                        <span className="meta-divider">•</span>
                        <span>{inv.job_location || "Cavite"}</span>
                        <span className="meta-divider">•</span>
                        <span>{inv.work_arrangement || "On-Site"}</span>
                      </p>
                      {(inv.hide_salary || inv.salary_min) && (
                        <p className="inv-salary-text">
                          {formatSalaryRange(inv.salary_min ?? null, inv.salary_max ?? null, inv.hide_salary)}
                        </p>
                      )}
                      <p className="app-submitted-date">
                        <span>Invited on: {formatDate(inv.created_at)}</span>
                      </p>
                    </div>

                    <div className="job-card-middle">
                      <span className={`status-badge-chip ${status === "accepted" ? "chip-approved" : status === "declined" ? "chip-denied" : "chip-pending"}`}>
                        {status === "accepted" ? "Accepted" : status === "declined" ? "Declined" : "Invitation Received"}
                      </span>
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
                            onClick={() => setDecisionModalTarget({ inv, action: "accept" })}
                            disabled={isRespondingInvId === inv.id}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="inv-action-btn inv-decline-btn"
                            onClick={() => setDecisionModalTarget({ inv, action: "decline" })}
                            disabled={isRespondingInvId === inv.id}
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={`inv-action-btn ${status === "accepted" ? "inv-accepted-status-btn" : "inv-declined-status-btn"}`}
                          onClick={() => {
                            setViewLetterModalTarget({
                              title: inv.job_title || "Job Position",
                              company: inv.business_name || "Employer",
                              letterText: (inv as any).response_letter || (status === "accepted" ? "Recruitment invitation accepted." : "Recruitment invitation declined."),
                              startDate: (inv as any).start_date,
                              respondedAt: (inv as any).responded_at,
                              decision: status === "accepted" ? "accepted" : "declined",
                            });
                          }}
                          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", pointerEvents: "auto" }}
                        >
                          {status === "accepted" ? "Accepted • View Letter" : "Declined • View Letter"}
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
        )}
      </main>

      {/* ── JOB DETAILS MODAL ── */}
      {(() => {
        const activeReviewingInv = reviewingInv
          ? invitationsList.find((i) => i.id === reviewingInv.id) || reviewingInv
          : null;

        return (
          <JobDetailsModal
            isOpen={Boolean(detailsJob)}
            job={jobModalData}
            onClose={() => {
              setDetailsJob(null);
              setReviewingInv(null);
              setIsFaqDrawerOpen(false);
            }}
            currentUserId={applicantUserId || undefined}
            applicantProfile={applicantMatchProfile}
            customFooterActions={
              activeReviewingInv ? (
                <div className="jd-inv-footer-actions">
                  {(activeReviewingInv.status || "pending").toLowerCase() === "pending" ? (
                    <>
                      <button
                        type="button"
                        className="jd-inv-btn jd-inv-decline-btn"
                        onClick={() => {
                          setDecisionModalTarget({ inv: activeReviewingInv, action: "decline" });
                        }}
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        className="jd-inv-btn jd-inv-accept-btn"
                        onClick={() => {
                          setDecisionModalTarget({ inv: activeReviewingInv, action: "accept" });
                        }}
                      >
                        Accept
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={`jd-inv-btn jd-inv-status-btn ${(activeReviewingInv.status || "").toLowerCase() === "accepted" ? "accepted" : "declined"}`}
                      disabled
                    >
                      {(activeReviewingInv.status || "").toLowerCase() === "accepted" ? "Accepted" : "Declined"}
                    </button>
                  )}
                </div>
              ) : undefined
            }
            onApply={() => {
              if (detailsJob) {
                setApplyJobTarget({ jobId: detailsJob.id, title: detailsJob.title });
              }
            }}
            isApplied={detailsJob ? appliedJobIds.includes(detailsJob.id) : false}
            isApplying={detailsJob ? applyingJobId === detailsJob.id : false}
            appliedLabel="Applied"
            onEmployerClick={(empId) => {
              if (empId) handleOpenEmployerDetails(empId);
            }}
            zIndex={10000}
          />
        );
      })()}

      {/* ── EMPLOYER DETAILS MODAL ── */}
      <EmployerDetailsModal
        isOpen={Boolean(selectedEmployerDetails)}
        onClose={() => setSelectedEmployerDetails(null)}
        employer={selectedEmployerDetails}
        zIndex={10250}
      />

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

      {/* DOUBLE VERIFICATION: LOGOUT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        type="warning"
        title="Log Out of EliteCruit"
        message="Are you sure you want to log out of your applicant account?"
        cancelLabel="Stay Signed In"
        confirmLabel="Log Out"
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          localStorage.removeItem("elitecruit-user");
          window.location.href = "/";
        }}
      />

      {/* APPLICANT DECISION MODAL (Accept / Decline Recruitment - Pic 2 & Pic 3 Design) */}
      <ApplicantDecisionModal
        isOpen={!!decisionModalTarget}
        action={decisionModalTarget?.action || null}
        title={decisionModalTarget?.action === "decline" ? "Decline Direct Recruitment Invitation" : "Respond to Direct Recruitment Invitation"}
        jobTitle={decisionModalTarget?.inv.job_title}
        companyName={decisionModalTarget?.inv.business_name}
        candidateName={applicantLabel}
        currentUserId={applicantUserId || undefined}
        isInvitation={true}
        onClose={() => setDecisionModalTarget(null)}
        onConfirm={async ({ action, letter_text, letter_type, start_date }) => {
          if (!decisionModalTarget) return;
          await handleRespondInvitation(
            decisionModalTarget.inv.id,
            action,
            letter_text,
            letter_type,
            start_date
          );
        }}
      />

      {/* APPLICANT DECISION MODAL FOR APPLICATIONS (Formal Offer Letter Acceptance / Denial) */}
      <ApplicantDecisionModal
        isOpen={!!appDecisionModalTarget}
        action={appDecisionModalTarget?.action || "accept"}
        title="Respond to Formal Employment Offer"
        jobTitle={appDecisionModalTarget?.app.job_title || appDecisionModalTarget?.app.title}
        companyName={appDecisionModalTarget?.app.company_name}
        candidateName={applicantLabel}
        currentUserId={applicantUserId || undefined}
        onClose={() => setAppDecisionModalTarget(null)}
        onConfirm={async ({ action, letter_text, letter_type, start_date }) => {
          if (!appDecisionModalTarget) return;
          await handleRespondApplication(
            appDecisionModalTarget.app.id,
            action,
            letter_text,
            letter_type,
            start_date
          );
        }}
      />

      {/* FORMAL RESPONSE LETTER VIEW MODAL */}
      {viewLetterModalTarget && (
        <div className="view-letter-backdrop" onClick={() => setViewLetterModalTarget(null)}>
          <div className="view-letter-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="view-letter-header">
              <div>
                <span className="view-letter-eyebrow">FORMAL DECISION LETTER</span>
                <h3 className="view-letter-title">{viewLetterModalTarget.title}</h3>
                <p className="view-letter-company">{viewLetterModalTarget.company}</p>
              </div>
              <button
                type="button"
                className="view-letter-close-btn"
                onClick={() => setViewLetterModalTarget(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="view-letter-meta-row">
              <span className={`view-letter-badge ${viewLetterModalTarget.decision === "declined" ? "declined" : "accepted"}`}>
                {viewLetterModalTarget.decision === "declined" ? "Offer Declined" : "Offer Accepted"}
              </span>
              {viewLetterModalTarget.startDate && (
                <span className="view-letter-start-date">
                  📅 Target Start Date: <strong>{viewLetterModalTarget.startDate}</strong>
                </span>
              )}
              {viewLetterModalTarget.respondedAt && (
                <span className="view-letter-timestamp">
                  Submitted: {formatDate(viewLetterModalTarget.respondedAt)}
                </span>
              )}
            </div>

            <div className="view-letter-body-box">
              <pre className="view-letter-pre-text">{viewLetterModalTarget.letterText}</pre>
            </div>

            <div className="view-letter-footer">
              <button
                type="button"
                className="solid-btn view-letter-done-btn"
                onClick={() => setViewLetterModalTarget(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPLICATION TIMELINE TRACKER MODAL ── */}
      {timelineModalApp && (
        <div className="timeline-modal-backdrop" onClick={() => setTimelineModalApp(null)}>
          <div className="timeline-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="timeline-modal-header">
              <div>
                <span className="timeline-eyebrow">APPLICATION MILESTONE TRACKER</span>
                <h3 className="timeline-modal-title">{timelineModalApp.job_title || timelineModalApp.title || "Applied Role"}</h3>
                <div className="timeline-modal-meta">
                  <span className="timeline-modal-company">{timelineModalApp.company_name || "Employer"}</span>
                  <span className="meta-sep">•</span>
                  <span className={`status-badge-chip ${statusChipBadgeClass(timelineModalApp.status)}`}>
                    {formatStatusLabel(timelineModalApp.status)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="timeline-close-btn"
                onClick={() => setTimelineModalApp(null)}
                aria-label="Close timeline"
              >
                ✕
              </button>
            </div>

            <div className="timeline-stepper">
              {getApplicationTimelineSteps(timelineModalApp).map((step, idx, arr) => (
                <div key={step.title} className={`timeline-step-item ${step.state}`}>
                  <div className="timeline-step-line-col">
                    <div className="timeline-step-dot">
                      {step.state === "completed" ? (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : step.state === "concluded" ? (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      ) : step.state === "bypassed" ? (
                        <span className="step-num step-bypassed">—</span>
                      ) : (
                        <span className="step-num">{idx + 1}</span>
                      )}
                    </div>
                    {idx < arr.length - 1 && <div className="timeline-connecting-bar" />}
                  </div>
                  <div className="timeline-step-content">
                    <div className="timeline-step-head">
                      <h4>{step.title}</h4>
                      {step.timestamp && <span className="timeline-step-time">{step.timestamp}</span>}
                    </div>
                    <p className="timeline-step-desc">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="timeline-modal-footer">
              <button
                type="button"
                className="solid-btn timeline-done-btn"
                onClick={() => setTimelineModalApp(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPLICATION HISTORY POPUP MODAL ── */}
      {isHistoryModalOpen && (
        <div className="app-history-modal-backdrop" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="app-history-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-history-modal-header">
              <div>
                <span className="app-history-modal-eyebrow">APPLICATION TRACKER</span>
                <h3 className="app-history-modal-title">Application History</h3>
                <p className="app-history-modal-subtitle">
                  Review previous application records, interview dates, and decision outcomes.
                </p>
              </div>
              <button
                type="button"
                className="app-history-close-btn"
                onClick={() => setIsHistoryModalOpen(false)}
                aria-label="Close history modal"
              >
                ✕
              </button>
            </div>

            <div className="app-history-filter-bar">
              <button
                type="button"
                className={`app-history-filter-pill ${historyFilter === "all" ? "active" : ""}`}
                onClick={() => setHistoryFilter("all")}
              >
                All ({myApplicationsList.length})
              </button>
              <button
                type="button"
                className={`app-history-filter-pill ${historyFilter === "approved" ? "active" : ""}`}
                onClick={() => setHistoryFilter("approved")}
              >
                Approved ({approvedHistoryCount})
              </button>
              <button
                type="button"
                className={`app-history-filter-pill ${historyFilter === "denied" ? "active" : ""}`}
                onClick={() => setHistoryFilter("denied")}
              >
                Declined ({deniedHistoryCount})
              </button>
            </div>

            <div className="app-history-modal-body">
              {filteredHistoryApplications.length === 0 ? (
                <div className="app-history-empty-state">
                  <h4>No {historyFilter !== "all" ? historyFilter : ""} applications found</h4>
                  <p>There are no applications matching the selected history filter.</p>
                </div>
              ) : (
                <div className="app-history-list">
                  {filteredHistoryApplications.map((app: any) => {
                    const statusLower = (app?.status || "").toLowerCase();
                    const isApproved = ["approved", "accepted", "recruited"].includes(statusLower);
                    const isDenied = ["denied", "rejected", "withdrawn"].includes(statusLower);

                    let interview = app?.scheduled_interview;
                    if (!interview) {
                      try {
                        const rawInt = localStorage.getItem("elitecruit_scheduled_interviews");
                        if (rawInt) {
                          const list = JSON.parse(rawInt);
                          if (Array.isArray(list)) {
                            interview = list.find((it: any) =>
                              (app.job_post_id && it.job_post_id && String(it.job_post_id) === String(app.job_post_id)) ||
                              (app.job_title && it.job_title && it.job_title.toLowerCase() === app.job_title.toLowerCase())
                            );
                          }
                        }
                      } catch {}
                    }

                    return (
                      <div key={app.id || app.job_post_id} className="app-history-card">
                        <div className="app-history-card-top">
                          <div>
                            <h4 className="app-history-role">{app.job_title || app.title || "Applied Role"}</h4>
                            <div className="app-history-meta-line">
                              <span className="app-history-company">{app.company_name || "Employer"}</span>
                              <span className="app-history-sep">•</span>
                              <span className="app-history-location">{app.location || app.city || "Location not set"}</span>
                            </div>
                          </div>
                          <span className={`status-badge-chip ${statusChipBadgeClass(app.status)}`}>
                            {formatStatusLabel(app.status)}
                          </span>
                        </div>

                        <div className="app-history-dates-grid">
                          <div className="app-history-date-item">
                            <span className="app-history-date-label">Date of Application</span>
                            <span className="app-history-date-val">
                              {app.submitted_at ? formatDate(app.submitted_at) : "Submitted"}
                            </span>
                          </div>

                          <div className="app-history-date-item">
                            <span className="app-history-date-label">Date of Interview</span>
                            <span className="app-history-date-val">
                              {interview?.interview_date
                                ? `${formatDate(interview.interview_date)}${interview.start_time ? ` at ${interview.start_time}` : ""}${interview.interview_stage ? ` (${interview.interview_stage})` : ""}`
                                : app.had_interview && (app.interview_date || app.decided_at)
                                ? formatDate(app.interview_date || app.decided_at)
                                : "No interview conducted"}
                            </span>
                          </div>

                          <div className="app-history-date-item">
                            <span className="app-history-date-label">
                              {isApproved ? "Date Approved" : isDenied ? (statusLower === "withdrawn" ? "Date Withdrawn" : "Date Declined") : "Date of Decision"}
                            </span>
                            <span className="app-history-date-val">
                              {app.decided_at ? formatDate(app.decided_at) : (app.responded_at ? formatDate(app.responded_at) : "In Progress")}
                            </span>
                          </div>
                        </div>

                        {app.decision_message && (
                          <div className="app-history-feedback-box">
                            <span className="app-history-feedback-title">Feedback / Remarks:</span>
                            <p className="app-history-feedback-text">{app.decision_message}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="app-history-modal-footer">
              <button
                type="button"
                className="solid-btn app-history-done-btn"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE VERIFICATION: APPLY TO JOB MODAL */}
      <ConfirmationModal
        isOpen={!!applyJobTarget}
        type="info"
        title="Submit Job Application"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to apply for <strong>{applyJobTarget?.title || "this position"}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Your profile, qualifications, and attached resume will be submitted to the employer for review.
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Confirm & Apply"
        onCancel={() => setApplyJobTarget(null)}
        onConfirm={handleConfirmApply}
      />

      {/* DOUBLE VERIFICATION: WITHDRAW APPLICATION MODAL */}
      <ConfirmationModal
        isOpen={!!withdrawTargetApp && !withdrawMessage}
        type="warning"
        title="Withdraw Application"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to withdraw your application for{" "}
              <strong>{withdrawTargetApp?.job_title || withdrawTargetApp?.title || "this position"}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              The employer will be notified that you have withdrawn from consideration. This action cannot be undone.
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel={isWithdrawing ? "Withdrawing..." : "Confirm Withdraw"}
        isConfirming={isWithdrawing}
        onCancel={() => setWithdrawTargetApp(null)}
        onConfirm={handleConfirmWithdraw}
      />

      {/* WITHDRAW FEEDBACK ALERT MODAL */}
      {withdrawMessage && (
        <div className="system-popup-overlay" onClick={() => setWithdrawMessage(null)} role="dialog" aria-modal="true">
          <div className="system-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="system-popup-icon-wrap success">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="system-popup-title">Application Status</h3>
            <div className="system-popup-message">{withdrawMessage}</div>
            <div className="system-popup-actions" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="system-popup-btn confirm"
                style={{ background: "#103f65", color: "#fff", padding: "10px 24px", minWidth: 120 }}
                onClick={() => {
                  setWithdrawMessage(null);
                  setWithdrawTargetApp(null);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

