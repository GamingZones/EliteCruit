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

        {message && <p className="profile-message">{message}</p>}

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
                        <span className="job-chip salary">PHP {formatSalary(job.salary_min)} - {formatSalary(job.salary_max)}</span>
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
                        <button type="button" onClick={() => { window.location.href = `/employer-applicant-management?jobId=${job.id}`; }}>Review</button>
                        <a className="job-action-link" href={`/employer-job-posts/create?edit=${job.id}`}>Edit</a>
                        <button type="button" className="danger" onClick={() => deleteJobPost(job)}>Delete</button>
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

