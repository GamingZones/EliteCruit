import React, { useState } from "react";
import "./EmployerSidebar.css";
import { clearAuth } from "../utils/auth";

export type EmployerNavIcon =
  | "dashboard"
  | "jobPosts"
  | "applicantManagement"
  | "applicantFinder"
  | "nearby"
  | "faq"
  | "messages"
  | "notifications"
  | "feedback"
  | "companyProfile"
  | "logout";

export interface EmployerNavItem {
  label: string;
  icon: EmployerNavIcon;
  href: string;
  badge?: string;
}

export function EmployerNavIconSvg({ name }: { name: EmployerNavIcon }) {
  const icons: Record<EmployerNavIcon, JSX.Element> = {
    dashboard: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />,
    jobPosts: <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />,
    applicantManagement: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />,
    applicantFinder: <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />,
    nearby: <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />,
    faq: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />,
    messages: <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />,
    notifications: <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />,
    feedback: <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM13 14h-2v-2h2v2zm0-4h-2V6h2v4z" />,
    companyProfile: <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />,
    logout: <path d="m17 7-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
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
  companyName = "Employer",
}: EmployerSidebarProps) {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const workspaceNav: EmployerNavItem[] = [
    { label: "Dashboard", icon: "dashboard", href: "/employer-dashboard" },
    { label: "Job Posts", icon: "jobPosts", href: "/employer-job-posts" },
    { label: "Applicant Management", icon: "applicantManagement", href: "/employer-applicant-management" },
    { label: "Applicant Finder", icon: "applicantFinder", href: "/employer-applicant-finder" },
  ];

  const secondaryNav: EmployerNavItem[] = [
    { label: "Nearby Applicant Finder", icon: "nearby", href: "/employer-nearby-applicants" },
    { label: "Notices & FAQs", icon: "faq", href: "/employer-notices-faqs" },
    { label: "Messages", icon: "messages", href: "/messages" },
    { label: "Notifications", icon: "notifications", href: "/notifications" },
    { label: "Feedback", icon: "feedback", href: "/feedback" },
  ];

  return (
    <aside className="appdash-sidebar" aria-label="Employer Navigation">
      <a href="/employer-dashboard" className="appdash-brand">
        <strong>ELITECRUIT</strong>
        <span>EMPLOYER WORKSPACE</span>
      </a>

      <div className="appdash-menu-block">
        <button
          type="button"
          className="appdash-menu-title workspace-route-title active"
          onClick={() => setIsWorkspaceOpen((prev) => !prev)}
        >
          <span className="title-main">
            <span className="item-icon">
              <EmployerNavIconSvg name="dashboard" />
            </span>
            Employer Workspace
          </span>
          <span className={`title-caret ${isWorkspaceOpen ? "open" : "closed"}`}>
            <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>

        {isWorkspaceOpen && (
          <ul id="workspace-links" className="appdash-menu-list">
            {workspaceNav.map((item) => {
              const isActive = activePath === item.href.toLowerCase();
              return (
                <li key={item.label} className={isActive ? "active" : ""}>
                  <a href={item.href}>
                    <span className="item-icon">
                      <EmployerNavIconSvg name={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ul className="appdash-secondary-list">
        {secondaryNav.map((item) => {
          const isActive = activePath === item.href.toLowerCase();
          return (
            <li key={item.label} className={isActive ? "active" : ""}>
              <a href={item.href}>
                <span className="item-icon">
                  <EmployerNavIconSvg name={item.icon} />
                </span>
                <span>{item.label}</span>
                {item.badge ? <span className="item-badge">{item.badge}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="appdash-profile-control">
        <button
          type="button"
          className="appdash-profile-anchor"
          onClick={() => setIsProfileMenuOpen((val) => !val)}
          aria-expanded={isProfileMenuOpen}
        >
          <span className="item-icon">
            <EmployerNavIconSvg name="companyProfile" />
          </span>
          <span className="profile-user-copy">
            <strong>{companyName}</strong>
            <small>Employer</small>
          </span>
        </button>
        {isProfileMenuOpen && (
          <div className="appdash-profile-menu">
            <a href="/employer-company-profile">
              <EmployerNavIconSvg name="companyProfile" />
              Company Profile
            </a>
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                clearAuth();
                window.location.href = "/login";
              }}
            >
              <EmployerNavIconSvg name="logout" />
              Logout
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
