import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import {
  calculateJobMatch,
  calculateJobMatchDetails,
  getMatchColorClass,
  inferMatchScore,
  isSkillMatch,
  BSIT_BSCS_JOB_TITLES,
  BSIT_BSCS_SKILLS,
  BSIT_BSCS_QUALIFICATIONS,
  BSIT_BSCS_CERTIFICATIONS,
  CAVITE_CITIES,
  WORK_ARRANGEMENTS,
  EXPERIENCE_LEVELS,
  EXP_YEARS_OPTIONS,
  formatExperienceLevel,
  formatLocationWithCavite,
  POPULAR_KEYWORD_FILTERS,
  matchesJobWithTaxonomy,
  getKeywordsForJobRole,
  getRelatedJobRolesForKeyword,
  parseCompetencyDisplayTags,
} from "../../utils/filters";
import "./Applicant-Dashboard.css";
import "./JobSearch.css";

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
  rating?: string;
};

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
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [mode, setMode] = useState<"standard" | "easy">("standard");
  const [applicantLabel, setApplicantLabel] = useState("Applicant");
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [jobsMessage, setJobsMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("All roles");
  const [selectedLocation, setSelectedLocation] = useState("All locations");
  const [selectedWorkArrangement, setSelectedWorkArrangement] = useState("Any arrangement");
  const [selectedMinSalary, setSelectedMinSalary] = useState("Any salary");
  const [selectedExperience, setSelectedExperience] = useState("Any experience");
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
          rating: row.rating ? String(row.rating) : "0.0",
        }));
        setJobs(mapped);
      })
      .catch((error) => setJobsMessage(error instanceof Error ? error.message : "Unable to load job postings."));
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedRole !== "All roles") count++;
    if (selectedLocation !== "All locations") count++;
    if (selectedWorkArrangement !== "Any arrangement") count++;
    if (selectedMinSalary !== "Any salary") count++;
    if (selectedExperience !== "Any experience") count++;
    if (selectedKeyword) count++;
    if (sortBy !== "Newest") count++;
    count += filterSkills.length;
    count += filterQualifications.length;
    count += filterCertifications.length;
    return count;
  }, [
    selectedRole,
    selectedLocation,
    selectedWorkArrangement,
    selectedMinSalary,
    selectedExperience,
    selectedKeyword,
    sortBy,
    filterSkills,
    filterQualifications,
    filterCertifications,
  ]);

  const resetFilters = () => {
    setSelectedRole("All roles");
    setSelectedLocation("All locations");
    setSelectedWorkArrangement("Any arrangement");
    setSelectedMinSalary("Any salary");
    setSelectedExperience("Any experience");
    setSelectedKeyword(null);
    setFilterSkills([]);
    setFilterQualifications([]);
    setFilterCertifications([]);
    setSortBy("Newest");
    setSearchInput("");
    setAppliedSearch("");
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

      const byLocation =
        selectedLocation === "All locations" ||
        job.location.toLowerCase().includes(selectedLocation.toLowerCase()) ||
        selectedLocation.toLowerCase().includes(job.location.toLowerCase());

      const byWorkArrangement =
        selectedWorkArrangement === "Any arrangement" ||
        job.setup.toLowerCase() === selectedWorkArrangement.toLowerCase();

      const bySalary = minSalary === 0 || job.salaryMin >= minSalary;

      const byExperience =
        selectedExperience === "Any experience" ||
        (job.experienceLevel && (
          formatExperienceLevel(job.experienceLevel).toLowerCase() === selectedExperience.toLowerCase() ||
          job.experienceLevel.toLowerCase().includes(selectedExperience.toLowerCase()) ||
          selectedExperience.toLowerCase().includes(job.experienceLevel.toLowerCase()) ||
          (selectedExperience.toLowerCase().includes("fresh") && job.experienceLevel.toLowerCase().includes("fresh"))
        )) ||
        job.summary.toLowerCase().includes(selectedExperience.toLowerCase()) ||
        job.qualifications.toLowerCase().includes(selectedExperience.toLowerCase());

      const bySkills =
        filterSkills.length === 0 ||
        filterSkills.some((fs) => {
          const sName = fs.name.toLowerCase();
          return (
            job.skillTags.some((st) => st.toLowerCase().includes(sName) || sName.includes(st.toLowerCase())) ||
            job.badges.some((b) => b.toLowerCase().includes(sName) || sName.includes(b.toLowerCase())) ||
            job.summary.toLowerCase().includes(sName) ||
            job.qualifications.toLowerCase().includes(sName) ||
            job.responsibilities.toLowerCase().includes(sName)
          );
        });

      const byQualifications =
        filterQualifications.length === 0 ||
        filterQualifications.some((fq) => {
          const qName = fq.name.toLowerCase();
          return (
            job.qualTags.some((qt) => qt.toLowerCase().includes(qName) || qName.includes(qt.toLowerCase())) ||
            job.qualifications.toLowerCase().includes(qName) ||
            job.summary.toLowerCase().includes(qName)
          );
        });

      const byCertifications =
        filterCertifications.length === 0 ||
        filterCertifications.some((fc) => {
          const cName = fc.name.toLowerCase();
          return (
            job.qualifications.toLowerCase().includes(cName) ||
            job.summary.toLowerCase().includes(cName) ||
            job.qualTags.some((qt) => qt.toLowerCase().includes(cName) || cName.includes(qt.toLowerCase()))
          );
        });

      return (
        bySearch &&
        byKeyword &&
        byRole &&
        byLocation &&
        byWorkArrangement &&
        bySalary &&
        byExperience &&
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
    selectedLocation,
    selectedWorkArrangement,
    selectedMinSalary,
    selectedExperience,
    filterSkills,
    filterQualifications,
    filterCertifications,
    sortBy,
    bookmarkedIds,
    applicantMatchProfile,
    initialAppliedJobIds,
  ]);

  const applySearch = () => setAppliedSearch(searchInput);

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
                const target = e.target as HTMLElement;
                if (target.closest(".title-caret-btn")) {
                  e.preventDefault();
                  setIsWorkspaceOpen((prev) => !prev);
                }
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
          <li><a href="/messages"><span className="item-icon"><SideIcon name="messages" /></span><span>Messages</span></a></li>
          <li><a href="/notifications"><span className="item-icon"><SideIcon name="notifications" /></span><span>Notifications</span></a></li>
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
              <a href="/"><SideIcon name="logout" />Logout</a>
            </div>
          )}
        </div>
      </aside>

      <main className="appdash-main jobsearch-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>Job Search</strong>
            </div>
          </div>

          <div className="appdash-top-right">
            <ApplicantChatbotDrawer
              isOpen={isChatbotOpen}
              onToggle={() => setIsChatbotOpen((prev) => !prev)}
              pageTitle="Job Search"
            />
          </div>
        </header>

        <section className="mode-toggle-card">
          <p>Choose how you want to browse jobs.</p>
          <div className="mode-actions">
            <button type="button" className={mode === "standard" ? "mode-active" : ""} onClick={() => setMode("standard")}>Standard Mode</button>
            <button type="button" className={mode === "easy" ? "mode-active" : ""} onClick={() => setMode("easy")}>Easy Browsing Mode</button>
          </div>
        </section>

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
                  <label>Location</label>
                  <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                    <option>All locations</option>
                    {CAVITE_CITIES.map((city) => (
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
                  <label>Experience Level</label>
                  <select value={selectedExperience} onChange={(e) => setSelectedExperience(e.target.value)}>
                    <option>Any experience</option>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
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
                  availableOptions={BSIT_BSCS_SKILLS}
                  items={filterSkills}
                  onChange={setFilterSkills}
                />
                <FilterCategoryEditor
                  title="Qualifications"
                  availableOptions={BSIT_BSCS_QUALIFICATIONS}
                  items={filterQualifications}
                  onChange={setFilterQualifications}
                />
                <FilterCategoryEditor
                  title="Certifications"
                  availableOptions={BSIT_BSCS_CERTIFICATIONS}
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
                <p>{visibleJobs.length} jobs found</p>
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
                visibleJobs.map((job) => (
                  <article key={job.id} className="result-card">
                    <div className="result-card-main">
                      <div className="result-left-col">
                        <div className="result-title-row">
                          <h3 title={job.title}>{job.title}</h3>
                        </div>
                        <p className="meta-line">
                          <span><MiniIcon name="company" />{job.company}</span>
                          <span><MiniIcon name="location" />{job.location}</span>
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
                          <span>Applications: {job.applicantCount}/{job.applicationLimit}</span>
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
                          <button type="button" className={`solid-btn apply-right-btn ${appliedJobIds.includes(job.id) ? "applied-btn" : ""}`} onClick={() => applyToJob(job.id)} disabled={appliedJobIds.includes(job.id) || applyingJobId === job.id}>{appliedJobIds.includes(job.id) ? "Applied" : applyingJobId === job.id ? "Applying..." : "Apply"}</button>
                          <button type="button" className="bookmark-icon-btn" aria-label={bookmarkedIds.includes(job.id) ? "Remove bookmark" : "Bookmark job"} onClick={() => toggleBookmark(job.id)}>
                            <MiniIcon name={bookmarkedIds.includes(job.id) ? "bookmarkFilled" : "bookmark"} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        </section>
      </main>

      {/* ── Job Details Modal ── */}
      {detailsJob && (
        <div
          className="jd-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Job Details"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailsJob(null);
              setIsMatchDrawerOpen(false);
              setIsFaqDrawerOpen(false);
            }
          }}
        >
          <div className={`jd-modal-container ${isMatchDrawerOpen || isMatchDrawerClosing ? "with-side-panel" : ""}`}>
            {/* ── Main Job Details Panel (Left) ── */}
            <div className="jd-panel">
              {/* Cover banner */}
              <div className="jd-cover-banner">
                <div className="jd-cover-placeholder">
                  <span>Cover photo</span>
                </div>
                <div className="jd-employer-strip">
                  <div className="jd-employer-logo-info">
                    <div className="jd-employer-logo" aria-label="Company logo">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" /></svg>
                    </div>
                    <div>
                      <strong className="jd-employer-name">{detailsJob.company}</strong>
                      <span className="jd-employer-location"><MiniIcon name="location" />{detailsJob.location}</span>
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
                  <span><strong>Applications:</strong> {detailsJob.applicantCount} / {detailsJob.applicationLimit}</span>
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
                    onClick={() => {
                      setDetailsJob(null);
                      setIsMatchDrawerOpen(false);
                      setIsMatchDrawerClosing(false);
                      setIsFaqDrawerOpen(false);
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className={`solid-btn ${appliedJobIds.includes(detailsJob.id) ? "applied-btn" : ""}`}
                    onClick={() => applyToJob(detailsJob.id)}
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
    </div>
  );
}
