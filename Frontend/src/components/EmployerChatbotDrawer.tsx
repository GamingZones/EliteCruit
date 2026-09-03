import React, { useState } from "react";
import "./EmployerChatbotDrawer.css";

export type EmployerFAQItem = {
  question: string;
  answer: string;
  actionLabel?: string;
  actionHref?: string;
};

const DEFAULT_EMPLOYER_FAQS: EmployerFAQItem[] = [
  {
    question: "How do I post a new job opening?",
    answer: "Go to Job Posts and click 'Create Job Post'. Fill in the job title, requirements, salary range, work setup, and location to publish your job.",
    actionLabel: "Create Job Post",
    actionHref: "/employer-job-posts",
  },
  {
    question: "How do I manage applicant applications?",
    answer: "Visit Applicant Management to view applications, screen candidate qualifications, update recruitment statuses, or reject applications.",
    actionLabel: "View Applicants",
    actionHref: "/employer-applicant-management",
  },
  {
    question: "How does Applicant Finder search candidates?",
    answer: "Applicant Finder locates top local talent near your company location, complete with interactive Cavite map visualization and match scoring.",
    actionLabel: "Open Applicant Finder",
    actionHref: "/employer-applicant-finder",
  },
  {
    question: "How do I manage company FAQs for applicants?",
    answer: "Use FAQ Management to add, edit, or delete custom company questions that candidates can inspect when reviewing your job postings.",
    actionLabel: "Manage FAQs",
    actionHref: "/employer-faq-management",
  },
];

type EmployerChatbotDrawerProps = {
  isOpen: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  pageTitle?: string;
  customFaqs?: EmployerFAQItem[];
};

export default function EmployerChatbotDrawer({
  isOpen,
  onClose,
  onToggle,
  pageTitle = "Employer Workspace",
  customFaqs,
}: EmployerChatbotDrawerProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const faqs = customFaqs && customFaqs.length > 0 ? customFaqs : DEFAULT_EMPLOYER_FAQS;

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
    <div className={`employer-chatbot-container ${isOpen ? "open" : "closed"}`}>
      <button
        type="button"
        className="employer-chatbot-trigger-btn"
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

      <div className="employer-chatbot-panel-popup" aria-label="Employer Assistant">
        <div className="employer-chatbot-panel-inner">
          <header className="employer-chatbot-popup-header">
            <div className="employer-chatbot-header-info">
              <div className="employer-chatbot-avatar">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="3" />
                  <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                  <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
                  <path d="M12 2v5m-4 4V7a4 4 0 0 1 8 0v4" />
                </svg>
              </div>
              <div className="employer-chatbot-title-wrap">
                <strong>Recruiter Assistant</strong>
                <small>{pageTitle} Guide</small>
              </div>
            </div>
            <button type="button" className="employer-chatbot-close-x" onClick={handleToggle} title="Close Assistant">
              ✕
            </button>
          </header>

          <div className="employer-chatbot-body-inner">
            <div className="employer-chatbot-intro-box">
              <p>
                Welcome! Need assistance in <strong>{pageTitle}</strong>? Select a query below:
              </p>
              <span className="employer-chatbot-faq-label">Recruiter FAQ:</span>
              <div className="employer-chatbot-faq-list">
                {faqs.map((faq, index) => {
                  const isExpanded = expandedIndex === index;
                  return (
                    <div key={faq.question} className={`employer-chatbot-accordion-item ${isExpanded ? "open" : ""}`}>
                      <button
                        type="button"
                        className="employer-chatbot-faq-chip"
                        onClick={() => toggleFaq(index)}
                      >
                        <span>{faq.question}</span>
                        <span className={`employer-chatbot-caret ${isExpanded ? "open" : ""}`}>▼</span>
                      </button>
                      {isExpanded && (
                        <div className="employer-chatbot-answer-content">
                          <p>{faq.answer}</p>
                          {faq.actionLabel && faq.actionHref && (
                            <a href={faq.actionHref} className="employer-chatbot-action-btn">
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
