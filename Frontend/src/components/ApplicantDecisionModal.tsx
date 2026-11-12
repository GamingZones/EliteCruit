import React, { useEffect, useState } from "react";
import "./ApplicantDecisionModal.css";

export interface ApplicantDecisionModalProps {
  isOpen: boolean;
  action: "accept" | "decline" | null;
  jobTitle?: string;
  companyName?: string;
  candidateName?: string;
  currentUserId?: number;
  title?: string;
  isInvitation?: boolean;
  offerLetter?: string | null;
  startDate?: string | null;
  position?: "center" | "right";
  isSideBySide?: boolean;
  leftSideModal?: React.ReactNode;
  onClose: () => void;
  onConfirm: (payload: {
    action: "accept" | "decline";
    letter_text: string;
    letter_type: "automated" | "manual";
    start_date?: string;
  }) => Promise<void>;
}

const DEFAULT_ACCEPTANCE_TEMPLATE = `Dear {company_name} Hiring Team,

Thank you for extending the offer for the position of "{job_title}". I am pleased to accept your offer and excited to join the team.

I look forward to contributing to {company_name}. Please let me know if there are any documents or details needed prior to my start date.

Sincerely,
{applicant_name}`;

const DEFAULT_DECLINE_TEMPLATE = `Dear {company_name} Hiring Team,

Thank you for taking the time to consider me for the position of "{job_title}" at {company_name}.

After careful consideration, I regret to inform you that I must decline this opportunity as I have decided to pursue another path that aligns more closely with my current career goals.

I appreciate your consideration and wish {company_name} continued success.

Sincerely,
{applicant_name}`;

const DEFAULT_INVITATION_ACCEPTANCE_TEMPLATE = `Dear {company_name} Hiring Team,

Thank you for directly inviting me to be considered for the position of "{job_title}" at {company_name}. I am pleased to accept your invitation and look forward to discussing the next steps in your recruitment process.

Sincerely,
{applicant_name}`;

const DEFAULT_INVITATION_DECLINE_TEMPLATE = `Dear {company_name} Hiring Team,

Thank you for reaching out and inviting me to the position of "{job_title}" at {company_name}.

After consideration, I must respectfully decline this invitation at this time as I am currently pursuing opportunities that more closely align with my career goals.

I appreciate your consideration and wish {company_name} continued success.

Sincerely,
{applicant_name}`;

function substituteTags(template: string, applicant: string, company: string, title: string): string {
  return template
    .replace(/\{applicant_name\}|\{candidate_name\}/g, applicant || "Candidate")
    .replace(/\{company_name\}|\{employer_name\}/g, company || "Employer")
    .replace(/\{job_title\}|\{position\}/g, title || "Position");
}

