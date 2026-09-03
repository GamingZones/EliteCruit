import React, { useEffect, useMemo, useState } from "react";
import { ChevronIcon, SideIcon } from "../Applicant/Applicant-Dashboard";
import { useEmployerCompanyLabel } from "../useEmployerCompanyLabel";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import "../Applicant/Applicant-Dashboard.css";
import "./Employer-Dashboard.css";
import "./Employer-CompanyProfile.css";

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

export default function EmployerFaqManagement() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const faqManagementFaqs: FAQItem[] = [
    {
      question: "How do company FAQs help applicants?",
      answer: "Your custom FAQs appear directly on your job postings when applicants click 'Ask Employer FAQs', reducing repetitive inquiries about hiring process and benefits.",
    },
    {
      question: "How do I add a new FAQ for my company?",
      answer: "Fill out the 'Add New FAQ' form with a Question Type (Requirements, Benefits, Work Setup), Question text, and Answer, then click 'Save FAQ'.",
    },
    {
      question: "Can I temporarily hide a FAQ without deleting it?",
      answer: "Yes! Toggle the Active/Inactive switch next to any FAQ to hide it from jobseekers without deleting the content.",
    },
  ];
  const [pageMessage, setPageMessage] = useState("");
  const [faqs, setFaqs] = useState<Array<{ id: number; question: string; answer: string; question_type: string; is_active: number }>>([]);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", question_type: "Requirements", is_active: true });
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [faqDraft, setFaqDraft] = useState({ question: "", answer: "", question_type: "Requirements", is_active: true });
  const companyLabel = useEmployerCompanyLabel("Employer");

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
      setPageMessage("Sign in as employer to manage company FAQs.");
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

  useEffect(() => {
    if (!userId) return;

    fetch(`/api/employers/${userId}/faqs`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Unable to load FAQs.");
        setFaqs(Array.isArray(data?.faqs) ? data.faqs : []);
      })
      .catch(() => {
        // Keep empty FAQ list on first load failures.
      });
  }, [userId]);

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
      question_type: faq.question_type,
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
      setFaqs((current) => current.map((item) => item.id === faqId ? data.faq : item));
      setEditingFaqId(null);
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to update FAQ.");
    }
  };

  const toggleFaqActive = async (faq: { id: number; question: string; answer: string; question_type: string; is_active: number }) => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/employers/${userId}/faqs/${faq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: faq.question,
          answer: faq.answer,
          question_type: faq.question_type,
          is_active: !faq.is_active,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to update FAQ status.");
      setFaqs((current) => current.map((item) => item.id === faq.id ? data.faq : item));
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to update FAQ status.");
    }
  };

  const deleteFaq = async (faqId: number) => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/employers/${userId}/faqs/${faqId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to delete FAQ.");
      setFaqs((current) => current.filter((item) => item.id !== faqId));
      if (editingFaqId === faqId) {
        setEditingFaqId(null);
      }
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to delete FAQ.");
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
            <li className="active"><a href="/employer-faq-management"><span className="item-icon"><EmployerIcon name="faq" /></span><span>FAQ Management</span></a></li>
            <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span></a></li>
            <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span><span className="item-badge">8</span></a></li>
            <li><a href="/feedback"><span className="item-icon"><EmployerIcon name="feedback" /></span><span>Feedback</span></a></li>
          </ul>
        </div>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((v) => !v)}>
            <span className="item-icon"><EmployerIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{companyLabel}</strong><small>Employer</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && <div className="appdash-profile-menu"><a href="/employer-company-profile"><EmployerIcon name="profile" />Company Profile</a><a href="/"><EmployerIcon name="logout" />Logout</a></div>}
        </div>
      </aside>

      <main className="appdash-main company-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>FAQ Management</strong></div></div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="FAQ Management"
                customFaqs={faqManagementFaqs}
              />
            </div>
          </div>
        </header>

        <section className="company-card company-section">
          <div className="section-head">
            <h2>Company FAQ Management</h2>
          </div>
          <p>Company-controlled recruitment answers shown to applicants through chatbot support.</p>
          
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
                    <button type="button" className="danger" onClick={() => deleteFaq(faq.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
        {pageMessage && <p className="profile-message">{pageMessage}</p>}
      </main>
    </div>
  );
}
