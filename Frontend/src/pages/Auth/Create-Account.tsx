import React, { useState, useEffect } from "react";
import { ALL_PHILIPPINES_PROVINCES, getCitiesByProvince } from "../../utils/filters";
import "./Create-Account.css";

export default function CreateAccount() {
  const [role, setRole] = useState("applicant");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Email OTP Verification Modal States
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpCodeInput, setOtpCodeInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    province: "Cavite",
    city: "Alfonso",
    phone: "",
    businessName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const cleanCurrentEmail = formData.email.trim().toLowerCase();
  const isEmailVerified = Boolean(cleanCurrentEmail && verifiedEmail === cleanCurrentEmail);

  const hasMinLength = formData.password.length >= 8;
  const hasUppercase = /[A-Z]/.test(formData.password);
  const hasLowercase = /[a-z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);

  const getPasswordStrength = () => {
    const checks = [hasMinLength, hasUppercase, hasLowercase, hasNumber];
    const passedChecks = checks.filter(Boolean).length;
    if (passedChecks <= 1) return "Weak";
    if (passedChecks <= 2) return "Fair";
    if (passedChecks === 3) return "Good";
    return "Strong";
  };

  const getStrengthColor = () => {
    const strength = getPasswordStrength();
    if (strength === "Weak") return "#d93025";
    if (strength === "Fair") return "#f9ab00";
    if (strength === "Good") return "#1b8f3d";
    return "#0d652d";
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value;
    const cities = getCitiesByProvince(newProv);
    setFormData((prev) => ({
      ...prev,
      province: newProv,
      city: cities[0] || "",
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setFormData((prev) => ({
      ...prev,
      phone: digits,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const isApplicant = role === "applicant";

  const handleSendEmailOtp = async () => {
    const targetEmail = formData.email.trim();
    setSubmitError("");
    setSubmitSuccess("");

    if (!targetEmail || !targetEmail.includes("@")) {
      setSubmitError("Please enter a valid email address before clicking Verify.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError("");
    setOtpDevHint(null);

    try {
      const displayName = isApplicant
        ? [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(" ")
        : formData.businessName.trim();

      const res = await fetch("/api/auth/send-registration-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          name: displayName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.message || "Failed to send verification code.");
        return;
      }

      if (data?.devCode) {
        setOtpDevHint(data.devCode);
      }
      setIsOtpModalOpen(true);
      setOtpCodeInput("");
      setOtpCooldown(45);
    } catch {
      setSubmitError("Unable to send verification code. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const targetEmail = formData.email.trim();
    const cleanCode = otpCodeInput.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");

    try {
      const res = await fetch("/api/auth/verify-registration-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          code: cleanCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data?.message || "Invalid verification code.");
        return;
      }

      setVerifiedEmail(targetEmail.toLowerCase());
      setIsOtpModalOpen(false);
      setSubmitError("");
      setSubmitSuccess("Email address verified!");
    } catch {
      setOtpError("Verification failed. Please check the code and try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!formData.email.trim()) {
      setSubmitError("Email is required.");
      return;
    }

    if (!isEmailVerified) {
      setSubmitError("Please verify your email address first by clicking the Verify button.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    if (getPasswordStrength() === "Weak") {
      setSubmitError("Password does not meet required strength.");
      return;
    }

    if (!agreeTerms) {
      setSubmitError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    if (isApplicant) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setSubmitError("First name and last name are required.");
        return;
      }
    } else if (!formData.businessName.trim()) {
      setSubmitError("Company Name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          province: formData.province,
          city: formData.city,
          phone: formData.phone,
          businessName: formData.businessName,
          agreeTerms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data?.message ?? "Registration failed.");
        return;
      }

      setSubmitSuccess("Account created successfully. You can now sign in.");
      setFormData({
        firstName: "",
        middleName: "",
        lastName: "",
        province: "Cavite",
        city: "Alfonso",
        phone: "",
        businessName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setVerifiedEmail("");
      setAgreeTerms(false);

      setTimeout(() => {
        window.location.href = "/login?verified=1";
      }, 900);
    } catch {
      setSubmitError("Unable to connect to server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-page">
      <section className="create-left">
        <div className="create-overlay" />

        <a href="/" className="brand-card">
          <span className="ec-tile">EC</span>

          <div className="brand-text">
            <strong>EliteCruit</strong>
            <span>Digital Recruitment Platform</span>
          </div>
        </a>

        <div className="left-content">
          <span className="badge">
            Philippine Recruitment Platform
          </span>

          <h1>Create your EliteCruit account.</h1>

          <p>
            Join the Philippine Digital Recruitment Platform.
            Whether you're searching for a job or hiring
            employees, create your account to begin.
          </p>

          <div className="feature-grid">

            <div className="feature-card">
              <div className="feature-icon">
                <img
                  src="/logos/applicant-documents.svg"
                  alt="Applicants"
                />
              </div>
              <h4>Applicants</h4>
              <small>Build your professional profile.</small>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <img
                  src="/logos/top-rated-companies.svg"
                  alt="Employers"
                />
              </div>
              <h4>Employers</h4>
              <small>Post jobs and manage applicants.</small>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <img
                  src="/logos/ats-resume-validation.svg"
                  alt="Secure"
                />
              </div>
              <h4>Secure</h4>
              <small>Protected accounts & verification.</small>
            </div>

          </div>
        </div>
      </section>

      <section className="create-right">

        <form className="create-card" onSubmit={handleSubmit}>

          <h2>Create Account</h2>

          <div className="role-switch">

            <button
              type="button"
              className={isApplicant ? "active" : ""}
              onClick={() => setRole("applicant")}
            >
              Applicant
            </button>

            <button
              type="button"
              className={!isApplicant ? "active" : ""}
              onClick={() => setRole("employer")}
            >
              Employer
            </button>

          </div>

          {isApplicant ? (
            <>
              <div className="name-row">
                <div className="form-field">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    required
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="middleName">Middle Name (Optional)</label>
                  <input
                    id="middleName"
                    name="middleName"
                    placeholder="Middle Name"
                    value={formData.middleName}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    required
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row two-col">
                <div className="form-field">
                  <label htmlFor="province">Province</label>
                  <select
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleProvinceChange}
                  >
                    {ALL_PHILIPPINES_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="city">City / Municipality</label>
                  <select
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  >
                    {getCitiesByProvince(formData.province).map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row two-col">
                <div className="form-field">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="input-prefix-box">
                    <span className="prefix-tag">+63</span>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      placeholder="09682944632"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="email">Email Address</label>
                  <div className="email-input-wrapper">
                    <input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="your@email.com"
                      required
                      value={formData.email}
                      onChange={handleChange}
                    />
                    {isEmailVerified ? (
                      <span className="email-verified-pill" title="Email address verified">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="email-verify-btn"
                        onClick={handleSendEmailOtp}
                        disabled={isSendingOtp}
                        title="Verify email address with OTP"
                      >
                        {isSendingOtp ? "Sending..." : "Verify"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-row one-col">
                <div className="form-field">
                  <label htmlFor="businessName">Company Name</label>
                  <input
                    id="businessName"
                    required
                    name="businessName"
                    placeholder="e.g. CEBUANA"
                    value={formData.businessName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row two-col">
                <div className="form-field">
                  <label htmlFor="employerEmail">Primary Business Email</label>
                  <div className="email-input-wrapper">
                    <input
                      id="employerEmail"
                      type="email"
                      name="email"
                      placeholder="company@example.com"
                      required
                      value={formData.email}
                      onChange={handleChange}
                    />
                    {isEmailVerified ? (
                      <span className="email-verified-pill" title="Email address verified">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="email-verify-btn"
                        onClick={handleSendEmailOtp}
                        disabled={isSendingOtp}
                        title="Verify email address with OTP"
                      >
                        {isSendingOtp ? "Sending..." : "Verify"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="employerPhone">Primary Contact Number</label>
                  <input
                    id="employerPhone"
                    type="tel"
                    name="phone"
                    placeholder="09682944632"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                  />
                </div>
              </div>

              <div className="form-row two-col">
                <div className="form-field">
                  <label htmlFor="employerProvince">Province</label>
                  <select
                    id="employerProvince"
                    name="province"
                    value={formData.province}
                    onChange={handleProvinceChange}
                  >
                    {ALL_PHILIPPINES_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="employerCity">City / Municipality</label>
                  <select
                    id="employerCity"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  >
                    {getCitiesByProvince(formData.province).map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <label>Password</label>

          <div className="password-box">

  <input
    type={showPassword ? "text" : "password"}
    name="password"
    placeholder="Enter Password"
    required
    value={formData.password}
    onChange={handleChange}
  />

  <button
    type="button"
    className="eye-btn"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? "👁️" : "👁"}
  </button>

</div>

          <div className="password-strength">
            <div className="strength-header">
              <span className="strength-label">PASSWORD STRENGTH</span>
              <span className="strength-value" style={{ color: getStrengthColor() }}>
                {getPasswordStrength()}
              </span>
            </div>
            <div className="strength-grid">
              <div className={`strength-item ${hasMinLength ? "valid" : "invalid"}`}>
                <span className="check-icon">{hasMinLength ? "●" : "◯"}</span>
                <span>Minimum Length</span>
              </div>
              <div className={`strength-item ${hasUppercase ? "valid" : "invalid"}`}>
                <span className="check-icon">{hasUppercase ? "●" : "◯"}</span>
                <span>Uppercase Letter</span>
              </div>
              <div className={`strength-item ${hasLowercase ? "valid" : "invalid"}`}>
                <span className="check-icon">{hasLowercase ? "●" : "◯"}</span>
                <span>Lowercase Letter</span>
              </div>
              <div className={`strength-item ${hasNumber ? "valid" : "invalid"}`}>
                <span className="check-icon">{hasNumber ? "●" : "◯"}</span>
                <span>Number</span>
              </div>
            </div>
          </div>

          <label>Confirm Password</label>

          <div className="password-box">

  <input
    type={showPassword ? "text" : "password"}
    name="confirmPassword"
    placeholder="Confirm Password"
    required
    value={formData.confirmPassword}
    onChange={handleChange}
  />

  <button
    type="button"
    className="eye-btn"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? "👁️" : "👁"}
  </button>

</div>

          {formData.confirmPassword &&
            formData.password !== formData.confirmPassword && (
              <p className="invalid">
                Passwords do not match.
              </p>
            )}

          <label className="terms-box">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span>
              I agree to the Terms of Service and Privacy Policy.
            </span>
          </label>

          {submitError && <p className="invalid submit-message">{submitError}</p>}
          {submitSuccess && <p className="valid submit-message">{submitSuccess}</p>}

          <button className="create-btn" type="submit" disabled={isSubmitting}>
            {isApplicant
              ? (isSubmitting ? "Creating Applicant Account..." : "Create Applicant Account")
              : (isSubmitting ? "Creating Employer Account..." : "Create Employer Account")}
          </button>

          <p className="signin-text">
            Already have an account?{" "}
            <a href="/login">Sign In</a>
          </p>

        </form>

      </section>

      {/* CENTERED EMAIL OTP VERIFICATION POPUP MODAL */}
      {isOtpModalOpen && (
        <div
          className="create-otp-modal-overlay"
          onClick={() => !isVerifyingOtp && setIsOtpModalOpen(false)}
        >
          <div className="create-otp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="create-otp-modal-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>

            <h3 className="create-otp-modal-title">Verify Email Address</h3>
            <p className="create-otp-modal-subtitle">
              A 6-digit OTP code has been sent to:
              <br />
              <strong>{formData.email.trim()}</strong>
            </p>

            <div className="create-otp-input-wrap">
              <input
                type="text"
                inputMode="numeric"
                className="create-otp-code-input"
                maxLength={6}
                value={otpCodeInput}
                autoFocus
                onChange={(e) => {
                  const numOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpCodeInput(numOnly);
                  if (otpError) setOtpError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && otpCodeInput.length === 6) {
                    e.preventDefault();
                    handleVerifyEmailOtp();
                  }
                }}
                placeholder="••••••"
              />

              {otpError && <div className="create-otp-error">{otpError}</div>}

              {otpDevHint && (
                <div className="create-otp-dev-hint">
                  Dev Code: <strong>{otpDevHint}</strong>
                </div>
              )}

              <div className="create-otp-resend-row">
                <span>Didn't receive the code?</span>
                <button
                  type="button"
                  className="create-otp-resend-btn"
                  onClick={handleSendEmailOtp}
                  disabled={otpCooldown > 0 || isSendingOtp}
                >
                  {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>

            <div className="create-otp-modal-actions">
              <button
                type="button"
                className="create-otp-btn secondary"
                onClick={() => setIsOtpModalOpen(false)}
                disabled={isVerifyingOtp}
              >
                Cancel
              </button>
              <button
                type="button"
                className="create-otp-btn primary"
                onClick={handleVerifyEmailOtp}
                disabled={isVerifyingOtp || otpCodeInput.length !== 6}
              >
                {isVerifyingOtp ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
