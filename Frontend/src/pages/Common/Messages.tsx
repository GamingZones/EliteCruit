import React, { useEffect, useState, useMemo } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import {
  calculateCandidateMatch,
  calculateJobMatchDetails,
  formatExperienceLevel,
  formatLocationWithCavite,
  getMatchColorClass,
  isSkillMatch,
  parseCompetencyDisplayTags,
  parseExpectedSalary,
  parsePreferredLocationTags,
} from "../../utils/filters";
import "../Applicant/Applicant-Dashboard.css";
import "../Employer/Employer-Dashboard.css";
import "../Employer/Employer-ApplicantFinder.css";
import "../Applicant/JobSearch.css";
import "./Messages.css";

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
  | "messages"
  | "notifications"
  | "profile"
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
    messages: <path d="M3 6h18v11H8l-5 4v-4H3V6Zm3 3h12M6 12h8" />,
    notifications: <path d="M12 3a5 5 0 0 1 5 5v2.8l1.4 2.3c.5.8 0 1.9-.9 1.9H6.5c-.9 0-1.4-1.1-.9-1.9L7 10.8V8a5 5 0 0 1 5-5Zm-2 14a2 2 0 1 0 4 0" />,
    profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    logout: <path d="M9 4H5v16h4M14 8l4 4-4 4M10 12h8" />,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

type JobOption = {
  id: number;
  title: string;
};

type ThreadItem = {
  id: number;
  title: string;
  updated_at?: string;
  created_at?: string;
  last_message?: string;
  last_message_time?: string;
  other_user_id?: number;
  other_user_email?: string;
  other_user_phone?: string;
  other_user_name?: string;
  is_invited?: number | boolean;
  invitation_status?: string | null;
  other_user_avatar?: string | null;
  unread_count?: number;
};

type JobDetailsModalData = {
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
  responsibilities: string;
  skillTags: string[];
  qualTags: string[];
  certTags?: string[];
  urgent: boolean;
  employerUserId?: number;
  companyLogoPath?: string | null;
  companyCoverPath?: string | null;
  rating?: string;
  matchScore?: number;
};

type CandidateDetails = {
  user_id: number;
  applicant_user_id?: number;
  applicant_name: string;
  email: string;
  phone: string;
  desired_job_title: string;
  work_arrangement: string;
  expected_salary: string;
  expected_salary_min?: string | number | null;
  expected_salary_max?: string | number | null;
  skills: string;
  qualifications: string;
  certifications: string;
  resume_path?: string | null;
  profile_picture_path?: string | null;
  city?: string;
  address?: string;
  nearby_location?: string;
  preferred_locations?: string;
  summary?: string;
  languages?: string;
  years_of_experience?: string;
  work_experience_json?: string;
  rating?: string;
};

type EmployerCompanyDetails = {
  user_id: number;
  business_name: string;
  business_email: string;
  contact_number?: string | null;
  industry?: string | null;
  company_size?: string | null;
  company_description?: string | null;
  company_address?: string | null;
  city?: string | null;
  province?: string | null;
  website?: string | null;
  company_logo_path?: string | null;
  company_cover_path?: string | null;
  rating?: string | number | null;
  total_reviews?: number | null;
  branches?: any[];
};

type ChatMessage = {
  id: number;
  thread_id: number;
  sender_user_id: number;
  message_text: string;
  created_at?: string;
  sender_email?: string;
};

const DEFAULT_FAQS = [
  {
    id: 1,
    question_type: "Hiring Process",
    question: "What is the hiring process like?",
    answer: "Our hiring process involves an initial resume screening, an interview with HR, a technical assessment, and a final interview with the hiring manager.",
  },
  {
    id: 2,
    question_type: "Work Setup",
    question: "What is the work setup for this role?",
    answer: "The work setup depends on the job posting (Remote, Hybrid, or On-Site). Please review the job details above for specifics.",
  },
  {
    id: 3,
    question_type: "Benefits",
    question: "What benefits and perks are offered?",
    answer: "We offer competitive compensation, health insurance (HMO), paid leaves, continuous learning allowances, and career growth opportunities.",
  },
];

