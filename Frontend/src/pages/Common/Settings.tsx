import React, { useState, useEffect } from "react";
import ApplicantSidebar from "../../components/ApplicantSidebar";
import EmployerSidebar from "../../components/EmployerSidebar";
import AdminSidebar from "../../components/AdminSidebar";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import EmployerChatbotDrawer from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import { getStoredUser } from "../../utils/auth";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "../../data/legalContent";
import "./Settings.css";

type SettingsView = "menu" | "password" | "theme" | "about" | "terms" | "privacy";
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

  // Password mode: "change" (standard) or "reset" (in-page OTP reset)
  const [passwordMode, setPasswordMode] = useState<"change" | "reset">("change");
  const [resetStep, setResetStep] = useState<"request" | "verify" | "set_new">("request");
  const [resetEmail, setResetEmail] = useState(user?.email || "");
  const [resetMaskedEmail, setResetMaskedEmail] = useState("");
  const [resetDevCode, setResetDevCode] = useState("");
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetCooldown, setResetCooldown] = useState(0);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [isVerifyingReset, setIsVerifyingReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

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

  // Validation rules for changing password
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = Boolean(currentPassword) && hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  // Validation rules for resetting password
  const resetHasMinLength = resetNewPassword.length >= 8;
  const resetHasUppercase = /[A-Z]/.test(resetNewPassword);
  const resetHasLowercase = /[a-z]/.test(resetNewPassword);
  const resetHasNumber = /\d/.test(resetNewPassword);
  const resetPasswordsMatch = resetNewPassword.length > 0 && resetNewPassword === resetConfirmPassword;
  const isResetFormValid = resetHasMinLength && resetHasUppercase && resetHasLowercase && resetHasNumber && resetPasswordsMatch;

  const handleRequestResetCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetMessage(null);
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setResetMessage({ text: "Please enter a valid registered email address.", type: "error" });
      return;
    }

    setIsRequestingReset(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetMessage({ text: data?.message || "Unable to send password reset code.", type: "error" });
        if (data?.retryAfter) setResetCooldown(data.retryAfter);
        return;
      }
      setResetMaskedEmail(data.maskedEmail || cleanEmail);
      setResetDevCode(data.devCode || "");
      setResetOtpCode("");
      setResetCooldown(45);
      setResetStep("verify");
      setResetMessage({ text: data.message || "A 6-digit password reset code has been sent to your email.", type: "success" });
    } catch {
      setResetMessage({ text: "Unable to connect to server. Please try again.", type: "error" });
    } finally {
      setIsRequestingReset(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    const cleanCode = resetOtpCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setResetMessage({ text: "Please enter the complete 6-digit reset code.", type: "error" });
      return;
    }

    setIsVerifyingReset(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim(), code: cleanCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetMessage({ text: data?.message || "Invalid reset code.", type: "error" });
        return;
      }
      setResetToken(data.resetToken || "");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setResetStep("set_new");
      setResetMessage({ text: "Code verified! Please create your new password below.", type: "success" });
    } catch {
      setResetMessage({ text: "Unable to connect to server. Please try again.", type: "error" });
    } finally {
      setIsVerifyingReset(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);

    if (!isResetFormValid) {
      setResetMessage({
        text: "Please satisfy all new password requirements (at least 8 characters, uppercase, lowercase, number, and matching).",
        type: "error",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword: resetNewPassword,
          confirmPassword: resetConfirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetMessage({ text: data?.message || "Failed to reset password.", type: "error" });
        return;
      }
      setPasswordMessage({
        text: "Your password has been successfully reset! You can now use your new password.",
        type: "success",
      });
      setPasswordMode("change");
      setResetStep("request");
      setResetOtpCode("");
      setResetToken("");
      setResetNewPassword("");
      setResetConfirmPassword("");
    } catch {
      setResetMessage({ text: "Unable to connect to server. Please try again.", type: "error" });
    } finally {
      setIsResettingPassword(false);
    }
  };

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

      setPasswordMessage({
        text: data.message || "Password changed successfully! A confirmation email has been sent to your inbox.",
        type: "success",
      });
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

                {/* 4. Terms of Service (Task 5.3) */}
                <button
                  type="button"
                  className="account-menu-item"
                  onClick={() => setView("terms")}
                >
                  <div className="account-menu-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div className="account-menu-text">
                    <strong>Terms of Service</strong>
                    <span>Platform rules, user responsibilities, and legal agreements.</span>
                  </div>
                  <div className="account-menu-chevron">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </button>

                {/* 5. Privacy Policy (Task 5.3) */}
                <button
                  type="button"
                  className="account-menu-item"
                  onClick={() => setView("privacy")}
                >
                  <div className="account-menu-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </div>
                  <div className="account-menu-text">
                    <strong>Privacy Policy</strong>
                    <span>Data protection protocols and Data Privacy Act (RA 10173) compliance.</span>
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
              SUB-VIEW 2: CHANGE OR RESET YOUR PASSWORD
              ================================================================= */}
          {view === "password" && (
            <div>
              <div className="subview-header">
                <button
                  type="button"
                  className="subview-back-btn"
                  onClick={() => {
                    if (passwordMode === "reset") {
                      setPasswordMode("change");
                      setResetStep("request");
                      setResetMessage(null);
                    } else {
                      setView("menu");
                    }
                  }}
                  title="Back"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <h2 className="subview-header-title">
                  {passwordMode === "reset" ? "Reset your password" : "Change your password"}
                </h2>
              </div>

              {passwordMode === "change" ? (
                <>
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
                      <button
                        type="button"
                        onClick={() => {
                          const stored = getStoredUser<{ email?: string }>();
                          setResetEmail(stored?.email || user?.email || "");
                          setPasswordMode("reset");
                          setResetStep("request");
                          setResetMessage(null);
                          setPasswordMessage(null);
                        }}
                        className="x-forgot-password-link"
                        style={{ background: "none", border: "none", padding: 0, textAlign: "left" }}
                      >
                        Forgot password?
                      </button>
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
                </>
              ) : (
                /* INLINE ATTACHED RESET PASSWORD FLOW */
                <div className="x-reset-flow-container">
                  {resetMessage && (
                    <div className={`x-alert-banner ${resetMessage.type}`}>
                      {resetMessage.text}
                    </div>
                  )}

                  {resetStep === "request" && (
                    <form onSubmit={handleRequestResetCode}>
                      <p className="x-info-notice">
                        To reset your forgotten password, verify your registered email address below. We will send a secure 6-digit OTP code to verify your identity.
                      </p>
                      <div className="x-form-group">
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                          Registered Email Address
                        </label>
                        <input
                          type="email"
                          className="x-input-box"
                          placeholder="name@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="x-form-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          type="button"
                          className="x-forgot-password-link"
                          style={{ background: "none", border: "none", padding: 0 }}
                          onClick={() => {
                            setPasswordMode("change");
                            setResetMessage(null);
                          }}
                        >
                          ← I remember my password
                        </button>
                        <button
                          type="submit"
                          className="x-save-pill-btn"
                          disabled={isRequestingReset || !resetEmail.trim() || !resetEmail.includes("@") || resetCooldown > 0}
                        >
                          {isRequestingReset ? "Sending code..." : resetCooldown > 0 ? `Wait ${resetCooldown}s` : "Send Code"}
                        </button>
                      </div>
                    </form>
                  )}

                  {resetStep === "verify" && (
                    <form onSubmit={handleVerifyResetCode}>
                      <p className="x-info-notice">
                        Enter the 6-digit verification code sent to <strong>{resetMaskedEmail || resetEmail}</strong>.
                      </p>

                      {resetDevCode && (
                        <div style={{ marginBottom: "12px", padding: "8px 12px", background: "#fef3c7", border: "1px solid #fde047", borderRadius: "8px", fontSize: "0.82rem", color: "#92400e" }}>
                          🛠️ <strong>Development Hint:</strong> Use verification code <strong>{resetDevCode}</strong>
                        </div>
                      )}

                      <div className="x-form-group">
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                          6-Digit Verification Code
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="x-input-box x-otp-code-input"
                          placeholder="123456"
                          maxLength={6}
                          value={resetOtpCode}
                          onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ""))}
                          required
                          autoFocus
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                          <span style={{ fontSize: "13px", color: "#64748b" }}>
                            Didn't receive the code?
                          </span>
                          <button
                            type="button"
                            className="x-forgot-password-link"
                            style={{ background: "none", border: "none", padding: 0, cursor: resetCooldown > 0 ? "default" : "pointer", opacity: resetCooldown > 0 ? 0.6 : 1 }}
                            onClick={() => handleRequestResetCode()}
                            disabled={resetCooldown > 0 || isRequestingReset}
                          >
                            {resetCooldown > 0 ? `Resend code (${resetCooldown}s)` : "Resend code"}
                          </button>
                        </div>
                      </div>

                      <div className="x-form-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          type="button"
                          className="x-forgot-password-link"
                          style={{ background: "none", border: "none", padding: 0 }}
                          onClick={() => setResetStep("request")}
                        >
                          ← Change email
                        </button>
                        <button
                          type="submit"
                          className="x-save-pill-btn"
                          disabled={isVerifyingReset || resetOtpCode.length !== 6}
                        >
                          {isVerifyingReset ? "Verifying..." : "Verify Code"}
                        </button>
                      </div>
                    </form>
                  )}

                  {resetStep === "set_new" && (
                    <form onSubmit={handleResetPasswordSubmit}>
                      <p className="x-info-notice">
                        Code verified! Please create and confirm your new password below.
                      </p>

                      <div className="x-form-group">
                        <input
                          type="password"
                          className="x-input-box"
                          placeholder="New password"
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      <div className="x-form-group">
                        <input
                          type="password"
                          className="x-input-box"
                          placeholder="Confirm new password"
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          required
                        />
                      </div>

                      {resetNewPassword.length > 0 && (
                        <div className="x-password-rules">
                          <div className={`x-rule-item ${resetHasMinLength ? "valid" : ""}`}>
                            {resetHasMinLength ? "✓" : "○"} At least 8 characters
                          </div>
                          <div className={`x-rule-item ${resetHasUppercase ? "valid" : ""}`}>
                            {resetHasUppercase ? "✓" : "○"} At least one uppercase letter (A-Z)
                          </div>
                          <div className={`x-rule-item ${resetHasLowercase ? "valid" : ""}`}>
                            {resetHasLowercase ? "✓" : "○"} At least one lowercase letter (a-z)
                          </div>
                          <div className={`x-rule-item ${resetHasNumber ? "valid" : ""}`}>
                            {resetHasNumber ? "✓" : "○"} At least one number (0-9)
                          </div>
                          <div className={`x-rule-item ${resetPasswordsMatch ? "valid" : ""}`}>
                            {resetPasswordsMatch ? "✓" : "○"} Passwords match
                          </div>
                        </div>
                      )}

                      <div className="x-form-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          type="button"
                          className="x-forgot-password-link"
                          style={{ background: "none", border: "none", padding: 0 }}
                          onClick={() => {
                            setPasswordMode("change");
                            setResetStep("request");
                            setResetMessage(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="x-save-pill-btn"
                          disabled={isResettingPassword || !isResetFormValid}
                        >
                          {isResettingPassword ? "Resetting..." : "Reset Password"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
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
                    <td>zakiablando897@gmail.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================================
              SUB-VIEW 4: TERMS OF SERVICE (Task 5.3)
              ================================================================= */}
          {view === "terms" && (
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
                <h2 className="subview-header-title">{TERMS_OF_SERVICE.title}</h2>
              </div>

              <p className="settings-heading-sub">
                {TERMS_OF_SERVICE.subtitle} • Last updated {TERMS_OF_SERVICE.lastUpdated}
              </p>

              <div className="settings-legal-list">
                {TERMS_OF_SERVICE.sections.map((sec, idx) => (
                  <div key={idx} className="settings-legal-item">
                    <h4>{sec.title}</h4>
                    {sec.content.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              SUB-VIEW 5: PRIVACY POLICY (Task 5.3)
              ================================================================= */}
          {view === "privacy" && (
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
                <h2 className="subview-header-title">{PRIVACY_POLICY.title}</h2>
              </div>

              <p className="settings-heading-sub">
                {PRIVACY_POLICY.subtitle} • Last updated {PRIVACY_POLICY.lastUpdated}
              </p>

              <div className="settings-legal-list">
                {PRIVACY_POLICY.sections.map((sec, idx) => (
                  <div key={idx} className="settings-legal-item">
                    <h4>{sec.title}</h4>
                    {sec.content.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
