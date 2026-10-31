import React, { useState } from "react";
import { ChevronIcon, SideIcon } from "./Icons";
import { useEmployerCompanyLabel } from "../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../hooks/useUnreadMessagesCount";
import { usePendingApplicationsCount } from "../hooks/usePendingApplicationsCount";
import { clearAuth } from "../utils/auth";
import "./EmployerSidebar.css";

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
  | "settings"
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
    settings: <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />,
    logout: <path d="M9 4H5v16h4M14 8l4 4-4 4M10 12h8" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

interface EmployerSidebarProps {
  activePath?: string;
  companyName?: string;
}

export default function EmployerSidebar({
  activePath = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "/employer-dashboard",
  companyName,
}: EmployerSidebarProps) {
  const companyLabel = useEmployerCompanyLabel(companyName || "Employer");
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const pendingApplicantsCount = usePendingApplicationsCount();
  const [isScreeningOpen, setIsScreeningOpen] = useState(
    activePath.includes("applicant-management") || activePath.includes("screening")
  );
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <aside className="appdash-sidebar" aria-label="Employer Navigation">
      <a href="/employer-dashboard" className="appdash-brand">
        <strong>EliteCruit</strong>
        <span>Employer Workspace</span>
      </a>

      <div className="employer-links-wrap">
        <ul className="appdash-secondary-list">
          <li className={activePath === "/employer-dashboard" ? "active" : ""}>
            <a href="/employer-dashboard">
              <span className="item-icon"><EmployerIcon name="dashboard" /></span>
              <span>Dashboard</span>
            </a>
          </li>
          <li className={activePath.startsWith("/employer-job-posts") ? "active" : ""}>
            <a href="/employer-job-posts">
              <span className="item-icon"><EmployerIcon name="jobposts" /></span>
              <span>Job Posts</span>
            </a>
          </li>
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
                {pendingApplicantsCount > 0 && (
                  <span className="item-badge" title={`${pendingApplicantsCount} pending applicant${pendingApplicantsCount > 1 ? "s" : ""}`} style={{ marginLeft: "auto", marginRight: 8 }}>
                    {pendingApplicantsCount}
                  </span>
                )}
              </span>
              <span className="title-caret-btn" title="Toggle sub-menu">
                <ChevronIcon direction={isScreeningOpen ? "down" : "up"} />
              </span>
            </a>
            {isScreeningOpen && (
              <ul className="appdash-menu-list">
                <li>
                  <a href="/employer-applicant-management#applicant-screening">
                    <span className="item-icon"><EmployerIcon name="screening" /></span>
                    <span>Applicant Screening</span>
                    {pendingApplicantsCount > 0 && <span className="item-badge">{pendingApplicantsCount}</span>}
                  </a>
                </li>
                <li>
                  <a href="/employer-applicant-management#shortlisted-candidates">
                    <span className="item-icon"><EmployerIcon name="shortlisted" /></span>
                    <span>Shortlisted Candidates</span>
                  </a>
                </li>
                <li>
                  <a href="/employer-applicant-management#direct-invitations">
                    <span className="item-icon"><EmployerIcon name="discovery" /></span>
                    <span>Recruitment List</span>
                  </a>
                </li>
              </ul>
            )}
          </li>
          <li className={activePath === "/employer-applicant-finder" || activePath === "/employer-nearby-applicants" ? "active" : ""}>
            <a href="/employer-applicant-finder">
              <span className="item-icon"><EmployerIcon name="nearby" /></span>
              <span>Applicant Finder</span>
            </a>
          </li>
          <li className={activePath === "/employer-notices-faqs" ? "active" : ""}>
            <a href="/employer-notices-faqs">
              <span className="item-icon"><EmployerIcon name="faq" /></span>
              <span>Notices & FAQs</span>
            </a>
          </li>
          <li className={activePath === "/messages" ? "active" : ""}>
            <a href="/messages">
              <span className="item-icon"><EmployerIcon name="messages" /></span>
              <span>Messages</span>
              {unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}
            </a>
          </li>
          <li className={activePath === "/notifications" ? "active" : ""}>
            <a href="/notifications">
              <span className="item-icon"><EmployerIcon name="notifications" /></span>
              <span>Notifications</span>
              {unreadNotifCount > 0 && <span className="item-badge">{unreadNotifCount}</span>}
            </a>
          </li>
          <li className={activePath === "/feedback" ? "active" : ""}>
            <a href="/feedback">
              <span className="item-icon"><EmployerIcon name="feedback" /></span>
              <span>Feedback</span>
            </a>
          </li>
        </ul>
      </div>

      <div className="appdash-profile-control">
        <button
          type="button"
          className="appdash-profile-anchor"
          onClick={() => setIsProfileMenuOpen((val) => !val)}
          aria-expanded={isProfileMenuOpen}
        >
          <span className="item-icon"><EmployerIcon name="profile" /></span>
          <span className="profile-user-copy">
            <strong>{companyLabel}</strong>
            <small>Employer</small>
          </span>
          <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
        </button>

        {isProfileMenuOpen && (
          <div className="appdash-profile-menu">
            <a href="/employer-company-profile">
              <EmployerIcon name="profile" />
              Company Profile
            </a>
            <a href="/settings">
              <SideIcon name="settings" />
              Settings
            </a>
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                clearAuth();
                window.location.href = "/login";
              }}
            >
              <EmployerIcon name="logout" />
              Logout
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
