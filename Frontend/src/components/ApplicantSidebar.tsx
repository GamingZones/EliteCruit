import React, { useState, useMemo } from "react";
import "./ApplicantSidebar.css";
import { clearAuth } from "../utils/auth";
import { SideIcon, ChevronIcon, type SideNavItem } from "./Icons";
import { useUnreadNotificationsCount } from "../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../hooks/useUnreadMessagesCount";

export interface ApplicantNavItem {
  label: string;
  icon: SideNavItem["icon"];
  badge?: string;
  sectionId?: string;
  href?: string;
}

interface ApplicantSidebarProps {
  activePath?: string;
  activeSection?: string;
  applicantName?: string;
  onNavigateSection?: (sectionId: string) => void;
}

export default function ApplicantSidebar({
  activePath = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "/applicant-dashboard",
  activeSection = "section-smart-matches",
  applicantName = "Applicant",
  onNavigateSection,
}: ApplicantSidebarProps) {
  const isWorkspaceActivePage =
    activePath === "/applicant-dashboard" || activePath === "/applicant/dashboard";

  // Keep dropdown open if on workspace page, or allow toggle on any page
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(isWorkspaceActivePage);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();

  // Dynamically resolve real logged-in applicant name if available
  const resolvedApplicantName = useMemo(() => {
    if (applicantName && applicantName !== "Applicant") return applicantName;
    try {
      const savedUserRaw = localStorage.getItem("elitecruit-user");
      if (savedUserRaw) {
        const u = JSON.parse(savedUserRaw);
        const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
        if (full) return full;
        if (u.fullName) return u.fullName;
        if (u.name) return u.name;
        if (u.email) return u.email;
      }
    } catch {}
    return "Applicant";
  }, [applicantName]);

  const workspaceNav: ApplicantNavItem[] = [
    { label: "Smart Matches", icon: "star", sectionId: "section-smart-matches" },
    { label: "My Applications", icon: "applications", sectionId: "section-applications" },
    { label: "Job Invitations", icon: "notifications", sectionId: "section-invitations" },
  ];

  const secondaryNav: ApplicantNavItem[] = [
    { label: "Job Search", icon: "search", href: "/job-search" },
    { label: "Offer Letters", icon: "documents", href: "/applicant-offer-letter" },
    { label: "Messages", icon: "messages", href: "/messages" },
    { label: "Notifications", icon: "notifications", href: "/notifications" },
    { label: "Feedback", icon: "feedback", href: "/feedback" },
  ];

  return (
    <aside className="appdash-sidebar" aria-label="Applicant Navigation">
      {/* Brand Header - Matching Applicant Dashboard 1:1 */}
      <div className="appdash-brand">
        <a href="/" className="appdash-brand-link">
          <strong>EliteCruit</strong>
          <span>Candidate Workspace</span>
        </a>
        <button
          type="button"
          className="appdash-sidebar-toggle"
          aria-label="Close sidebar menu"
          onClick={() => {
            const page = document.querySelector('.appdash-page, .profile-page, .jobsearch-page, .messages-page, .settings-page-shell');
            if (page) {
              page.classList.remove('sidebar-visible');
              page.classList.add('sidebar-hidden');
            }
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" }} aria-hidden="true">
            <path d="M5 7h14M5 12h14M5 17h14" />
          </svg>
        </button>
      </div>

      {/* Main Nav List */}
      <ul className="appdash-secondary-list">
        {/* Applicant Workspace Item with Accordion Sub-Menu */}
        <li className={`applicant-workspace-item ${isWorkspaceActivePage ? "active" : ""}`}>
          <a
            href="/applicant-dashboard"
            className={`applicant-workspace-title ${isWorkspaceActivePage ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setIsWorkspaceOpen((prev) => !prev);
            }}
          >
            <span className="title-main">
              <span className="item-icon">
                <SideIcon name="overview" />
              </span>
              <span>Applicant Workspace</span>
            </span>
            <span className="title-caret-btn" title="Toggle sub-menu">
              <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
            </span>
          </a>

          {isWorkspaceOpen && (
            <ul id="workspace-links" className="appdash-menu-list">
              {workspaceNav.map((item) => {
                const isActive = isWorkspaceActivePage && item.sectionId === activeSection;
                return (
                  <li key={item.label} className={isActive ? "active" : ""}>
                    <a
                      href={`/applicant-dashboard#${item.sectionId}`}
                      onClick={(e) => {
                        if (isWorkspaceActivePage && onNavigateSection && item.sectionId) {
                          e.preventDefault();
                          onNavigateSection(item.sectionId);
                        }
                      }}
                    >
                      <span className="item-icon">
                        <SideIcon name={item.icon} />
                      </span>
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </li>

        {/* Secondary Nav Items */}
        {secondaryNav.map((item) => {
          const isActive = item.href ? activePath === item.href.toLowerCase() : false;
          const isNotif = item.label === "Notifications";
          const isMessages = item.label === "Messages";
          const badgeCount = isNotif
            ? unreadNotifCount > 0 ? unreadNotifCount : null
            : isMessages
            ? unreadMessagesCount > 0 ? unreadMessagesCount : null
            : item.badge;

          return (
            <li key={item.label} className={isActive ? "active" : ""}>
              <a href={item.href || "#"}>
                <span className="item-icon">
                  <SideIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
                {badgeCount ? <span className="item-badge">{badgeCount}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>

      {/* Profile Control */}
      <div className="appdash-profile-control">
        <button
          type="button"
          className="appdash-profile-anchor"
          onClick={() => setIsProfileMenuOpen((val) => !val)}
          aria-expanded={isProfileMenuOpen}
        >
          <span className="item-icon">
            <SideIcon name="profile" />
          </span>
          <span className="profile-user-copy">
            <strong>{resolvedApplicantName}</strong>
            <small>Applicant</small>
          </span>
          <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
        </button>

        {isProfileMenuOpen && (
          <div className="appdash-profile-menu">
            <a href="/my-profile">
              <SideIcon name="profile" />
              My Profile
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
              <SideIcon name="logout" />
              Logout
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
