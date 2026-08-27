import React, { useEffect, useState } from "react";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import { useEmployerCompanyLabel } from "./useEmployerCompanyLabel";
import ChatbotDrawer, { FAQItem } from "../components/ChatbotDrawer";
import "./Applicant-Dashboard.css";
import "./ApplicantDashboardOverrides.css";
import "./Employer-Dashboard.css";
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
  application_limit: number | null;
  close_date: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  qualifications: string | null;
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
  type: "skill" | "qualification";
  maxVisible?: number;
}) {
  if (!items || items.length === 0) return null;

  const firstIsTooLong = Boolean(items[0] && items[0].length > 14);
  const visible = firstIsTooLong ? [] : items.slice(0, maxVisible);
  const hidden = firstIsTooLong ? items : items.slice(maxVisible);
  const fullListText = hidden.join(", ");

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
            <strong>{type === "skill" ? "Skills:" : "Qualifications:"}</strong>
            <span>{fullListText}</span>
          </span>
        </span>
      )}
    </span>
  );
}

export default function EmployerJobPostsList() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const companyLabel = useEmployerCompanyLabel("Employer");

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
    if (typeof raw !== "string") return [] as string[];
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
        .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load job posts."));
    } catch {
      setMessage("Unable to read account session.");
    }
  }, []);

  const deleteJobPost = async (jobPostId: number) => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/employers/${userId}/job-posts/${jobPostId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to delete job post.");
      setJobs((current) => current.filter((item) => item.id !== jobPostId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete job post.");
    }
  };

  return (
    <div className="appdash-page employer-page sidebar-visible">
      <aside className="appdash-sidebar" aria-label="Employer Navigation">
        <a href="/" className="appdash-brand"><strong>EliteCruit</strong><span>Employer Workspace</span></a>

        <div className="employer-links-wrap">
          <ul className="appdash-secondary-list employer-main-links">
            <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li className="active"><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
          </ul>

          <div className="appdash-menu-block employer-screening-block">
            <button className="appdash-menu-title employer-screening-title" type="button" onClick={() => setIsScreeningOpen((v) => !v)}>
              <span className="title-main">
                <span className="item-icon"><EmployerIcon name="applicant" /></span>
                <a href="/employer-applicant-management" onClick={(e) => e.stopPropagation()} className="sidebar-link-title">Applicant Management</a>
              </span>
              <span className={`title-caret ${isScreeningOpen ? "open" : "closed"}`}><ChevronIcon direction={isScreeningOpen ? "down" : "up"} /></span>
            </button>
            {isScreeningOpen && (
              <ul className="appdash-menu-list">
                <li><a href="/employer-applicant-management#applicant-screening"><span className="item-icon"><EmployerIcon name="screening" /></span><span>Applicant Screening</span></a></li>
                <li><a href="/employer-applicant-management#shortlisted-candidates"><span className="item-icon"><EmployerIcon name="shortlisted" /></span><span>Shortlisted Candidates</span></a></li>
                <li><a href="/employer-applicant-management#direct-invitations"><span className="item-icon"><EmployerIcon name="discovery" /></span><span>Recruitment List</span></a></li>
              </ul>
            )}
          </div>

          <ul className="appdash-secondary-list">
            <li><a href="/employer-applicant-finder"><span className="item-icon"><EmployerIcon name="nearby" /></span><span>Applicant Finder</span></a></li>
            <li><a href="/employer-faq-management"><span className="item-icon"><EmployerIcon name="faq" /></span><span>FAQ Management</span></a></li>
            <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span></a></li>
            <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span><span className="item-badge">8</span></a></li>
            <li><a href="/feedback"><span className="item-icon"><EmployerIcon name="feedback" /></span><span>Feedback</span></a></li>
          </ul>
        </div>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((v) => !v)}>
            <span className="item-icon"><EmployerIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{companyLabel}</strong><small>Employer</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && <div className="appdash-profile-menu"><a href="/employer-company-profile"><EmployerIcon name="profile" />Company Profile</a><a href="/"><EmployerIcon name="logout" />Logout</a></div>}
        </div>
      </aside>

      <main className="appdash-main joblist-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Job Posts</strong></div></div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <button
                type="button"
                className="chatbot-button"
                onClick={() => setIsChatbotOpen((prev) => !prev)}
              >
                <SideIcon name="chat" />
                ChatBot
              </button>

              <ChatbotDrawer
                isOpen={isChatbotOpen}
                onClose={() => setIsChatbotOpen(false)}
                pageTitle="Job Posts"
                faqs={jobPostsFaqs}
              />
            </div>
          </div>
        </header>

        <section className="joblist-head">
          <div>
            <h1>All Job Posts</h1>
            <p>View every job posting created by your employer account.</p>
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
            jobs.map((job) => {
              const skillItems = parseTags(job.required_skills);
              const qualItems = parseTags(job.qualifications);

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
                        <span className="location-meta"><svg className="location-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" /></svg>{job.location || "Location not set"}</span>
                      </div>
                      <p>{toPreviewText(job.description, "No description provided.")}</p>
                      <div className="job-chip-row">
                        <span className="job-chip work">{job.work_arrangement || "Flexible"}</span>
                        <span className="job-chip salary">PHP {formatSalary(job.salary_min)} - {formatSalary(job.salary_max)}</span>
                      </div>
                    </div>
                    <div className="job-card-center">
                      <div className="job-meta">
                        <span>Applications: {job.applicant_count ?? 0}/{job.application_limit ?? 0}</span>
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
                      </div>
                    </div>
                    <div className="job-card-actions-col">
                      <div className="job-actions">
                        <button type="button">Review</button>
                        <a className="job-action-link" href={`/employer-job-posts/create?edit=${job.id}`}>Edit</a>
                        <button type="button" className="danger" onClick={() => deleteJobPost(job.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
