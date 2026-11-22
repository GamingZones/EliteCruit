import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ApplicantSidebar from "../../components/ApplicantSidebar";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import { authFetch } from "../../utils/auth";
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
  jobPostId?: number;
  invitationId?: number;
  title: string;
  company: string;
  status: string;
  receivedDate: string;
  respondByDate: string;
  startDate: string;
  workSetup: string;
  salary: string;
  letterContent: string;
  isJobSuspended?: boolean;
}

export default function ApplicantOfferLetter() {
  const [userId, setUserId] = useState<number | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Tab state: "received" (Received Offers) vs "templates" (Response Templates)
  const [activeTab, setActiveTab] = useState<"received" | "templates">("received");

  // Offers state
  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | number | null>(null);
  // Collapsible dropdown state for received offers (closed by default)
  const [expandedOfferId, setExpandedOfferId] = useState<string | number | null>(null);

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
  const [previewModalType, setPreviewModalType] = useState<"acceptance" | "denial" | null>(null);

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
        const fullName = [savedUser.first_name, savedUser.last_name].filter(Boolean).join(" ") || savedUser.name || "";
        setCandidateName(fullName);

        // Fetch candidate profile for accurate name
        authFetch(`/api/applicants/${savedUser.id}/profile`)
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

    authFetch(`/api/applicants/${userId}/letter-templates`)
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

    Promise.all([
      authFetch(`/api/applicants/${userId}/applications`).then((r) => (r.ok ? r.json() : null)),
      authFetch(`/api/applicants/${userId}/invitations`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([appData, invData]) => {
        const appList = Array.isArray(appData?.applications) ? appData.applications : [];
        const invList = Array.isArray(invData?.invitations) ? invData.invitations : [];

        const offeredApps = appList.filter((a: any) => {
          const st = String(a.status || "").toLowerCase();
          const hasOffer = Boolean(
            a.offer_letter ||
            (a.decision_message_type === "formal_offer" && a.decision_message) ||
            ["offered", "offer_extended"].includes(st) ||
            (a.response_letter && ["accepted", "approved", "recruited", "declined"].includes(st))
          );
          return hasOffer;
        });

        const appOffers: OfferRecord[] = offeredApps.map((a: any) => {
          const letter =
            a.offer_letter ||
            (a.decision_message_type === "formal_offer" ? a.decision_message : null) ||
            a.response_letter ||
            "Official offer letter details extended by employer.";
          const isJobSuspended = Boolean(a.is_job_suspended || a.job_status === "suspended");
          return {
            id: a.id,
            type: "application",
            jobPostId: a.job_post_id,
            title: a.job_title || a.title || "Position",
            company: a.company_name || "Employer",
            status: a.response_letter ? "Responded" : "Pending response",
            receivedDate: a.updated_at ? new Date(a.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent",
            respondByDate: "Within 7 days",
            startDate: a.start_date || "To be mutually agreed upon",
            workSetup: a.work_arrangement || "Not specified",
            salary: a.salary ? `PHP ${a.salary}` : (a.salary_min && a.salary_max ? `PHP ${Number(a.salary_min).toLocaleString()} - ${Number(a.salary_max).toLocaleString()}` : "Competitive compensation"),
            letterContent: letter,
            isJobSuspended,
          };
        });

        const directOffers: OfferRecord[] = invList.map((i: any) => {
          const invStatus = (i.status || "pending").toLowerCase();
          const isResponded = Boolean(i.response_letter) || ["accepted", "declined"].includes(invStatus);
          const isJobSuspended = Boolean(i.is_job_suspended || i.job_status === "suspended");
          return {
            id: `inv-${i.id}`,
            invitationId: i.id,
            type: "invitation",
            jobPostId: i.job_post_id,
            title: i.job_title || "Job Position",
            company: i.business_name || "Employer",
            status: isResponded ? (invStatus === "accepted" ? "Offer Accepted" : invStatus === "declined" ? "Offer Declined" : "Responded") : "Pending response",
            receivedDate: i.created_at ? new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent",
            respondByDate: "Within 7 days",
            startDate: i.start_date || "To be mutually agreed upon",
            workSetup: i.work_arrangement || "Not specified",
            salary: i.salary_min && i.salary_max ? `PHP ${Number(i.salary_min).toLocaleString()} - ${Number(i.salary_max).toLocaleString()}` : "Competitive compensation",
            letterContent: i.custom_message || "Official offer letter details extended by employer.",
            isJobSuspended,
          };
        });

        const allOffers = [...appOffers, ...directOffers];
        setOffers(allOffers);

        if (allOffers.length > 0) {
          const targetOffer =
            (appId && allOffers.find((o) => o.type === "application" && String(o.id) === String(appId))) ||
            (invId && allOffers.find((o) => o.type === "invitation" && (String(o.invitationId) === String(invId) || String(o.id) === `inv-${invId}`))) ||
            allOffers[0];

          if (targetOffer) {
            setSelectedOfferId(targetOffer.id);
            setExpandedOfferId(targetOffer.id);
            setActiveOfferContext({
              id: Number(targetOffer.invitationId || targetOffer.id),
              type: targetOffer.type,
              jobTitle: targetOffer.title,
              companyName: targetOffer.company,
              responseLetter: undefined,
              startDate: targetOffer.startDate,
              status: targetOffer.status,
            });
          }
        } else {
          setSelectedOfferId(null);
          setActiveOfferContext(null);
        }
      })
      .catch(() => {});
  }, [userId, candidateName]);

  // Selected Offer
  const currentOffer = offers.find((o) => String(o.id) === String(selectedOfferId)) || (offers.length > 0 ? offers[0] : null);

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
  }, [currentOffer?.id]);

  // Handle Download Letter
  const handleDownloadLetter = () => {
    if (!currentOffer) return;
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
    if (!selectedDecision || !currentOffer) return;
    setIsSubmittingDecision(true);
    setActionFeedback(null);

    try {
      if (userId && currentOffer) {
        if (currentOffer.type === "invitation" && currentOffer.jobPostId) {
          const res = await fetch("/api/job-invitations/respond-by-job", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("elitecruit-token") || ""}`,
            },
            body: JSON.stringify({
              job_post_id: currentOffer.jobPostId,
              applicant_user_id: userId,
              action: selectedDecision,
              letter_text: customMessage,
              letter_type: "manual",
              start_date: currentOffer.startDate,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Unable to submit offer response.");
          }
        } else if (typeof currentOffer.id === "number") {
          const endpoint = `/api/applicants/${userId}/applications/${currentOffer.id}/offer-response`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("elitecruit-token") || ""}`,
            },
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
    const sampleJob = activeOfferContext?.jobTitle || currentOffer?.title || "Senior Frontend Engineer";
    const sampleCompany = activeOfferContext?.companyName || currentOffer?.company || "CEBUANA";
    const sampleStartDate = activeOfferContext?.startDate || currentOffer?.startDate || "Two weeks from acceptance";

    return template
      .replace(/\{applicant_name\}|\{candidate_name\}/g, candidateName || "Candidate")
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("elitecruit-token") || ""}`,
        },
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

            {/* TAB 1: RECEIVED OFFERS (Dropdown List - Closed by Default) */}
            {activeTab === "received" && (
              <div className="aol-received-offers-view">
                <div className="aol-offers-list-section">
                  <h3 className="aol-section-title">Offers ({offers.length})</h3>

                  {offers.length === 0 ? (
                    <div className="aol-empty-offers-card">
                      <p>No offer letters received yet.</p>
                    </div>
                  ) : (
                    <div className="aol-offers-list-strip">
                      {offers.map((offer) => {
                        const isExpanded = String(offer.id) === String(expandedOfferId);
                        const toggleOffer = () => {
                          if (isExpanded) {
                            setExpandedOfferId(null);
                          } else {
                            setExpandedOfferId(offer.id);
                            setSelectedOfferId(offer.id);
                          }
                        };

                        return (
                          <div
                            key={offer.id}
                            className={`aol-offer-accordion-group ${isExpanded ? "expanded" : ""}`}
                          >
                            {/* Accordion Dropdown Trigger Item */}
                            <div
                              className={`aol-offer-strip-item ${isExpanded ? "selected" : ""}`}
                              onClick={toggleOffer}
                              tabIndex={0}
                              role="button"
                              aria-expanded={isExpanded}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleOffer();
                                }
                              }}
                            >
                              <div className="aol-offer-strip-head">
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <h4 className="aol-offer-strip-title">{offer.title}</h4>
                                  {offer.isJobSuspended && (
                                    <span className="aol-suspended-chip">Suspended</span>
                                  )}
                                </div>
                                <div className="aol-offer-strip-head-right">
                                  <span className="aol-offer-badge pending">{offer.status}</span>
                                  <span
                                    className={`aol-dropdown-chevron ${isExpanded ? "open" : ""}`}
                                    aria-hidden="true"
                                    title={isExpanded ? "Collapse offer details" : "Expand offer details"}
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      width="18"
                                      height="18"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                  </span>
                                </div>
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

                            {/* Dropdown Expanded Details Container */}
                            {isExpanded && (
                              <div className="aol-offer-detail-card aol-accordion-body">
                                {/* Title & Badge Header */}
                                <div className="aol-detail-head">
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                      <h2 className="aol-detail-title">{offer.title}</h2>
                                      {offer.isJobSuspended && (
                                        <span className="aol-suspended-chip">Suspended</span>
                                      )}
                                    </div>
                                    <div className="aol-detail-company">{offer.company}</div>
                                  </div>
                                  <span className="aol-offer-badge pending">{offer.status}</span>
                                </div>

                                {offer.isJobSuspended && (
                                  <div className="aol-suspended-banner">
                                    <div className="suspended-overlay-icon-badge">
                                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                      </svg>
                                    </div>
                                    <div className="aol-suspended-banner-content">
                                      <strong>Position Temporarily Suspended</strong>
                                      <p>
                                        This job vacancy has been suspended by administration. Formal employment offers and response decisions for this position are temporarily on hold.
                                      </p>
                                    </div>
                                  </div>
                                )}

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
                                      <strong>{offer.startDate}</strong>
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
                                      <strong>{offer.workSetup}</strong>
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
                                      <strong>{offer.salary}</strong>
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
                                      {(offer.letterContent || "").split("\n\n").map((para, i) => (
                                        <p key={i}>{para}</p>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Your Response Section */}
                                <div className={`aol-response-section ${offer.isJobSuspended ? "is-suspended-response" : ""}`}>
                                  <h3 className="aol-response-title">Your Response</h3>
                                  <p className="aol-response-subtitle">
                                    {offer.isJobSuspended
                                      ? "Decision responses are disabled because this job position has been suspended by administration."
                                      : "Choose a decision, then review the message that will be sent to the employer."}
                                  </p>

                                  {/* Radio Cards */}
                                  <div className="aol-decision-cards-row">
                                    <label
                                      className={`aol-decision-radio-card accept ${selectedDecision === "accept" ? "active" : ""}`}
                                      onClick={() => !offer.isJobSuspended && setSelectedDecision("accept")}
                                    >
                                      <input
                                        type="radio"
                                        name={`offer_decision_${offer.id}`}
                                        checked={selectedDecision === "accept"}
                                        disabled={offer.isJobSuspended}
                                        onChange={() => !offer.isJobSuspended && setSelectedDecision("accept")}
                                      />
                                      <div className="aol-radio-custom" />
                                      <div className="aol-radio-text">
                                        <strong>Accept offer</strong>
                                        <span>I would like to accept this offer and join the team.</span>
                                      </div>
                                    </label>

                                    <label
                                      className={`aol-decision-radio-card decline ${selectedDecision === "decline" ? "active" : ""}`}
                                      onClick={() => !offer.isJobSuspended && setSelectedDecision("decline")}
                                    >
                                      <input
                                        type="radio"
                                        name={`offer_decision_${offer.id}`}
                                        checked={selectedDecision === "decline"}
                                        disabled={offer.isJobSuspended}
                                        onChange={() => !offer.isJobSuspended && setSelectedDecision("decline")}
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
                                      disabled={offer.isJobSuspended}
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

                                    <button
                                      type="button"
                                      className="aol-action-btn outline"
                                      disabled={offer.isJobSuspended}
                                      onClick={handleSaveDraft}
                                    >
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
                                      disabled={!selectedDecision || Boolean(offer.isJobSuspended)}
                                      onClick={() => setIsReviewModalOpen(true)}
                                    >
                                      <span>Review Decision</span>
                                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="9 18 15 12 9 6" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                        <polyline points="9 18 15 12 9 6" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                    {/* Horizontal Tags Bar touching both edges */}
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

                    {/* Textarea */}
                    <textarea
                      className="aol-template-textarea"
                      rows={12}
                      value={acceptanceTemplate}
                      onChange={(e) => setAcceptanceTemplate(e.target.value)}
                      placeholder="Write your formal acceptance message..."
                    />
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
                    <div className="aol-template-card-footer-right">
                      <button
                        type="button"
                        className="aol-notices-preview-btn"
                        onClick={() => setPreviewModalType("acceptance")}
                        title="Preview official response letter as received by employer"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Preview Letter
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
                    {/* Horizontal Tags Bar touching both edges */}
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

                    {/* Textarea */}
                    <textarea
                      className="aol-template-textarea"
                      rows={12}
                      value={declineTemplate}
                      onChange={(e) => setDeclineTemplate(e.target.value)}
                      placeholder="Write your formal decline message..."
                    />
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
                    <div className="aol-template-card-footer-right">
                      <button
                        type="button"
                        className="aol-notices-preview-btn"
                        onClick={() => setPreviewModalType("denial")}
                        title="Preview official decline notice as received by employer"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Preview Notice
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
                You are about to <strong>{(selectedDecision || "").toUpperCase()}</strong> the formal employment offer from{" "}
                <strong>{currentOffer?.company}</strong> for the position of <strong>{currentOffer?.title}</strong>.
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
        {/* OFFICIAL CORRESPONDENCE PREVIEW MODAL */}
        {previewModalType &&
          createPortal(
            <div
              className="view-letter-backdrop"
              onClick={() => setPreviewModalType(null)}
              style={{ zIndex: 300000 }}
            >
              <div
                className="view-letter-modal-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="view-letter-header">
                  <div>
                    <span className="view-letter-eyebrow">OFFICIAL CORRESPONDENCE PREVIEW</span>
                    <h3 className="view-letter-title" style={{ fontSize: "1.15rem" }}>
                      Response Letter ({previewModalType === "acceptance" ? "Accepted" : "Declined"})
                    </h3>
                    <p className="view-letter-company">
                      Recipient: {activeOfferContext?.companyName || currentOffer?.company || "CEBUANA"} Hiring Team • {activeOfferContext?.jobTitle || currentOffer?.title || "Senior Frontend Engineer"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="view-letter-close-btn"
                    onClick={() => setPreviewModalType(null)}
                    title="Close preview"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="view-letter-body-content">
                  <div className="view-letter-meta-row">
                    <span
                      className={`view-letter-badge ${
                        previewModalType === "acceptance" ? "accepted" : "declined"
                      }`}
                    >
                      {previewModalType === "acceptance"
                        ? "Offer Accepted"
                        : "Offer Declined"}
                    </span>
                  </div>

                  <div className="view-letter-body-box">
                    <div className="view-letter-box-header">
                      <span className="view-letter-box-label">
                        FORMAL RESPONSE LETTER
                      </span>
                    </div>
                    <pre className="view-letter-pre-text">
                      {renderPreview(
                        previewModalType === "acceptance"
                          ? (acceptanceTemplate || SYSTEM_DEFAULT_ACCEPTANCE)
                          : (declineTemplate || SYSTEM_DEFAULT_DECLINE),
                        previewModalType === "acceptance"
                      )}
                    </pre>
                  </div>
                </div>

                <div className="view-letter-footer">
                  <button
                    type="button"
                    className="view-letter-done-btn"
                    onClick={() => setPreviewModalType(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </main>
    </div>
  );
}
