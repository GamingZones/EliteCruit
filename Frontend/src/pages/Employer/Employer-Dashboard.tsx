import React, { useEffect, useState } from "react";
import { ChevronIcon, SideIcon } from "../Applicant/Applicant-Dashboard";
import { useEmployerCompanyLabel } from "../useEmployerCompanyLabel";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
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
};

type RecentApplication = {
  id: number;
  status: string;
  submitted_at: string | null;
  job_title: string | null;
  applicant_name: string | null;
};

type DashboardSummary = {
  stats: {
    activeJobs: number;
    applications: number;
    shortlisted: number;
    toReview: number;
  };
  activeJobPosts: ActiveJobPost[];
  recentApplications: RecentApplication[];
};

type StatMetric = {
  label: string;
  value: number;
  hint: string;
  icon: EmployerIconName;
};

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
  return parsed.toLocaleDateString("en-US");
}

function appStatusClass(status: string | null | undefined) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "pending" || normalized === "submitted") return "status-gray";
  return "status-blue";
}

export default function EmployerDashboard() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [summary, setSummary] = useState<DashboardSummary>({
    stats: { activeJobs: 0, applications: 0, shortlisted: 0, toReview: 0 },
    activeJobPosts: [],
    recentApplications: [],
  });
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

  const statMetrics: StatMetric[] = [
    { label: "Active Jobs", value: summary.stats.activeJobs, hint: "Open postings", icon: "jobposts" },
    { label: "Applications", value: summary.stats.applications, hint: "Across active roles", icon: "applicant" },
    { label: "Shortlisted", value: summary.stats.shortlisted, hint: "Candidate pipeline", icon: "shortlisted" },
    { label: "To Review", value: summary.stats.toReview, hint: "Needs attention", icon: "screening" },
  ];

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

      fetch(`/api/employers/${savedUser.id}/dashboard-summary`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data?.message || "Unable to load dashboard data.");
          setSummary({
            stats: data?.stats || { activeJobs: 0, applications: 0, shortlisted: 0, toReview: 0 },
            activeJobPosts: Array.isArray(data?.activeJobPosts) ? data.activeJobPosts : [],
            recentApplications: Array.isArray(data?.recentApplications) ? data.recentApplications : [],
          });
        })
        .catch((error) => setProfileMessage(error instanceof Error ? error.message : "Unable to load dashboard data."));
    } catch {
      setProfileMessage("Unable to read account session.");
    }
  }, []);

  return (
    <div className={`appdash-page employer-page ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
      <aside className="appdash-sidebar" aria-label="Employer Navigation">
        <a href="/" className="appdash-brand">
          <strong>EliteCruit</strong>
          <span>Employer Workspace</span>
        </a>

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
            <li><a href="/employer-faq-management"><span className="item-icon"><EmployerIcon name="faq" /></span><span>FAQ Management</span></a></li>
            <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span></a></li>
            <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span><span className="item-badge">8</span></a></li>
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
              <a href="/"><EmployerIcon name="logout" />Logout</a>
            </div>
          )}
        </div>
      </aside>

      <main className="appdash-main employer-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Employer Workspace</strong></div></div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Employer Dashboard"
                customFaqs={dashboardFaqs}
              />
            </div>
          </div>
        </header>

        <section className="hero-card">
          <div>
            <small>Employer Workspace</small>
            <h1>Employer Dashboard</h1>
            <p>Manage job posts, applicant queues, nearby applicants, shortlists, feedback, and company response content.</p>
          </div>
        </section>

        <section className="employer-stats-grid" aria-label="Employer stats">
          {statMetrics.map((metric) => (
            <article className="employer-stat-card" key={metric.label}>
              <div><small>{metric.label}</small><span className="mini-icon" aria-hidden="true"><EmployerIcon name={metric.icon} /></span></div>
              <strong>{metric.value}</strong>
              <p>{metric.hint}</p>
            </article>
          ))}
        </section>

        {profileMessage && <p className="profile-message">{profileMessage}</p>}

        <section className="employer-dual-grid">
          <article className="employer-block">
            <header><h2>Active Job Posts</h2><a href="/employer-job-posts/create">Post New Job</a></header>
            {summary.activeJobPosts.length === 0 ? (
              <div className="job-post-row">
                <div>
                  <strong>No active posts yet.</strong>
                  <small>Publish a job post to start receiving applicants.</small>
                </div>
              </div>
            ) : (
              summary.activeJobPosts.map((job) => (
                <div className="job-post-row" key={job.id}>
                  <div>
                    <strong>{job.title}</strong>
                    <p>{job.location || "Location not set"}</p>
                    <small>{job.applicant_count || 0} applications</small>
                  </div>
                  <div>
                    <span className="status-green">{job.status || "open"}</span>
                    <a href="/employer-applicant-management">View applicants</a>
                  </div>
                </div>
              ))
            )}
          </article>

          <article className="employer-block">
            <header><h2>Recent Applications</h2><a href="/employer-applicant-management">View All</a></header>
            {summary.recentApplications.length === 0 ? (
              <div className="recent-app-row">
                <div>
                  <strong>No applications yet.</strong>
                  <small>Applicants for your posted jobs will appear here.</small>
                </div>
              </div>
            ) : (
              summary.recentApplications.map((item) => (
                <div className="recent-app-row" key={item.id}>
                  <span className="initials-pill">{initialsFromName(item.applicant_name)}</span>
                  <div>
                    <strong>{item.applicant_name || "Applicant"}</strong>
                    <p>{item.job_title || "Job Post"}</p>
                    <small>{formatDate(item.submitted_at)}</small>
                  </div>
                  <a
                    href="/employer-applicant-management"
                    className="review-btn"
                  >
                    Review
                  </a>
                </div>
              ))
            )}
          </article>
        </section>

        <section className="employer-dual-grid bottom-grid">
          <article className="employer-block status-overview-block">
            <header><h2>Application Status Overview</h2></header>
            <div className="status-line"><span>Pending Review</span><b className="status-count gray">{summary.stats.toReview}</b></div>
            <div className="status-line"><span>Under Review</span><b className="status-count blue">{Math.max(summary.stats.applications - summary.stats.toReview - summary.stats.shortlisted, 0)}</b></div>
            <div className="status-line"><span>Shortlisted</span><b className="status-count blue">{summary.stats.shortlisted}</b></div>
            <div className="status-line"><span>Rejected</span><b className="status-count red">0</b></div>
          </article>

          <article className="employer-block quick-actions-block">
            <header><h2>Quick Actions</h2></header>
            <button type="button" onClick={() => { window.location.href = "/employer-job-posts/create"; }}><EmployerIcon name="jobposts" />Post a New Job</button>
            <button type="button" onClick={() => { window.location.href = "/employer-company-profile"; }}><EmployerIcon name="company" />Company Profile</button>
            <button type="button" onClick={() => { window.location.href = "/employer-applicant-screening#nearby-applicants"; }}><EmployerIcon name="screening" />Find Nearby Applicants</button>
            <button type="button" onClick={() => { window.location.href = "/employer-applicant-management"; }}><EmployerIcon name="applicant" />Review Applications</button>
          </article>
        </section>
      </main>
    </div>
  );
}
