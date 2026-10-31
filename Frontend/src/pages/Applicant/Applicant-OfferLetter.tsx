import React, { useEffect, useState } from "react";
import ApplicantSidebar from "../../components/ApplicantSidebar";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import "./Applicant-OfferLetter.css";

const SYSTEM_DEFAULT_ACCEPTANCE = `Dear {company_name} Hiring Team,

Thank you for extending the offer for the position of "{job_title}". I am pleased to accept your offer and excited to join the team.

I look forward to contributing to {company_name}. Please let me know if there are any documents or details needed prior to my start date.

Sincerely,
{applicant_name}`;

const SYSTEM_DEFAULT_DECLINE = `Dear {company_name} Hiring Team,

Thank you for taking the time to consider me for the position of "{job_title}" at {company_name}.

After careful consideration and review, I regret to inform you that I must decline this opportunity as I have decided to pursue another career path that more closely aligns with my current goals.

I appreciate your consideration and wish {company_name} continued success.

Sincerely,
{applicant_name}`;

export default function ApplicantOfferLetter() {
  const [userId, setUserId] = useState<number | null>(null);
  const [candidateName, setCandidateName] = useState("Juan Dela Cruz");
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Template states
  const [acceptanceTemplate, setAcceptanceTemplate] = useState(SYSTEM_DEFAULT_ACCEPTANCE);
  const [declineTemplate, setDeclineTemplate] = useState(SYSTEM_DEFAULT_DECLINE);
  const [savingCard, setSavingCard] = useState<"acceptance" | "denial" | null>(null);
  const [acceptanceStatus, setAcceptanceStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [denialStatus, setDenialStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [activeOfferContext, setActiveOfferContext] = useState<{
    id: number;
    type: "application" | "invitation";
    jobTitle: string;
    companyName: string;
    responseLetter?: string;
    startDate?: string;
    status?: string;
  } | null>(null);

  // Read current applicant session
  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) return;
    try {
      const savedUser = JSON.parse(savedUserRaw) as { id?: number; role?: string; name?: string; first_name?: string; last_name?: string };
      if (savedUser.id) {
        setUserId(savedUser.id);
        const fullName = [savedUser.first_name, savedUser.last_name].filter(Boolean).join(" ") || savedUser.name || "Candidate";
        setCandidateName(fullName);

        // Fetch candidate profile for accurate name
        fetch(`/api/applicants/${savedUser.id}/profile`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.first_name || d?.last_name) {
              const pName = [d.first_name, d.last_name].filter(Boolean).join(" ");
              if (pName) setCandidateName(pName);
            }
          })
          .catch(() => {});
      }
    } catch {
      // Fallback
    }
  }, []);

  // Fetch applicant templates from server
  useEffect(() => {
    if (!userId) return;

    fetch(`/api/applicants/${userId}/letter-templates`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.acceptance_template) setAcceptanceTemplate(data.acceptance_template);
        if (data.rejection_template) setDeclineTemplate(data.rejection_template);
      })
      .catch(() => {});

    // Inspect URL query parameters for active application or invitation context
    const params = new URLSearchParams(window.location.search);
    const appId = params.get("applicationId");
    const invId = params.get("invitationId");

    if (appId) {
      fetch(`/api/applicants/${userId}/applications`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const list = Array.isArray(d?.applications) ? d.applications : [];
          const found = list.find((a: any) => String(a.id) === String(appId));
          if (found) {
            setActiveOfferContext({
              id: found.id,
              type: "application",
              jobTitle: found.job_title || found.title || "Job Position",
              companyName: found.company_name || "Employer",
              responseLetter: found.response_letter,
              startDate: found.start_date,
              status: found.status,
            });
          }
        })
        .catch(() => {});
    } else if (invId) {
      fetch(`/api/applicants/${userId}/invitations`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const list = Array.isArray(d?.invitations) ? d.invitations : [];
          const found = list.find((i: any) => String(i.id) === String(invId));
          if (found) {
            setActiveOfferContext({
              id: found.id,
              type: "invitation",
              jobTitle: found.job_title || "Job Position",
              companyName: found.business_name || "Employer",
              responseLetter: found.response_letter,
              startDate: found.start_date,
              status: found.status,
            });
          }
        })
        .catch(() => {});
    }
  }, [userId]);

  // Insert tag into textarea
  const insertTag = (type: "acceptance" | "denial", tag: string) => {
    if (type === "acceptance") {
      setAcceptanceTemplate((prev) => prev + " " + tag);
    } else {
      setDeclineTemplate((prev) => prev + " " + tag);
    }
  };

  // Render live preview replacing dynamic tags with realistic sample data
  const renderPreview = (template: string, isAcceptance: boolean) => {
    const sampleJob = activeOfferContext?.jobTitle || "Financial Data & Business Intelligence Analyst";
    const sampleCompany = activeOfferContext?.companyName || "CEBUANA";
    const sampleStartDate = activeOfferContext?.startDate || "Nov 15, 2026";

    return template
      .replace(/\{applicant_name\}|\{candidate_name\}/g, candidateName)
      .replace(/\{job_title\}|\{position\}/g, sampleJob)
      .replace(/\{company_name\}|\{employer_name\}/g, sampleCompany)
      .replace(/\{start_date\}/g, sampleStartDate);
  };

  // Save card handler
  const handleSaveCard = async (type: "acceptance" | "denial") => {
    if (!userId) return;
    setSavingCard(type);
    if (type === "acceptance") setAcceptanceStatus(null);
    else setDenialStatus(null);

    const payload = {
      acceptance_template: type === "acceptance" ? acceptanceTemplate : undefined,
      rejection_template: type === "denial" ? declineTemplate : undefined,
    };

    try {
      const res = await fetch(`/api/applicants/${userId}/letter-templates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save notice template.");

      if (type === "acceptance") {
        setAcceptanceStatus({ type: "success", text: "Offer acceptance template saved successfully!" });
        setTimeout(() => setAcceptanceStatus(null), 4000);
      } else {
        setDenialStatus({ type: "success", text: "Offer decline notice template saved successfully!" });
        setTimeout(() => setDenialStatus(null), 4000);
      }
    } catch (err: any) {
      const errObj = { type: "error" as const, text: err?.message || "Error saving template." };
      if (type === "acceptance") setAcceptanceStatus(errObj);
      else setDenialStatus(errObj);
    } finally {
      setSavingCard(null);
    }
  };

  // Reset card handler
  const handleResetCard = (type: "acceptance" | "denial") => {
    if (type === "acceptance") {
      setAcceptanceTemplate(SYSTEM_DEFAULT_ACCEPTANCE);
      setAcceptanceStatus({ type: "success", text: "Reset to system default acceptance letter." });
      setTimeout(() => setAcceptanceStatus(null), 3000);
    } else {
      setDeclineTemplate(SYSTEM_DEFAULT_DECLINE);
      setDenialStatus({ type: "success", text: "Reset to system default decline notice." });
      setTimeout(() => setDenialStatus(null), 3000);
    }
  };

  return (
    <div className="appdash-page sidebar-visible aol-page-layout">
      {/* Standalone Sidebar for Applicant */}
      <ApplicantSidebar activePath="/applicant-offer-letter" />

      {/* Main Content Area */}
      <main className="appdash-main aol-main-content">
        {/* Header Topbar - Matching Applicant Dashboard 1:1 */}
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>Offer Letters</strong>
            </div>
          </div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <ApplicantChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Offer Letters"
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        <div className="aol-card-container">
          {/* Active Context Banner when linked directly from an application or invitation */}
          {activeOfferContext && (
            <div
              className="aol-active-offer-card"
              style={{
                marginBottom: "16px",
                padding: "16px 20px",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#0369a1", display: "block" }}>
                  LINKED FORMAL OFFER RECORD
                </span>
                <h3 style={{ margin: "3px 0 2px", fontSize: "1.1rem", color: "#0c2a47" }}>{activeOfferContext.jobTitle}</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
                  {activeOfferContext.companyName}{" "}
                  {activeOfferContext.status
                    ? `• Status: ${
                        activeOfferContext.type === "invitation" && activeOfferContext.status === "pending"
                          ? "Invitation Received"
                          : activeOfferContext.status
                      }`
                    : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <a
                  href="/applicant-dashboard#section-applications"
                  className="ghost-btn"
                  style={{ textDecoration: "none", fontSize: "0.84rem", padding: "8px 14px" }}
                >
                  ← Back to Applications
                </a>
              </div>
            </div>
          )}

          {/* Notices Main Card (Pic 1 Match) */}
          <section className="aol-notices-page-card">
          {/* Navigation Tab Bar */}
          <div className="aol-notices-tab-nav">
            <button type="button" className="aol-notices-tab-btn active">
              <svg
                className="aol-tab-btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span className="aol-tab-btn-text">Decision Notices (Automated Messages)</span>
            </button>
          </div>

          {/* Two Side-by-Side Template Cards (Pic 1 Match) */}
          <div className="aol-decision-templates-grid">
            {/* ── CARD 1: ACCEPTANCE NOTICE ── */}
            <div className="aol-template-card acceptance">
              <div className="aol-template-card-head">
                <div className="aol-template-card-title-group">
                  <span className="aol-template-badge acceptance">Acceptance</span>
                  <h3>Automated Offer / Acceptance Notice</h3>
                </div>
              </div>

              <div className="aol-template-card-body">
                <div className="aol-template-studio-split">
                  <div className="aol-template-inputs-side">
                    <div className="aol-template-tags-bar">
                      <span>Insert tag:</span>
                      <button
                        type="button"
                        className="aol-template-tag-chip"
                        onClick={() => insertTag("acceptance", "{applicant_name}")}
                        title="Your full name"
                      >
                        + &#123;applicant_name&#125;
                      </button>
                      <button
                        type="button"
                        className="aol-template-tag-chip"
                        onClick={() => insertTag("acceptance", "{job_title}")}
                        title="Position offered"
                      >
                        + &#123;job_title&#125;
                      </button>
                      <button
                        type="button"
                        className="aol-template-tag-chip"
                        onClick={() => insertTag("acceptance", "{company_name}")}
                        title="Employer company name"
                      >
                        + &#123;company_name&#125;
                      </button>
                      <button
                        type="button"
                        className="aol-template-tag-chip"
                        onClick={() => insertTag("acceptance", "{start_date}")}
                        title="Target onboarding start date"
                      >
                        + &#123;start_date&#125;
                      </button>
                    </div>

                    <textarea
                      className="aol-template-textarea"
                      rows={9}
                      value={acceptanceTemplate}
                      onChange={(e) => setAcceptanceTemplate(e.target.value)}
                      placeholder="Write your formal acceptance message..."
                    />
                  </div>

                  <div className="aol-template-preview-side">
                    <div className="aol-template-preview-box">
                      <span className="aol-template-preview-label">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Employer Preview
                      </span>
                      <div className="aol-template-preview-content">
                        {renderPreview(acceptanceTemplate || SYSTEM_DEFAULT_ACCEPTANCE, true)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {acceptanceStatus && (
                <div className={`aol-template-card-msg ${acceptanceStatus.type}`}>
                  {acceptanceStatus.text}
                </div>
              )}

              <div className="aol-template-card-footer">
                <button
                  type="button"
                  className="aol-notices-reset-btn"
                  onClick={() => handleResetCard("acceptance")}
                  disabled={savingCard === "acceptance"}
                >
                  Restore System Defaults
                </button>
                <button
                  type="button"
                  className="aol-notices-save-btn"
                  onClick={() => handleSaveCard("acceptance")}
                  disabled={savingCard === "acceptance" || !acceptanceTemplate.trim()}
                >
                  {savingCard === "acceptance" ? "Saving..." : "Save Notice Template"}
                </button>
              </div>
            </div>

            {/* ── CARD 2: DENIAL / DECLINE NOTICE ── */}
            <div className="aol-template-card denial">
              <div className="aol-template-card-head">
                <div className="aol-template-card-title-group">
                  <span className="aol-template-badge denial">Denial</span>
                  <h3>Automated Rejection / Denial Notice</h3>
                </div>
              </div>

              <div className="aol-template-card-body">
                <div className="aol-template-studio-split">
                  <div className="aol-template-inputs-side">
                    <div className="aol-template-tags-bar">
                      <span>Insert tag:</span>
                      <button
                        type="button"
                        className="aol-template-tag-chip"
                        onClick={() => insertTag("denial", "{applicant_name}")}
                        title="Your full name"
                      >
                        + &#123;applicant_name&#125;
                      </button>
                      <button
                        type="button"
                        className="aol-template-tag-chip"
                        onClick={() => insertTag("denial", "{job_title}")}
                        title="Position offered"
                      >
                        + &#123;job_title&#125;
                      </button>
                      <button
                        type="button"
                        className="aol-template-tag-chip"
                        onClick={() => insertTag("denial", "{company_name}")}
                        title="Employer company name"
                      >
                        + &#123;company_name&#125;
                      </button>
                    </div>

                    <textarea
                      className="aol-template-textarea"
                      rows={9}
                      value={declineTemplate}
                      onChange={(e) => setDeclineTemplate(e.target.value)}
                      placeholder="Write your formal decline message..."
                    />
                  </div>

                  <div className="aol-template-preview-side">
                    <div className="aol-template-preview-box">
                      <span className="aol-template-preview-label">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Employer Preview
                      </span>
                      <div className="aol-template-preview-content">
                        {renderPreview(declineTemplate || SYSTEM_DEFAULT_DECLINE, false)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {denialStatus && (
                <div className={`aol-template-card-msg ${denialStatus.type}`}>
                  {denialStatus.text}
                </div>
              )}

              <div className="aol-template-card-footer">
                <button
                  type="button"
                  className="aol-notices-reset-btn"
                  onClick={() => handleResetCard("denial")}
                  disabled={savingCard === "denial"}
                >
                  Restore System Defaults
                </button>
                <button
                  type="button"
                  className="aol-notices-save-btn"
                  onClick={() => handleSaveCard("denial")}
                  disabled={savingCard === "denial" || !declineTemplate.trim()}
                >
                  {savingCard === "denial" ? "Saving..." : "Save Notice Template"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
);
}