function parseItemList(raw?: string | null, fallback: string[] = []): string[] {
  if (!raw || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {}
  return raw
    .split(/[\n,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function initialsFromName(name?: string | null) {
  if (!name) return "EC";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

type WorkExpItem = {
  id?: string;
  title: string;
  company: string;
  city?: string;
  province?: string;
  isCurrent?: boolean;
  startMonth?: string;
  startYear?: string;
  endMonth?: string;
  endYear?: string;
  employmentType?: string;
  responsibilities?: string;
  skills?: string[];
};

function isShsItem(item: string): boolean {
  if (!item) return false;
  const lower = item.toLowerCase();
  return (
    lower.includes("[shs]") ||
    lower.includes("senior high") ||
    lower.includes("high school") ||
    lower.includes("tvl") ||
    lower.includes("stem") ||
    lower.includes("abm") ||
    lower.includes("humss") ||
    lower.includes("gas") ||
    lower.includes("tesda") ||
    lower.includes("vocational")
  );
}

interface ApplicantDocumentItem {
  id: number | string;
  file_name: string;
  file_size?: number | null;
  mimetype?: string;
  created_at?: string | null;
  url: string;
  is_resume?: boolean;
}

function formatDocBytes(bytes?: number | null, decimals = 1) {
  if (!bytes || bytes === 0) return "";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getDocIconType(fileName: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  return "generic";
}

function getDocIconStyle(type: string) {
  switch (type) {
    case "pdf":
      return { bg: "#fee2e2", color: "#dc2626" };
    case "word":
      return { bg: "#e0f2fe", color: "#0284c7" };
    case "image":
      return { bg: "#dcfce7", color: "#16a34a" };
    default:
      return { bg: "#f1f5f9", color: "#475569" };
  }
}

function parseCandidateSalaryRange(cand?: any): { min: string; max: string } {
  if (!cand) return { min: "Negotiable", max: "Negotiable" };

  const formatPhp = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const raw = String(val).replace(/,/g, "").replace(/[^0-9.]/g, "").trim();
    if (!raw) return "";
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return "";
    return `PHP ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  let minStr = formatPhp(cand.expected_salary_min);
  let maxStr = formatPhp(cand.expected_salary_max);

  if ((!minStr || !maxStr || minStr === maxStr) && cand.expected_salary) {
    const rawStr = String(cand.expected_salary).trim();
    if (rawStr.includes("-")) {
      const parts = rawStr.split("-").map((p) => p.trim());
      const pMin = formatPhp(parts[0]);
      const pMax = formatPhp(parts[1]);
      if (pMin && pMax) {
        minStr = pMin;
        maxStr = pMax;
      }
    } else if (!minStr && !maxStr) {
      const single = formatPhp(rawStr);
      minStr = single;
      maxStr = single;
    }
  }

  return {
    min: minStr || "Negotiable",
    max: maxStr || minStr || "Negotiable",
  };
}

function formatFacebookTimestamp(dateStr?: string | Date | null): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timePart = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  // Within past 6 days -> e.g. "Fri 9:40 PM" (matching Facebook Messenger format)
  if (diffDays < 7 && diffDays >= 0) {
    const weekday = date.toLocaleDateString([], { weekday: "short" });
    return `${weekday} ${timePart}`;
  }

  // Same year -> e.g. "Oct 16, 9:40 PM"
  if (date.getFullYear() === now.getFullYear()) {
    const monthDay = date.toLocaleDateString([], { month: "short", day: "numeric" });
    return `${monthDay}, ${timePart}`;
  }

  // Different year -> e.g. "Oct 16, 2025, 9:40 PM"
  const fullDate = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  return `${fullDate}, ${timePart}`;
}

function shouldShowTimeSeparator(currentMsg: ChatMessage, prevMsg: ChatMessage | null): boolean {
  if (!prevMsg) return true;
  const curDate = currentMsg.created_at ? new Date(currentMsg.created_at) : new Date();
  const prevDate = prevMsg.created_at ? new Date(prevMsg.created_at) : null;
  if (!prevDate || isNaN(prevDate.getTime()) || isNaN(curDate.getTime())) return true;

  // 30 minutes interval in milliseconds = 30 * 60 * 1000 ms = 1,800,000 ms
  const diffMs = Math.abs(curDate.getTime() - prevDate.getTime());
  const isDifferentDay = curDate.toDateString() !== prevDate.toDateString();

  return diffMs >= 30 * 60 * 1000 || isDifferentDay;
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

export default function Messages() {
  const [sessionRole, setSessionRole] = useState<"applicant" | "employer">("applicant");
  const [applicantLabel, setApplicantLabel] = useState(getInitialApplicantName);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();

  const employerMessagesFaqs: FAQItem[] = [
    {
      question: "When can I message an applicant?",
      answer: "You can chat with applicants who have submitted an application to your job post or candidates who have accepted a direct recruitment invitation.",
    },
    {
      question: "How do I filter chat threads by job posting?",
      answer: "Use the 'Job Opening' filter dropdown at the top of the chat sidebar to view messages associated with a specific job post.",
    },
  ];
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composeText, setComposeText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "applied" | "recruited">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState<CandidateDetails | null>(null);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<EmployerCompanyDetails | null>(null);
  const [detailsJob, setDetailsJob] = useState<JobDetailsModalData | null>(null);
  const [isFaqDrawerOpen, setIsFaqDrawerOpen] = useState(false);
  const [companyFaqs, setCompanyFaqs] = useState<any[]>(DEFAULT_FAQS);
  const [faqLoading, setFaqLoading] = useState(false);
  const [expandedFaqIds, setExpandedFaqIds] = useState<number[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [invitationStatus, setInvitationStatus] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [isRespondingInvitation, setIsRespondingInvitation] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [candDetailTab, setCandDetailTab] = useState<"personal" | "preferences" | "competencies" | "experience">("personal");
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);
  const [isPreviewingDoc, setIsPreviewingDoc] = useState(false);
  const [candidateDocuments, setCandidateDocuments] = useState<ApplicantDocumentItem[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ApplicantDocumentItem | null>(null);
  const [employerJobs, setEmployerJobs] = useState<JobOption[]>([]);

  const fetchCandidateDocuments = async (userId: number) => {
    if (!userId) return;
    setIsDocsLoading(true);
    try {
      const res = await fetch(`/api/applicants/${userId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setCandidateDocuments(Array.isArray(data?.documents) ? data.documents : []);
      }
    } catch (err) {
      console.error("Failed to load candidate documents:", err);
    } finally {
      setIsDocsLoading(false);
    }
  };
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");
  const companyLabel = useEmployerCompanyLabel("Employer");
  const isEmployer = sessionRole === "employer";

  // Messenger-style Info Sidebar state
  const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
  const [isAppliedSectionOpen, setIsAppliedSectionOpen] = useState(true);
  const [isRecruitedSectionOpen, setIsRecruitedSectionOpen] = useState(false);
  const [isOtherJobsSectionOpen, setIsOtherJobsSectionOpen] = useState(false);
  const [companyJobsLoading, setCompanyJobsLoading] = useState(false);
  const [companyJobsData, setCompanyJobsData] = useState<{
    employer_user_id: number;
    applicant_user_id: number;
    company_name: string;
    applicant_name: string;
    applied_jobs: any[];
    recruited_jobs?: any[];
    other_jobs: any[];
    total_company_jobs: number;
  } | null>(null);

  // Candidate Profile for Matching in Employer View
  const [applicantProfile, setApplicantProfile] = useState<any | null>(null);

  // Applicant Own Profile for Matching in Applicant View
  const [applicantOwnProfile, setApplicantOwnProfile] = useState<any | null>(null);
  const [isApplicantBreakdownOpen, setIsApplicantBreakdownOpen] = useState(false);

  // Picture 1 & Picture 2 State for Employer View
  const [employerViewingJob, setEmployerViewingJob] = useState<any | null>(null);
  const [isJobDetailsClosing, setIsJobDetailsClosing] = useState(false);
  const [isMatchDrawerOpen, setIsMatchDrawerOpen] = useState(false);
  const [hoveredCompareTag, setHoveredCompareTag] = useState<{
    item: string;
    side: "applicant" | "employer";
    category: "skills" | "qualifications" | "certifications";
  } | null>(null);

  const [inviteCandidateJob, setInviteCandidateJob] = useState<any | null>(null);
  const [customInviteMsg, setCustomInviteMsg] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState("");

  // DOUBLE VERIFICATION MODAL STATES
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [declineInvitationTarget, setDeclineInvitationTarget] = useState<{
    type: "chat" | "byJob" | "byDetails";
    jobId?: number;
    title?: string;
  } | null>(null);
  const [applyJobTarget, setApplyJobTarget] = useState<{
    jobId: number;
    title: string;
  } | null>(null);
  const [isConfirmInviteOpen, setIsConfirmInviteOpen] = useState(false);

  const targetCandidate = useMemo(() => {
    const candName = applicantProfile
      ? [applicantProfile.first_name, applicantProfile.middle_name, applicantProfile.last_name].filter(Boolean).join(" ") || selectedThread?.other_user_name || companyJobsData?.applicant_name || "Applicant"
      : selectedThread?.other_user_name || companyJobsData?.applicant_name || "Applicant";

    return {
      user_id: selectedThread?.other_user_id,
      applicant_name: candName,
      email: applicantProfile?.email || selectedCandidateDetails?.email || "",
      phone: applicantProfile?.phone || selectedCandidateDetails?.phone || "",
      desired_job_title: applicantProfile?.desired_job_title || "",
      work_arrangement: applicantProfile?.work_arrangement || "On-Site",
      expected_salary: applicantProfile?.expected_salary || "",
      expected_salary_min: applicantProfile?.expected_salary_min,
      expected_salary_max: applicantProfile?.expected_salary_max,
      skills: applicantProfile?.skills || "",
      qualifications: applicantProfile?.qualifications || "",
      certifications: applicantProfile?.certifications || "",
      city: applicantProfile?.city || applicantProfile?.address || "Cavite",
      years_of_experience: applicantProfile?.years_of_experience || "",
    };
  }, [applicantProfile, selectedThread, companyJobsData, selectedCandidateDetails]);

  const myApplicantMatchInput = useMemo(() => {
    if (!applicantOwnProfile) return null;
    return {
      desired_job_title: applicantOwnProfile.desired_job_title || "",
      work_arrangement: applicantOwnProfile.work_arrangement || "Any",
      expected_salary: applicantOwnProfile.expected_salary || "",
      city: applicantOwnProfile.city || applicantOwnProfile.address || "Cavite",
      preferred_locations: applicantOwnProfile.preferred_locations || "",
      skills: applicantOwnProfile.skills || "",
      qualifications: applicantOwnProfile.qualifications || "",
      certifications: applicantOwnProfile.certifications || "",
    };
  }, [applicantOwnProfile]);

  const applicantMatchProfile = useMemo(() => {
    if (!applicantOwnProfile) return null;
    return {
      desiredJobTitle: applicantOwnProfile.desired_job_title || "",
      workArrangement: applicantOwnProfile.work_arrangement || "Any",
      expectedSalary: parseExpectedSalary(applicantOwnProfile.expected_salary),
      city: applicantOwnProfile.city || applicantOwnProfile.address || "Cavite",
      skills: parseCompetencyDisplayTags(applicantOwnProfile.skills),
      qualifications: parseCompetencyDisplayTags(applicantOwnProfile.qualifications),
      certifications: parseCompetencyDisplayTags(applicantOwnProfile.certifications),
    };
  }, [applicantOwnProfile]);

  const appliedJobsList = useMemo(() => {
    if (!companyJobsData) return [];
    if (Array.isArray(companyJobsData.recruited_jobs)) {
      return companyJobsData.applied_jobs || [];
    }
    return (companyJobsData.applied_jobs || []).filter((j: any) => !j.invitation);
  }, [companyJobsData]);

  const recruitedJobsList = useMemo(() => {
    if (!companyJobsData) return [];
    if (Array.isArray(companyJobsData.recruited_jobs)) {
      return companyJobsData.recruited_jobs || [];
    }
    const fromApplied = (companyJobsData.applied_jobs || []).filter((j: any) => Boolean(j.invitation));
    const fromOther = (companyJobsData.other_jobs || []).filter((j: any) => Boolean(j.invitation));
    return [...fromApplied, ...fromOther];
  }, [companyJobsData]);

  const otherJobsList = useMemo(() => {
    if (!companyJobsData) return [];
    if (Array.isArray(companyJobsData.recruited_jobs)) {
      return companyJobsData.other_jobs || [];
    }
    return (companyJobsData.other_jobs || []).filter((j: any) => !j.invitation && !j.application);
  }, [companyJobsData]);

  const handleOpenEmployerJobDetails = (job: any) => {
    setEmployerViewingJob(job);
    setIsMatchDrawerOpen(false);
  };

  const handleCloseEmployerJobDetails = () => {
    setIsJobDetailsClosing(true);
    setTimeout(() => {
      setEmployerViewingJob(null);
      setIsMatchDrawerOpen(false);
      setIsJobDetailsClosing(false);
    }, 180);
  };

  const handleOpenInviteModal = (job: any) => {
    setInviteCandidateJob(job);
    setInviteSuccessMsg("");
    setCustomInviteMsg(
      `Hello ${targetCandidate.applicant_name}! We reviewed your profile and would love to invite you to apply for our open position: ${job.title}.`
    );
  };

  const handleCloseInviteModal = () => {
    setInviteCandidateJob(null);
    setInviteSuccessMsg("");
  };

  const handleSendInviteFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCandidateJob || !currentUserId || !selectedThread || !customInviteMsg.trim()) return;
    setIsConfirmInviteOpen(true);
  };

  const doSendInvite = async () => {
    if (!inviteCandidateJob || !currentUserId || !selectedThread) return;
    const employerId = companyJobsData?.employer_user_id || currentUserId;
    const applicantId = companyJobsData?.applicant_user_id || selectedThread.other_user_id;
    if (!employerId || !applicantId) return;

    setIsSendingInvite(true);
    try {
      const res = await fetch(`/api/employers/${employerId}/invite-candidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_user_id: applicantId,
          job_post_id: inviteCandidateJob.id,
          custom_message: customInviteMsg.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send recruitment invitation.");

      setIsConfirmInviteOpen(false);
      setInviteSuccessMsg(`Invitation successfully sent for "${inviteCandidateJob.title}"!`);
      setTimeout(() => {
        setInviteCandidateJob(null);
        setInviteSuccessMsg("");
      }, 1200);

      if (selectedThread) {
        fetchCompanyJobs(selectedThread.id);
        fetchThreadMessages(selectedThread.id);
      }
    } catch (err: any) {
      alert(err.message || "Failed to send recruitment invitation.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleConfirmDecline = async () => {
    if (!declineInvitationTarget) return;
    const target = declineInvitationTarget;
    setDeclineInvitationTarget(null);
    if (target.type === "byJob" && target.jobId) {
      await handleRespondInvitationByJob(target.jobId, "decline");
    } else if (target.type === "byDetails") {
      await handleRespondInvitation("decline");
    } else if (target.type === "chat") {
      await handleRespondInvitationFromChat("decline");
    }
  };

  const handleConfirmApply = async () => {
    if (!applyJobTarget) return;
    const targetId = applyJobTarget.jobId;
    setApplyJobTarget(null);
    await applyToJob(targetId);
  };

  const fetchCompanyJobs = async (threadId: number) => {
    setCompanyJobsLoading(true);
    try {
      const res = await fetch(`/api/messages/threads/${threadId}/company-jobs`);
      if (res.ok) {
        const data = await res.json();
        setCompanyJobsData(data);
      } else {
        setCompanyJobsData(null);
      }
    } catch (err) {
      console.error("Failed to load company jobs:", err);
      setCompanyJobsData(null);
    } finally {
      setCompanyJobsLoading(false);
    }
  };

  const handleToggleInfoSidebar = () => {
    if (!selectedThread) return;
    const nextState = !isInfoSidebarOpen;
    setIsInfoSidebarOpen(nextState);
    if (nextState) {
      setIsAppliedSectionOpen(true);
      setIsRecruitedSectionOpen(false);
      setIsOtherJobsSectionOpen(false);
      fetchCompanyJobs(selectedThread.id);
    }
  };

  const handleRespondInvitationByJob = async (jobId: number, action: "accept" | "decline") => {
    if (!currentUserId || !selectedThread) return;
    try {
      const res = await fetch("/api/job-invitations/respond-by-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_post_id: jobId,
          applicant_user_id: currentUserId,
          action,
        }),
      });
      if (res.ok) {
        const refreshedRes = await fetch(`/api/messages/threads/${selectedThread.id}/company-jobs`);
        if (refreshedRes.ok) {
          const refreshed = await refreshedRes.json();
          setCompanyJobsData(refreshed);
        }
        fetchThreadMessages(selectedThread.id);
      }
    } catch (err) {
      console.error("Error responding to invitation:", err);
    }
  };

  const fetchEmployerJobs = async (employerId: number) => {
    try {
      const res = await fetch(`/api/employers/${employerId}/active-job-posts`);
      if (res.ok) {
        const data = await res.json();
        setEmployerJobs(data?.jobs || []);
      }
    } catch {}
  };

  const handleOpenJobDetailsForApplicant = async (
    threadOrId?: ThreadItem | number,
    explicitInviteStatus?: "pending" | "accepted" | "declined" | null
  ) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch("/api/job-posts");
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data?.jobPosts) ? data.jobPosts : [];
        
        let matched: any = null;
        let effectiveThread: ThreadItem | null = null;
        if (typeof threadOrId === "number") {
          matched = rows.find((r: any) => Number(r.id) === Number(threadOrId));
          effectiveThread = selectedThread;
        } else {
          effectiveThread = (threadOrId as ThreadItem) || selectedThread;
          if (effectiveThread) {
            const cleanThreadTitle = (effectiveThread.title || "").replace(/^Job Invitation:\s*/i, "").trim().toLowerCase();
            matched = rows.find((r: any) => {
              const rowTitle = (r.title || "").trim().toLowerCase();
              return rowTitle === cleanThreadTitle || (cleanThreadTitle && (rowTitle.includes(cleanThreadTitle) || cleanThreadTitle.includes(rowTitle)));
            });
            if (!matched && effectiveThread.other_user_id) {
              matched = rows.find((r: any) => Number(r.employer_user_id) === Number(effectiveThread.other_user_id));
            }
          }
        }

        const formatSalary = (min: number | null, max: number | null) => {
          if (min && max) return `PHP ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}`;
          if (min) return `PHP ${Number(min).toLocaleString()}+`;
          return "Competitive Salary";
        };

        const parseSkills = (raw?: string | null) => {
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
          } catch {}
          return String(raw).split(/[\n,;|]+/).map((s) => s.trim()).filter(Boolean);
        };

        if (matched) {
          const matchedId = Number(matched.id);
          const skillTags = parseCompetencyDisplayTags(matched.required_skills);
          const qualTags = parseCompetencyDisplayTags(matched.qualifications);
          const certTags = parseCompetencyDisplayTags(matched.required_certifications);

          let calculatedScore = 75;
          if (currentUserId && !isEmployer) {
            try {
              const profRes = await fetch(`/api/applicants/${currentUserId}/profile`);
              if (profRes.ok) {
                const profData = await profRes.json();
                const p = profData?.profile;
                if (p) {
                  const matchInfo = calculateJobMatchDetails(
                    {
                      id: matchedId,
                      title: matched.title || "",
                      location: matched.location || "",
                      salaryMin: Number(matched.salary_min) || 0,
                      setup: matched.work_arrangement || "Flexible",
                      skillTags,
                      qualTags,
                      certTags,
                    },
                    {
                      desiredJobTitle: p.desired_job_title || "",
                      workArrangement: p.work_arrangement || "",
                      expectedSalary: parseExpectedSalary(p.expected_salary),
                      city: p.city || "",
                      skills: parseCompetencyDisplayTags(p.skills),
                      qualifications: parseCompetencyDisplayTags(p.qualifications),
                      certifications: parseCompetencyDisplayTags(p.certifications),
                    }
                  );
                  calculatedScore = matchInfo.score;
                }
              }
            } catch {}
          }

          setDetailsJob({
            id: matchedId,
            title: matched.title || "Job Opening",
            company: matched.company_name || effectiveThread?.other_user_name || "Employer",
            location: matched.location || "Cavite",
            summary: matched.description || "No job description provided yet.",
            salary: formatSalary(matched.salary_min ?? null, matched.salary_max ?? null),
            salaryMin: Number(matched.salary_min) || 0,
            setup: matched.work_arrangement || "Flexible",
            experienceLevel: matched.experience_level || null,
            status: matched.status === "closed" ? "closed" : "open",
            closeDate: matched.close_date || "-",
            applicationLimit: Number(matched.application_limit) || 0,
            applicantCount: Number(matched.applicant_count) || 0,
            qualifications: matched.qualifications || "Not provided",
            responsibilities: matched.responsibilities || "Not provided",
            skillTags,
            qualTags,
            certTags,
            urgent: Boolean(Number(matched.is_urgent || 0)),
            employerUserId: Number(matched.employer_user_id) || effectiveThread?.other_user_id,
            companyLogoPath: matched.company_logo_path || null,
            companyCoverPath: matched.company_cover_path || null,
            rating: matched.rating ? String(matched.rating) : "0.0",
            matchScore: calculatedScore,
          });
          setIsFaqDrawerOpen(false);

          if (explicitInviteStatus !== undefined) {
            setInvitationStatus(explicitInviteStatus);
          } else if (typeof threadOrId === "number") {
            // Specifically opened job by ID from sidebar - never inherit unrelated thread invitation
            if (currentUserId) {
              try {
                const invRes = await fetch(`/api/job-invitations/status?job_post_id=${matchedId}&applicant_user_id=${currentUserId}`);
                if (invRes.ok) {
                  const invData = await invRes.json();
                  setInvitationStatus(invData?.invitation?.status || null);
                } else {
                  setInvitationStatus(null);
                }
              } catch {
                setInvitationStatus(null);
              }
            } else {
              setInvitationStatus(null);
            }
          } else if (currentUserId) {
            // Opened from thread header
            try {
              const invRes = await fetch(`/api/job-invitations/status?job_post_id=${matchedId}&applicant_user_id=${currentUserId}`);
              if (invRes.ok) {
                const invData = await invRes.json();
                if (invData?.invitation?.status) {
                  setInvitationStatus(invData.invitation.status);
                } else if (effectiveThread?.is_invited || effectiveThread?.title?.toLowerCase().includes("job invitation")) {
                  setInvitationStatus("pending");
                } else {
                  setInvitationStatus(null);
                }
              } else {
                setInvitationStatus(effectiveThread?.is_invited ? "pending" : null);
              }
            } catch {
              setInvitationStatus(effectiveThread?.is_invited ? "pending" : null);
            }
          } else {
            setInvitationStatus(null);
          }
          return;
        }
      }

      alert("Job details for this position are no longer available.");
      setDetailsJob(null);
      if (effectiveThread?.is_invited || effectiveThread?.title?.toLowerCase().includes("job invitation")) {
        setInvitationStatus("pending");
      } else {
        setInvitationStatus(null);
      }
    } catch (err) {
      console.error("Error opening job details:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleRespondInvitation = async (action: "accept" | "decline") => {
    if (!currentUserId || !detailsJob?.id) return;
    setIsRespondingInvitation(true);
    try {
      const res = await fetch("/api/job-invitations/respond-by-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_post_id: detailsJob.id,
          applicant_user_id: currentUserId,
          action,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newStatus = data.status || (action === "accept" ? "accepted" : "declined");
        setInvitationStatus(newStatus);
        if (action === "accept") {
          setAppliedJobIds((prev) => [...prev, detailsJob.id]);
        }
        setSelectedThread((prev) => (prev ? { ...prev, invitation_status: newStatus } : null));
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedThread?.id ? { ...t, invitation_status: newStatus } : t))
        );
        if (selectedThread?.id) {
          fetchThreadMessages(selectedThread.id);
        }
      }
    } catch (err) {
      console.error("Error responding to invitation:", err);
    } finally {
      setIsRespondingInvitation(false);
    }
  };

  const handleRespondInvitationFromChat = async (action: "accept" | "decline") => {
    if (!currentUserId || !selectedThread?.id) return;
    setIsRespondingInvitation(true);
    try {
      const res = await fetch("/api/job-invitations/respond-by-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: selectedThread.id,
          applicant_user_id: currentUserId,
          action,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newStatus = data.status || (action === "accept" ? "accepted" : "declined");
        setInvitationStatus(newStatus);
        setSelectedThread((prev) => (prev ? { ...prev, invitation_status: newStatus } : null));
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedThread.id ? { ...t, invitation_status: newStatus } : t))
        );
        fetchThreadMessages(selectedThread.id);
      }
    } catch {
      alert("Unable to process your response. Please try again.");
    } finally {
      setIsRespondingInvitation(false);
    }
  };

  const handleOpenFaqs = (job: JobDetailsModalData) => {
    setIsFaqDrawerOpen(true);
    setFaqLoading(true);
    if (job.employerUserId) {
      fetch(`/api/employers/${job.employerUserId}/faqs`)
        .then((res) => res.json())
        .then((data) => {
          const rows = Array.isArray(data?.faqs)
            ? data.faqs.filter((f: any) => f.is_active !== 0)
            : [];
          setCompanyFaqs(rows.length > 0 ? rows : DEFAULT_FAQS);
        })
        .catch(() => setCompanyFaqs(DEFAULT_FAQS))
        .finally(() => setFaqLoading(false));
    } else {
      setCompanyFaqs(DEFAULT_FAQS);
      setFaqLoading(false);
    }
  };

  const handleOpenCompanyFaqs = (employerUserId?: number) => {
    setIsFaqDrawerOpen(true);
    setFaqLoading(true);
    if (employerUserId) {
      fetch(`/api/employers/${employerUserId}/faqs`)
        .then((res) => res.json())
        .then((data) => {
          const rows = Array.isArray(data?.faqs)
            ? data.faqs.filter((f: any) => f.is_active !== 0)
            : [];
          setCompanyFaqs(rows.length > 0 ? rows : DEFAULT_FAQS);
        })
        .catch(() => setCompanyFaqs(DEFAULT_FAQS))
        .finally(() => setFaqLoading(false));
    } else {
      setCompanyFaqs(DEFAULT_FAQS);
      setFaqLoading(false);
    }
  };

  const applyToJob = async (jobId: number) => {
    if (!currentUserId || jobId === 0) return;
    if (appliedJobIds.includes(jobId)) return;
    setApplyingJobId(jobId);
    try {
      const res = await fetch(`/api/applicants/${currentUserId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_post_id: jobId }),
      });
      if (res.ok) {
        setAppliedJobIds((prev) => [...prev, jobId]);
        if (detailsJob) {
          setDetailsJob({ ...detailsJob, applicantCount: detailsJob.applicantCount + 1 });
        }
        if (selectedThread) {
          fetch(`/api/messages/threads/${selectedThread.id}/company-jobs`)
            .then((r) => r.json())
            .then((d) => setCompanyJobsData(d))
            .catch(() => {});
          fetchThreadMessages(selectedThread.id);
        }
      }
    } catch {}
    finally {
      setApplyingJobId(null);
    }
  };

  const handleOpenCompanyDetails = async (
    targetEmployerId: number,
    fallbackName?: string,
    fallbackEmail?: string,
    fallbackPhone?: string
  ) => {
    setIsFaqDrawerOpen(false);
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/employers/${targetEmployerId}/profile`);
      if (res.ok) {
        const data = await res.json();
        const profile = data?.profile;
        if (profile) {
          let branchesList: any[] = [];
          if (Array.isArray(profile.branches)) {
            branchesList = profile.branches;
          } else if (typeof profile.branches_json === "string" && profile.branches_json.trim()) {
            try {
              branchesList = JSON.parse(profile.branches_json);
            } catch {}
          }
          const resolvedAddress = profile.company_address || profile.city || "Cavite";
          setSelectedCompanyDetails({
            user_id: targetEmployerId,
            business_name: profile.business_name || fallbackName || "Employer",
            business_email: profile.business_email || profile.email || fallbackEmail || "",
            contact_number: profile.contact_number || fallbackPhone || "",
            industry: profile.industry || "Recruitment & Staffing",
            company_size: profile.company_size || "Not specified",
            company_description: profile.company_description || "No company description provided.",
            company_address: resolvedAddress,
            city: profile.city || "Cavite",
            province: profile.province || "Cavite",
            website: profile.website || "",
            company_logo_path: profile.company_logo_path || null,
            company_cover_path: profile.company_cover_path || null,
            rating: profile.rating ? String(profile.rating) : "0.0",
            total_reviews: profile.total_reviews || 0,
            branches: branchesList,
          });
          return;
        }
      }
      setSelectedCompanyDetails({
        user_id: targetEmployerId,
        business_name: fallbackName || "Employer",
        business_email: fallbackEmail || "",
        contact_number: fallbackPhone || "",
        industry: "Recruitment & Staffing",
        company_size: "Not specified",
        company_description: "No company description provided.",
        company_address: "Cavite",
        city: "Cavite",
        province: "Cavite",
        website: "",
        company_logo_path: null,
        company_cover_path: null,
        rating: "0.0",
        total_reviews: 0,
        branches: [],
      });
    } catch (err) {
      console.error("Failed to fetch employer profile:", err);
      setSelectedCompanyDetails({
        user_id: targetEmployerId,
        business_name: fallbackName || "Employer",
        business_email: fallbackEmail || "",
        contact_number: fallbackPhone || "",
        industry: "Recruitment & Staffing",
        company_size: "Not specified",
        company_description: "No company description provided.",
        company_address: "Cavite",
        city: "Cavite",
        province: "Cavite",
        website: "",
        company_logo_path: null,
        company_cover_path: null,
        rating: "0.0",
        total_reviews: 0,
        branches: [],
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenDetails = async (targetUserId: number, fallbackName: string, fallbackEmail?: string, fallbackPhone?: string) => {
    setIsLoadingDetails(true);
    try {
      let res = await fetch(`/api/applicants/${targetUserId}/profile`);
      if (res.ok) {
        const data = await res.json();
        const profile = data?.profile;
        if (profile) {
          const resolvedCity = profile.city || profile.address || "Cavite";
          setSelectedCandidateDetails({
            user_id: targetUserId,
            applicant_name: [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || fallbackName,
            email: profile.email || fallbackEmail || "",
            phone: profile.phone || fallbackPhone || "",
            desired_job_title: profile.desired_job_title || "Applicant",
            work_arrangement: profile.work_arrangement || "On-Site",
            expected_salary: profile.expected_salary || "Not specified",
            expected_salary_min: profile.expected_salary_min,
            expected_salary_max: profile.expected_salary_max,
            address: profile.address || "",
            nearby_location: profile.nearby_location || "",
            preferred_locations: profile.preferred_locations || "",
            summary: profile.summary || "",
            languages: profile.languages || "",
            years_of_experience: profile.years_of_experience || "",
            work_experience_json: profile.work_experience_json || "",
            skills: profile.skills || "",
            qualifications: profile.qualifications || "",
            certifications: profile.certifications || "",
            resume_path: profile.resume_path || null,
            profile_picture_path: profile.profile_picture_path || null,
            city: resolvedCity,
            rating: profile.rating ? String(profile.rating) : "0.0",
          });
          setCandDetailTab("personal");
          setIsDocsDrawerOpen(false);
          setIsPreviewingDoc(false);
          setPreviewDoc(null);
          fetchCandidateDocuments(targetUserId);
          return;
        }
      }

      res = await fetch(`/api/employers/${targetUserId}/profile`);
      if (res.ok) {
        const data = await res.json();
        const profile = data?.profile;
        if (profile) {
          const resolvedCity = profile.company_address || profile.city || "Cavite";
          setSelectedCandidateDetails({
            user_id: targetUserId,
            applicant_name: profile.business_name || fallbackName,
            email: profile.business_email || fallbackEmail || "",
            phone: profile.contact_number || fallbackPhone || "",
            desired_job_title: profile.industry || "Company",
            work_arrangement: profile.company_size || "Employer",
            expected_salary: "Company Profile",
            skills: profile.company_description || "",
            qualifications: "",
            certifications: "",
            resume_path: null,
            profile_picture_path: profile.company_logo_path || null,
            city: resolvedCity,
            rating: profile.rating ? String(profile.rating) : "0.0",
          });
          setCandDetailTab("personal");
          setIsDocsDrawerOpen(false);
          setIsPreviewingDoc(false);
          setPreviewDoc(null);
          return;
        }
      }

      setSelectedCandidateDetails({
        user_id: targetUserId,
        applicant_name: fallbackName,
        email: fallbackEmail || "",
        phone: fallbackPhone || "",
        desired_job_title: "Applicant",
        work_arrangement: "On-Site",
        expected_salary: "Not specified",
        skills: "",
        qualifications: "",
        certifications: "",
        resume_path: null,
        city: "Cavite",
      });
      setCandDetailTab("personal");
      setIsDocsDrawerOpen(false);
      setIsPreviewingDoc(false);
      setPreviewDoc(null);
    } catch {
      setSelectedCandidateDetails({
        user_id: targetUserId,
        applicant_name: fallbackName,
        email: fallbackEmail || "",
        phone: fallbackPhone || "",
        desired_job_title: "Applicant",
        work_arrangement: "On-Site",
        expected_salary: "Not specified",
        skills: "",
        qualifications: "",
        certifications: "",
        resume_path: null,
        city: "Cavite",
      });
      setCandDetailTab("personal");
      setIsDocsDrawerOpen(false);
      setIsPreviewingDoc(false);
      setPreviewDoc(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchThreads = async (userId: number) => {
    setIsLoadingThreads(true);
    try {
      const res = await fetch(`/api/users/${userId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const loadedThreads = data?.threads || [];
        setThreads(loadedThreads);
        if (loadedThreads.length > 0 && !selectedThread) {
          setSelectedThread(loadedThreads[0]);
        }
      }
    } catch {
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const markThreadAsRead = async (threadId: number, uid?: number | null) => {
    const targetUserId = uid || currentUserId;
    if (!targetUserId || !threadId) return;
    try {
      await fetch(`/api/messages/threads/${threadId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: targetUserId }),
      });
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unread_count: 0 } : t))
      );
      window.dispatchEvent(new Event("elitecruit_messages_update"));
    } catch {}
  };

  const fetchThreadMessages = async (threadId: number, uid?: number | null) => {
    try {
      const res = await fetch(`/api/messages/threads/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data?.messages || []);
      }
      markThreadAsRead(threadId, uid);
    } catch {}
  };

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) return;
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

      if (savedUser.id) {
        setCurrentUserId(savedUser.id);
        fetchThreads(savedUser.id);
      }

      if (savedUser.role === "employer") {
        setSessionRole("employer");
        if (savedUser.id) {
          fetchEmployerJobs(savedUser.id);
        }
        return;
      }
      setSessionRole("applicant");
      if (savedUser.id) {
        fetch(`/api/applicants/${savedUser.id}/applications`)
          .then((res) => res.json())
          .then((data) => {
            const ids = Array.isArray(data?.applications)
              ? data.applications.map((item: any) => Number(item?.job_post_id)).filter(Boolean)
              : [];
            setAppliedJobIds(ids);
          })
          .catch(() => {});
      }
      const first = savedUser.first_name || savedUser.firstName || "";
      const last = savedUser.last_name || savedUser.lastName || "";
      const fullName = `${first} ${last}`.trim() || savedUser.email || "Applicant";
      setApplicantLabel(fullName);

      if (!savedUser.id) {
        return;
      }

      fetch(`/api/applicants/${savedUser.id}/profile`)
        .then((response) => response.json())
        .then((data) => {
          const profile = data?.profile;
          if (profile) {
            setApplicantOwnProfile(profile);
            const apiName = [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(" ");
            if (apiName) {
              setApplicantLabel(apiName);
            }
          }
        })
        .catch(() => {
          // Keep local fallback name when profile API is unavailable.
        });
    } catch {
      setSessionRole("applicant");
    }
  }, []);

  useEffect(() => {
    if (selectedThread?.id) {
      setIsAppliedSectionOpen(true);
      setIsRecruitedSectionOpen(false);
      setIsOtherJobsSectionOpen(false);
      fetchThreadMessages(selectedThread.id);
      if (isInfoSidebarOpen) {
        fetchCompanyJobs(selectedThread.id);
      }
      if (isEmployer && selectedThread.other_user_id) {
        fetch(`/api/applicants/${selectedThread.other_user_id}/profile`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.profile) {
              setApplicantProfile(data.profile);
            }
          })
          .catch(() => {});
      }
    }
  }, [selectedThread?.id, isEmployer, selectedThread?.other_user_id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeText.trim() || !selectedThread?.id || !currentUserId || isSending) return;

    const textToSend = composeText.trim();
    setIsSending(true);
    setComposeText("");

    try {
      const res = await fetch(`/api/messages/threads/${selectedThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_user_id: currentUserId,
          message_text: textToSend,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.message) {
          setMessages((prev) => [...prev, data.message]);
          // Update thread list preview
          setThreads((prev) =>
            prev.map((t) =>
              t.id === selectedThread.id
                ? { ...t, last_message: textToSend, last_message_time: new Date().toISOString() }
                : t
            )
          );
          window.dispatchEvent(new Event("elitecruit_messages_update"));
        }
      }
    } catch {
      alert("Unable to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const filteredThreads = threads.filter((t) => {
    const isRecruited = Boolean(t.is_invited) || Boolean(t.title && t.title.toLowerCase().includes("job invitation"));
    if (filterType === "applied" && isRecruited) return false;
    if (filterType === "recruited" && !isRecruited) return false;

    if (isEmployer && selectedJobFilter !== "all") {
      const jobObj = employerJobs.find((j) => String(j.id) === selectedJobFilter);
      if (jobObj && t.title) {
        const match = t.title.toLowerCase().includes(jobObj.title.toLowerCase());
        if (!match) return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const name = (t.other_user_name || t.title || "").toLowerCase();
    const lastMsg = (t.last_message || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || lastMsg.includes(q);
  });

  return (
    <div className="messages-page appdash-page sidebar-visible">
      {isEmployer ? (
        <aside className="appdash-sidebar" aria-label="Employer Navigation">
          <a href="/" className="appdash-brand">
            <strong>EliteCruit</strong>
            <span>Employer Workspace</span>
          </a>

          <div className="employer-links-wrap">
            <ul className="appdash-secondary-list">
              <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
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
              <li className="active"><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
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
      ) : (
        <aside className="appdash-sidebar" aria-label="Applicant Navigation">
          <a href="/" className="appdash-brand"><strong>EliteCruit</strong><span>Candidate Workspace</span></a>
          <ul className="appdash-secondary-list">
            <li className="applicant-workspace-item">
              <a
                href="/applicant-dashboard"
                className="applicant-workspace-title"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest(".title-caret-btn")) {
                    e.preventDefault();
                    setIsWorkspaceOpen((prev) => !prev);
                  }
                }}
              >
                <span className="title-main">
                  <span className="item-icon"><SideIcon name="overview" /></span>
                  <span>Applicant Workspace</span>
                </span>
                <span className="title-caret-btn" title="Toggle sub-menu">
                  <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
                </span>
              </a>

              {isWorkspaceOpen && (
                <ul className="appdash-menu-list">
                  <li><a href="/applicant-dashboard#section-overview"><span className="item-icon"><SideIcon name="overview" /></span><span>Overview</span></a></li>
                  <li><a href="/applicant-dashboard#section-smart-matches"><span className="item-icon"><SideIcon name="star" /></span><span>Smart Matches</span></a></li>
                  <li><a href="/applicant-dashboard#section-applications"><span className="item-icon"><SideIcon name="applications" /></span><span>My Applications</span></a></li>
                  <li><a href="/applicant-dashboard#section-invitations"><span className="item-icon"><SideIcon name="notifications" /></span><span>Job Invitations</span></a></li>
                </ul>
              )}
            </li>

            <li><a href="/job-search"><span className="item-icon"><SideIcon name="search" /></span><span>Job Search</span></a></li>
            <li className="active"><a href="/messages"><span className="item-icon"><SideIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
            <li><a href="/notifications"><span className="item-icon"><SideIcon name="notifications" /></span><span>Notifications</span>{unreadNotifCount > 0 && <span className="item-badge">{unreadNotifCount}</span>}</a></li>
            <li><a href="/feedback"><span className="item-icon"><SideIcon name="feedback" /></span><span>Feedback</span></a></li>
          </ul>
          <div className="appdash-profile-control"><button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)}><span className="item-icon"><SideIcon name="profile" /></span><span className="profile-user-copy"><strong>{applicantLabel}</strong><small>Applicant</small></span><ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} /></button>{isProfileMenuOpen && <div className="appdash-profile-menu"><a href="/my-profile"><SideIcon name="profile" />My Profile</a><button type="button" className="appdash-profile-menu-btn" onClick={() => setIsLogoutModalOpen(true)}><SideIcon name="logout" />Logout</button></div>}</div>
        </aside>
      )}

      <main className="appdash-main messages-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Messages</strong></div></div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              {isEmployer ? (
                <EmployerChatbotDrawer
                  isOpen={isChatbotOpen}
                  onToggle={() => setIsChatbotOpen((prev) => !prev)}
                  pageTitle="Messages"
                  customFaqs={employerMessagesFaqs}
                />
              ) : (
                <ApplicantChatbotDrawer
                  isOpen={isChatbotOpen}
                  onToggle={() => setIsChatbotOpen((prev) => !prev)}
                  pageTitle="Messages"
                />
              )}
            </div>
            <CalendarDrawer />
          </div>
        </header>

        <section className={`messages-shell ${isInfoSidebarOpen && selectedThread ? "with-info-sidebar" : ""}`}>
          <aside className="thread-list-panel">
            <div className="thread-list-header">
              {!isEmployer && (
                <>
                  <label className="job-opening-select-label">Filter</label>
                  <select
                    className="job-opening-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as "all" | "applied" | "recruited")}
                  >
                    <option value="all">All Messages</option>
                    <option value="applied">By Applied</option>
                    <option value="recruited">By Recruited</option>
                  </select>
                </>
              )}

              {isEmployer && (
                <>
                  <label className="job-opening-select-label">Job Opening</label>
                  <select
                    className="job-opening-select"
                    value={selectedJobFilter}
                    onChange={(e) => setSelectedJobFilter(e.target.value)}
                  >
                    <option value="all">All Job Openings</option>
                    {employerJobs.map((job) => (
                      <option key={job.id} value={String(job.id)}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <input
              className="thread-search"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="thread-list">
              {isLoadingThreads ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                  Loading conversations...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                  No conversations found.
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const displayName = thread.other_user_name || thread.title || "Conversation";
                  const isSelected = selectedThread?.id === thread.id;
                  const isRecruited = Boolean(thread.is_invited) || Boolean(thread.title?.toLowerCase().includes("job invitation"));
                  return (
                    <article
                      key={thread.id}
                      className={`thread-row ${isSelected ? "active" : ""}`}
                      onClick={() => setSelectedThread(thread)}
                    >
                      <span className="avatar-dot" style={{ overflow: "hidden", position: "relative" }}>
                        {thread.other_user_avatar ? (
                          <img
                            src={thread.other_user_avatar}
                            alt={displayName}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                              }
                            }}
                          />
                        ) : null}
                        <span style={{ display: thread.other_user_avatar ? "none" : "inline" }}>
                          {initialsFromName(displayName)}
                        </span>
                      </span>
                      <div className="thread-copy">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                          <strong style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</strong>
                          {Number(thread.unread_count || 0) > 0 && !isSelected && (
                            <span className="item-badge" style={{ flexShrink: 0 }}>
                              {thread.unread_count}
                            </span>
                          )}
                        </div>
                        <p>{thread.last_message || "No messages yet"}</p>
                        <small>{thread.last_message_time ? new Date(thread.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recent"}</small>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </aside>

          <section className="chat-panel">
            {selectedThread ? (
              <>
                <header className="chat-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <span className="avatar-dot" style={{ overflow: "hidden", position: "relative" }}>
                      {selectedThread.other_user_avatar ? (
                        <img
                          src={selectedThread.other_user_avatar}
                          alt={selectedThread.other_user_name || selectedThread.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                            }
                          }}
                        />
                      ) : null}
                      <span style={{ display: selectedThread.other_user_avatar ? "none" : "inline" }}>
                        {initialsFromName(selectedThread.other_user_name || selectedThread.title)}
                      </span>
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong>{selectedThread.other_user_name || selectedThread.title || (isEmployer ? "Applicant" : "Employer")}</strong>
                      <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "0.82rem" }}>
                        {selectedThread.other_user_email || "No email"}
                        {selectedThread.other_user_phone ? ` · ${selectedThread.other_user_phone}` : ""}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {selectedThread.other_user_id && (
                      <button
                        type="button"
                        className="chat-details-btn"
                        onClick={() =>
                          isEmployer
                            ? handleOpenDetails(
                                selectedThread.other_user_id!,
                                selectedThread.other_user_name || "Applicant",
                                selectedThread.other_user_email,
                                selectedThread.other_user_phone
                              )
                            : handleOpenCompanyDetails(
                                selectedThread.other_user_id!,
                                selectedThread.other_user_name || "Employer",
                                selectedThread.other_user_email,
                                selectedThread.other_user_phone
                              )
                        }
                        disabled={isLoadingDetails}
                      >
                        {isLoadingDetails ? "Loading..." : "Details"}
                      </button>
                    )}

                    {selectedThread.other_user_id && (
                      <button
                        type="button"
                        className={`chat-header-info-btn ${isInfoSidebarOpen ? "active" : ""}`}
                        onClick={handleToggleInfoSidebar}
                        title="Company Jobs & Information"
                        aria-label="Toggle Company Jobs & Information"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </header>

                <div className="chat-body">
                  {messages.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>No messages yet in this conversation.</p>
                      <small>Send a message below to get started.</small>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.sender_user_id === currentUserId;
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const showSeparator = shouldShowTimeSeparator(msg, prevMsg);

                      return (
                        <React.Fragment key={msg.id || idx}>
                          {showSeparator && (
                            <div className="chat-time-separator">
                              <span className="chat-time-separator-text">
                                {formatFacebookTimestamp(msg.created_at)}
                              </span>
                            </div>
                          )}
                          <article className={`chat-bubble ${isMe ? "outgoing" : "incoming"}`}>
                            <small>{isMe ? "You" : selectedThread.other_user_name || "Sender"}</small>
                            <p>{msg.message_text}</p>
                            <time>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</time>
                          </article>
                        </React.Fragment>
                      );
                    })
                  )}
                </div>

                <form className="chat-compose" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    disabled={isSending}
                  />
                  <button type="submit" className="send-btn" disabled={!composeText.trim() || isSending}>
                    {isSending ? "Sending..." : "Send"}
                  </button>
                </form>
              </>
            ) : (
              <div className="chat-empty">
                <p>Select a conversation to start chatting</p>
              </div>
            )}
          </section>

          {isInfoSidebarOpen && selectedThread && (
            <aside className="chat-info-sidebar">
              <div className="chat-info-top-bar">
                <span className="chat-info-top-title">
                  {isEmployer ? "Candidate Jobs & Recruitment" : "Company Jobs & Openings"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    className="chat-info-refresh-head-btn"
                    onClick={() => fetchCompanyJobs(selectedThread.id)}
                    disabled={companyJobsLoading}
                    title="Refresh jobs"
                    aria-label="Refresh jobs"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="chat-info-close-btn"
                    onClick={() => setIsInfoSidebarOpen(false)}
                    title="Close Details Panel"
                    aria-label="Close Details Panel"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {inviteSuccessMsg && (
                <div className="chat-info-banner-success">
                  ✓ {inviteSuccessMsg}
                </div>
              )}

              <div className="chat-info-sections">
                {/* ── SECTION 1: APPLIED POSITIONS ── */}
                <div className="chat-info-accordion-item">
                  <button
                    type="button"
                    className="chat-info-accordion-btn"
                    onClick={() => setIsAppliedSectionOpen((prev) => !prev)}
                  >
                    <div className="chat-info-accordion-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <strong>{isEmployer ? "Candidate Applications" : "Your Applications"}</strong>
                      {companyJobsData && (
                        <span className="chat-info-badge-count">
                          {appliedJobsList.length}
                        </span>
                      )}
                    </div>
                    <ChevronIcon direction={isAppliedSectionOpen ? "up" : "down"} />
                  </button>

                  {isAppliedSectionOpen && (
                    <div className="chat-info-accordion-content">
                      {companyJobsLoading ? (
                        <div className="chat-info-state-msg">Loading applications...</div>
                      ) : appliedJobsList.length === 0 ? (
                        <div className="chat-info-state-msg">
                          {isEmployer
                            ? "Candidate has not submitted applications for any open jobs yet."
                            : "You have not submitted direct applications to this employer yet."}
                        </div>
                      ) : (
                        <div className="chat-info-card-list">
                          {appliedJobsList.map((job: any) => {
                            const status = (job.application?.status || "submitted").toLowerCase();

                            if (isEmployer) {
                              const candMatchPct = targetCandidate ? calculateCandidateMatch(targetCandidate, job) : 0;
                              const matchColor = getMatchColorClass(candMatchPct);

                              return (
                                <div key={`side-applied-${job.id}`} className="chat-info-job-item employer-applied">
                                  <div className="chat-info-job-head">
                                    <span className="chat-info-job-title">{job.title}</span>
                                    <span className={`chat-info-match-badge ${matchColor}`}>
                                      {candMatchPct}% Match
                                    </span>
                                  </div>

                                  <div className="chat-info-tag-row">
                                    <span className={`cjm-status-chip ${status === "reviewed" ? "under-review" : status}`}>
                                      {status === "approved"
                                        ? "Approved"
                                        : status === "denied"
                                        ? "Denied"
                                        : status === "shortlisted"
                                        ? "Shortlisted"
                                        : status === "reviewed" || status === "under_review"
                                        ? "Under Review"
                                        : "Submitted"}
                                    </span>
                                    <span className="chat-info-setup-badge">{job.work_arrangement || "On-Site"}</span>
                                  </div>

                                  <div className="chat-info-job-meta">
                                    <small style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                      </svg>
                                      Applied: {job.application?.submitted_at ? new Date(job.application.submitted_at).toLocaleDateString() : "Recent"}
                                      {job.application?.decided_at && (
                                        <> · Decided: {new Date(job.application.decided_at).toLocaleDateString()}</>
                                      )}
                                    </small>
                                    <small style={{ display: "flex", alignItems: "center", gap: "4px", color: "#64748b" }}>
                                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                                        <circle cx="12" cy="10" r="2.5" />
                                      </svg>
                                      {job.location || "Cavite"}
                                    </small>
                                  </div>

                                  <div className="chat-info-job-actions">
                                    <button
                                      type="button"
                                      className="chat-info-sm-btn view"
                                      onClick={() => handleOpenEmployerJobDetails(job)}
                                    >
                                      View Details
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            // Applicant View
                            return (
                              <div key={`side-applied-${job.id}`} className="chat-info-job-item applicant-applied">
                                <div className="chat-info-job-head">
                                  <span className="chat-info-job-title">{job.title}</span>
                                  <span className={`cjm-status-chip ${status === "reviewed" ? "under-review" : status}`}>
                                    {status === "approved"
                                      ? "Approved"
                                      : status === "denied"
                                      ? "Denied"
                                      : status === "shortlisted"
                                      ? "Shortlisted"
                                      : status === "reviewed" || status === "under_review"
                                      ? "Under Review"
                                      : "Submitted"}
                                  </span>
                                </div>

                                <div className="chat-info-tag-row">
                                  <span className="chat-info-setup-badge">{job.work_arrangement || "Flexible"}</span>
                                  <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{job.location || "Cavite"}</span>
                                </div>

                                <div className="chat-info-job-meta">
                                  {(job.salary_min || job.salary_max) && (
                                    <small style={{ color: "#0369a1", fontWeight: 700, display: "block", marginBottom: "2px" }}>
                                      PHP {Number(job.salary_min || 0).toLocaleString()}{job.salary_max ? ` - ${Number(job.salary_max).toLocaleString()}` : "+"}
                                    </small>
                                  )}
                                  <small style={{ color: "#64748b", display: "block" }}>
                                    Applied: {job.application?.submitted_at ? new Date(job.application.submitted_at).toLocaleDateString() : "Recent"}
                                    {job.application?.decided_at && (
                                      <> · Decided: {new Date(job.application.decided_at).toLocaleDateString()}</>
                                    )}
                                  </small>
                                </div>

                                <div className="chat-info-job-actions">
                                  <button
                                    type="button"
                                    className="chat-info-sm-btn view"
                                    onClick={() => handleOpenJobDetailsForApplicant(job.id, null)}
                                  >
                                    View Job Details
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── SECTION 2: RECRUITED POSITIONS / DIRECT INVITATIONS ── */}
                <div className="chat-info-accordion-item">
                  <button
                    type="button"
                    className="chat-info-accordion-btn"
                    onClick={() => setIsRecruitedSectionOpen((prev) => !prev)}
                  >
                    <div className="chat-info-accordion-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <polyline points="16 11 18 13 22 9" />
                      </svg>
                      <strong>{isEmployer ? "Recruited Positions" : "Recruited Positions"}</strong>
                      {companyJobsData && (
                        <span className="chat-info-badge-count">
                          {recruitedJobsList.length}
                        </span>
                      )}
                    </div>
                    <ChevronIcon direction={isRecruitedSectionOpen ? "up" : "down"} />
                  </button>

                  {isRecruitedSectionOpen && (
                    <div className="chat-info-accordion-content">
                      {companyJobsLoading ? (
                        <div className="chat-info-state-msg">Loading recruited positions...</div>
                      ) : recruitedJobsList.length === 0 ? (
                        <div className="chat-info-state-msg">
                          {isEmployer
                            ? "You haven't recruited this candidate for any positions yet."
                            : "You haven't been recruited for any positions by this employer yet."}
                        </div>
                      ) : (
                        <div className="chat-info-card-list">
                          {recruitedJobsList.map((job: any) => {
                            const invStatus = (job.invitation?.status || "pending").toLowerCase();

                            if (isEmployer) {
                              const candMatchPct = targetCandidate ? calculateCandidateMatch(targetCandidate, job) : 0;
                              const matchColor = getMatchColorClass(candMatchPct);

                              return (
                                <div key={`side-recruited-${job.id}`} className="chat-info-job-item employer-recruited">
                                  <div className="chat-info-job-head">
                                    <span className="chat-info-job-title">{job.title}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span className={`chat-info-match-badge ${matchColor}`}>
                                        {candMatchPct}% Match
                                      </span>
                                      <span className={`cjm-status-chip ${invStatus === "accepted" ? "accepted" : invStatus === "declined" ? "declined" : "invited"}`}>
                                        {invStatus === "accepted" ? "Accepted" : invStatus === "declined" ? "Declined" : "Invited"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="chat-info-tag-row">
                                    <span className="chat-info-setup-badge">{job.work_arrangement || "On-Site"}</span>
                                    <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{job.location || "Cavite"}</span>
                                    <span style={{ color: "#475569", fontSize: "0.76rem", fontWeight: 600 }}>· {job.applicant_count || 0} applicants</span>
                                  </div>

                                  <div className="chat-info-job-meta">
                                    {(job.salary_min || job.salary_max) && (
                                      <small style={{ color: "#0369a1", fontWeight: 700, display: "block" }}>
                                        PHP {Number(job.salary_min || 0).toLocaleString()}{job.salary_max ? ` - ${Number(job.salary_max).toLocaleString()}` : "+"}
                                      </small>
                                    )}
                                    <small style={{ color: "#64748b", display: "block" }}>
                                      Recruited: {job.invitation?.created_at ? new Date(job.invitation.created_at).toLocaleDateString() : "Recent"}
                                    </small>
                                  </div>

                                  <div className="chat-info-job-actions">
                                    <button
                                      type="button"
                                      className="chat-info-sm-btn view"
                                      onClick={() => handleOpenEmployerJobDetails(job)}
                                    >
                                      View Post
                                    </button>
                                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#0284c7" }}>
                                      ✓ Recruited ({invStatus === "accepted" ? "Accepted" : invStatus === "declined" ? "Declined" : "Pending"})
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            // Applicant View
                            const appMatchScore = myApplicantMatchInput ? calculateCandidateMatch(myApplicantMatchInput, job) : 75;
                            const appMatchColor = getMatchColorClass(appMatchScore);

                            return (
                              <div key={`side-recruited-${job.id}`} className="chat-info-job-item applicant-recruited">
                                <div className="chat-info-job-head">
                                  <span className="chat-info-job-title">{job.title}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span className={`chat-info-match-badge ${appMatchColor}`}>
                                      {appMatchScore}% Match
                                    </span>
                                    <span className={`cjm-status-chip ${invStatus === "accepted" ? "accepted" : invStatus === "declined" ? "declined" : "invited"}`}>
                                      {invStatus === "accepted" ? "Accepted" : invStatus === "declined" ? "Declined" : "Invited"}
                                    </span>
                                  </div>
                                </div>

                                <div className="chat-info-tag-row">
                                  <span className="chat-info-setup-badge">{job.work_arrangement || "Flexible"}</span>
                                  <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{job.location || "Cavite"}</span>
                                </div>

                                <div className="chat-info-job-meta">
                                  {(job.salary_min || job.salary_max) && (
                                    <small style={{ color: "#0369a1", fontWeight: 700, display: "block" }}>
                                      PHP {Number(job.salary_min || 0).toLocaleString()}{job.salary_max ? ` - ${Number(job.salary_max).toLocaleString()}` : "+"}
                                    </small>
                                  )}
                                  <small style={{ color: "#64748b", display: "block" }}>
                                    Recruited: {job.invitation?.created_at ? new Date(job.invitation.created_at).toLocaleDateString() : "Recent"}
                                  </small>
                                </div>

                                <div className="chat-info-job-actions">
                                  {invStatus === "pending" ? (
                                    <div style={{ display: "flex", gap: "6px", width: "100%", justifyContent: "flex-end" }}>
                                      <button
                                        type="button"
                                        className="chat-info-sm-btn view"
                                        onClick={() => handleOpenJobDetailsForApplicant(job.id, "pending")}
                                      >
                                        Details
                                      </button>
                                      <button
                                        type="button"
                                        className="chat-info-sm-btn decline"
                                        onClick={() => setDeclineInvitationTarget({ type: "byJob", jobId: job.id, title: job.title })}
                                      >
                                        Decline
                                      </button>
                                      <button
                                        type="button"
                                        className="chat-info-sm-btn accept"
                                        onClick={() => handleRespondInvitationByJob(job.id, "accept")}
                                      >
                                        Accept
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="chat-info-sm-btn view"
                                      onClick={() => handleOpenJobDetailsForApplicant(job.id, invStatus as any)}
                                    >
                                      View Job Details
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── SECTION 3: OTHER POSITIONS ── */}
                <div className="chat-info-accordion-item">
                  <button
                    type="button"
                    className="chat-info-accordion-btn"
                    onClick={() => setIsOtherJobsSectionOpen((prev) => !prev)}
                  >
                    <div className="chat-info-accordion-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      <strong>{isEmployer ? "Other Positions (Recruit)" : "Other Openings"}</strong>
                      {companyJobsData && (
                        <span className="chat-info-badge-count">
                          {otherJobsList.length}
                        </span>
                      )}
                    </div>
                    <ChevronIcon direction={isOtherJobsSectionOpen ? "up" : "down"} />
                  </button>

                  {isOtherJobsSectionOpen && (
                    <div className="chat-info-accordion-content">
                      {companyJobsLoading ? (
                        <div className="chat-info-state-msg">Loading other jobs...</div>
                      ) : otherJobsList.length === 0 ? (
                        <div className="chat-info-state-msg">
                          {isEmployer
                            ? "No other active positions to recruit this candidate for."
                            : "No other openings available from this company."}
                        </div>
                      ) : (
                        <div className="chat-info-card-list">
                          {otherJobsList.map((job: any) => {
                            if (isEmployer) {
                              const candMatchPct = targetCandidate ? calculateCandidateMatch(targetCandidate, job) : 0;
                              const matchColor = getMatchColorClass(candMatchPct);

                              return (
                                <div key={`side-other-${job.id}`} className="chat-info-job-item employer-other">
                                  <div className="chat-info-job-head">
                                    <span className="chat-info-job-title">{job.title}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span className={`chat-info-match-badge ${matchColor}`}>
                                        {candMatchPct}% Match
                                      </span>
                                      <span className="cjm-status-chip open">Open</span>
                                    </div>
                                  </div>

                                  <div className="chat-info-tag-row">
                                    <span className="chat-info-setup-badge">{job.work_arrangement || "On-Site"}</span>
                                    <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{job.location || "Cavite"}</span>
                                    <span style={{ color: "#475569", fontSize: "0.76rem", fontWeight: 600 }}>· {job.applicant_count || 0} applicants</span>
                                  </div>

                                  <div className="chat-info-job-meta">
                                    {(job.salary_min || job.salary_max) && (
                                      <small style={{ color: "#0369a1", fontWeight: 700, display: "block" }}>
                                        PHP {Number(job.salary_min || 0).toLocaleString()}{job.salary_max ? ` - ${Number(job.salary_max).toLocaleString()}` : "+"}
                                      </small>
                                    )}
                                  </div>

                                  <div className="chat-info-job-actions">
                                    <button
                                      type="button"
                                      className="chat-info-sm-btn view"
                                      onClick={() => handleOpenEmployerJobDetails(job)}
                                    >
                                      View Post
                                    </button>

                                    <button
                                      type="button"
                                      className="chat-info-sm-btn recruit"
                                      onClick={() => handleOpenInviteModal(job)}
                                    >
                                      Recruit
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            // Applicant View
                            const appMatchScore = myApplicantMatchInput ? calculateCandidateMatch(myApplicantMatchInput, job) : 75;
                            const appMatchColor = getMatchColorClass(appMatchScore);

                            return (
                              <div key={`side-other-${job.id}`} className="chat-info-job-item applicant-other">
                                <div className="chat-info-job-head">
                                  <span className="chat-info-job-title">{job.title}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span className={`chat-info-match-badge ${appMatchColor}`}>
                                      {appMatchScore}% Match
                                    </span>
                                    <span className="cjm-status-chip open">Open</span>
                                  </div>
                                </div>

                                <div className="chat-info-tag-row">
                                  <span className="chat-info-setup-badge">{job.work_arrangement || "Flexible"}</span>
                                  <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{job.location || "Cavite"}</span>
                                </div>

                                <div className="chat-info-job-meta">
                                  {(job.salary_min || job.salary_max) && (
                                    <small style={{ color: "#0369a1", fontWeight: 700, display: "block" }}>
                                      PHP {Number(job.salary_min || 0).toLocaleString()}{job.salary_max ? ` - ${Number(job.salary_max).toLocaleString()}` : "+"}
                                    </small>
                                  )}
                                </div>

                                <div className="chat-info-job-actions">
                                  <button
                                    type="button"
                                    className="chat-info-sm-btn view"
                                    onClick={() => handleOpenJobDetailsForApplicant(job.id, null)}
                                  >
                                    View / Apply
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </section>
      </main>

      {/* Employer Company Profile Details Modal (Applicant View) */}
      {selectedCompanyDetails && (
        <div
          className="jd-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Employer Details"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedCompanyDetails(null);
              setIsFaqDrawerOpen(false);
            }
          }}
        >
          <div className="jd-modal-container" style={{ maxWidth: "700px" }}>
            <div className="jd-panel">
              {/* Cover banner */}
              <div className="jd-cover-banner">
                {selectedCompanyDetails.company_cover_path ? (
                  <img
                    src={
                      selectedCompanyDetails.company_cover_path.startsWith("http") || selectedCompanyDetails.company_cover_path.startsWith("/api")
                        ? selectedCompanyDetails.company_cover_path
                        : `/api/employers/${selectedCompanyDetails.user_id}/cover`
                    }
                    alt={`${selectedCompanyDetails.business_name} cover`}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                      const placeholder = e.currentTarget.parentElement?.querySelector(".jd-cover-placeholder") as HTMLElement;
                      if (placeholder) placeholder.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="jd-cover-placeholder" style={{ display: selectedCompanyDetails.company_cover_path ? "none" : "flex" }}>
                  <span>Company Cover</span>
                </div>
              </div>

              {/* Employer strip underneath banner */}
              <div className="jd-employer-strip">
                <div className="jd-employer-logo-info">
                  <div
                    className="jd-employer-logo"
                    aria-label="Company logo"
                    style={{ overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {(() => {
                      const logoSrc = selectedCompanyDetails.company_logo_path
                        ? selectedCompanyDetails.company_logo_path.startsWith("http") || selectedCompanyDetails.company_logo_path.startsWith("/api")
                          ? selectedCompanyDetails.company_logo_path
                          : `/api/employers/${selectedCompanyDetails.user_id}/logo`
                        : `/api/employers/${selectedCompanyDetails.user_id}/logo`;
                      return (
                        <>
                          <img
                            src={logoSrc}
                            alt={selectedCompanyDetails.business_name}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
                              }
                            }}
                          />
                          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ display: "none", width: "32px", height: "32px", stroke: "#0284c7" }}>
                            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
                          </svg>
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <strong className="jd-employer-name">{selectedCompanyDetails.business_name}</strong>
                    <span className="jd-employer-location">
                      <svg viewBox="0 0 24 24" aria-hidden="true" width="13" height="13" fill="none" stroke="#5b8ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      {selectedCompanyDetails.industry || "General Industry"}
                    </span>
                  </div>
                </div>

                <div className="jd-header-right-actions">
                  <div className="rating-score-box" title="Company rating">
                    <span className="star-icon">★</span>
                    <span>{selectedCompanyDetails.rating ? Number(selectedCompanyDetails.rating).toFixed(1) : "0.0"}</span>
                  </div>
                  <button
                    type="button"
                    className={`jd-faq-btn ${isFaqDrawerOpen ? "active" : ""}`}
                    onClick={() => {
                      if (isFaqDrawerOpen) {
                        setIsFaqDrawerOpen(false);
                      } else {
                        handleOpenCompanyFaqs(selectedCompanyDetails.user_id);
                      }
                    }}
                  >
                    FAQ's
                  </button>
                </div>
              </div>

              {/* Scrollable body & drawer container */}
              <div className="jd-body-wrapper" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div className="jd-body" style={{ maxHeight: "calc(88vh - 280px)", overflowY: "auto", padding: "20px 24px" }}>
                  {/* Section: Company Overview */}
                  <div style={{ marginBottom: "24px" }}>
                    <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, marginBottom: "8px" }}>
                      About Company
                    </h3>
                    <p style={{ color: "#334155", fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
                      {selectedCompanyDetails.company_description || "No company description provided."}
                    </p>
                  </div>

                  {/* Section: Contact & Company Information Cards */}
                  <div style={{ marginBottom: "24px" }}>
                    <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, marginBottom: "12px" }}>
                      Contact Information
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                      <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <small style={{ color: "#64748b", display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>BUSINESS EMAIL</small>
                        <span style={{ color: "#0f172a", fontSize: "0.88rem", fontWeight: 600, wordBreak: "break-all" }}>
                          {selectedCompanyDetails.business_email || "Not provided"}
                        </span>
                      </div>

                      <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <small style={{ color: "#64748b", display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>CONTACT NUMBER</small>
                        <span style={{ color: "#0f172a", fontSize: "0.88rem", fontWeight: 600 }}>
                          {selectedCompanyDetails.contact_number || "Not provided"}
                        </span>
                      </div>

                      {selectedCompanyDetails.website && (
                        <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <small style={{ color: "#64748b", display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>WEBSITE</small>
                          <a
                            href={selectedCompanyDetails.website.startsWith("http") ? selectedCompanyDetails.website : `https://${selectedCompanyDetails.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0284c7", fontSize: "0.88rem", fontWeight: 600, textDecoration: "underline", wordBreak: "break-all" }}
                          >
                            {selectedCompanyDetails.website}
                          </a>
                        </div>
                      )}

                      <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <small style={{ color: "#64748b", display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>HEADQUARTERS</small>
                        <span style={{ color: "#0f172a", fontSize: "0.88rem", fontWeight: 600 }}>
                          {selectedCompanyDetails.company_address || selectedCompanyDetails.city || "Cavite"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide-in FAQ Drawer */}
                <div className={`jd-faq-drawer ${isFaqDrawerOpen ? "open" : ""}`}>
                  <div className="jd-faq-header">
                    <h3>Company FAQ's</h3>
                    <button type="button" className="jd-faq-back-btn" aria-label="Back to company details" onClick={() => setIsFaqDrawerOpen(false)}>
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

              {/* Modal Footer */}
              <div className="jd-footer" style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="cand-details-cancel-btn"
                  onClick={() => {
                    setSelectedCompanyDetails(null);
                    setIsFaqDrawerOpen(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Profile Details Modal (Employer View) */}
      {selectedCandidateDetails && (
        <div
          className="cand-details-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Candidate Details"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedCandidateDetails(null);
              setIsDocsDrawerOpen(false);
              setIsPreviewingDoc(false);
              setCandidateDocuments([]);
              setPreviewDoc(null);
            }
          }}
        >
          <div className="cand-details-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cand-details-strip" style={{ paddingTop: "20px" }}>
              <div className="cand-details-logo-info">
                <div className="cand-details-logo" aria-label="Candidate initials">
                  {selectedCandidateDetails.profile_picture_path ? (
                    <img
                      src={
                        selectedCandidateDetails.profile_picture_path.startsWith("http") || selectedCandidateDetails.profile_picture_path.startsWith("/api")
                          ? selectedCandidateDetails.profile_picture_path
                          : `/api/applicants/${selectedCandidateDetails.user_id}/profile-picture`
                      }
                      alt={selectedCandidateDetails.applicant_name}
                      style={{ width: "100%", height: "100%", borderRadius: "12px", objectFit: "cover" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                        }
                      }}
                    />
                  ) : null}
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#ffffff",
                      fontSize: "1.05rem",
                      display: selectedCandidateDetails.profile_picture_path ? "none" : "inline",
                    }}
                  >
                    {initialsFromName(selectedCandidateDetails.applicant_name)}
                  </span>
                </div>
                <div>
                  <strong className="cand-details-name">{selectedCandidateDetails.applicant_name}</strong>
                  <span className="cand-details-location" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "3px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      {formatLocationWithCavite(selectedCandidateDetails.city || selectedCandidateDetails.address)}
                    </span>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      {selectedCandidateDetails.email || "No email"}
                    </span>
                    {selectedCandidateDetails.phone && (
                      <>
                        <span style={{ color: "#cbd5e1" }}>•</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {selectedCandidateDetails.phone}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </div>
              <div className="cand-details-header-right">
                <div className="rating-score-box" title="Applicant rating">
                  <span className="star-icon">★</span>
                  <span>{selectedCandidateDetails.rating ? Number(selectedCandidateDetails.rating).toFixed(1) : "0.0"}</span>
                </div>
                <button
                  type="button"
                  className={`cand-details-docs-btn ${isDocsDrawerOpen ? "active" : ""}`}
                  onClick={() => {
                    setIsDocsDrawerOpen((prev) => {
                      const next = !prev;
                      if (next && selectedCandidateDetails.user_id) {
                        fetchCandidateDocuments(selectedCandidateDetails.user_id);
                      }
                      return next;
                    });
                  }}
                >
                  Docs
                </button>
              </div>
            </div>

            {/* 4-SECTION NAVIGATION TABS (Matching Applicant Profile Design) */}
            <div className="cand-modal-nav-wrap">
              <nav className="profile-section-nav cand-modal-tabs" aria-label="Profile Sections">
                <button
                  type="button"
                  className={`section-nav-btn ${candDetailTab === "personal" ? "active" : ""}`}
                  onClick={() => {
                    setCandDetailTab("personal");
                    setIsDocsDrawerOpen(false);
                    setIsPreviewingDoc(false);
                  }}
                >
                  <span className="nav-num">1</span>
                  <span>Personal & Contact</span>
                </button>
                <button
                  type="button"
                  className={`section-nav-btn ${candDetailTab === "preferences" ? "active" : ""}`}
                  onClick={() => {
                    setCandDetailTab("preferences");
                    setIsDocsDrawerOpen(false);
                    setIsPreviewingDoc(false);
                  }}
                >
                  <span className="nav-num">2</span>
                  <span>Career Preferences</span>
                </button>
                <button
                  type="button"
                  className={`section-nav-btn ${candDetailTab === "competencies" ? "active" : ""}`}
                  onClick={() => {
                    setCandDetailTab("competencies");
                    setIsDocsDrawerOpen(false);
                    setIsPreviewingDoc(false);
                  }}
                >
                  <span className="nav-num">3</span>
                  <span>Skills & Credentials</span>
                </button>
                <button
                  type="button"
                  className={`section-nav-btn ${candDetailTab === "experience" ? "active" : ""}`}
                  onClick={() => {
                    setCandDetailTab("experience");
                    setIsDocsDrawerOpen(false);
                    setIsPreviewingDoc(false);
                  }}
                >
                  <span className="nav-num">4</span>
                  <span>Work Experience</span>
                </button>
              </nav>
            </div>

            <div className="cand-details-body-wrapper">
              <div className="cand-details-body">
                {/* TAB 1: PERSONAL & CONTACT */}
                {candDetailTab === "personal" && (
                  <div className="cand-tab-content">
                    <div className="cand-details-card">
                      <div className="cand-card-header">
                        <h4>Professional Summary</h4>
                      </div>
                      <p className="cand-summary-text">
                        {selectedCandidateDetails.summary || "No professional summary provided by the applicant."}
                      </p>
                    </div>

                    <div className="cand-details-card">
                      <div className="cand-card-header">
                        <h4>Languages Spoken</h4>
                      </div>
                      <div className="cand-details-tags-wrap">
                        {parseItemList(selectedCandidateDetails.languages, []).length > 0 ? (
                          parseItemList(selectedCandidateDetails.languages, []).map((lang, idx) => (
                            <span key={idx} className="js-tag-chip js-tag-skill">{lang}</span>
                          ))
                        ) : (
                          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No specific languages specified</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CAREER PREFERENCES */}
                {candDetailTab === "preferences" && (
                  <div className="cand-tab-content">
                    <div className="cand-details-card">
                      <div className="cand-card-header">
                        <h4>Career Target</h4>
                      </div>
                      <div className="cand-info-row">
                        <div className="cand-info-item">
                          <span className="cand-info-label">Desired Job Title</span>
                          <span className="cand-info-val highlight">{selectedCandidateDetails.desired_job_title || "Not specified"}</span>
                        </div>
                        {(() => {
                          const sal = parseCandidateSalaryRange(selectedCandidateDetails);
                          return (
                            <>
                              <div className="cand-info-item">
                                <span className="cand-info-label">Minimum Expected Salary</span>
                                <span className="cand-info-val">{sal.min}</span>
                              </div>
                              <div className="cand-info-item">
                                <span className="cand-info-label">Maximum Expected Salary</span>
                                <span className="cand-info-val">{sal.max}</span>
                              </div>
                            </>
                          );
                        })()}
                        <div className="cand-info-item">
                          <span className="cand-info-label">Work Arrangement</span>
                          <span className="setup-pill" style={{ alignSelf: "flex-start", marginTop: "2px" }}>
                            {selectedCandidateDetails.work_arrangement || "On-site"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="cand-details-card">
                      <div className="cand-card-header">
                        <h4>Geographic & Discovery Location</h4>
                      </div>
                      <div className="cand-info-row">
                        <div className="cand-info-item">
                          <span className="cand-info-label">Designated Nearby Location</span>
                          <span className="cand-info-val highlight">
                            {selectedCandidateDetails.nearby_location || selectedCandidateDetails.city || "Not designated"}
                          </span>
                        </div>
                        <div className="cand-info-item">
                          <span className="cand-info-label">Home Address / Municipality</span>
                          <span className="cand-info-val">
                            {selectedCandidateDetails.address || selectedCandidateDetails.city || "Not specified"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="cand-details-card">
                      <div className="cand-card-header">
                        <h4>Preferred Work Locations</h4>
                      </div>
                      <div className="cand-details-tags-wrap">
                        {parsePreferredLocationTags(selectedCandidateDetails.preferred_locations).length > 0 ? (
                          parsePreferredLocationTags(selectedCandidateDetails.preferred_locations).map((loc, idx) => (
                            <span key={idx} className="js-tag-chip js-tag-skill" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                              {loc}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No preferred location restrictions specified</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SKILLS & CREDENTIALS */}
                {candDetailTab === "competencies" && (
                  <div className="cand-tab-content">
                    {(() => {
                      const allQuals = parseItemList(selectedCandidateDetails.qualifications, []);
                      const shsList = allQuals.filter(isShsItem);
                      const collegeList = allQuals.filter((q) => !isShsItem(q));
                      const skillsList = parseItemList(selectedCandidateDetails.skills, []);
                      const certList = parseItemList(selectedCandidateDetails.certifications, []);

                      return (
                        <>
                          {/* 1. Senior High School & Vocational Education */}
                          <div className="cand-details-card">
                            <div className="cand-card-header">
                              <h4>Senior High School & Vocational</h4>
                            </div>
                            <div className="cand-details-tags-wrap">
                              {shsList.length > 0 ? (
                                shsList.map((q, idx) => (
                                  <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                                ))
                              ) : (
                                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No senior high / vocational records listed</span>
                              )}
                            </div>
                          </div>

                          {/* 2. College & Tertiary Education */}
                          <div className="cand-details-card">
                            <div className="cand-card-header">
                              <h4>College & Tertiary Education</h4>
                            </div>
                            <div className="cand-details-tags-wrap">
                              {collegeList.length > 0 ? (
                                collegeList.map((q, idx) => (
                                  <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                                ))
                              ) : (
                                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No college / tertiary degree listed</span>
                              )}
                            </div>
                          </div>

                          {/* 3. Core Technical Skills */}
                          <div className="cand-details-card">
                            <div className="cand-card-header">
                              <h4>Core Technical Skills</h4>
                            </div>
                            <div className="cand-details-tags-wrap">
                              {skillsList.length > 0 ? (
                                skillsList.map((s, idx) => (
                                  <span key={idx} className="js-tag-chip js-tag-skill">{s}</span>
                                ))
                              ) : (
                                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No technical skills listed</span>
                              )}
                            </div>
                          </div>

                          {/* 4. Professional Certifications */}
                          <div className="cand-details-card">
                            <div className="cand-card-header">
                              <h4>Professional Certifications</h4>
                            </div>
                            <div className="cand-details-tags-wrap">
                              {certList.length > 0 ? (
                                certList.map((c, idx) => (
                                  <span key={idx} className="js-tag-chip" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>{c}</span>
                                ))
                              ) : (
                                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No certifications listed</span>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* TAB 4: WORK EXPERIENCE */}
                {candDetailTab === "experience" && (
                  <div className="cand-tab-content">
                    {selectedCandidateDetails.years_of_experience && (
                      <div className="cand-exp-banner">
                        <strong>Total Professional Experience:</strong> {selectedCandidateDetails.years_of_experience}
                      </div>
                    )}

                    {(() => {
                      let parsedWorkExp: WorkExpItem[] = [];
                      if (selectedCandidateDetails.work_experience_json) {
                        try {
                          const parsed = JSON.parse(selectedCandidateDetails.work_experience_json);
                          if (Array.isArray(parsed)) parsedWorkExp = parsed;
                        } catch {}
                      }

                      if (parsedWorkExp.length === 0) {
                        return (
                          <div className="cand-details-card" style={{ textAlign: "center", padding: "36px 20px" }}>
                            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                              No employment history entries added by the applicant.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="cand-work-exp-list">
                          {parsedWorkExp.map((exp, idx) => (
                            <div key={exp.id || idx} className="cand-work-exp-card">
                              <div className="cand-exp-header">
                                <div>
                                  <h4 className="cand-exp-title">{exp.title}</h4>
                                  <span className="cand-exp-company">{exp.company}</span>
                                  {(exp.city || exp.province) && (
                                    <span className="cand-exp-loc"> • {[exp.city, exp.province].filter(Boolean).join(", ")}</span>
                                  )}
                                </div>
                                <div className="cand-exp-period">
                                  {exp.isCurrent
                                    ? `${exp.startMonth || ""} ${exp.startYear || ""} - Present`
                                    : `${exp.startMonth || ""} ${exp.startYear || ""} - ${exp.endMonth || ""} ${exp.endYear || ""}`}
                                  {exp.employmentType && <span className="cand-exp-type-pill">{exp.employmentType}</span>}
                                </div>
                              </div>

                              {exp.responsibilities && (
                                <div className="cand-exp-bullets">
                                  {exp.responsibilities.split("\n").filter(Boolean).map((bullet, bIdx) => (
                                    <p key={bIdx} className="cand-exp-bullet-line">
                                      {bullet.startsWith("•") ? bullet : `• ${bullet}`}
                                    </p>
                                  ))}
                                </div>
                              )}

                              {Array.isArray(exp.skills) && exp.skills.length > 0 && (
                                <div className="cand-exp-skills-row">
                                  <span className="cand-exp-skills-label">Technologies / Skills:</span>
                                  <div className="cand-details-tags-wrap">
                                    {exp.skills.map((sk, sIdx) => (
                                      <span key={sIdx} className="js-tag-chip js-tag-skill" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                                        {sk}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Slide-in Docs Drawer */}
              <div className={`cand-details-docs-drawer ${isDocsDrawerOpen ? "open" : ""}`}>
                <div className="cand-details-docs-header">
                  <h3>{isPreviewingDoc ? "Document Preview" : "Saved Documents"}</h3>
                  <button
                    type="button"
                    className="cand-details-docs-back"
                    onClick={() => {
                      if (isPreviewingDoc) {
                        setIsPreviewingDoc(false);
                        setPreviewDoc(null);
                      } else {
                        setIsDocsDrawerOpen(false);
                      }
                    }}
                  >
                    ←
                  </button>
                </div>
                <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                  {!isPreviewingDoc ? (
                    <>
                      {isDocsLoading ? (
                        <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                          Loading documents...
                        </div>
                      ) : candidateDocuments.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", paddingRight: "4px" }}>
                          {candidateDocuments.map((doc) => {
                            const iconType = getDocIconType(doc.file_name);
                            const iconStyle = getDocIconStyle(iconType);
                            const formattedSize = formatDocBytes(doc.file_size);
                            const uploadDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : null;
                            const subtext = [formattedSize, uploadDate ? `Uploaded ${uploadDate}` : "Attached file"].filter(Boolean).join(" • ") || "Attached file";

                            return (
                              <div
                                key={`${doc.id}-${doc.file_name}`}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "12px 14px",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "10px",
                                  background: "#f8fafc",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1, paddingRight: "10px" }}>
                                  <div
                                    style={{
                                      width: "38px",
                                      height: "38px",
                                      borderRadius: "8px",
                                      background: iconStyle.bg,
                                      color: iconStyle.color,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {iconType === "pdf" && (
                                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                      </svg>
                                    )}
                                    {iconType === "word" && (
                                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <path d="M9 13l2 4 2-4" />
                                      </svg>
                                    )}
                                    {iconType === "image" && (
                                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                      </svg>
                                    )}
                                    {iconType === "generic" && (
                                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                      </svg>
                                    )}
                                  </div>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <strong
                                      style={{
                                        display: "block",
                                        fontSize: "0.9rem",
                                        color: "#0f172a",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                      title={doc.file_name}
                                    >
                                      {doc.file_name}
                                    </strong>
                                    <small style={{ color: "#64748b", fontSize: "0.78rem" }}>{subtext}</small>
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    className="doc-action-view-btn"
                                    onClick={() => {
                                      setPreviewDoc(doc);
                                      setIsPreviewingDoc(true);
                                    }}
                                  >
                                    View
                                  </button>
                                  <a
                                    href={`${doc.url}?download=1`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="doc-action-dl-btn"
                                    title="Download document"
                                  >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="7 10 12 15 17 10" />
                                      <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6" style={{ marginBottom: "10px" }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span style={{ fontSize: "0.85rem", fontWeight: "500" }}>No documents attached by this applicant.</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: "10px", height: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPreviewingDoc(false);
                            setPreviewDoc(null);
                          }}
                          style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", fontSize: "0.84rem", fontWeight: "600", padding: 0, display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          ← Back to list
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                          <span style={{ fontSize: "0.82rem", color: "#475569", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }} title={previewDoc?.file_name}>
                            {previewDoc?.file_name}
                          </span>
                          <a
                            href={`${previewDoc?.url || `/api/applicants/${selectedCandidateDetails.user_id}/resume`}?download=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.8rem", color: "#0369a1", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600" }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download Raw File
                          </a>
                        </div>
                      </div>
                      <div style={{ flex: 1, minHeight: "360px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1", background: "#ffffff" }}>
                        {previewDoc && getDocIconType(previewDoc.file_name) === "image" ? (
                          <div style={{ width: "100%", height: "100%", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "#0f172a" }}>
                            <img src={previewDoc.url} alt={previewDoc.file_name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "6px" }} />
                          </div>
                        ) : (
                          <iframe
                            src={previewDoc?.url || `/api/applicants/${selectedCandidateDetails.user_id}/resume`}
                            style={{ width: "100%", height: "100%", border: "none" }}
                            title={`${selectedCandidateDetails.applicant_name} Document`}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="cand-details-footer" style={{ justifyContent: "flex-end" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  className="cand-details-cancel-btn"
                  onClick={() => {
                    setSelectedCandidateDetails(null);
                    setIsDocsDrawerOpen(false);
                    setIsPreviewingDoc(false);
                    setCandidateDocuments([]);
                    setPreviewDoc(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal (Applicant View) */}
      {detailsJob && (
        <div className="jd-overlay" role="dialog" aria-modal="true" aria-label="Job Details" onClick={(e) => { if (e.target === e.currentTarget) { setDetailsJob(null); setIsApplicantBreakdownOpen(false); setIsFaqDrawerOpen(false); } }}>
          <div className={`jd-modal-container ${isApplicantBreakdownOpen ? "with-side-panel" : ""}`}>
            <div className="jd-panel">
              {/* Cover banner */}
              <div className="jd-cover-banner">
                {detailsJob.companyCoverPath ? (
                  <img
                    src={detailsJob.companyCoverPath.startsWith("http") || detailsJob.companyCoverPath.startsWith("/api") ? detailsJob.companyCoverPath : `/api/employers/${detailsJob.employerUserId}/cover`}
                    alt={`${detailsJob.company} cover`}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                      const placeholder = e.currentTarget.parentElement?.querySelector(".jd-cover-placeholder") as HTMLElement;
                      if (placeholder) placeholder.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="jd-cover-placeholder" style={{ display: detailsJob.companyCoverPath ? "none" : "flex" }}>
                  <span>Cover photo</span>
                </div>
              </div>

              <div className="jd-employer-strip">
                  <div className="jd-employer-logo-info">
                    <div className="jd-employer-logo" aria-label="Company logo" style={{ overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {(() => {
                        const logoSrc = detailsJob.companyLogoPath
                          ? (detailsJob.companyLogoPath.startsWith("http") || detailsJob.companyLogoPath.startsWith("/api") ? detailsJob.companyLogoPath : `/api/employers/${detailsJob.employerUserId}/logo`)
                          : (detailsJob.employerUserId ? `/api/employers/${detailsJob.employerUserId}/logo` : null);
                        return (
                          <>
                            {logoSrc && (
                              <img
                                src={logoSrc}
                                alt={detailsJob.company}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
                                  }
                                }}
                              />
                            )}
                            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ display: logoSrc ? "none" : "block" }}>
                              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
                            </svg>
                          </>
                        );
                      })()}
                    </div>
                    <div>
                      <strong className="jd-employer-name">{detailsJob.company}</strong>
                      <span className="jd-employer-location">
                        <svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12" fill="none" stroke="#5b8ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {detailsJob.location}
                      </span>
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
                        <div className={`match-score-box ${getMatchColorClass(detailsMatchInfo.score)}`} title="Job match score">
                          <small>MATCH</small>
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

                  {(detailsJob.certTags?.length ?? 0) > 0 && (
                    <div className="jd-section">
                      <h3>Required Certifications</h3>
                      <div className="jd-tags-wrap">
                        {detailsJob.certTags?.map((c) => (
                          <span className="js-tag-chip js-tag-certification" key={c} title={c}>{c}</span>
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
                  <span><strong>Applications:</strong> {detailsJob.applicantCount}</span>
                  <span><strong>Close Date:</strong> {detailsJob.closeDate}</span>
                </div>
                <div className="jd-footer-middle">
                  <button
                    type="button"
                    className={`jd-breakdown-btn ${isApplicantBreakdownOpen ? "active" : ""}`}
                    onClick={() => setIsApplicantBreakdownOpen((prev) => !prev)}
                  >
                    <span>{isApplicantBreakdownOpen ? "Hide Breakdown" : "Match Breakdown"}</span>
                  </button>
                </div>
                <div className="jd-footer-actions">
                  <button type="button" className="jd-cancel-btn" onClick={() => { setDetailsJob(null); setIsApplicantBreakdownOpen(false); setIsFaqDrawerOpen(false); }}>Close</button>
                  {invitationStatus === "accepted" ? (
                    <button type="button" className="solid-btn applied-btn" disabled>
                      Accepted
                    </button>
                  ) : invitationStatus === "declined" ? (
                    <button type="button" className="solid-btn" style={{ background: "#ef4444", color: "#fff", cursor: "not-allowed", border: "none" }} disabled>
                      Declined
                    </button>
                  ) : invitationStatus === "pending" ? (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="solid-btn"
                        style={{ background: "#fff", border: "1px solid #ef4444", color: "#ef4444", fontWeight: 700 }}
                        onClick={() => setDeclineInvitationTarget({ type: "byDetails", jobId: detailsJob.id, title: detailsJob.title })}
                        disabled={isRespondingInvitation}
                      >
                        {isRespondingInvitation ? "..." : "Decline"}
                      </button>
                      <button
                        type="button"
                        className="solid-btn applied-btn"
                        onClick={() => handleRespondInvitation("accept")}
                        disabled={isRespondingInvitation}
                      >
                        {isRespondingInvitation ? "Processing..." : "Accept Invitation"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`solid-btn ${appliedJobIds.includes(detailsJob.id) ? "applied-btn" : ""}`}
                      onClick={() => setApplyJobTarget({ jobId: detailsJob.id, title: detailsJob.title })}
                      disabled={appliedJobIds.includes(detailsJob.id) || applyingJobId === detailsJob.id}
                    >
                      {appliedJobIds.includes(detailsJob.id) ? "Applied" : applyingJobId === detailsJob.id ? "Applying..." : "Apply Now"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right Side Comparison Panel (Outside Main Modal) ── */}
            {isApplicantBreakdownOpen && (() => {
              const matchDetails = calculateJobMatchDetails(detailsJob, applicantMatchProfile);
              const appSkills = applicantMatchProfile?.skills || [];
              const appQuals = applicantMatchProfile?.qualifications || [];
              const appCerts = applicantMatchProfile?.certifications || [];

              const jobSkills = detailsJob.skillTags || [];
              const jobQuals = detailsJob.qualTags || [];
              const jobCerts = detailsJob.certTags || [];

              const checkMatch = (jobItem: string, appItems: string[]) => {
                if (!appItems || appItems.length === 0) return false;
                return appItems.some((appItem) => isSkillMatch(jobItem, appItem));
              };

              const isAppRelevant = (appItem: string, jItems: string[]) => {
                if (!jItems || jItems.length === 0) return false;
                return jItems.some((jobItem) => isSkillMatch(jobItem, appItem));
              };

              return (
                <aside className="jd-side-comparison-panel opening">
                  <div className="jd-side-panel-header">
                    <div className="jd-side-title-row">
                      <h3>Competencies & Requirements</h3>
                      <span className="jd-side-subtitle">Side-by-side profile match vs employer postings</span>
                    </div>
                    <div className="jd-side-header-actions">
                      <span className={`match-badge-pill ${getMatchColorClass(matchDetails.score)}`}>
                        {matchDetails.score}% Match
                      </span>
                      <button
                        type="button"
                        className="jd-side-close-btn"
                        aria-label="Close comparison panel"
                        onClick={() => setIsApplicantBreakdownOpen(false)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="jd-side-panel-body">
                    {/* Legend strip */}
                    <div className="jd-compare-legend">
                      <div className="legend-item">
                        <span className="legend-dot green"></span>
                        <span><strong>Green Tag:</strong> Matched with your profile</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot red"></span>
                        <span><strong>Red Tag:</strong> Required by employer, missing from your profile</span>
                      </div>
                    </div>

                    {/* Master 2-Column Unified Container */}
                    <div className="jd-unified-compare-container">
                      {/* ── Column 1: Applicant Profile ── */}
                      <div className="jd-master-col applicant-col">
                        <div className="jd-master-col-header">
                          <span>Your Profile</span>
                        </div>
                        <div className="jd-master-col-content">
                          {/* 1. Location */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Location</span>
                            <div className="jd-col-tags-container">
                              <span className="jd-comp-tag app-neutral">
                                <span className="tag-text">{formatLocationWithCavite(applicantMatchProfile?.city || "Cavite")}</span>
                              </span>
                            </div>
                          </div>

                          {/* 2. Work Arrangement */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Work Arrangement</span>
                            <div className="jd-col-tags-container">
                              <span className="jd-comp-tag app-neutral">
                                <span className="tag-text">{applicantMatchProfile?.workArrangement || "Any"}</span>
                              </span>
                            </div>
                          </div>

                          {/* 3. Salary Range */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Salary Range</span>
                            <div className="jd-col-tags-container">
                              <span className="jd-comp-tag app-neutral">
                                <span className="tag-text">
                                  {applicantMatchProfile?.expectedSalary
                                    ? `PHP ${Number(applicantMatchProfile.expectedSalary).toLocaleString()}`
                                    : "Not set"}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* 4. Skills */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Skills</span>
                              <span className="col-count-text">{appSkills.length} listed</span>
                            </div>
                            <div className="jd-col-tags-container">
                              {appSkills.length > 0 ? (
                                appSkills.map((item) => {
                                  const isRel = isAppRelevant(item, jobSkills);
                                  const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                  const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                  return (
                                    <span
                                      key={item}
                                      className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                      onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "skills" })}
                                      onMouseLeave={() => setHoveredCompareTag(null)}
                                    >
                                      {isRel && <span className="tag-check">✓ </span>}
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="jd-no-data-text">No skills in your profile</span>
                              )}
                            </div>
                          </div>

                          {/* 5. Qualifications */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Qualifications</span>
                              <span className="col-count-text">{appQuals.length} listed</span>
                            </div>
                            <div className="jd-col-tags-container">
                              {appQuals.length > 0 ? (
                                appQuals.map((item) => {
                                  const isRel = isAppRelevant(item, jobQuals);
                                  const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                  const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                  return (
                                    <span
                                      key={item}
                                      className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                      onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "qualifications" })}
                                      onMouseLeave={() => setHoveredCompareTag(null)}
                                    >
                                      {isRel && <span className="tag-check">✓ </span>}
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="jd-no-data-text">No qualifications in your profile</span>
                              )}
                            </div>
                          </div>

                          {/* 6. Certifications */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Certifications</span>
                              <span className="col-count-text">{appCerts.length} listed</span>
                            </div>
                            <div className="jd-col-tags-container">
                              {appCerts.length > 0 ? (
                                appCerts.map((item) => {
                                  const isRel = isAppRelevant(item, jobCerts);
                                  const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                  const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                  return (
                                    <span
                                      key={item}
                                      className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                      onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "certifications" })}
                                      onMouseLeave={() => setHoveredCompareTag(null)}
                                    >
                                      {isRel && <span className="tag-check">✓ </span>}
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="jd-no-data-text">No certifications in your profile</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Column 2: Employer Requirements ── */}
                      <div className="jd-master-col employer-col">
                        <div className="jd-master-col-header employer">
                          <span>Employer's Requirements</span>
                        </div>
                        <div className="jd-master-col-content">
                          {/* 1. Location */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Location</span>
                            <div className="jd-col-tags-container">
                              {(() => {
                                const matched = matchDetails.locationPts >= 12;
                                return (
                                  <span
                                    className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                    title={matched ? "Matched with your location" : "Different location"}
                                  >
                                    <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                    <span className="tag-text">{formatLocationWithCavite(detailsJob.location)}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* 2. Work Arrangement */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Work Arrangement</span>
                            <div className="jd-col-tags-container">
                              {(() => {
                                const matched = matchDetails.setupPts >= 15;
                                return (
                                  <span
                                    className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                    title={matched ? "Matched with your setup preference" : "Different work arrangement"}
                                  >
                                    <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                    <span className="tag-text">{detailsJob.setup || "Standard"}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* 3. Salary Range */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Salary Range</span>
                            <div className="jd-col-tags-container">
                              {(() => {
                                const matched = matchDetails.salaryPts >= 12;
                                return (
                                  <span
                                    className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                    title={matched ? "Matches your salary range" : "Different salary range"}
                                  >
                                    <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                    <span className="tag-text">{detailsJob.salary}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* 4. Skills */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Skills</span>
                              <span className="col-count-text">{jobSkills.length} required</span>
                            </div>
                            <div className="jd-col-tags-container">
                              {jobSkills.length > 0 ? (
                                jobSkills.map((item) => {
                                  const matched = checkMatch(item, appSkills);
                                  const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                  const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                  return (
                                    <span
                                      key={item}
                                      className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                      onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "skills" })}
                                      onMouseLeave={() => setHoveredCompareTag(null)}
                                    >
                                      <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="jd-no-data-text">No specific skills required</span>
                              )}
                            </div>
                          </div>

                          {/* 5. Qualifications */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Qualifications</span>
                              <span className="col-count-text">{jobQuals.length} required</span>
                            </div>
                            <div className="jd-col-tags-container">
                              {jobQuals.length > 0 ? (
                                jobQuals.map((item) => {
                                  const matched = checkMatch(item, appQuals);
                                  const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                  const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                  return (
                                    <span
                                      key={item}
                                      className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                      onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "qualifications" })}
                                      onMouseLeave={() => setHoveredCompareTag(null)}
                                    >
                                      <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="jd-no-data-text">No specific qualifications required</span>
                              )}
                            </div>
                          </div>

                          {/* 6. Certifications */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Certifications</span>
                              <span className="col-count-text">{jobCerts.length} required</span>
                            </div>
                            <div className="jd-col-tags-container">
                              {jobCerts.length > 0 ? (
                                jobCerts.map((item) => {
                                  const matched = checkMatch(item, appCerts);
                                  const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                  const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                  return (
                                    <span
                                      key={item}
                                      className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                      onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "certifications" })}
                                      onMouseLeave={() => setHoveredCompareTag(null)}
                                    >
                                      <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="jd-no-data-text">No certifications required for this position</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── EMPLOYER VIEW: Picture 1 Job Details & Match Breakdown Side-by-Side Overlay ── */}
      {(employerViewingJob || isJobDetailsClosing) && employerViewingJob && (
        (() => {
          const detailsMatchPct = targetCandidate ? calculateCandidateMatch(targetCandidate, employerViewingJob) : 0;
          const matchStyle = detailsMatchPct >= 85
            ? { track: "#dcfce7", color: "#15803d", fill: "#86efac" }
            : detailsMatchPct >= 70
            ? { track: "#fef3c7", color: "#b45309", fill: "#fde68a" }
            : { track: "#fee2e2", color: "#b91c1c", fill: "#fca5a5" };

          const jobSalaryMin = Number(employerViewingJob.salary_min ?? employerViewingJob.min_salary) || 0;
          const jobSalaryMax = Number(employerViewingJob.salary_max ?? employerViewingJob.max_salary) || 0;
          const jobLocation = formatLocationWithCavite(employerViewingJob.location || employerViewingJob.city || "Cavite");

          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(10, 30, 50, 0.68)",
                backdropFilter: "blur(5px)",
                WebkitBackdropFilter: "blur(5px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
                zIndex: 25000,
                padding: "24px 36px",
                overflowX: "hidden",
                fontFamily: '"Manrope", sans-serif',
                animation: isJobDetailsClosing
                  ? "jdFadeOut 0.2s ease forwards"
                  : "jdFadeIn 0.22s ease forwards",
              }}
              onClick={handleCloseEmployerJobDetails}
            >
              {/* ── Picture 1: Job Details Card (Left Container) ── */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  width: "100%",
                  maxWidth: "540px",
                  maxHeight: "85vh",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                  overflow: "hidden",
                  position: "relative",
                  flexShrink: 0,
                  fontFamily: '"Manrope", sans-serif',
                  animation: isJobDetailsClosing
                    ? "jdPopOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                    : "jdPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 24px",
                    borderBottom: "1px solid #f1f5f9",
                    background: "#ffffff",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                    Job Details
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        background: matchStyle.track,
                        color: matchStyle.color,
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        border: `1px solid ${matchStyle.fill}`,
                        whiteSpace: "nowrap",
                        fontFamily: '"Manrope", sans-serif',
                      }}
                    >
                      {detailsMatchPct}% Match
                    </div>
                    <button
                      type="button"
                      style={{
                        background: "#01294a",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        padding: "6px 14px",
                        borderRadius: "999px",
                        border: "1px solid #01294a",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(1, 41, 74, 0.2)",
                        transition: "all 0.15s ease",
                        fontFamily: '"Manrope", sans-serif',
                      }}
                      onClick={() => setIsMatchDrawerOpen((prev) => !prev)}
                    >
                      Match Breakdown
                    </button>
                    <button
                      type="button"
                      className="jd-side-close-btn"
                      aria-label="Close job details"
                      onClick={handleCloseEmployerJobDetails}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", flex: 1, fontFamily: '"Manrope", sans-serif' }}>
                  {/* Candidate Evaluation Callout Banner */}
                  {targetCandidate && (
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                          Evaluating Candidate
                        </span>
                        <strong style={{ fontSize: "0.95rem", color: "#01294a" }}>{targetCandidate.applicant_name}</strong>
                        {targetCandidate.desired_job_title && (
                          <span style={{ fontSize: "0.82rem", color: "#475569", marginLeft: "6px" }}>· {targetCandidate.desired_job_title}</span>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.78rem", color: "#64748b", display: "block" }}>{formatLocationWithCavite(targetCandidate.city || "Cavite")}</span>
                        <span style={{ fontSize: "0.74rem", color: "#0369a1", fontWeight: 600 }}>{targetCandidate.work_arrangement}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "1.18rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                      {employerViewingJob.title}
                    </h4>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "4px 10px", borderRadius: "999px", fontSize: "0.76rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                        {employerViewingJob.status ? employerViewingJob.status.toUpperCase() : "OPEN"}
                      </span>
                      {(employerViewingJob.is_urgent === 1 || employerViewingJob.is_urgent === true || String(employerViewingJob.is_urgent) === "1") && (
                        <span style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", padding: "4px 10px", borderRadius: "999px", fontSize: "0.76rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                          Urgent
                        </span>
                      )}
                      <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                        {employerViewingJob.work_arrangement || "On-Site"}
                      </span>
                      {(jobSalaryMin || jobSalaryMax) ? (
                        <span style={{ background: "#fef3c7", color: "#b45309", padding: "4px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                          PHP {Number(jobSalaryMin).toLocaleString()} - {Number(jobSalaryMax).toLocaleString()}
                        </span>
                      ) : null}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "#64748b", fontFamily: '"Manrope", sans-serif' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        {jobLocation}
                      </span>
                    </div>
                  </div>

                  {/* JOB DESCRIPTION */}
                  <div>
                    <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                      JOB DESCRIPTION
                    </span>
                    <p style={{ margin: 0, fontSize: "0.86rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-line", fontFamily: '"Manrope", sans-serif' }}>
                      {employerViewingJob.description || "No job description provided."}
                    </p>
                  </div>

                  {/* REQUIRED SKILLS */}
                  <div>
                    <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                      REQUIRED SKILLS
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {parseCompetencyDisplayTags(employerViewingJob.required_skills || employerViewingJob.skills || "").length > 0 ? (
                        parseCompetencyDisplayTags(employerViewingJob.required_skills || employerViewingJob.skills || "").map((sk, idx) => (
                          <span key={idx} style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                            {sk}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic", fontFamily: '"Manrope", sans-serif' }}>
                          No specific skills required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* QUALIFICATIONS */}
                  <div>
                    <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                      QUALIFICATIONS
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {parseCompetencyDisplayTags(employerViewingJob.qualifications || employerViewingJob.required_qualifications || "").length > 0 ? (
                        parseCompetencyDisplayTags(employerViewingJob.qualifications || employerViewingJob.required_qualifications || "").map((qu, idx) => (
                          <span key={idx} style={{ background: "#faf5ff", color: "#7e22ce", border: "1px solid #e9d5ff", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                            {qu}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic", fontFamily: '"Manrope", sans-serif' }}>
                          No specific qualifications required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CERTIFICATIONS */}
                  {parseCompetencyDisplayTags(employerViewingJob.certifications || employerViewingJob.required_certifications || "").length > 0 && (
                    <div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                        CERTIFICATIONS
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {parseCompetencyDisplayTags(employerViewingJob.certifications || employerViewingJob.required_certifications || "").map((cert, idx) => (
                          <span key={idx} style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: "14px 24px",
                    borderTop: "1px solid #f1f5f9",
                    background: "#ffffff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    {employerViewingJob.close_date && (
                      <span style={{ fontSize: "0.8rem", color: "#64748b", fontFamily: '"Manrope", sans-serif', display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <strong style={{ color: "#0f172a" }}>Close Date:</strong> {employerViewingJob.close_date}
                      </span>
                    )}
                  </div>
                  {employerViewingJob.application ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className={`cjm-status-chip ${String(employerViewingJob.application.status || "submitted").toLowerCase() === "reviewed" ? "under-review" : String(employerViewingJob.application.status || "submitted").toLowerCase()}`} style={{ fontSize: "0.84rem", padding: "6px 14px" }}>
                        Candidate Applied ({String(employerViewingJob.application.status || "Submitted").toUpperCase()})
                      </span>
                    </div>
                  ) : employerViewingJob.invitation ? (
                    <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0284c7", background: "#f0f9ff", padding: "6px 14px", borderRadius: "999px", border: "1px solid #bae6fd" }}>
                      ✓ Invitation Sent ({String(employerViewingJob.invitation.status || "Invited").toUpperCase()})
                    </span>
                  ) : (
                    <button
                      type="button"
                      style={{
                        background: "#01294a",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.88rem",
                        padding: "8px 22px",
                        borderRadius: "999px",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(1, 41, 74, 0.25)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                        fontFamily: '"Manrope", sans-serif',
                      }}
                      onClick={() => {
                        handleOpenInviteModal(employerViewingJob);
                        handleCloseEmployerJobDetails();
                      }}
                    >
                      Recruit
                    </button>
                  )}
                </div>
              </div>

              {/* ── Picture 1: Match Breakdown Drawer (Right Container) ── */}
              {isMatchDrawerOpen && targetCandidate && (
                (() => {
                  const candSkills = parseCompetencyDisplayTags(targetCandidate.skills || "");
                  const candQuals = parseCompetencyDisplayTags(targetCandidate.qualifications || "");
                  const candCerts = parseCompetencyDisplayTags(targetCandidate.certifications || "");
                  const candCity = formatLocationWithCavite(targetCandidate.city || "Cavite");
                  const candSetup = targetCandidate.work_arrangement || "On-Site";
                  const candSalary = targetCandidate.expected_salary || "";
                  const candSalaryDisplay = (() => {
                    if (targetCandidate.expected_salary_min || targetCandidate.expected_salary_max) {
                      const minVal = Number(targetCandidate.expected_salary_min) || 0;
                      const maxVal = Number(targetCandidate.expected_salary_max) || 0;
                      return `PHP ${minVal.toLocaleString()} - ${maxVal.toLocaleString()}`;
                    }
                    if (!candSalary) return "Not set";
                    return String(candSalary).toUpperCase().includes("PHP") ? String(candSalary) : `PHP ${Number(parseExpectedSalary(candSalary)).toLocaleString()}`;
                  })();

                  const jobSkills = parseCompetencyDisplayTags(employerViewingJob.required_skills || employerViewingJob.skills || "");
                  const jobQuals = parseCompetencyDisplayTags(employerViewingJob.qualifications || employerViewingJob.required_qualifications || "");
                  const jobCerts = parseCompetencyDisplayTags(employerViewingJob.certifications || employerViewingJob.required_certifications || "");
                  const jobSalaryDisplay = (jobSalaryMin || jobSalaryMax) ? `PHP ${jobSalaryMin.toLocaleString()} - ${jobSalaryMax.toLocaleString()}` : "Market Rate";

                  const matchDetails = calculateJobMatchDetails(
                    {
                      id: employerViewingJob.id,
                      title: employerViewingJob.title,
                      location: jobLocation,
                      salaryMin: jobSalaryMin,
                      setup: employerViewingJob.work_arrangement || "On-Site",
                      skillTags: jobSkills,
                      qualTags: jobQuals,
                      certTags: jobCerts,
                    },
                    {
                      desiredJobTitle: targetCandidate.desired_job_title || "",
                      workArrangement: candSetup,
                      expectedSalary: parseExpectedSalary(candSalary),
                      city: candCity,
                      skills: candSkills,
                      qualifications: candQuals,
                      certifications: candCerts,
                    }
                  );

                  const checkMatch = (jobItem: string, appItems: string[]) => {
                    if (!appItems || appItems.length === 0) return false;
                    return appItems.some((appItem) => isSkillMatch(jobItem, appItem));
                  };

                  const isCandRelevant = (appItem: string, jItems: string[]) => {
                    if (!jItems || jItems.length === 0) return false;
                    return jItems.some((jobItem) => isSkillMatch(jobItem, appItem));
                  };

                  const bdStyle = getMatchColorClass(matchDetails.score);

                  return (
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "16px",
                        width: "100%",
                        maxWidth: "680px",
                        maxHeight: "85vh",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                        overflow: "hidden",
                        flexShrink: 0,
                        fontFamily: '"Manrope", sans-serif',
                        animation: isJobDetailsClosing
                          ? "jdSlideOutRight 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                          : "jdSlideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "16px 24px",
                          borderBottom: "1px solid #f1f5f9",
                          background: "#f8fbff",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                            Match Breakdown
                          </h3>
                          <span style={{ fontSize: "0.82rem", color: "#557796", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                            Side-by-side comparison: {targetCandidate.applicant_name} vs {employerViewingJob.title}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className={`match-badge-pill ${bdStyle}`} style={{ fontFamily: '"Manrope", sans-serif' }}>
                            {matchDetails.score}% Match
                          </span>
                          <button
                            type="button"
                            className="jd-side-close-btn"
                            onClick={() => setIsMatchDrawerOpen(false)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Body */}
                      <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", flex: 1, fontFamily: '"Manrope", sans-serif' }}>
                        {/* Legend strip */}
                        <div className="jd-compare-legend" style={{ fontFamily: '"Manrope", sans-serif' }}>
                          <div className="legend-item">
                            <span className="legend-dot green"></span>
                            <span><strong>Green Tag:</strong> Matched candidate competency</span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-dot red"></span>
                            <span><strong>Red Tag:</strong> Required by job, missing from candidate</span>
                          </div>
                        </div>

                        {/* Unified Compare Container */}
                        <div className="jd-unified-compare-container" style={{ fontFamily: '"Manrope", sans-serif' }}>
                          {/* Candidate Column */}
                          <div className="jd-master-col applicant-col">
                            <div className="jd-master-col-header">
                              <span>Candidate Profile</span>
                            </div>
                            <div className="jd-master-col-content">
                              <div className="jd-master-row">
                                <span className="jd-row-label">Location</span>
                                <div className="jd-col-tags-container">
                                  <span className="jd-comp-tag app-neutral">
                                    <span className="tag-text">{candCity}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <span className="jd-row-label">Work Arrangement</span>
                                <div className="jd-col-tags-container">
                                  <span className="jd-comp-tag app-neutral">
                                    <span className="tag-text">{candSetup}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <span className="jd-row-label">Experience Level</span>
                                <div className="jd-col-tags-container">
                                  <span className="jd-comp-tag app-neutral">
                                    <span className="tag-text">
                                      {targetCandidate.years_of_experience
                                        ? `${targetCandidate.years_of_experience} yrs experience`
                                        : "Fresh Graduate / Entry-level"}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <span className="jd-row-label">Salary Range</span>
                                <div className="jd-col-tags-container">
                                  <span className="jd-comp-tag app-neutral">
                                    <span className="tag-text">{candSalaryDisplay}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <div className="jd-row-label-wrap">
                                  <span className="jd-row-label">Skills</span>
                                  <span className="col-count-text">{candSkills.length} listed</span>
                                </div>
                                <div className="jd-col-tags-container">
                                  {candSkills.length > 0 ? (
                                    candSkills.map((item) => {
                                      const isRel = isCandRelevant(item, jobSkills);
                                      const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                      const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                      return (
                                        <span
                                          key={item}
                                          className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                          onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "skills" })}
                                          onMouseLeave={() => setHoveredCompareTag(null)}
                                        >
                                          <span className="tag-text">{item}</span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="jd-no-data-text">No skills in candidate profile</span>
                                  )}
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <div className="jd-row-label-wrap">
                                  <span className="jd-row-label">Qualifications</span>
                                  <span className="col-count-text">{candQuals.length} listed</span>
                                </div>
                                <div className="jd-col-tags-container">
                                  {candQuals.length > 0 ? (
                                    candQuals.map((item) => {
                                      const isRel = isCandRelevant(item, jobQuals);
                                      const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                      const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                      return (
                                        <span
                                          key={item}
                                          className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                          onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "qualifications" })}
                                          onMouseLeave={() => setHoveredCompareTag(null)}
                                        >
                                          <span className="tag-text">{item}</span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="jd-no-data-text">No qualifications in candidate profile</span>
                                  )}
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <div className="jd-row-label-wrap">
                                  <span className="jd-row-label">Certifications</span>
                                  <span className="col-count-text">{candCerts.length} listed</span>
                                </div>
                                <div className="jd-col-tags-container">
                                  {candCerts.length > 0 ? (
                                    candCerts.map((item) => {
                                      const isRel = isCandRelevant(item, jobCerts);
                                      const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                      const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                      return (
                                        <span
                                          key={item}
                                          className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                          onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "certifications" })}
                                          onMouseLeave={() => setHoveredCompareTag(null)}
                                        >
                                          <span className="tag-text">{item}</span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="jd-no-data-text">No certifications in candidate profile</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Employer Requirements Column */}
                          <div className="jd-master-col employer-col">
                            <div className="jd-master-col-header employer">
                              <span>Employer's Requirements</span>
                            </div>
                            <div className="jd-master-col-content">
                              <div className="jd-master-row">
                                <span className="jd-row-label">Location</span>
                                <div className="jd-col-tags-container">
                                  {(() => {
                                    const matched = matchDetails.locationPts >= 12;
                                    return (
                                      <span
                                        className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                        title={matched ? "Matched candidate location" : "Different location"}
                                      >
                                        <span className="tag-text">{jobLocation}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <span className="jd-row-label">Work Arrangement</span>
                                <div className="jd-col-tags-container">
                                  {(() => {
                                    const matched = matchDetails.setupPts >= 15;
                                    return (
                                      <span
                                        className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                        title={matched ? "Matched candidate arrangement" : "Different work arrangement"}
                                      >
                                        <span className="tag-text">{employerViewingJob.work_arrangement || "On-Site"}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <span className="jd-row-label">Experience Level</span>
                                <div className="jd-col-tags-container">
                                  {(() => {
                                    const candExpNum = parseFloat(String(targetCandidate.years_of_experience || "0")) || 0;
                                    const jobExp = (employerViewingJob.experience_level || "").toLowerCase();
                                    let isExpMatched = true;
                                    if (jobExp.includes("senior") || jobExp.includes("lead")) {
                                      isExpMatched = candExpNum >= 5;
                                    } else if (jobExp.includes("mid")) {
                                      isExpMatched = candExpNum >= 2;
                                    } else if (jobExp.includes("entry") || jobExp.includes("fresh")) {
                                      isExpMatched = true;
                                    }
                                    return (
                                      <span
                                        className={`jd-comp-tag ${isExpMatched ? "tag-matched-green" : "tag-missing-red"}`}
                                        title={isExpMatched ? "Meets experience requirements" : "Requires more experience"}
                                      >
                                        <span className="tag-text">
                                          {formatExperienceLevel(employerViewingJob.experience_level || "") || employerViewingJob.experience_level || "Any Experience"}
                                        </span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <span className="jd-row-label">Salary Range</span>
                                <div className="jd-col-tags-container">
                                  {(() => {
                                    const matched = matchDetails.salaryPts >= 12;
                                    return (
                                      <span
                                        className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                        title={matched ? "Matches candidate salary" : "Different salary range"}
                                      >
                                        <span className="tag-text">{jobSalaryDisplay}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <div className="jd-row-label-wrap">
                                  <span className="jd-row-label">Skills</span>
                                  <span className="col-count-text">{jobSkills.length} required</span>
                                </div>
                                <div className="jd-col-tags-container">
                                  {jobSkills.length > 0 ? (
                                    jobSkills.map((item) => {
                                      const matched = checkMatch(item, candSkills);
                                      const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                      const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                      return (
                                        <span
                                          key={item}
                                          className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                          onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "skills" })}
                                          onMouseLeave={() => setHoveredCompareTag(null)}
                                        >
                                          <span className="tag-text">{item}</span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="jd-no-data-text">No specific skills required</span>
                                  )}
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <div className="jd-row-label-wrap">
                                  <span className="jd-row-label">Qualifications</span>
                                  <span className="col-count-text">{jobQuals.length} required</span>
                                </div>
                                <div className="jd-col-tags-container">
                                  {jobQuals.length > 0 ? (
                                    jobQuals.map((item) => {
                                      const matched = checkMatch(item, candQuals);
                                      const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                      const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                      return (
                                        <span
                                          key={item}
                                          className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                          onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "qualifications" })}
                                          onMouseLeave={() => setHoveredCompareTag(null)}
                                        >
                                          <span className="tag-text">{item}</span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="jd-no-data-text">No specific qualifications required</span>
                                  )}
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <div className="jd-row-label-wrap">
                                  <span className="jd-row-label">Certifications</span>
                                  <span className="col-count-text">{jobCerts.length} required</span>
                                </div>
                                <div className="jd-col-tags-container">
                                  {jobCerts.length > 0 ? (
                                    jobCerts.map((item) => {
                                      const matched = checkMatch(item, candCerts);
                                      const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                      const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                      return (
                                        <span
                                          key={item}
                                          className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                          onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "certifications" })}
                                          onMouseLeave={() => setHoveredCompareTag(null)}
                                        >
                                          <span className="tag-text">{item}</span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="jd-no-data-text">No specific certifications required</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          );
        })()
      )}

      {/* ── EMPLOYER VIEW: Picture 2 Invite Candidate to Apply Modal (STATIC SINGLE CARD, NO SELECTION CAROUSEL) ── */}
      {inviteCandidateJob && (
        <div className="cand-details-overlay" onClick={handleCloseInviteModal} style={{ zIndex: 26000 }}>
          <div className="cand-details-panel" style={{ maxWidth: "560px", width: "94%", boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
            <div className="cand-details-docs-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#01294a" }}>Invite Candidate to Apply</h3>
              <button type="button" className="cand-details-docs-back" onClick={handleCloseInviteModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInviteFromModal} style={{ padding: "20px", display: "grid", gap: "14px", minWidth: 0, width: "100%", boxSizing: "border-box" }}>
              {/* Candidate Info Strip */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#01294a", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 }}>
                  {initialsFromName(targetCandidate.applicant_name)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: "0.92rem", color: "#0f172a", display: "block" }}>{targetCandidate.applicant_name}</strong>
                  <small style={{ display: "block", color: "#64748b", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {targetCandidate.email || "No email"} {targetCandidate.phone ? `· ${targetCandidate.phone}` : ""}
                  </small>
                </div>
              </div>

              {/* Middle Job Card: Static chosen position (NO selection carousel / arrows) */}
              <div style={{ display: "grid", gap: "6px", minWidth: 0, width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                    Select Job Opening:
                  </span>
                </div>

                {(() => {
                  const matchPct = calculateCandidateMatch(targetCandidate, inviteCandidateJob);
                  const appsCount = inviteCandidateJob.applicant_count ?? 0;

                  return (
                    <div className="job-select-card selected">
                      <div className="job-select-card-left">
                        <h4 className="job-select-title" title={inviteCandidateJob.title}>{inviteCandidateJob.title}</h4>
                        <span className="job-select-apps">Applications: {appsCount}</span>
                      </div>

                      <div className="job-select-card-right">
                        <div className={`job-select-match-box ${getMatchColorClass(matchPct)}`}>
                          <span className="match-label">MATCH</span>
                          <span className="match-value">{matchPct}%</span>
                        </div>

                        <button
                          type="button"
                          className="job-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmployerViewingJob(inviteCandidateJob);
                            setIsMatchDrawerOpen(false);
                          }}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className="job-details-btn job-breakdown-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmployerViewingJob(inviteCandidateJob);
                            setIsMatchDrawerOpen(true);
                          }}
                        >
                          Breakdown
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Invitation Message Textarea */}
              <label style={{ display: "grid", gap: "4px", fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                Invitation Message:
                <textarea
                  value={customInviteMsg}
                  onChange={(e) => setCustomInviteMsg(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </label>

              {inviteSuccessMsg && (
                <div style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", padding: "10px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600 }}>
                  ✓ {inviteSuccessMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button type="button" className="modal-action-btn btn-cancel" onClick={handleCloseInviteModal}>
                  Cancel
                </button>
                <button type="submit" className="modal-action-btn btn-submit" disabled={isSendingInvite || !customInviteMsg.trim()}>
                  {isSendingInvite ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOUBLE VERIFICATION: LOGOUT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        type="warning"
        title="Log Out of EliteCruit"
        message={`Are you sure you want to log out of your ${isEmployer ? "employer" : "applicant"} account?`}
        cancelLabel="Stay Signed In"
        confirmLabel="Log Out"
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          localStorage.removeItem("elitecruit-user");
          window.location.href = "/";
        }}
      />

      {/* DOUBLE VERIFICATION: DECLINE INVITATION MODAL */}
      <ConfirmationModal
        isOpen={!!declineInvitationTarget}
        type="danger"
        title="Decline Job Invitation"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to decline the invitation for{" "}
              <strong>{declineInvitationTarget?.title || "this position"}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              You will not be able to accept this recruitment invitation later.
            </p>
          </div>
        }
        cancelLabel="Keep Invitation"
        confirmLabel="Decline Invitation"
        onCancel={() => setDeclineInvitationTarget(null)}
        onConfirm={handleConfirmDecline}
      />

      {/* DOUBLE VERIFICATION: SUBMIT JOB APPLICATION MODAL */}
      <ConfirmationModal
        isOpen={!!applyJobTarget}
        type="info"
        title="Submit Job Application"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to submit your application for{" "}
              <strong>{applyJobTarget?.title || "this position"}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Your profile, qualifications, and attached resume will be sent directly to the employer.
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Confirm & Apply"
        onCancel={() => setApplyJobTarget(null)}
        onConfirm={handleConfirmApply}
      />

      {/* DOUBLE VERIFICATION: EMPLOYER RECRUIT CANDIDATE CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isConfirmInviteOpen && !!inviteCandidateJob}
        type="info"
        title="Confirm Recruitment Invitation"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to invite <strong>{targetCandidate.applicant_name}</strong> for{" "}
              <strong>{inviteCandidateJob?.title}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              This will officially send your personalized invitation message to this applicant.
            </p>
          </div>
        }
        cancelLabel="Review Details"
        confirmLabel="Confirm & Send"
        isConfirming={isSendingInvite}
        onCancel={() => setIsConfirmInviteOpen(false)}
        onConfirm={doSendInvite}
      />
    </div>
  );
}

