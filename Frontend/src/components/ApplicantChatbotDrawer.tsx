import React, { useState } from "react";
import "./ApplicantChatbotDrawer.css";

export type ApplicantFAQItem = {
  question: string;
  answer: string;
  actionLabel?: string;
  actionHref?: string;
};

const DEFAULT_APPLICANT_FAQS: ApplicantFAQItem[] = [
  {
    question: "How do I apply for a job posting?",
    answer: "Go to the Job Search page, browse available postings, and click 'Apply Now'. You can also review match requirements beforehand.",
    actionLabel: "Go to Job Search",
    actionHref: "/job-search",
  },
  {
    question: "How do Smart Matches work?",
    answer: "Smart Matches compare your profile skills, desired title, work arrangement, and salary expectations against active job postings to generate a compatibility percentage.",
    actionLabel: "View Dashboard",
    actionHref: "/applicant-dashboard",
  },
  {
    question: "What happens when an employer invites me or extends an offer?",
    answer: "Direct recruitment invitations and formal job offers appear on your Dashboard and under Offer Letters. You can generate official acceptance or polite decline letters directly to employers.",
    actionLabel: "View Offer Letters",
    actionHref: "/applicant-offer-letter",
  },
  {
    question: "How do I update my profile and skills?",
    answer: "Navigate to My Profile to update your personal details, contact info, skills, work experience, and uploaded resume.",
    actionLabel: "Edit Profile",
    actionHref: "/my-profile",
  },
];

type ApplicantChatbotDrawerProps = {
  isOpen: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  pageTitle?: string;
  customFaqs?: ApplicantFAQItem[];
};

export default function ApplicantChatbotDrawer({
  isOpen,
  onClose,
  onToggle,
  pageTitle = "Applicant Workspace",
  customFaqs,
}: ApplicantChatbotDrawerProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const faqs = customFaqs && customFaqs.length > 0 ? customFaqs : DEFAULT_APPLICANT_FAQS;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else if (onClose) {
      onClose();
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className={`applicant-chatbot-container ${isOpen ? "open" : "closed"}`}>
      <button
        type="button"
        className="applicant-chatbot-trigger-btn"
        onClick={handleToggle}
        title={isOpen ? "Close ChatBot" : "Open ChatBot"}
      >
        <svg className="chatbot-btn-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="3" />
          <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
          <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
          <path d="M12 2v5m-4 4V7a4 4 0 0 1 8 0v4" />
        </svg>
        <span>ChatBot</span>
      </button>

      <div className="applicant-chatbot-panel-popup" aria-label="Applicant Assistant">
        <div className="applicant-chatbot-panel-inner">
          <header className="applicant-chatbot-popup-header">
            <div className="applicant-chatbot-header-info">
              <div className="applicant-chatbot-avatar">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="3" />
                  <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                  <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
                  <path d="M12 2v5m-4 4V7a4 4 0 0 1 8 0v4" />
                </svg>
              </div>
              <div className="applicant-chatbot-title-wrap">
                <strong>Candidate Assistant</strong>
                <small>{pageTitle} Guide</small>
              </div>
            </div>
            <button type="button" className="applicant-chatbot-close-x" onClick={handleToggle} title="Close Assistant">
              ✕
            </button>
          </header>

          <div className="applicant-chatbot-body-inner">
            <div className="applicant-chatbot-intro-box">
              <p>
                Hi! Need help navigating <strong>{pageTitle}</strong>? Select a question below:
              </p>
              <span className="applicant-chatbot-faq-label">Frequently Asked Questions:</span>
              <div className="applicant-chatbot-faq-list">
                {faqs.map((faq, index) => {
                  const isExpanded = expandedIndex === index;
                  return (
                    <div key={faq.question} className={`applicant-chatbot-accordion-item ${isExpanded ? "open" : ""}`}>
                      <button
                        type="button"
                        className="applicant-chatbot-faq-chip"
                        onClick={() => toggleFaq(index)}
                      >
                        <span>{faq.question}</span>
                        <span className={`applicant-chatbot-caret ${isExpanded ? "open" : ""}`}>▼</span>
                      </button>
                      {isExpanded && (
                        <div className="applicant-chatbot-answer-content">
                          <p>{faq.answer}</p>
                          {faq.actionLabel && faq.actionHref && (
                            <a href={faq.actionHref} className="applicant-chatbot-action-btn">
                              {faq.actionLabel} ➔
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
