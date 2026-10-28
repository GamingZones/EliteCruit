import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import { authFetch } from "../../utils/auth";
import ApplicantChatbotDrawer, { ApplicantFAQItem as FAQItem } from "../../components/ApplicantChatbotDrawer";
import EmployerChatbotDrawer, { EmployerFAQItem } from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import { JobDetailsModal, EmployerDetailsModal } from "../../components/modals";
import type { JobModalData, EmployerModalData } from "../../components/modals";
import {
  formatLocationWithCavite,
  parseCompetencyDisplayTags,
  calculateJobMatchDetails,
  getMatchColorClass,
  isSkillMatch,
} from "../../utils/filters";

type ApplicantMatchProfile = {
  desiredJobTitle?: string;
  workArrangement?: string;
  expectedSalary?: number | null;
  city?: string;
  skills?: string[];
  certifications?: string[];
  qualifications?: string[];
  rawSkills?: string;
  rawCertifications?: string;
};

import "../Applicant/Applicant-Dashboard.css";
import "../Employer/Employer-Dashboard.css";
import "./Feedback.css";

type SideNavItem = {
  label: string;
  icon: "overview" | "star" | "applications" | "documents" | "feedback" | "profile" | "search" | "chat" | "messages" | "notifications" | "logout";
  badge?: string;
  href?: string;
};

const navWorkspace: SideNavItem[] = [
  { label: "Overview", icon: "overview", href: "/applicant-dashboard#section-overview" },
  { label: "Smart Matches", icon: "star", href: "/applicant-dashboard#section-smart-matches" },
  { label: "My Applications", icon: "applications", href: "/applicant-dashboard#section-applications" },
  { label: "Job Invitations", icon: "notifications", href: "/applicant-dashboard#section-invitations" },
];

const navGeneral: SideNavItem[] = [
  { label: "Job Search", icon: "search", href: "/job-search" },
  { label: "Offer Letters", icon: "documents", href: "/applicant-offer-letter" },
  { label: "Messages", icon: "messages", href: "/messages" },
  { label: "Notifications", icon: "notifications", href: "/notifications" },
  { label: "Feedback", icon: "feedback", href: "/feedback" },
];

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
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

type FeedbackRecord = {
  id: string | number;
  targetName: string;
  status: "Accepted" | "Denied" | "Recruited" | "Recruitment Accepted" | "Recruitment Denied";
  jobTitle?: string;
  jobPostId?: number;
  employerUserId?: number;
  applicantUserId?: number;
  rating: number;
  comments: string;
  date: string;
  isAnonymous?: boolean;
  description?: string;
  requiredSkills?: string[];
  qualifications?: string[];
  certifications?: string[];
  workSetup?: string;
  salary?: string;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  hide_salary?: boolean | number;
  closeDate?: string;
  applicationLimit?: number;
  applicantCount?: number;
  location?: string;
  companyLogoPath?: string | null;
  companyCoverPath?: string | null;
};

const FALLBACK_FEEDBACK_JOBS: Record<string, Partial<TargetOption>> = {
  "301": {
    id: 301,
    jobPostId: 301,
    employerUserId: 501,
    name: "Apex Global Solutions Inc.",
    jobTitle: "Full Stack Web Developer",
    location: "Silang, Cavite",
    workSetup: "Hybrid",
    salary: "PHP 45,000 - 65,000",
    salary_min: 45000,
    salary_max: 65000,
    hide_salary: 0,
    rating: "4.8",
    description: "Build robust, scalable web applications with React, Node.js, and PostgreSQL.",
    requiredSkills: ["React", "Node.js", "TypeScript"],
    qualifications: ["Bachelor's Degree in IT or Computer Science"],
    certifications: ["AWS Cloud Practitioner"],
    closeDate: "11/30/2026",
    applicationLimit: 15,
    applicantCount: 7,
    companyLogoPath: null,
    companyCoverPath: null,
  },
  "302": {
    id: 302,
    jobPostId: 302,
    employerUserId: 502,
    name: "Vanguard Tech Innovations",
    jobTitle: "Frontend Software Engineer",
    location: "Dasmariñas, Cavite",
    workSetup: "On-Site",
    salary: "PHP 35,000 - 50,000",
    salary_min: 35000,
    salary_max: 50000,
    hide_salary: 0,
    rating: "4.6",
    description: "Develop high-performing user interfaces with Tailwind CSS and Next.js.",
    requiredSkills: ["React", "Next.js", "Tailwind CSS"],
    qualifications: ["Bachelor's Degree in Computer Science"],
    certifications: ["Meta Frontend Developer Certificate"],
    closeDate: "11/15/2026",
    applicationLimit: 10,
    applicantCount: 5,
    companyLogoPath: null,
    companyCoverPath: null,
  },
};

type CompanyReviewItem = {
  id: string | number;
  rating: number;
  comments: string;
  is_anonymous: number | boolean;
  job_post_id?: number;
  job_title?: string;
  candidate_name: string;
  profile_picture_path?: string | null;
  created_at?: string;
  updated_at?: string;
};

type TargetOption = {
  id: number | string;
  jobPostId?: number;
  employerUserId?: number;
  applicantUserId?: number;
  name: string;
  status: "Accepted" | "Denied" | "Recruited" | "Recruitment Accepted" | "Recruitment Denied";
  jobTitle: string;
  location: string;
  workSetup: string;
  salary: string;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  hide_salary?: boolean | number;
  rating?: string;
  description?: string;
  requiredSkills?: string[];
  qualifications?: string[];
  certifications?: string[];
  closeDate?: string;
  applicationLimit?: number;
  applicantCount?: number;
  phone?: string;
  email?: string;
  companyLogoPath?: string | null;
  companyCoverPath?: string | null;
  profilePicturePath?: string | null;
};