export default function ApplicantDecisionModal({
  isOpen,
  action,
  jobTitle = "the position",
  companyName = "Employer",
  candidateName = "Candidate",
  currentUserId,
  title,
  isInvitation = false,
  offerLetter,
  startDate,
  position = "center",
  isSideBySide = false,
  leftSideModal,
  onClose,
  onConfirm,
}: ApplicantDecisionModalProps) {
  const [currentAction, setCurrentAction] = useState<"accept" | "decline">(action === "decline" ? "decline" : "accept");
  const [responseType, setResponseType] = useState<"automated" | "manual">("automated");
  const [masterAcceptance, setMasterAcceptance] = useState(isInvitation ? DEFAULT_INVITATION_ACCEPTANCE_TEMPLATE : DEFAULT_ACCEPTANCE_TEMPLATE);
  const [masterDecline, setMasterDecline] = useState(isInvitation ? DEFAULT_INVITATION_DECLINE_TEMPLATE : DEFAULT_DECLINE_TEMPLATE);
  const [automatedText, setAutomatedText] = useState("");
  const [manualText, setManualText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (action) {
      setCurrentAction(action);
    }
  }, [action]);

  // Load applicant master templates if available and NOT in invitation mode
  useEffect(() => {
    if (!isOpen || !currentUserId || isInvitation) return;

    let active = true;
    fetch(`/api/applicants/${currentUserId}/letter-templates`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.acceptance_template) setMasterAcceptance(data.acceptance_template);
        if (data.rejection_template) setMasterDecline(data.rejection_template);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isOpen, currentUserId, isInvitation]);

  // Compute automated preview message whenever action, master template, or details change
  useEffect(() => {
    const baseTemplate = currentAction === "accept"
      ? (isInvitation ? DEFAULT_INVITATION_ACCEPTANCE_TEMPLATE : masterAcceptance)
      : (isInvitation ? DEFAULT_INVITATION_DECLINE_TEMPLATE : masterDecline);
    const rendered = substituteTags(baseTemplate, candidateName, companyName, jobTitle);
    setAutomatedText(rendered);
    if (!manualText || responseType === "automated") {
      setManualText(rendered);
    }
  }, [currentAction, masterAcceptance, masterDecline, candidateName, companyName, jobTitle, isInvitation, responseType]);

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setResponseType("automated");
      setErrorMessage("");
      setIsSubmitting(false);
      if (action) setCurrentAction(action);
      if (isInvitation) {
        setMasterAcceptance(DEFAULT_INVITATION_ACCEPTANCE_TEMPLATE);
        setMasterDecline(DEFAULT_INVITATION_DECLINE_TEMPLATE);
      }
    }
  }, [isOpen, action, isInvitation]);

  if (!isOpen) return null;

  const isAccept = currentAction === "accept";
  const titleText = title || (isInvitation
    ? (isAccept ? "Respond to Direct Recruitment Invitation" : "Decline Direct Recruitment Invitation")
    : (isAccept ? "Respond to Employment Offer" : "Decline Employment Offer"));

  const handleSubmit = async () => {
    const finalLetterText = responseType === "automated" ? automatedText : manualText;
    if (responseType === "manual" && !finalLetterText.trim()) {
      setErrorMessage("Please enter your message before sending.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await onConfirm({
        action: currentAction,
        letter_text: finalLetterText.trim(),
        letter_type: responseType,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`adm-modal-backdrop ${position === "right" ? "position-right" : ""} ${isSideBySide || leftSideModal ? "side-by-side" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="adm-modal-title"
    >
      <div className="adm-pair-container" onClick={(e) => e.stopPropagation()}>
        {leftSideModal}
        <div className={`adm-decision-card ${position === "right" && !leftSideModal ? "card-right-side" : ""}`}>
        {/* Header (Pic 2 & Pic 3 Match) */}
        <div className="adm-card-header">
          <h3 id="adm-modal-title" className="adm-card-title">
            {titleText}
          </h3>
          <button
            type="button"
            className="adm-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body (Pic 2 & Pic 3 Match) */}
        <div className="adm-card-body">
          {/* Select Response Type */}
          <div className="adm-type-selector">
            <span className="adm-field-label">SELECT RESPONSE TYPE:</span>
            <div className="adm-options-grid">
              <label
                className={`adm-option-card ${responseType === "automated" ? "selected" : ""}`}
                onClick={() => setResponseType("automated")}
              >
                <input
                  type="radio"
                  name="admResponseType"
                  value="automated"
                  checked={responseType === "automated"}
                  onChange={() => setResponseType("automated")}
                />
                <span className="adm-option-radio-dot" />
                <div className="adm-option-info">
                  <strong>Automated Notice</strong>
                </div>
              </label>

              <label
                className={`adm-option-card ${responseType === "manual" ? "selected" : ""}`}
                onClick={() => setResponseType("manual")}
              >
                <input
                  type="radio"
                  name="admResponseType"
                  value="manual"
                  checked={responseType === "manual"}
                  onChange={() => {
                    setResponseType("manual");
                    if (!manualText.trim()) {
                      setManualText(automatedText);
                    }
                  }}
                />
                <span className="adm-option-radio-dot" />
                <div className="adm-option-info">
                  <strong>Manual Message</strong>
                </div>
              </label>
            </div>
          </div>

          {/* Standard Notice Preview / Custom Message Content */}
          <div className="adm-message-wrapper">
            <span className="adm-field-label">
              {responseType === "automated"
                ? "STANDARD NOTICE PREVIEW (AUTOMATED):"
                : "CUSTOM MESSAGE CONTENT:"}
            </span>

            <textarea
              className={`adm-textarea ${responseType === "automated" ? "automated-preview" : ""}`}
              rows={9}
              readOnly={responseType === "automated"}
              value={responseType === "automated" ? automatedText : manualText}
              onChange={(e) => {
                if (responseType === "manual") {
                  setManualText(e.target.value);
                }
              }}
              placeholder={
                responseType === "manual"
                  ? "Enter your personalized message to the employer..."
                  : ""
              }
            />

            <div className="adm-message-footnote">
              {isInvitation ? (
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Direct recruitment invitation response to {companyName}
                </span>
              ) : (
                <a
                  href="/applicant-offer-letter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="adm-footnote-link"
                >
                  Configure master templates in Offer Letters ↗
                </a>
              )}
            </div>
          </div>

          {errorMessage && (
            <div style={{ color: "#dc2626", fontSize: "0.82rem", fontWeight: 600 }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer (Pic 2 & Pic 3 Match - Strictly Without Schedule Interview Button) */}
        <div className="adm-card-footer">
          {currentAction === "accept" ? (
            <button
              type="button"
              className="adm-switch-action-btn"
              onClick={() => setCurrentAction("decline")}
              style={{ background: "transparent", border: "none", color: "#dc2626", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", marginRight: "auto", padding: "6px 8px" }}
            >
              Switch to Decline
            </button>
          ) : (
            <button
              type="button"
              className="adm-switch-action-btn"
              onClick={() => setCurrentAction("accept")}
              style={{ background: "transparent", border: "none", color: "#059669", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", marginRight: "auto", padding: "6px 8px" }}
            >
              Switch to Accept
            </button>
          )}
          <button
            type="button"
            className={`adm-confirm-btn ${isAccept ? "accept" : "decline"}`}
            onClick={handleSubmit}
            disabled={isSubmitting || (responseType === "manual" && !manualText.trim())}
          >
            {isSubmitting
              ? "Submitting..."
              : isAccept
              ? "Confirm Acceptance"
              : "Confirm Denial"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
