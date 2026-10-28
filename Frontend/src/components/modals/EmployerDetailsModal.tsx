import React, { useState } from "react";
import "./EmployerDetailsModal.css";

export type EmployerModalData = {
  user_id?: number | string;
  id?: number | string;
  employer_user_id?: number | string;
  business_name?: string;
  company_name?: string;
  company_logo_path?: string | null;
  company_cover_path?: string | null;
  industry?: string;
  rating?: number | string | null;
  company_description?: string;
  description?: string;
  business_email?: string;
  email?: string;
  contact_number?: string;
  phone?: string;
  website?: string | null;
  company_address?: string;
  location?: string;
  city?: string;
  faqs?: Array<{ id: number | string; question: string; answer: string; question_type?: string }>;
};

export type EmployerDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  employer: EmployerModalData | null;
  topFloatingActions?: React.ReactNode;
  sidePanel?: React.ReactNode;
  customFooterActions?: React.ReactNode;
  isFaqOpen?: boolean;
  onFaqOpenChange?: (open: boolean) => void;
  zIndex?: number;
};

const DEFAULT_FAQS = [
  {
    id: 1,
    question: "How do I apply for jobs?",
    answer: "You can click the 'Apply' button on any job card. If your profile is complete, your application will be submitted immediately.",
    question_type: "Application",
  },
  {
    id: 2,
    question: "What does the match score mean?",
    answer: "The match score shows how well your profile skills, experience, and preferences match the job requirements.",
    question_type: "Matching",
  },
  {
    id: 3,
    question: "Can I save jobs for later?",
    answer: "Yes, you can bookmark or save jobs from the job list to review them anytime in your saved jobs tab.",
    question_type: "General",
  },
];

