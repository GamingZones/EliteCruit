import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, SideIcon } from "../Applicant/Applicant-Dashboard";
import { useEmployerCompanyLabel } from "../useEmployerCompanyLabel";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import {
  BSIT_BSCS_JOB_TITLES,
  BSIT_BSCS_SKILLS,
  BSIT_BSCS_QUALIFICATIONS,
  BSIT_BSCS_CERTIFICATIONS,
  CAVITE_CITIES,
  WORK_ARRANGEMENTS,
  EXPERIENCE_LEVELS,
  EXP_YEARS_OPTIONS,
  getKeywordsForJobRole,
} from "../../utils/filters";
import "../Applicant/Applicant-Dashboard.css";
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

type ItemWithExp = {
  name: string;
  years: string;
};

function parseItemsWithExp(raw?: string | null): ItemWithExp[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 5).map((p) => {
        if (typeof p === "object" && p !== null && p.name) {
          return { name: p.name, years: p.years || "1 year" };
        }
        return { name: String(p), years: "1 year" };
      });
    }
  } catch {}

  return raw
    .split(/[\n,;•|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((token) => {
      const match = token.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        return { name: match[1].trim(), years: match[2].trim() };
      }
      return { name: token, years: "1 year" };
    });
}

interface SearchableSelectProps {
  options: string[];
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onEnterAdd?: () => void;
  disabled?: boolean;
}

