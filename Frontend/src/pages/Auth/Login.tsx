import React, { useState } from "react";
import "./Login.css";

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
  const [role, setRole] = useState<"applicant" | "employer">("applicant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const isApplicant = role === "applicant";

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
          role,
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
      localStorage.setItem("elitecruit-user", JSON.stringify(normalizedUser));

      if (normalizedUser?.role === "applicant") {
        window.location.href = "/applicant-dashboard#applicant-overview";
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
        <form
          className={`login-card ${isApplicant ? "applicant-card" : "employer-card"}`}
          onSubmit={handleSubmit}
          noValidate
        >
          <p className="login-kicker">Login As</p>
          <div className="role-switch" role="tablist" aria-label="Role switch">
            <button
              type="button"
              className={`role-switch-btn ${isApplicant ? "active" : ""}`}
              onClick={() => setRole("applicant")}
              aria-pressed={isApplicant}
            >
              Applicant
            </button>
            <button
              type="button"
              className={`role-switch-btn ${!isApplicant ? "active" : ""}`}
              onClick={() => setRole("employer")}
              aria-pressed={!isApplicant}
            >
              Employer
            </button>
          </div>
          <p className="login-sub">
            Sign in to continue to the workspace selected from the role page.
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

        <p className="region-note">For Cavite Region | Recruitment Platform</p>
      </section>
    </div>
  );
}
