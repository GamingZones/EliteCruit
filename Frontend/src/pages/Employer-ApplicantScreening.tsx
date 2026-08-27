import React, { useEffect, useState, useCallback } from "react";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import { useEmployerCompanyLabel } from "./useEmployerCompanyLabel";
import ChatbotDrawer, { FAQItem } from "../components/ChatbotDrawer";
import "./Applicant-Dashboard.css";
import "./ApplicantDashboardOverrides.css";
import "./Employer-Dashboard.css";
import "./Employer-ApplicantScreening.css";

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

type ScreeningApplication = {
  id: number;
  applicant_user_id: number;
  applicant_name: string;
  job_title: string;
  city: string;
  status: string;
  submitted_at: string;
};

type DirectInvitation = {
  id: number;
  job_post_id: number;
  applicant_user_id: number;
  status: string;
  custom_message?: string;
  created_at: string;
  updated_at: string;
  job_title: string;
  job_location?: string;
  salary_min?: number;
  salary_max?: number;
  work_arrangement?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  skills?: string;
  qualifications?: string;
  desired_job_title?: string;
  resume_path?: string | null;
  applicant_email?: string;
};

function initialsFrom(name?: string) {
  if (!name) return "AP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function EmployerApplicantScreening() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [activeScreeningSection, setActiveScreeningSection] = useState("candidate-discovery");
  const companyLabel = useEmployerCompanyLabel("Employer");

  const applicantScreeningFaqs: FAQItem[] = [
    {
      question: "How do I screen incoming applications efficiently?",
      answer: "Select an application from the queue to view full candidate details. Use the status dropdown or action buttons to approve, shortlist, or deny candidates.",
    },
    {
      question: "Where can I view candidate contact details?",
      answer: "Applicant email, phone number, location, desired salary, and attached resumes are displayed in the candidate preview panel upon clicking an applicant.",
    },
  ];

  const [applications, setApplications] = useState<ScreeningApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [directInvitations, setDirectInvitations] = useState<DirectInvitation[]>([]);
  const [invitationFilter, setInvitationFilter] = useState<"all" | "accepted" | "pending" | "declined">("all");

  const fetchApplications = useCallback(async () => {
    const raw = localStorage.getItem("elitecruit-user");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.role === "employer" && parsed.id) {
        const res = await fetch(`/api/employers/${parsed.id}/applications`);
        const data = await res.json();
        const list: ScreeningApplication[] = Array.isArray(data?.applications) ? data.applications : [];
        setApplications(list);
        if (list.length > 0 && !selectedAppId) {
          setSelectedAppId(list[0].id);
        }

        const invRes = await fetch(`/api/employers/${parsed.id}/direct-invitations`);
        if (invRes.ok) {
          const invData = await invRes.json();
          setDirectInvitations(Array.isArray(invData?.invitations) ? invData.invitations : []);
        }
      }
    } catch {}
  }, [selectedAppId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    const updateFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "nearby-applicants" || hash === "shortlisted-candidates" || hash === "candidate-discovery" || hash === "direct-invitations") {
        setActiveScreeningSection(hash);
      } else {
        setActiveScreeningSection("candidate-discovery");
      }
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);

    return () => {
      window.removeEventListener("hashchange", updateFromHash);
    };
  }, []);

  const handleUpdateStatus = async (appId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((item) => (item.id === appId ? { ...item, status: newStatus } : item))
        );
      }
    } catch {}
  };

  const selectedApp = applications.find((a) => a.id === selectedAppId) || applications[0] || null;

  const shortlistedList = applications.filter((a) => (a.status || "").toLowerCase() === "shortlisted");
  const approvedList = applications.filter((a) => ["approved", "accepted"].includes((a.status || "").toLowerCase()));
  const deniedList = applications.filter((a) => ["denied", "rejected"].includes((a.status || "").toLowerCase()));
  const pendingList = applications.filter(
    (a) => !["shortlisted", "approved", "accepted", "denied", "rejected"].includes((a.status || "").toLowerCase())
  );

  const filteredInvitations = directInvitations.filter((inv) => {
    if (invitationFilter === "all") return true;
    return (inv.status || "pending").toLowerCase() === invitationFilter;
  });

  return (
    <div className="appdash-page employer-page sidebar-visible">
      <aside className="appdash-sidebar" aria-label="Employer Navigation">
        <a href="/" className="appdash-brand"><strong>EliteCruit</strong><span>Employer Workspace</span></a>

        <div className="employer-links-wrap">
          <ul className="appdash-secondary-list employer-main-links">
            <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
          </ul>

          <div className="appdash-menu-block employer-screening-block">
            <button className="appdash-menu-title employer-screening-title screening-route-active" type="button" onClick={() => setIsScreeningOpen((v) => !v)}>
              <span className="title-main">
                <span className="item-icon"><EmployerIcon name="applicant" /></span>
                <a href="/employer-applicant-management" onClick={(e) => e.stopPropagation()} className="sidebar-link-title">Applicant Management</a>
              </span>
              <span className={`title-caret ${isScreeningOpen ? "open" : "closed"}`}><ChevronIcon direction={isScreeningOpen ? "down" : "up"} /></span>
            </button>

            {isScreeningOpen && (
              <ul className="appdash-menu-list">
                <li className={activeScreeningSection === "candidate-discovery" ? "active" : ""}><a href="/employer-applicant-management#applicant-screening"><span className="item-icon"><EmployerIcon name="screening" /></span><span>Applicant Screening</span></a></li>
                <li className={activeScreeningSection === "shortlisted-candidates" ? "active" : ""}><a href="/employer-applicant-management#shortlisted-candidates"><span className="item-icon"><EmployerIcon name="shortlisted" /></span><span>Shortlisted Candidates</span></a></li>
                <li className={activeScreeningSection === "direct-invitations" ? "active" : ""}><a href="/employer-applicant-management#direct-invitations"><span className="item-icon"><EmployerIcon name="discovery" /></span><span>Recruitment List</span></a></li>
              </ul>
            )}
          </div>

          <ul className="appdash-secondary-list">
            <li><a href="/employer-applicant-finder"><span className="item-icon"><EmployerIcon name="nearby" /></span><span>Applicant Finder</span></a></li>
            <li><a href="/employer-faq-management"><span className="item-icon"><EmployerIcon name="faq" /></span><span>FAQ Management</span></a></li>
            <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span></a></li>
            <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span><span className="item-badge">8</span></a></li>
            <li><a href="#"><span className="item-icon"><EmployerIcon name="feedback" /></span><span>Feedback</span></a></li>
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

      <main className="appdash-main screening-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Applicant Screening</strong></div></div>
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
                pageTitle="Applicant Screening"
                faqs={applicantScreeningFaqs}
              />
            </div>
          </div>
        </header>

        {/* Applicant Shortlist Board */}
        <section className="screening-board screening-card">
          <div className="board-head">
            <div>
              <h2>Applicant Shortlist Board</h2>
              <p>Manage shortlisted candidates through approval and denial stages, and preview selected applicant details.</p>
            </div>
            <span>{applications.length} candidates</span>
          </div>

          <div className="board-grid">
            <div className="stage-wrap">
              <div className="stage">
                <header><b>Shortlist</b><span>{shortlistedList.length}</span></header>
                {shortlistedList.length === 0 ? (
                  <div className="empty">No candidates</div>
                ) : (
                  shortlistedList.map((a) => (
                    <div
                      key={a.id}
                      className={`ticket ${selectedAppId === a.id ? "active-ticket" : ""}`}
                      onClick={() => setSelectedAppId(a.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <strong>{a.applicant_name}</strong>
                      <small style={{ display: "block", color: "#64748b" }}>{a.job_title}</small>
                    </div>
                  ))
                )}
              </div>

              <div className="stage">
                <header><b>Approved</b><span>{approvedList.length}</span></header>
                {approvedList.length === 0 ? (
                  <div className="empty">No candidates</div>
                ) : (
                  approvedList.map((a) => (
                    <div
                      key={a.id}
                      className={`ticket ${selectedAppId === a.id ? "active-ticket" : ""}`}
                      onClick={() => setSelectedAppId(a.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <strong>{a.applicant_name}</strong>
                      <small style={{ display: "block", color: "#64748b" }}>{a.job_title}</small>
                    </div>
                  ))
                )}
              </div>

              <div className="stage">
                <header><b>Denied</b><span>{deniedList.length}</span></header>
                {deniedList.length === 0 ? (
                  <div className="empty">No candidates</div>
                ) : (
                  deniedList.map((a) => (
                    <div
                      key={a.id}
                      className={`ticket ${selectedAppId === a.id ? "active-ticket" : ""}`}
                      onClick={() => setSelectedAppId(a.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <strong>{a.applicant_name}</strong>
                      <small style={{ display: "block", color: "#64748b" }}>{a.job_title}</small>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedApp && (
              <aside className="candidate-preview">
                <div className="preview-head">
                  <div>
                    <small>{selectedApp.job_title || "Role"}</small>
                    <h3>{selectedApp.applicant_name}</h3>
                    <p>{selectedApp.address || selectedApp.city || "Cavite"}</p>
                  </div>
                  <span className="mode-pill" style={{ background: "#e1f7ee", color: "#12874f" }}>Match Candidate</span>
                </div>
                <div className="meta-grid">
                  <div><small>Location</small><b>{selectedApp.address || selectedApp.city || "Cavite"}</b></div>
                  <div><small>Applied For</small><b>{selectedApp.job_title || "Role"}</b></div>
                  <div><small>Application Status</small><b style={{ textTransform: "capitalize" }}>{selectedApp.status || "pending"}</b></div>
                  <div><small>Applied Date</small><b>{formatDate(selectedApp.submitted_at)}</b></div>
                </div>
                <div className="preview-actions" style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <a
                    href={`/api/applicants/${selectedApp.applicant_user_id}/resume`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="solid-btn"
                    style={{ textDecoration: "none", padding: "8px 14px", fontSize: "0.82rem" }}
                  >
                    View Resume
                  </a>
                  <button
                    type="button"
                    className="solid-btn"
                    style={{ background: "#fff8e6", color: "#b85a06", border: "1px solid #f7d49e" }}
                    onClick={() => handleUpdateStatus(selectedApp.id, "shortlisted")}
                  >
                    Shortlist
                  </button>
                  <button
                    type="button"
                    className="solid-btn"
                    style={{ background: "#e1f7ee", color: "#12874f", border: "1px solid #9fdfb9" }}
                    onClick={() => handleUpdateStatus(selectedApp.id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="solid-btn"
                    style={{ background: "#ffe8e8", color: "#b02a2a", border: "1px solid #f6b3b3" }}
                    onClick={() => handleUpdateStatus(selectedApp.id, "denied")}
                  >
                    Reject
                  </button>
                </div>
              </aside>
            )}
          </div>
        </section>

        {/* Shortlisted Candidates Section */}
        <section id="shortlisted-candidates" className="shortlisted-section screening-card" style={{ marginTop: "24px" }}>
          <div className="board-head">
            <h2>Shortlisted Candidates</h2>
            <span>{shortlistedList.length} shortlisted</span>
          </div>
          {shortlistedList.length === 0 ? (
            <p className="nearby-sub" style={{ color: "#64748b", margin: "12px 0 0" }}>No candidates shortlisted yet.</p>
          ) : (
            <div className="all-applicant-list" style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
              {shortlistedList.map((app) => (
                <article key={app.id} className="applicant-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fff" }}>
                  <div className="applicant-top" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span className="app-badge" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>{initialsFrom(app.applicant_name)}</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{app.applicant_name}</h3>
                      <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "#475569" }}>{app.job_title}</p>
                      <small style={{ color: "#64748b" }}>{app.city || "Cavite"}</small>
                    </div>
                  </div>
                  <div className="app-actions" style={{ display: "flex", gap: "8px" }}>
                    <a href={`/api/applicants/${app.applicant_user_id}/resume`} target="_blank" rel="noopener noreferrer" className="solid-btn" style={{ textDecoration: "none", padding: "8px 14px", fontSize: "0.82rem" }}>View Resume</a>
                    <button type="button" className="solid-btn" style={{ background: "#e1f7ee", color: "#12874f" }} onClick={() => handleUpdateStatus(app.id, "approved")}>Approve Candidate</button>
                    <button type="button" className="solid-btn" style={{ background: "#ffe8e8", color: "#b02a2a" }} onClick={() => handleUpdateStatus(app.id, "denied")}>Reject</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Direct Invitations Section */}
        <section id="direct-invitations" className="direct-invitations-section screening-card" style={{ marginTop: "24px" }}>
          <div className="board-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2>Direct Invitations</h2>
              <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "0.88rem" }}>
                Candidates directly invited by your team from the Applicant Finder.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["all", "accepted", "pending", "declined"] as const).map((filterKey) => {
                const count = filterKey === "all"
                  ? directInvitations.length
                  : directInvitations.filter((i) => (i.status || "pending").toLowerCase() === filterKey).length;
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setInvitationFilter(filterKey)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: invitationFilter === filterKey ? "1px solid #0284c7" : "1px solid #cbd5e1",
                      background: invitationFilter === filterKey ? "#e0f2fe" : "#f8fafc",
                      color: invitationFilter === filterKey ? "#0369a1" : "#475569",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {filterKey} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredInvitations.length === 0 ? (
            <p className="nearby-sub" style={{ color: "#64748b", margin: "16px 0 0" }}>
              No direct invitations found under "{invitationFilter}".
            </p>
          ) : (
            <div className="all-applicant-list" style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
              {filteredInvitations.map((inv) => {
                const candidateName = [inv.first_name, inv.last_name].filter(Boolean).join(" ") || inv.applicant_email || "Candidate";
                const status = (inv.status || "pending").toLowerCase();
                return (
                  <article
                    key={inv.id}
                    className="applicant-card"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "#fff",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: "14px", alignItems: "center", minWidth: "260px" }}>
                      <span
                        className="app-badge"
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          background: "#e0f2fe",
                          color: "#0369a1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "0.92rem",
                        }}
                      >
                        {initialsFrom(candidateName)}
                      </span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{candidateName}</h3>
                        <p style={{ margin: "2px 0 0", fontSize: "0.86rem", color: "#0284c7", fontWeight: 600 }}>
                          {inv.job_title}
                        </p>
                        <small style={{ color: "#64748b" }}>
                          {inv.city || "Cavite"} • Invited: {formatDate(inv.created_at)}
                        </small>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "999px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          textTransform: "capitalize",
                          background: status === "accepted" ? "#ecfdf5" : status === "declined" ? "#fef2f2" : "#fffbeb",
                          color: status === "accepted" ? "#065f46" : status === "declined" ? "#991b1b" : "#92400e",
                          border: status === "accepted" ? "1px solid #a7f3d0" : status === "declined" ? "1px solid #fecaca" : "1px solid #fde68a",
                        }}
                      >
                        {status === "accepted" ? "Accepted (Shortlisted)" : status === "declined" ? "Declined" : "Pending Candidate Response"}
                      </span>
                    </div>

                    <div className="app-actions" style={{ display: "flex", gap: "8px" }}>
                      {inv.resume_path && (
                        <a
                          href={`/api/applicants/${inv.applicant_user_id}/resume`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="solid-btn"
                          style={{ textDecoration: "none", padding: "8px 14px", fontSize: "0.82rem" }}
                        >
                          View Resume
                        </a>
                      )}
                      <a
                        href="/messages"
                        className="solid-btn"
                        style={{
                          textDecoration: "none",
                          padding: "8px 14px",
                          fontSize: "0.82rem",
                          background: "#0284c7",
                          color: "#fff",
                        }}
                      >
                        Message Candidate
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}