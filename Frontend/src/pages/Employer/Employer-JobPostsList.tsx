import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import { cleanBranchLocation, parseLocations } from "../../utils/filters";
import "../Applicant/Applicant-Dashboard.css";
import "./Employer-JobPostsList.css";

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

type JobPost = {
  id: number;
  title: string;
  location: string | null;
  status: string;
  is_urgent?: number | boolean | null;
  hide_salary?: number | boolean | null;
  work_arrangement: string | null;
  experience_level: string | null;
  application_limit: number | null;
  close_date: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  qualifications: string | null;
  certifications: string | null;
  responsibilities: string | null;
  required_skills: string | null;
  applicant_count?: number;
};

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

  const firstIsTooLong = Boolean(items[0] && items[0].length > 14);
  const visible = firstIsTooLong ? [] : items.slice(0, maxVisible);
  const hidden = firstIsTooLong ? items : items.slice(maxVisible);
  const fullListText = items.join(", ");

  const typeLabel =
    type === "skill" ? "Skills:" : type === "qualification" ? "Qualifications:" : "Certifications:";

  return (
    <span className="chips-inline-wrap">
      {visible.map((item) => (
        <span className={`job-chip ${type}`} key={item}>
          {item}
        </span>
      ))}
      {hidden.length > 0 && (
        <span className="overflow-dots-badge" tabIndex={0}>
          ...
          <span className="overflow-tooltip">
            <strong>{typeLabel}</strong>
            <span>{fullListText}</span>
          </span>
        </span>
      )}
    </span>
  );
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