export default function EmployerDetailsModal({
  isOpen,
  onClose,
  employer,
  topFloatingActions,
  sidePanel,
  customFooterActions,
  isFaqOpen: isFaqOpenProp,
  onFaqOpenChange,
  zIndex,
}: EmployerDetailsModalProps) {
  const [internalFaqOpen, setInternalFaqOpen] = useState(false);
  const isFaqOpen = isFaqOpenProp !== undefined ? isFaqOpenProp : internalFaqOpen;
  const [expandedFaqIds, setExpandedFaqIds] = useState<(number | string)[]>([]);
  const [faqsList, setFaqsList] = useState<Array<{ id: number | string; question: string; answer: string; question_type?: string }>>(employer?.faqs || []);
  const [loadingFaqs, setLoadingFaqs] = useState(false);

  // Equal-height synchronization refs and state
  const panelRef = React.useRef<HTMLDivElement>(null);
  const bannerRef = React.useRef<HTMLDivElement>(null);
  const stripRef = React.useRef<HTMLDivElement>(null);
  const bodyWrapperRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const faqDrawerRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);
  const sidePanelSlotRef = React.useRef<HTMLDivElement>(null);
  const [matchedHeight, setMatchedHeight] = useState<number | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setInternalFaqOpen(false);
      if (onFaqOpenChange) onFaqOpenChange(false);
      setExpandedFaqIds([]);
    }
  }, [isOpen, onFaqOpenChange]);

  const handleToggleFaq = () => {
    const nextVal = !isFaqOpen;
    if (onFaqOpenChange) onFaqOpenChange(nextVal);
    setInternalFaqOpen(nextVal);
  };

  const handleCloseFaq = () => {
    if (onFaqOpenChange) onFaqOpenChange(false);
    setInternalFaqOpen(false);
  };

  React.useEffect(() => {
    if (employer?.faqs && employer.faqs.length > 0) {
      setFaqsList(employer.faqs);
      return;
    }
    const empId = employer?.user_id || employer?.id || employer?.employer_user_id;
    if (empId) {
      setLoadingFaqs(true);
      fetch(`/api/employers/${empId}/faqs`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data?.faqs)) {
            const activeFaqs = data.faqs.filter((f: any) => f.is_active !== 0);
            if (activeFaqs.length > 0) {
              setFaqsList(activeFaqs);
              return;
            }
          }
          setFaqsList(DEFAULT_FAQS);
        })
        .catch(() => setFaqsList(DEFAULT_FAQS))
        .finally(() => setLoadingFaqs(false));
    } else {
      setFaqsList(DEFAULT_FAQS);
    }
  }, [employer?.user_id, employer?.id, employer?.employer_user_id, employer?.faqs]);

  // Measure natural unconstrained height of Container 1 (Employer details)
  const measureH1 = React.useCallback(() => {
    if (!panelRef.current) return 0;
    const bannerH = bannerRef.current ? bannerRef.current.offsetHeight : 140;
    const stripH = stripRef.current ? stripRef.current.offsetHeight : 65;
    const footerH = footerRef.current ? footerRef.current.offsetHeight : 65;

    let bodyH = 0;
    if (isFaqOpen && faqDrawerRef.current) {
      const faqHeader = faqDrawerRef.current.querySelector(".jd-faq-header") as HTMLElement | null;
      const faqBody = faqDrawerRef.current.querySelector(".jd-faq-body") as HTMLElement | null;
      bodyH = (faqHeader?.offsetHeight || 50) + (faqBody?.scrollHeight || 200);
    } else if (bodyRef.current) {
      bodyH = bodyRef.current.scrollHeight || 180;
    }

    return bannerH + stripH + bodyH + footerH;
  }, [isFaqOpen]);

  // Measure natural unconstrained height of Container 2 (Side panel)
  const measureH2 = React.useCallback((h1: number) => {
    const slot = sidePanelSlotRef.current;
    if (!slot) return h1;
    const sideEl = slot.querySelector(".jd-side-comparison-panel") as HTMLElement | null;
    if (!sideEl) return slot.scrollHeight || h1;

    const isMsgPanel =
      sideEl.classList.contains("cand-message-side-panel") ||
      Boolean(sideEl.querySelector(".cand-msg-chat-body"));

    if (isMsgPanel) {
      // Direct message chat panel adapts to Container 1's height
      return h1;
    }

    // "Other Employer Jobs" panel
    const sideHeader = sideEl.querySelector(".jd-side-panel-header") as HTMLElement | null;
    const headerH = sideHeader?.offsetHeight || 60;
    const jobsBody = sideEl.querySelector(".jd-side-panel-body") as HTMLElement | null;
    if (jobsBody) {
      return headerH + (jobsBody.scrollHeight || 0);
    }

    return sideEl.scrollHeight || h1;
  }, []);

  // Equal height calculation: clamped by whichever container cannot expand further
  const calculateEqualHeight = React.useCallback(() => {
    if (!sidePanel || window.innerWidth <= 860) {
      setMatchedHeight(null);
      return;
    }

    const maxAllowed = Math.floor(window.innerHeight * 0.88 - 40);
    const minAllowed = 440;

    const h1 = measureH1();
    if (!h1) return;

    const h2 = measureH2(h1);

    const clampedH1 = Math.max(minAllowed, Math.min(h1, maxAllowed));
    const clampedH2 = Math.max(minAllowed, Math.min(h2, maxAllowed));

    // Whichever container cannot expand further dictates the shared equal height
    const equalH = Math.min(clampedH1, clampedH2);

    setMatchedHeight((prev) => {
      if (prev !== null && Math.abs(prev - equalH) <= 2) return prev;
      return equalH;
    });
  }, [sidePanel, measureH1, measureH2]);

  React.useEffect(() => {
    if (!isOpen || !sidePanel) {
      setMatchedHeight(null);
      return;
    }

    let rafId: number;
    const runMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        calculateEqualHeight();
      });
    };

    runMeasure();
    const t1 = setTimeout(runMeasure, 60);
    const t2 = setTimeout(runMeasure, 180);

    window.addEventListener("resize", runMeasure);

    let observer: MutationObserver | null = null;
    if (sidePanelSlotRef.current) {
      observer = new MutationObserver(() => {
        runMeasure();
      });
      observer.observe(sidePanelSlotRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", runMeasure);
      if (observer) observer.disconnect();
    };
  }, [isOpen, sidePanel, isFaqOpen, expandedFaqIds, employer, calculateEqualHeight]);

  if (!isOpen || !employer) return null;

  const empUserId = employer.user_id || employer.id || employer.employer_user_id;
  const companyName = employer.business_name || employer.company_name || "Employer";
  const aboutText = employer.company_description || employer.description || "No company description provided.";
  const businessEmail = employer.business_email || employer.email || "Not provided";
  const contactPhone = employer.contact_number || employer.phone || "Not provided";
  const headquarters = employer.company_address || employer.city || employer.location || "Cavite";
  const websiteUrl = employer.website;
  const industryText = employer.industry ? employer.industry.toUpperCase() : "GENERAL INDUSTRY";
  const ratingText = employer.rating ? Number(employer.rating).toFixed(1) : "0.0";

  const coverSrc = employer.company_cover_path
    ? employer.company_cover_path.startsWith("http") || employer.company_cover_path.startsWith("/api")
      ? employer.company_cover_path
      : empUserId ? `/api/employers/${empUserId}/cover` : null
    : empUserId ? `/api/employers/${empUserId}/cover` : null;

  const logoSrc = employer.company_logo_path
    ? employer.company_logo_path.startsWith("http") || employer.company_logo_path.startsWith("/api")
      ? employer.company_logo_path
      : empUserId ? `/api/employers/${empUserId}/logo` : null
    : empUserId ? `/api/employers/${empUserId}/logo` : null;

  const toggleFaq = (id: number | string) => {
    setExpandedFaqIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const panelContent = (
    <div
      ref={panelRef}
      className="jd-panel"
      style={matchedHeight ? { height: `${matchedHeight}px`, maxHeight: `${matchedHeight}px` } : undefined}
    >
      {/* Cover banner */}
      <div ref={bannerRef} className="jd-cover-banner">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={`${companyName} cover`}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
              const placeholder = e.currentTarget.parentElement?.querySelector(".jd-cover-placeholder") as HTMLElement;
              if (placeholder) placeholder.style.display = "flex";
            }}
          />
        ) : null}
        <div className="jd-cover-placeholder" style={{ display: coverSrc ? "none" : "flex" }}>
          <span>Company Cover</span>
        </div>
      </div>

      {/* Employer strip underneath banner */}
      <div ref={stripRef} className="jd-employer-strip">
        <div className="jd-employer-logo-info">
          <div
            className="jd-employer-logo"
            aria-label="Company logo"
            style={{ overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={companyName}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
                  }
                }}
              />
            ) : null}
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ display: logoSrc ? "none" : "block", width: "32px", height: "32px", stroke: "#0284c7" }}>
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
            </svg>
          </div>
          <div>
            <strong className="jd-employer-name">{companyName}</strong>
            <span className="jd-employer-location">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="13" height="13" fill="none" stroke="#5b8ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              {industryText}
            </span>
          </div>
        </div>

        <div className="jd-header-right-actions">
          <div className="rating-score-box" title="Company rating">
            <span className="star-icon">★</span>
            <span>{ratingText}</span>
          </div>
          <button
            type="button"
            className={`jd-faq-btn ${isFaqOpen ? "active" : ""}`}
            onClick={handleToggleFaq}
          >
            FAQ's
          </button>
        </div>
      </div>

      {/* Scrollable body & drawer container */}
      <div
        ref={bodyWrapperRef}
        className="jd-body-wrapper"
        style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div
          ref={bodyRef}
          className="jd-body"
          style={{ flex: 1, minHeight: 0, maxHeight: matchedHeight ? undefined : "calc(88vh - 280px)", overflowY: "auto", padding: "20px 24px" }}
        >
          {/* Section: Company Overview */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, marginBottom: "8px" }}>
              About Company
            </h3>
            <p className="company-modal-about" style={{ fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
              {aboutText}
            </p>
          </div>

          {/* Section: Contact & Company Information Cards */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, marginBottom: "12px" }}>
              Contact Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div className="company-info-card" style={{ padding: "12px 14px", borderRadius: "10px" }}>
                <small className="company-info-card-label" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>BUSINESS EMAIL</small>
                <span className="company-info-card-val" style={{ fontSize: "0.88rem", fontWeight: 600, wordBreak: "break-all" }}>
                  {businessEmail}
                </span>
              </div>

              <div className="company-info-card" style={{ padding: "12px 14px", borderRadius: "10px" }}>
                <small className="company-info-card-label" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>CONTACT NUMBER</small>
                <span className="company-info-card-val" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                  {contactPhone}
                </span>
              </div>

              {websiteUrl && (
                <div className="company-info-card" style={{ padding: "12px 14px", borderRadius: "10px" }}>
                  <small className="company-info-card-label" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>WEBSITE</small>
                  <a
                    href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0284c7", fontSize: "0.88rem", fontWeight: 600, textDecoration: "underline", wordBreak: "break-all" }}
                  >
                    {websiteUrl}
                  </a>
                </div>
              )}

              <div className="company-info-card" style={{ padding: "12px 14px", borderRadius: "10px" }}>
                <small className="company-info-card-label" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>HEADQUARTERS</small>
                <span className="company-info-card-val" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                  {headquarters}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Slide-in FAQ Drawer */}
        <div ref={faqDrawerRef} className={`jd-faq-drawer ${isFaqOpen ? "open" : ""}`}>
          <div className="jd-faq-header">
            <h3>Company FAQ's</h3>
            <button type="button" className="jd-faq-back-btn" aria-label="Back to company details" onClick={handleCloseFaq}>
              ←
            </button>
          </div>
          <div className="jd-faq-body">
            {loadingFaqs ? (
              <p className="jd-faq-loading">Loading FAQ's...</p>
            ) : faqsList.length === 0 ? (
              <p className="jd-faq-empty">No FAQ's created by this company yet.</p>
            ) : (
              faqsList.map((faq) => {
                const isExpanded = expandedFaqIds.includes(faq.id);
                return (
                  <div key={faq.id} className={`jd-faq-item ${isExpanded ? "expanded" : ""}`}>
                    <button
                      type="button"
                      className="jd-faq-question-btn"
                      onClick={() => toggleFaq(faq.id)}
                    >
                      <div className="jd-faq-q-left">
                        {faq.question_type && <span className="jd-faq-type-badge">{faq.question_type}</span>}
                        <span className="jd-faq-question-text">{faq.question}</span>
                      </div>
                      <span className="jd-faq-toggle-icon">{isExpanded ? "−" : "+"}</span>
                    </button>
                    {isExpanded && (
                      <div className="jd-faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div ref={footerRef} className="jd-footer" style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        {customFooterActions}
        <button
          type="button"
          className="cand-details-cancel-btn"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="jd-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Employer Details"
      style={zIndex ? { zIndex } : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`jd-modal-container ${sidePanel ? "with-side-panel" : ""}`}
        style={!sidePanel ? { maxWidth: "700px" } : undefined}
      >
        <div className="jd-panel-outer-wrap">
          {topFloatingActions && (
            <div className="jd-floating-tabs-container">
              {topFloatingActions}
            </div>
          )}
          {panelContent}
        </div>

        {sidePanel && (
          <div
            ref={sidePanelSlotRef}
            className="jd-side-panel-slot"
            style={matchedHeight ? { height: `${matchedHeight}px`, maxHeight: `${matchedHeight}px` } : undefined}
          >
            {sidePanel}
          </div>
        )}
      </div>
    </div>
  );
}
