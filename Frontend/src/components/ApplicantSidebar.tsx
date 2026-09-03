import React, { useState } from "react";
import "./ApplicantSidebar.css";

export type ApplicantNavIcon =
  | "overview"
  | "star"
  | "applications"
  | "documents"
  | "feedback"
  | "profile"
  | "search"
  | "chat"
  | "messages"
  | "notifications"
  | "logout";

export interface ApplicantNavItem {
  label: string;
  icon: ApplicantNavIcon;
  badge?: string;
  sectionId?: string;
  href?: string;
}

export function ApplicantNavIconSvg({ name }: { name: ApplicantNavIcon }) {
  const icons: Record<ApplicantNavIcon, JSX.Element> = {
    overview: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />,
    star: <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
    applications: <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />,
    documents: <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />,
    feedback: <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM13 14h-2v-2h2v2zm0-4h-2V6h2v4z" />,
    profile: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />,
    search: <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />,
    chat: <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />,
    messages: <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />,
    notifications: <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />,
    logout: <path d="m17 7-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      {icons[name]}
    </svg>
  );
}

interface ApplicantSidebarProps {
  activePath?: string;
  activeSection?: string;
  applicantName?: string;
  onNavigateSection?: (sectionId: string) => void;
}

export default function ApplicantSidebar({
  activePath = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "/applicant-dashboard",
  activeSection = "section-overview",
  applicantName = "Applicant",
  onNavigateSection,
}: ApplicantSidebarProps) {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const workspaceNav: ApplicantNavItem[] = [
    { label: "Overview", icon: "overview", sectionId: "section-overview" },
    { label: "Smart Matches", icon: "star", sectionId: "section-smart-matches" },
    { label: "My Applications", icon: "applications", sectionId: "section-applications" },
  ];

  const secondaryNav: ApplicantNavItem[] = [
    { label: "Job Search", icon: "search", href: "/job-search" },
    { label: "Messages", icon: "messages", href: "/messages" },
    { label: "Notifications", icon: "notifications", href: "/notifications" },
    { label: "Feedback", icon: "feedback", href: "/feedback" },
  ];

  const isWorkspaceActivePage =
    activePath === "/applicant-dashboard" || activePath === "/applicant/dashboard";

  return (
    <aside className="appdash-sidebar" aria-label="Applicant Navigation">
      <a href="/applicant-dashboard" className="appdash-brand">
        <strong>ELITECRUIT</strong>
        <span>APPLICANT WORKSPACE</span>
      </a>

      <div className="appdash-menu-block">
        <button
          type="button"
          className={`appdash-menu-title workspace-route-title ${isWorkspaceActivePage ? "active" : ""}`}
          onClick={() => {
            if (!isWorkspaceActivePage) {
              window.location.href = "/applicant-dashboard";
            } else {
              setIsWorkspaceOpen((prev) => !prev);
            }
          }}
        >
          <span className="title-main">
            <span className="item-icon">
              <ApplicantNavIconSvg name="overview" />
            </span>
            Applicant Workspace
          </span>
          <span className={`title-caret ${isWorkspaceOpen ? "open" : "closed"}`}>
            <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>

        {isWorkspaceOpen && isWorkspaceActivePage && (
          <ul id="workspace-links" className="appdash-menu-list">
            {workspaceNav.map((item) => {
              const isActive = item.sectionId === activeSection;
              return (
                <li key={item.label} className={isActive ? "active" : ""}>
                  <a
                    href={`#${item.sectionId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onNavigateSection && item.sectionId) {
                        onNavigateSection(item.sectionId);
                      }
                    }}
                  >
                    <span className="item-icon">
                      <ApplicantNavIconSvg name={item.icon} />
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
          const isActive = item.href ? activePath === item.href.toLowerCase() : false;
          return (
            <li key={item.label} className={isActive ? "active" : ""}>
              <a href={item.href || "#"}>
                <span className="item-icon">
                  <ApplicantNavIconSvg name={item.icon} />
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
            <ApplicantNavIconSvg name="profile" />
          </span>
          <span className="profile-user-copy">
            <strong>{applicantName}</strong>
            <small>Applicant</small>
          </span>
        </button>
        {isProfileMenuOpen && (
          <div className="appdash-profile-menu">
            <a href="/my-profile">
              <ApplicantNavIconSvg name="profile" />
              My Profile
            </a>
            <a href="/login">
              <ApplicantNavIconSvg name="logout" />
              Logout
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
