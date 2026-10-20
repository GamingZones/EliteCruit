import React, { useState, useEffect } from "react";
import ApplicantSidebar from "../../components/ApplicantSidebar";
import EmployerSidebar from "../../components/EmployerSidebar";
import AdminSidebar from "../../components/AdminSidebar";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import EmployerChatbotDrawer from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import { getStoredUser } from "../../utils/auth";
import "./Settings.css";

type SettingsView = "menu" | "password" | "theme" | "about";
type ThemeMode = "light" | "dark" | "system";

export default function Settings() {
  const user = getStoredUser<{ id: number; role: "applicant" | "employer" | "admin"; email: string }>();
  const role = user?.role || "applicant";

  const [view, setView] = useState<SettingsView>("menu");
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem("elitecruit-theme") as ThemeMode) || "light";
  });

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Apply theme dynamically
  const applyTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem("elitecruit-theme", mode);
    if (mode === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (mode === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    }
    window.dispatchEvent(new Event("elitecruit-theme-change"));
  };

  useEffect(() => {
    const saved = (localStorage.getItem("elitecruit-theme") as ThemeMode) || "light";
    applyTheme(saved);
  }, []);

  // Validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = Boolean(currentPassword) && hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ text: "Please enter your current password.", type: "error" });
      return;
    }

    if (!isFormValid) {
      setPasswordMessage({
        text: "Please satisfy all new password requirements (at least 8 characters, uppercase, lowercase, and a number).",
        type: "error",
      });
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to change password.");
      }

      setPasswordMessage({ text: "Password changed successfully!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMessage({
        text: err instanceof Error ? err.message : "Failed to update password.",
        type: "error",
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="appdash-page sidebar-visible settings-page-shell">
      {/* Role-Specific Sidebar */}
      {role === "admin" && <AdminSidebar activePath="/settings" />}
      {role === "employer" && <EmployerSidebar activePath="/settings" />}
      {role === "applicant" && <ApplicantSidebar activePath="/settings" />}

      {/* Main Surface */}
      <main className="appdash-main settings-main-content">
        {/* Standard Topbar matching Dashboard / Feedback */}
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>Settings</strong>
            </div>
          </div>
          <div className="appdash-top-right">
            {role === "applicant" && (
              <div className="chatbot-wrapper">
                <ApplicantChatbotDrawer
                  isOpen={isChatbotOpen}
                  onToggle={() => setIsChatbotOpen((prev) => !prev)}
                  pageTitle="Settings"
                />
              </div>
            )}
            {role === "employer" && (
              <div className="chatbot-wrapper">
                <EmployerChatbotDrawer
                  isOpen={isChatbotOpen}
                  onToggle={() => setIsChatbotOpen((prev) => !prev)}
                  pageTitle="Settings"
                />
              </div>
            )}
            <CalendarDrawer />
          </div>
        </header>

        {/* Content Body Inside Card */}
        <div className="settings-content-card">
          {/* =================================================================
              MAIN MENU: THE 3 SPECIFIED SETTINGS OPTIONS
              ================================================================= */}
          {view === "menu" && (
            <div>
              <h1 className="settings-heading-title">Settings</h1>
              <p className="settings-heading-sub">
                Manage your visual appearance, account security, and review platform specifications.
              </p>

              <div className="account-menu-list">
                {/* 1. Theme / Appearance */}
                <button
                  type="button"
                  className="account-menu-item"
                  onClick={() => setView("theme")}
                >
                  <div className="account-menu-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  </div>
                  <div className="account-menu-text">
                    <strong>Theme / Appearance</strong>
                    <span>Choose how EliteCruit looks on your screen like light, dark, or system mode.</span>
                  </div>
                  <div className="account-menu-chevron">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </button>

                {/* 2. Change your password */}
                <button
                  type="button"
                  className="account-menu-item"
                  onClick={() => {
                    setPasswordMessage(null);
                    setView("password");
                  }}
                >
                  <div className="account-menu-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7.5" cy="15.5" r="5.5"></circle>
                      <path d="m21 2-9.6 9.6"></path>
                      <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
                    </svg>
                  </div>
                  <div className="account-menu-text">
                    <strong>Change your password</strong>
                    <span>Change your password at any time.</span>
                  </div>
                  <div className="account-menu-chevron">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </button>

                {/* 3. About EliteCruit */}
                <button
                  type="button"
                  className="account-menu-item"
                  onClick={() => setView("about")}
                >
                  <div className="account-menu-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </div>
                  <div className="account-menu-text">
                    <strong>About EliteCruit</strong>
                    <span>Platform information, system specifications, and support contacts.</span>
                  </div>
                  <div className="account-menu-chevron">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              SUB-VIEW 1: THEME / APPEARANCE
              ================================================================= */}
          {view === "theme" && (
            <div>
              <div className="subview-header">
                <button
                  type="button"
                  className="subview-back-btn"
                  onClick={() => setView("menu")}
                  title="Back"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <h2 className="subview-header-title">Theme / Appearance</h2>
              </div>

              <p className="settings-heading-sub">
                Choose your preferred visual mode. Your selection is automatically applied and saved across sessions.
              </p>

              <div className="theme-options-grid">
                {/* Light Mode */}
                <div
                  className={`theme-option-box ${themeMode === "light" ? "selected" : ""}`}
                  onClick={() => applyTheme("light")}
                >
                  <div className="theme-preview-block theme-preview-light"></div>
                  <div className="theme-option-label">
                    <span>☀️ Light (Default)</span>
                    {themeMode === "light" && <span style={{ color: "#0284c7" }}>✓</span>}
                  </div>
                </div>

                {/* Dark Mode */}
                <div
                  className={`theme-option-box ${themeMode === "dark" ? "selected" : ""}`}
                  onClick={() => applyTheme("dark")}
                >
                  <div className="theme-preview-block theme-preview-dark"></div>
                  <div className="theme-option-label">
                    <span>🌙 Dark Mode</span>
                    {themeMode === "dark" && <span style={{ color: "#38bdf8" }}>✓</span>}
                  </div>
                </div>

                {/* System Match */}
                <div
                  className={`theme-option-box ${themeMode === "system" ? "selected" : ""}`}
                  onClick={() => applyTheme("system")}
                >
                  <div className="theme-preview-block theme-preview-system"></div>
                  <div className="theme-option-label">
                    <span>🖥️ System Match</span>
                    {themeMode === "system" && <span style={{ color: "#0284c7" }}>✓</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              SUB-VIEW 2: CHANGE YOUR PASSWORD
              ================================================================= */}
          {view === "password" && (
            <div>
              <div className="subview-header">
                <button
                  type="button"
                  className="subview-back-btn"
                  onClick={() => setView("menu")}
                  title="Back"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <h2 className="subview-header-title">Change your password</h2>
              </div>

              {passwordMessage && (
                <div className={`x-alert-banner ${passwordMessage.type}`}>
                  {passwordMessage.text}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit}>
                {/* Current Password Field */}
                <div className="x-form-group">
                  <input
                    type="password"
                    className="x-input-box"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <a
                    href="/login"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("To reset a forgotten password, please use the OTP verification flow on the Login screen.");
                    }}
                    className="x-forgot-password-link"
                  >
                    Forgot password?
                  </a>
                </div>

                <hr className="x-form-divider" />

                {/* New Password Field */}
                <div className="x-form-group">
                  <input
                    type="password"
                    className="x-input-box"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Confirm Password Field */}
                <div className="x-form-group">
                  <input
                    type="password"
                    className="x-input-box"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Password requirements */}
                {newPassword.length > 0 && (
                  <div className="x-password-rules">
                    <div className={`x-rule-item ${hasMinLength ? "valid" : ""}`}>
                      {hasMinLength ? "✓" : "○"} At least 8 characters
                    </div>
                    <div className={`x-rule-item ${hasUppercase ? "valid" : ""}`}>
                      {hasUppercase ? "✓" : "○"} At least one uppercase letter (A-Z)
                    </div>
                    <div className={`x-rule-item ${hasLowercase ? "valid" : ""}`}>
                      {hasLowercase ? "✓" : "○"} At least one lowercase letter (a-z)
                    </div>
                    <div className={`x-rule-item ${hasNumber ? "valid" : ""}`}>
                      {hasNumber ? "✓" : "○"} At least one number (0-9)
                    </div>
                    <div className={`x-rule-item ${passwordsMatch ? "valid" : ""}`}>
                      {passwordsMatch ? "✓" : "○"} Passwords match
                    </div>
                  </div>
                )}

                {/* Information Notice */}
                <p className="x-info-notice">
                  Changing your password will update your credentials across all your active EliteCruit sessions except the one you're using at this time. The active applications with access to your account won't be affected. <a href="#" onClick={(e) => e.preventDefault()}>Learn more</a>
                </p>

                {/* Footer with Pill Save Button */}
                <div className="x-form-footer">
                  <button
                    type="submit"
                    className="x-save-pill-btn"
                    disabled={isSubmittingPassword || !isFormValid}
                  >
                    {isSubmittingPassword ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =================================================================
              SUB-VIEW 3: ABOUT ELITECRUIT
              ================================================================= */}
          {view === "about" && (
            <div>
              <div className="subview-header">
                <button
                  type="button"
                  className="subview-back-btn"
                  onClick={() => setView("menu")}
                  title="Back"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <h2 className="subview-header-title">About EliteCruit</h2>
              </div>

              <p className="settings-heading-sub">
                EliteCruit Recruitment Platform • Version 2.4.0 (Production 2026)
              </p>

              <table className="x-info-table">
                <tbody>
                  <tr>
                    <td>Architecture</td>
                    <td>React 18 SPA + Node/Express REST API</td>
                  </tr>
                  <tr>
                    <td>Cloud Database</td>
                    <td>Supabase PostgreSQL 17 (Singapore)</td>
                  </tr>
                  <tr>
                    <td>Geographic Matching</td>
                    <td>Cavite Municipal Distance Matrix (No GPS Pinpoint Required)</td>
                  </tr>
                  <tr>
                    <td>Authentication</td>
                    <td>Stateless JWT + Brevo OTP 2FA</td>
                  </tr>
                  <tr>
                    <td>Support Contact</td>
                    <td>support@elitecruit.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
