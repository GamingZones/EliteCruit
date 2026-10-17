import React, { useEffect, useState } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import ApplicantChatbotDrawer, { ApplicantFAQItem as FAQItem } from "../../components/ApplicantChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import {
  formatLocationWithCavite,
  parseCompetencyDisplayTags,
  calculateJobMatchDetails,
  getMatchColorClass,
  isSkillMatch,
  type ApplicantMatchProfile,
} from "../../utils/filters";
import "./Applicant-Dashboard.css";
import "./Applicant-Feedback.css";
import "./JobSearch.css";

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
  rating: number;
  comments: string;
  date: string;
};

type TargetOption = {
  id: number | string;
  employerUserId?: number;
  applicantUserId?: number;
  name: string;
  status: "Accepted" | "Denied" | "Recruited" | "Recruitment Accepted" | "Recruitment Denied";
  jobTitle: string;
  location: string;
  workSetup: string;
  salary: string;
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

export default function ApplicantFeedback() {
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const [role, setRole] = useState<"applicant" | "employer">("applicant");
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
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

  // Form states
  const [selectedTargetId, setSelectedTargetId] = useState<number | string>("");
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTargetName, setSubmittedTargetName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Details Modal state
  const [detailsJob, setDetailsJob] = useState<TargetOption | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isMatchDrawerOpen, setIsMatchDrawerOpen] = useState(false);
  const [isMatchDrawerClosing, setIsMatchDrawerClosing] = useState(false);
  const [hoveredCompareTag, setHoveredCompareTag] = useState<{ item: string; side: "applicant" | "employer"; category: string } | null>(null);

  const [applicantMatchProfile, setApplicantMatchProfile] = useState<ApplicantMatchProfile | null>(null);

  const handleToggleMatchDrawer = () => {
    if (isMatchDrawerOpen && !isMatchDrawerClosing) {
      setIsMatchDrawerClosing(true);
      setTimeout(() => {
        setIsMatchDrawerOpen(false);
        setIsMatchDrawerClosing(false);
      }, 280);
    } else {
      setIsMatchDrawerOpen(true);
      setIsMatchDrawerClosing(false);
    }
  };

  const handleCloseMatchDrawer = () => {
    setIsMatchDrawerClosing(true);
    setTimeout(() => {
      setIsMatchDrawerOpen(false);
      setIsMatchDrawerClosing(false);
    }, 280);
  };

  const initialsFrom = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
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
        fetch(`/api/applicants/${savedUser.id}/profile`)
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
            });
          })
          .catch(() => {});
      }

      const storageKey = isEmp ? "elitecruit-employer-feedback-history" : "elitecruit-applicant-feedback-history";
      const savedHistory = localStorage.getItem(storageKey);

      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          setFeedbackList(Array.isArray(parsed) ? parsed : []);
        } catch {
          setFeedbackList([]);
        }
      } else {
        setFeedbackList([]);
      }

      if (isEmp) {
        if (savedUser.id) {
          fetch(`/api/employers/${savedUser.id}/applications`)
            .then((res) => res.json())
            .then((data) => {
              const apps = Array.isArray(data?.applications) ? data.applications : [];
              const eligible = apps.filter((a: any) =>
                ["approved", "accepted", "denied", "rejected"].includes(String(a.status || "").toLowerCase())
              );
              const mapped: TargetOption[] = eligible.map((a: any) => ({
                id: a.id || a.applicant_user_id,
                applicantUserId: a.applicant_user_id,
                name: a.applicant_name || "Applicant",
                status: ["approved", "accepted"].includes(String(a.status).toLowerCase()) ? "Recruited" : "Denied",
                jobTitle: a.job_title || "Applicant",
                location: formatLocationWithCavite(a.city),
                workSetup: a.work_arrangement || "On-Site",
                salary: "—",
                rating: a.rating ? String(a.rating) : "0.0",
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
          fetch(`/api/applicants/${savedUser.id}/eligible-feedback-employers`)
            .then((res) => res.json())
            .then((data) => {
              const list = Array.isArray(data?.employers) ? data.employers : [];
              const mapped: TargetOption[] = list.map((e: any) => {
                const isAccepted = ["approved", "accepted"].includes(String(e.application_status || "").toLowerCase());
                return {
                  id: e.application_id || e.employer_user_id,
                  employerUserId: e.employer_user_id,
                  name: e.company_name,
                  status: isAccepted ? "Accepted" : "Denied",
                  jobTitle: e.job_title || "Job Opening",
                  location: formatLocationWithCavite(e.location),
                  workSetup: e.work_arrangement || "On-Site",
                  salary: formatSalaryRange(e.salary_min, e.salary_max),
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

      if (role === "applicant" && userId && targetEmpId) {
        await fetch(`/api/applicants/${userId}/company-feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employer_user_id: Number(targetEmpId), rating, comments }),
        }).catch(() => {});
      } else if (role === "employer" && userId && targetAppId) {
        await fetch(`/api/employers/${userId}/applicant-feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicant_user_id: Number(targetAppId), rating, comments }),
        }).catch(() => {});
      }

      const newRecord: FeedbackRecord = {
        id: `fb-${Date.now()}`,
        targetName,
        status: targetStatus,
        jobTitle: targetJobTitle,
        rating,
        comments,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };

      setFeedbackList((prev) => {
        const updated = [newRecord, ...prev];
        const key = role === "employer" ? "elitecruit-employer-feedback-history" : "elitecruit-applicant-feedback-history";
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
      setSubmittedTargetName(targetName);
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHistory = (id: string | number) => {
    setFeedbackList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      const key = role === "employer" ? "elitecruit-employer-feedback-history" : "elitecruit-applicant-feedback-history";
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpenHistoryDetails = async (item: FeedbackRecord) => {
    const matched = targetOptions.find((t) => t.name === item.targetName);
    let realRating = "0.0";
    let realLocation = matched?.location || "Silang, Cavite";

    if (matched && typeof matched.id === "number") {
      try {
        const endpoint = role === "employer" ? `/api/applicants/${matched.id}/profile` : `/api/employers/${matched.id}/profile`;
        const res = await fetch(endpoint);
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
        id: item.id,
        name: item.targetName,
        status: item.status,
        jobTitle: item.jobTitle || matched.jobTitle || "Job Opening",
        location: realLocation,
        rating: realRating !== "0.0" ? realRating : (matched.rating || "0.0"),
      });
    } else {
      setDetailsJob({
        id: item.id,
        name: item.targetName,
        status: item.status,
        jobTitle: item.jobTitle || "Job Opening",
        location: realLocation,
        workSetup: "On-Site",
        salary: "—",
        rating: realRating,
      });
    }
  };

  const isEmployerRole = role === "employer";
  const selectedTarget = targetOptions.find((t) => String(t.id) === String(selectedTargetId));

  return (
    <div className="appdash-page sidebar-visible">
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
          <a href="/" className="appdash-brand">
            <strong>EliteCruit</strong>
            <span>Candidate Workspace</span>
          </a>

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

      <main className="appdash-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div><strong>Feedback</strong></div>
          </div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <ApplicantChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Feedback"
                customFaqs={applicantFeedbackFaqs}
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        <section className="hero-card" style={{ margin: "16px 28px" }}>
          <div>
            <small>{isEmployerRole ? "Employer Workspace" : "Candidate Workspace"}</small>
            <h1 style={{ margin: "4px 0 0", fontSize: "2rem" }}>
              {isEmployerRole ? "Recruitment Feedback & Candidate Ratings" : "Company Feedback & Ratings"}
            </h1>
            <p style={{ margin: "8px 0 0", color: "#365877", fontSize: "0.85rem" }}>
              {isEmployerRole
                ? "Rate and review candidate interactions for accepted and denied recruitment invitations."
                : "Share your recruitment and workplace experience to help rate potential employers for accepted and denied applications."}
            </p>
          </div>
        </section>

        {/* Feedback Submission Form */}
        <section className="matches-card" style={{ margin: "16px 28px" }}>
          <div className="matches-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
            <div>
              <small>Feedback Submission</small>
              <h2>{isEmployerRole ? "Rate a Candidate / Recruitment Record" : "Rate a Company"}</h2>
              <p>
                {isEmployerRole
                  ? "Feedback can be submitted for candidates who Accepted or Denied your recruitment invitations."
                  : "Feedback can be submitted for companies where your application was Accepted or Denied."}
              </p>
            </div>

            {selectedTarget && (
              <button
                type="button"
                className="solid-btn"
                onClick={() => setDetailsJob(selectedTarget)}
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
          ) : targetOptions.length === 0 ? (
            <div style={{ padding: "24px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center", marginTop: "16px" }}>
              <p style={{ color: "#475569", margin: 0, fontSize: "0.92rem", fontWeight: 700 }}>
                {isEmployerRole
                  ? "No eligible accepted or denied candidates available for feedback."
                  : "No eligible accepted or denied applications available for feedback."}
              </p>
              <small style={{ color: "#64748b", display: "block", marginTop: "6px", fontSize: "0.82rem" }}>
                Feedback can only be submitted for applications marked as Accepted or Denied by the employer.
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
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  required
                >
                  {targetOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.jobTitle}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", color: "#01294a", fontWeight: 600 }}>
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

              <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", color: "#01294a", fontWeight: 600 }}>
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

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
              return (
                <div
                  key={item.id}
                  style={{
                    padding: "16px 20px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    background: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <strong style={{ fontSize: "1rem", color: "#01294a" }}>{item.targetName}</strong>
                      <span style={{ fontSize: "0.82rem", color: "#64748b", marginLeft: "10px" }}>{item.jobTitle}</span>
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
                      <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{item.date}</span>
                    </div>
                  </div>

                  <div style={{ margin: "8px 0 6px", display: "flex", gap: "2px", color: "#f59e0b", fontSize: "1rem" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < item.rating ? "#f59e0b" : "#cbd5e1" }}>★</span>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", lineHeight: "1.5", flex: 1 }}>
                      "{item.comments}"
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end", flexShrink: 0 }}>
                      <button
                        type="button"
                        className="solid-btn"
                        onClick={() => handleOpenHistoryDetails(item)}
                        style={{ padding: "4px 14px", fontSize: "0.78rem", borderRadius: "6px", width: "70px", textAlign: "center" }}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="solid-btn"
                        onClick={() => handleDeleteHistory(item.id)}
                        style={{ padding: "4px 14px", fontSize: "0.78rem", borderRadius: "6px", width: "70px", textAlign: "center", background: "#ef4444", borderColor: "#dc2626" }}
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
      </main>

      {/* ── DETAILS MODAL OVERLAY ── */}
      {detailsJob && (
        isEmployerRole ? (
          /* ── CANDIDATE DETAILS MODAL (1:1 Copy from Applicant Finder) ── */
          <div className="jd-overlay" role="dialog" aria-modal="true" aria-label="Candidate Details" onClick={(e) => { if (e.target === e.currentTarget) setDetailsJob(null); }}>
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
                  <button type="button" className="jd-cancel-btn" onClick={() => setDetailsJob(null)}>
                    Close
                  </button>
                  <a href="/messages" className="solid-btn" style={{ padding: "8px 16px", textDecoration: "none", fontSize: "0.85rem", borderRadius: "6px", background: "#01294a", color: "#ffffff" }}>
                    Message
                  </a>
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
        ) : (
          /* ── JOB DETAILS MODAL (1:1 Copy from Job Posting) ── */
          <div className="jd-overlay" role="dialog" aria-modal="true" aria-label="Job Details" onClick={(e) => { if (e.target === e.currentTarget) { setDetailsJob(null); setIsMatchDrawerOpen(false); } }}>
            <div className={`jd-panel ${isMatchDrawerOpen ? "drawer-open" : ""}`} onClick={(e) => e.stopPropagation()}>
              {/* Cover banner */}
              <div className="jd-cover-banner">
                {detailsJob.companyCoverPath ? (
                  <img
                    src={detailsJob.companyCoverPath.startsWith("http") || detailsJob.companyCoverPath.startsWith("/api") ? detailsJob.companyCoverPath : `/api/employers/${detailsJob.employerUserId}/cover`}
                    alt={`${detailsJob.name} cover`}
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
                                alt={detailsJob.name}
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
                      <strong className="jd-employer-name">{detailsJob.name}</strong>
                      <span className="jd-employer-location">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}>
                          <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                          <circle cx="12" cy="10" r="2.5" />
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
                      const detailsMatchInfo = calculateJobMatchDetails(
                        {
                          location: detailsJob.location,
                          setup: detailsJob.workSetup,
                          skillTags: detailsJob.requiredSkills || [],
                          qualTags: detailsJob.qualifications || [],
                          certTags: detailsJob.certifications || [],
                        },
                        applicantMatchProfile
                      );
                      return (
                        <div
                          className={`match-score-box ${getMatchColorClass(detailsMatchInfo.score)}`}
                          title="Match breakdown"
                        >
                          <small>MATCH</small>
                          <b>{detailsMatchInfo.score}%</b>
                        </div>
                      );
                    })()}
                    <button type="button" className="jd-faq-btn">
                      FAQ's
                    </button>
                  </div>
                </div>

              {/* Scrollable body container */}
              <div className="jd-body-wrapper">
                <div className="jd-body">
                  {/* Title row */}
                  <div className="jd-top-section">
                    <div className="jd-title-row">
                      <h2 className="jd-title-h2">{detailsJob.jobTitle}</h2>
                    </div>
                    <div className="jd-chips-inline">
                      <span className="status-chip open">Open</span>
                      <span className="setup-pill">{detailsJob.workSetup}</span>
                      <span className="salary-pill">{detailsJob.salary}</span>
                    </div>
                  </div>

                  <div className="jd-section">
                    <h3>Job Description</h3>
                    <p style={{ whiteSpace: "pre-wrap" }}>
                      {detailsJob.description || "No detailed job description provided."}
                    </p>
                  </div>

                  <div className="jd-section">
                    <h3>Required Skills</h3>
                    <div className="jd-tags-wrap">
                      {(detailsJob.requiredSkills && detailsJob.requiredSkills.length > 0
                        ? detailsJob.requiredSkills
                        : ["Technical Skills"]
                      ).map((skill, idx) => (
                        <span key={idx} className="js-tag-chip js-tag-skill">{skill}</span>
                      ))}
                    </div>
                  </div>

                  {detailsJob.qualifications && detailsJob.qualifications.length > 0 && (
                    <div className="jd-section">
                      <h3>Qualifications</h3>
                      <div className="jd-tags-wrap">
                        {detailsJob.qualifications.map((q, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Slide-in Match Breakdown Side Panel */}
              {isMatchDrawerOpen && (
                (() => {
                  const matchDetails = calculateJobMatchDetails(
                    {
                      location: detailsJob.location,
                      setup: detailsJob.workSetup,
                      skillTags: detailsJob.requiredSkills || [],
                      qualTags: detailsJob.qualifications || [],
                      certTags: detailsJob.certifications || [],
                    },
                    applicantMatchProfile
                  );

                  const appSkills = applicantMatchProfile?.skills || [];
                  const appQuals = applicantMatchProfile?.qualifications || [];
                  const appCerts = applicantMatchProfile?.certifications || [];

                  const jobSkills = detailsJob.requiredSkills || [];
                  const jobQuals = detailsJob.qualifications || [];
                  const jobCerts = detailsJob.certifications || [];

                  const checkMatch = (jobItem: string, appItems: string[]) => {
                    if (!appItems || appItems.length === 0) return false;
                    return appItems.some((appItem) => isSkillMatch(jobItem, appItem));
                  };

                  const isAppRelevant = (appItem: string, jItems: string[]) => {
                    if (!jItems || jItems.length === 0) return false;
                    return jItems.some((jobItem) => isSkillMatch(jobItem, appItem));
                  };

                  return (
                    <aside className={`jd-side-comparison-panel ${isMatchDrawerClosing ? "closing" : "opening"}`}>
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
                            onClick={handleCloseMatchDrawer}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="jd-side-panel-body">
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

                        <div className="jd-unified-compare-container">
                          {/* Column 1: Applicant Profile */}
                          <div className="jd-master-col applicant-col">
                            <div className="jd-master-col-header">
                              <span>Your Profile</span>
                            </div>
                            <div className="jd-master-col-content">
                              <div className="jd-master-row">
                                <span className="jd-row-label">Location</span>
                                <div className="jd-col-tags-container">
                                  <span className="jd-comp-tag app-neutral">
                                    <span className="tag-text">{formatLocationWithCavite(applicantMatchProfile?.city || "Cavite")}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="jd-master-row">
                                <span className="jd-row-label">Work Arrangement</span>
                                <div className="jd-col-tags-container">
                                  <span className="jd-comp-tag app-neutral">
                                    <span className="tag-text">{applicantMatchProfile?.workArrangement || "Any"}</span>
                                  </span>
                                </div>
                              </div>

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

                          {/* Column 2: Employer Requirements */}
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
                                      <span className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}>
                                        <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                        <span className="tag-text">{formatLocationWithCavite(detailsJob.location)}</span>
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
                                      <span className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}>
                                        <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                        <span className="tag-text">{detailsJob.workSetup || "On-Site"}</span>
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
                                      <span className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}>
                                        <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                        <span className="tag-text">{detailsJob.salary}</span>
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
                                    <span className="jd-no-data-text">No specific certifications required</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </aside>
                  );
                })()
              )}

              <div className="jd-panel-footer">
                <div className="jd-footer-meta">
                  <span><strong>Applications:</strong> {detailsJob.applicantCount ?? 0} / {detailsJob.applicationLimit ?? 10}</span>
                  <span><strong>Close Date:</strong> {detailsJob.closeDate && detailsJob.closeDate !== "-" ? new Date(detailsJob.closeDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "N/A"}</span>
                </div>
                <div className="jd-footer-middle">
                  <button
                    type="button"
                    className={`jd-breakdown-btn ${isMatchDrawerOpen && !isMatchDrawerClosing ? "active" : ""}`}
                    onClick={handleToggleMatchDrawer}
                  >
                    <span>{isMatchDrawerOpen && !isMatchDrawerClosing ? "Hide Breakdown" : "Match Breakdown"}</span>
                  </button>
                </div>
                <div className="jd-footer-actions">
                  <button
                    type="button"
                    className="jd-cancel-btn"
                    onClick={() => {
                      setDetailsJob(null);
                      setIsMatchDrawerOpen(false);
                      setIsMatchDrawerClosing(false);
                    }}
                  >
                    Close
                  </button>
                  {(() => {
                    const isAccepted = detailsJob.status.toLowerCase().includes("accepted") || detailsJob.status.toLowerCase().includes("approved");
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
                        {isAccepted ? "Approved" : "Denied"}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )
      )}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Confirm Logout"
        message={role === "employer" ? "Are you sure you want to log out of your employer account?" : "Are you sure you want to log out of your applicant account?"}
        confirmText="Yes, Log Out"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/";
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}

