import React, { useEffect, useState } from "react";
import "./ApplicantDecisionModal.css";

export interface ApplicantDecisionModalProps {
  isOpen: boolean;
  action: "accept" | "decline" | null;
  jobTitle?: string;
  companyName?: string;
  candidateName?: string;
  currentUserId?: number;
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
  onClose,
  onConfirm,
}: ApplicantDecisionModalProps) {
  const [responseType, setResponseType] = useState<"automated" | "manual">("automated");
  const [masterAcceptance, setMasterAcceptance] = useState(DEFAULT_ACCEPTANCE_TEMPLATE);
  const [masterDecline, setMasterDecline] = useState(DEFAULT_DECLINE_TEMPLATE);
  const [automatedText, setAutomatedText] = useState("");
  const [manualText, setManualText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load applicant master templates if available
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

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
  }, [isOpen, currentUserId]);

  // Compute automated preview message whenever action, master template, or details change
  useEffect(() => {
    if (!action) return;
    const baseTemplate = action === "accept" ? masterAcceptance : masterDecline;
    const rendered = substituteTags(baseTemplate, candidateName, companyName, jobTitle);
    setAutomatedText(rendered);
    if (!manualText) {
      setManualText(rendered);
    }
  }, [action, masterAcceptance, masterDecline, candidateName, companyName, jobTitle]);

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setResponseType("automated");
      setErrorMessage("");
      setIsSubmitting(false);
    }
  }, [isOpen, action]);

  if (!isOpen || !action) return null;

  const isAccept = action === "accept";
  const titleText = isAccept ? "Accept Recruitment Invitation" : "Decline Recruitment Invitation";

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
        action,
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
      className="adm-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="adm-modal-title"
    >
      <div className="adm-decision-card">
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
              <a
                href="/applicant-offer-letter"
                target="_blank"
                rel="noopener noreferrer"
                className="adm-footnote-link"
              >
                Configure master templates in Offer Letters ↗
              </a>
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
          <button
            type="button"
            className="adm-cancel-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
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
  );
}
