import React, { useEffect, useMemo, useState } from "react";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import { useEmployerCompanyLabel } from "./useEmployerCompanyLabel";
import ChatbotDrawer, { FAQItem } from "../components/ChatbotDrawer";
import "./Applicant-Dashboard.css";
import "./ApplicantDashboardOverrides.css";
import "./Employer-Dashboard.css";
import "./Employer-JobPosts.css";

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

export default function EmployerJobPosts() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const createJobPostFaqs: FAQItem[] = [
    {
      question: "What details are required to publish a job post?",
      answer: "Job Title, Location, Application Limit (1-100), Work Arrangement, Auto-Close Date, Salary Range (Min & Max), Description, Qualifications, and Required Skills are required.",
    },
    {
      question: "How do skills and qualifications impact candidate matching?",
      answer: "The skills and qualifications you select are directly compared against applicant profiles to generate automatic candidate Match Scores and smart recommendations.",
    },
    {
      question: "What happens when I mark a job post as Urgent?",
      answer: "Marking a job as Urgent adds a red badge to the job card and automatically sets an auto-close date 7 days from today to accelerate hiring.",
    },
  ];
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    location: "",
    application_limit: "",
    work_arrangement: "",
    close_date: "",
    is_urgent: false,
    salary_min: "",
    salary_max: "",
    description: "",
    qualifications: "",
    responsibilities: "",
    required_skills: "",
  });
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [applicationLimitNotice, setApplicationLimitNotice] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [pendingSkill, setPendingSkill] = useState("");
  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);
  const [pendingQualification, setPendingQualification] = useState("");
  const companyLabel = useEmployerCompanyLabel("Employer");
  const isEditMode = useMemo(() => Number.isInteger(editingJobId) && Number(editingJobId) > 0, [editingJobId]);

  const locationOptions = [
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

  const requiredSkillsOptions = [
    "Java",
    "Python",
    "JavaScript",
    "TypeScript",
    "SQL",
    "Database Management",
    "Data Structures and Algorithms",
    "Object-Oriented Programming",
    "Web Development",
    "API Development",
    "React",
    "Node.js",
    "Git Version Control",
    "Software Testing",
    "UI/UX Fundamentals",
    "Cloud Fundamentals",
  ];

  const requiredQualificationsOptions = [
    "BS Information Technology (BSIT)",
    "BS Computer Science (BSCS)",
    "Capstone Project Completion",
    "Internship / OJT Completion",
    "Database Management Training",
    "Web Development Bootcamp",
    "Software Engineering Training",
    "Data Analytics Training",
  ];

  const formatSalary = (value: string) => {
    const raw = value.replace(/,/g, "").trim();
    if (!raw) return "";
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) return "";
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseSalaryInteger = (value: string | null | undefined): string => {
    if (!value) return "";
    const raw = String(value).replace(/,/g, "").trim();
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount >= 0) {
      return String(Math.round(amount));
    }
    return raw.replace(/\D/g, "");
  };

  const normalizeSalaryInput = (value: string) => {
    const raw = value.replace(/,/g, "").trim();
    if (!raw) return "";
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount >= 0) {
      return String(Math.round(amount));
    }
    return value.replace(/\D/g, "");
  };

  const toSalaryPayload = (value: string) => {
    const raw = value.replace(/,/g, "").trim();
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount >= 0) {
      return String(Math.round(amount));
    }
    return "";
  };

  const mmddyyyyToDateInput = (value: string) => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    const mm = match[1];
    const dd = match[2];
    const yyyy = match[3];
    return `${yyyy}-${mm}-${dd}`;
  };

  const dateInputToMmddyyyy = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";
    const yyyy = match[1];
    const mm = match[2];
    const dd = match[3];
    return `${mm}/${dd}/${yyyy}`;
  };

  const plusDaysAsMmddyyyy = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  };

  const validateApplicationLimit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Application limit is required.";
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1) return "Application limit must be between 1 and 100.";
    if (parsed > 100) return "Application limit cannot exceed 100.";
    return "";
  };

  const getFieldError = (fieldName: keyof typeof form) => {
    const value = form[fieldName];
    if (fieldName === "title" && !value.trim()) return "Job title is required.";
    if (fieldName === "location" && !value.trim()) return "Location is required.";
    if (fieldName === "application_limit") return validateApplicationLimit(value);
    if (fieldName === "work_arrangement" && !value.trim()) return "Work arrangement is required.";
    if (fieldName === "close_date" && !value.trim()) return "Auto-close date is required.";
    if (fieldName === "salary_min") {
      if (!value.trim()) return "Minimum salary is required.";
      const parsed = Number(toSalaryPayload(value));
      if (!Number.isFinite(parsed) || parsed < 0) return "Minimum salary format is incorrect.";
    }
    if (fieldName === "salary_max") {
      if (!value.trim()) return "Maximum salary is required.";
      const parsed = Number(toSalaryPayload(value));
      if (!Number.isFinite(parsed) || parsed < 0) return "Maximum salary format is incorrect.";
      const minParsed = Number(toSalaryPayload(form.salary_min));
      if (Number.isFinite(minParsed) && parsed < minParsed) return "Maximum salary must be greater than or equal to minimum salary.";
    }
    if (fieldName === "description" && !value.trim()) return "Job description is required.";
    if (fieldName === "qualifications" && !value.trim()) return "Required qualifications are incomplete.";
    if (fieldName === "required_skills" && !value.trim()) return "Required skills are incomplete.";
    return "";
  };

  const shouldShowFieldError = (fieldName: keyof typeof form) => Boolean(touchedFields[fieldName] && getFieldError(fieldName) && focusedField !== fieldName);
  const requiredFieldOrder: Array<keyof typeof form> = [
    "title",
    "location",
    "application_limit",
    "work_arrangement",
    "close_date",
    "salary_min",
    "salary_max",
    "description",
    "qualifications",
    "required_skills",
  ];

  const completionChecks = useMemo(() => {
    const hasTitle = !!form.title.trim();
    const hasLocation = !!form.location.trim();
    const hasApplicationLimit = !!form.application_limit.trim();
    const hasWorkArrangement = !!form.work_arrangement.trim();
    const hasCloseDate = !!form.close_date.trim();
    const hasSalaryMin = !!form.salary_min.trim();
    const hasSalaryMax = !!form.salary_max.trim();
    const hasDescription = !!form.description.trim();
    const hasQualifications = !!form.qualifications.trim();
    const hasSkills = !!form.required_skills.trim();

    const allChecks = [
      hasTitle,
      hasLocation,
      hasApplicationLimit,
      hasWorkArrangement,
      hasCloseDate,
      hasSalaryMin,
      hasSalaryMax,
      hasDescription,
      hasQualifications,
      hasSkills,
    ];

    const done = allChecks.filter(Boolean).length;
    const percent = Math.round((done / allChecks.length) * 100);
    const colorBand = percent <= 50 ? "red" : percent <= 80 ? "yellow" : "green";

    return {
      hasTitle,
      hasLocation,
      hasApplicationLimit,
      hasWorkArrangement,
      hasCloseDate,
      hasSalaryMin,
      hasSalaryMax,
      hasDescription,
      hasQualifications,
      hasSkills,
      percent,
      colorBand,
    };
  }, [form]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editIdRaw = params.get("edit");
    const editId = Number(editIdRaw);
    if (!Number.isInteger(editId) || editId < 1) return;

    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) return;
    try {
      const savedUser = JSON.parse(savedUserRaw) as { id?: number; role?: string };
      if (savedUser.role !== "employer" || !savedUser.id) return;
      setEditingJobId(editId);
      fetch(`/api/employers/${savedUser.id}/job-posts/${editId}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data?.message || "Unable to load job post.");
          const job = data?.jobPost || {};
          const parsedSkills = job.required_skills
            ? String(job.required_skills).split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 5)
            : [];
          const parsedQuals = job.qualifications
            ? String(job.qualifications).split(",").map((q: string) => q.trim()).filter(Boolean).slice(0, 3)
            : [];
          setSelectedSkills(parsedSkills);
          setSelectedQualifications(parsedQuals);
          setForm({
            title: job.title || "",
            location: job.location || "",
            application_limit: String(job.application_limit ?? ""),
            work_arrangement: job.work_arrangement || "",
            close_date: job.close_date || "",
            is_urgent: !!job.is_urgent,
            salary_min: formatSalary(String(job.salary_min ?? "")),
            salary_max: formatSalary(String(job.salary_max ?? "")),
            description: job.description || "",
            qualifications: parsedQuals.join(", "),
            responsibilities: job.responsibilities || "",
            required_skills: parsedSkills.join(", "),
          });
        })
        .catch((error) => setProfileMessage(error instanceof Error ? error.message : "Unable to load job post."));
    } catch {
      // Ignore malformed saved session payload.
    }
  }, []);

  const setField = (name: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "application_limit") setApplicationLimitNotice("");
  };

  const addSkill = () => {
    if (!pendingSkill || selectedSkills.length >= 5) return;
    if (!selectedSkills.includes(pendingSkill)) {
      const next = [...selectedSkills, pendingSkill];
      setSelectedSkills(next);
      setField("required_skills", next.join(", "));
      setPendingSkill("");
      setTouchedFields((current) => ({ ...current, required_skills: true }));
    }
  };

  const removeSkill = (skill: string) => {
    const next = selectedSkills.filter((s) => s !== skill);
    setSelectedSkills(next);
    setField("required_skills", next.join(", "));
    setTouchedFields((current) => ({ ...current, required_skills: true }));
  };

  const addQualification = () => {
    if (!pendingQualification || selectedQualifications.length >= 3) return;
    if (!selectedQualifications.includes(pendingQualification)) {
      const next = [...selectedQualifications, pendingQualification];
      setSelectedQualifications(next);
      setField("qualifications", next.join(", "));
      setPendingQualification("");
      setTouchedFields((current) => ({ ...current, qualifications: true }));
    }
  };

  const removeQualification = (qual: string) => {
    const next = selectedQualifications.filter((q) => q !== qual);
    setSelectedQualifications(next);
    setField("qualifications", next.join(", "));
    setTouchedFields((current) => ({ ...current, qualifications: true }));
  };

  const setUrgent = (value: boolean) => {
    setForm((current) => ({
      ...current,
      is_urgent: value,
      close_date: value ? plusDaysAsMmddyyyy(7) : current.close_date,
    }));
    setTouchedFields((current) => ({ ...current, close_date: true }));
  };

  const onFieldFocus = (fieldName: keyof typeof form) => {
    setFocusedField(fieldName);
    if (fieldName === "salary_min" || fieldName === "salary_max") {
      const currentVal = form[fieldName];
      const parsed = parseSalaryInteger(currentVal);
      if (parsed !== currentVal) {
        setField(fieldName, parsed);
      }
    }
  };

  const onFieldBlur = (fieldName: keyof typeof form) => {
    setFocusedField((current) => (current === fieldName ? null : current));
    setTouchedFields((current) => ({ ...current, [fieldName]: true }));

    if (fieldName === "application_limit") {
      const raw = form.application_limit.trim();
      if (!raw) return;
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 100) {
        setField("application_limit", "100");
        setApplicationLimitNotice("Exceeded maximum limit. Value was automatically set to 100.");
      }
      return;
    }

    if (fieldName === "salary_min") {
      setField("salary_min", formatSalary(form.salary_min));
      return;
    }

    if (fieldName === "salary_max") {
      setField("salary_max", formatSalary(form.salary_max));
    }
  };

  const publishJob = async () => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setProfileMessage("Sign in as employer to publish a job.");
      return;
    }

    let employerId: number | null = null;
    try {
      const savedUser = JSON.parse(savedUserRaw) as { id?: number; role?: string };
      if (savedUser.role !== "employer" || !savedUser.id) {
        setProfileMessage("This action is only available to employer accounts.");
        return;
      }
      employerId = savedUser.id;
    } catch {
      setProfileMessage("Unable to read account session.");
      return;
    }

    const firstInvalidField = requiredFieldOrder.find((fieldName) => !!getFieldError(fieldName));
    if (firstInvalidField) {
      const nextTouchedFields = requiredFieldOrder.reduce<Record<string, boolean>>((accumulator, fieldName) => {
        accumulator[fieldName] = true;
        return accumulator;
      }, {});
      setTouchedFields(nextTouchedFields);
      setProfileMessage("");

      window.requestAnimationFrame(() => {
        const firstInvalidElement = document.querySelector<HTMLElement>(`[data-field='${firstInvalidField}']`);
        if (!firstInvalidElement) return;
        firstInvalidElement.scrollIntoView({ behavior: "smooth", block: "center" });
        if ("focus" in firstInvalidElement) firstInvalidElement.focus();
      });
      return;
    }

    setIsPublishing(true);
    setProfileMessage("");
    try {
      const response = await fetch(
        isEditMode ? `/api/employers/${employerId}/job-posts/${editingJobId}` : `/api/employers/${employerId}/job-posts`,
        {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          location: form.location,
          application_limit: form.application_limit,
          work_arrangement: form.work_arrangement,
          close_date: form.close_date,
          is_urgent: form.is_urgent,
          salary_min: toSalaryPayload(form.salary_min),
          salary_max: toSalaryPayload(form.salary_max),
          description: form.description,
          qualifications: form.qualifications,
          responsibilities: form.responsibilities || form.description || "Not provided",
          required_skills: form.required_skills,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || (isEditMode ? "Unable to update job." : "Unable to publish job."));
      setProfileMessage(isEditMode ? "Job post updated successfully." : `Job post published successfully.`);
      window.location.href = "/employer-job-posts";
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : (isEditMode ? "Unable to update job." : "Unable to publish job."));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="appdash-page employer-page sidebar-visible">
      <aside className="appdash-sidebar" aria-label="Employer Navigation">
        <a href="/" className="appdash-brand"><strong>EliteCruit</strong><span>Employer Workspace</span></a>

        <div className="employer-links-wrap">
          <ul className="appdash-secondary-list employer-main-links">
            <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li className="active"><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
          </ul>

          <div className="appdash-menu-block employer-screening-block">
            <button className="appdash-menu-title employer-screening-title" type="button" onClick={() => setIsScreeningOpen((v) => !v)}>
              <span className="title-main">
                <span className="item-icon"><EmployerIcon name="applicant" /></span>
                <a href="/employer-applicant-management" onClick={(e) => e.stopPropagation()} className="sidebar-link-title">Applicant Management</a>
              </span>
              <span className={`title-caret ${isScreeningOpen ? "open" : "closed"}`}><ChevronIcon direction={isScreeningOpen ? "down" : "up"} /></span>
            </button>
            {isScreeningOpen && (
              <ul className="appdash-menu-list">
                <li><a href="/employer-applicant-management#applicant-screening"><span className="item-icon"><EmployerIcon name="screening" /></span><span>Applicant Screening</span></a></li>
                <li><a href="/employer-applicant-management#shortlisted-candidates"><span className="item-icon"><EmployerIcon name="shortlisted" /></span><span>Shortlisted Candidates</span></a></li>
                <li><a href="/employer-applicant-management#direct-invitations"><span className="item-icon"><EmployerIcon name="discovery" /></span><span>Recruitment List</span></a></li>
              </ul>
            )}
          </div>

          <ul className="appdash-secondary-list">
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

      <main className="appdash-main jobpost-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Job Posts</strong></div></div>
          <div className="appdash-top-right">
            <a className="cancel-btn" href="/employer-job-posts">All Job Posts</a>
            <div className="chatbot-wrapper">
              <button
                type="button"
                className="chatbot-button"
                onClick={() => setIsChatbotOpen((prev) => !prev)}
              >
                <SideIcon name="chat" />
                ChatBot
              </button>

              <ChatbotDrawer
                isOpen={isChatbotOpen}
                onClose={() => setIsChatbotOpen(false)}
                pageTitle="Create Job Post"
                faqs={createJobPostFaqs}
              />
            </div>
          </div>
        </header>

        <section className="jobpost-hero">
          <div>
            <h1>{isEditMode ? "Edit Job Post" : "Post a New Job"}</h1>
            <p>Fill in the details to create a job posting. Clear role details help applicants understand fit and improve candidate matching quality.</p>
          </div>
          <div className="jobpost-hero-actions">
            <button type="button" className="publish-btn" onClick={publishJob} disabled={isPublishing}>{isPublishing ? (isEditMode ? "Updating..." : "Publishing...") : (isEditMode ? "Update Job" : "Publish Job")}</button>
            <a className="cancel-btn" href="/employer-job-posts">Cancel</a>
          </div>
        </section>

        <section className="posting-complete-card">
          <div className="complete-head"><h2>Posting Completeness</h2><span className={`complete-percent ${completionChecks.colorBand}`}>{completionChecks.percent}% Complete</span></div>
          <p>Complete role details help employers publish higher-quality job posts.</p>
          <div className="complete-bar"><i className={completionChecks.colorBand} style={{ width: `${completionChecks.percent}%` }} /></div>
          <div className="complete-checks">
            <span>{completionChecks.hasTitle ? "◉" : "○"} Job Title</span>
            <span>{completionChecks.hasLocation ? "◉" : "○"} Location</span>
            <span>{completionChecks.hasApplicationLimit ? "◉" : "○"} Application Limit</span>
            <span>{completionChecks.hasWorkArrangement ? "◉" : "○"} Work Arrangement</span>
            <span>{completionChecks.hasCloseDate ? "◉" : "○"} Close Date</span>
            <span>{completionChecks.hasSalaryMin ? "◉" : "○"} Minimum Salary</span>
            <span>{completionChecks.hasSalaryMax ? "◉" : "○"} Maximum Salary</span>
            <span>{completionChecks.hasDescription ? "◉" : "○"} Description</span>
            <span>{completionChecks.hasQualifications ? "◉" : "○"} Qualifications</span>
            <span>{completionChecks.hasSkills ? "◉" : "○"} Required Skills</span>
          </div>
        </section>

        <section className="jobpost-grid">
          <article className="jobpost-form">
            <div className="jobpost-form-head">
              <h2>Job Information</h2>
              <div className="urgent-wrap">
                <label className="urgent-checkbox" htmlFor="urgent-hiring-input">
                  <input
                    id="urgent-hiring-input"
                    type="checkbox"
                    checked={form.is_urgent}
                    onChange={(event) => setUrgent(event.target.checked)}
                  />
                  <span className="urgent-checkbox-mark" aria-hidden="true" />
                </label>
                <div className={`urgent-indicator ${form.is_urgent ? "active" : ""}`} aria-label="Urgent Hiring status">
                  <span>Urgent Hiring</span>
                </div>
              </div>
            </div>
            <label className={shouldShowFieldError("title") ? "field-error" : ""}>Job Title *<input data-field="title" placeholder="e.g. Software Developer" value={form.title} onChange={(event) => setField("title", event.target.value)} onFocus={() => onFieldFocus("title")} onBlur={() => onFieldBlur("title")} />{shouldShowFieldError("title") && <small className="warning-text">{getFieldError("title")}</small>}</label>

            <div className="row-2">
              <label className={shouldShowFieldError("location") ? "field-error" : ""}>Location *<select data-field="location" value={form.location} onChange={(event) => setField("location", event.target.value)} onFocus={() => onFieldFocus("location")} onBlur={() => onFieldBlur("location")}><option value="">Select location</option>{locationOptions.map((locationOption) => <option key={locationOption} value={locationOption}>{locationOption}</option>)}</select>{shouldShowFieldError("location") && <small className="warning-text">{getFieldError("location")}</small>}</label>
              <label className={shouldShowFieldError("application_limit") ? "field-error" : ""}>Application Limit *<input data-field="application_limit" type="number" min={1} max={100} value={form.application_limit} onChange={(event) => setField("application_limit", event.target.value.replace(/\D/g, ""))} onFocus={() => onFieldFocus("application_limit")} onBlur={() => onFieldBlur("application_limit")} />{shouldShowFieldError("application_limit") && <small className="warning-text">{getFieldError("application_limit")}</small>}</label>
            </div>
            {!shouldShowFieldError("application_limit") && applicationLimitNotice && <small className="warning-text">{applicationLimitNotice}</small>}

            <div className="row-2">
              <label className={shouldShowFieldError("work_arrangement") ? "field-error" : ""}>Work Arrangement *<select data-field="work_arrangement" value={form.work_arrangement} onChange={(event) => setField("work_arrangement", event.target.value)} onFocus={() => onFieldFocus("work_arrangement")} onBlur={() => onFieldBlur("work_arrangement")}><option value="">Select work arrangement</option><option value="Remote">Remote</option><option value="On-Site">On-Site</option><option value="Hybrid">Hybrid</option><option value="Flexible">Flexible</option></select>{shouldShowFieldError("work_arrangement") && <small className="warning-text">{getFieldError("work_arrangement")}</small>}</label>
              <label className={shouldShowFieldError("close_date") ? "field-error" : ""}>Auto-Close Date (MM/DD/YYYY) *<input data-field="close_date" type="date" min="2025-01-01" disabled={form.is_urgent} value={mmddyyyyToDateInput(form.close_date)} onChange={(event) => setField("close_date", dateInputToMmddyyyy(event.target.value))} onFocus={() => onFieldFocus("close_date")} onBlur={() => onFieldBlur("close_date")} />{form.is_urgent && <small className="info-text">Urgent Hiring is enabled. Auto-Close Date is locked to one week from today.</small>}{shouldShowFieldError("close_date") && <small className="warning-text">{getFieldError("close_date")}</small>}</label>
            </div>

            <div className="row-2">
              <label className={shouldShowFieldError("salary_min") ? "field-error" : ""}>Minimum Salary (PHP) *<input data-field="salary_min" value={form.salary_min} onChange={(event) => setField("salary_min", normalizeSalaryInput(event.target.value))} onFocus={() => onFieldFocus("salary_min")} onBlur={() => onFieldBlur("salary_min")} />{shouldShowFieldError("salary_min") && <small className="warning-text">{getFieldError("salary_min")}</small>}</label>
              <label className={shouldShowFieldError("salary_max") ? "field-error" : ""}>Maximum Salary (PHP) *<input data-field="salary_max" value={form.salary_max} onChange={(event) => setField("salary_max", normalizeSalaryInput(event.target.value))} onFocus={() => onFieldFocus("salary_max")} onBlur={() => onFieldBlur("salary_max")} />{shouldShowFieldError("salary_max") && <small className="warning-text">{getFieldError("salary_max")}</small>}</label>
            </div>

            <label className={shouldShowFieldError("description") ? "field-error" : ""}>Job Description *<textarea data-field="description" rows={5} placeholder="Describe the role, responsibilities, and what makes this position attractive..." value={form.description} onChange={(event) => setField("description", event.target.value)} onFocus={() => onFieldFocus("description")} onBlur={() => onFieldBlur("description")} />{shouldShowFieldError("description") && <small className="warning-text">{getFieldError("description")}</small>}</label>

            <div className="picker-block">
              <label className={shouldShowFieldError("qualifications") ? "field-error" : ""}>
                Required Qualifications * <small className="tag-limit-label">(Up to 3 selections)</small>
              </label>

              {selectedQualifications.length > 0 && (
                <div className="selected-pills-row">
                  {selectedQualifications.map((item) => (
                    <span key={item} className="tag-pill">
                      <span>{item}</span>
                      <button
                        type="button"
                        className="pill-remove-btn"
                        aria-label={`Remove ${item}`}
                        onClick={() => removeQualification(item)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="select-add-row">
                <select
                  data-field="qualifications"
                  value={pendingQualification}
                  onChange={(event) => setPendingQualification(event.target.value)}
                  onFocus={() => onFieldFocus("qualifications")}
                  onBlur={() => onFieldBlur("qualifications")}
                  disabled={selectedQualifications.length >= 3}
                >
                  <option value="">Select from BSIT/BSCS options</option>
                  {requiredQualificationsOptions
                    .filter((opt) => !selectedQualifications.includes(opt))
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="add-pill-btn"
                  onClick={addQualification}
                  disabled={!pendingQualification || selectedQualifications.length >= 3}
                >
                  + Add
                </button>
              </div>
              {shouldShowFieldError("qualifications") && (
                <small className="warning-text">{getFieldError("qualifications")}</small>
              )}
            </div>

            <div className="picker-block">
              <label className={shouldShowFieldError("required_skills") ? "field-error" : ""}>
                Required Skills * <small className="tag-limit-label">(Up to 5 selections)</small>
              </label>

              {selectedSkills.length > 0 && (
                <div className="selected-pills-row">
                  {selectedSkills.map((item) => (
                    <span key={item} className="tag-pill">
                      <span>{item}</span>
                      <button
                        type="button"
                        className="pill-remove-btn"
                        aria-label={`Remove ${item}`}
                        onClick={() => removeSkill(item)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="select-add-row">
                <select
                  data-field="required_skills"
                  value={pendingSkill}
                  onChange={(event) => setPendingSkill(event.target.value)}
                  onFocus={() => onFieldFocus("required_skills")}
                  onBlur={() => onFieldBlur("required_skills")}
                  disabled={selectedSkills.length >= 5}
                >
                  <option value="">Select from BSIT/BSCS options</option>
                  {requiredSkillsOptions
                    .filter((opt) => !selectedSkills.includes(opt))
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="add-pill-btn"
                  onClick={addSkill}
                  disabled={!pendingSkill || selectedSkills.length >= 5}
                >
                  + Add
                </button>
              </div>
              {shouldShowFieldError("required_skills") && (
                <small className="warning-text">{getFieldError("required_skills")}</small>
              )}
            </div>
            {profileMessage && <p className="profile-message">{profileMessage}</p>}
          </article>
        </section>
      </main>
    </div>
  );
}
