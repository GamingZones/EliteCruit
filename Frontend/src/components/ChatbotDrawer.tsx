import React, { useState } from "react";
import "./ChatbotDrawer.css";

export type FAQItem = {
  question: string;
  answer: string;
  actionLabel?: string;
  actionHref?: string;
};

type ChatbotDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  pageTitle: string;
  faqs: FAQItem[];
};

export default function ChatbotDrawer({ isOpen, onClose, pageTitle, faqs }: ChatbotDrawerProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const toggleFaq = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="chatbot-panel">
      <header className="chatbot-header">
        <div className="chatbot-header-info">
          <div className="chatbot-avatar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="3" />
              <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
              <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
              <path d="M12 2v5m-4 4V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <div className="chatbot-title-wrap">
            <strong>EliteCruit Assistant</strong>
            <small>{pageTitle} Guide</small>
          </div>
        </div>
        <button type="button" className="chatbot-close-btn" onClick={onClose} title="Close Assistant">
          ✕
        </button>
      </header>

      <div className="chatbot-body">
        <div className="chatbot-intro-box">
          <p>
            Welcome! I am your guide for <strong>{pageTitle}</strong>. Select a common question below to view details:
          </p>
          <span className="chatbot-faq-label">Common Questions:</span>
          <div className="chatbot-faq-list">
            {faqs.map((faq, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <div key={faq.question} className={`chatbot-accordion-item ${isExpanded ? "open" : ""}`}>
                  <button
                    type="button"
                    className="chatbot-faq-chip"
                    onClick={() => toggleFaq(index)}
                  >
                    <span>{faq.question}</span>
                    <span className={`chatbot-caret ${isExpanded ? "open" : ""}`}>▼</span>
                  </button>
                  {isExpanded && (
                    <div className="chatbot-answer-content">
                      <p>{faq.answer}</p>
                      {faq.actionLabel && faq.actionHref && (
                        <a href={faq.actionHref} className="chatbot-action-btn">
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
  );
}