export default function EmployerJobPostsList() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const JOBS_PER_PAGE = 10;
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const companyLabel = useEmployerCompanyLabel("Employer");

  const totalPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * JOBS_PER_PAGE;
    return jobs.slice(start, start + JOBS_PER_PAGE);
  }, [jobs, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const mainRef = useRef<HTMLElement | null>(null);
  const isFirstMount = useRef(true);

  const scrollToTop = () => {
    // 1. Scroll main ref container
    if (mainRef.current) {
      try {
        mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      mainRef.current.scrollTop = 0;
    }
    // 2. Query any appdash-main or page containers
    const containers = document.querySelectorAll<HTMLElement>(
      ".appdash-main, .joblist-main, .joblist-grid"
    );
    containers.forEach((el) => {
      try {
        el.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      el.scrollTop = 0;
    });
    // 3. Native scrollIntoView on header / topbar
    const topAnchor = document.querySelector(".joblist-head, .appdash-topbar") as HTMLElement | null;
    if (topAnchor) {
      try {
        topAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    }
    // 4. Window / body scroll fallback
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    requestAnimationFrame(() => {
      scrollToTop();
    });
  }, [currentPage]);

  const jobPostsFaqs: FAQItem[] = [
    {
      question: "How do I post a new job opening?",
      answer: "Click the '+ Create Job Post' button at the top right of the page. Fill in all required fields (Title, Location, Salary, Application Limit, Skills) and click 'Publish Job Post'.",
      actionLabel: "Create Job Post",
      actionHref: "/employer-job-posts",
    },
    {
      question: "What is the Application Limit setting?",
      answer: "The Application Limit caps how many jobseekers can apply before the post automatically closes (maximum 100 applications). This helps manage high applicant volume.",
    },
    {
      question: "How does Urgent Hiring status work?",
      answer: "Checking 'Mark as Urgent' adds a prominent red Urgent Hiring badge to your job card, helping attract active jobseekers faster. It sets an automatic auto-close date in 7 days.",
    },
    {
      question: "How do I edit or delete an existing job post?",
      answer: "In the Job Posts list, click the 'Edit' button on any job card to modify its details, or click 'Delete' to permanently remove the post.",
    },
  ];

  const formatSalary = (value: number | null) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "0.00";
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toPreviewText = (value: string | null, emptyLabel: string) => {
    const cleaned = typeof value === "string" ? value.trim() : "";
    if (!cleaned) return emptyLabel;
    return cleaned.length > 84 ? `${cleaned.slice(0, 84)}...` : cleaned;
  };

  const parseTags = (raw: string | null) => {
    if (typeof raw !== "string" || !raw.trim()) return [] as string[];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "object" && item !== null && item.name) {
              return item.years ? `${item.name} (${item.years})` : item.name;
            }
            return String(item);
          })
          .filter(Boolean);
      }
    } catch {}
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setMessage("Sign in as employer to view job posts.");
      return;
    }

    try {
      const savedUser = JSON.parse(savedUserRaw) as { id?: number; role?: string };
      if (savedUser.role !== "employer" || !savedUser.id) {
        setMessage("This page is available to employer accounts.");
        return;
      }
      setUserId(savedUser.id);

      fetch(`/api/employers/${savedUser.id}/job-posts`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data?.message || "Unable to load job posts.");
          setJobs(Array.isArray(data?.jobPosts) ? data.jobPosts : []);
        })
        .catch((error) => {
          setMessage(error instanceof Error ? error.message : "Unable to load job posts.");
        });
    } catch {
      setMessage("Unable to read account session.");
    }
  }, []);

  const [jobToDelete, setJobToDelete] = useState<JobPost | null>(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [openActionsJobId, setOpenActionsJobId] = useState<number | null>(null);
  const [jobToStatusChange, setJobToStatusChange] = useState<{ job: JobPost; targetStatus: "open" | "closed" } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [reopenCloseDate, setReopenCloseDate] = useState("");
  const [reviewingJob, setReviewingJob] = useState<JobPost | null>(null);
  const [isListingPreviewOpen, setIsListingPreviewOpen] = useState(false);

  // Check URL query param for review ID on initial load
  useEffect(() => {
    if (jobs.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const rId = params.get("review");
      if (rId) {
        const found = jobs.find((j) => String(j.id) === String(rId));
        if (found) {
          setReviewingJob(found);
        }
      }
    }
  }, [jobs]);

  const handleOpenReview = (job: JobPost) => {
    setReviewingJob(job);
    window.history.pushState({}, "", `/employer-job-posts?review=${job.id}`);
    scrollToTop();
  };

  const handleCloseReview = () => {
    setReviewingJob(null);
    window.history.pushState({}, "", "/employer-job-posts");
    scrollToTop();
  };

  useEffect(() => {
    const handleOutsideClick = () => setOpenActionsJobId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleConfirmStatusChange = async () => {
    if (!userId || !jobToStatusChange) return;
    const { job, targetStatus } = jobToStatusChange;

    try {
      setIsUpdatingStatus(true);
      const token = localStorage.getItem("elitecruit-token") || localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body: Record<string, any> = { status: targetStatus };
      if (targetStatus === "open" && reopenCloseDate.trim()) {
        body.close_date = reopenCloseDate.trim();
      }

      const response = await fetch(`/api/employers/${userId}/job-posts/${job.id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || `Unable to mark job as ${targetStatus}.`);

      setJobs((prev) =>
        prev.map((item) =>
          item.id === job.id
            ? {
                ...item,
                status: targetStatus,
                close_date: data.jobPost?.close_date || item.close_date,
              }
            : item
        )
      );
      setJobToStatusChange(null);
      setReopenCloseDate("");
      setMessage(`Job post successfully ${targetStatus === "open" ? "reopened" : "closed"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update job status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const deleteJobPost = (job: JobPost) => {
    setJobToDelete(job);
  };

  const handleConfirmDeleteJob = async () => {
    if (!userId || !jobToDelete) return;

    try {
      setIsDeletingJob(true);
      const response = await fetch(`/api/employers/${userId}/job-posts/${jobToDelete.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to delete job post.");
      setJobs((prev) => prev.filter((job) => job.id !== jobToDelete.id));
      setJobToDelete(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete job post.");
    } finally {
      setIsDeletingJob(false);
    }
  };

  return (
    <div className="appdash-page employer-page sidebar-visible">
      <aside className="appdash-sidebar" aria-label="Employer Navigation">
        <a href="/" className="appdash-brand"><strong>EliteCruit</strong><span>Employer Workspace</span></a>

        <div className="employer-links-wrap">
          <ul className="appdash-secondary-list">
            <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li className="active"><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
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
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((v) => !v)}>
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

      <main ref={mainRef} className="appdash-main joblist-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Job Posts</strong></div></div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Job Posts"
                customFaqs={jobPostsFaqs}
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        {reviewingJob ? (
          <div className="review-job-container">
            {/* Breadcrumb matching 841282631 / 873547492 */}
            <nav className="review-breadcrumbs" aria-label="Breadcrumb">
              <button type="button" className="breadcrumb-link" onClick={handleCloseReview}>
                All Job Posts
              </button>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{reviewingJob.title}</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-active">Review</span>
            </nav>

            {/* Top Review Header */}
            <div className="review-job-top-bar">
              <div className="review-job-title-group">
                <h1 className="review-job-page-title">Review Job Post</h1>
                <p className="review-job-subtitle">Review the selected posting before publishing or making changes.</p>
              </div>

              <div className="review-job-header-actions">
                <button type="button" className="review-back-btn" onClick={handleCloseReview}>
                  ← Back to all posts
                </button>
                <a className="review-edit-btn" href={`/employer-job-posts/create?edit=${reviewingJob.id}`}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit post
                </a>
                <button type="button" className="review-preview-listing-btn" onClick={() => setIsListingPreviewOpen(true)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Preview public listing
                </button>
              </div>
            </div>

            {/* Job Summary Banner & 4-Stat Metric Strip */}
            <div className="review-job-summary-card">
              <div className="review-job-summary-head">
                <div className="review-job-title-row">
                  <h2 className="review-job-heading">{reviewingJob.title}</h2>
                  <span className={`review-status-pill ${reviewingJob.status === "open" ? "open" : "closed"}`}>
                    ● {reviewingJob.status === "open" ? "Open" : "Closed"}
                  </span>
                </div>
                <div className="review-job-company-row">
                  <span className="review-company-name">{companyLabel || "Doe's Store"}</span>
                  <span className="review-date-meta">
                    Posted Oct 12, 2026 • Updated Oct 18, 2026
                  </span>
                </div>
              </div>

              <div className="review-metrics-strip">
                <div className="review-metric-item">
                  <strong>{reviewingJob.applicant_count || 12}</strong>
                  <span>Applicants</span>
                </div>
                <div className="review-metric-item">
                  <strong>{Math.max(1, Math.round((reviewingJob.applicant_count || 12) * 0.65))}</strong>
                  <span>Under review</span>
                </div>
                <div className="review-metric-item">
                  <strong>{Math.max(1, Math.round((reviewingJob.applicant_count || 12) * 0.25))}</strong>
                  <span>Shortlisted</span>
                </div>
                <div className="review-metric-item">
                  <strong>1</strong>
                  <span>Interview scheduled</span>
                </div>
              </div>
            </div>

            {/* 2-Column Content Body (Desktop) / Stacked (Mobile) */}
            <div className="review-job-body-grid">
              {/* Left Column: Job Details Cards */}
              <div className="review-job-main-col">
                {/* Job Description */}
                <section className="review-card">
                  <h3 className="review-card-title">Job Description</h3>
                  <p className="review-card-paragraph">
                    {reviewingJob.description ||
                      "We are looking for a Software Engineer to join our growing team. You will be responsible for designing, developing, and maintaining web applications that deliver exceptional user experiences. You will work closely with product, design, and other engineers to build scalable and reliable solutions that support our business goals."}
                  </p>
                </section>

                {/* Key Responsibilities */}
                <section className="review-card">
                  <h3 className="review-card-title">Key Responsibilities</h3>
                  <ul className="review-bullet-list">
                    {reviewingJob.responsibilities ? (
                      reviewingJob.responsibilities
                        .split(/[\n•]+/)
                        .map((r) => r.trim())
                        .filter(Boolean)
                        .map((resp, i) => <li key={i}>{resp}</li>)
                    ) : (
                      <>
                        <li>Develop and maintain web applications using modern technologies.</li>
                        <li>Collaborate with cross-functional teams to define, design, and ship new features.</li>
                        <li>Write clean, maintainable, and well-documented code.</li>
                      </>
                    )}
                  </ul>
                </section>

                {/* Required Skills */}
                <section className="review-card">
                  <h3 className="review-card-title">Required Skills</h3>
                  <div className="review-skills-chips-row">
                    {parseTags(reviewingJob.required_skills).length > 0 ? (
                      parseTags(reviewingJob.required_skills).map((skill) => (
                        <span className="review-skill-chip" key={skill}>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <>
                        <span className="review-skill-chip">JavaScript</span>
                        <span className="review-skill-chip">React</span>
                        <span className="review-skill-chip">Node.js</span>
                      </>
                    )}
                  </div>
                </section>

                {/* Qualifications */}
                <section className="review-card">
                  <h3 className="review-card-title">Qualifications</h3>
                  <p className="review-card-paragraph">
                    {reviewingJob.qualifications ||
                      "Bachelor's degree in Computer Science, Information Technology, or a related field. At least 3 years of experience in web development. Strong problem-solving skills and a passion for building high-quality software."}
                  </p>
                </section>

                {/* Benefits */}
                <section className="review-card">
                  <h3 className="review-card-title">Benefits</h3>
                  <p className="review-card-paragraph">
                    {(reviewingJob as any).benefits ||
                      "Competitive salary, health insurance, paid time off, flexible work arrangements, professional development opportunities, and a supportive and collaborative work environment."}
                  </p>
                </section>
              </div>

              {/* Right Column: Posting Details Sidebar */}
              <div className="review-job-side-col">
                <div className="review-card posting-details-card">
                  <h3 className="review-card-title">Posting Details</h3>
                  <div className="review-details-table">
                    <div className="review-detail-row">
                      <span className="review-detail-label">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                        Employment Type
                      </span>
                      <span className="review-detail-value">{(reviewingJob as any).employment_type || "Full-time"}</span>
                    </div>

                    <div className="review-detail-row">
                      <span className="review-detail-label">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Work Arrangement
                      </span>
                      <span className="review-detail-value">{reviewingJob.work_arrangement || "Hybrid"}</span>
                    </div>

                    <div className="review-detail-row">
                      <span className="review-detail-label">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
                        </svg>
                        Location
                      </span>
                      <span className="review-detail-value">{cleanBranchLocation(reviewingJob.location) || "Naga, Camarines Sur"}</span>
                    </div>

                    <div className="review-detail-row">
                      <span className="review-detail-label">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        Experience
                      </span>
                      <span className="review-detail-value">{reviewingJob.experience_level || "Mid-Level"}</span>
                    </div>

                    <div className="review-detail-row">
                      <span className="review-detail-label">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="6" width="20" height="12" rx="2" />
                          <circle cx="12" cy="12" r="2" />
                          <path d="M6 12h.01M18 12h.01" />
                        </svg>
                        Salary
                      </span>
                      <span className="review-detail-value">
                        {reviewingJob.hide_salary
                          ? "Confidential"
                          : reviewingJob.salary_min && reviewingJob.salary_max
                          ? `PHP ${formatSalary(reviewingJob.salary_min)}–${formatSalary(reviewingJob.salary_max)}`
                          : "PHP 35,000–50,000"}
                      </span>
                    </div>

                    <div className="review-detail-row">
                      <span className="review-detail-label">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Application deadline
                      </span>
                      <span className="review-detail-value">{reviewingJob.close_date || "Nov 15, 2026"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bar matching screenshot */}
            <div className="review-job-footer-bar">
              <span>Viewing 1 selected job post.</span>
              <button type="button" className="review-return-link" onClick={handleCloseReview}>
                ← Return to All Job Posts
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="joblist-head">
          <div>
            <h1>All Job Posts</h1>
            <p>
              {jobs.length === 0
                ? "View every job posting created by your employer account."
                : `Showing ${jobs.length === 0 ? 0 : `${(currentPage - 1) * JOBS_PER_PAGE + 1} - ${Math.min(currentPage * JOBS_PER_PAGE, jobs.length)}`} of ${jobs.length} job post${jobs.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <a className="create-job-btn" href="/employer-job-posts/create">Create Job Post</a>
        </section>

        {message && (
          <div className="joblist-status-banner profile-message" role="status">
            <span>{message}</span>
            <button
              type="button"
              className="banner-dismiss-btn"
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        <section className="joblist-grid">
          {jobs.length === 0 ? (
            <article className="job-card empty">
              <strong>No job posts yet.</strong>
              <p>Create your first posting to start accepting applicants.</p>
            </article>
          ) : (
            paginatedJobs.map((job) => {
              const skillItems = parseTags(job.required_skills);
              const qualItems = parseTags(job.qualifications);
              const certItems = parseTags(job.certifications);

              return (
                <article className="job-card" key={job.id}>
                  <div className="job-card-main">
                    <div className="job-card-left">
                      <div className="job-title-row">
                        <span className={`status-chip ${job.status === "open" ? "open" : "closed"}`}>{job.status === "open" ? "Open" : "Closed"}</span>
                        {Boolean(Number(job.is_urgent || 0)) && <span className="status-chip urgent">Urgent</span>}
                        <h3 className="job-card-title" title={job.title}>{job.title}</h3>
                      </div>
                      <div className="job-card-submeta">
                        <RenderLocationMeta location={job.location} />
                      </div>
                      <p>{toPreviewText(job.description, "No description provided.")}</p>
                      <div className="job-chip-row">
                        <span className="job-chip work">{job.work_arrangement || "Flexible"}</span>
                        {job.experience_level && <span className="job-chip exp-level">{job.experience_level}</span>}
                        {job.hide_salary ? (
                          <span className="job-chip salary" title="Salary Range (Confidential - hidden from applicants)">
                            {job.salary_min || job.salary_max
                              ? `PHP ${formatSalary(job.salary_min)} - ${formatSalary(job.salary_max)} (Confidential)`
                              : "Salary Confidential"}
                          </span>
                        ) : (
                          <span className="job-chip salary">PHP {formatSalary(job.salary_min)} - {formatSalary(job.salary_max)}</span>
                        )}
                      </div>
                    </div>
                    <div className="job-card-center">
                      <div className="job-meta">
                        <span>Close Date: {job.close_date || "-"}</span>

                        {skillItems.length > 0 && (
                          <div className="meta-tag-line">
                            <span className="meta-tag-label">Skills: </span>
                            <RenderTagChips items={skillItems} type="skill" maxVisible={1} />
                          </div>
                        )}

                        {qualItems.length > 0 && (
                          <div className="meta-tag-line">
                            <span className="meta-tag-label">Qualifications: </span>
                            <RenderTagChips items={qualItems} type="qualification" maxVisible={1} />
                          </div>
                        )}

                        {certItems.length > 0 && (
                          <div className="meta-tag-line">
                            <span className="meta-tag-label">Certifications: </span>
                            <RenderTagChips items={certItems} type="certification" maxVisible={1} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="job-card-actions-col">
                      <div className="job-actions">
                        <button type="button" onClick={() => handleOpenReview(job)}>Review</button>
                        <a className="job-action-link" href={`/employer-job-posts/create?edit=${job.id}`}>Edit</a>
                        <div className="job-actions-dropdown">
                          <button
                            type="button"
                            className={`job-actions-btn ${openActionsJobId === job.id ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionsJobId((prev) => (prev === job.id ? null : job.id));
                            }}
                          >
                            Actions <span className="action-caret">▾</span>
                          </button>

                          {openActionsJobId === job.id && (
                            <div className="job-actions-menu" onClick={(e) => e.stopPropagation()}>
                              {job.status === "open" ? (
                                <button
                                  type="button"
                                  className="actions-menu-item close-item"
                                  onClick={() => {
                                    setOpenActionsJobId(null);
                                    setJobToStatusChange({ job, targetStatus: "closed" });
                                  }}
                                >
                                  <span className="actions-menu-icon">⏸</span>
                                  <span>Close Post</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="actions-menu-item reopen-item"
                                  onClick={() => {
                                    setOpenActionsJobId(null);
                                    const future = new Date();
                                    future.setDate(future.getDate() + 30);
                                    const mm = String(future.getMonth() + 1).padStart(2, "0");
                                    const dd = String(future.getDate()).padStart(2, "0");
                                    const yyyy = future.getFullYear();
                                    setReopenCloseDate(`${mm}/${dd}/${yyyy}`);
                                    setJobToStatusChange({ job, targetStatus: "open" });
                                  }}
                                >
                                  <span className="actions-menu-icon">▶</span>
                                  <span>Reopen Post</span>
                                </button>
                              )}

                              <div className="actions-menu-divider" />

                              <button
                                type="button"
                                className="actions-menu-item delete-item"
                                onClick={() => {
                                  setOpenActionsJobId(null);
                                  deleteJobPost(job);
                                }}
                              >
                                <span className="actions-menu-icon">🗑</span>
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {totalPages > 1 && (
          <div
            className="joblist-pagination"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "12px",
              marginTop: "20px",
              marginBottom: "24px",
            }}
          >
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                scrollToTop();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: currentPage === 1 ? "#f8fafc" : "#ffffff",
                color: currentPage === 1 ? "#94a3b8" : "#1e293b",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "0.88rem",
                boxShadow: currentPage === 1 ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.15s ease",
              }}
            >
              &larr; Previous
            </button>
            <span style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                scrollToTop();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: currentPage === totalPages ? "#f8fafc" : "#ffffff",
                color: currentPage === totalPages ? "#94a3b8" : "#1e293b",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "0.88rem",
                boxShadow: currentPage === totalPages ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.15s ease",
              }}
            >
              Next &rarr;
            </button>
          </div>
        )}
          </>
        )}

        {/* PREVIEW PUBLIC LISTING MODAL */}
        {isListingPreviewOpen && reviewingJob && (
          <div className="review-preview-modal-backdrop" onClick={() => setIsListingPreviewOpen(false)}>
            <div className="review-preview-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="review-preview-modal-head">
                <div>
                  <span className="review-preview-tag">Candidate View Preview</span>
                  <h2>{reviewingJob.title}</h2>
                  <p>{companyLabel || "Doe's Store"} • {cleanBranchLocation(reviewingJob.location) || "Cavite, Philippines"}</p>
                </div>
                <button type="button" className="review-modal-close-btn" onClick={() => setIsListingPreviewOpen(false)}>✕</button>
              </div>
              <div className="review-preview-modal-body">
                <div className="review-preview-pills">
                  <span>💼 {reviewingJob.work_arrangement || "Hybrid"}</span>
                  <span>📶 {reviewingJob.experience_level || "Mid-Level"}</span>
                  <span>💵 {reviewingJob.hide_salary ? "Salary Confidential" : `PHP ${formatSalary(reviewingJob.salary_min)} - ${formatSalary(reviewingJob.salary_max)}`}</span>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "14px 0" }} />
                <h4>Description</h4>
                <p style={{ lineHeight: 1.6, color: "#334155" }}>{reviewingJob.description || "No description provided."}</p>
                {reviewingJob.required_skills && (
                  <>
                    <h4 style={{ marginTop: "14px" }}>Skills</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                      {parseTags(reviewingJob.required_skills).map((s) => (
                        <span key={s} style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600 }}>{s}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="review-preview-modal-footer">
                <button type="button" className="review-modal-primary-btn" onClick={() => setIsListingPreviewOpen(false)}>
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STATUS CHANGE CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={Boolean(jobToStatusChange)}
          type={jobToStatusChange?.targetStatus === "closed" ? "warning" : "success"}
          title={jobToStatusChange?.targetStatus === "closed" ? "Close Job Post" : "Reopen Job Post"}
          message={
            jobToStatusChange?.targetStatus === "closed" ? (
              <div>
                <p style={{ margin: "0 0 8px" }}>
                  Are you sure you want to close <strong>'{jobToStatusChange?.job?.title}'</strong>?
                </p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  This will remove the job from the applicant Job Search feed immediately. All received applications, review notes, and screening scores will remain completely saved and accessible in your dashboard.
                </p>
              </div>
            ) : (
              <div>
                <p style={{ margin: "0 0 8px" }}>
                  Are you sure you want to reopen <strong>'{jobToStatusChange?.job?.title}'</strong>?
                </p>
                <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "#64748b" }}>
                  This will make the job posting active and visible again in the Job Search feed for new applicants.
                </p>
                <div style={{ marginTop: "12px", textAlign: "left" }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>
                    Active Close Date (MM/DD/YYYY):
                  </label>
                  <input
                    type="text"
                    value={reopenCloseDate}
                    onChange={(e) => setReopenCloseDate(e.target.value)}
                    placeholder="MM/DD/YYYY"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            )
          }
          cancelLabel={jobToStatusChange?.targetStatus === "closed" ? "Keep Job Open" : "Cancel"}
          confirmLabel={jobToStatusChange?.targetStatus === "closed" ? "Close Job Post" : "Reopen Job Post"}
          isConfirming={isUpdatingStatus}
          onCancel={() => {
            setJobToStatusChange(null);
            setReopenCloseDate("");
          }}
          onConfirm={handleConfirmStatusChange}
        />

        {/* DELETE JOB CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={Boolean(jobToDelete)}
          type="danger"
          title="Delete Job Post"
          message={
            <div>
              <p style={{ margin: "0 0 8px" }}>
                Are you sure you want to permanently delete <strong>'{jobToDelete?.title}'</strong>?
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                All active candidate applications, match records, and screening history linked to this posting will also be removed. This action cannot be undone.
              </p>
            </div>
          }
          cancelLabel="Keep Job Post"
          confirmLabel="Delete Permanently"
          isConfirming={isDeletingJob}
          onCancel={() => setJobToDelete(null)}
          onConfirm={handleConfirmDeleteJob}
        />

        {/* LOGOUT CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={isLogoutModalOpen}
          type="info"
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
      </main>
    </div>
  );
}

