import React, { useEffect, useState } from "react";
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

const CAVITE_CITIES = [
  "Alfonso, Cavite",
  "Amadeo, Cavite",
  "Bacoor, Cavite",
  "Carmona, Cavite",
  "Cavite City, Cavite",
  "Dasmariñas, Cavite",
  "General Mariano Alvarez (GMA), Cavite",
  "General Trias, Cavite",
  "Imus, Cavite",
  "Indang, Cavite",
  "Kawit, Cavite",
  "Magallanes, Cavite",
  "Maragondon, Cavite",
  "Mendez, Cavite",
  "Naic, Cavite",
  "Noveleta, Cavite",
  "Rosario, Cavite",
  "Silang, Cavite",
  "Tagaytay, Cavite",
  "Tanza, Cavite",
  "Ternate, Cavite",
  "Trece Martires City, Cavite",
];

type EmployerProfileForm = {
  business_name: string;
  industry: string;
  company_size: string;
  company_description: string;
  business_email: string;
  contact_number: string;
  company_address: string;
  website: string;
};

const emptyEmployerProfile: EmployerProfileForm = {
  business_name: "",
  industry: "",
  company_size: "",
  company_description: "",
  business_email: "",
  contact_number: "",
  company_address: "",
  website: "",
};

function normalizeEmployerProfile(source: any, fallback: EmployerProfileForm): EmployerProfileForm {
  return {
    business_name: source?.business_name ?? fallback.business_name,
    industry: source?.industry ?? fallback.industry,
    company_size: source?.company_size ?? fallback.company_size,
    company_description: source?.company_description ?? fallback.company_description,
    business_email: source?.business_email ?? source?.email ?? fallback.business_email,
    contact_number: source?.contact_number ?? fallback.contact_number,
    company_address: source?.company_address ?? fallback.company_address,
    website: source?.website ?? fallback.website,
  };
}

