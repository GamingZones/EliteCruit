import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import {
  calculateJobMatch,
  calculateJobMatchDetails,
  calculateSkillExperienceYears,
  getMatchColorClass,
  inferMatchScore,
  isSkillMatch,
  BSIT_BSCS_JOB_TITLES,
  BSIT_BSCS_SKILLS,
  BSIT_BSCS_QUALIFICATIONS,
  BSIT_BSCS_CERTIFICATIONS,
  ALL_UNIFIED_SKILLS,
  ALL_UNIFIED_QUALIFICATIONS,
  ALL_UNIFIED_CERTIFICATIONS,
  CERTIFICATION_CATEGORIES,
  CERTIFICATION_CATEGORIES_MAP,
  ALL_PHILIPPINES_PROVINCES,
  getCitiesByProvince,
  CAVITE_CITIES,
  WORK_ARRANGEMENTS,
  EXPERIENCE_LEVELS,
  EXP_YEARS_OPTIONS,
  formatExperienceLevel,
  formatLocationWithCavite,
  parseLocations,
  POPULAR_KEYWORD_FILTERS,
  matchesJobWithTaxonomy,
  getKeywordsForJobRole,
  getRelatedJobRolesForKeyword,
  parseCompetencyDisplayTags,
} from "../../utils/filters";
import "./Applicant-Dashboard.css";
import "./JobSearch.css";
import "../Employer/Employer-ApplicantManagement.css";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";

function initialsFrom(name?: string | null): string {
  if (!name || !name.trim()) return "E";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type JobCard = {
  id: number;
  title: string;
  company: string;
  location: string;
  summary: string;
  salary: string;
  salaryMin: number;
  setup: string;
  experienceLevel?: string | null;
  jobType: "Full-time" | "Part-time" | "Contract" | "Internship" | "Remote";
  functionGroup: "Information Technology" | "Human Resources" | "Data and Analytics";
  distance: string;
  badges: string[];
  skillTags: string[];
  qualTags: string[];
  certTags: string[];
  urgent?: boolean;
  createdAt: string | null;
  createdRank: number;
  status: "open" | "closed";
  closeDate: string;
  applicationLimit: number;
  applicantCount: number;
  qualifications: string;
  certifications?: string;
  responsibilities: string;
  employerUserId?: number;
  companyLogoPath?: string | null;
  companyCoverPath?: string | null;
  rating?: string;
};

type EmployerJob = {
  id: number;
  title: string;
  location: string;
  work_arrangement: string;
  salary_min: number | null;
  salary_max: number | null;
  required_skills: string | null;
  required_qualifications: string | null;
  required_certifications: string | null;
  close_date: string | null;
  created_at: string | null;
  urgent: boolean;
};

type EmployerItem = {
  employer_user_id: number;
  business_email: string;
  company_name: string;
  location: string;
  city: string;
  province?: string | null;
  company_address?: string | null;
  contact_number?: string | null;
  industry?: string | null;
  company_size?: string | null;
  company_logo_path?: string | null;
  company_cover_path?: string | null;
  website?: string | null;
  company_description?: string | null;
  rating?: string | null;
  active_jobs_count: number;
  jobs: EmployerJob[];
};

const EMPLOYER_INDUSTRIES = [
  "Information Technology",
  "Software & Computer Services",
  "Telecommunications",
  "BPO & Customer Operations",
  "Financial Services & Banking",
  "Healthcare & Pharmaceuticals",
  "Manufacturing & Production",
  "Retail & E-Commerce",
  "Education & Training",
  "Logistics & Supply Chain",
  "Construction & Real Estate",
  "Hospitality & Tourism",
  "Media & Entertainment",
  "Other",
];

const EMPLOYER_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

type FaqItem = {
  id: number;
  question: string;
  answer: string;
  question_type?: string;
  is_active?: number;
};

const DEFAULT_FAQS: FaqItem[] = [
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
    answer: "Yes, use the bookmark button on any job card to save it to your saved jobs list.",
    question_type: "General",
  },
  {
    id: 4,
    question: "Are salary and benefits negotiable?",
    answer: "Salary ranges listed are set by employers. You can discuss details during interview rounds.",
    question_type: "Benefits",
  },
];

function RenderTagChips({
  items,
  type,
  maxVisible = 1,
}: {
  items: string[];
  type: "skill" | "qualification" | "certification";
  maxVisible?: number;
}) {
  if (!items || items.length === 0) return null;
  const firstIsTooLong = Boolean(items[0] && items[0].length > 15);
  const visible = firstIsTooLong ? [] : items.slice(0, maxVisible);
  const hidden = firstIsTooLong ? items : items.slice(maxVisible);
  const fullListText = items.join(", ");
  const typeLabel =
    type === "skill" ? "SKILLS:" : type === "qualification" ? "QUALIFICATIONS:" : "CERTIFICATIONS:";

  return (
    <span className="js-chips-wrap">
      {visible.map((item) => (
        <span className={`js-tag-chip js-tag-${type}`} key={item}>
          {item}
        </span>
      ))}
      {hidden.length > 0 && (
        <span className="js-overflow-dots" tabIndex={0}>
          ...
          <span className="js-overflow-tip">
            <strong>{typeLabel}</strong>
            <span>{fullListText}</span>
          </span>
        </span>
      )}
    </span>
  );
}

type ApplicantMatchProfile = {
  desiredJobTitle: string;
  workArrangement: string;
  expectedSalary: number;
  city: string;
  skills: string[];
  qualifications: string[];
  certifications: string[];
};

const SALARY_RANGES = [
  "PHP 10,000+",
  "PHP 15,000+",
  "PHP 20,000+",
  "PHP 25,000+",
  "PHP 30,000+",
  "PHP 35,000+",
  "PHP 40,000+",
  "PHP 50,000+",
];

type ItemWithExp = {
  name: string;
  years: string;
};

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

  const filteredOptions = useMemo(() => {
    if (!value || !value.trim()) return options;
    const q = value.trim().toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, value]);

  const exactMatch = useMemo(() => {
    return options.some((opt) => opt.toLowerCase() === value.trim().toLowerCase());
  }, [options, value]);

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

function FilterCategoryEditor({
  title,
  availableOptions,
  items,
  onChange,
}: {
  title: string;
  availableOptions: string[];
  items: ItemWithExp[];
  onChange: (items: ItemWithExp[]) => void;
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
    <div className="filter-category-box">
      <div className="category-card-header">
        <strong>{title}</strong>
        <span className={`category-count-badge ${isMaxReached ? "count-max" : ""}`}>
          {items.length} / 5 Selected
        </span>
      </div>

      <div className="selected-items-list">
        {items.length === 0 ? (
          <div className="empty-category-notice">No {title.toLowerCase()} selected. Type or select up to 5 below.</div>
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
          <div className="add-item-input-row">
            <SearchableSelect
              options={selectableOptions}
              value={inputValue}
              placeholder={`Type or select ${title.toLowerCase()}...`}
              onChange={setInputValue}
              onEnterAdd={handleAddItem}
            />
          </div>

          <div className="add-item-actions-row">
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
        </div>
      ) : (
        <div className="max-limit-reached-banner">
          Maximum of 5 items reached. Remove one to add another.
        </div>
      )}
    </div>
  );
}