function SearchableSelect({
  options,
  placeholder = "Type or select option...",
  value,
  onChange,
  onEnterAdd,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on user's typing
  const filteredOptions = useMemo(() => {
    if (!value || !value.trim()) return options;
    const q = value.trim().toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, value]);

  // Check if current value exactly matches an existing option
  const exactMatch = useMemo(() => {
    return options.some((opt) => opt.toLowerCase() === value.trim().toLowerCase());
  }, [options, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (optionText: string) => {
    onChange(optionText);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        const totalItems = filteredOptions.length + (!exactMatch && value.trim() ? 1 : 0);
        setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) {
        const totalItems = filteredOptions.length + (!exactMatch && value.trim() ? 1 : 0);
        setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0) {
        if (highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (!exactMatch && value.trim()) {
          handleSelect(value.trim());
        }
      } else if (value.trim() && onEnterAdd) {
        onEnterAdd();
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="searchable-combobox-wrap" ref={containerRef}>
      <div className="combobox-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="combobox-input"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          className={`combobox-caret-btn ${isOpen ? "open" : ""}`}
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }
          }}
          title="Toggle dropdown list"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && !disabled && (
        <ul className="combobox-dropdown-menu" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => {
              const isHighlighted = index === highlightedIndex;
              const isSelected = opt.toLowerCase() === value.trim().toLowerCase();
              return (
                <li
                  key={opt}
                  role="option"
                  aria-selected={isSelected}
                  className={`combobox-option ${isHighlighted ? "highlighted" : ""} ${isSelected ? "selected" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="option-text">{opt}</span>
                  {isSelected && <span className="option-check">✓</span>}
                </li>
              );
            })
          ) : (
            <li className="combobox-no-matches">
              No matching standard options found.
            </li>
          )}

          {value.trim() && !exactMatch && (
            <li
              className={`combobox-option custom-add-option ${
                highlightedIndex === filteredOptions.length ? "highlighted" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(value.trim());
              }}
              onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
            >
              <div className="custom-option-left-wrap">
                <span className="custom-plus-badge">+ Use custom:</span>
                <strong className="custom-value-preview">&quot;{value.trim()}&quot;</strong>
              </div>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function JobPostCategoryEditor({
  title,
  availableOptions,
  items,
  onChange,
  required = false,
}: {
  title: string;
  availableOptions: string[];
  items: ItemWithExp[];
  onChange: (items: ItemWithExp[]) => void;
  required?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const [selectedYears, setSelectedYears] = useState("1 year");

  const isMaxReached = items.length >= 5;

  const selectableOptions = useMemo(
    () => availableOptions.filter((opt) => !items.some((it) => it.name.toLowerCase() === opt.toLowerCase())),
    [availableOptions, items]
  );

  const handleAddItem = () => {
    const rawName = inputValue.trim();
    if (!rawName) return;

    if (items.some((it) => it.name.toLowerCase() === rawName.toLowerCase())) {
      return;
    }

    if (items.length >= 5) return;

    const next = [...items, { name: rawName, years: selectedYears || "1 year" }];
    onChange(next);
    setInputValue("");
    setSelectedYears("1 year");
  };

  const handleRemoveItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleUpdateYears = (index: number, newYears: string) => {
    const next = items.map((it, i) => (i === index ? { ...it, years: newYears } : it));
    onChange(next);
  };

  return (
    <div className="picker-category-card">
      <div className="category-card-header">
        <strong>
          {title} {required && <span className="req-star">*</span>}
        </strong>
        <span className={`category-count-badge ${isMaxReached ? "count-max" : ""}`}>
          {items.length} / 5 Selected
        </span>
      </div>

      <div className="selected-items-list">
        {items.length === 0 ? (
          <div className="empty-category-notice">No {title.toLowerCase()} added yet. Type or select up to 5 below.</div>
        ) : (
          items.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="exp-item-chip">
              <span className="exp-item-name">{item.name}</span>
              <div className="exp-badge-group">
                <span className="exp-label-text">Experience:</span>
                <select
                  className="exp-years-select"
                  value={item.years}
                  onChange={(e) => handleUpdateYears(idx, e.target.value)}
                >
                  {EXP_YEARS_OPTIONS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="exp-remove-btn"
                onClick={() => handleRemoveItem(idx)}
                title={`Remove ${item.name}`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {!isMaxReached ? (
        <div className="add-item-controls">
          <SearchableSelect
            options={selectableOptions}
            value={inputValue}
            placeholder={`Type or select ${title.toLowerCase()}...`}
            onChange={setInputValue}
            onEnterAdd={handleAddItem}
          />

          <div className="add-years-group">
            <span>Experience:</span>
            <select
              className="add-years-select"
              value={selectedYears}
              onChange={(e) => setSelectedYears(e.target.value)}
            >
              {EXP_YEARS_OPTIONS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="add-item-btn"
            onClick={handleAddItem}
            disabled={!inputValue.trim()}
          >
            + Add
          </button>
        </div>
      ) : (
        <div className="max-limit-reached-banner">
          Maximum of 5 items reached for this category.
        </div>
      )}
    </div>
  );
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
      answer: "Job Title, Location, Application Limit (1-100), Work Arrangement, Experience Level, Auto-Close Date, Salary Range (Min & Max), Description, Qualifications, and Required Skills are required.",
    },
    {
      question: "How do skills and qualifications impact candidate matching?",
      answer: "The skills, qualifications, certifications, and experience levels you select are directly compared against applicant profiles to generate automatic candidate Match Scores and smart recommendations.",
    },
    {
      question: "What happens when I mark a job post as Urgent?",
      answer: "Marking a job as Urgent adds a red badge to the job card and automatically sets an auto-close date 7 days from today to accelerate hiring.",
    },
  ];
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    customTitle: "",
    location: "",
    application_limit: "",
    work_arrangement: "",
    experience_level: "",
    close_date: "",
    is_urgent: false,
    salary_min: "",
    salary_max: "",
    description: "",
  });
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [applicationLimitNotice, setApplicationLimitNotice] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<ItemWithExp[]>([]);
  const [selectedQualifications, setSelectedQualifications] = useState<ItemWithExp[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<ItemWithExp[]>([]);
  const companyLabel = useEmployerCompanyLabel("Employer");
  const isEditMode = useMemo(() => Number.isInteger(editingJobId) && Number(editingJobId) > 0, [editingJobId]);

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

  const getFieldError = (fieldName: keyof typeof form | "skills" | "qualifications") => {
    const effectiveTitle = form.title.trim();
    if (fieldName === "title" && !effectiveTitle) return "Job title is required.";
    if (fieldName === "location" && !form.location.trim()) return "Location is required.";
    if (fieldName === "application_limit") return validateApplicationLimit(form.application_limit);
    if (fieldName === "work_arrangement" && !form.work_arrangement.trim()) return "Work arrangement is required.";
    if (fieldName === "experience_level" && !form.experience_level.trim()) return "Experience level is required.";
    if (fieldName === "close_date" && !form.close_date.trim()) return "Auto-close date is required.";
    if (fieldName === "salary_min") {
      if (!form.salary_min.trim()) return "Minimum salary is required.";
      const parsed = Number(toSalaryPayload(form.salary_min));
      if (!Number.isFinite(parsed) || parsed < 0) return "Minimum salary format is incorrect.";
    }
    if (fieldName === "salary_max") {
      if (!form.salary_max.trim()) return "Maximum salary is required.";
      const parsed = Number(toSalaryPayload(form.salary_max));
      if (!Number.isFinite(parsed) || parsed < 0) return "Maximum salary format is incorrect.";
      const minParsed = Number(toSalaryPayload(form.salary_min));
      if (Number.isFinite(minParsed) && parsed < minParsed) return "Maximum salary must be greater than or equal to minimum salary.";
    }
    if (fieldName === "description" && !form.description.trim()) return "Job description is required.";
    if (fieldName === "skills" && selectedSkills.length === 0) return "At least one technical skill is required.";
    if (fieldName === "qualifications" && selectedQualifications.length === 0) return "At least one qualification is required.";
    return "";
  };

  const shouldShowFieldError = (fieldName: keyof typeof form | "skills" | "qualifications") =>
    Boolean(touchedFields[fieldName] && getFieldError(fieldName) && focusedField !== fieldName);

  const requiredFieldOrder: Array<keyof typeof form | "skills" | "qualifications"> = [
    "title",
    "location",
    "application_limit",
    "work_arrangement",
    "experience_level",
    "close_date",
    "salary_min",
    "salary_max",
    "description",
    "skills",
    "qualifications",
  ];

  const completionChecks = useMemo(() => {
    const effectiveTitle = form.title.trim();
    const hasTitle = !!effectiveTitle;
    const hasLocation = !!form.location.trim();
    const hasApplicationLimit = !!form.application_limit.trim();
    const hasWorkArrangement = !!form.work_arrangement.trim();
    const hasExperienceLevel = !!form.experience_level.trim();
    const hasCloseDate = !!form.close_date.trim();
    const hasSalaryMin = !!form.salary_min.trim();
    const hasSalaryMax = !!form.salary_max.trim();
    const hasDescription = !!form.description.trim();
    const hasSkills = selectedSkills.length > 0;
    const hasQualifications = selectedQualifications.length > 0;
    const hasCertifications = selectedCertifications.length > 0;

    const allChecks = [
      hasTitle,
      hasLocation,
      hasApplicationLimit,
      hasWorkArrangement,
      hasExperienceLevel,
      hasCloseDate,
      hasSalaryMin,
      hasSalaryMax,
      hasDescription,
      hasSkills,
      hasQualifications,
    ];

    const done = allChecks.filter(Boolean).length;
    const percent = Math.round((done / allChecks.length) * 100);
    const colorBand = percent <= 50 ? "red" : percent <= 80 ? "yellow" : "green";

    return {
      hasTitle,
      hasLocation,
      hasApplicationLimit,
      hasWorkArrangement,
      hasExperienceLevel,
      hasCloseDate,
      hasSalaryMin,
      hasSalaryMax,
      hasDescription,
      hasSkills,
      hasQualifications,
      hasCertifications,
      percent,
      colorBand,
    };
  }, [form, selectedSkills, selectedQualifications, selectedCertifications]);

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
          const parsedSkills = parseItemsWithExp(job.required_skills);
          const parsedQuals = parseItemsWithExp(job.qualifications);
          const parsedCerts = parseItemsWithExp(job.certifications);
          setSelectedSkills(parsedSkills);
          setSelectedQualifications(parsedQuals);
          setSelectedCertifications(parsedCerts);
          setForm({
            title: job.title || "",
            customTitle: "",
            location: job.location || "",
            application_limit: String(job.application_limit ?? ""),
            work_arrangement: job.work_arrangement || "",
            experience_level: job.experience_level || "",
            close_date: job.close_date || "",
            is_urgent: !!job.is_urgent,
            salary_min: formatSalary(String(job.salary_min ?? "")),
            salary_max: formatSalary(String(job.salary_max ?? "")),
            description: job.description || "",
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

  const setUrgent = (value: boolean) => {
    setForm((current) => ({
      ...current,
      is_urgent: value,
      close_date: value ? plusDaysAsMmddyyyy(7) : current.close_date,
    }));
    setTouchedFields((current) => ({ ...current, close_date: true }));
  };

  const onFieldFocus = (fieldName: keyof typeof form | "skills" | "qualifications") => {
    setFocusedField(fieldName);
    if (fieldName === "salary_min" || fieldName === "salary_max") {
      const currentVal = form[fieldName];
      const parsed = parseSalaryInteger(currentVal);
      if (parsed !== currentVal) {
        setField(fieldName, parsed);
      }
    }
  };

  const onFieldBlur = (fieldName: keyof typeof form | "skills" | "qualifications") => {
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

    const effectiveTitle = form.title.trim();

    setIsPublishing(true);
    setProfileMessage("");
    try {
      const response = await fetch(
        isEditMode ? `/api/employers/${employerId}/job-posts/${editingJobId}` : `/api/employers/${employerId}/job-posts`,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: effectiveTitle,
            location: form.location,
            application_limit: form.application_limit,
            work_arrangement: form.work_arrangement,
            experience_level: form.experience_level,
            close_date: form.close_date,
            is_urgent: form.is_urgent,
            salary_min: toSalaryPayload(form.salary_min),
            salary_max: toSalaryPayload(form.salary_max),
            description: form.description,
            qualifications: JSON.stringify(selectedQualifications),
            certifications: JSON.stringify(selectedCertifications),
            required_skills: JSON.stringify(selectedSkills),
          }),
        }
      );
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
          <ul className="appdash-secondary-list">
            <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li className="active"><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
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

      <main className="appdash-main jobpost-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Job Posts</strong></div></div>
          <div className="appdash-top-right">
            <a className="cancel-btn" href="/employer-job-posts">All Job Posts</a>
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Create Job Post"
                customFaqs={createJobPostFaqs}
              />
            </div>
          </div>
        </header>

        <section className="jobpost-hero">
          <div>
            <h1>{isEditMode ? "Edit Job Post" : "Post a New Job"}</h1>
            <p>Fill in the details to create a job posting. Standardized roles, competencies, and experience requirements help applicants match accurately.</p>
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
            <span>{completionChecks.hasExperienceLevel ? "◉" : "○"} Experience Level</span>
            <span>{completionChecks.hasCloseDate ? "◉" : "○"} Close Date</span>
            <span>{completionChecks.hasSalaryMin ? "◉" : "○"} Minimum Salary</span>
            <span>{completionChecks.hasSalaryMax ? "◉" : "○"} Maximum Salary</span>
            <span>{completionChecks.hasDescription ? "◉" : "○"} Description</span>
            <span>{completionChecks.hasSkills ? "◉" : "○"} Required Skills</span>
            <span>{completionChecks.hasQualifications ? "◉" : "○"} Qualifications</span>
            <span>{completionChecks.hasCertifications ? "◉" : "○"} Certifications</span>
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

            <label className={shouldShowFieldError("title") ? "field-error" : ""}>
              Job Title *
              <input
                data-field="title"
                type="text"
                placeholder="Enter job title (e.g. Software Engineer, Web Developer)..."
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                onFocus={() => onFieldFocus("title")}
                onBlur={() => onFieldBlur("title")}
              />
              {shouldShowFieldError("title") && <small className="warning-text">{getFieldError("title")}</small>}
            </label>

            <div className="row-2">
              <label className={shouldShowFieldError("location") ? "field-error" : ""}>
                Location *
                <select data-field="location" value={form.location} onChange={(event) => setField("location", event.target.value)} onFocus={() => onFieldFocus("location")} onBlur={() => onFieldBlur("location")}>
                  <option value="">Select location</option>
                  {CAVITE_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
                {shouldShowFieldError("location") && <small className="warning-text">{getFieldError("location")}</small>}
              </label>

              <label className={shouldShowFieldError("application_limit") ? "field-error" : ""}>
                Application Limit *
                <input data-field="application_limit" type="number" min={1} max={100} value={form.application_limit} onChange={(event) => setField("application_limit", event.target.value.replace(/\D/g, ""))} onFocus={() => onFieldFocus("application_limit")} onBlur={() => onFieldBlur("application_limit")} />
                {shouldShowFieldError("application_limit") && <small className="warning-text">{getFieldError("application_limit")}</small>}
              </label>
            </div>
            {!shouldShowFieldError("application_limit") && applicationLimitNotice && <small className="warning-text">{applicationLimitNotice}</small>}

            <div className="row-2">
              <label className={shouldShowFieldError("work_arrangement") ? "field-error" : ""}>
                Work Arrangement *
                <select data-field="work_arrangement" value={form.work_arrangement} onChange={(event) => setField("work_arrangement", event.target.value)} onFocus={() => onFieldFocus("work_arrangement")} onBlur={() => onFieldBlur("work_arrangement")}>
                  <option value="">Select work arrangement</option>
                  {WORK_ARRANGEMENTS.map((wa) => <option key={wa} value={wa}>{wa}</option>)}
                </select>
                {shouldShowFieldError("work_arrangement") && <small className="warning-text">{getFieldError("work_arrangement")}</small>}
              </label>

              <label className={shouldShowFieldError("experience_level") ? "field-error" : ""}>
                Required Experience Level *
                <select data-field="experience_level" value={form.experience_level} onChange={(event) => setField("experience_level", event.target.value)} onFocus={() => onFieldFocus("experience_level")} onBlur={() => onFieldBlur("experience_level")}>
                  <option value="">Select experience level</option>
                  {EXPERIENCE_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
                {shouldShowFieldError("experience_level") && <small className="warning-text">{getFieldError("experience_level")}</small>}
              </label>
            </div>

            <div className="row-2">
              <label className={shouldShowFieldError("close_date") ? "field-error" : ""}>
                Auto-Close Date (MM/DD/YYYY) *
                <input data-field="close_date" type="date" min="2025-01-01" disabled={form.is_urgent} value={mmddyyyyToDateInput(form.close_date)} onChange={(event) => setField("close_date", dateInputToMmddyyyy(event.target.value))} onFocus={() => onFieldFocus("close_date")} onBlur={() => onFieldBlur("close_date")} />
                {form.is_urgent && <small className="info-text">Urgent Hiring is enabled. Auto-Close Date is locked to one week from today.</small>}
                {shouldShowFieldError("close_date") && <small className="warning-text">{getFieldError("close_date")}</small>}
              </label>

              <div className="salary-inputs-group">
                <div className="salary-inputs-subrow">
                  <label className={shouldShowFieldError("salary_min") ? "field-error" : ""}>
                    Min Salary (PHP) *
                    <input data-field="salary_min" value={form.salary_min} onChange={(event) => setField("salary_min", normalizeSalaryInput(event.target.value))} onFocus={() => onFieldFocus("salary_min")} onBlur={() => onFieldBlur("salary_min")} />
                    {shouldShowFieldError("salary_min") && <small className="warning-text">{getFieldError("salary_min")}</small>}
                  </label>
                  <label className={shouldShowFieldError("salary_max") ? "field-error" : ""}>
                    Max Salary (PHP) *
                    <input data-field="salary_max" value={form.salary_max} onChange={(event) => setField("salary_max", normalizeSalaryInput(event.target.value))} onFocus={() => onFieldFocus("salary_max")} onBlur={() => onFieldBlur("salary_max")} />
                    {shouldShowFieldError("salary_max") && <small className="warning-text">{getFieldError("salary_max")}</small>}
                  </label>
                </div>
              </div>
            </div>

            <label className={shouldShowFieldError("description") ? "field-error" : ""}>
              Job Description *
              <textarea data-field="description" rows={5} placeholder="Describe the role, responsibilities, and what makes this position attractive..." value={form.description} onChange={(event) => setField("description", event.target.value)} onFocus={() => onFieldFocus("description")} onBlur={() => onFieldBlur("description")} />
              {shouldShowFieldError("description") && <small className="warning-text">{getFieldError("description")}</small>}
            </label>

            {/* 3 Competency Categories with up to 5 items each and individual experience selectors */}
            <div className="jobpost-competencies-section">
              <JobPostCategoryEditor
                title="Technical Skills"
                availableOptions={BSIT_BSCS_SKILLS}
                items={selectedSkills}
                onChange={setSelectedSkills}
                required
              />
              {shouldShowFieldError("skills") && <small className="warning-text">{getFieldError("skills")}</small>}

              <JobPostCategoryEditor
                title="Educational Qualifications"
                availableOptions={BSIT_BSCS_QUALIFICATIONS}
                items={selectedQualifications}
                onChange={setSelectedQualifications}
                required
              />
              {shouldShowFieldError("qualifications") && <small className="warning-text">{getFieldError("qualifications")}</small>}

              <JobPostCategoryEditor
                title="Professional Certifications"
                availableOptions={BSIT_BSCS_CERTIFICATIONS}
                items={selectedCertifications}
                onChange={setSelectedCertifications}
              />
            </div>

            {profileMessage && <p className="profile-message">{profileMessage}</p>}
          </article>
        </section>
      </main>
    </div>
  );
}
