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

export interface OfferRecord {
  id: number | string;
  type: "application" | "invitation";
  title: string;
  company: string;
  status: string;
  receivedDate: string;
  respondByDate: string;
  startDate: string;
  workSetup: string;
  salary: string;
  letterContent: string;
}

const DEFAULT_SAMPLE_OFFER: OfferRecord = {
  id: "offer-cebuana-1",
  type: "application",
  title: "Financial Data & Business Intelligence Analyst",
  company: "CEBUANA",
  status: "Pending response",
  receivedDate: "Oct 12, 2026",
  respondByDate: "Oct 19, 2026",
  startDate: "Nov 3, 2026",
  workSetup: "Hybrid",
  salary: "PHP 45,000 / month",
  letterContent: `Dear John Doe,

We are pleased to offer you the position of Financial Data & Business Intelligence Analyst at CEBUANA.

Your start date will be November 3, 2026. This is a hybrid work setup, and your monthly salary will be PHP 45,000, subject to applicable taxes and company benefits. Additional details regarding your employment terms, benefits, and onboarding requirements are included in the attached offer letter.

We are excited about the possibility of you joining our team and believe your skills and experience will be a valuable addition to CEBUANA.

Sincerely,
CEBUANA Hiring Team`,
};

export default function ApplicantOfferLetter() {
  const [userId, setUserId] = useState<number | null>(null);
  const [candidateName, setCandidateName] = useState("John Doe");
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Tab state: "received" (Received Offers) vs "templates" (Response Templates)
  const [activeTab, setActiveTab] = useState<"received" | "templates">("received");

  // Offers state
  const [offers, setOffers] = useState<OfferRecord[]>([DEFAULT_SAMPLE_OFFER]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | number>(DEFAULT_SAMPLE_OFFER.id);

  // Selected response decision
  const [selectedDecision, setSelectedDecision] = useState<"accept" | "decline" | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        const fullName = [savedUser.first_name, savedUser.last_name].filter(Boolean).join(" ") || savedUser.name || "John Doe";
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

  // Fetch applicant templates and active offers
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

    fetch(`/api/applicants/${userId}/applications`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = Array.isArray(d?.applications) ? d.applications : [];
        const offeredApps = list.filter((a: any) => {
          const st = String(a.status || "").toLowerCase();
          return st.includes("offer") || st.includes("recruit") || String(a.id) === String(appId);
        });

        if (offeredApps.length > 0) {
          const mapped: OfferRecord[] = offeredApps.map((a: any) => ({
            id: a.id,
            type: "application",
            title: a.job_title || a.title || "Position",
            company: a.company_name || "Employer",
            status: a.response_letter ? "Responded" : "Pending response",
            receivedDate: a.updated_at ? new Date(a.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent",
            respondByDate: "Within 7 days",
            startDate: a.start_date || "Nov 3, 2026",
            workSetup: a.work_arrangement || "Hybrid",
            salary: a.salary ? `PHP ${a.salary}` : "PHP 45,000 / month",
            letterContent: a.offer_letter || a.response_letter || `Dear ${candidateName},\n\nWe are pleased to offer you the position of ${a.job_title || a.title || "Position"} at ${a.company_name || "CEBUANA"}.\n\nYour start date will be ${a.start_date || "Nov 3, 2026"}. This is a ${a.work_arrangement || "Hybrid"} work setup, and your monthly salary will be PHP 45,000, subject to applicable taxes and company benefits.\n\nSincerely,\n${a.company_name || "CEBUANA"} Hiring Team`,
          }));
          setOffers(mapped);
          setSelectedOfferId(mapped[0].id);
        }

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
          setSelectedOfferId(found.id);
        }
      })
      .catch(() => {});

    if (invId) {
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
  }, [userId, candidateName]);

  // Selected Offer
  const currentOffer = offers.find((o) => String(o.id) === String(selectedOfferId)) || offers[0] || DEFAULT_SAMPLE_OFFER;

  // Load draft response if any
  useEffect(() => {
    if (!currentOffer) return;
    try {
      const draft = localStorage.getItem(`offer-draft-${currentOffer.id}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.decision) setSelectedDecision(parsed.decision);
        if (parsed.message) setCustomMessage(parsed.message);
      }
    } catch {}
  }, [currentOffer.id]);

  // Handle Download Letter
  const handleDownloadLetter = () => {
    const textToDownload = `OFFICIAL EMPLOYMENT OFFER LETTER
Position: ${currentOffer.title}
Company: ${currentOffer.company}
Status: ${currentOffer.status}
Start Date: ${currentOffer.startDate}
Work Setup: ${currentOffer.workSetup}
Compensation: ${currentOffer.salary}

--------------------------------------------------
${currentOffer.letterContent}
--------------------------------------------------
Recipient: ${candidateName}
Document Timestamp: ${new Date().toLocaleString()}
`;
    const element = document.createElement("a");
    const file = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `Offer-Letter-${currentOffer.company.replace(/\s+/g, "_")}-${currentOffer.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Handle Save response draft
  const handleSaveDraft = () => {
    if (!currentOffer) return;
    localStorage.setItem(
      `offer-draft-${currentOffer.id}`,
      JSON.stringify({ decision: selectedDecision, message: customMessage, savedAt: new Date().toISOString() })
    );
    setIsDraftSaved(true);
    setActionFeedback({ type: "success", text: "Response draft saved successfully." });
    setTimeout(() => {
      setIsDraftSaved(false);
      setActionFeedback(null);
    }, 3500);
  };

  // Confirm Decision Submission
  const handleConfirmDecision = async () => {
    if (!selectedDecision) return;
    setIsSubmittingDecision(true);
    setActionFeedback(null);

    try {
      if (userId && typeof currentOffer.id === "number") {
        const endpoint = `/api/applicants/${userId}/applications/${currentOffer.id}/offer-response`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: selectedDecision,
            letter_text: customMessage,
            letter_type: "manual",
            start_date: currentOffer.startDate,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Unable to submit offer response.");
        }
      }

      // Update local status
      setOffers((prev) =>
        prev.map((o) =>
          o.id === currentOffer.id
            ? { ...o, status: selectedDecision === "accept" ? "Offer Accepted" : "Offer Declined" }
            : o
        )
      );

      localStorage.removeItem(`offer-draft-${currentOffer.id}`);
      setIsReviewModalOpen(false);
      setActionFeedback({
        type: "success",
        text: `Your decision to ${selectedDecision.toUpperCase()} the offer has been officially sent to ${currentOffer.company}.`,
      });
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to submit decision." });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Insert tag into textarea for template studio
  const insertTag = (type: "acceptance" | "denial", tag: string) => {
    if (type === "acceptance") {
      setAcceptanceTemplate((prev) => prev + " " + tag);
    } else {
      setDeclineTemplate((prev) => prev + " " + tag);
    }
  };

  // Render live preview replacing dynamic tags with realistic sample data
  const renderPreview = (template: string, isAcceptance: boolean) => {
    const sampleJob = activeOfferContext?.jobTitle || currentOffer.title || "Financial Data & Business Intelligence Analyst";
    const sampleCompany = activeOfferContext?.companyName || currentOffer.company || "CEBUANA";
    const sampleStartDate = activeOfferContext?.startDate || currentOffer.startDate || "Nov 3, 2026";

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
        {/* Header Topbar */}
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

          {/* Feedback alert banner */}
          {actionFeedback && (
            <div className={`aol-action-feedback ${actionFeedback.type}`} role="alert">
              <span>{actionFeedback.text}</span>
              <button type="button" onClick={() => setActionFeedback(null)} aria-label="Dismiss">✕</button>
            </div>
          )}

          {/* Main Card with Tabs */}
          <section className="aol-notices-page-card">
            {/* Top Navigation Tabs matching UI Mockup (Received Offers vs Response Templates) */}
            <div className="aol-notices-tab-nav">
              <button
                type="button"
                className={`aol-notices-tab-btn ${activeTab === "received" ? "active" : ""}`}
                onClick={() => setActiveTab("received")}
              >
                <span className="aol-tab-btn-text">Received Offers</span>
              </button>
              <button
                type="button"
                className={`aol-notices-tab-btn ${activeTab === "templates" ? "active" : ""}`}
                onClick={() => setActiveTab("templates")}
              >
                <span className="aol-tab-btn-text">Response Templates</span>
              </button>
            </div>

            {/* TAB 1: RECEIVED OFFERS (Matches UI Mockup 873848189 / 873066323) */}
            {activeTab === "received" && (
              <div className="aol-received-offers-view">
                {/* Offers summary list */}
                <div className="aol-offers-list-section">
                  <h3 className="aol-section-title">Offers ({offers.length})</h3>
                  <div className="aol-offers-list-strip">
                    {offers.map((offer) => {
                      const isSelected = String(offer.id) === String(currentOffer.id);
                      return (
                        <div
                          key={offer.id}
                          className={`aol-offer-strip-item ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedOfferId(offer.id)}
                          tabIndex={0}
                          role="button"
                        >
                          <div className="aol-offer-strip-head">
                            <h4 className="aol-offer-strip-title">{offer.title}</h4>
                            <span className="aol-offer-badge pending">{offer.status}</span>
                          </div>
                          <div className="aol-offer-strip-company">{offer.company}</div>
                          <div className="aol-offer-strip-meta">
                            <span>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              Received {offer.receivedDate}
                            </span>
                            <span>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              Respond by {offer.respondByDate}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Offer Detail Card */}
                <div className="aol-offer-detail-card">
                  {/* Title & Badge Header */}
                  <div className="aol-detail-head">
                    <div>
                      <h2 className="aol-detail-title">{currentOffer.title}</h2>
                      <div className="aol-detail-company">{currentOffer.company}</div>
                    </div>
                    <span className="aol-offer-badge pending">{currentOffer.status}</span>
                  </div>

                  {/* 3-Column Metrics Strip */}
                  <div className="aol-metrics-strip">
                    <div className="aol-metric-col">
                      <div className="aol-metric-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div className="aol-metric-info">
                        <small>Start date</small>
                        <strong>{currentOffer.startDate}</strong>
                      </div>
                    </div>

                    <div className="aol-metric-col">
                      <div className="aol-metric-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                      </div>
                      <div className="aol-metric-info">
                        <small>Work setup</small>
                        <strong>{currentOffer.workSetup}</strong>
                      </div>
                    </div>

                    <div className="aol-metric-col">
                      <div className="aol-metric-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="6" width="20" height="12" rx="2" />
                          <circle cx="12" cy="12" r="2" />
                          <path d="M6 12h.01M18 12h.01" />
                        </svg>
                      </div>
                      <div className="aol-metric-info">
                        <small>Salary</small>
                        <strong>{currentOffer.salary}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Formal Offer Letter Card */}
                  <div className="aol-formal-letter-card">
                    <div className="aol-formal-letter-head">
                      <h3>Formal Offer Letter</h3>
                      <span className="aol-readonly-badge">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Read-only document from employer
                      </span>
                    </div>

                    <div className="aol-formal-letter-body">
                      <div className="aol-letter-doc-icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </div>
                      <div className="aol-letter-text-content">
                        {currentOffer.letterContent.split("\n\n").map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Your Response Section */}
                  <div className="aol-response-section">
                    <h3 className="aol-response-title">Your Response</h3>
                    <p className="aol-response-subtitle">
                      Choose a decision, then review the message that will be sent to the employer.
                    </p>

                    {/* Radio Cards */}
                    <div className="aol-decision-cards-row">
                      <label
                        className={`aol-decision-radio-card accept ${selectedDecision === "accept" ? "active" : ""}`}
                        onClick={() => setSelectedDecision("accept")}
                      >
                        <input
                          type="radio"
                          name="offer_decision"
                          checked={selectedDecision === "accept"}
                          onChange={() => setSelectedDecision("accept")}
                        />
                        <div className="aol-radio-custom" />
                        <div className="aol-radio-text">
                          <strong>Accept offer</strong>
                          <span>I would like to accept this offer and join the team.</span>
                        </div>
                      </label>

                      <label
                        className={`aol-decision-radio-card decline ${selectedDecision === "decline" ? "active" : ""}`}
                        onClick={() => setSelectedDecision("decline")}
                      >
                        <input
                          type="radio"
                          name="offer_decision"
                          checked={selectedDecision === "decline"}
                          onChange={() => setSelectedDecision("decline")}
                        />
                        <div className="aol-radio-custom" />
                        <div className="aol-radio-text">
                          <strong>Decline offer</strong>
                          <span>I must decline this offer at this time.</span>
                        </div>
                      </label>
                    </div>

                    {/* Optional Message Field */}
                    <div className="aol-response-message-field">
                      <label>Message to employer (optional)</label>
                      <textarea
                        className="aol-message-textarea"
                        rows={4}
                        maxLength={500}
                        placeholder="Add a short message to the employer (optional)..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                      />
                      <div className="aol-char-count">{customMessage.length}/500</div>
                    </div>

                    {/* Final decision warning notice */}
                    <div className="aol-warning-notice">
                      <span className="aol-warning-icon">⚠️</span>
                      <span>Your decision is final after confirmation.</span>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="aol-actions-row">
                      <button type="button" className="aol-action-btn outline" onClick={handleDownloadLetter}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download Letter
                      </button>

                      <button type="button" className="aol-action-btn outline" onClick={handleSaveDraft}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        Save response draft
                      </button>

                      <button
                        type="button"
                        className="aol-action-btn primary"
                        disabled={!selectedDecision}
                        onClick={() => setIsReviewModalOpen(true)}
                      >
                        <span>Review Decision</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RESPONSE TEMPLATES (Maintains Pic 1 Match) */}
            {activeTab === "templates" && (
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
            )}
          </section>
        </div>

        {/* REVIEW DECISION CONFIRMATION MODAL */}
        {isReviewModalOpen && selectedDecision && (
          <div className="aol-modal-backdrop" onClick={() => setIsReviewModalOpen(false)}>
            <div className="aol-decision-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className={`aol-modal-header-badge ${selectedDecision}`}>
                {selectedDecision === "accept" ? (
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#16a34a" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#dc2626" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
              <h3 className="aol-modal-title">
                {selectedDecision === "accept" ? "Confirm Offer Acceptance" : "Confirm Offer Decline"}
              </h3>
              <p className="aol-modal-desc">
                You are about to <strong>{selectedDecision.toUpperCase()}</strong> the formal employment offer from{" "}
                <strong>{currentOffer.company}</strong> for the position of <strong>{currentOffer.title}</strong>.
              </p>
              {customMessage.trim() && (
                <div className="aol-modal-message-preview">
                  <small>Attached Message:</small>
                  <p>&quot;{customMessage}&quot;</p>
                </div>
              )}
              <div className="aol-modal-notice">
                <span>⚠️ Note: This decision is irreversible once submitted.</span>
              </div>
              <div className="aol-modal-actions">
                <button
                  type="button"
                  className="aol-modal-btn cancel"
                  onClick={() => setIsReviewModalOpen(false)}
                  disabled={isSubmittingDecision}
                >
                  Go Back
                </button>
                <button
                  type="button"
                  className={`aol-modal-btn confirm ${selectedDecision}`}
                  onClick={handleConfirmDecision}
                  disabled={isSubmittingDecision}
                >
                  {isSubmittingDecision ? "Submitting..." : `Confirm & ${selectedDecision === "accept" ? "Accept Offer" : "Decline Offer"}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