function formatSalaryRange(min?: number | string | null, max?: number | string | null): string {
  const minNum = Number(min);
  const maxNum = Number(max);
  if (Number.isFinite(minNum) && Number.isFinite(maxNum) && minNum > 0 && maxNum > 0) {
    return `PHP ${minNum.toLocaleString()} - ${maxNum.toLocaleString()}`;
  }
  if (Number.isFinite(minNum) && minNum > 0) {
    return `PHP ${minNum.toLocaleString()}`;
  }
  return "Negotiable";
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

export default function Feedback() {
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return false;
    }
    return true;
  });
  const [role, setRole] = useState<"applicant" | "employer">("applicant");
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [applicantLabel, setApplicantLabel] = useState(getInitialApplicantName);
  const companyLabel = useEmployerCompanyLabel("Employer");
  const [userId, setUserId] = useState<number | null>(null);

  const applicantFeedbackFaqs: FAQItem[] = [
    {
      question: "How do I submit feedback for an employer or interview?",
      answer: "Select an employer or company from the dropdown menu, choose a star rating (1 to 5), write your review or interview experience comments, and click 'Submit Feedback'.",
    },
    {
      question: "Can employers see my feedback?",
      answer: "Your feedback ratings help improve the hiring experience on EliteCruit. Your submitted feedback history is saved in your Candidate Workspace for your personal records.",
    },
    {
      question: "Which employers can I give feedback for?",
      answer: "You can submit feedback for employers you have applied to, interviewed with, or received job invitations from on EliteCruit.",
    },
  ];

  const employerFeedbackFaqs: EmployerFAQItem[] = [
    {
      question: "How does candidate feedback work for employers?",
      answer: "You can view ratings and feedback submitted by applicants who interviewed with your company, as well as record feedback and ratings for recruited candidates.",
    },
    {
      question: "Can I edit feedback after submitting?",
      answer: "Yes, you can edit your feedback and rating directly from the Recruitment Feedback Log section.",
    },
    {
      question: "Can feedback be submitted anonymously?",
      answer: "Yes, candidates and employers have the option to submit feedback anonymously to protect privacy.",
    },
  ];

  // Form states
  const [selectedTargetId, setSelectedTargetId] = useState<number | string>("");
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTargetName, setSubmittedTargetName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // View tabs & received reviews state (for both Employer and Applicant)
  const [activeTab, setActiveTab] = useState<"received-reviews" | "submit-feedback">("received-reviews");
  const [companyReviews, setCompanyReviews] = useState<CompanyReviewItem[]>([]);
  const [companyReviewFilter, setCompanyReviewFilter] = useState<number | "all" | "anonymous">("all");
  const [applicantReceivedReviews, setApplicantReceivedReviews] = useState<any[]>([]);
  const [applicantReviewFilter, setApplicantReviewFilter] = useState<number | "all" | "anonymous">("all");

  // Inline edit state for history cards
  const [editingCardId, setEditingCardId] = useState<string | number | null>(null);
  const [editingCardRating, setEditingCardRating] = useState(5);
  const [editingCardComments, setEditingCardComments] = useState("");
  const [editingCardIsAnonymous, setEditingCardIsAnonymous] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [cardErrorMessage, setCardErrorMessage] = useState("");

  // Delete feedback confirmation modal & toast
  const [feedbackToDelete, setFeedbackToDelete] = useState<FeedbackRecord | null>(null);
  const [isDeletingFeedback, setIsDeletingFeedback] = useState(false);
  const [deleteToastMessage, setDeleteToastMessage] = useState("");

  // Details Modal state
  const [detailsJob, setDetailsJob] = useState<TargetOption | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isEmployerModalOnTop, setIsEmployerModalOnTop] = useState(false);
  const [applicantMatchProfile, setApplicantMatchProfile] = useState<ApplicantMatchProfile | null>(null);

  // Messaging Side Panel state (Unified for Employer <-> Candidate modal)
  const [isMsgPanelOpen, setIsMsgPanelOpen] = useState(false);
  const [isMsgPanelClosing, setIsMsgPanelClosing] = useState(false);
  const [activeMsgThread, setActiveMsgThread] = useState<any | null>(null);
  const [panelMessages, setPanelMessages] = useState<any[]>([]);
  const [isMsgLoading, setIsMsgLoading] = useState(false);
  const [msgInputText, setMsgInputText] = useState("");
  const [isMsgSending, setIsMsgSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const msgScrollRef = useRef<HTMLDivElement>(null);

  const scrollMsgChatToBottom = (instant = true) => {
    const doScroll = () => {
      if (msgScrollRef.current) {
        msgScrollRef.current.scrollTop = msgScrollRef.current.scrollHeight;
      }
      if (msgEndRef.current) {
        msgEndRef.current.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "end" });
      }
    };
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 40);
    setTimeout(doScroll, 120);
  };

  useEffect(() => {
    if (isMsgPanelOpen) {
      scrollMsgChatToBottom(true);
    }
  }, [isMsgPanelOpen, panelMessages]);

  const fetchThreadMessages = async (otherUserId: number) => {
    setIsMsgLoading(true);
    try {
      const currentUid = userId;
      if (!currentUid) {
        setIsMsgLoading(false);
        return;
      }

      const threadsRes = await authFetch(`/api/users/${currentUid}/messages`);
      if (!threadsRes.ok) {
        setIsMsgLoading(false);
        return;
      }

      const threadsData = await threadsRes.json();
      const allThreads = threadsData?.threads || [];
      const existing = allThreads.find((t: any) => Number(t.other_user_id) === Number(otherUserId));

      if (existing) {
        setActiveMsgThread(existing);
        const msgRes = await authFetch(`/api/messages/threads/${existing.id}`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setPanelMessages(msgData?.messages || []);
        }
        try {
          await authFetch(`/api/messages/threads/${existing.id}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: currentUid }),
          });
          window.dispatchEvent(new Event("elitecruit_messages_update"));
        } catch {}
      } else {
        setActiveMsgThread(null);
        setPanelMessages([]);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setIsMsgLoading(false);
    }
  };

  const handleCloseMsgPanel = () => {
    setIsMsgPanelClosing(true);
    setTimeout(() => {
      setIsMsgPanelOpen(false);
      setIsMsgPanelClosing(false);
    }, 220);
  };

  const handleToggleMsgPanel = () => {
    if (isMsgPanelOpen) {
      handleCloseMsgPanel();
    } else {
      setIsMsgPanelClosing(false);
      setIsMsgPanelOpen(true);
      const targetUid = role === "employer" ? detailsJob?.applicantUserId : detailsJob?.employerUserId;
      if (targetUid) {
        fetchThreadMessages(Number(targetUid));
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = msgInputText.trim();
    const targetUid = role === "employer" ? detailsJob?.applicantUserId : detailsJob?.employerUserId;
    const targetName = detailsJob?.name || (role === "employer" ? "Candidate" : "Employer");

    if (!text || isMsgSending || !targetUid || !userId) return;

    setIsMsgSending(true);
    try {
      if (activeMsgThread?.id) {
        const res = await authFetch(`/api/messages/threads/${activeMsgThread.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender_user_id: userId,
            message_text: text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPanelMessages((prev) => [...prev, data.message]);
          setMsgInputText("");
          window.dispatchEvent(new Event("elitecruit_messages_update"));
          scrollMsgChatToBottom(false);
        }
      } else {
        const res = await authFetch("/api/messages/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_by_user_id: userId,
            participant_user_ids: [Number(targetUid)],
            title: role === "employer" ? `Candidate: ${targetName}` : `Employer: ${targetName}`,
            message_text: text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setActiveMsgThread(data.thread);
          setPanelMessages([data.message]);
          setMsgInputText("");
          window.dispatchEvent(new Event("elitecruit_messages_update"));
          scrollMsgChatToBottom(false);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsMsgSending(false);
    }
  };

  const initialsFrom = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Employer Details Modal state (for clicking employer in job details modal)
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<EmployerModalData | null>(null);

  const handleOpenEmployerDetails = async (empUserId: number | string) => {
    setIsEmployerModalOnTop(true);
    try {
      const res = await authFetch(`/api/employers/${empUserId}/profile`);
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          setSelectedCompanyDetails({
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

    // Fallback if employer profile route fails (e.g. sample employer 501 / Apex Global Solutions)
    if (detailsJob) {
      setSelectedCompanyDetails({
        employer_user_id: empUserId,
        company_name: detailsJob.name || "Apex Global Solutions Inc.",
        business_name: detailsJob.name || "Apex Global Solutions Inc.",
        company_description: detailsJob.description || "Apex Global Solutions Inc. is a premier digital technology solutions provider specializing in enterprise web applications, cloud infrastructure, and modern engineering practices across the Cavite province.",
        company_address: detailsJob.location || "Silang, Cavite",
        address: detailsJob.location || "Silang, Cavite",
        contact_number: "+63 46 414 8899",
        business_email: "contact@apexsolutions.ph",
        industry: "Information Technology & Software Services",
        company_size: "50-249 Employees",
        rating: detailsJob.rating || "4.8",
        company_logo_path: detailsJob.companyLogoPath || null,
        company_cover_path: detailsJob.companyCoverPath || null,
      });
    }
  };

  const jobModalData: JobModalData | null = useMemo(() => {
    if (!detailsJob || role === "employer") return null;

    const detailsMatchInfo = calculateJobMatchDetails(
      {
        id: typeof detailsJob.id === "number" ? detailsJob.id : 0,
        title: detailsJob.jobTitle || "Job",
        salaryMin: Number(detailsJob.salary_min || 0),
        location: detailsJob.location,
        setup: detailsJob.workSetup,
        skillTags: detailsJob.requiredSkills || [],
        qualTags: detailsJob.qualifications || [],
        certTags: detailsJob.certifications || [],
      },
      applicantMatchProfile as any
    );

    const isSalaryHidden = Boolean(
      detailsJob.hide_salary === 1 ||
      detailsJob.hide_salary === "1" ||
      detailsJob.hide_salary === true ||
      detailsJob.hide_salary === "true"
    );

    return {
      id: detailsJob.jobPostId || detailsJob.id,
      title: detailsJob.jobTitle || "Job Details",
      company: detailsJob.name,
      employerUserId: detailsJob.employerUserId,
      companyLogoPath: detailsJob.companyLogoPath,
      companyCoverPath: detailsJob.companyCoverPath,
      location: detailsJob.location,
      rating: detailsJob.rating,
      matchScore: detailsMatchInfo.score,
      status: "open",
      setup: detailsJob.workSetup,
      salary: detailsJob.salary,
      salary_min: detailsJob.salary_min,
      salary_max: detailsJob.salary_max,
      hide_salary: isSalaryHidden ? 1 : 0,
      description: detailsJob.description,
      skillTags: detailsJob.requiredSkills,
      qualTags: detailsJob.qualifications,
      certTags: detailsJob.certifications,
      closeDate: detailsJob.closeDate && detailsJob.closeDate !== "-"
        ? new Date(detailsJob.closeDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
        : "-",
      applicationLimit: detailsJob.applicationLimit,
      applicantCount: detailsJob.applicantCount,
    };
  }, [detailsJob, role, applicantMatchProfile]);

  const renderMessageSidePanel = () => {
    if (!detailsJob) return null;
    const targetName = detailsJob.name || (role === "employer" ? "Candidate" : "Employer");
    const targetSubtitle = role === "employer" ? `Message • ${detailsJob.jobTitle || "Candidate"}` : "Direct Messaging";
    const logoSrc = role === "employer"
      ? (detailsJob.profilePicturePath
          ? (detailsJob.profilePicturePath.startsWith("http") || detailsJob.profilePicturePath.startsWith("/api")
              ? detailsJob.profilePicturePath
              : detailsJob.applicantUserId ? `/api/applicants/${detailsJob.applicantUserId}/profile-picture` : null)
          : detailsJob.applicantUserId ? `/api/applicants/${detailsJob.applicantUserId}/profile-picture` : null)
      : (detailsJob.companyLogoPath
          ? (detailsJob.companyLogoPath.startsWith("http") || detailsJob.companyLogoPath.startsWith("/api")
              ? detailsJob.companyLogoPath
              : detailsJob.employerUserId ? `/api/employers/${detailsJob.employerUserId}/logo` : null)
          : detailsJob.employerUserId ? `/api/employers/${detailsJob.employerUserId}/logo` : null);

    return (
      <aside
        className={`jd-side-comparison-panel cand-message-side-panel ${isMsgPanelClosing ? "closing" : "opening"}`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="jd-side-panel-header" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="jd-side-title-row" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              className="cand-msg-header-avatar"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#0284c7",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.85rem",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={targetName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                    }
                  }}
                />
              ) : null}
              <span style={{ display: logoSrc ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                {initialsFrom(targetName)}
              </span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#01294a", fontFamily: "'Inter', sans-serif" }}>
                {targetName}
              </h3>
              <span className="jd-side-subtitle" style={{ fontSize: "0.8rem", color: "#557796", fontWeight: 600 }}>
                {targetSubtitle}
              </span>
            </div>
          </div>

          <div className="jd-side-header-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="jd-side-close-btn"
              aria-label="Close message panel"
              onClick={handleCloseMsgPanel}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messaging Chat Body */}
        <div className="cand-msg-chat-body" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div
            ref={msgScrollRef}
            className="cand-msg-messages-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {isMsgLoading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                Loading conversation...
              </div>
            ) : panelMessages.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(2, 132, 199, 0.15)",
                    color: "#0284c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h4 className="cand-msg-empty-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
                  Start a conversation
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5, textAlign: "center" }}>
                  {role === "employer"
                    ? `Send a direct message to ${targetName} regarding their application or interview.`
                    : `Send a direct message to ${targetName} to inquire about this role or company.`}
                </p>
              </div>
            ) : (
              <>
                {panelMessages.map((msg: any) => {
                  const isMe = Number(msg.sender_user_id) === Number(userId);
                  const timeStr = msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                    : "";
                  return (
                    <div
                      key={msg.id}
                      className={`cand-msg-row ${isMe ? "outgoing" : "incoming"}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isMe ? "flex-end" : "flex-start",
                        gap: "3px",
                      }}
                    >
                      {!isMe && (
                        <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, paddingLeft: "4px" }}>
                          {targetName}
                        </span>
                      )}
                      <div
                        className={`cand-msg-bubble ${isMe ? "outgoing" : "incoming"}`}
                        style={{
                          maxWidth: "82%",
                          padding: "10px 14px",
                          borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                          fontSize: "0.86rem",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.message_text}
                      </div>
                      <span style={{ fontSize: "0.68rem", color: "#94a3b8", padding: "0 4px" }}>
                        {timeStr}
                      </span>
                    </div>
                  );
                })}
                <div ref={msgEndRef} />
              </>
            )}
          </div>

          {/* Compose Bar */}
          <form
            onSubmit={handleSendMessage}
            className="cand-msg-compose-bar"
            style={{
              padding: "12px 16px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              className="cand-msg-input"
              placeholder={`Message ${targetName}...`}
              value={msgInputText}
              onChange={(e) => setMsgInputText(e.target.value)}
              disabled={isMsgSending}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              type="submit"
              className="cand-msg-send-btn"
              disabled={!msgInputText.trim() || isMsgSending}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "none",
                background: "#0284c7",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: !msgInputText.trim() || isMsgSending ? "not-allowed" : "pointer",
              }}
            >
              {isMsgSending ? "..." : "Send"}
            </button>
          </form>
        </div>
      </aside>
    );
  };

  // Feedback list state
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setFeedbackList([]);
      setTargetOptions([]);
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

      if (savedUser.id) setUserId(savedUser.id);
      const isEmp = savedUser.role === "employer";
      setRole(isEmp ? "employer" : "applicant");

      const first = savedUser.first_name || savedUser.firstName || "";
      const last = savedUser.last_name || savedUser.lastName || "";
      const fullName = `${first} ${last}`.trim() || savedUser.email || (isEmp ? "Employer" : "Applicant");
      setApplicantLabel(fullName);

      if (!isEmp && savedUser.id) {
        authFetch(`/api/applicants/${savedUser.id}/profile`)
          .then((res) => res.json())
          .then((data) => {
            const p = data?.profile;
            const fName = [p?.first_name, p?.middle_name, p?.last_name].filter(Boolean).join(" ");
            if (fName) setApplicantLabel(fName);
            setApplicantMatchProfile({
              desiredJobTitle: p?.desired_job_title || "",
              workArrangement: p?.work_arrangement || "",
              expectedSalary: Number(p?.expected_salary || 0) || null,
              city: p?.city || "",
              skills: parseCompetencyDisplayTags(p?.skills),
              certifications: parseCompetencyDisplayTags(p?.certifications),
              qualifications: parseCompetencyDisplayTags(p?.qualifications),
              rawSkills: typeof p?.skills === "string" ? p?.skills : JSON.stringify(p?.skills || []),
              rawCertifications: typeof p?.certifications === "string" ? p?.certifications : JSON.stringify(p?.certifications || []),
            });
          })
          .catch(() => {});
      }

      const storageKey = isEmp ? "elitecruit-employer-feedback-history" : "elitecruit-applicant-feedback-history";
      
      // Fetch persisted feedbacks from backend
      if (savedUser.id) {
        const feedbacksEndpoint = isEmp ? `/api/employers/${savedUser.id}/candidate-feedbacks` : `/api/applicants/${savedUser.id}/company-feedbacks`;
        authFetch(feedbacksEndpoint)
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data?.feedbacks) && data.feedbacks.length > 0) {
              const mappedFb: FeedbackRecord[] = data.feedbacks.map((f: any) => ({
                id: f.id,
                targetName: f.target_name || (isEmp ? f.candidate_name : "Company"),
                status: f.status || (isEmp ? "Recruited" : "Accepted"),
                jobTitle: f.job_title || (isEmp ? "Full Stack Web Developer" : "Job Position"),
                jobPostId: f.job_post_id ? Number(f.job_post_id) : undefined,
                applicantUserId: f.applicant_user_id ? Number(f.applicant_user_id) : undefined,
                employerUserId: f.employer_user_id ? Number(f.employer_user_id) : undefined,
                rating: Number(f.rating) || 5,
                comments: f.comments || "",
                date: f.created_at ? new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent",
                isAnonymous: Boolean(f.is_anonymous || f.isAnonymous),
                description: f.description || "",
                requiredSkills: f.required_skills ? parseCompetencyDisplayTags(f.required_skills) : undefined,
                qualifications: f.qualifications ? parseCompetencyDisplayTags(f.qualifications) : undefined,
                certifications: f.certifications ? parseCompetencyDisplayTags(f.certifications) : undefined,
                workSetup: f.work_arrangement || "On-Site",
                salary: formatSalaryRange(f.salary_min, f.salary_max),
                salary_min: f.salary_min,
                salary_max: f.salary_max,
                hide_salary: f.hide_salary,
                closeDate: f.close_date || "-",
                applicationLimit: f.application_limit,
                applicantCount: f.applicant_count,
                location: formatLocationWithCavite(f.location),
                companyLogoPath: f.company_logo_path || null,
                companyCoverPath: f.company_cover_path || null,
              }));
              setFeedbackList(mappedFb);
              localStorage.setItem(storageKey, JSON.stringify(mappedFb));
            } else {
              // Fallback to local storage cache if API returned empty
              const cached = localStorage.getItem(storageKey);
              if (cached) {
                try {
                  setFeedbackList(JSON.parse(cached));
                } catch {
                  setFeedbackList([]);
                }
              }
            }
          })
          .catch(() => {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
              try { setFeedbackList(JSON.parse(cached)); } catch { setFeedbackList([]); }
            }
          });
      }

      if (isEmp) {
        if (savedUser.id) {
          authFetch(`/api/employers/${savedUser.id}/company-feedbacks`)
            .then((res) => res.json())
            .then((data) => {
              if (Array.isArray(data?.feedbacks)) {
                setCompanyReviews(data.feedbacks);
              }
            })
            .catch(() => {});

          authFetch(`/api/employers/${savedUser.id}/eligible-feedback-candidates`)
            .then((res) => res.json())
            .then((data) => {
              const list = Array.isArray(data?.candidates) ? data.candidates : [];
              const mapped: TargetOption[] = list.map((a: any) => ({
                id: a.application_id || a.applicant_user_id,
                applicantUserId: a.applicant_user_id,
                jobPostId: a.job_post_id ? Number(a.job_post_id) : undefined,
                name: a.candidate_name || a.applicant_name || "Applicant",
                status: ["approved", "accepted", "recruited"].includes(String(a.application_status || a.status || "").toLowerCase()) ? "Recruited" : "Denied",
                jobTitle: a.job_title || "Full Stack Web Developer",
                location: formatLocationWithCavite(a.city || "Silang, Cavite"),
                workSetup: a.work_arrangement || "On-Site",
                salary: "—",
                rating: a.rating ? String(a.rating) : "5.0",
                email: a.email || "",
                phone: a.phone || "",
                requiredSkills: parseCompetencyDisplayTags(a.skills),
                qualifications: parseCompetencyDisplayTags(a.qualifications),
                certifications: parseCompetencyDisplayTags(a.certifications),
                profilePicturePath: a.profile_picture_path || null,
              }));
              setTargetOptions(mapped);
              if (mapped.length > 0) setSelectedTargetId(mapped[0].id);
              else setSelectedTargetId("");
            })
            .catch(() => {
              setTargetOptions([]);
              setSelectedTargetId("");
            });
        } else {
          setTargetOptions([]);
          setSelectedTargetId("");
        }
      } else {
        if (savedUser.id) {
          authFetch(`/api/applicants/${savedUser.id}/eligible-feedback-employers`)
            .then((res) => res.json())
            .then((data) => {
              const list = Array.isArray(data?.employers) ? data.employers : [];
              const mapped: TargetOption[] = list.map((e: any) => {
                const isAccepted = ["approved", "accepted"].includes(String(e.application_status || "").toLowerCase());
                return {
                  id: e.application_id || e.employer_user_id,
                  jobPostId: e.job_post_id ? Number(e.job_post_id) : undefined,
                  employerUserId: e.employer_user_id,
                  name: e.company_name,
                  status: isAccepted ? "Accepted" : "Denied",
                  jobTitle: e.job_title || "Job Opening",
                  location: formatLocationWithCavite(e.location),
                  workSetup: e.work_arrangement || "On-Site",
                  salary: formatSalaryRange(e.salary_min, e.salary_max),
                  salary_min: e.salary_min,
                  salary_max: e.salary_max,
                  hide_salary: e.hide_salary,
                  rating: e.rating ? String(e.rating) : "0.0",
                  description: e.description || "",
                  requiredSkills: parseCompetencyDisplayTags(e.required_skills),
                  qualifications: parseCompetencyDisplayTags(e.qualifications),
                  certifications: parseCompetencyDisplayTags(e.certifications),
                  closeDate: e.close_date || "-",
                  applicationLimit: Number.isFinite(Number(e.application_limit)) ? Number(e.application_limit) : 10,
                  applicantCount: Number.isFinite(Number(e.applicant_count)) ? Number(e.applicant_count) : 0,
                  companyLogoPath: e.company_logo_path || null,
                  companyCoverPath: e.company_cover_path || null,
                };
              });
              setTargetOptions(mapped);
              if (mapped.length > 0) setSelectedTargetId(mapped[0].id);
              else setSelectedTargetId("");
            })
            .catch(() => {
              setTargetOptions([]);
              setSelectedTargetId("");
            });

          authFetch(`/api/applicants/${savedUser.id}/received-feedbacks`)
            .then((res) => res.json())
            .then((data) => {
              if (Array.isArray(data?.feedbacks)) {
                setApplicantReceivedReviews(data.feedbacks);
              }
            })
            .catch(() => {});
        } else {
          setTargetOptions([]);
          setSelectedTargetId("");
        }
      }
    } catch {
      setFeedbackList([]);
      setTargetOptions([]);
    }
  }, []);

  
  // Only targets that have NOT been reviewed yet appear in the top selection dropdown
  const availableTargets = useMemo(() => {
    return targetOptions.filter((item) => {
      return !feedbackList.some((f) => 
        (item.jobPostId && f.jobPostId === item.jobPostId) ||
        (f.targetName.trim().toLowerCase() === item.name.trim().toLowerCase())
      );
    });
  }, [targetOptions, feedbackList]);

  // Bayesian Fair Rating formula: ((v * R) + (m * C)) / (v + m)
  // where v = review count, R = arithmetic mean, m = confidence prior weight (3), C = platform prior mean (4.0)
  const computeBayesianRating = (reviews: any[], priorWeight = 3, priorMean = 4.0): string => {
    if (!reviews || reviews.length === 0) return "0.0";
    const v = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const bayesian = (sum + (priorWeight * priorMean)) / (v + priorWeight);
    return bayesian.toFixed(1);
  };

  const computeRawAverage = (reviews: any[]): string => {
    if (!reviews || reviews.length === 0) return "0.0";
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return (sum / reviews.length).toFixed(1);
  };

  // Employer received candidate reviews metrics & filtering (Bayesian Fair Rating)
  const avgCompanyRating = useMemo(() => {
    return computeBayesianRating(companyReviews);
  }, [companyReviews]);

  const rawAvgCompanyRating = useMemo(() => {
    return computeRawAverage(companyReviews);
  }, [companyReviews]);

  const companyStarCounts = useMemo(() => {
    const counts: { 5: number; 4: number; 3: number; 2: number; 1: number; anon: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, anon: 0 };
    for (const r of companyReviews) {
      const score = Math.round(Number(r.rating) || 0);
      if (score >= 1 && score <= 5) {
        counts[score as 1 | 2 | 3 | 4 | 5]++;
      }
      if (Number(r.is_anonymous) === 1 || r.is_anonymous === true) {
        counts.anon++;
      }
    }
    return counts;
  }, [companyReviews]);

  const filteredCompanyReviews = useMemo(() => {
    if (companyReviewFilter === "all") return companyReviews;
    if (companyReviewFilter === "anonymous") {
      return companyReviews.filter((r) => Number(r.is_anonymous) === 1 || r.is_anonymous === true);
    }
    return companyReviews.filter((r) => Math.round(Number(r.rating) || 0) === companyReviewFilter);
  }, [companyReviews, companyReviewFilter]);

  // Applicant received employer reviews metrics & filtering (Bayesian Fair Rating)
  const avgApplicantRating = useMemo(() => {
    return computeBayesianRating(applicantReceivedReviews);
  }, [applicantReceivedReviews]);

  const rawAvgApplicantRating = useMemo(() => {
    return computeRawAverage(applicantReceivedReviews);
  }, [applicantReceivedReviews]);

  const applicantStarCounts = useMemo(() => {
    const counts: { 5: number; 4: number; 3: number; 2: number; 1: number; anon: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, anon: 0 };
    for (const r of applicantReceivedReviews) {
      const score = Math.round(Number(r.rating) || 0);
      if (score >= 1 && score <= 5) {
        counts[score as 1 | 2 | 3 | 4 | 5]++;
      }
      if (Number(r.is_anonymous) === 1 || r.is_anonymous === true) {
        counts.anon++;
      }
    }
    return counts;
  }, [applicantReceivedReviews]);

  const filteredApplicantReviews = useMemo(() => {
    if (applicantReviewFilter === "all") return applicantReceivedReviews;
    if (applicantReviewFilter === "anonymous") {
      return applicantReceivedReviews.filter((r) => Number(r.is_anonymous) === 1 || r.is_anonymous === true);
    }
    return applicantReceivedReviews.filter((r) => Math.round(Number(r.rating) || 0) === applicantReviewFilter);
  }, [applicantReceivedReviews, applicantReviewFilter]);

  // Unified getters for View 1
  const reviewsToDisplay = role === "employer" ? filteredCompanyReviews : filteredApplicantReviews;
  const totalReviewsCount = role === "employer" ? companyReviews.length : applicantReceivedReviews.length;
  const avgScore = role === "employer" ? avgCompanyRating : avgApplicantRating;
  const rawAvgScore = role === "employer" ? rawAvgCompanyRating : rawAvgApplicantRating;
  const starCounts = role === "employer" ? companyStarCounts : applicantStarCounts;
  const currentFilter = role === "employer" ? companyReviewFilter : applicantReviewFilter;
  const handleFilterChange = (filter: any) => {
    if (role === "employer") {
      setCompanyReviewFilter(filter);
    } else {
      setApplicantReviewFilter(filter);
    }
  };

  // Keep selectedTargetId synchronized with available (unreviewed) targets
  useEffect(() => {
    if (availableTargets.length > 0) {
      const stillValid = availableTargets.some((t) => String(t.id) === String(selectedTargetId));
      if (!stillValid) {
        setSelectedTargetId(availableTargets[0].id);
      }
    } else {
      setSelectedTargetId("");
    }
  }, [availableTargets, selectedTargetId]);

  // Auto-dismiss delete toast message after 5 seconds
  useEffect(() => {
    if (!deleteToastMessage) return;
    const timer = setTimeout(() => {
      setDeleteToastMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [deleteToastMessage]);

  const handleSelectTarget = (targetId: string | number) => {
    setSelectedTargetId(targetId);
    setSubmitted(false);
    setErrorMessage("");
  };

  // Inline card edit handlers for Activity History
  const handleStartInlineEdit = (item: FeedbackRecord) => {
    setEditingCardId(item.id);
    setEditingCardRating(item.rating);
    setEditingCardComments(item.comments);
    setEditingCardIsAnonymous(Boolean(item.isAnonymous));
    setCardErrorMessage("");
  };

  const handleCancelInlineEdit = () => {
    setEditingCardId(null);
    setCardErrorMessage("");
  };

  const handleSaveInlineEdit = async (item: FeedbackRecord) => {
    if (!editingCardComments.trim()) {
      setCardErrorMessage("Please provide review comments before saving.");
      return;
    }

    setIsSavingCard(true);
    setCardErrorMessage("");

    try {
      const matched = targetOptions.find(
        (t) => (item.jobPostId && t.jobPostId === item.jobPostId) || t.name.trim().toLowerCase() === item.targetName.trim().toLowerCase()
      );

      const jobPostId = item.jobPostId || matched?.jobPostId;
      const targetEmpId = item.employerUserId || matched?.employerUserId || matched?.id;
      const targetAppId = item.applicantUserId || matched?.applicantUserId || matched?.id;

      if (role === "applicant" && userId && targetEmpId) {
        await authFetch(`/api/applicants/${userId}/company-feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employer_user_id: Number(targetEmpId),
            job_post_id: jobPostId ? Number(jobPostId) : undefined,
            rating: editingCardRating,
            comments: editingCardComments.trim(),
            is_anonymous: editingCardIsAnonymous ? 1 : 0,
          }),
        });
      } else if (role === "employer" && userId && targetAppId) {
        await authFetch(`/api/employers/${userId}/applicant-feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicant_user_id: Number(targetAppId),
            job_post_id: jobPostId ? Number(jobPostId) : undefined,
            rating: editingCardRating,
            comments: editingCardComments.trim(),
            is_anonymous: editingCardIsAnonymous ? 1 : 0,
          }),
        });
      }

      setFeedbackList((prev) => {
        const updated = prev.map((f) => {
          if (f.id === item.id) {
            return {
              ...f,
              rating: editingCardRating,
              comments: editingCardComments.trim(),
              isAnonymous: editingCardIsAnonymous,
              date: "Just now",
            };
          }
          return f;
        });
        const key = role === "employer" ? "elitecruit-employer-feedback-history" : "elitecruit-applicant-feedback-history";
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });

      setEditingCardId(null);
    } catch (err) {
      setCardErrorMessage(err instanceof Error ? err.message : "Unable to save feedback.");
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) {
      alert("Please select an entry to rate.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const targetObj = targetOptions.find((t) => String(t.id) === String(selectedTargetId));
    const targetName = targetObj?.name || (role === "employer" ? "Candidate" : "Company");
    const targetStatus = targetObj?.status || (role === "employer" ? "Recruited" : "Accepted");
    const targetJobTitle = targetObj?.jobTitle || "Job Position";

    try {
      const targetEmpId = targetObj?.employerUserId || targetObj?.id;
      const targetAppId = targetObj?.applicantUserId || targetObj?.id;
      const jobPostId = targetObj?.jobPostId;

      let savedRecordId: string | number = `fb-${Date.now()}`;

      if (role === "applicant" && userId && targetEmpId) {
        const res = await authFetch(`/api/applicants/${userId}/company-feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employer_user_id: Number(targetEmpId),
            job_post_id: jobPostId ? Number(jobPostId) : undefined,
            rating,
            comments,
            is_anonymous: isAnonymous ? 1 : 0,
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData?.feedback?.id) savedRecordId = resData.feedback.id;
        }
      } else if (role === "employer" && userId && targetAppId) {
        const res = await authFetch(`/api/employers/${userId}/applicant-feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicant_user_id: Number(targetAppId),
            job_post_id: jobPostId ? Number(jobPostId) : undefined,
            rating,
            comments,
            is_anonymous: isAnonymous ? 1 : 0,
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData?.feedback?.id) savedRecordId = resData.feedback.id;
        }
      }

      const updatedRecord: FeedbackRecord = {
        id: savedRecordId,
        targetName,
        status: targetStatus,
        jobTitle: targetJobTitle,
        jobPostId: jobPostId ? Number(jobPostId) : undefined,
        employerUserId: targetEmpId ? Number(targetEmpId) : undefined,
        applicantUserId: targetAppId ? Number(targetAppId) : undefined,
        rating,
        comments,
        isAnonymous,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };

      setFeedbackList((prev) => {
        const updated = [updatedRecord, ...prev];
        const key = role === "employer" ? "elitecruit-employer-feedback-history" : "elitecruit-applicant-feedback-history";
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });

      setSubmittedTargetName(targetName);
      setSubmitted(true);
      setComments("");
      setRating(5);
      setIsAnonymous(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    setIsDeletingFeedback(true);
    const targetName = feedbackToDelete.targetName;
    const targetId = feedbackToDelete.id;

    try {
      if (userId) {
        const endpoint = role === "employer"
          ? `/api/employers/${userId}/candidate-feedback/${targetId}`
          : `/api/applicants/${userId}/company-feedback/${targetId}`;
        await authFetch(endpoint, { method: "DELETE" });
      }

      setFeedbackList((prev) => {
        const updated = prev.filter((item) => item.id !== targetId);
        const key = role === "employer" ? "elitecruit-employer-feedback-history" : "elitecruit-applicant-feedback-history";
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });

      if (editingCardId === targetId) {
        setEditingCardId(null);
      }

      setFeedbackToDelete(null);
      setDeleteToastMessage(`Feedback record for "${targetName}" was successfully deleted.`);
    } catch {
      alert("Unable to delete feedback. Please try again.");
    } finally {
      setIsDeletingFeedback(false);
    }
  };

  const handleOpenHistoryDetails = async (item: FeedbackRecord) => {
    setIsEmployerModalOnTop(false);
    setIsMsgPanelOpen(false);
    setIsMsgPanelClosing(false);

    // 1. Try to find a matching target in targetOptions
    let matched: TargetOption | undefined = targetOptions.find((t) => 
      (item.jobPostId && t.jobPostId === item.jobPostId) ||
      (item.employerUserId && t.employerUserId === item.employerUserId) ||
      (t.name && item.targetName && t.name.trim().toLowerCase() === item.targetName.trim().toLowerCase())
    );

    // 2. Fallback to predefined sample jobs if not in targetOptions
    if (!matched) {
      const fallbackKey = String(item.jobPostId || (item.targetName.includes("Apex") ? "301" : item.targetName.includes("Vanguard") ? "302" : ""));
      const fallback = FALLBACK_FEEDBACK_JOBS[fallbackKey];
      if (fallback) {
        matched = {
          id: fallback.id || item.jobPostId || 301,
          jobPostId: fallback.jobPostId || 301,
          employerUserId: fallback.employerUserId || 501,
          name: fallback.name || item.targetName,
          status: item.status,
          jobTitle: item.jobTitle || fallback.jobTitle || "Full Stack Web Developer",
          location: fallback.location || item.location || "Silang, Cavite",
          workSetup: fallback.workSetup || "Hybrid",
          salary: fallback.salary || "PHP 45,000 - 65,000",
          salary_min: fallback.salary_min || 45000,
          salary_max: fallback.salary_max || 65000,
          hide_salary: fallback.hide_salary || 0,
          rating: String(fallback.rating || "4.8"),
          description: fallback.description || "Build robust, scalable web applications with React, Node.js, and PostgreSQL.",
          requiredSkills: fallback.requiredSkills || ["React", "Node.js", "TypeScript"],
          qualifications: fallback.qualifications || ["Bachelor's Degree in IT or Computer Science"],
          certifications: fallback.certifications || ["AWS Cloud Practitioner"],
          closeDate: fallback.closeDate || "11/30/2026",
          applicationLimit: fallback.applicationLimit || 15,
          applicantCount: fallback.applicantCount || 7,
          companyLogoPath: fallback.companyLogoPath || null,
          companyCoverPath: fallback.companyCoverPath || null,
        };
      }
    }

    // 3. If item carries its own job post details from the API
    if (!matched && (item.description || item.requiredSkills)) {
      matched = {
        id: item.jobPostId || item.id,
        jobPostId: item.jobPostId,
        employerUserId: item.employerUserId,
        applicantUserId: item.applicantUserId,
        name: item.targetName,
        status: item.status,
        jobTitle: item.jobTitle || "Job Opening",
        location: item.location || "Silang, Cavite",
        workSetup: item.workSetup || "On-Site",
        salary: item.salary || "Competitive Salary",
        salary_min: item.salary_min,
        salary_max: item.salary_max,
        hide_salary: item.hide_salary,
        rating: String(item.rating || "5.0"),
        description: item.description || "No job description provided.",
        requiredSkills: item.requiredSkills || [],
        qualifications: item.qualifications || [],
        certifications: item.certifications || [],
        closeDate: item.closeDate || "-",
        applicationLimit: item.applicationLimit || 10,
        applicantCount: item.applicantCount || 0,
        companyLogoPath: item.companyLogoPath || null,
        companyCoverPath: item.companyCoverPath || null,
      };
    }

    // 4. Resolve real rating and location if employer profile is available
    let realRating = matched?.rating || String(item.rating || "5.0");
    let realLocation = matched?.location || item.location || "Silang, Cavite";
    const targetUserId = role === "employer" ? (matched?.applicantUserId || item.applicantUserId) : (matched?.employerUserId || item.employerUserId);

    if (targetUserId) {
      try {
        const endpoint = role === "employer" ? `/api/applicants/${targetUserId}/profile` : `/api/employers/${targetUserId}/profile`;
        const res = await authFetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          const p = data?.profile;
          if (p) {
            if (p.rating) realRating = Number(p.rating).toFixed(1);
            if (role !== "employer" && (p.company_address || p.city)) {
              realLocation = p.company_address || p.city;
            } else if (role === "employer" && (p.address || p.city)) {
              realLocation = p.address || p.city;
            }
          }
        }
      } catch {}
    }

    if (matched) {
      setDetailsJob({
        ...matched,
        status: item.status,
        jobTitle: item.jobTitle || matched.jobTitle || "Job Opening",
        name: item.targetName || matched.name,
        location: realLocation,
        rating: realRating !== "0.0" ? realRating : (matched.rating || "5.0"),
      });
    } else {
      setDetailsJob({
        id: item.jobPostId || item.id,
        jobPostId: item.jobPostId || 301,
        employerUserId: item.employerUserId || 501,
        applicantUserId: item.applicantUserId,
        name: item.targetName,
        status: item.status,
        jobTitle: item.jobTitle || "Full Stack Web Developer",
        location: realLocation,
        workSetup: "Hybrid",
        salary: "PHP 45,000 - 65,000",
        salary_min: 45000,
        salary_max: 65000,
        hide_salary: 0,
        rating: realRating,
        description: "Build robust, scalable web applications with React, Node.js, and PostgreSQL.",
        requiredSkills: ["React", "Node.js", "TypeScript"],
        qualifications: ["Bachelor's Degree in IT or Computer Science"],
        certifications: ["AWS Cloud Practitioner"],
        closeDate: "11/30/2026",
        applicationLimit: 15,
        applicantCount: 7,
      });
    }
  };

  const isEmployerRole = role === "employer";
  const selectedTarget = availableTargets.find((t) => String(t.id) === String(selectedTargetId)) || targetOptions.find((t) => String(t.id) === String(selectedTargetId));

  return (
    <div className={`appdash-page feedback-page ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
      {isEmployerRole ? (
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
              <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
              <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span>{unreadNotifCount > 0 && <span className="item-badge">{unreadNotifCount}</span>}</a></li>
              <li className="active"><a href="/feedback"><span className="item-icon"><EmployerIcon name="feedback" /></span><span>Feedback</span></a></li>
            </ul>
          </div>

          <div className="appdash-profile-control">
            <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((val) => !val)}>
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
      ) : (
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
            <li className="applicant-workspace-item">
              <a
                href="/applicant-dashboard"
                className="applicant-workspace-title"
                onClick={(e) => {
                  e.preventDefault();
                  setIsWorkspaceOpen((prev) => !prev);
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
                  <li><a href="/applicant-dashboard#section-smart-matches"><span className="item-icon"><SideIcon name="star" /></span><span>Smart Matches</span></a></li>
                  <li><a href="/applicant-dashboard#section-applications"><span className="item-icon"><SideIcon name="applications" /></span><span>My Applications</span></a></li>
                  <li><a href="/applicant-dashboard#section-invitations"><span className="item-icon"><SideIcon name="notifications" /></span><span>Job Invitations</span></a></li>
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
                <li key={item.label} className={item.href === "/feedback" ? "active" : ""}>
                  <a href={item.href}>
                    <span className="item-icon"><SideIcon name={item.icon} /></span>
                    <span>{item.label}</span>
                    {badgeCount ? <span className="item-badge">{badgeCount}</span> : null}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="appdash-profile-control">
            <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((val) => !val)}>
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
                <button
                  type="button"
                  className="appdash-profile-menu-btn"
                  onClick={() => setIsLogoutModalOpen(true)}
                >
                  <SideIcon name="logout" />Logout
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {isSidebarVisible && (
        <button
          type="button"
          className="appdash-backdrop"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      <main className="appdash-main">
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
            <div><strong>Feedback</strong></div>
          </div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              {isEmployerRole ? (
                <EmployerChatbotDrawer
                  isOpen={isChatbotOpen}
                  onToggle={() => setIsChatbotOpen((prev) => !prev)}
                  pageTitle="Feedback"
                  customFaqs={employerFeedbackFaqs}
                />
              ) : (
                <ApplicantChatbotDrawer
                  isOpen={isChatbotOpen}
                  onToggle={() => setIsChatbotOpen((prev) => !prev)}
                  pageTitle="Feedback"
                  customFaqs={applicantFeedbackFaqs}
                />
              )}
            </div>
            <CalendarDrawer />
          </div>
        </header>

        {/* Navigation Tabs (Available for both Employer and Applicant) */}
        <nav className="feedback-subnav-container" aria-label="Feedback Sections">
          <button
            type="button"
            className={`feedback-subnav-btn ${activeTab === "received-reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("received-reviews")}
          >
            <span>{isEmployerRole ? "Candidate Reviews on Your Company" : "Employer Reviews on You"}</span>
          </button>

          <button
            type="button"
            className={`feedback-subnav-btn ${activeTab === "submit-feedback" ? "active" : ""}`}
            onClick={() => setActiveTab("submit-feedback")}
          >
            <span>{isEmployerRole ? "Rate Candidates & Recruitment Log" : "Rate Employers & Feedback Log"}</span>
          </button>
        </nav>

        {/* VIEW 1: Received Reviews Feed (Available for both Employer and Applicant) */}
        {activeTab === "received-reviews" ? (
          <>
            {/* Rating Summary Card */}
            <section className="matches-card" style={{ margin: "16px 28px" }}>
              <div className="feedback-summary-grid">
                {/* Left: Overall score */}
                <div className="feedback-score-box">
                  <div style={{ textAlign: "center", minWidth: "90px" }}>
                    <div className="feedback-score-num">
                      {avgScore}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "2px", color: "#f59e0b", fontSize: "1.15rem", marginTop: "6px" }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} style={{ color: i < Math.round(Number(avgScore)) ? "#f59e0b" : "#cbd5e1" }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px", fontWeight: 600 }}>
                      {isEmployerRole ? "Company Score" : "Candidate Score"}
                    </div>
                  </div>

                  <div style={{ borderLeft: "1px solid var(--border-color, #e2e8f0)", paddingLeft: "18px", flex: 1 }}>
                    <div className="feedback-score-title" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span>{isEmployerRole ? "Candidate Review Sentiment" : "Employer Review Sentiment"}</span>
                      <span
                        className="feedback-bayesian-badge"
                        title="Bayesian weighted fair rating: balances individual scores against a verified platform baseline (C=4.0, prior weight m=3) to prevent bias and ensure legitimacy."
                      >
                        Fair Rating
                      </span>
                    </div>
                    <p className="feedback-score-desc">
                      {totalReviewsCount > 0 ? (
                        <>
                          Bayesian weighted score computed from <strong>{totalReviewsCount} verified {isEmployerRole ? "candidate" : "employer"} review{totalReviewsCount === 1 ? "" : "s"}</strong> (Platform baseline: 4.0 • Arithmetic avg: <strong>{rawAvgScore} ★</strong>).
                        </>
                      ) : (
                        <>No verified reviews recorded yet. Ratings will be computed fairly once recruitment interactions are completed.</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Star breakdown */}
                <div className="feedback-breakdown-box">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = (starCounts as any)[star] || 0;
                    const pct = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                    return (
                      <div key={star} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.82rem" }}>
                        <span style={{ width: "36px", color: "#f59e0b", fontWeight: 600 }}>{star} ★</span>
                        <div className="feedback-track-bar">
                          <div className="feedback-track-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ width: "24px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filter chips */}
              <div className="feedback-filter-bar">
                <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600, marginRight: "4px" }}>Filter:</span>
                {[
                  { key: "all", label: `All Reviews (${totalReviewsCount})` },
                  { key: 5, label: `5 Stars (${starCounts[5]})` },
                  { key: 4, label: `4 Stars (${starCounts[4]})` },
                  { key: 3, label: `3 Stars (${starCounts[3]})` },
                  { key: "anonymous", label: `Anonymous Only (${starCounts.anon})` },
                ].map((tab) => (
                  <button
                    key={String(tab.key)}
                    type="button"
                    onClick={() => handleFilterChange(tab.key as any)}
                    className={`feedback-filter-chip ${currentFilter === tab.key ? "active" : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Review Feed */}
            <section className="matches-card" style={{ margin: "16px 28px 32px" }}>
              <div className="matches-head" style={{ marginBottom: "16px" }}>
                <div>
                  <small>{isEmployerRole ? "Candidate Feedback Feed" : "Employer Feedback Feed"}</small>
                  <h2>{isEmployerRole ? "Applicant Reviews & Interview Comments" : "Employer Reviews & Recruitment Comments"}</h2>
                  <p>{isEmployerRole ? "Candidate ratings and experiences shared with your company." : "Ratings and feedback shared by employers after interviewing or recruiting you."}</p>
                </div>
              </div>

              {reviewsToDisplay.length === 0 ? (
                <div className="feedback-empty-card" style={{ padding: "32px 20px", borderRadius: "10px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "0.96rem", fontWeight: 700, color: "#0284c7" }}>
                    No reviews match the selected filter.
                  </p>
                  <small style={{ display: "block", marginTop: "8px", fontSize: "0.84rem", color: "#64748b" }}>
                    Try selecting another star rating or "All Reviews" to view feedback.
                  </small>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "14px" }}>
                  {reviewsToDisplay.map((rev: any) => {
                    const isAnon = Number(rev.is_anonymous) === 1 || rev.is_anonymous === true;
                    const score = Number(rev.rating) || 5;
                    const formattedDate = rev.created_at
                      ? new Date(rev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Recent";
                    const reviewerName = isEmployerRole ? (rev.candidate_name || "Candidate") : (rev.company_name || "Employer Company");
                    const roleLabel = isEmployerRole ? `Applied for: ${rev.job_title || "Job Position"}` : `Recruited for: ${rev.job_title || "Job Position"}`;
                    const avatarPic = isEmployerRole ? rev.profile_picture_path : rev.company_logo_path;

                    return (
                      <div
                        key={rev.id}
                        className="candidate-review-card"
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              className={`candidate-review-avatar ${isAnon ? "anonymous" : ""}`}
                            >
                              {isAnon ? (
                                <svg
                                  width="22"
                                  height="22"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              ) : avatarPic ? (
                                <img
                                  src={avatarPic}
                                  alt={reviewerName}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                initialsFrom(reviewerName)
                              )}
                            </div>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <strong className={`candidate-review-name ${isAnon ? "anonymous" : ""}`}>
                                  {reviewerName}
                                </strong>
                                {isAnon ? (
                                  <span className="candidate-review-badge-anonymous">
                                    Anonymous Review
                                  </span>
                                ) : (
                                  <span className="candidate-review-badge-verified">
                                    {isEmployerRole ? "Verified Candidate" : "Verified Employer"}
                                  </span>
                                )}
                              </div>
                              <span className="candidate-review-role">
                                {roleLabel}
                              </span>
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "2px", color: "#f59e0b", fontSize: "1.1rem" }}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} style={{ color: i < score ? "#f59e0b" : "#cbd5e1" }}>★</span>
                              ))}
                            </div>
                            <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block", marginTop: "4px" }}>
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        <blockquote className="candidate-review-quote">
                          "{rev.comments}"
                        </blockquote>

                        <div className="candidate-review-footer">
                          <span>Verified interaction on EliteCruit platform</span>
                          <span>Confidentiality protected</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          /* VIEW 2: Feedback Submission Form & Activity History */
          <>
        {/* Feedback Submission Form */}
        <section className="matches-card" style={{ margin: "16px 28px" }}>
          <div className="matches-head" id="feedback-submission-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
            <div>
              <small>Feedback Submission</small>
              <h2 style={{ margin: 0, marginTop: "2px" }}>
                {isEmployerRole ? "Rate a Candidate / Recruitment Record" : "Rate a Company"}
              </h2>
              <p style={{ marginTop: "4px" }}>
                {isEmployerRole
                  ? "Feedback can be submitted for candidates who Accepted or Denied your recruitment invitations."
                  : "Feedback can be submitted for companies where your application was Accepted or Denied."}
              </p>
            </div>

            {selectedTarget && availableTargets.length > 0 && (
              <button
                type="button"
                className="solid-btn"
                onClick={() => {
                  setIsEmployerModalOnTop(false);
                  setIsMsgPanelOpen(false);
                  setIsMsgPanelClosing(false);
                  setDetailsJob(selectedTarget);
                }}
                style={{
                  padding: "8px 18px",
                  fontSize: "0.85rem",
                  whiteSpace: "nowrap",
                }}
              >
                {isEmployerRole ? "Details" : "Job Details"}
              </button>
            )}
          </div>

          {submitted ? (
            <div className="job-card" style={{ background: "#e8fff2", borderColor: "#a3e6be", marginTop: "16px" }}>
              <div>
                <h3 style={{ color: "#138247" }}>✓ Thank you for your feedback!</h3>
                <p style={{ color: "#276749" }}>
                  Your rating and review for <strong>{submittedTargetName}</strong> has been saved and logged in real time.
                </p>
              </div>
              <button type="button" className="solid-btn" onClick={() => { setSubmitted(false); setComments(""); }}>
                Submit Another Review
              </button>
            </div>
          ) : availableTargets.length === 0 ? (
            <div className="feedback-empty-card" style={{ padding: "32px 20px", borderRadius: "10px", textAlign: "center", marginTop: "16px" }}>
              <p className="feedback-empty-card-title" style={{ margin: 0, fontSize: "0.96rem", fontWeight: 700, color: "#38bdf8" }}>
                {feedbackList.length > 0
                  ? `✓ All eligible ${isEmployerRole ? "candidates" : "positions"} have been reviewed!`
                  : `No eligible ${isEmployerRole ? "candidates" : "applications"} available.`}
              </p>
              <small className="feedback-empty-card-sub" style={{ display: "block", marginTop: "8px", fontSize: "0.84rem", color: "#94a3b8" }}>
                {feedbackList.length > 0
                  ? (isEmployerRole
                      ? "You have reviewed all available candidates. To edit or update an existing review, click 'Edit' directly on any candidate card in the Recruitment Feedback Log below."
                      : "You have reviewed all eligible companies. To edit or update an existing review, click 'Edit' directly on any company card in the Activity History below.")
                  : (isEmployerRole
                      ? "Feedback can only be submitted for candidates who have Accepted or Denied your recruitment invitations."
                      : "Feedback can only be submitted for applications marked as Accepted or Denied by the employer.")}
              </small>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: "16px", display: "grid", gap: "16px" }}>
              {errorMessage && (
                <div style={{ padding: "10px 14px", background: "#ffe8e8", color: "#b02a2a", border: "1px solid #f6b3b3", borderRadius: "8px", fontSize: "0.88rem" }}>
                  {errorMessage}
                </div>
              )}

              <label className="job-opening-select-label" style={{ display: "grid", gap: "6px" }}>
                {isEmployerRole ? "Select Candidate" : "Select Target Company"}
                <select
                  className="job-opening-select"
                  value={selectedTargetId}
                  onChange={(e) => handleSelectTarget(e.target.value)}
                  required
                >
                  {availableTargets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.jobTitle}
                    </option>
                  ))}
                </select>
              </label>

              <label className="feedback-form-label" style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
                Rating
                <div style={{ display: "flex", gap: "8px" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "1.6rem",
                        cursor: "pointer",
                        color: star <= rating ? "#f59e0b" : "#cbd5e1",
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </label>

              <label className="feedback-form-label" style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
                Comments & Review
                <textarea
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    isEmployerRole
                      ? "Share details regarding the candidate recruitment experience, communication responsiveness, or onboarding process..."
                      : "Share details about the application process, interview experience, or recruiter responsiveness..."
                  }
                  style={{ padding: "10px 12px", border: "1px solid #d7dfeb", borderRadius: "8px", fontSize: "0.88rem", fontFamily: "inherit" }}
                  required
                />
              </label>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
                <label className={`anon-toggle-container ${isAnonymous ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ display: "none" }}
                  />
                  <div className="anon-toggle-track">
                    <div className="anon-toggle-thumb" />
                  </div>
                  <span className="anon-toggle-label">
                    {isAnonymous ? "Anonymous Feedback (Identity Hidden)" : "Submit Anonymously"}
                  </span>
                </label>

                <button type="submit" className="solid-btn" disabled={submitting} style={{ padding: "10px 24px", fontSize: "0.88rem" }}>
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Feedback History Log Section */}
        <section className="matches-card" style={{ margin: "16px 28px 32px" }}>
          <div className="matches-head">
            <div>
              <small>Activity History</small>
              <h2>{isEmployerRole ? "Recruitment Feedback Log" : "Submitted Company Feedback"}</h2>
              <p>Log of reviews recorded for accepted and denied outcomes.</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
            {feedbackList.map((item) => {
              const isAccepted = item.status.toLowerCase().includes("accept") || item.status.toLowerCase().includes("recruit") || item.status.toLowerCase().includes("approved");
              const displayStatus = isAccepted ? (isEmployerRole ? "Recruited" : "Accepted") : "Denied";
              const isEditingThisCard = editingCardId === item.id;

              if (isEditingThisCard) {
                return (
                  <div
                    key={item.id}
                    className="feedback-history-card editing"
                    style={{
                      padding: "20px",
                      borderRadius: "10px",
                      border: "1px solid #38bdf8",
                      boxShadow: "0 0 16px rgba(56, 189, 248, 0.12)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                      <div>
                        <strong className="feedback-history-target" style={{ fontSize: "1.02rem" }}>{item.targetName}</strong>
                        <span className="feedback-history-sub" style={{ fontSize: "0.84rem", marginLeft: "10px" }}>{item.jobTitle}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: isAccepted ? "#dcfce7" : "#fee2e2",
                            color: isAccepted ? "#15803d" : "#b91c1c",
                            border: isAccepted ? "1px solid #bbf7d0" : "1px solid #fca5a5",
                          }}
                        >
                          {displayStatus}
                        </span>
                        <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", border: "1px solid #bae6fd" }}>
                          Editing Review
                        </span>
                      </div>
                    </div>

                    {cardErrorMessage && (
                      <div style={{ padding: "8px 12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "6px", fontSize: "0.82rem", marginBottom: "10px" }}>
                        {cardErrorMessage}
                      </div>
                    )}

                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#94a3b8", marginBottom: "4px" }}>
                        Rating
                      </label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditingCardRating(star)}
                            style={{
                              background: "none",
                              border: "none",
                              fontSize: "1.5rem",
                              cursor: "pointer",
                              color: star <= editingCardRating ? "#f59e0b" : "#cbd5e1",
                              padding: 0,
                              lineHeight: 1,
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#94a3b8", marginBottom: "6px" }}>
                        Comments & Review
                      </label>
                      <textarea
                        rows={4}
                        value={editingCardComments}
                        onChange={(e) => setEditingCardComments(e.target.value)}
                        placeholder="Update your feedback comments..."
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid #38bdf8",
                          fontSize: "0.88rem",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                      <label className={`anon-toggle-container ${editingCardIsAnonymous ? "active" : ""}`} style={{ padding: "4px 10px" }}>
                        <input
                          type="checkbox"
                          checked={editingCardIsAnonymous}
                          onChange={(e) => setEditingCardIsAnonymous(e.target.checked)}
                          style={{ display: "none" }}
                        />
                        <div className="anon-toggle-track" style={{ width: "34px", height: "20px" }}>
                          <div className="anon-toggle-thumb" style={{ width: "14px", height: "14px", left: editingCardIsAnonymous ? "17px" : "3px" }} />
                        </div>
                        <span className="anon-toggle-label" style={{ fontSize: "0.82rem" }}>
                          {editingCardIsAnonymous ? "Anonymous" : "Submit Anonymously"}
                        </span>
                      </label>

                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={handleCancelInlineEdit}
                          disabled={isSavingCard}
                          style={{
                            padding: "7px 16px",
                            fontSize: "0.84rem",
                            background: "transparent",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="solid-btn"
                          onClick={() => handleSaveInlineEdit(item)}
                          disabled={isSavingCard}
                          style={{ padding: "7px 20px", fontSize: "0.84rem", borderRadius: "6px" }}
                        >
                          {isSavingCard ? "Saving..." : "Update Feedback"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="feedback-history-card"
                  style={{
                    padding: "16px 20px",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <strong className="feedback-history-target" style={{ fontSize: "1rem" }}>{item.targetName}</strong>
                      <span className="feedback-history-sub" style={{ fontSize: "0.82rem", marginLeft: "10px" }}>{item.jobTitle}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {item.isAnonymous && (
                        <span className="candidate-review-badge-anonymous">
                          Anonymous
                        </span>
                      )}
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: isAccepted ? "#dcfce7" : "#fee2e2",
                          color: isAccepted ? "#15803d" : "#b91c1c",
                          border: isAccepted ? "1px solid #bbf7d0" : "1px solid #fca5a5",
                        }}
                      >
                        {displayStatus}
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{item.date}</span>
                    </div>
                  </div>

                  <div style={{ margin: "8px 0 6px", display: "flex", gap: "2px", color: "#f59e0b", fontSize: "1rem" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < item.rating ? "#f59e0b" : "#cbd5e1" }}>★</span>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                    <p className="feedback-history-comment" style={{ margin: 0, fontSize: "0.88rem", lineHeight: "1.5", flex: 1 }}>
                      "{item.comments}"
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end", flexShrink: 0 }}>
                      <button
                        type="button"
                        className="feedback-history-action-btn feedback-history-btn-details"
                        onClick={() => handleOpenHistoryDetails(item)}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="feedback-history-action-btn feedback-history-btn-edit"
                        onClick={() => handleStartInlineEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="feedback-history-action-btn feedback-history-btn-delete"
                        onClick={() => setFeedbackToDelete(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </>
    )}
  </main>

      {/* ── DETAILS MODAL OVERLAY ── */}
      {detailsJob && (
        isEmployerRole ? (
          /* ── CANDIDATE DETAILS MODAL (1:1 Copy from Applicant Finder) ── */
          <div
            className="jd-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Candidate Details"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDetailsJob(null);
                setIsMsgPanelOpen(false);
                setIsMsgPanelClosing(false);
              }
            }}
          >
            <div
              className={`jd-modal-container ${isMsgPanelOpen || isMsgPanelClosing ? "with-side-panel" : ""}`}
              style={!(isMsgPanelOpen || isMsgPanelClosing) ? { maxWidth: "820px" } : undefined}
            >
              <div className="jd-panel-outer-wrap">
                <div className="jd-floating-tabs-container">
                  <button
                    type="button"
                    className={`jd-floating-breakdown-tab ${isMsgPanelOpen && !isMsgPanelClosing ? "active" : ""}`}
                    onClick={handleToggleMsgPanel}
                  >
                    <span>{isMsgPanelOpen && !isMsgPanelClosing ? "Hide Message" : "Message"}</span>
                  </button>
                </div>

                <div className="jd-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="jd-employer-strip" style={{ paddingTop: "20px" }}>
                    <div className="jd-employer-logo-info">
                      <div className="jd-employer-logo" aria-label="Candidate initials" style={{ overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {(() => {
                          const pic = detailsJob.profilePicturePath;
                          const picUrl = pic
                            ? (pic.startsWith("http") || pic.startsWith("/api") ? pic : `/api/applicants/${detailsJob.applicantUserId}/profile-picture`)
                            : (detailsJob.applicantUserId ? `/api/applicants/${detailsJob.applicantUserId}/profile-picture` : null);
                          return (
                            <>
                              {picUrl && (
                                <img
                                  src={picUrl}
                                  alt={detailsJob.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                    if (e.currentTarget.nextElementSibling) {
                                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                                    }
                                  }}
                                />
                              )}
                              <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "1.05rem", display: picUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                                {initialsFrom(detailsJob.name)}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <div>
                        <strong className="jd-employer-name">{detailsJob.name}</strong>
                        <span className="jd-employer-location" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "3px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                            {detailsJob.location || "Cavite"}
                          </span>
                          <span style={{ color: "#cbd5e1" }}>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                            candidate@example.com
                          </span>
                          <span style={{ color: "#cbd5e1" }}>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            09682944632
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="jd-header-right-actions">
                      <div className="rating-score-box" title="Applicant rating">
                        <span className="star-icon">★</span>
                        <span>{detailsJob.rating ? Number(detailsJob.rating).toFixed(1) : "0.0"}</span>
                      </div>
                      <button
                        type="button"
                        className={`jd-faq-btn ${isDocsOpen ? "active" : ""}`}
                        onClick={() => setIsDocsOpen((prev) => !prev)}
                      >
                        Docs
                      </button>
                    </div>
                  </div>

                  <div className="jd-body-wrapper">
                    <div className="jd-body">
                      <div className="jd-top-section">
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            Desired Job Title
                          </span>
                          <div className="jd-title-row">
                            <h2 className="jd-title-h2">{detailsJob.jobTitle}</h2>
                          </div>
                        </div>
                        <div className="jd-chips-inline">
                          <span className="setup-pill">{detailsJob.workSetup || "On-Site"}</span>
                          <span className="salary-pill">{detailsJob.salary || "PHP 10,000 - 15,000"}</span>
                        </div>
                      </div>

                      <div className="jd-section">
                        <h3>SKILLS</h3>
                        <div className="jd-tags-wrap">
                          <span className="js-tag-chip js-tag-skill">Web Development</span>
                          <span className="js-tag-chip js-tag-skill">Data Structures and Algorithms</span>
                          <span className="js-tag-chip js-tag-skill">TypeScript</span>
                        </div>
                      </div>

                      <div className="jd-section">
                        <h3>QUALIFICATIONS</h3>
                        <div className="jd-tags-wrap">
                          <span className="js-tag-chip js-tag-qualification">BS Computer Science (BSCS)</span>
                          <span className="js-tag-chip js-tag-qualification">Software Engineering Fundamentals</span>
                        </div>
                      </div>

                      <div className="jd-section">
                        <h3>CERTIFICATIONS</h3>
                        <div className="jd-tags-wrap">
                          <span className="js-tag-chip" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                            Google IT Support Professional Certificate
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={`jd-faq-drawer ${isDocsOpen ? "open" : ""}`}>
                      <div className="jd-faq-header">
                        <h3>Saved Documents</h3>
                        <button type="button" className="jd-faq-back-btn" onClick={() => setIsDocsOpen(false)}>←</button>
                      </div>
                      <div className="jd-faq-body" style={{ padding: "16px", display: "flex", flexDirection: "column", height: "calc(100% - 60px)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", background: "#f8fafc" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            </div>
                            <div>
                              <strong style={{ display: "block", fontSize: "0.9rem", color: "#0f172a" }}>
                                {detailsJob.name.replace(/\s+/g, "_")}_Resume.pdf
                              </strong>
                              <small style={{ color: "#64748b" }}>Primary Resume / CV</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="jd-panel-footer" style={{ justifyContent: "flex-end" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        className="jd-cancel-btn"
                        onClick={() => {
                          setDetailsJob(null);
                          setIsMsgPanelOpen(false);
                          setIsMsgPanelClosing(false);
                        }}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        className={`solid-btn ${isMsgPanelOpen && !isMsgPanelClosing ? "active" : ""}`}
                        onClick={handleToggleMsgPanel}
                        style={{
                          padding: "8px 16px",
                          fontSize: "0.85rem",
                          borderRadius: "6px",
                          background: isMsgPanelOpen ? "#0284c7" : "#01294a",
                          color: "#ffffff",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {isMsgPanelOpen && !isMsgPanelClosing ? "Hide Message" : "Message"}
                      </button>
                      {(() => {
                        const isAccepted = detailsJob.status.toLowerCase().includes("accept") || detailsJob.status.toLowerCase().includes("recruit") || detailsJob.status.toLowerCase().includes("approved");
                        return (
                          <button
                            type="button"
                            className="solid-btn"
                            disabled
                            style={{
                              background: isAccepted ? "#10b981" : "#ef4444",
                              color: "#ffffff",
                              borderColor: isAccepted ? "#059669" : "#dc2626",
                              padding: "8px 20px",
                              fontSize: "0.88rem",
                              fontWeight: 700,
                              borderRadius: "8px",
                              cursor: "default",
                            }}
                          >
                            {isAccepted ? "Recruited" : "Denied"}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Docked Message Panel Slot */}
              {(isMsgPanelOpen || isMsgPanelClosing) && (
                <div className="jd-side-panel-slot">
                  {renderMessageSidePanel()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <JobDetailsModal
            isOpen={Boolean(detailsJob)}
            onClose={() => {
              setDetailsJob(null);
              setIsEmployerModalOnTop(false);
            }}
            job={jobModalData}
            currentUserId={userId}
            applicantProfile={applicantMatchProfile}
            onEmployerClick={(empId) => {
              const targetEmpId = empId || detailsJob.employerUserId;
              if (targetEmpId) handleOpenEmployerDetails(targetEmpId);
            }}
            customFooterActions={
              (() => {
                const isAccepted = detailsJob.status.toLowerCase().includes("accept") || detailsJob.status.toLowerCase().includes("approved");
                return (
                  <button
                    type="button"
                    className={`solid-btn applied-btn status-${isAccepted ? "approved" : "denied"}`}
                    disabled
                    style={{
                      background: isAccepted ? "#10b981" : "#ef4444",
                      color: "#ffffff",
                      borderColor: isAccepted ? "#059669" : "#dc2626",
                      padding: "8px 20px",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      borderRadius: "8px",
                      cursor: "default",
                    }}
                  >
                    {isAccepted ? "Approved" : "Denied"}
                  </button>
                );
              })()
            }
          />
        )
      )}

      {/* Employer Profile Modal if opened from Job Details */}
      <EmployerDetailsModal
        isOpen={Boolean(selectedCompanyDetails)}
        onClose={() => {
          setSelectedCompanyDetails(null);
          setIsEmployerModalOnTop(false);
        }}
        employer={selectedCompanyDetails}
        zIndex={isEmployerModalOnTop ? 10100 : 1060}
      />
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Confirm Logout"
        message={role === "employer" ? "Are you sure you want to log out of your employer account?" : "Are you sure you want to log out of your applicant account?"}
        confirmLabel="Yes, Log Out"
        cancelLabel="Cancel"
        type="danger"
        onConfirm={() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/";
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
      />

      {/* Delete Feedback Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!feedbackToDelete}
        title="Delete Feedback Record"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to delete your feedback for{" "}
              <strong>{feedbackToDelete?.targetName}</strong>
              {feedbackToDelete?.jobTitle ? ` (${feedbackToDelete.jobTitle})` : ""}?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              This action cannot be undone. Once deleted, this entry will become available for feedback submission again.
            </p>
          </div>
        }
        confirmLabel={isDeletingFeedback ? "Deleting..." : "Yes, Delete"}
        cancelLabel="Cancel"
        type="danger"
        isConfirming={isDeletingFeedback}
        onConfirm={handleConfirmDeleteFeedback}
        onCancel={() => setFeedbackToDelete(null)}
      />

      {/* Delete Feedback Success Notification Toast (Disappears after 5s) */}
      {deleteToastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            background: "#1e2230",
            color: "#f8fafc",
            border: "1px solid #38bdf8",
            borderRadius: "10px",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.45)",
            zIndex: 99999,
            maxWidth: "460px",
            fontSize: "0.88rem",
          }}
        >
          <div style={{ color: "#38bdf8", fontSize: "1.2rem", lineHeight: 1 }}>✓</div>
          <div style={{ flex: 1, lineHeight: "1.4" }}>{deleteToastMessage}</div>
          <button
            type="button"
            onClick={() => setDeleteToastMessage("")}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.1rem",
              cursor: "pointer",
              padding: "0 4px",
              lineHeight: 1,
            }}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

