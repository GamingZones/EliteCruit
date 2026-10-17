import React, { useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import "./AdminSidebar.css";
import { clearAuth } from "../utils/auth";

export type AdminNavIcon =
  | "dashboard"
  | "users"
  | "jobs"
  | "audit"
  | "settings"
  | "profile"
  | "logout";

export function AdminNavIconSvg({ name }: { name: AdminNavIcon }) {
  const icons: Record<AdminNavIcon, JSX.Element> = {
    dashboard: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />,
    users: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />,
    jobs: <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />,
    audit: <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />,
    settings: <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />,
    profile: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />,
    logout: <path d="m17 7-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      {icons[name]}
    </svg>
  );
}

interface AdminSidebarProps {
  activePath?: string;
  adminName?: string;
}

export default function AdminSidebar({
  activePath = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "/admin-dashboard",
  adminName = "Administrator",
}: AdminSidebarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const navItems = [
    { label: "Overview", icon: "dashboard" as AdminNavIcon, href: "/admin-dashboard" },
    { label: "Applicant Management", icon: "users" as AdminNavIcon, href: "/admin-applicants" },
    { label: "Applicant Analytics", icon: "audit" as AdminNavIcon, href: "/admin-applicant-analytics" },
    { label: "Employer Management", icon: "jobs" as AdminNavIcon, href: "/admin-employers" },
    { label: "Employer Analytics", icon: "settings" as AdminNavIcon, href: "/admin-employer-analytics" },
  ];

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <aside className="appdash-sidebar admindash-sidebar" aria-label="Admin Navigation">
      {/* Brand Header */}
      <a href="/admin-dashboard" className="appdash-brand">
        <strong>ELITECRUIT</strong>
        <span>ADMIN PORTAL</span>
      </a>

      {/* Direct Navigation Links (Workspace accordion removed) */}
      <ul className="appdash-secondary-list admindash-nav-list">
        {navItems.map((item) => {
          const isActive = activePath === item.href.toLowerCase();
          return (
            <li key={item.label} className={isActive ? "active" : ""}>
              <a href={item.href}>
                <span className="item-icon">
                  <AdminNavIconSvg name={item.icon} />
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>

      {/* Secondary Nav List (Empty for now) */}
      <ul className="appdash-secondary-list">
        {/* Ready for future secondary admin navigation */}
      </ul>

      {/* Profile Control at Bottom (Matches Applicant / Employer Anchor & Popover) */}
      <div className="appdash-profile-control">
        <button
          type="button"
          className="appdash-profile-anchor"
          onClick={() => setIsProfileMenuOpen((val) => !val)}
          aria-expanded={isProfileMenuOpen}
        >
          <span className="item-icon">
            <AdminNavIconSvg name="profile" />
          </span>
          <span className="profile-user-copy">
            <strong>{adminName}</strong>
            <small>Administrator</small>
          </span>
        </button>

        {isProfileMenuOpen && (
          <div className="appdash-profile-menu">
            <button
              type="button"
              className="appdash-profile-menu-btn"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              <AdminNavIconSvg name="logout" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* DOUBLE VERIFICATION: ADMIN LOGOUT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        type="warning"
        title="Log Out of Admin Portal"
        message="Are you sure you want to end your administrator session?"
        cancelLabel="Stay Signed In"
        confirmLabel="Log Out"
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </aside>
  );
}