function MiniIcon({ name }: { name: "filters" | "company" | "location" | "bookmark" | "bookmarkFilled" | "chevronDown" }) {
  const icons: Record<string, JSX.Element> = {
    filters: <path d="M4 6h16M7 12h10M10 18h4" />,
    company: <path d="M5 20V7l5-2 5 2v13M3 20h18M9 11h2m2 0h2M9 15h2m2 0h2" />,
    location: <path d="M12 21s6-5 6-10a6 6 0 1 0-12 0c0 5 6 10 6 10Zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />,
    bookmark: <path d="M7 4h10v16l-5-3-5 3V4Z" />,
    bookmarkFilled: <path d="M7 4h10v16l-5-3-5 3V4Z" />,
    chevronDown: <path d="M6 9l6 6 6-6" />,
  };

  return (
    <svg className={`mini-icon-svg ${name === "bookmarkFilled" ? "filled" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function RenderLocationMeta({ location }: { location?: string | null }) {
  const locItems = parseLocations(location);

  if (locItems.length === 0) {
    return (
      <span className="location-meta">
        <MiniIcon name="location" />
        <span>Location not set</span>
      </span>
    );
  }

  if (locItems.length === 1) {
    return (
      <span className="location-meta">
        <MiniIcon name="location" />
        <span>{locItems[0]}</span>
      </span>
    );
  }

  const fullListText = locItems.join(", ");

  return (
    <span className="location-meta">
      <MiniIcon name="location" />
      <span>{locItems[0]}</span>
      <span className="overflow-dots-badge" tabIndex={0} aria-label="View all locations">
        ...
        <span className="overflow-tooltip">
          <strong>Locations:</strong>
          <span>{fullListText}</span>
        </span>
      </span>
    </span>
  );
}

function parseSkills(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function shortenText(raw: string | null | undefined, fallback: string, limit = 84) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return fallback;
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function formatSalary(minSalary: number | null, maxSalary: number | null) {
  const min = Number.isFinite(Number(minSalary)) ? Number(minSalary).toLocaleString("en-US") : "0";
  const max = Number.isFinite(Number(maxSalary)) ? Number(maxSalary).toLocaleString("en-US") : "0";
  return `PHP ${min} - ${max}`;
}


function inferFunctionGroup(title: string, skills: string[]) {
  const raw = `${title} ${skills.join(" ")}`.toLowerCase();
  if (raw.includes("hr") || raw.includes("recruit") || raw.includes("people")) {
    return "Human Resources" as const;
  }
  if (raw.includes("data") || raw.includes("analyst") || raw.includes("analytics")) {
    return "Data and Analytics" as const;
  }
  return "Information Technology" as const;
}

function splitProfileTags(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseExpectedSalary(raw: string | null | undefined) {
  if (!raw) return 0;
  const amount = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export default function JobSearch() {
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [applicantLabel, setApplicantLabel] = useState("Applicant");
  const [searchMode, setSearchMode] = useState<"jobs" | "employers">("jobs");
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [jobsMessage, setJobsMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("All roles");
  const [selectedProvince, setSelectedProvince] = useState("All provinces");
  const [selectedCity, setSelectedCity] = useState("All cities/municipalities");
  const [selectedWorkArrangement, setSelectedWorkArrangement] = useState("Any arrangement");
  const [selectedMinSalary, setSelectedMinSalary] = useState("Any salary");

  // Employer Search States
  const [employers, setEmployers] = useState<EmployerItem[]>([]);
  const [employersLoading, setEmployersLoading] = useState(false);
  const [employerSearchInput, setEmployerSearchInput] = useState("");
  const [employerAppliedSearch, setEmployerAppliedSearch] = useState("");
  const [isEmployerFiltersOpen, setIsEmployerFiltersOpen] = useState(false);
  const [employerSelectedProvince, setEmployerSelectedProvince] = useState("All provinces");
  const [employerSelectedCity, setEmployerSelectedCity] = useState("All cities/municipalities");
  const [employerSelectedIndustry, setEmployerSelectedIndustry] = useState("All industries");
  const [employerSelectedSize, setEmployerSelectedSize] = useState("All sizes");
  const [employerSortBy, setEmployerSortBy] = useState<"active_jobs" | "rating" | "name_asc" | "name_desc">("active_jobs");
  const [employerCurrentPage, setEmployerCurrentPage] = useState(1);
  const [selectedEmployerDetails, setSelectedEmployerDetails] = useState<EmployerItem | null>(null);
  const [isEmployerFaqDrawerOpen, setIsEmployerFaqDrawerOpen] = useState(false);

  // Employer Side Panels state in Company Details Modal (Jobs & Messages)
  const [isEmployerJobsOpen, setIsEmployerJobsOpen] = useState(false);
  const [isEmployerJobsClosing, setIsEmployerJobsClosing] = useState(false);
  const [isEmployerMsgOpen, setIsEmployerMsgOpen] = useState(false);
  const [isEmployerMsgClosing, setIsEmployerMsgClosing] = useState(false);
  const [employerMsgThread, setEmployerMsgThread] = useState<any | null>(null);
  const [employerMessages, setEmployerMessages] = useState<any[]>([]);
  const [employerMsgInput, setEmployerMsgInput] = useState("");
  const [isEmployerMsgLoading, setIsEmployerMsgLoading] = useState(false);
  const [isEmployerMsgSending, setIsEmployerMsgSending] = useState(false);
  const employerMsgEndRef = useRef<HTMLDivElement>(null);

  const availableEmployerCities = useMemo(() => {
    if (employerSelectedProvince !== "All provinces") {
      return getCitiesByProvince(employerSelectedProvince);
    }
    return CAVITE_CITIES;
  }, [employerSelectedProvince]);

  const availableCities = useMemo(() => {
    if (selectedProvince !== "All provinces") {
      return getCitiesByProvince(selectedProvince);
    }
    return CAVITE_CITIES;
  }, [selectedProvince]);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [filterSkills, setFilterSkills] = useState<ItemWithExp[]>([]);
  const [filterQualifications, setFilterQualifications] = useState<ItemWithExp[]>([]);
  const [filterCertifications, setFilterCertifications] = useState<ItemWithExp[]>([]);
  const [sortBy, setSortBy] = useState<"Newest" | "Match" | "Bookmarked">("Newest");
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [applicantMatchProfile, setApplicantMatchProfile] = useState<ApplicantMatchProfile | null>(null);
  const [applicantUserId, setApplicantUserId] = useState<number | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [initialAppliedJobIds, setInitialAppliedJobIds] = useState<number[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [detailsJob, setDetailsJob] = useState<JobCard | null>(null);
  const [isFaqDrawerOpen, setIsFaqDrawerOpen] = useState(false);
  const [isMatchDrawerOpen, setIsMatchDrawerOpen] = useState(false);
  const [isMatchDrawerClosing, setIsMatchDrawerClosing] = useState(false);
  const [hoveredCompareTag, setHoveredCompareTag] = useState<{
    item: string;
    side: "applicant" | "employer";
    category: "skills" | "qualifications" | "certifications";
  } | null>(null);
  const [companyFaqs, setCompanyFaqs] = useState<FaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [expandedFaqIds, setExpandedFaqIds] = useState<number[]>([]);

  const handleToggleMatchDrawer = () => {
    if (isMatchDrawerOpen) {
      setIsMatchDrawerClosing(true);
      setTimeout(() => {
        setIsMatchDrawerOpen(false);
        setIsMatchDrawerClosing(false);
      }, 220);
    } else {
      setIsFaqDrawerOpen(false);
      setIsMatchDrawerClosing(false);
      setIsMatchDrawerOpen(true);
    }
  };

  const handleCloseMatchDrawer = () => {
    if (!isMatchDrawerOpen) return;
    setIsMatchDrawerClosing(true);
    setTimeout(() => {
      setIsMatchDrawerOpen(false);
      setIsMatchDrawerClosing(false);
    }, 220);
  };

  const handleOpenFaqs = (job: JobCard) => {
    setIsFaqDrawerOpen(true);
    setFaqLoading(true);
    setExpandedFaqIds([]);

    if (job.employerUserId) {
      fetch(`/api/employers/${job.employerUserId}/faqs`)
        .then((res) => res.json())
        .then((data) => {
          const rows = Array.isArray(data?.faqs)
            ? data.faqs.filter((f: any) => f.is_active !== 0)
            : [];
          if (rows.length > 0) {
            setCompanyFaqs(rows);
          } else {
            setCompanyFaqs(DEFAULT_FAQS);
          }
        })
        .catch(() => setCompanyFaqs(DEFAULT_FAQS))
        .finally(() => setFaqLoading(false));
    } else {
      setCompanyFaqs(DEFAULT_FAQS);
      setFaqLoading(false);
    }
  };

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setApplicantLabel("Applicant");
      return;
    }

    try {
      const savedUser = JSON.parse(savedUserRaw) as {
        id?: number;
        role?: "applicant" | "employer";
        first_name?: string;
        firstName?: string;
        last_name?: string;
        lastName?: string;
        email?: string;
      };

      const first = savedUser.first_name || savedUser.firstName || "";
      const last = savedUser.last_name || savedUser.lastName || "";
      const fallbackName = `${first} ${last}`.trim() || savedUser.email || "Applicant";
      setApplicantLabel(fallbackName);

      if (savedUser.role !== "applicant" || !savedUser.id) {
        return;
      }

      setApplicantUserId(savedUser.id);

      fetch(`/api/applicants/${savedUser.id}/profile`)
        .then((response) => response.json())
        .then((data) => {
          const profile = data?.profile;
          const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(" ");
          if (fullName) {
            setApplicantLabel(fullName);
          }
          setApplicantMatchProfile({
            desiredJobTitle: profile?.desired_job_title || "",
            workArrangement: profile?.work_arrangement || "",
            expectedSalary: parseExpectedSalary(profile?.expected_salary || ""),
            city: profile?.city || "",
            skills: parseCompetencyDisplayTags(profile?.skills),
            certifications: parseCompetencyDisplayTags(profile?.certifications),
            qualifications: parseCompetencyDisplayTags(profile?.qualifications),
          });
        })
        .catch(() => {
          // Keep local fallback name when profile API is unavailable.
        });
    } catch {
      setApplicantLabel("Applicant");
    }
  }, []);

  useEffect(() => {
    if (!applicantUserId) return;
    fetch(`/api/applicants/${applicantUserId}/applications`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Unable to load your applications.");
        const ids = Array.isArray(data?.applications)
          ? data.applications
              .map((item: any) => Number(item?.job_post_id))
              .filter((id: number) => Number.isInteger(id) && id > 0)
          : [];
        setAppliedJobIds(ids);
        setInitialAppliedJobIds(ids);
      })
      .catch(() => {
        // Keep UI usable even when applications endpoint is temporarily unavailable.
      });
  }, [applicantUserId]);

  useEffect(() => {
    const savedBookmarks = localStorage.getItem("elitecruit-bookmarked-jobs");
    if (!savedBookmarks) return;
    try {
      const parsed = JSON.parse(savedBookmarks);
      if (Array.isArray(parsed)) {
        setBookmarkedIds(parsed.filter((id) => Number.isInteger(id)));
      }
    } catch {
      // Ignore malformed bookmark storage.
    }
  }, []);

  useEffect(() => {
    fetch("/api/job-posts")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Unable to load job postings.");
        const rows = Array.isArray(data?.jobPosts) ? data.jobPosts : [];
        const mapped: JobCard[] = rows.map((row: any, index: number) => ({
          id: Number(row.id),
          title: row.title || "Untitled Job",
          company: row.company_name || "Employer",
          location: formatLocationWithCavite(row.location || row.company_address),
          summary: row.description || "No job description provided yet.",
          salary: formatSalary(row.salary_min ?? null, row.salary_max ?? null),
          salaryMin: Number.isFinite(Number(row.salary_min)) ? Number(row.salary_min) : 0,
          setup: row.work_arrangement || "Flexible",
          experienceLevel: row.experience_level || null,
          status: row.status === "closed" ? "closed" : "open",
          closeDate: row.close_date || "-",
          applicationLimit: Number.isFinite(Number(row.application_limit)) ? Number(row.application_limit) : 0,
          applicantCount: Number.isFinite(Number(row.applicant_count)) ? Number(row.applicant_count) : 0,
          qualifications: row.qualifications || "Not provided",
          certifications: row.certifications || "Not provided",
          responsibilities: row.responsibilities || "Not provided",
          skillTags: parseCompetencyDisplayTags(row.required_skills),
          qualTags: parseCompetencyDisplayTags(row.qualifications),
          certTags: parseCompetencyDisplayTags(row.certifications),
          jobType: row.work_arrangement === "Remote" ? "Remote" : "Full-time",
          functionGroup: inferFunctionGroup(row.title || "", parseCompetencyDisplayTags(row.required_skills)),
          distance: "Cavite",
          badges: parseCompetencyDisplayTags(row.required_skills),
          urgent: Boolean(Number(row.is_urgent || 0)),
          createdAt: typeof row.created_at === "string" ? row.created_at : null,
          createdRank: index,
          employerUserId: Number(row.employer_user_id) || undefined,
          companyLogoPath: row.company_logo_path || null,
          companyCoverPath: row.company_cover_path || null,
          rating: row.rating ? String(row.rating) : "0.0",
        }));
        setJobs(mapped);
      })
      .catch((error) => setJobsMessage(error instanceof Error ? error.message : "Unable to load job postings."));
  }, []);

  useEffect(() => {
    setEmployersLoading(true);
    fetch("/api/employers")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load employers");
        const list = Array.isArray(data?.employers) ? data.employers : [];
        setEmployers(list);
      })
      .catch((err) => {
        console.error("Failed to load employers:", err);
      })
      .finally(() => {
        setEmployersLoading(false);
      });
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedRole !== "All roles") count++;
    if (selectedProvince !== "All provinces") count++;
    if (selectedCity !== "All cities/municipalities") count++;
    if (selectedWorkArrangement !== "Any arrangement") count++;
    if (selectedMinSalary !== "Any salary") count++;
    if (selectedKeyword) count++;
    if (sortBy !== "Newest") count++;
    count += filterSkills.length;
    count += filterQualifications.length;
    count += filterCertifications.length;
    return count;
  }, [
    selectedRole,
    selectedProvince,
    selectedCity,
    selectedWorkArrangement,
    selectedMinSalary,
    selectedKeyword,
    sortBy,
    filterSkills,
    filterQualifications,
    filterCertifications,
  ]);

  const resetFilters = () => {
    setSelectedRole("All roles");
    setSelectedProvince("All provinces");
    setSelectedCity("All cities/municipalities");
    setSelectedWorkArrangement("Any arrangement");
    setSelectedMinSalary("Any salary");
    setSelectedKeyword(null);
    setFilterSkills([]);
    setFilterQualifications([]);
    setFilterCertifications([]);
    setSortBy("Newest");
    setSearchInput("");
    setAppliedSearch("");
    setCurrentPage(1);
  };

  const visibleJobs = useMemo(() => {
    const normalizedSearch = appliedSearch.trim().toLowerCase();
    const minSalary = selectedMinSalary === "Any salary" ? 0 : Number(selectedMinSalary.replace(/\D/g, "")) || 0;

    const filtered = jobs.filter((job) => {
      const combined = `${job.title} ${job.company} ${job.location} ${job.summary} ${job.badges.join(" ")} ${job.skillTags.join(" ")} ${job.qualTags.join(" ")}`.toLowerCase();
      
      const bySearch =
        !normalizedSearch ||
        matchesJobWithTaxonomy(
          {
            title: job.title,
            description: `${job.summary} ${job.responsibilities}`,
            qualifications: job.qualifications,
            required_skills: [job.skillTags.join(", "), job.badges.join(", ")].join(", "),
            badges: job.badges,
          },
          normalizedSearch
        ) ||
        combined.includes(normalizedSearch);

      const byKeyword =
        !selectedKeyword ||
        matchesJobWithTaxonomy(
          {
            title: job.title,
            description: `${job.summary} ${job.responsibilities}`,
            qualifications: job.qualifications,
            required_skills: [job.skillTags.join(", "), job.badges.join(", ")].join(", "),
            badges: job.badges,
          },
          selectedKeyword
        );

      const byRole =
        selectedRole === "All roles" ||
        job.title.toLowerCase().includes(selectedRole.toLowerCase()) ||
        selectedRole.toLowerCase().includes(job.title.toLowerCase()) ||
        matchesJobWithTaxonomy(
          {
            title: job.title,
            description: `${job.summary} ${job.responsibilities}`,
            qualifications: job.qualifications,
            required_skills: [job.skillTags.join(", "), job.badges.join(", ")].join(", "),
            badges: job.badges,
          },
          selectedRole
        );

      const byProvince =
        selectedProvince === "All provinces" ||
        job.location.toLowerCase().includes(selectedProvince.toLowerCase()) ||
        selectedProvince.toLowerCase().includes(job.location.toLowerCase());

      const byCity =
        selectedCity === "All cities/municipalities" ||
        job.location.toLowerCase().includes(selectedCity.toLowerCase()) ||
        selectedCity.toLowerCase().includes(job.location.toLowerCase());

      const byWorkArrangement =
        selectedWorkArrangement === "Any arrangement" ||
        job.setup.toLowerCase() === selectedWorkArrangement.toLowerCase();

      const bySalary = minSalary === 0 || job.salaryMin >= minSalary;

      const bySkills =
        filterSkills.length === 0 ||
        filterSkills.some((fs) => {
          const sName = fs.name;
          const sLower = sName.toLowerCase();
          return (
            job.skillTags.some((st) => isSkillMatch(sName, st) || st.toLowerCase().includes(sLower) || sLower.includes(st.toLowerCase())) ||
            job.badges.some((b) => isSkillMatch(sName, b) || b.toLowerCase().includes(sLower) || sLower.includes(b.toLowerCase())) ||
            isSkillMatch(sName, job.summary) ||
            isSkillMatch(sName, job.qualifications) ||
            isSkillMatch(sName, job.responsibilities) ||
            job.summary.toLowerCase().includes(sLower) ||
            job.qualifications.toLowerCase().includes(sLower) ||
            job.responsibilities.toLowerCase().includes(sLower)
          );
        });

      const byQualifications =
        filterQualifications.length === 0 ||
        filterQualifications.some((fq) => {
          const qName = fq.name;
          const qLower = qName.toLowerCase();
          return (
            job.qualTags.some((qt) => isSkillMatch(qName, qt) || qt.toLowerCase().includes(qLower) || qLower.includes(qt.toLowerCase())) ||
            isSkillMatch(qName, job.qualifications) ||
            isSkillMatch(qName, job.summary) ||
            job.qualifications.toLowerCase().includes(qLower) ||
            job.summary.toLowerCase().includes(qLower)
          );
        });

      const byCertifications =
        filterCertifications.length === 0 ||
        filterCertifications.some((fc) => {
          const cName = fc.name;
          const cLower = cName.toLowerCase();
          return (
            job.certTags.some((ct) => isSkillMatch(cName, ct) || ct.toLowerCase().includes(cLower) || cLower.includes(ct.toLowerCase())) ||
            job.qualTags.some((qt) => isSkillMatch(cName, qt) || qt.toLowerCase().includes(cLower) || cLower.includes(qt.toLowerCase())) ||
            isSkillMatch(cName, job.qualifications) ||
            isSkillMatch(cName, job.certifications || "") ||
            isSkillMatch(cName, job.summary) ||
            job.qualifications.toLowerCase().includes(cLower) ||
            (job.certifications && job.certifications.toLowerCase().includes(cLower)) ||
            job.summary.toLowerCase().includes(cLower)
          );
        });

      return (
        bySearch &&
        byKeyword &&
        byRole &&
        byProvince &&
        byCity &&
        byWorkArrangement &&
        bySalary &&
        bySkills &&
        byQualifications &&
        byCertifications
      );
    });

    const scope = sortBy === "Bookmarked" ? filtered.filter((job) => bookmarkedIds.includes(job.id)) : filtered;

    const sorted = [...scope].sort((a, b) => {
      const aApplied = initialAppliedJobIds.includes(a.id);
      const bApplied = initialAppliedJobIds.includes(b.id);
      if (aApplied !== bApplied) {
        return aApplied ? 1 : -1;
      }

      if (sortBy === "Match") {
        return calculateJobMatch(b, applicantMatchProfile) - calculateJobMatch(a, applicantMatchProfile);
      }

      const aTime = a.createdAt ? Date.parse(a.createdAt) : NaN;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : NaN;
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
        return bTime - aTime;
      }
      return a.createdRank - b.createdRank;
    });

    return sorted;
  }, [
    jobs,
    appliedSearch,
    selectedRole,
    selectedProvince,
    selectedCity,
    selectedWorkArrangement,
    selectedMinSalary,
    filterSkills,
    filterQualifications,
    filterCertifications,
    sortBy,
    bookmarkedIds,
    applicantMatchProfile,
    initialAppliedJobIds,
  ]);

  const JOBS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(visibleJobs.length / JOBS_PER_PAGE));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * JOBS_PER_PAGE;
    return visibleJobs.slice(start, start + JOBS_PER_PAGE);
  }, [visibleJobs, currentPage]);

  // Reset page to 1 whenever any filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    appliedSearch,
    selectedKeyword,
    selectedRole,
    selectedProvince,
    selectedCity,
    selectedWorkArrangement,
    selectedMinSalary,
    filterSkills,
    filterQualifications,
    filterCertifications,
    sortBy,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const mainRef = useRef<HTMLElement | null>(null);
  const isFirstMount = useRef(true);

  const scrollToTop = () => {
    // 1. Scroll main ref container
    if (mainRef.current) {
      try {
        mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      mainRef.current.scrollTop = 0;
    }
    // 2. Query any appdash-main or page containers
    const containers = document.querySelectorAll<HTMLElement>(
      ".appdash-main, .jobsearch-main, .jobsearch-content-grid, .job-results-col"
    );
    containers.forEach((el) => {
      try {
        el.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      el.scrollTop = 0;
    });
    // 3. Native scrollIntoView on header / search bar
    const topAnchor = document.querySelector(".results-container, .results-head, .search-bar-card, .appdash-topbar") as HTMLElement | null;
    if (topAnchor) {
      try {
        topAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    }
    // 4. Window / body scroll fallback
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    requestAnimationFrame(() => {
      scrollToTop();
    });
  }, [currentPage]);

  // DOUBLE VERIFICATION MODAL STATES
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [applyJobTarget, setApplyJobTarget] = useState<{ jobId: number; title: string } | null>(null);

  const applySearch = () => setAppliedSearch(searchInput);

  const handleConfirmApply = async () => {
    if (!applyJobTarget) return;
    const targetId = applyJobTarget.jobId;
    setApplyJobTarget(null);
    await applyToJob(targetId);
  };

  const applyToJob = async (jobId: number) => {
    if (!applicantUserId) {
      setJobsMessage("Sign in as applicant to apply for jobs.");
      return;
    }
    if (appliedJobIds.includes(jobId)) return;

    setApplyingJobId(jobId);
    setJobsMessage("");
    try {
      const response = await fetch(`/api/applicants/${applicantUserId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_post_id: jobId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to submit application.");
      setAppliedJobIds((current) => (current.includes(jobId) ? current : [...current, jobId]));
      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j))
      );
      setDetailsJob((current) => {
        if (!current || current.id !== jobId) return current;
        return { ...current, applicantCount: current.applicantCount + 1 };
      });
    } catch (error) {
      setJobsMessage(error instanceof Error ? error.message : "Unable to submit application.");
    } finally {
      setApplyingJobId(null);
    }
  };

  const toggleBookmark = (jobId: number) => {
    setBookmarkedIds((current) => {
      const next = current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId];
      localStorage.setItem("elitecruit-bookmarked-jobs", JSON.stringify(next));
      return next;
    });
  };

  const applyEmployerSearch = () => {
    setEmployerAppliedSearch(employerSearchInput);
  };

  const employerActiveFilterCount = useMemo(() => {
    let count = 0;
    if (employerSelectedProvince !== "All provinces") count++;
    if (employerSelectedCity !== "All cities/municipalities") count++;
    if (employerSelectedIndustry !== "All industries") count++;
    if (employerSelectedSize !== "All sizes") count++;
    if (employerSortBy !== "active_jobs") count++;
    return count;
  }, [
    employerSelectedProvince,
    employerSelectedCity,
    employerSelectedIndustry,
    employerSelectedSize,
    employerSortBy,
  ]);

  const resetEmployerFilters = () => {
    setEmployerSelectedProvince("All provinces");
    setEmployerSelectedCity("All cities/municipalities");
    setEmployerSelectedIndustry("All industries");
    setEmployerSelectedSize("All sizes");
    setEmployerSortBy("active_jobs");
    setEmployerSearchInput("");
    setEmployerAppliedSearch("");
    setEmployerCurrentPage(1);
  };

  const visibleEmployers = useMemo(() => {
    const q = employerAppliedSearch.trim().toLowerCase();

    const filtered = employers.filter((emp) => {
      if (q) {
        const nameMatch = emp.company_name?.toLowerCase().includes(q);
        const industryMatch = emp.industry?.toLowerCase().includes(q);
        const locMatch =
          emp.location?.toLowerCase().includes(q) ||
          emp.city?.toLowerCase().includes(q) ||
          emp.province?.toLowerCase().includes(q);
        const descMatch = emp.company_description?.toLowerCase().includes(q);
        const jobsMatch = emp.jobs?.some(
          (j) =>
            j.title?.toLowerCase().includes(q) ||
            j.required_skills?.toLowerCase().includes(q)
        );
        if (!nameMatch && !industryMatch && !locMatch && !descMatch && !jobsMatch) {
          return false;
        }
      }

      if (employerSelectedProvince !== "All provinces") {
        const provLower = employerSelectedProvince.toLowerCase();
        const matchProv =
          emp.province?.toLowerCase().includes(provLower) ||
          emp.location?.toLowerCase().includes(provLower);
        if (!matchProv) return false;
      }

      if (employerSelectedCity !== "All cities/municipalities") {
        const cityLower = employerSelectedCity.toLowerCase();
        const matchCity =
          emp.city?.toLowerCase().includes(cityLower) ||
          emp.location?.toLowerCase().includes(cityLower);
        if (!matchCity) return false;
      }

      if (employerSelectedIndustry !== "All industries") {
        if (!emp.industry || !emp.industry.toLowerCase().includes(employerSelectedIndustry.toLowerCase())) {
          return false;
        }
      }

      if (employerSelectedSize !== "All sizes") {
        if (!emp.company_size || emp.company_size !== employerSelectedSize) {
          return false;
        }
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (employerSortBy === "active_jobs") {
        if (b.active_jobs_count !== a.active_jobs_count) {
          return b.active_jobs_count - a.active_jobs_count;
        }
        const rA = Number(a.rating) || 0;
        const rB = Number(b.rating) || 0;
        if (rB !== rA) return rB - rA;
        return a.company_name.localeCompare(b.company_name);
      }
      if (employerSortBy === "rating") {
        const rA = Number(a.rating) || 0;
        const rB = Number(b.rating) || 0;
        if (rB !== rA) return rB - rA;
        return b.active_jobs_count - a.active_jobs_count;
      }
      if (employerSortBy === "name_asc") {
        return a.company_name.localeCompare(b.company_name);
      }
      if (employerSortBy === "name_desc") {
        return b.company_name.localeCompare(a.company_name);
      }
      return 0;
    });

    return sorted;
  }, [
    employers,
    employerAppliedSearch,
    employerSelectedProvince,
    employerSelectedCity,
    employerSelectedIndustry,
    employerSelectedSize,
    employerSortBy,
  ]);

  const EMPLOYERS_PER_PAGE = 8;
  const employerTotalPages = Math.max(1, Math.ceil(visibleEmployers.length / EMPLOYERS_PER_PAGE));
  const paginatedEmployers = useMemo(() => {
    const start = (employerCurrentPage - 1) * EMPLOYERS_PER_PAGE;
    return visibleEmployers.slice(start, start + EMPLOYERS_PER_PAGE);
  }, [visibleEmployers, employerCurrentPage]);

  useEffect(() => {
    setEmployerCurrentPage(1);
  }, [
    employerAppliedSearch,
    employerSelectedProvince,
    employerSelectedCity,
    employerSelectedIndustry,
    employerSelectedSize,
    employerSortBy,
  ]);

  useEffect(() => {
    if (employerCurrentPage > employerTotalPages) {
      setEmployerCurrentPage(employerTotalPages);
    }
  }, [employerCurrentPage, employerTotalPages]);

  const handleOpenJobDetailsById = (jobId: number) => {
    const existingJob = jobs.find((j) => j.id === jobId);
    if (existingJob) {
      setDetailsJob(existingJob);
      return;
    }
    for (const emp of employers) {
      const ej = emp.jobs?.find((j) => j.id === jobId);
      if (ej) {
        const fallbackJob: JobCard = {
          id: ej.id,
          title: ej.title,
          company: emp.company_name,
          location: formatLocationWithCavite(ej.location || emp.location),
          summary: "No job description provided yet.",
          salary: formatSalary(ej.salary_min, ej.salary_max),
          salaryMin: Number(ej.salary_min) || 0,
          setup: ej.work_arrangement || "Flexible",
          experienceLevel: null,
          jobType: ej.work_arrangement === "Remote" ? "Remote" : "Full-time",
          functionGroup: inferFunctionGroup(ej.title, parseCompetencyDisplayTags(ej.required_skills)),
          distance: "Cavite",
          badges: parseCompetencyDisplayTags(ej.required_skills),
          skillTags: parseCompetencyDisplayTags(ej.required_skills),
          qualTags: parseCompetencyDisplayTags(ej.required_qualifications),
          certTags: parseCompetencyDisplayTags(ej.required_certifications),
          urgent: ej.urgent,
          createdAt: ej.created_at,
          createdRank: 0,
          status: "open",
          closeDate: ej.close_date || "-",
          applicationLimit: 0,
          applicantCount: 0,
          qualifications: ej.required_qualifications || "Not provided",
          certifications: ej.required_certifications || "Not provided",
          responsibilities: "Not provided",
          employerUserId: emp.employer_user_id,
          companyLogoPath: emp.company_logo_path,
          companyCoverPath: emp.company_cover_path,
          rating: emp.rating || "5.0",
        };
        setDetailsJob(fallbackJob);
        return;
      }
    }
  };

  const handleOpenEmployerDetails = (employer: EmployerItem, openJobs = false) => {
    setSelectedEmployerDetails(employer);
    setIsEmployerFaqDrawerOpen(false);
    setIsEmployerMsgOpen(false);
    setIsEmployerMsgClosing(false);
    setEmployerMsgThread(null);
    setEmployerMessages([]);
    setEmployerMsgInput("");
    if (openJobs) {
      setIsEmployerJobsOpen(true);
      setIsEmployerJobsClosing(false);
    } else {
      setIsEmployerJobsOpen(false);
      setIsEmployerJobsClosing(false);
    }
  };

  const handleOpenJobFromEmployerModal = (jobId: number) => {
    handleOpenJobDetailsById(jobId);
  };

  const handleCloseJobDetails = () => {
    setDetailsJob(null);
    setIsMatchDrawerOpen(false);
    setIsMatchDrawerClosing(false);
    setIsFaqDrawerOpen(false);
  };

  const fetchEmployerThreadMessages = async (employerUserId: number) => {
    setIsEmployerMsgLoading(true);
    try {
      const rawUser = localStorage.getItem("elitecruit-user");
      if (!rawUser) {
        setIsEmployerMsgLoading(false);
        return;
      }
      const currentUid = JSON.parse(rawUser)?.id;
      if (!currentUid) {
        setIsEmployerMsgLoading(false);
        return;
      }

      const threadsRes = await fetch(`/api/users/${currentUid}/messages`);
      if (!threadsRes.ok) {
        setIsEmployerMsgLoading(false);
        return;
      }

      const threadsData = await threadsRes.json();
      const allThreads = threadsData?.threads || [];
      const existing = allThreads.find((t: any) => Number(t.other_user_id) === Number(employerUserId));

      if (existing) {
        setEmployerMsgThread(existing);
        const msgRes = await fetch(`/api/messages/threads/${existing.id}`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setEmployerMessages(msgData?.messages || []);
        }
        try {
          await fetch(`/api/messages/threads/${existing.id}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: currentUid }),
          });
          window.dispatchEvent(new Event("elitecruit_messages_update"));
        } catch {}
      } else {
        setEmployerMsgThread(null);
        setEmployerMessages([]);
      }
    } catch (err) {
      console.error("Error loading employer messages:", err);
    } finally {
      setIsEmployerMsgLoading(false);
    }
  };

  const handleCloseEmployerJobs = () => {
    setIsEmployerJobsClosing(true);
    setTimeout(() => {
      setIsEmployerJobsOpen(false);
      setIsEmployerJobsClosing(false);
    }, 220);
  };

  const handleToggleEmployerJobs = () => {
    if (isEmployerJobsOpen) {
      handleCloseEmployerJobs();
    } else {
      setIsEmployerFaqDrawerOpen(false);
      if (isEmployerMsgOpen) handleCloseEmployerMsg();
      setIsEmployerJobsOpen(true);
      setIsEmployerJobsClosing(false);
    }
  };

  const handleCloseEmployerMsg = () => {
    setIsEmployerMsgClosing(true);
    setTimeout(() => {
      setIsEmployerMsgOpen(false);
      setIsEmployerMsgClosing(false);
    }, 220);
  };

  const handleToggleEmployerMsg = () => {
    if (isEmployerMsgOpen) {
      handleCloseEmployerMsg();
    } else {
      setIsEmployerFaqDrawerOpen(false);
      if (isEmployerJobsOpen) handleCloseEmployerJobs();
      setIsEmployerMsgOpen(true);
      setIsEmployerMsgClosing(false);
      if (selectedEmployerDetails?.employer_user_id) {
        fetchEmployerThreadMessages(selectedEmployerDetails.employer_user_id);
      }
    }
  };

  const handleSendEmployerMessage = async () => {
    const text = employerMsgInput.trim();
    if (!text || isEmployerMsgSending || !selectedEmployerDetails?.employer_user_id) return;

    const rawUser = localStorage.getItem("elitecruit-user");
    if (!rawUser) return;
    const currentUid = JSON.parse(rawUser)?.id;
    if (!currentUid) return;

    setIsEmployerMsgSending(true);
    try {
      if (employerMsgThread?.id) {
        const res = await fetch(`/api/messages/threads/${employerMsgThread.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender_user_id: currentUid,
            message_text: text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setEmployerMessages((prev) => [...prev, data.message]);
          setEmployerMsgInput("");
          window.dispatchEvent(new Event("elitecruit_messages_update"));
        }
      } else {
        const res = await fetch("/api/messages/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_by_user_id: currentUid,
            participant_user_ids: [selectedEmployerDetails.employer_user_id],
            title: `Employer: ${selectedEmployerDetails.company_name}`,
            message_text: text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setEmployerMsgThread(data.thread);
          setEmployerMessages([data.message]);
          setEmployerMsgInput("");
          window.dispatchEvent(new Event("elitecruit_messages_update"));
        }
      }
    } catch (err) {
      console.error("Failed to send message to employer:", err);
    } finally {
      setIsEmployerMsgSending(false);
    }
  };

  useEffect(() => {
    if (isEmployerMsgOpen && employerMsgEndRef.current) {
      employerMsgEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [employerMessages, isEmployerMsgOpen]);

  useEffect(() => {
    if (!isEmployerMsgOpen || !selectedEmployerDetails?.employer_user_id || !employerMsgThread?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/threads/${employerMsgThread.id}`);
        if (res.ok) {
          const data = await res.json();
          const msgs = data?.messages || [];
          if (msgs.length !== employerMessages.length) {
            setEmployerMessages(msgs);
            try {
              const rawUser = localStorage.getItem("elitecruit-user");
              const currentUid = rawUser ? JSON.parse(rawUser)?.id : null;
              if (currentUid) {
                await fetch(`/api/messages/threads/${employerMsgThread.id}/read`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ user_id: currentUid }),
                });
                window.dispatchEvent(new Event("elitecruit_messages_update"));
              }
            } catch {}
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [isEmployerMsgOpen, selectedEmployerDetails?.employer_user_id, employerMsgThread?.id, employerMessages.length]);

  const handleOpenEmployerFaqs = (employerUserId: number) => {
    setIsEmployerFaqDrawerOpen(true);
    setFaqLoading(true);
    setExpandedFaqIds([]);

    if (employerUserId) {
      fetch(`/api/employers/${employerUserId}/faqs`)
        .then((res) => res.json())
        .then((data) => {
          const rows = Array.isArray(data?.faqs)
            ? data.faqs.filter((f: any) => f.is_active !== 0)
            : [];
          if (rows.length > 0) {
            setCompanyFaqs(rows);
          } else {
            setCompanyFaqs(DEFAULT_FAQS);
          }
        })
        .catch(() => setCompanyFaqs(DEFAULT_FAQS))
        .finally(() => setFaqLoading(false));
    } else {
      setCompanyFaqs(DEFAULT_FAQS);
      setFaqLoading(false);
    }
  };

  return (
    <div className="jobsearch-page appdash-page sidebar-visible">
      <aside className="appdash-sidebar" aria-label="Applicant Navigation">
        <a href="/" className="appdash-brand">
          <strong>EliteCruit</strong>
          <span>Candidate Workspace</span>
        </a>

        <ul className="appdash-secondary-list">
          <li className="applicant-workspace-item">
            <a
              href="/applicant-dashboard"
              className="applicant-workspace-title"
              onClick={(e) => {
                e.preventDefault();
                setIsWorkspaceOpen((prev) => !prev);
              }}
            >
              <span className="title-main">
                <span className="item-icon"><SideIcon name="overview" /></span>
                <span>Applicant Workspace</span>
              </span>
              <span className="title-caret-btn" title="Toggle sub-menu">
                <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
              </span>
            </a>

            {isWorkspaceOpen && (
              <ul className="appdash-menu-list">
                <li><a href="/applicant-dashboard#section-overview"><span className="item-icon"><SideIcon name="overview" /></span><span>Overview</span></a></li>
                <li><a href="/applicant-dashboard#section-smart-matches"><span className="item-icon"><SideIcon name="star" /></span><span>Smart Matches</span></a></li>
                <li><a href="/applicant-dashboard#section-applications"><span className="item-icon"><SideIcon name="applications" /></span><span>My Applications</span></a></li>
                <li><a href="/applicant-dashboard#section-invitations"><span className="item-icon"><SideIcon name="notifications" /></span><span>Job Invitations</span></a></li>
              </ul>
            )}
          </li>

          <li className="active"><a href="/job-search"><span className="item-icon"><SideIcon name="search" /></span><span>Job Search</span></a></li>
          <li><a href="/messages"><span className="item-icon"><SideIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
          <li><a href="/notifications"><span className="item-icon"><SideIcon name="notifications" /></span><span>Notifications</span>{unreadNotifCount > 0 && <span className="item-badge">{unreadNotifCount}</span>}</a></li>
          <li><a href="/feedback"><span className="item-icon"><SideIcon name="feedback" /></span><span>Feedback</span></a></li>
        </ul>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)}>
            <span className="item-icon"><SideIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{applicantLabel}</strong><small>Applicant</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && (
            <div className="appdash-profile-menu">
              <a href="/my-profile"><SideIcon name="profile" />My Profile</a>
            <a href="/settings">
              <SideIcon name="settings" />
              Settings
            </a>
              
              <button
                type="button"
                className="appdash-profile-menu-btn"
                onClick={() => setIsLogoutModalOpen(true)}
              >
                <SideIcon name="logout" />Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main ref={mainRef} className="appdash-main jobsearch-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>{searchMode === "jobs" ? "Job Search" : "Employer Search"}</strong>
            </div>
          </div>

          <div className="appdash-top-right">
            <ApplicantChatbotDrawer
              isOpen={isChatbotOpen}
              onToggle={() => setIsChatbotOpen((prev) => !prev)}
              pageTitle={searchMode === "jobs" ? "Job Search" : "Employer Search"}
            />
            <CalendarDrawer />
          </div>
        </header>

        {/* ── MODE NAVIGATION TABS (Picture 2 Design) ── */}
        <nav className="profile-section-nav search-mode-nav" aria-label="Search Mode">
          <button
            type="button"
            className={`section-nav-btn ${searchMode === "jobs" ? "active" : ""}`}
            onClick={() => {
              setSearchMode("jobs");
              scrollToTop();
            }}
          >
            <span className="nav-num">1</span>
            <span>Job Search</span>
          </button>
          <button
            type="button"
            className={`section-nav-btn ${searchMode === "employers" ? "active" : ""}`}
            onClick={() => {
              setSearchMode("employers");
              scrollToTop();
            }}
          >
            <span className="nav-num">2</span>
            <span>Employer Search</span>
          </button>
        </nav>

        {searchMode === "jobs" && (
          <>
            <section className="search-bar-card">
          <div className="search-input-row">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Search roles, skills, companies, or locations"
            />
            <button type="button" className="find-jobs-btn" onClick={applySearch}>
              Search Jobs
            </button>
            <button
              type="button"
              className={`filter-toggle-btn ${isFiltersOpen ? "active" : ""}`}
              onClick={() => setIsFiltersOpen((prev) => !prev)}
            >
              <MiniIcon name="filters" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="filter-badge-count">{activeFilterCount}</span>
              )}
              <ChevronIcon direction={isFiltersOpen ? "up" : "down"} />
            </button>
          </div>

          {isFiltersOpen && (
            <div className="search-filters-dropdown">
              <div className="filters-grid">
                <div className="filter-field">
                  <label>Job Title / Role</label>
                  <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                    <option>All roles</option>
                    {BSIT_BSCS_JOB_TITLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Province</label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      setSelectedProvince(e.target.value);
                      setSelectedCity("All cities/municipalities");
                    }}
                  >
                    <option>All provinces</option>
                    {ALL_PHILIPPINES_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>City / Municipality</label>
                  <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                    <option>All cities/municipalities</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Work Arrangement</label>
                  <select value={selectedWorkArrangement} onChange={(e) => setSelectedWorkArrangement(e.target.value)}>
                    <option>Any arrangement</option>
                    {WORK_ARRANGEMENTS.map((wa) => (
                      <option key={wa} value={wa}>{wa}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Salary Range</label>
                  <select value={selectedMinSalary} onChange={(e) => setSelectedMinSalary(e.target.value)}>
                    <option>Any salary</option>
                    {SALARY_RANGES.map((sal) => (
                      <option key={sal} value={sal}>{sal}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Sort By</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "Newest" | "Match" | "Bookmarked")}>
                    <option value="Newest">By Newest</option>
                    <option value="Match">By Match</option>
                    <option value="Bookmarked">By Bookmarked</option>
                  </select>
                </div>
              </div>

              {/* 3 Selection Boxes with up to 5 items and years of experience */}
              <div className="filter-competencies-grid">
                <FilterCategoryEditor
                  title="Technical Skills"
                  availableOptions={ALL_UNIFIED_SKILLS}
                  items={filterSkills}
                  onChange={setFilterSkills}
                />
                <FilterCategoryEditor
                  title="Qualifications"
                  availableOptions={ALL_UNIFIED_QUALIFICATIONS}
                  items={filterQualifications}
                  onChange={setFilterQualifications}
                />
                <FilterCategoryEditor
                  title="Certifications"
                  availableOptions={ALL_UNIFIED_CERTIFICATIONS}
                  items={filterCertifications}
                  onChange={setFilterCertifications}
                />
              </div>

              <div className="filters-footer-row">
                <div className="active-filters-summary">
                  {activeFilterCount > 0 ? (
                    <span>{activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""} applied</span>
                  ) : (
                    <span>Showing all standard results</span>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button type="button" className="reset-filters-btn" onClick={resetFilters}>
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="jobsearch-content-grid">
          <div className="job-results-col">
            <section className="results-container">
              <header className="results-head">
                <p>
                  {visibleJobs.length === 0
                    ? "0 jobs found"
                    : `Showing ${(currentPage - 1) * JOBS_PER_PAGE + 1} - ${Math.min(currentPage * JOBS_PER_PAGE, visibleJobs.length)} of ${visibleJobs.length} job${visibleJobs.length === 1 ? "" : "s"} found`}
                </p>
              </header>

              {jobsMessage ? <p className="profile-message">{jobsMessage}</p> : null}

              {visibleJobs.length === 0 ? (
                <article className="result-card empty-state">
                  <div className="result-top">
                    <div>
                      <h3>No jobs found for current filters.</h3>
                      <p>Try changing one or more filters to see more job postings.</p>
                    </div>
                  </div>
                </article>
              ) : (
                paginatedJobs.map((job) => (
                  <article key={job.id} className="result-card">
                    <div className="result-card-main">
                      <div className="result-left-col">
                        <div className="result-title-row">
                          <h3 title={job.title}>{job.title}</h3>
                        </div>
                        <p className="meta-line">
                          <span><MiniIcon name="company" />{job.company}</span>
                          <RenderLocationMeta location={job.location} />
                        </p>
                        <p className="result-summary">{job.summary || "No job description provided yet."}</p>
                        <div className="result-tags">
                          <span className={`status-chip ${job.status === "open" ? "open" : "closed"}`}>{job.status === "open" ? "Open" : "Closed"}</span>
                          {job.urgent ? <span className="status-chip urgent">Urgent</span> : null}
                          <span className="setup-pill">{job.setup}</span>
                          {job.experienceLevel && <span className="exp-level-pill">{formatExperienceLevel(job.experienceLevel)}</span>}
                          <span className="salary-pill">{job.salary}</span>
                        </div>
                      </div>

                      <div className="result-middle-col">
                        <div className="result-middle-meta">
                          <span>Applications: {job.applicantCount}</span>
                          <span>Close Date: {job.closeDate}</span>
                          {job.skillTags.length > 0 && (
                            <div className="js-meta-tag-line">
                              <span className="js-meta-label">Skills: </span>
                              <RenderTagChips items={job.skillTags} type="skill" maxVisible={1} />
                            </div>
                          )}
                          {job.qualTags.length > 0 && (
                            <div className="js-meta-tag-line">
                              <span className="js-meta-label">Qualifications: </span>
                              <RenderTagChips items={job.qualTags} type="qualification" maxVisible={1} />
                            </div>
                          )}
                          {job.certTags && job.certTags.length > 0 && (
                            <div className="js-meta-tag-line">
                              <span className="js-meta-label">Certifications: </span>
                              <RenderTagChips items={job.certTags} type="certification" maxVisible={1} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="result-right-col">
                        <div className="card-top-actions">
                          <div className="rating-score-box" title="Company rating">
                            <span className="star-icon">★</span>
                            <span>{job.rating ? Number(job.rating).toFixed(1) : "0.0"}</span>
                          </div>
                          {(() => {
                            const matchInfo = calculateJobMatchDetails(job, applicantMatchProfile);
                            return (
                              <div className={`match-score-box ${getMatchColorClass(matchInfo.score)}`} title={matchInfo.breakdown}>
                                <small>Match</small>
                                <b>{matchInfo.score}%</b>
                              </div>
                            );
                          })()}
                        </div>
                        <button type="button" className="details-btn" onClick={() => setDetailsJob(job)}>Details</button>
                        <div className="card-bottom-actions">
                          <button type="button" className={`solid-btn apply-right-btn ${appliedJobIds.includes(job.id) ? "applied-btn" : ""}`} onClick={() => setApplyJobTarget({ jobId: job.id, title: job.title })} disabled={appliedJobIds.includes(job.id) || applyingJobId === job.id}>{appliedJobIds.includes(job.id) ? "Applied" : applyingJobId === job.id ? "Applying..." : "Apply"}</button>
                          <button type="button" className="bookmark-icon-btn" aria-label={bookmarkedIds.includes(job.id) ? "Remove bookmark" : "Bookmark job"} onClick={() => toggleBookmark(job.id)}>
                            <MiniIcon name={bookmarkedIds.includes(job.id) ? "bookmarkFilled" : "bookmark"} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}

              {totalPages > 1 && (
                <div
                  className="jobsearch-pagination"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "12px",
                    marginTop: "24px",
                    marginBottom: "16px",
                  }}
                >
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      scrollToTop();
                    }}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: currentPage === 1 ? "#f8fafc" : "#ffffff",
                      color: currentPage === 1 ? "#94a3b8" : "#1e293b",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      boxShadow: currentPage === 1 ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    &larr; Previous
                  </button>
                  <span style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 600 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      scrollToTop();
                    }}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: currentPage === totalPages ? "#f8fafc" : "#ffffff",
                      color: currentPage === totalPages ? "#94a3b8" : "#1e293b",
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      boxShadow: currentPage === totalPages ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </section>
          </div>
        </section>
      </>
    )}

    {searchMode === "employers" && (
      <>
        <section className="search-bar-card">
          <div className="search-input-row">
            <input
              type="text"
              value={employerSearchInput}
              onChange={(event) => setEmployerSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyEmployerSearch();
              }}
              placeholder="Search employers by company name, industry, or location..."
            />
            <button type="button" className="find-jobs-btn" onClick={applyEmployerSearch}>
              Search Employers
            </button>
            <button
              type="button"
              className={`filter-toggle-btn ${isEmployerFiltersOpen ? "active" : ""}`}
              onClick={() => setIsEmployerFiltersOpen((prev) => !prev)}
            >
              <MiniIcon name="filters" />
              <span>Filters</span>
              {employerActiveFilterCount > 0 && (
                <span className="filter-badge-count">{employerActiveFilterCount}</span>
              )}
              <ChevronIcon direction={isEmployerFiltersOpen ? "up" : "down"} />
            </button>
          </div>

          {isEmployerFiltersOpen && (
            <div className="search-filters-dropdown">
              <div className="filters-grid">
                <div className="filter-field">
                  <label>Industry</label>
                  <select
                    value={employerSelectedIndustry}
                    onChange={(e) => setEmployerSelectedIndustry(e.target.value)}
                  >
                    <option>All industries</option>
                    {EMPLOYER_INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Province</label>
                  <select
                    value={employerSelectedProvince}
                    onChange={(e) => {
                      setEmployerSelectedProvince(e.target.value);
                      setEmployerSelectedCity("All cities/municipalities");
                    }}
                  >
                    <option>All provinces</option>
                    {ALL_PHILIPPINES_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>City / Municipality</label>
                  <select
                    value={employerSelectedCity}
                    onChange={(e) => setEmployerSelectedCity(e.target.value)}
                  >
                    <option>All cities/municipalities</option>
                    {availableEmployerCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Company Size</label>
                  <select
                    value={employerSelectedSize}
                    onChange={(e) => setEmployerSelectedSize(e.target.value)}
                  >
                    <option>All sizes</option>
                    {EMPLOYER_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Sort By</label>
                  <select
                    value={employerSortBy}
                    onChange={(e) =>
                      setEmployerSortBy(
                        e.target.value as "active_jobs" | "rating" | "name_asc" | "name_desc"
                      )
                    }
                  >
                    <option value="active_jobs">Most Active Jobs</option>
                    <option value="rating">Highest Rated</option>
                    <option value="name_asc">Company Name (A-Z)</option>
                    <option value="name_desc">Company Name (Z-A)</option>
                  </select>
                </div>
              </div>

              <div className="filters-footer-row">
                <div className="active-filters-summary">
                  {employerActiveFilterCount > 0 ? (
                    <span>
                      {employerActiveFilterCount} active filter
                      {employerActiveFilterCount > 1 ? "s" : ""} applied
                    </span>
                  ) : (
                    <span>Showing all registered employers</span>
                  )}
                </div>
                {employerActiveFilterCount > 0 && (
                  <button
                    type="button"
                    className="reset-filters-btn"
                    onClick={resetEmployerFilters}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="jobsearch-content-grid">
          <div className="job-results-col">
            <section className="results-container">
              <header className="results-head">
                <p>
                  {visibleEmployers.length === 0
                    ? "0 employers found"
                    : `Showing ${(employerCurrentPage - 1) * EMPLOYERS_PER_PAGE + 1} - ${Math.min(
                        employerCurrentPage * EMPLOYERS_PER_PAGE,
                        visibleEmployers.length
                      )} of ${visibleEmployers.length} employer${
                        visibleEmployers.length === 1 ? "" : "s"
                      } found`}
                </p>
              </header>

              {visibleEmployers.length === 0 ? (
                <article className="result-card empty-state">
                  <div className="result-top">
                    <div>
                      <h3>No employers found matching current criteria.</h3>
                      <p>Try clearing your search query or adjusting your filters.</p>
                    </div>
                  </div>
                </article>
              ) : (
                paginatedEmployers.map((employer) => (
                  <article key={employer.employer_user_id} className="result-card employer-result-card">
                    <div className="result-card-main">
                      <div className="result-left-col">
                        <div className="result-title-row" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          {employer.company_logo_path ? (
                            <img
                              src={
                                employer.company_logo_path.startsWith("http") || employer.company_logo_path.startsWith("/api")
                                  ? employer.company_logo_path
                                  : `/api/employers/${employer.employer_user_id}/logo`
                              }
                              alt={employer.company_name}
                              className="employer-card-logo"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const nextEl = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextEl) nextEl.style.display = "grid";
                              }}
                            />
                          ) : null}
                          <div
                            className="employer-avatar-fallback"
                            style={{ display: employer.company_logo_path ? "none" : "grid" }}
                          >
                            {employer.company_name?.charAt(0)?.toUpperCase() || "E"}
                          </div>
                          <div>
                            <h3 title={employer.company_name} style={{ margin: 0, fontSize: "1.1rem" }}>
                              {employer.company_name}
                            </h3>
                            <p className="meta-line" style={{ marginTop: "4px", marginBottom: 0 }}>
                              <RenderLocationMeta location={formatLocationWithCavite(employer.location || employer.city)} />
                              {employer.industry && (
                                <span className="emp-industry-tag">
                                  {employer.industry.toUpperCase()}
                                </span>
                              )}
                              {employer.company_size && <span className="emp-size-tag">{employer.company_size}</span>}
                            </p>
                          </div>
                        </div>

                        <p className="result-summary" style={{ marginTop: "10px" }}>
                          {shortenText(employer.company_description, "No company description provided yet.", 160)}
                        </p>

                        <div className="result-tags employer-tags-row">
                          {employer.active_jobs_count > 0 ? (
                            <span className="status-chip open">
                              {employer.active_jobs_count} Open Position{employer.active_jobs_count > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="status-chip closed">No Active Postings</span>
                          )}
                        </div>
                      </div>

                      <div className="result-right-col">
                        <div className="card-top-actions">
                          <div className="rating-score-box" title="Employer rating">
                            <span className="star-icon">★</span>
                            <span>{employer.rating ? Number(employer.rating).toFixed(1) : "0.0"}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="details-btn"
                          onClick={() => handleOpenEmployerDetails(employer)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}

              {employerTotalPages > 1 && (
                <div
                  className="jobsearch-pagination"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "12px",
                    marginTop: "24px",
                    marginBottom: "16px",
                  }}
                >
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={employerCurrentPage === 1}
                    onClick={() => {
                      setEmployerCurrentPage((p) => Math.max(1, p - 1));
                      scrollToTop();
                    }}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: employerCurrentPage === 1 ? "#f8fafc" : "#ffffff",
                      color: employerCurrentPage === 1 ? "#94a3b8" : "#1e293b",
                      cursor: employerCurrentPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      boxShadow: employerCurrentPage === 1 ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    &larr; Previous
                  </button>
                  <span style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 600 }}>
                    Page {employerCurrentPage} of {employerTotalPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={employerCurrentPage === employerTotalPages}
                    onClick={() => {
                      setEmployerCurrentPage((p) => Math.min(employerTotalPages, p + 1));
                      scrollToTop();
                    }}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: employerCurrentPage === employerTotalPages ? "#f8fafc" : "#ffffff",
                      color: employerCurrentPage === employerTotalPages ? "#94a3b8" : "#1e293b",
                      cursor: employerCurrentPage === employerTotalPages ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      boxShadow: employerCurrentPage === employerTotalPages ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </section>
          </div>
        </section>
      </>
    )}
      </main>

      {/* ── Job Details Modal ── */}
      {detailsJob && (
        <div
          className="jd-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Job Details"
          style={selectedEmployerDetails ? { zIndex: 2500 } : undefined}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseJobDetails();
            }
          }}
        >
          <div className={`jd-modal-container ${isMatchDrawerOpen || isMatchDrawerClosing ? "with-side-panel" : ""}`}>
            {/* ── Main Job Details Panel (Left) ── */}
            <div className="jd-panel">
              {/* Cover banner */}
              <div className="jd-cover-banner">
                {detailsJob.companyCoverPath ? (
                  <img
                    src={detailsJob.companyCoverPath.startsWith("http") || detailsJob.companyCoverPath.startsWith("/api") ? detailsJob.companyCoverPath : `/api/employers/${detailsJob.employerUserId}/cover`}
                    alt={`${detailsJob.company} cover`}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                      const placeholder = e.currentTarget.parentElement?.querySelector(".jd-cover-placeholder") as HTMLElement;
                      if (placeholder) placeholder.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="jd-cover-placeholder" style={{ display: detailsJob.companyCoverPath ? "none" : "flex" }}>
                  <span>Cover photo</span>
                </div>
              </div>

              <div className="jd-employer-strip">
                <div className="jd-employer-logo-info">
                  <div className="jd-employer-logo" aria-label="Company logo" style={{ overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {(() => {
                      const logoSrc = detailsJob.companyLogoPath
                        ? (detailsJob.companyLogoPath.startsWith("http") || detailsJob.companyLogoPath.startsWith("/api") ? detailsJob.companyLogoPath : `/api/employers/${detailsJob.employerUserId}/logo`)
                        : (detailsJob.employerUserId ? `/api/employers/${detailsJob.employerUserId}/logo` : null);
                      return (
                        <>
                          {logoSrc && (
                            <img
                              src={logoSrc}
                              alt={detailsJob.company}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
                                  }
                                }}
                              />
                            )}
                            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ display: logoSrc ? "none" : "block" }}>
                              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
                            </svg>
                          </>
                        );
                      })()}
                    </div>
                    <div>
                      <strong className="jd-employer-name">{detailsJob.company}</strong>
                      <span className="jd-employer-location"><RenderLocationMeta location={detailsJob.location} /></span>
                    </div>
                  </div>
                  <div className="jd-header-right-actions">
                    <div className="rating-score-box" title="Company rating">
                      <span className="star-icon">★</span>
                      <span>{detailsJob.rating ? Number(detailsJob.rating).toFixed(1) : "0.0"}</span>
                    </div>
                    {(() => {
                      const detailsMatchInfo = calculateJobMatchDetails(detailsJob, applicantMatchProfile);
                      return (
                        <div
                          className={`match-score-box ${getMatchColorClass(detailsMatchInfo.score)}`}
                          title="Match Score"
                        >
                          <small>MATCH</small>
                          <b>{detailsMatchInfo.score}%</b>
                        </div>
                      );
                    })()}
                    <button
                      type="button"
                      className={`jd-faq-btn ${isFaqDrawerOpen ? "active" : ""}`}
                      onClick={() => {
                        if (isFaqDrawerOpen) {
                          setIsFaqDrawerOpen(false);
                        } else {
                          handleOpenFaqs(detailsJob);
                        }
                      }}
                    >
                      FAQ's
                    </button>
                  </div>
                </div>

              {/* Scrollable body & drawer container */}
              <div className="jd-body-wrapper">
                <div className="jd-body">
                  {/* Title row */}
                  <div className="jd-top-section">
                    <div className="jd-title-row">
                      <h2 className="jd-title-h2">{detailsJob.title}</h2>
                    </div>
                    <div className="jd-chips-inline">
                      <span className={`status-chip ${detailsJob.status === "open" ? "open" : "closed"}`}>{detailsJob.status === "open" ? "Open" : "Closed"}</span>
                      {detailsJob.urgent && <span className="status-chip urgent">Urgent</span>}
                      <span className="setup-pill">{detailsJob.setup}</span>
                      {detailsJob.experienceLevel && <span className="exp-level-pill">{formatExperienceLevel(detailsJob.experienceLevel)}</span>}
                      <span className="salary-pill">{detailsJob.salary}</span>
                    </div>
                  </div>

                  <div className="jd-section">
                    <h3>Job Description</h3>
                    <p>{detailsJob.summary || "No description provided."}</p>
                  </div>

                  {(detailsJob.skillTags?.length ?? 0) > 0 && (
                    <div className="jd-section">
                      <h3>Required Skills</h3>
                      <div className="jd-tags-wrap">
                        {detailsJob.skillTags?.map((s) => (
                          <span className="js-tag-chip js-tag-skill" key={s} title={s}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detailsJob.qualTags?.length ?? 0) > 0 && (
                    <div className="jd-section">
                      <h3>Required Qualifications</h3>
                      <div className="jd-tags-wrap">
                        {detailsJob.qualTags?.map((q) => (
                          <span className="js-tag-chip js-tag-qualification" key={q} title={q}>{q}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detailsJob.certTags?.length ?? 0) > 0 && (
                    <div className="jd-section">
                      <h3>Required Certifications</h3>
                      <div className="jd-tags-wrap">
                        {detailsJob.certTags?.map((c) => (
                          <span className="js-tag-chip js-tag-certification" key={c} title={c}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slide-in FAQ Drawer (Internal to jd-panel) */}
                <div className={`jd-faq-drawer ${isFaqDrawerOpen ? "open" : ""}`}>
                  <div className="jd-faq-header">
                    <h3>Company FAQ's</h3>
                    <button type="button" className="jd-faq-back-btn" aria-label="Back to job details" onClick={() => setIsFaqDrawerOpen(false)}>
                      ←
                    </button>
                  </div>
                  <div className="jd-faq-body">
                    {faqLoading ? (
                      <p className="jd-faq-loading">Loading FAQ's...</p>
                    ) : companyFaqs.length === 0 ? (
                      <p className="jd-faq-empty">No FAQ's created by this company yet.</p>
                    ) : (
                      companyFaqs.map((faq) => {
                        const isExpanded = expandedFaqIds.includes(faq.id);
                        return (
                          <div key={faq.id} className={`jd-faq-item ${isExpanded ? "expanded" : ""}`}>
                            <button
                              type="button"
                              className="jd-faq-question-btn"
                              onClick={() => {
                                setExpandedFaqIds((prev) =>
                                  prev.includes(faq.id) ? prev.filter((id) => id !== faq.id) : [...prev, faq.id]
                                );
                              }}
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

              <div className="jd-panel-footer">
                <div className="jd-footer-meta">
                  <span><strong>Applications:</strong> {detailsJob.applicantCount}</span>
                  <span><strong>Close Date:</strong> {detailsJob.closeDate}</span>
                </div>
                <div className="jd-footer-middle">
                  <button
                    type="button"
                    className={`jd-breakdown-btn ${isMatchDrawerOpen && !isMatchDrawerClosing ? "active" : ""}`}
                    onClick={handleToggleMatchDrawer}
                  >
                    <span>{isMatchDrawerOpen && !isMatchDrawerClosing ? "Hide Breakdown" : "Match Breakdown"}</span>
                  </button>
                </div>
                <div className="jd-footer-actions">
                  <button
                    type="button"
                    className="jd-cancel-btn"
                    onClick={handleCloseJobDetails}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className={`solid-btn ${appliedJobIds.includes(detailsJob.id) ? "applied-btn" : ""}`}
                    onClick={() => setApplyJobTarget({ jobId: detailsJob.id, title: detailsJob.title })}
                    disabled={appliedJobIds.includes(detailsJob.id) || applyingJobId === detailsJob.id}
                  >
                    {appliedJobIds.includes(detailsJob.id) ? "Applied" : applyingJobId === detailsJob.id ? "Applying..." : "Apply Now"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right Side Comparison Panel (Outside Main Modal) ── */}
            {(isMatchDrawerOpen || isMatchDrawerClosing) && (() => {
              const matchDetails = calculateJobMatchDetails(detailsJob, applicantMatchProfile);
              const appSkills = applicantMatchProfile?.skills || [];
              const appQuals = applicantMatchProfile?.qualifications || [];
              const appCerts = applicantMatchProfile?.certifications || [];

              const jobSkills = detailsJob.skillTags || [];
              const jobQuals = detailsJob.qualTags || [];
              const jobCerts = detailsJob.certTags || [];

              const checkMatch = (jobItem: string, appItems: string[]) => {
                if (!appItems || appItems.length === 0) return false;
                return appItems.some((appItem) => isSkillMatch(jobItem, appItem));
              };

              const isAppRelevant = (appItem: string, jItems: string[]) => {
                if (!jItems || jItems.length === 0) return false;
                return jItems.some((jobItem) => isSkillMatch(jobItem, appItem));
              };

              return (
                <aside className={`jd-side-comparison-panel ${isMatchDrawerClosing ? "closing" : "opening"}`}>
                  <div className="jd-side-panel-header">
                    <div className="jd-side-title-row">
                      <h3>Competencies & Requirements</h3>
                      <span className="jd-side-subtitle">Side-by-side profile match vs employer postings</span>
                    </div>
                    <div className="jd-side-header-actions">
                      <span className={`match-badge-pill ${getMatchColorClass(matchDetails.score)}`}>
                        {matchDetails.score}% Match
                      </span>
                      <button
                        type="button"
                        className="jd-side-close-btn"
                        aria-label="Close comparison panel"
                        onClick={handleCloseMatchDrawer}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="jd-side-panel-body">
                    {/* Legend strip */}
                    <div className="jd-compare-legend">
                      <div className="legend-item">
                        <span className="legend-dot green"></span>
                        <span><strong>Green Tag:</strong> Matched with your profile</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot red"></span>
                        <span><strong>Red Tag:</strong> Required by employer, missing from your profile</span>
                      </div>
                    </div>

                    {/* Master 2-Column Unified Container */}
                    <div className="jd-unified-compare-container">
                      {/* ── Column 1: Applicant Profile ── */}
                      <div className="jd-master-col applicant-col">
                        <div className="jd-master-col-header">
                          <span>Your Profile</span>
                        </div>
                        <div className="jd-master-col-content">
                          {/* 1. Location */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Location</span>
                            <div className="jd-col-tags-container">
                              <span className="jd-comp-tag app-neutral">
                                <span className="tag-text">{formatLocationWithCavite(applicantMatchProfile?.city || "Mendez")}</span>
                              </span>
                            </div>
                          </div>

                          {/* 2. Work Arrangement */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Work Arrangement</span>
                            <div className="jd-col-tags-container">
                              <span className="jd-comp-tag app-neutral">
                                <span className="tag-text">{applicantMatchProfile?.workArrangement || "Any"}</span>
                              </span>
                            </div>
                          </div>

                          {/* 3. Salary Range */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Salary Range</span>
                            <div className="jd-col-tags-container">
                              <span className="jd-comp-tag app-neutral">
                                <span className="tag-text">
                                  {applicantMatchProfile?.expectedSalary
                                    ? `PHP ${Number(applicantMatchProfile.expectedSalary).toLocaleString()}`
                                    : "Not set"}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* 4. Skills */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Skills</span>
                              <span className="col-count-text">{appSkills.length} listed</span>
                            </div>
                            <div className="jd-col-tags-container">
                                {appSkills.length > 0 ? (
                                  appSkills.map((item) => {
                                    const isRel = isAppRelevant(item, jobSkills);
                                    const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                    const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                    return (
                                      <span
                                        key={item}
                                        className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                        onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "skills" })}
                                        onMouseLeave={() => setHoveredCompareTag(null)}
                                      >
                                        {isRel && <span className="tag-check">✓ </span>}
                                        <span className="tag-text">{item}</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="jd-no-data-text">No skills in your profile</span>
                                )}
                              </div>
                            </div>

                            {/* 5. Qualifications */}
                            <div className="jd-master-row">
                              <div className="jd-row-label-wrap">
                                <span className="jd-row-label">Qualifications</span>
                                <span className="col-count-text">{appQuals.length} listed</span>
                              </div>
                              <div className="jd-col-tags-container">
                                {appQuals.length > 0 ? (
                                  appQuals.map((item) => {
                                    const isRel = isAppRelevant(item, jobQuals);
                                    const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                    const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                    return (
                                      <span
                                        key={item}
                                        className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                        onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "qualifications" })}
                                        onMouseLeave={() => setHoveredCompareTag(null)}
                                      >
                                        {isRel && <span className="tag-check">✓ </span>}
                                        <span className="tag-text">{item}</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="jd-no-data-text">No qualifications in your profile</span>
                                )}
                              </div>
                            </div>

                            {/* 6. Certifications */}
                            <div className="jd-master-row">
                              <div className="jd-row-label-wrap">
                                <span className="jd-row-label">Certifications</span>
                                <span className="col-count-text">{appCerts.length} listed</span>
                              </div>
                              <div className="jd-col-tags-container">
                                {appCerts.length > 0 ? (
                                  appCerts.map((item) => {
                                    const isRel = isAppRelevant(item, jobCerts);
                                    const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                    const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                    return (
                                      <span
                                        key={item}
                                        className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                        onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "certifications" })}
                                        onMouseLeave={() => setHoveredCompareTag(null)}
                                      >
                                        {isRel && <span className="tag-check">✓ </span>}
                                        <span className="tag-text">{item}</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="jd-no-data-text">No certifications in your profile</span>
                                )}
                              </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Column 2: Employer Requirements ── */}
                      <div className="jd-master-col employer-col">
                        <div className="jd-master-col-header employer">
                          <span>Employer's Requirements</span>
                        </div>
                        <div className="jd-master-col-content">
                          {/* 1. Location */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Location</span>
                            <div className="jd-col-tags-container">
                              {(() => {
                                const matched = matchDetails.locationPts >= 12;
                                return (
                                  <span
                                    className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                    title={matched ? "Matched with your location" : "Different location"}
                                  >
                                    <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                    <span className="tag-text">{formatLocationWithCavite(detailsJob.location)}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* 2. Work Arrangement */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Work Arrangement</span>
                            <div className="jd-col-tags-container">
                              {(() => {
                                const matched = matchDetails.setupPts >= 15;
                                return (
                                  <span
                                    className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                    title={matched ? "Matched with your setup preference" : "Different work arrangement"}
                                  >
                                    <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                    <span className="tag-text">{detailsJob.setup || "Standard"}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* 3. Salary Range */}
                          <div className="jd-master-row">
                            <span className="jd-row-label">Salary Range</span>
                            <div className="jd-col-tags-container">
                              {(() => {
                                const matched = matchDetails.salaryPts >= 12;
                                return (
                                  <span
                                    className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                    title={matched ? "Matches your salary range" : "Different salary range"}
                                  >
                                    <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                    <span className="tag-text">{detailsJob.salary}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* 4. Skills */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Skills</span>
                              <span className="col-count-text">{jobSkills.length} required</span>
                            </div>
                            <div className="jd-col-tags-container">
                              {jobSkills.length > 0 ? (
                                jobSkills.map((item) => {
                                  const matched = checkMatch(item, appSkills);
                                  const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                  const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                  return (
                                    <span
                                      key={item}
                                      className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                      onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "skills" })}
                                      onMouseLeave={() => setHoveredCompareTag(null)}
                                    >
                                      <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="jd-no-data-text">No specific skills required</span>
                              )}
                            </div>
                          </div>

                          {/* 5. Qualifications */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Qualifications</span>
                              <span className="col-count-text">{jobQuals.length} required</span>
                            </div>
                            <div className="jd-col-tags-container">
                              {jobQuals.length > 0 ? (
                                jobQuals.map((item) => {
                                  const matched = checkMatch(item, appQuals);
                                  const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                  const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                  return (
                                    <span
                                      key={item}
                                      className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                      onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "qualifications" })}
                                      onMouseLeave={() => setHoveredCompareTag(null)}
                                    >
                                      <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="jd-no-data-text">No specific qualifications required</span>
                              )}
                            </div>
                          </div>

                          {/* 6. Certifications */}
                          <div className="jd-master-row">
                            <div className="jd-row-label-wrap">
                              <span className="jd-row-label">Certifications</span>
                              <span className="col-count-text">{jobCerts.length} required</span>
                            </div>
                            <div className="jd-col-tags-container">
                              {jobCerts.length > 0 ? (
                                jobCerts.map((item) => {
                                  const matched = checkMatch(item, appCerts);
                                  const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                  const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                  return (
                                    <span
                                      key={item}
                                      className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                      onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "certifications" })}
                                      onMouseLeave={() => setHoveredCompareTag(null)}
                                    >
                                      <span className="tag-icon">{matched ? "✓" : "✗"}</span>
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="jd-no-data-text">No certifications required for this position</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── COMPANY DETAILS MODAL (Picture 2) ── */}
      {selectedEmployerDetails && (
        <div
          className="jd-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Company Details"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedEmployerDetails(null);
              setIsEmployerFaqDrawerOpen(false);
              setIsEmployerMsgOpen(false);
              setIsEmployerMsgClosing(false);
              setIsEmployerJobsOpen(false);
              setIsEmployerJobsClosing(false);
            }
          }}
        >
          <div
            className={`jd-modal-container ${
              isEmployerMsgOpen || isEmployerMsgClosing || isEmployerJobsOpen || isEmployerJobsClosing
                ? "with-side-panel"
                : ""
            }`}
            style={{
              maxWidth:
                isEmployerMsgOpen || isEmployerMsgClosing || isEmployerJobsOpen || isEmployerJobsClosing
                  ? "1150px"
                  : "700px",
            }}
          >
            <div className="jd-panel-outer-wrap">
              <div className="jd-floating-tabs-container">
                <button
                  type="button"
                  className={`jd-floating-breakdown-tab ${isEmployerJobsOpen && !isEmployerJobsClosing ? "active" : ""}`}
                  onClick={handleToggleEmployerJobs}
                >
                  <span>{isEmployerJobsOpen && !isEmployerJobsClosing ? "Hide Job List" : "Job List"}</span>
                </button>
                <button
                  type="button"
                  className={`jd-floating-breakdown-tab ${isEmployerMsgOpen && !isEmployerMsgClosing ? "active" : ""}`}
                  onClick={handleToggleEmployerMsg}
                >
                  <span>{isEmployerMsgOpen && !isEmployerMsgClosing ? "Hide Message" : "Message"}</span>
                </button>
              </div>
              <div className="jd-panel">
              {/* Cover banner */}
              <div className="jd-cover-banner">
                {selectedEmployerDetails.company_cover_path ? (
                  <img
                    src={
                      selectedEmployerDetails.company_cover_path.startsWith("http") || selectedEmployerDetails.company_cover_path.startsWith("/api")
                        ? selectedEmployerDetails.company_cover_path
                        : `/api/employers/${selectedEmployerDetails.employer_user_id}/cover`
                    }
                    alt={`${selectedEmployerDetails.company_name} cover`}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                      const placeholder = e.currentTarget.parentElement?.querySelector(".jd-cover-placeholder") as HTMLElement;
                      if (placeholder) placeholder.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="jd-cover-placeholder" style={{ display: selectedEmployerDetails.company_cover_path ? "none" : "flex" }}>
                  <span>Company Cover</span>
                </div>
              </div>

              {/* Employer strip underneath banner */}
              <div className="jd-employer-strip">
                <div className="jd-employer-logo-info">
                  <div
                    className="jd-employer-logo"
                    aria-label="Company logo"
                    style={{ overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {(() => {
                      const logoSrc = selectedEmployerDetails.company_logo_path
                        ? selectedEmployerDetails.company_logo_path.startsWith("http") || selectedEmployerDetails.company_logo_path.startsWith("/api")
                          ? selectedEmployerDetails.company_logo_path
                          : `/api/employers/${selectedEmployerDetails.employer_user_id}/logo`
                        : `/api/employers/${selectedEmployerDetails.employer_user_id}/logo`;
                      return (
                        <>
                          <img
                            src={logoSrc}
                            alt={selectedEmployerDetails.company_name}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
                              }
                            }}
                          />
                          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ display: "none", width: "32px", height: "32px", stroke: "#0284c7" }}>
                            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
                          </svg>
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <strong className="jd-employer-name">{selectedEmployerDetails.company_name}</strong>
                    <span className="jd-employer-location">
                      <svg viewBox="0 0 24 24" aria-hidden="true" width="13" height="13" fill="none" stroke="#5b8ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      {selectedEmployerDetails.industry ? selectedEmployerDetails.industry.toUpperCase() : "GENERAL INDUSTRY"}
                    </span>
                  </div>
                </div>

                <div className="jd-header-right-actions">
                  <div className="rating-score-box" title="Company rating">
                    <span className="star-icon">★</span>
                    <span>{selectedEmployerDetails.rating ? Number(selectedEmployerDetails.rating).toFixed(1) : "0.0"}</span>
                  </div>
                  <button
                    type="button"
                    className={`jd-faq-btn ${isEmployerFaqDrawerOpen ? "active" : ""}`}
                    onClick={() => {
                      if (isEmployerFaqDrawerOpen) {
                        setIsEmployerFaqDrawerOpen(false);
                      } else {
                        if (isEmployerMsgOpen) handleCloseEmployerMsg();
                        if (isEmployerJobsOpen) handleCloseEmployerJobs();
                        handleOpenEmployerFaqs(selectedEmployerDetails.employer_user_id);
                      }
                    }}
                  >
                    FAQ's
                  </button>
                </div>
              </div>

              {/* Scrollable body & drawer container */}
              <div className="jd-body-wrapper" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div className="jd-body" style={{ maxHeight: "calc(88vh - 280px)", overflowY: "auto", padding: "20px 24px" }}>
                  {/* Section: Company Overview */}
                  <div style={{ marginBottom: "24px" }}>
                    <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, marginBottom: "8px" }}>
                      About Company
                    </h3>
                    <p className="company-modal-about" style={{ fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
                      {selectedEmployerDetails.company_description || "No company description provided."}
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
                          {selectedEmployerDetails.business_email || "Not provided"}
                        </span>
                      </div>

                      <div className="company-info-card" style={{ padding: "12px 14px", borderRadius: "10px" }}>
                        <small className="company-info-card-label" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>CONTACT NUMBER</small>
                        <span className="company-info-card-val" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                          {selectedEmployerDetails.contact_number || "Not provided"}
                        </span>
                      </div>

                      {selectedEmployerDetails.website && (
                        <div className="company-info-card" style={{ padding: "12px 14px", borderRadius: "10px" }}>
                          <small className="company-info-card-label" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>WEBSITE</small>
                          <a
                            href={selectedEmployerDetails.website.startsWith("http") ? selectedEmployerDetails.website : `https://${selectedEmployerDetails.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0284c7", fontSize: "0.88rem", fontWeight: 600, textDecoration: "underline", wordBreak: "break-all" }}
                          >
                            {selectedEmployerDetails.website}
                          </a>
                        </div>
                      )}

                      <div className="company-info-card" style={{ padding: "12px 14px", borderRadius: "10px" }}>
                        <small className="company-info-card-label" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>HEADQUARTERS</small>
                        <span className="company-info-card-val" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                          {selectedEmployerDetails.company_address || selectedEmployerDetails.city || selectedEmployerDetails.location || "Cavite"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide-in FAQ Drawer */}
                <div className={`jd-faq-drawer ${isEmployerFaqDrawerOpen ? "open" : ""}`}>
                  <div className="jd-faq-header">
                    <h3>Company FAQ's</h3>
                    <button type="button" className="jd-faq-back-btn" aria-label="Back to company details" onClick={() => setIsEmployerFaqDrawerOpen(false)}>
                      ←
                    </button>
                  </div>
                  <div className="jd-faq-body">
                    {faqLoading ? (
                      <p className="jd-faq-loading">Loading FAQ's...</p>
                    ) : companyFaqs.length === 0 ? (
                      <p className="jd-faq-empty">No FAQ's created by this company yet.</p>
                    ) : (
                      companyFaqs.map((faq) => {
                        const isExpanded = expandedFaqIds.includes(faq.id);
                        return (
                          <div key={faq.id} className={`jd-faq-item ${isExpanded ? "expanded" : ""}`}>
                            <button
                              type="button"
                              className="jd-faq-question-btn"
                              onClick={() => {
                                setExpandedFaqIds((prev) =>
                                  prev.includes(faq.id) ? prev.filter((id) => id !== faq.id) : [...prev, faq.id]
                                );
                              }}
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
              <div className="jd-footer" style={{ padding: "16px 24px", borderTop: "1px solid #2e3244", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="cand-details-cancel-btn"
                  onClick={() => {
                    setSelectedEmployerDetails(null);
                    setIsEmployerFaqDrawerOpen(false);
                    setIsEmployerMsgOpen(false);
                    setIsEmployerMsgClosing(false);
                    setIsEmployerJobsOpen(false);
                    setIsEmployerJobsClosing(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* ── Employer Side-Docked Jobs Panel ── */}
          {(isEmployerJobsOpen || isEmployerJobsClosing) && selectedEmployerDetails && (
            <aside
              className={`jd-side-comparison-panel ${isEmployerJobsClosing ? "closing" : "opening"}`}
              style={{ marginTop: "44px", fontFamily: '"Manrope", sans-serif' }}
            >
              <div className="jd-side-panel-header" style={{ fontFamily: '"Manrope", sans-serif' }}>
                <div className="jd-side-title-row">
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                    Other Employer Jobs
                  </h3>
                  <span className="jd-side-subtitle" style={{ fontSize: "0.82rem", color: "#557796", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                    Candidate compatibility across your active job postings
                  </span>
                </div>
                <div className="jd-side-header-actions">
                  <button
                    type="button"
                    className="jd-side-close-btn"
                    aria-label="Close jobs panel"
                    onClick={handleCloseEmployerJobs}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div
                className="jd-side-panel-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  padding: "18px",
                  fontFamily: '"Manrope", sans-serif',
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                {(!selectedEmployerDetails.jobs || selectedEmployerDetails.jobs.length === 0) ? (
                  <div style={{ textAlign: "center", color: "#64748b", padding: "30px 10px", fontSize: "0.9rem", fontFamily: '"Manrope", sans-serif' }}>
                    No active job openings posted by this employer at the moment.
                  </div>
                ) : (
                  selectedEmployerDetails.jobs.map((j) => {
                    const foundJob = jobs.find((x) => x.id === j.id);
                    const matchPct = foundJob
                      ? calculateJobMatchDetails(foundJob, applicantMatchProfile).score
                      : 85;

                    return (
                      <div
                        key={j.id}
                        className="jd-other-job-card"
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "16px",
                          boxShadow: "0 4px 12px rgba(10, 30, 60, 0.05)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          fontFamily: '"Manrope", sans-serif',
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                            {j.title}
                          </h4>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "2px", fontSize: "0.8rem", color: "#64748b", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: '"Manrope", sans-serif' }}>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                                <circle cx="12" cy="10" r="2.5" />
                              </svg>
                              {j.location || selectedEmployerDetails.location || "Cavite"}
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: '"Manrope", sans-serif' }}>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                              </svg>
                              {j.work_arrangement || "On-Site"}
                            </span>
                            {j.salary_min ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: '"Manrope", sans-serif' }}>
                                {formatSalary(j.salary_min, j.salary_max)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                          <span
                            className={`jd-other-job-match-pill ${matchPct >= 80 ? "green" : matchPct >= 50 ? "yellow" : "red"}`}
                          >
                            {matchPct}% Match
                          </span>
                          <button
                            type="button"
                            className="details-btn jd-other-job-details-btn"
                            style={{
                              background: "#0284c7",
                              color: "#ffffff",
                              fontWeight: 800,
                              fontSize: "0.84rem",
                              padding: "6px 22px",
                              borderRadius: "999px",
                              border: "none",
                              whiteSpace: "nowrap",
                              cursor: "pointer",
                              boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
                              transition: "all 0.15s ease",
                              minWidth: "85px",
                              textAlign: "center",
                              fontFamily: '"Manrope", sans-serif',
                            }}
                            onClick={() => handleOpenJobFromEmployerModal(j.id)}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          )}

          {/* ── Employer Side-Docked Message Panel ── */}
          {(isEmployerMsgOpen || isEmployerMsgClosing) && selectedEmployerDetails && (
            <aside
              className={`jd-side-comparison-panel cand-message-side-panel ${isEmployerMsgClosing ? "closing" : "opening"}`}
              style={{ marginTop: "44px", fontFamily: '"Manrope", sans-serif' }}
            >
              <div className="jd-side-panel-header" style={{ fontFamily: '"Manrope", sans-serif' }}>
                <div className="jd-side-title-row" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    className="cand-msg-header-avatar"
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "#0284c7",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.88rem",
                      flexShrink: 0,
                    }}
                  >
                    {initialsFrom(selectedEmployerDetails.company_name)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                      {selectedEmployerDetails.company_name}
                    </h3>
                    <span className="jd-side-subtitle" style={{ fontSize: "0.78rem", color: "#557796", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                      Message • {selectedEmployerDetails.industry || "Employer"}
                    </span>
                  </div>
                </div>
                <div className="jd-side-header-actions">
                  <button
                    type="button"
                    className="jd-side-close-btn"
                    aria-label="Close message panel"
                    onClick={handleCloseEmployerMsg}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div
                className="cand-msg-chat-body"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  overflow: "hidden",
                  background: "#f8fafc",
                }}
              >
                {/* Chat Messages List */}
                <div
                  className="cand-msg-messages-scroll"
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {isEmployerMsgLoading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", fontSize: "0.88rem", gap: "8px" }}>
                      <span className="spinner-mini" style={{ width: "16px", height: "16px", border: "2px solid #cbd5e1", borderTopColor: "#0284c7", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      <span>Loading messages...</span>
                    </div>
                  ) : employerMessages.length === 0 ? (
                    <div
                      style={{
                        margin: "auto",
                        textAlign: "center",
                        padding: "24px 16px",
                        maxWidth: "340px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "14px",
                          background: "rgba(2, 132, 199, 0.12)",
                          color: "#0284c7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.4rem",
                        }}
                      >
                        💬
                      </div>
                      <h4 className="cand-msg-empty-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
                        Start a conversation
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5, textAlign: "center" }}>
                        Send a direct message to {selectedEmployerDetails.company_name} to inquire about job openings or company culture.
                      </p>
                    </div>
                  ) : (
                    <>
                      {employerMessages.map((msg: any) => {
                        const isMe = Number(msg.sender_user_id) === Number(applicantUserId);
                        const timeStr = msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                          : "";
                        return (
                          <div
                            key={msg.id}
                            className={`cand-msg-row ${isMe ? "outgoing" : "incoming"}`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isMe ? "flex-end" : "flex-start",
                              gap: "3px",
                            }}
                          >
                            {!isMe && (
                              <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, paddingLeft: "4px" }}>
                                {selectedEmployerDetails.company_name}
                              </span>
                            )}
                            <div
                              className={`cand-msg-bubble ${isMe ? "outgoing" : "incoming"}`}
                              style={{
                                maxWidth: "82%",
                                padding: "10px 14px",
                                borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                                background: isMe ? "#0284c7" : "#ffffff",
                                color: isMe ? "#ffffff" : "#1e293b",
                                border: isMe ? "none" : "1px solid #e2e8f0",
                                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
                                fontSize: "0.86rem",
                                lineHeight: 1.5,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {msg.message_text}
                            </div>
                            <span style={{ fontSize: "0.68rem", color: "#94a3b8", padding: "0 4px" }}>
                              {timeStr}
                            </span>
                          </div>
                        );
                      })}
                      <div ref={employerMsgEndRef} />
                    </>
                  )}
                </div>

                {/* Compose Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendEmployerMessage();
                  }}
                  className="cand-msg-compose-bar"
                  style={{
                    padding: "12px 16px",
                    borderTop: "1px solid #e2e8f0",
                    background: "#ffffff",
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    className="cand-msg-input"
                    placeholder={`Message ${selectedEmployerDetails.company_name}...`}
                    value={employerMsgInput}
                    onChange={(e) => setEmployerMsgInput(e.target.value)}
                    disabled={isEmployerMsgSending}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    className="cand-msg-send-btn"
                    disabled={!employerMsgInput.trim() || isEmployerMsgSending}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#0284c7",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: !employerMsgInput.trim() || isEmployerMsgSending ? "not-allowed" : "pointer",
                      opacity: !employerMsgInput.trim() || isEmployerMsgSending ? 0.6 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: "inherit",
                    }}
                  >
                    {isEmployerMsgSending ? "..." : (
                      <>
                        <span>Send</span>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </aside>
          )}
        </div>
      </div>
    )}

      {/* DOUBLE VERIFICATION: LOGOUT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        type="warning"
        title="Log Out of EliteCruit"
        message="Are you sure you want to log out of your applicant account?"
        cancelLabel="Stay Signed In"
        confirmLabel="Log Out"
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          localStorage.removeItem("elitecruit-user");
          window.location.href = "/";
        }}
      />

      {/* DOUBLE VERIFICATION: APPLY TO JOB MODAL */}
      <ConfirmationModal
        isOpen={!!applyJobTarget}
        type="info"
        title="Submit Job Application"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to apply for <strong>{applyJobTarget?.title || "this position"}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Your profile, qualifications, and attached resume will be submitted to the employer for review.
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Confirm & Apply"
        onCancel={() => setApplyJobTarget(null)}
        onConfirm={handleConfirmApply}
      />
    </div>
  );
}