export default function EmployerCompanyProfile() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  const companyProfileFaqs: FAQItem[] = [
    {
      question: "Why is completing the company profile important?",
      answer: "A complete profile with company logo, description, address, and website increases applicant trust and improves candidate application rates.",
    },
    {
      question: "How do I update company address and contact details?",
      answer: "Click the 'Edit Contact Info' button to update your business email, contact number, website URL, and Cavite municipality address.",
    },
  ];
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [pageMessage, setPageMessage] = useState("");
  const [profile, setProfile] = useState<EmployerProfileForm>(emptyEmployerProfile);
  const [draft, setDraft] = useState(profile);
  const companyLabel = useEmployerCompanyLabel("Employer");
  const effectiveCompanyLabel = profile.business_name || companyLabel;

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setPageMessage("Sign in as employer to manage company profile.");
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

    fetch(`/api/employers/${userId}/profile`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Unable to load employer profile.");
        const loaded = normalizeEmployerProfile(data?.profile, emptyEmployerProfile);
        setProfile(loaded);
        setDraft(loaded);
      })
      .catch((error) => setPageMessage(error instanceof Error ? error.message : "Unable to load employer profile."));
  }, [userId]);

  const updateDraft = (name: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const saveProfile = async () => {
    if (!userId) return;
    setIsSaving(true);
    setPageMessage("");
    try {
      const response = await fetch(`/api/employers/${userId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to save employer profile.");
      const saved = normalizeEmployerProfile(data?.profile, draft);
      setProfile(saved);
      setDraft(saved);
      setIsEditingProfile(false);
      setIsEditingContact(false);
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to save employer profile.");
    } finally {
      setIsSaving(false);
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
            <li><a href="/employer-faq-management"><span className="item-icon"><EmployerIcon name="faq" /></span><span>FAQ Management</span></a></li>
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
          <div className="appdash-top-left"><div><strong>Company Profile</strong></div></div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Company Profile"
                customFaqs={companyProfileFaqs}
              />
            </div>
          </div>
        </header>

        <section className="company-card company-section">
          <div className="section-head"><h2>Company Branding</h2></div>
          <p>Company-owned visual assets. Images auto-fit into their preview containers with no crop or edit controls.</p>
          <div className="brand-note">Files are stored in the prototype session for demonstration purposes.</div>
          <div className="branding-grid">
            <div className="cover-preview">
              <div className="cover-placeholder">Cover image placeholder</div>
              <div className="brand-id"><span className="brand-logo">▣</span><div><strong>{effectiveCompanyLabel}</strong><small>{draft.industry || "Industry not set"}</small></div><span className="rating-score-box" style={{ marginLeft: "auto" }}><span className="star-icon">★</span>{(profile as any)?.rating ? Number((profile as any).rating).toFixed(1) : "0.0"}</span></div>
            </div>
            <div className="upload-pane">
              <div className="upload-card"><div><strong>Company Logo</strong><small>PNG, JPG, SVG up to 5 MB.</small></div><button type="button">Upload</button></div>
              <div className="upload-card"><div><strong>Company Cover Image</strong><small>PNG, JPG up to 10 MB.</small></div><button type="button">Upload</button></div>
            </div>
          </div>
        </section>

        <section className="company-card company-section">
          <div className="section-head"><h2>Company Profile Information</h2><button type="button" onClick={() => isEditingProfile ? saveProfile() : setIsEditingProfile(true)}>{isEditingProfile ? (isSaving ? "Saving..." : "Save") : "Edit"}</button></div>
          <p>Company-owned public profile data used throughout the employer workflow.</p>
          <div className="form-grid two-col">
            <label>Company Name<input value={draft.business_name} onChange={(e) => updateDraft("business_name", e.target.value)} readOnly={!isEditingProfile} /></label>
            <label>Industry<input value={draft.industry} onChange={(e) => updateDraft("industry", e.target.value)} readOnly={!isEditingProfile} /></label>
            <label>Company Size<select value={draft.company_size || ""} onChange={(e) => updateDraft("company_size", e.target.value)} disabled={!isEditingProfile}><option value="">Select company size</option><option value="1-10 employees">1-10 employees</option><option value="11-50 employees">11-50 employees</option><option value="50-200 employees">50-200 employees</option><option value="201-500 employees">201-500 employees</option><option value="500+ employees">500+ employees</option></select></label>
            <div className="ownership-box"><small>Ownership</small><p>This profile belongs to {effectiveCompanyLabel}, not to an individual employer account.</p></div>
          </div>
          <label>Company Description<textarea rows={4} value={draft.company_description} onChange={(e) => updateDraft("company_description", e.target.value)} readOnly={!isEditingProfile} /></label>
        </section>

        <section className="company-card company-section">
          <div className="section-head"><h2>Company Contact Information</h2><button type="button" onClick={() => isEditingContact ? saveProfile() : setIsEditingContact(true)}>{isEditingContact ? (isSaving ? "Saving..." : "Save") : "Edit"}</button></div>
          <p>Business contact details controlled by the company.</p>
          <div className="form-grid two-col">
            <label>Business Email<input value={draft.business_email} onChange={(e) => updateDraft("business_email", e.target.value)} readOnly={!isEditingContact} /></label>
            <label>Contact Number<input value={draft.contact_number} onChange={(e) => updateDraft("contact_number", e.target.value)} readOnly={!isEditingContact} /></label>
            <label>
              Company Address
              <select
                value={draft.company_address || ""}
                disabled={!isEditingContact}
                onChange={(e) => updateDraft("company_address", e.target.value)}
              >
                <option value="">Select company address / city</option>
                {CAVITE_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label>Website<input value={draft.website} onChange={(e) => updateDraft("website", e.target.value)} readOnly={!isEditingContact} /></label>
          </div>
        </section>
        {pageMessage && <p className="profile-message">{pageMessage}</p>}
      </main>
    </div>
  );
}
