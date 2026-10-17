import React, { useEffect, useMemo, useState } from "react";
import { ChevronIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import UndoToast from "../../components/UndoToast";
import "../Applicant/Applicant-Dashboard.css";
import "./Employer-Dashboard.css";
import "./Employer-CompanyProfile.css";
import "./Employer-NoticesFaqs.css";

type EmployerIconName =
  | "dashboard"
  | "jobposts"
  | "applicant"
  | "screening"
  | "discovery"
  | "nearby"
  | "shortlisted"
  | "faq"
  | "feedback"
  | "company"
  | "messages"
  | "notifications"
  | "profile"
  | "chat"
  | "logout";

function EmployerIcon({ name }: { name: EmployerIconName }) {
  const icons: Record<EmployerIconName, JSX.Element> = {
    dashboard: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
    jobposts: <path d="M3 8h18v11H3V8Zm5-3h8v3H8V5Zm4 5v4m-2-2h4" />,
    applicant: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    screening: <path d="M11 4a7 7 0 1 0 4.4 12.4l4.1 4.1 1.5-1.5-4.1-4.1A7 7 0 0 0 11 4Z" />,
    discovery: <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4l-8 5-8-5V6l8 5 8-5v2Z" />,
    nearby: <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />,
    shortlisted: <path d="M12 2 5 5v6c0 5.5 3.9 9.9 7 11 3.1-1.1 7-5.5 7-11V5l-7-3Zm-1 12-3-3 1.4-1.4 1.6 1.6 3.6-3.6L16 9l-5 5Z" />,
    faq: <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1.6-6.5a2.5 2.5 0 0 0-2.1-2.5 2.5 2.5 0 0 0-2.5 2.5H7.5a4 4 0 0 1 4-4 4 4 0 0 1 4 4c0 1.5-1 2.3-1.9 3-.7.5-1.1.9-1.1 1.5h-2c0-1.5 1-2.3 1.9-3 .7-.5 1.2-.9 1.2-1.5Z" />,
    feedback: <path d="M4 11h3v9H4v-9Zm5 9V9.5L12.5 6h4.2c1 0 1.7 1 1.4 2l-1 3h2.6c1.1 0 1.9 1 1.5 2l-1.8 5.6c-.2.6-.8 1-1.4 1H9Z" />,
    company: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />,
    messages: <path d="M3 6h18v11H8l-5 4v-4H3V6Zm3 3h12M6 12h8" />,
    notifications: <path d="M12 3a5 5 0 0 1 5 5v2.8l1.4 2.3c.5.8 0 1.9-.9 1.9H6.5c-.9 0-1.4-1.1-.9-1.9L7 10.8V8a5 5 0 0 1 5-5Zm-2 14a2 2 0 1 0 4 0" />,
    profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    chat: <path d="M4 5h16v10H9l-5 4v-4H4V5Zm3 4h10M7 12h7" />,
    logout: <path d="M9 4H5v16h4M14 8l4 4-4 4M10 12h8" />,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

const SYSTEM_DEFAULT_ACCEPTANCE = `Dear {applicant_name},

Congratulations! We are pleased to inform you that your application for the position of "{job_title}" at {company_name} has been accepted.

Our hiring team was thoroughly impressed with your profile, qualifications, and experience. We will be reaching out to you shortly with onboarding instructions and next steps.

Thank you for choosing to grow your career with {company_name}!

Best regards,
{company_name} Recruitment Team`;

const SYSTEM_DEFAULT_REJECTION = `Dear {applicant_name},

Thank you for taking the time to apply for the position of "{job_title}" at {company_name}.

After careful consideration and review of all submissions, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current requirements.

We appreciate your interest in {company_name} and wish you the best of luck in your career pursuits.

Sincerely,
{company_name} Hiring Team`;

export default function EmployerNoticesFaqs() {
  const [activeTab, setActiveTab] = useState<"notices" | "faqs">("notices");
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const [userId, setUserId] = useState<number | null>(null);
  const companyLabel = useEmployerCompanyLabel("Employer");

  // Template state
  const [acceptanceTemplate, setAcceptanceTemplate] = useState(SYSTEM_DEFAULT_ACCEPTANCE);
  const [rejectionTemplate, setRejectionTemplate] = useState(SYSTEM_DEFAULT_REJECTION);
  const [defaultAcceptance, setDefaultAcceptance] = useState(SYSTEM_DEFAULT_ACCEPTANCE);
  const [defaultRejection, setDefaultRejection] = useState(SYSTEM_DEFAULT_REJECTION);
  const [savingCard, setSavingCard] = useState<"acceptance" | "denial" | null>(null);
  const [acceptanceStatus, setAcceptanceStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [denialStatus, setDenialStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // FAQ state
  const [pageMessage, setPageMessage] = useState("");
  const [faqs, setFaqs] = useState<Array<{ id: number; question: string; answer: string; question_type: string; is_active: number }>>([]);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", question_type: "Requirements", is_active: true });
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [faqDraft, setFaqDraft] = useState({ question: "", answer: "", question_type: "Requirements", is_active: true });

  const faqManagementFaqs: FAQItem[] = [
    {
      question: "What are Automated Hiring Notices?",
      answer: "Automated Hiring Notices are pre-configured message templates automatically delivered to applicants upon Acceptance or Denial in the Applicant Management module.",
    },
    {
      question: "How do dynamic tags work in notices?",
      answer: "Tags like {applicant_name}, {job_title}, and {company_name} are automatically replaced with the real applicant and job posting information when a decision is confirmed.",
    },
    {
      question: "How do company FAQs help applicants?",
      answer: "Your custom FAQs appear directly on your job postings when applicants click 'Ask Employer FAQs', reducing repetitive inquiries about hiring process and benefits.",
    },
  ];

  const faqTypeOptions = useMemo(() => [
    "Requirements",
    "Application Process",
    "Salary and Work Arrangement",
    "Company Information",
    "Documents",
    "Other",
  ], []);

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setPageMessage("Sign in as employer to access Hiring Notices & FAQs.");
      return;
    }

    try {
      const savedUser = JSON.parse(savedUserRaw) as { id?: number; role?: string };
      if (savedUser.role !== "employer" || !savedUser.id) {
        setPageMessage("This page is available to employer accounts.");
        return;
      }
      setUserId(savedUser.id);
    } catch {
      setPageMessage("Unable to read account session.");
    }
  }, []);

  // Load decision templates
  useEffect(() => {
    if (!userId) return;

    fetch(`/api/employers/${userId}/decision-templates`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setAcceptanceTemplate(data.acceptance_template || "");
        setRejectionTemplate(data.rejection_template || "");
        setDefaultAcceptance(data.default_acceptance || "");
        setDefaultRejection(data.default_rejection || "");
      })
      .catch((err) => {
        console.error("Error loading templates:", err);
      });
  }, [userId]);

  // Load FAQs
  useEffect(() => {
    if (!userId) return;

    fetch(`/api/employers/${userId}/faqs`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Unable to load FAQs.");
        setFaqs(Array.isArray(data?.faqs) ? data.faqs : []);
      })
      .catch(() => {});
  }, [userId]);

  const handleSaveCard = async (type: "acceptance" | "denial") => {
    if (!userId || savingCard) return;
    setSavingCard(type);
    if (type === "acceptance") setAcceptanceStatus(null);
    else setDenialStatus(null);

    try {
      const res = await fetch(`/api/employers/${userId}/decision-templates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptance_template: acceptanceTemplate,
          rejection_template: rejectionTemplate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unable to save template.");

      if (type === "acceptance") {
        setAcceptanceStatus({ type: "success", text: "Acceptance notice template saved successfully!" });
        setTimeout(() => setAcceptanceStatus(null), 3500);
      } else {
        setDenialStatus({ type: "success", text: "Denial notice template saved successfully!" });
        setTimeout(() => setDenialStatus(null), 3500);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to save template.";
      if (type === "acceptance") {
        setAcceptanceStatus({ type: "error", text: errMsg });
      } else {
        setDenialStatus({ type: "error", text: errMsg });
      }
    } finally {
      setSavingCard(null);
    }
  };

  const [undoToast, setUndoToast] = useState<{ message: string; onUndo: () => void } | null>(null);

  const handleResetCard = (type: "acceptance" | "denial") => {
    if (type === "acceptance") {
      const prev = acceptanceTemplate;
      setAcceptanceTemplate(defaultAcceptance || SYSTEM_DEFAULT_ACCEPTANCE);
      setUndoToast({
        message: "Acceptance notice template reset to default.",
        onUndo: () => setAcceptanceTemplate(prev),
      });
      setAcceptanceStatus({ type: "success", text: "Reset to default. Click 'Save Notice Template' to persist." });
      setTimeout(() => setAcceptanceStatus(null), 3500);
    } else {
      const prev = rejectionTemplate;
      setRejectionTemplate(defaultRejection || SYSTEM_DEFAULT_REJECTION);
      setUndoToast({
        message: "Denial notice template reset to default.",
        onUndo: () => setRejectionTemplate(prev),
      });
      setDenialStatus({ type: "success", text: "Reset to default. Click 'Save Notice Template' to persist." });
      setTimeout(() => setDenialStatus(null), 3500);
    }
  };

  const insertTag = (type: "acceptance" | "denial", tag: string) => {
    if (type === "acceptance") {
      setAcceptanceTemplate((prev) => `${prev} ${tag}`);
    } else {
      setRejectionTemplate((prev) => `${prev} ${tag}`);
    }
  };

  const renderPreview = (template: string) => {
    return template
      .replace(/\{applicant_name\}/g, "Juan Dela Cruz")
      .replace(/\{job_title\}/g, "Software Engineer")
      .replace(/\{company_name\}/g, companyLabel || "Cebuana");
  };

  const addFaq = async () => {
    if (!userId || isAddingFaq) return;
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      setPageMessage("Question and answer are required.");
      return;
    }
    setIsAddingFaq(true);
    setPageMessage("");
    try {
      const response = await fetch(`/api/employers/${userId}/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newFaq.question.trim(),
          answer: newFaq.answer.trim(),
          question_type: newFaq.question_type,
          is_active: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to create FAQ.");
      setFaqs((current) => [data.faq, ...current]);
      setNewFaq({ question: "", answer: "", question_type: "Requirements", is_active: true });
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to create FAQ.");
    } finally {
      setIsAddingFaq(false);
    }
  };

  const beginEditFaq = (faq: { id: number; question: string; answer: string; question_type: string; is_active: number }) => {
    setEditingFaqId(faq.id);
    setFaqDraft({
      question: faq.question,
      answer: faq.answer,
      question_type: faq.question_type || "Requirements",
      is_active: Boolean(faq.is_active),
    });
  };

  const saveFaqEdit = async (faqId: number) => {
    if (!userId) return;
    if (!faqDraft.question.trim() || !faqDraft.answer.trim()) {
      setPageMessage("Question and answer are required.");
      return;
    }
    try {
      const response = await fetch(`/api/employers/${userId}/faqs/${faqId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(faqDraft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to update FAQ.");
      setFaqs((current) => current.map((item) => (item.id === faqId ? data.faq : item)));
      setEditingFaqId(null);
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to update FAQ.");
    }
  };

  const toggleFaqActive = async (faq: { id: number; question: string; answer: string; question_type: string; is_active: number }) => {
    if (!userId) return;
    try {
      const updatedActive = faq.is_active ? 0 : 1;
      const response = await fetch(`/api/employers/${userId}/faqs/${faq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: faq.question,
          answer: faq.answer,
          question_type: faq.question_type,
          is_active: Boolean(updatedActive),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to update status.");
      setFaqs((current) => current.map((item) => (item.id === faq.id ? data.faq : item)));
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to update FAQ status.");
    }
  };

  const [faqToDelete, setFaqToDelete] = useState<FaqItem | null>(null);
  const [isDeletingFaq, setIsDeletingFaq] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const deleteFaq = (faq: FaqItem) => {
    setFaqToDelete(faq);
  };

  const handleConfirmDeleteFaq = async () => {
    if (!userId || !faqToDelete) return;
    try {
      setIsDeletingFaq(true);
      const response = await fetch(`/api/employers/${userId}/faqs/${faqToDelete.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to delete FAQ.");
      setFaqs((current) => current.filter((item) => item.id !== faqToDelete.id));
      if (editingFaqId === faqToDelete.id) {
        setEditingFaqId(null);
      }
      setFaqToDelete(null);
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to delete FAQ.");
    } finally {
      setIsDeletingFaq(false);
    }
  };

  return (
    <div className="appdash-page employer-page sidebar-visible">
      <aside className="appdash-sidebar" aria-label="Employer Navigation">
        <a href="/" className="appdash-brand"><strong>EliteCruit</strong><span>Employer Workspace</span></a>

        <div className="employer-links-wrap">
          <ul className="appdash-secondary-list">
            <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
            <li className="employer-screening-item">
              <a
                href="/employer-applicant-management"
                className="employer-screening-title"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest(".title-caret-btn")) {
                    e.preventDefault();
                    setIsScreeningOpen((prev) => !prev);
                  }
                }}
              >
                <span className="title-main">
                  <span className="item-icon"><EmployerIcon name="applicant" /></span>
                  <span>Applicant Management</span>
                </span>
                <span className="title-caret-btn" title="Toggle sub-menu">
                  <ChevronIcon direction={isScreeningOpen ? "down" : "up"} />
                </span>
              </a>
              {isScreeningOpen && (
                <ul className="appdash-menu-list">
                  <li><a href="/employer-applicant-management#applicant-screening"><span className="item-icon"><EmployerIcon name="screening" /></span><span>Applicant Screening</span></a></li>
                  <li><a href="/employer-applicant-management#shortlisted-candidates"><span className="item-icon"><EmployerIcon name="shortlisted" /></span><span>Shortlisted Candidates</span></a></li>
                  <li><a href="/employer-applicant-management#direct-invitations"><span className="item-icon"><EmployerIcon name="discovery" /></span><span>Recruitment List</span></a></li>
                </ul>
              )}
            </li>
            <li><a href="/employer-applicant-finder"><span className="item-icon"><EmployerIcon name="nearby" /></span><span>Applicant Finder</span></a></li>
            <li className="active"><a href="/employer-notices-faqs"><span className="item-icon"><EmployerIcon name="faq" /></span><span>Notices & FAQs</span></a></li>
            <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
            <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span>{unreadNotifCount > 0 && <span className="item-badge">{unreadNotifCount}</span>}</a></li>
            <li><a href="/feedback"><span className="item-icon"><EmployerIcon name="feedback" /></span><span>Feedback</span></a></li>
          </ul>
        </div>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((v) => !v)}>
            <span className="item-icon"><EmployerIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{companyLabel}</strong><small>Employer</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && (
            <div className="appdash-profile-menu">
              <a href="/employer-company-profile"><EmployerIcon name="profile" />Company Profile</a>
              <button
                type="button"
                className="appdash-profile-menu-btn"
                onClick={() => setIsLogoutModalOpen(true)}
              >
                <EmployerIcon name="logout" />Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="appdash-main company-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Hiring Notices & FAQs</strong></div></div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Hiring Notices & FAQs"
                customFaqs={faqManagementFaqs}
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        <section className="notices-page-card">
          {/* Navigation Tab Bar */}
          <div className="notices-tab-nav">
            <button
              type="button"
              className={`notices-tab-btn ${activeTab === "notices" ? "active" : ""}`}
              onClick={() => setActiveTab("notices")}
            >
              <svg
                className="tab-btn-icon"
                viewBox="0 0 24 24"
                width="17"
                height="17"
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
              <span className="tab-btn-text">Decision Notices (Automated Messages)</span>
            </button>
            <button
              type="button"
              className={`notices-tab-btn ${activeTab === "faqs" ? "active" : ""}`}
              onClick={() => setActiveTab("faqs")}
            >
              <svg
                className="tab-btn-icon"
                viewBox="0 0 24 24"
                width="17"
                height="17"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="tab-btn-text">Company FAQs</span>
              <span className="notices-tab-badge">{faqs.length}</span>
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: AUTOMATED DECISION NOTICES
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "notices" && (
            <div className="decision-notices-section">
              <div className="decision-templates-grid">
                {/* Acceptance Notice Card */}
                <div className="template-card acceptance">
                  <div className="template-card-head">
                    <div className="template-card-title-group">
                      <span className="template-badge acceptance">Acceptance</span>
                      <h3>Automated Offer / Acceptance Notice</h3>
                    </div>
                  </div>

                  <div className="template-card-body">
                    <div className="template-tags-bar">
                      <span>Insert tag:</span>
                      <button
                        type="button"
                        className="template-tag-chip"
                        onClick={() => insertTag("acceptance", "{applicant_name}")}
                        title="Candidate full name"
                      >
                        + &#123;applicant_name&#125;
                      </button>
                      <button
                        type="button"
                        className="template-tag-chip"
                        onClick={() => insertTag("acceptance", "{job_title}")}
                        title="Position applied for"
                      >
                        + &#123;job_title&#125;
                      </button>
                      <button
                        type="button"
                        className="template-tag-chip"
                        onClick={() => insertTag("acceptance", "{company_name}")}
                        title="Your company name"
                      >
                        + &#123;company_name&#125;
                      </button>
                    </div>

                    <textarea
                      className="template-textarea"
                      rows={9}
                      value={acceptanceTemplate}
                      onChange={(e) => setAcceptanceTemplate(e.target.value)}
                      placeholder="Write standard acceptance message..."
                    />

                    <div className="template-preview-box">
                      <span className="template-preview-label">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Applicant Preview
                      </span>
                      <div className="template-preview-content">
                        {renderPreview(acceptanceTemplate || defaultAcceptance)}
                      </div>
                    </div>
                  </div>

                  {acceptanceStatus && (
                    <div className={`template-card-msg ${acceptanceStatus.type}`}>
                      {acceptanceStatus.text}
                    </div>
                  )}

                  <div className="template-card-footer">
                    <button
                      type="button"
                      className="notices-reset-btn"
                      onClick={() => handleResetCard("acceptance")}
                      disabled={savingCard === "acceptance"}
                    >
                      Restore System Defaults
                    </button>
                    <button
                      type="button"
                      className="notices-save-btn"
                      onClick={() => handleSaveCard("acceptance")}
                      disabled={savingCard === "acceptance" || !acceptanceTemplate.trim()}
                    >
                      {savingCard === "acceptance" ? "Saving..." : "Save Notice Template"}
                    </button>
                  </div>
                </div>

                {/* Denial Notice Card */}
                <div className="template-card denial">
                  <div className="template-card-head">
                    <div className="template-card-title-group">
                      <span className="template-badge denial">Denial</span>
                      <h3>Automated Rejection / Denial Notice</h3>
                    </div>
                  </div>

                  <div className="template-card-body">
                    <div className="template-tags-bar">
                      <span>Insert tag:</span>
                      <button
                        type="button"
                        className="template-tag-chip"
                        onClick={() => insertTag("denial", "{applicant_name}")}
                        title="Candidate full name"
                      >
                        + &#123;applicant_name&#125;
                      </button>
                      <button
                        type="button"
                        className="template-tag-chip"
                        onClick={() => insertTag("denial", "{job_title}")}
                        title="Position applied for"
                      >
                        + &#123;job_title&#125;
                      </button>
                      <button
                        type="button"
                        className="template-tag-chip"
                        onClick={() => insertTag("denial", "{company_name}")}
                        title="Your company name"
                      >
                        + &#123;company_name&#125;
                      </button>
                    </div>

                    <textarea
                      className="template-textarea"
                      rows={9}
                      value={rejectionTemplate}
                      onChange={(e) => setRejectionTemplate(e.target.value)}
                      placeholder="Write standard denial message..."
                    />

                    <div className="template-preview-box">
                      <span className="template-preview-label">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Applicant Preview
                      </span>
                      <div className="template-preview-content">
                        {renderPreview(rejectionTemplate || defaultRejection)}
                      </div>
                    </div>
                  </div>

                  {denialStatus && (
                    <div className={`template-card-msg ${denialStatus.type}`}>
                      {denialStatus.text}
                    </div>
                  )}

                  <div className="template-card-footer">
                    <button
                      type="button"
                      className="notices-reset-btn"
                      onClick={() => handleResetCard("denial")}
                      disabled={savingCard === "denial"}
                    >
                      Restore System Defaults
                    </button>
                    <button
                      type="button"
                      className="notices-save-btn"
                      onClick={() => handleSaveCard("denial")}
                      disabled={savingCard === "denial" || !rejectionTemplate.trim()}
                    >
                      {savingCard === "denial" ? "Saving..." : "Save Notice Template"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: COMPANY FAQS
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "faqs" && (
            <div className="company-faqs-section">
              <div className="faq-composer">
                <input
                  placeholder="Question"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq((current) => ({ ...current, question: e.target.value }))}
                />
                <select
                  value={newFaq.question_type}
                  onChange={(e) => setNewFaq((current) => ({ ...current, question_type: e.target.value }))}
                >
                  {faqTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  placeholder="Answer"
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq((current) => ({ ...current, answer: e.target.value }))}
                />
                <div className="faq-composer-footer">
                  <button type="button" onClick={addFaq} disabled={isAddingFaq}>
                    {isAddingFaq ? "Adding..." : "Add FAQ"}
                  </button>
                </div>
              </div>

              <div className="faqs-created-container">
                <h3>FAQ's Created</h3>
                <span className="entry-count">{faqs.length} {faqs.length === 1 ? "entry" : "entries"}</span>
              </div>

              {faqs.map((faq) => (
                <div className={`faq-item ${editingFaqId === faq.id ? "editing" : ""}`} key={faq.id}>
                  {editingFaqId === faq.id ? (
                    <div className="faq-edit-form">
                      <div className="faq-edit-grid">
                        <label>
                          <span>Question</span>
                          <input
                            value={faqDraft.question}
                            onChange={(e) => setFaqDraft((current) => ({ ...current, question: e.target.value }))}
                            placeholder="Enter question"
                          />
                        </label>
                        <label>
                          <span>Question Type</span>
                          <select
                            value={faqDraft.question_type}
                            onChange={(e) => setFaqDraft((current) => ({ ...current, question_type: e.target.value }))}
                          >
                            {faqTypeOptions.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </label>
                        <label className="full-width">
                          <span>Answer</span>
                          <textarea
                            rows={3}
                            value={faqDraft.answer}
                            onChange={(e) => setFaqDraft((current) => ({ ...current, answer: e.target.value }))}
                            placeholder="Enter answer"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="faq-preview-content">
                      <div className="faq-header-line">
                        <h4>{faq.question}</h4>
                        <span className="faq-type-badge">{faq.question_type || "Requirements"}</span>
                        <span className={`faq-status-text ${faq.is_active ? "active" : "inactive"}`}>
                          {faq.is_active ? "(Active)" : "(Not Active)"}
                        </span>
                      </div>
                      <p>{faq.answer}</p>
                    </div>
                  )}
                  <div className="faq-actions">
                    {editingFaqId === faq.id ? (
                      <>
                        <button type="button" className="save-btn" onClick={() => saveFaqEdit(faq.id)}>Save</button>
                        <button type="button" onClick={() => setEditingFaqId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => beginEditFaq(faq)}>Edit</button>
                        <button type="button" onClick={() => toggleFaqActive(faq)}>
                          {faq.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" className="danger" onClick={() => deleteFaq(faq)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {pageMessage && <p className="profile-message">{pageMessage}</p>}

        {/* DELETE FAQ CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={Boolean(faqToDelete)}
          type="danger"
          title="Delete Company FAQ"
          message={
            <div>
              <p style={{ margin: "0 0 8px" }}>
                Are you sure you want to delete this FAQ: <strong>"{faqToDelete?.question}"</strong>?
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                It will be immediately removed from applicant view across all your job postings.
              </p>
            </div>
          }
          cancelLabel="Cancel"
          confirmLabel="Delete FAQ"
          isConfirming={isDeletingFaq}
          onCancel={() => setFaqToDelete(null)}
          onConfirm={handleConfirmDeleteFaq}
        />

        {/* LOGOUT CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={isLogoutModalOpen}
          type="info"
          title="Log Out of EliteCruit"
          message="Are you sure you want to log out of your employer account?"
          cancelLabel="Stay Signed In"
          confirmLabel="Log Out"
          onCancel={() => setIsLogoutModalOpen(false)}
          onConfirm={() => {
            localStorage.removeItem("elitecruit-user");
            window.location.href = "/";
          }}
        />

        {/* UNDO TOAST FOR RESET TEMPLATES */}
        {undoToast && (
          <UndoToast
            message={undoToast.message}
            onUndo={undoToast.onUndo}
            onClose={() => setUndoToast(null)}
          />
        )}
      </main>
    </div>
  );
}

