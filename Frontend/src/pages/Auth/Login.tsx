import React, { useState, useEffect } from "react";
import "./Login.css";
import { setAuthToken, setStoredUser } from "../../utils/auth";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5c-5.2 0-9.2 3.3-10.8 7 1.6 3.7 5.6 7 10.8 7s9.2-3.3 10.8-7C21.2 8.3 17.2 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 4.3 1.4-1.4 16.3 16.3-1.4 1.4-2.4-2.4a12.8 12.8 0 0 1-4.9.8C6.8 19 2.8 15.7 1.2 12a12.3 12.3 0 0 1 4.3-5.2L3 4.3Zm5.3 5.3A4 4 0 0 0 12 16c.7 0 1.3-.2 1.9-.5l-1.6-1.6c-.1.1-.2.1-.3.1a2 2 0 0 1-2-2c0-.1 0-.2.1-.3L8.3 9.6Zm7.3 5.9-1.5-1.5c0-.1.1-.3.1-.5a2 2 0 0 0-2-2c-.2 0-.4 0-.5.1l-1.5-1.5A4 4 0 0 1 16 12c0 1.3-.2 2.4-.4 3.5Zm2.4-2.4L16.7 12c0-2.6-2.1-4.7-4.7-4.7L9.2 4.5A12.4 12.4 0 0 1 12 5c5.2 0 9.2 3.3 10.8 7a12.3 12.3 0 0 1-4.8 5.1Z" />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA Verification States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [submitError, setSubmitError] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auth") === "required") {
        return "Please log in to access this page.";
      }
      if (params.get("session") === "expired") {
        return "Your session has expired. Please log in again.";
      }
    }
    return "";
  });
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!email.trim()) {
      setSubmitError("Email is required.");
      return;
    }

    if (!password) {
      setSubmitError("Password is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data?.message ?? "Login failed.");
        return;
      }

      // Check if 2FA code is required
      if (data?.mfaRequired) {
        setMfaRequired(true);
        setTempToken(data.tempToken || "");
        setMaskedEmail(data.maskedEmail || email);
        setDevCode(data.devCode || "");
        setResendCooldown(45);
        setOtpCode("");
        setSubmitError("");
        setSubmitSuccess("Security code sent. Please check your inbox.");
        return;
      }

      const normalizedUser = {
        ...data.user,
        businessName:
          data?.user?.businessName ||
          data?.user?.business_name ||
          data?.user?.companyName ||
          null,
      };

      setSubmitSuccess(`Welcome back, ${normalizedUser.email}.`);
      setPassword("");
      setStoredUser(normalizedUser);
      if (data?.token) {
        setAuthToken(data.token);
      }

      if (normalizedUser?.role === "applicant") {
        window.location.href = "/applicant-dashboard#section-smart-matches";
      } else if (normalizedUser?.role === "employer") {
        window.location.href = "/employer-dashboard";
      } else if (normalizedUser?.role === "admin") {
        window.location.href = "/admin-dashboard";
      }
    } catch {
      setSubmitError("Unable to connect to server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    const clean = otpCode.replace(/\D/g, "");
    if (clean.length !== 6) {
      setSubmitError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tempToken,
          code: clean,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data?.message ?? "Verification failed.");
        return;
      }

      const normalizedUser = {
        ...data.user,
        businessName:
          data?.user?.businessName ||
          data?.user?.business_name ||
          data?.user?.companyName ||
          null,
      };

      setSubmitSuccess(`Verification successful! Welcome back, ${normalizedUser.email}.`);
      setPassword("");
      setStoredUser(normalizedUser);
      if (data?.token) {
        setAuthToken(data.token);
      }

      if (normalizedUser?.role === "applicant") {
        window.location.href = "/applicant-dashboard#section-smart-matches";
      } else if (normalizedUser?.role === "employer") {
        window.location.href = "/employer-dashboard";
      } else if (normalizedUser?.role === "admin") {
        window.location.href = "/admin-dashboard";
      }
    } catch {
      setSubmitError("Unable to connect to server. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend2FA = async () => {
    if (resendCooldown > 0 || isResending || !tempToken) return;

    setIsResending(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/auth/resend-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tempToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data?.message ?? "Failed to resend verification code.");
        if (data?.retryAfter) {
          setResendCooldown(data.retryAfter);
        }
        return;
      }

      setSubmitSuccess(data?.message ?? "A fresh verification code has been sent to your email.");
      if (data?.devCode) {
        setDevCode(data.devCode);
      }
      setResendCooldown(45);
    } catch {
      setSubmitError("Unable to reach the server. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    setMfaRequired(false);
    setTempToken("");
    setOtpCode("");
    setDevCode("");
    setSubmitError("");
    setSubmitSuccess("");
    setResendCooldown(0);
  };

  return (
    <div className="login-page">
      <section className="login-left" aria-label="Workspace Overview">
        <div className="login-left-overlay" />

        <a className="login-brand-card" href="/" aria-label="Go to homepage">
          <span className="ec-tile">EC</span>
          <div className="login-brand-text">
            <strong>EliteCruit</strong>
            <span>Digital Recruitment Platform</span>
          </div>
        </a>

        <div className="login-left-copy">
          <span className="login-badge">Cavite Hiring Workspace</span>
          <h1>Get back to the work that moves hiring forward.</h1>
          <p>
            Search opportunities, manage applicants, track applications, and keep
            applicant documents organized in one polished workflow.
          </p>

          <div className="role-mini-grid">
            <article className="role-mini-card">
              <span className="mini-icon" aria-hidden="true">
                <img src="/logos/applicant-documents.svg" alt="" loading="lazy" />
              </span>
              <small>Candidates</small>
              <strong>Profile-ready</strong>
            </article>
            <article className="role-mini-card">
              <span className="mini-icon" aria-hidden="true">
                <img src="/logos/top-rated-companies.svg" alt="" loading="lazy" />
              </span>
              <small>Employers</small>
              <strong>Queue-focused</strong>
            </article>
            <article className="role-mini-card">
              <span className="mini-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2 5 5v6c0 5.5 3.9 9.9 7 11 3.1-1.1 7-5.5 7-11V5l-7-3Zm0 3.1 4.5 1.9V11c0 3.9-2.6 7.2-4.5 8.1-1.9-.9-4.5-4.2-4.5-8.1V7l4.5-1.9Zm0 2.9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                </svg>
              </span>
              <small>Admins</small>
              <strong>Governed</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="login-right" aria-label="Secure Sign In">
        {mfaRequired ? (
          <form
            className="login-card mfa-card"
            onSubmit={handleVerify2FA}
            noValidate
          >
            <div className="mfa-header">
              <div className="mfa-icon-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h2 className="login-title">Two-Factor Security</h2>
              <p className="login-sub">
                We sent a 6-digit verification code to{" "}
                <strong className="mfa-highlight-email">{maskedEmail}</strong>.
                Enter the code below to complete your sign in.
              </p>
            </div>

            {devCode && (
              <div className="dev-otp-callout" role="note" aria-label="Development verification code">
                <div className="dev-otp-header">
                  <span className="dev-otp-badge">DEV ENVIRONMENT</span>
                  <span className="dev-otp-note">Code logged to console</span>
                </div>
                <div className="dev-otp-code-display">{devCode}</div>
              </div>
            )}

            <div className="mfa-code-group">
              <label className="field-label" htmlFor="otpCode">
                6-Digit Security Code
              </label>
              <div className="mfa-input-container">
                <input
                  id="otpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mfa-digit-input"
                  autoFocus
                />
              </div>
              <span className="mfa-hint-text">The verification code will expire in 10 minutes.</span>
            </div>

            {submitError && <p className="login-message login-error">{submitError}</p>}
            {submitSuccess && <p className="login-message login-success">{submitSuccess}</p>}

            <button
              className="login-submit mfa-submit-btn"
              type="submit"
              disabled={isVerifying || otpCode.replace(/\D/g, "").length !== 6}
            >
              {isVerifying ? "Verifying..." : "Verify & Sign In"}
            </button>

            <div className="mfa-footer-actions">
              <button
                type="button"
                className="mfa-resend-btn"
                onClick={handleResend2FA}
                disabled={resendCooldown > 0 || isResending}
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : isResending
                  ? "Sending new code..."
                  : "Resend Code"}
              </button>

              <button
                type="button"
                className="mfa-back-link"
                onClick={handleBackToLogin}
              >
                ← Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form
            className="login-card"
            onSubmit={handleSubmit}
            noValidate
          >
            <h2 className="login-title">Login</h2>
            <p className="login-sub">
              Sign in to continue to your EliteCruit account.
            </p>

            <label className="field-label" htmlFor="email">
              Email
            </label>
            <div className="input-row">
              <span className="input-icon input-icon-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="4" y="6" width="16" height="12" rx="2" ry="2" />
                  <path d="M5 8l7 5 7-5" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <label className="field-label" htmlFor="password">
              Password
            </label>
            <div className="input-row">
              <span className="input-icon input-icon-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="6.5" y="10" width="11" height="9" rx="1.8" ry="1.8" />
                  <path d="M9 10V7.8a3 3 0 1 1 6 0V10" />
                  <circle cx="12" cy="14.5" r="0.9" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="peek-btn"
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <div className="auth-row">
              <label className="remember-row">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a href="/login">Forgot password?</a>
            </div>

            {submitError && <p className="login-message login-error">{submitError}</p>}
            {submitSuccess && <p className="login-message login-success">{submitSuccess}</p>}

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Login"}
            </button>

            <p className="signup-text">
              Don&apos;t have an account? <a href="/create-account">Sign up</a>
            </p>
          </form>
        )}

        <p className="region-note">For Cavite Region | Recruitment Platform</p>
      </section>
    </div>
  );
}
