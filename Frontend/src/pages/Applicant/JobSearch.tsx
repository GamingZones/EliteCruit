import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import { EmployerDetailsModal } from "../../components/modals";
import {
  calculateJobMatch,
  calculateJobMatchDetails,
  calculateSkillExperienceYears,
  getMatchColorClass,
  inferMatchScore,
  isSkillMatch,
  isCertificationMatch,
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
  JobCardInput,
  isJobClosedOrExpired,
} from "../../utils/filters";
import "./Applicant-Dashboard.css";
import "./JobSearch.css";
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
  hideSalary?: boolean;
  hide_salary?: number | boolean;
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
  hide_salary?: number | boolean;
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
  rawSkills?: string | null;
  rawCertifications?: string | null;
};

type BreakdownCourseSkillItem = {
  name: string;
  course: string;
  year?: string;
};

type BreakdownCertItem = {
  name: string;
  category: string;
  acquiredYear?: string;
  expiry?: string;
};

function parseSingleBreakdownSkillToken(token: string): BreakdownCourseSkillItem {
  let course = "General IT";
  const courseMatch = token.match(/\[([^\[\]]+)\]/);
  if (courseMatch && courseMatch[1].trim()) {
    course = courseMatch[1].trim();
  }

  let year = "2026";
  const lastParen = token.match(/\(([^()]+)\)$/);
  if (lastParen && lastParen[1].trim()) {
    year = lastParen[1].replace(/^Since\s*/i, "").replace(/^Acquired\s*/i, "").trim() || "2026";
  }

  let cleanName = token
    .replace(/\s*\[[^\[\]]*\]/g, "")
    .replace(/\s*\([^()]*\)$/, "")
    .trim();

  // Fix unbalanced parentheses in name if any
  const openCount = (cleanName.match(/\(/g) || []).length;
  const closeCount = (cleanName.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    cleanName = cleanName + ")".repeat(openCount - closeCount);
  } else if (closeCount > openCount) {
    cleanName = cleanName.replace(/\)+$/, "");
  }

  return {
    name: cleanName || token.trim(),
    course,
    year,
  };
}

function parseBreakdownSkillItems(raw?: string | null, fallbackTags: string[] = []): Record<string, BreakdownCourseSkillItem[]> {
  const items: BreakdownCourseSkillItem[] = [];
  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((p) => {
          if (typeof p === "object" && p !== null && p.name) {
            items.push({
              name: String(p.name).trim(),
              course: p.course || "General IT",
              year: p.year || p.years || "2026",
            });
          } else if (p) {
            items.push(parseSingleBreakdownSkillToken(String(p)));
          }
        });
      }
    } catch {}

    if (items.length === 0) {
      const rawTokens = raw.includes(")")
        ? raw.split(/(?<=\))\s*,\s*/)
        : raw.split(/[\n,;•|]+/);
      rawTokens.forEach((tok) => {
        if (tok.trim()) items.push(parseSingleBreakdownSkillToken(tok));
      });
    }
  }

  if (items.length === 0 && fallbackTags.length > 0) {
    fallbackTags.forEach((tok) => items.push(parseSingleBreakdownSkillToken(tok)));
  }

  const grouped: Record<string, BreakdownCourseSkillItem[]> = {};
  items.forEach((item) => {
    if (!item.name) return;
    const cat = item.course && item.course.trim() ? item.course.trim() : "General IT";
    if (!grouped[cat]) grouped[cat] = [];
    if (!grouped[cat].some((existing) => existing.name.toLowerCase() === item.name.toLowerCase())) {
      grouped[cat].push(item);
    }
  });
  return grouped;
}

function parseBreakdownCertItems(raw?: string | null, fallbackTags: string[] = []): Record<string, BreakdownCertItem[]> {
  const items: BreakdownCertItem[] = [];

  const parseToken = (token: string): BreakdownCertItem => {
    let category = "General";
    const catMatch = token.match(/\[([^\[\]]+)\]/);
    if (catMatch && catMatch[1].trim()) {
      category = catMatch[1].trim();
    }

    let acquiredYear = "2010";
    let expiry = "2026";

    const lastParen = token.match(/\(([^()]+)\)$/);
    if (lastParen) {
      const inside = lastParen[1].trim();
      const acqMatch = inside.match(/Acquired\s*([0-9]{4})/i);
      if (acqMatch) acquiredYear = acqMatch[1].trim();
      const expMatch = inside.match(/(?:Expiration|Expires|Expiry)\s*([^\)]+)/i);
      if (expMatch) {
        expiry = expMatch[1].trim();
      } else if (!acqMatch) {
        expiry = inside;
      }
    }

    let cleanName = token.replace(/\s*\[[^\[\]]*\]/g, "").replace(/\s*\([^()]*\)$/, "").trim();
    const openCount = (cleanName.match(/\(/g) || []).length;
    const closeCount = (cleanName.match(/\)/g) || []).length;
    if (openCount > closeCount) cleanName = cleanName + ")".repeat(openCount - closeCount);
    else if (closeCount > openCount) cleanName = cleanName.replace(/\)+$/, "");

    return {
      name: cleanName || token.trim(),
      category,
      acquiredYear,
      expiry,
    };
  };

  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((p) => {
          if (typeof p === "object" && p !== null && p.name) {
            items.push({
              name: String(p.name).trim(),
              category: p.category || "General",
              acquiredYear: p.acquiredYear || p.acquired || "2010",
              expiry: p.expiry || p.years || "2026",
            });
          } else if (p) {
            items.push(parseToken(String(p)));
          }
        });
      }
    } catch {}

    if (items.length === 0) {
      const rawTokens = raw.includes(")")
        ? raw.split(/(?<=\))\s*,\s*/)
        : raw.split(/[\n,;•|]+/);
      rawTokens.forEach((tok) => {
        if (tok.trim()) items.push(parseToken(tok));
      });
    }
  }

  if (items.length === 0 && fallbackTags.length > 0) {
    fallbackTags.forEach((tok) => items.push(parseToken(tok)));
  }

  const grouped: Record<string, BreakdownCertItem[]> = {};
  items.forEach((item) => {
    if (!item.name) return;
    const cat = item.category && item.category.trim() ? item.category.trim() : "General";
    if (!grouped[cat]) grouped[cat] = [];
    if (!grouped[cat].some((existing) => existing.name.toLowerCase() === item.name.toLowerCase())) {
      grouped[cat].push(item);
    }
  });
  return grouped;
}

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

function formatSalary(minSalary: number | null, maxSalary: number | null, hideSalary?: boolean | number | string | null) {
  const isHidden = Boolean(
    hideSalary === true ||
    hideSalary === 1 ||
    hideSalary === "1" ||
    hideSalary === "true" ||
    (typeof hideSalary === "string" && hideSalary.toLowerCase() === "true")
  );
  if (isHidden) return "Salary Confidential";
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

export default function JobSearch() {
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return false;
    }
    return true;
  });
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
  const jobMsgScrollRef = useRef<HTMLDivElement>(null);
  const employerMsgScrollRef = useRef<HTMLDivElement>(null);

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
  const [applicationStatusByJobId, setApplicationStatusByJobId] = useState<Record<number, string>>({});
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [detailsJob, setDetailsJob] = useState<JobCard | null>(null);
  const [isFaqDrawerOpen, setIsFaqDrawerOpen] = useState(false);
  const [isMatchDrawerOpen, setIsMatchDrawerOpen] = useState(false);
  const [isMatchDrawerClosing, setIsMatchDrawerClosing] = useState(false);
  const [isJobMsgOpen, setIsJobMsgOpen] = useState(false);
  const [isJobMsgClosing, setIsJobMsgClosing] = useState(false);
  const [hoveredCompareTag, setHoveredCompareTag] = useState<{
    item: string;
    side: "applicant" | "employer";
    category: "skills" | "qualifications" | "certifications";
  } | null>(null);
  const [activeBreakdownPopup, setActiveBreakdownPopup] = useState<{
    type: "skills" | "certifications";
    category: string;
  } | null>(null);

  const groupedBreakdownSkills = useMemo(() => {
    return parseBreakdownSkillItems(applicantMatchProfile?.rawSkills, applicantMatchProfile?.skills || []);
  }, [applicantMatchProfile?.rawSkills, applicantMatchProfile?.skills]);

  const groupedBreakdownCerts = useMemo(() => {
    return parseBreakdownCertItems(applicantMatchProfile?.rawCertifications, applicantMatchProfile?.certifications || []);
  }, [applicantMatchProfile?.rawCertifications, applicantMatchProfile?.certifications]);
  const [companyFaqs, setCompanyFaqs] = useState<FaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [expandedFaqIds, setExpandedFaqIds] = useState<number[]>([]);

  // Modal refs & states for equal-height synchronization and FAQ loading
  const modalPanelRef = useRef<HTMLDivElement>(null);
  const modalBannerRef = useRef<HTMLDivElement>(null);
  const modalStripRef = useRef<HTMLDivElement>(null);
  const modalBodyWrapperRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const modalFaqDrawerRef = useRef<HTMLDivElement>(null);
  const modalFooterRef = useRef<HTMLDivElement>(null);
  const modalSidePanelSlotRef = useRef<HTMLDivElement>(null);
  const [modalMatchedHeight, setModalMatchedHeight] = useState<number | null>(null);
  const [modalFaqsList, setModalFaqsList] = useState<FaqItem[]>(DEFAULT_FAQS);
  const [modalLoadingFaqs, setModalLoadingFaqs] = useState(false);
  const [isEmployerModalOnTop, setIsEmployerModalOnTop] = useState(false);

  // Measure natural unconstrained height of Container 1 (Job details modal)
  const measureModalH1 = React.useCallback(() => {
    if (!modalPanelRef.current) return 0;
    const bannerH = modalBannerRef.current ? modalBannerRef.current.offsetHeight : 140;
    const stripH = modalStripRef.current ? modalStripRef.current.offsetHeight : 65;
    const footerH = modalFooterRef.current ? modalFooterRef.current.offsetHeight : 65;

    let bodyH = 0;
    if (isFaqDrawerOpen && modalFaqDrawerRef.current) {
      const faqHeader = modalFaqDrawerRef.current.querySelector(".jd-faq-header") as HTMLElement | null;
      const faqBody = modalFaqDrawerRef.current.querySelector(".jd-faq-body") as HTMLElement | null;
      bodyH = (faqHeader?.offsetHeight || 50) + (faqBody?.scrollHeight || 200);
    } else if (modalBodyRef.current) {
      bodyH = modalBodyRef.current.scrollHeight || 180;
    }

    return bannerH + stripH + bodyH + footerH;
  }, [isFaqDrawerOpen]);

  // Measure natural unconstrained height of Container 2 (Side panel)
  const measureModalH2 = React.useCallback((h1: number) => {
    const slot = modalSidePanelSlotRef.current;
    if (!slot) return h1;
    const sideEl = slot.querySelector(".jd-side-comparison-panel") as HTMLElement | null;
    if (!sideEl) return slot.scrollHeight || h1;

    const isMsgPanel =
      sideEl.classList.contains("cand-message-side-panel") ||
      Boolean(sideEl.querySelector(".cand-msg-chat-body"));

    if (isMsgPanel) {
      return h1;
    }

    const sideHeader = sideEl.querySelector(".jd-side-panel-header") as HTMLElement | null;
    const headerH = sideHeader?.offsetHeight || 60;
    const sideBody = sideEl.querySelector(".jd-side-panel-body") as HTMLElement | null;
    if (sideBody) {
      return headerH + (sideBody.scrollHeight || 0);
    }

    return sideEl.scrollHeight || h1;
  }, []);

  // Equal height calculation
  const calculateModalEqualHeight = React.useCallback(() => {
    const hasSidePanel = Boolean((isMatchDrawerOpen && !isMatchDrawerClosing) || (isJobMsgOpen && !isJobMsgClosing));
    if (!hasSidePanel || window.innerWidth <= 860) {
      setModalMatchedHeight(null);
      return;
    }

    const maxAllowed = Math.floor(window.innerHeight * 0.88 - 40);
    const minAllowed = 440;

    const h1 = measureModalH1();
    if (!h1) return;

    const h2 = measureModalH2(h1);

    const clampedH1 = Math.max(minAllowed, Math.min(h1, maxAllowed));
    const clampedH2 = Math.max(minAllowed, Math.min(h2, maxAllowed));

    const equalH = Math.min(clampedH1, clampedH2);

    setModalMatchedHeight((prev) => {
      if (prev !== null && Math.abs(prev - equalH) <= 2) return prev;
      return equalH;
    });
  }, [isMatchDrawerOpen, isMatchDrawerClosing, isJobMsgOpen, isJobMsgClosing, measureModalH1, measureModalH2]);

  useEffect(() => {
    const hasSidePanel = Boolean((isMatchDrawerOpen && !isMatchDrawerClosing) || (isJobMsgOpen && !isJobMsgClosing));
    if (!detailsJob || !hasSidePanel) {
      setModalMatchedHeight(null);
      return;
    }

    let rafId: number;
    const runMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        calculateModalEqualHeight();
      });
    };

    runMeasure();
    const t1 = setTimeout(runMeasure, 60);
    const t2 = setTimeout(runMeasure, 180);

    window.addEventListener("resize", runMeasure);

    let observer: MutationObserver | null = null;
    if (modalSidePanelSlotRef.current) {
      observer = new MutationObserver(() => {
        runMeasure();
      });
      observer.observe(modalSidePanelSlotRef.current, {
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
  }, [detailsJob, isMatchDrawerOpen, isMatchDrawerClosing, isJobMsgOpen, isJobMsgClosing, isFaqDrawerOpen, expandedFaqIds, calculateModalEqualHeight]);

  useEffect(() => {
    if (!detailsJob) {
      setModalFaqsList(DEFAULT_FAQS);
      return;
    }
    const empId = detailsJob.employerUserId;
    if (empId) {
      setModalLoadingFaqs(true);
      fetch(`/api/employers/${empId}/faqs`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data?.faqs)) {
            const activeFaqs = data.faqs.filter((f: any) => f.is_active !== 0);
            if (activeFaqs.length > 0) {
              setModalFaqsList(activeFaqs);
              return;
            }
          }
          setModalFaqsList(DEFAULT_FAQS);
        })
        .catch(() => setModalFaqsList(DEFAULT_FAQS))
        .finally(() => setModalLoadingFaqs(false));
    } else {
      setModalFaqsList(DEFAULT_FAQS);
    }
  }, [detailsJob?.employerUserId, detailsJob?.id]);


  const handleToggleMatchDrawer = () => {
    if (isMatchDrawerOpen) {
      handleCloseMatchDrawer();
    } else {
      setIsFaqDrawerOpen(false);
      setIsJobMsgOpen(false);
      setIsJobMsgClosing(false);
      setIsMatchDrawerClosing(false);
      setIsMatchDrawerOpen(true);
    }
  };

  const handleCloseMatchDrawer = () => {
    if (!isMatchDrawerOpen) return;
    setIsMatchDrawerClosing(true);
    setActiveBreakdownPopup(null);
    setTimeout(() => {
      setIsMatchDrawerOpen(false);
      setIsMatchDrawerClosing(false);
    }, 220);
  };

  const handleCloseJobMsg = () => {
    setIsJobMsgClosing(true);
    setTimeout(() => {
      setIsJobMsgOpen(false);
      setIsJobMsgClosing(false);
    }, 220);
  };

  const handleToggleJobMsg = () => {
    if (isJobMsgOpen) {
      handleCloseJobMsg();
    } else {
      setIsFaqDrawerOpen(false);
      setIsMatchDrawerOpen(false);
      setIsMatchDrawerClosing(false);
      setIsJobMsgOpen(true);
      setIsJobMsgClosing(false);
      const empId =
        detailsJob?.employerUserId ||
        employers.find((e) => e.company_name.toLowerCase() === detailsJob?.company.toLowerCase())?.employer_user_id;
      if (empId) {
        fetchEmployerThreadMessages(empId);
      }
    }
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
            skills: parseCompetencyDisplayTags(profile?.skills, "skills"),
            certifications: parseCompetencyDisplayTags(profile?.certifications, "certifications"),
            qualifications: parseCompetencyDisplayTags(profile?.qualifications, "qualifications"),
            rawSkills: typeof profile?.skills === "string" ? profile.skills : (Array.isArray(profile?.skills) ? JSON.stringify(profile.skills) : null),
            rawCertifications: typeof profile?.certifications === "string" ? profile.certifications : (Array.isArray(profile?.certifications) ? JSON.stringify(profile.certifications) : null),
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

        if (Array.isArray(data?.applications)) {
          const statusMap: Record<number, string> = {};
          data.applications.forEach((item: any) => {
            const jobId = Number(item?.job_post_id);
            if (jobId > 0 && item?.status) {
              statusMap[jobId] = String(item.status).toLowerCase();
            }
          });
          setApplicationStatusByJobId((prev) => ({ ...prev, ...statusMap }));
        }
      })
      .catch(() => {
        // Keep UI usable even when applications endpoint is temporarily unavailable.
      });

    fetch(`/api/applicants/${applicantUserId}/invitations`)
      .then(async (response) => {
        const data = await response.json();
        if (response.ok && Array.isArray(data?.invitations)) {
          setApplicationStatusByJobId((prev) => {
            const next = { ...prev };
            data.invitations.forEach((inv: any) => {
              const jobId = Number(inv?.job_post_id);
              if (jobId > 0 && !next[jobId]) {
                const invStatus = (inv?.status || "pending").toLowerCase();
                next[jobId] = invStatus === "accepted" ? "recruited" : invStatus === "declined" ? "denied" : "invited";
              }
            });
            return next;
          });
        }
      })
      .catch(() => {});
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
        const mapped: JobCard[] = rows.map((row: any, index: number) => {
          const isHiddenSalary = Boolean(
            row.hide_salary === true ||
            row.hide_salary === 1 ||
            row.hide_salary === "1" ||
            row.hide_salary === "true" ||
            row.hideSalary === true ||
            row.hideSalary === 1 ||
            row.hideSalary === "1" ||
            row.hideSalary === "true" ||
            (typeof row.hide_salary === "string" && row.hide_salary.toLowerCase() === "true") ||
            (typeof row.hideSalary === "string" && row.hideSalary.toLowerCase() === "true")
          );
          return {
            id: Number(row.id),
            title: row.title || "Untitled Job",
            company: row.company_name || "Employer",
            location: formatLocationWithCavite(row.location || row.company_address),
            summary: row.description || "No job description provided yet.",
            salary: formatSalary(row.salary_min ?? null, row.salary_max ?? null, isHiddenSalary),
            salaryMin: Number.isFinite(Number(row.salary_min)) ? Number(row.salary_min) : 0,
            hideSalary: isHiddenSalary,
            hide_salary: isHiddenSalary ? 1 : 0,
            setup: row.work_arrangement || "Flexible",
          experienceLevel: row.experience_level || null,
          status: row.status === "closed" ? "closed" : "open",
          closeDate: row.close_date || "-",
          applicationLimit: Number.isFinite(Number(row.application_limit)) ? Number(row.application_limit) : 0,
          applicantCount: Number.isFinite(Number(row.applicant_count)) ? Number(row.applicant_count) : 0,
          qualifications: row.qualifications || "Not provided",
          certifications: row.certifications || "Not provided",
          responsibilities: row.responsibilities || "Not provided",
          skillTags: parseCompetencyDisplayTags(row.required_skills, "skills"),
          qualTags: parseCompetencyDisplayTags(row.qualifications, "qualifications"),
          certTags: parseCompetencyDisplayTags(row.certifications, "certifications"),
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
        };
      });
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
      // Exclude job postings the applicant has already applied for
      if (appliedJobIds.includes(job.id)) {
        return false;
      }

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
    appliedJobIds,
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
      setApplicationStatusByJobId((prev) => ({ ...prev, [jobId]: "submitted" }));
      setJobsMessage("Application submitted successfully! You can track this application in My Applications on your Dashboard.");
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
        const isHiddenSalary = Boolean(
          ej.hide_salary === true ||
          ej.hide_salary === 1 ||
          ej.hide_salary === "1" ||
          ej.hide_salary === "true" ||
          (ej as any).hideSalary === true ||
          (ej as any).hideSalary === 1 ||
          (ej as any).hideSalary === "1" ||
          (ej as any).hideSalary === "true" ||
          (typeof ej.hide_salary === "string" && ej.hide_salary.toLowerCase() === "true") ||
          (typeof (ej as any).hideSalary === "string" && (ej as any).hideSalary.toLowerCase() === "true")
        );
        const fallbackJob: JobCard = {
          id: ej.id,
          title: ej.title,
          company: emp.company_name,
          location: formatLocationWithCavite(ej.location || emp.location),
          summary: "No job description provided yet.",
          salary: formatSalary(ej.salary_min, ej.salary_max, isHiddenSalary),
          salaryMin: Number(ej.salary_min) || 0,
          hideSalary: isHiddenSalary,
          hide_salary: isHiddenSalary ? 1 : 0,
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

  const handleOpenEmployerDetailsById = (employerUserId: number) => {
    const found = employers.find((emp) => emp.employer_user_id === employerUserId);
    if (found) {
      handleOpenEmployerDetails(found);
    } else {
      fetch(`/api/employers/${employerUserId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.employer) {
            handleOpenEmployerDetails(data.employer);
          }
        })
        .catch(() => {});
    }
  };

  const handleCloseJobDetails = () => {
    setDetailsJob(null);
    setIsMatchDrawerOpen(false);
    setIsMatchDrawerClosing(false);
    setIsJobMsgOpen(false);
    setIsJobMsgClosing(false);
    setIsFaqDrawerOpen(false);
    setActiveBreakdownPopup(null);
    setExpandedFaqIds([]);
    setModalMatchedHeight(null);
    setIsEmployerModalOnTop(false);
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
      setIsEmployerMsgOpen(false);
      setIsEmployerMsgClosing(false);
      setIsEmployerJobsClosing(false);
      setIsEmployerJobsOpen(true);
    }
  };

  const getJobApplicationStatus = (jobId: number): {
    label: "Applied" | "Recruited" | "Approved" | "Denied" | "Invitation Received";
    statusClass: "applied" | "recruited" | "approved" | "denied" | "invited";
  } | null => {
    const rawStatus = applicationStatusByJobId[jobId];
    if (rawStatus) {
      const s = rawStatus.toLowerCase().trim();
      if (s === "approved" || s === "accepted" || s === "hired") {
        return { label: "Approved", statusClass: "approved" };
      }
      if (s === "denied" || s === "rejected") {
        return { label: "Denied", statusClass: "denied" };
      }
      if (s === "recruited") {
        return { label: "Recruited", statusClass: "recruited" };
      }
      if (s === "invited" || s === "invitation") {
        return { label: "Invitation Received", statusClass: "invited" };
      }
      return { label: "Applied", statusClass: "applied" };
    }
    if (appliedJobIds.includes(jobId)) {
      return { label: "Applied", statusClass: "applied" };
    }
    return null;
  };

  const sortedEmployerJobs = useMemo(() => {
    if (!selectedEmployerDetails?.jobs || selectedEmployerDetails.jobs.length === 0) return [];
    return [...selectedEmployerDetails.jobs]
      .map((j) => {
        const foundJob = jobs.find((x) => x.id === j.id);
        const cardInput: JobCardInput = foundJob || {
          id: j.id,
          title: j.title || "",
          location: j.location || selectedEmployerDetails?.location || "Cavite",
          salaryMin: Number(j.salary_min) || 0,
          setup: j.work_arrangement || "On-Site",
          skillTags: parseCompetencyDisplayTags(j.required_skills, "skills"),
          qualTags: parseCompetencyDisplayTags(j.required_qualifications, "qualifications"),
          certTags: parseCompetencyDisplayTags(j.required_certifications, "certifications"),
        };
        const matchPct = calculateJobMatchDetails(cardInput, applicantMatchProfile).score;
        return { ...j, matchPct };
      })
      .sort((a, b) => b.matchPct - a.matchPct || b.id - a.id);
  }, [selectedEmployerDetails?.jobs, selectedEmployerDetails?.location, jobs, applicantMatchProfile]);

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
      setIsEmployerJobsOpen(false);
      setIsEmployerJobsClosing(false);
      setIsEmployerMsgClosing(false);
      setIsEmployerMsgOpen(true);
      if (selectedEmployerDetails?.employer_user_id) {
        fetchEmployerThreadMessages(selectedEmployerDetails.employer_user_id);
      }
    }
  };

  const handleSendEmployerMessage = async () => {
    const text = employerMsgInput.trim();
    const targetEmpId =
      detailsJob?.employerUserId ||
      employers.find((e) => e.company_name.toLowerCase() === detailsJob?.company.toLowerCase())?.employer_user_id ||
      selectedEmployerDetails?.employer_user_id;
    const targetCompanyName = detailsJob?.company || selectedEmployerDetails?.company_name || "Employer";

    if (!text || isEmployerMsgSending || !targetEmpId) return;

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
          scrollChatToBottom(false);
        }
      } else {
        const res = await fetch("/api/messages/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_by_user_id: currentUid,
            participant_user_ids: [targetEmpId],
            title: `Employer: ${targetCompanyName}`,
            message_text: text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setEmployerMsgThread(data.thread);
          setEmployerMessages([data.message]);
          setEmployerMsgInput("");
          window.dispatchEvent(new Event("elitecruit_messages_update"));
          scrollChatToBottom(false);
        }
      }
    } catch (err) {
      console.error("Failed to send message to employer:", err);
    } finally {
      setIsEmployerMsgSending(false);
    }
  };

  const scrollChatToBottom = (instant = true) => {
    const doScroll = () => {
      [jobMsgScrollRef.current, employerMsgScrollRef.current].forEach((el) => {
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
      if (employerMsgEndRef.current) {
        employerMsgEndRef.current.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "end" });
      }
    };

    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 40);
    setTimeout(doScroll, 120);
    setTimeout(doScroll, 250);
  };

  useEffect(() => {
    if (isEmployerMsgOpen || isJobMsgOpen) {
      scrollChatToBottom(true);
    }
  }, [isEmployerMsgOpen, isJobMsgOpen, employerMessages, isEmployerMsgLoading]);

  useEffect(() => {
    const isAnyMsgOpen = isEmployerMsgOpen || isJobMsgOpen;
    const empId =
      detailsJob?.employerUserId ||
      selectedEmployerDetails?.employer_user_id ||
      employers.find((e) => e.company_name.toLowerCase() === detailsJob?.company.toLowerCase())?.employer_user_id;
    if (!isAnyMsgOpen || !empId || !employerMsgThread?.id) return;
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
  }, [isEmployerMsgOpen, isJobMsgOpen, detailsJob?.employerUserId, selectedEmployerDetails?.employer_user_id, employerMsgThread?.id, employerMessages.length]);

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

  const renderCompetenciesPanel = () => {
    if (!detailsJob) return null;
    const matchDetails = calculateJobMatchDetails(detailsJob, applicantMatchProfile);
    const appSkills = applicantMatchProfile?.skills || [];
    const appQuals = applicantMatchProfile?.qualifications || [];
    const appCerts = applicantMatchProfile?.certifications || [];

    const jobSkills = detailsJob.skillTags || [];
    const jobQuals = detailsJob.qualTags || [];
    const jobCerts = detailsJob.certTags || [];

    const checkMatch = (jobItem: string, appItems: string[], type?: "skills" | "qualifications" | "certifications") => {
      if (!appItems || appItems.length === 0) return false;
      if (type === "certifications") {
        return appItems.some((appItem) => isCertificationMatch(jobItem, appItem));
      }
      return appItems.some((appItem) => isSkillMatch(jobItem, appItem));
    };

    const isAppRelevant = (appItem: string, jItems: string[], type?: "skills" | "qualifications" | "certifications") => {
      if (!jItems || jItems.length === 0) return false;
      if (type === "certifications") {
        return jItems.some((jobItem) => isCertificationMatch(jobItem, appItem));
      }
      return jItems.some((jobItem) => isSkillMatch(jobItem, appItem));
    };

    return (
      <aside className={`jd-side-comparison-panel ${isMatchDrawerClosing ? "closing" : "opening"}`} style={{ fontFamily: "'Inter', sans-serif" }}>
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
            {/* Column Headers */}
            <div className="jd-master-col-header applicant-header">
              <span>Your Profile</span>
            </div>
            <div className="jd-master-col-header employer-header">
              <span>Employer's Requirements</span>
            </div>

            {/* ── Row 1: Skills ── */}
            <div className="jd-master-row-card applicant-col">
              <div className="jd-row-label-wrap">
                <span className="jd-row-label">Skills</span>
                <span className="col-count-text">{appSkills.length} listed</span>
              </div>
              <div className="jd-col-tags-container">
                {Object.keys(groupedBreakdownSkills).length > 0 ? (
                  <div className="category-pills-row">
                    {Object.entries(groupedBreakdownSkills).map(([catName, groupItems]) => {
                      const isLinked = Boolean(
                        hoveredCompareTag?.side === "employer" &&
                        hoveredCompareTag?.category === "skills" &&
                        groupItems.some((it) => isSkillMatch(it.name, hoveredCompareTag.item))
                      );
                      return (
                        <button
                          key={catName}
                          type="button"
                          className={`category-popup-trigger-btn ${activeBreakdownPopup?.type === "skills" && activeBreakdownPopup?.category === catName ? "active" : ""} ${isLinked ? "category-hover-linked" : ""}`}
                          onClick={() => setActiveBreakdownPopup({ type: "skills", category: catName })}
                          title={`Click to open ${catName} skills list (${groupItems.length})`}
                        >
                          <span className="category-pill-name">{catName}</span>
                          <span className="category-pill-meta">
                            <span className="category-pill-badge">{groupItems.length}</span>
                            <span className="category-pill-arrow">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="jd-no-data-text">No skills in your profile</span>
                )}
              </div>
            </div>

            <div className="jd-master-row-card employer-col">
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

            {/* ── Row 2: Qualifications ── */}
            <div className="jd-master-row-card applicant-col">
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

            <div className="jd-master-row-card employer-col">
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

            {/* ── Row 3: Certifications ── */}
            <div className="jd-master-row-card applicant-col">
              <div className="jd-row-label-wrap">
                <span className="jd-row-label">Certifications</span>
                <span className="col-count-text">{appCerts.length} listed</span>
              </div>
              <div className="jd-col-tags-container">
                {Object.keys(groupedBreakdownCerts).length > 0 ? (
                  <div className="category-pills-row">
                    {Object.entries(groupedBreakdownCerts).map(([catName, groupItems]) => {
                      const isLinked = Boolean(
                        hoveredCompareTag?.side === "employer" &&
                        hoveredCompareTag?.category === "certifications" &&
                        groupItems.some((it) => isCertificationMatch(hoveredCompareTag.item, it.name))
                      );
                      return (
                        <button
                          key={catName}
                          type="button"
                          className={`category-popup-trigger-btn ${activeBreakdownPopup?.type === "certifications" && activeBreakdownPopup?.category === catName ? "active" : ""} ${isLinked ? "category-hover-linked" : ""}`}
                          onClick={() => setActiveBreakdownPopup({ type: "certifications", category: catName })}
                          title={`Click to open ${catName} certifications list (${groupItems.length})`}
                        >
                          <span className="category-pill-name">{catName}</span>
                          <span className="category-pill-meta">
                            <span className="category-pill-badge">{groupItems.length}</span>
                            <span className="category-pill-arrow">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="jd-no-data-text">No certifications in your profile</span>
                )}
              </div>
            </div>

            <div className="jd-master-row-card employer-col">
              <div className="jd-row-label-wrap">
                <span className="jd-row-label">Certifications</span>
                <span className="col-count-text">{jobCerts.length} required</span>
              </div>
              <div className="jd-col-tags-container">
                {jobCerts.length > 0 ? (
                  jobCerts.map((item) => {
                    const matched = checkMatch(item, appCerts, "certifications");
                    const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                    const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "certifications" && isCertificationMatch(item, hoveredCompareTag.item));
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
      </aside>
    );
  };

  const renderJobMessagePanel = () => {
    if (!detailsJob) return null;
    return (
      <aside
        className={`jd-side-comparison-panel cand-message-side-panel ${isJobMsgClosing ? "closing" : "opening"}`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="jd-side-panel-header" style={{ fontFamily: "'Inter', sans-serif" }}>
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
                fontWeight: 700,
                fontSize: "0.85rem",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {(() => {
                const empUserId = detailsJob.employerUserId;
                const logoSrc = detailsJob.companyLogoPath
                  ? detailsJob.companyLogoPath.startsWith("http") || detailsJob.companyLogoPath.startsWith("/api")
                    ? detailsJob.companyLogoPath
                    : empUserId ? `/api/employers/${empUserId}/logo` : null
                  : empUserId ? `/api/employers/${empUserId}/logo` : null;
                return (
                  <>
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={detailsJob.company}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                          const fallback = e.currentTarget.parentElement?.querySelector(".cand-msg-avatar-fallback") as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="cand-msg-avatar-fallback"
                      style={{
                        display: logoSrc ? "none" : "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: "20px", height: "20px", stroke: "#ffffff", fill: "none", strokeWidth: 2 }}>
                        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
                      </svg>
                    </div>
                  </>
                );
              })()}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#01294a", fontFamily: "'Inter', sans-serif" }}>
                {detailsJob.company}
              </h3>
              <span className="jd-side-subtitle" style={{ fontSize: "0.8rem", color: "#557796", fontWeight: 600 }}>
                Direct Messaging
              </span>
            </div>
          </div>
          <div className="jd-side-header-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="cand-msg-employer-details-btn"
              onClick={() => {
                const empId = detailsJob.employerUserId || employers.find((e) => e.company_name.toLowerCase() === detailsJob.company.toLowerCase())?.employer_user_id;
                if (empId) {
                  setIsEmployerModalOnTop(true);
                  handleOpenEmployerDetailsById(empId);
                }
              }}
              style={{
                padding: "5px 12px",
                fontSize: "0.8rem",
                fontWeight: 700,
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s ease",
              }}
            >
              Employer Details
            </button>
            <button
              type="button"
              className="jd-side-close-btn"
              aria-label="Close message panel"
              onClick={handleCloseJobMsg}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messaging Chat Body */}
        <div className="cand-msg-chat-body" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div
            ref={jobMsgScrollRef}
            className="cand-msg-messages-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {isEmployerMsgLoading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                Loading conversation...
              </div>
            ) : employerMessages.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(2, 132, 199, 0.15)",
                    color: "#0284c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h4 className="cand-msg-empty-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
                  Start a conversation
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5, textAlign: "center" }}>
                  Send a direct message to {detailsJob.company} to inquire about this role or company.
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
                          {detailsJob.company}
                        </span>
                      )}
                      <div
                        className={`cand-msg-bubble ${isMe ? "outgoing" : "incoming"}`}
                        style={{
                          maxWidth: "82%",
                          padding: "10px 14px",
                          borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
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
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              className="cand-msg-input"
              placeholder={`Message ${detailsJob.company}...`}
              value={employerMsgInput}
              onChange={(e) => setEmployerMsgInput(e.target.value)}
              disabled={isEmployerMsgSending}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
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
              }}
            >
              {isEmployerMsgSending ? "..." : "Send"}
            </button>
          </form>
        </div>
      </aside>
    );
  };

  const renderJobDetailsModal = () => {
    if (!detailsJob) return null;

    const empUserId = detailsJob.employerUserId;
    const jobTitle = detailsJob.title || "Job Details";
    const companyName = detailsJob.company || "Employer";
    const locationStr = detailsJob.location || "Cavite";
    const appCount = detailsJob.applicantCount ?? 0;
    const closeDate = detailsJob.closeDate || "-";
    const isClosed = detailsJob.status === "closed" || isJobClosedOrExpired(closeDate, detailsJob.status, detailsJob.applicationLimit, appCount);
    const isOpenStatus = !isClosed;
    const isUrgent = Boolean(detailsJob.urgent);
    const workSetup = detailsJob.setup || "Flexible";
    const experienceLevel = detailsJob.experienceLevel || "";
    const descriptionText = detailsJob.summary || detailsJob.responsibilities || "No job description provided.";
    const ratingText = detailsJob.rating ? Number(detailsJob.rating).toFixed(1) : "0.0";
    const matchInfo = calculateJobMatchDetails(detailsJob, applicantMatchProfile);

    const skills = detailsJob.skillTags && detailsJob.skillTags.length > 0
      ? detailsJob.skillTags
      : (detailsJob.badges && detailsJob.badges.length > 0 ? detailsJob.badges : []);
    const qualifications = detailsJob.qualTags && detailsJob.qualTags.length > 0
      ? detailsJob.qualTags
      : parseCompetencyDisplayTags(detailsJob.qualifications, "qualifications");
    const certifications = detailsJob.certTags && detailsJob.certTags.length > 0
      ? detailsJob.certTags
      : parseCompetencyDisplayTags(detailsJob.certifications, "certifications");

    const coverSrc = detailsJob.companyCoverPath
      ? detailsJob.companyCoverPath.startsWith("http") || detailsJob.companyCoverPath.startsWith("/api")
        ? detailsJob.companyCoverPath
        : empUserId ? `/api/employers/${empUserId}/cover` : null
      : empUserId ? `/api/employers/${empUserId}/cover` : null;

    const logoSrc = detailsJob.companyLogoPath
      ? detailsJob.companyLogoPath.startsWith("http") || detailsJob.companyLogoPath.startsWith("/api")
        ? detailsJob.companyLogoPath
        : empUserId ? `/api/employers/${empUserId}/logo` : null
      : empUserId ? `/api/employers/${empUserId}/logo` : null;

    const statusInfo = getJobApplicationStatus(detailsJob.id);
    const isApplying = applyingJobId === detailsJob.id;
    const hasSidePanel = Boolean((isMatchDrawerOpen || isMatchDrawerClosing) && !isJobMsgOpen) || Boolean((isJobMsgOpen || isJobMsgClosing) && !isMatchDrawerOpen);

    const toggleFaqItem = (id: number | string) => {
      setExpandedFaqIds((prev) =>
        prev.includes(Number(id)) ? prev.filter((item) => item !== Number(id)) : [...prev, Number(id)]
      );
    };

    return (
      <div
        className="jd-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Job Details"
        style={{
          zIndex: selectedEmployerDetails && !isEmployerModalOnTop ? 10050 : 10000,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseJobDetails();
        }}
      >
        <div
          className={`jd-modal-container ${hasSidePanel ? "with-side-panel" : ""}`}
          style={!hasSidePanel ? { maxWidth: "820px" } : undefined}
        >
          <div className="jd-panel-outer-wrap">
            {!isEmployerModalOnTop && (
              <div className="jd-floating-tabs-container">
                <button
                  type="button"
                  className="jd-floating-breakdown-tab"
                  onClick={() => {
                    const empId = detailsJob.employerUserId || employers.find((e) => e.company_name.toLowerCase() === detailsJob.company.toLowerCase())?.employer_user_id;
                    if (empId) {
                      setIsEmployerModalOnTop(true);
                      handleOpenEmployerDetailsById(empId);
                    }
                  }}
                >
                  <span>Employer Details</span>
                </button>
                <button
                  type="button"
                  className={`jd-floating-breakdown-tab ${isMatchDrawerOpen && !isMatchDrawerClosing ? "active" : ""}`}
                  onClick={handleToggleMatchDrawer}
                >
                  <span>{isMatchDrawerOpen && !isMatchDrawerClosing ? "Hide Breakdown" : "Match Breakdown"}</span>
                </button>
                <button
                  type="button"
                  className={`jd-floating-breakdown-tab ${isJobMsgOpen && !isJobMsgClosing ? "active" : ""}`}
                  onClick={handleToggleJobMsg}
                >
                  <span>{isJobMsgOpen && !isJobMsgClosing ? "Hide Message" : "Message"}</span>
                </button>
              </div>
            )}

            <div
              ref={modalPanelRef}
              className="jd-panel"
              style={modalMatchedHeight ? { height: `${modalMatchedHeight}px`, maxHeight: `${modalMatchedHeight}px` } : undefined}
            >
              {/* Cover banner */}
              <div ref={modalBannerRef} className="jd-cover-banner">
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
                  <span>Cover photo</span>
                </div>
              </div>

              {/* Employer strip */}
              <div ref={modalStripRef} className="jd-employer-strip">
                <div className="jd-employer-logo-info">
                  <div
                    className={`jd-employer-logo ${empUserId ? "clickable" : ""}`}
                    aria-label="Company logo"
                    onClick={() => {
                      if (empUserId) {
                        setIsEmployerModalOnTop(true);
                        handleOpenEmployerDetailsById(empUserId);
                      }
                    }}
                    style={{
                      cursor: empUserId ? "pointer" : "default",
                      overflow: "hidden",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={companyName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                    <div className="jd-employer-name-row">
                      <strong
                        className={`jd-employer-name ${empUserId ? "clickable" : ""}`}
                        onClick={() => {
                          if (empUserId) {
                            setIsEmployerModalOnTop(true);
                            handleOpenEmployerDetailsById(empUserId);
                          }
                        }}
                        style={{ cursor: empUserId ? "pointer" : "default" }}
                      >
                        {companyName}
                      </strong>
                      <span className="company-inline-rating-pill" title="Company rating">
                        <span className="star-icon">★</span>
                        <span>{ratingText}</span>
                      </span>
                    </div>
                    <span className="jd-employer-location">
                      <svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12" fill="none" stroke="#5b8ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {locationStr}
                    </span>
                  </div>
                </div>

                <div className="jd-header-right-actions">
                  <div
                    className={`match-score-box ${getMatchColorClass(matchInfo.score)}`}
                    title="Match Score"
                  >
                    <small>MATCH</small>
                    <b>{matchInfo.score}%</b>
                  </div>
                  <button
                    type="button"
                    className={`jd-faq-btn ${isFaqDrawerOpen ? "active" : ""}`}
                    onClick={() => setIsFaqDrawerOpen((prev) => !prev)}
                  >
                    FAQ's
                  </button>
                </div>
              </div>

              {/* Scrollable body & drawer container */}
              <div ref={modalBodyWrapperRef} className="jd-body-wrapper">
                <div ref={modalBodyRef} className="jd-body">
                  {/* Title row */}
                  <div className="jd-top-section">
                    <div className="jd-title-row">
                      <h2 className="jd-title-h2">{jobTitle}</h2>
                    </div>
                    <div className="jd-chips-inline">
                      <span className={`status-chip ${isOpenStatus ? "open" : "closed"}`}>
                        {isOpenStatus ? "Open" : "Closed"}
                      </span>
                      {isUrgent && <span className="status-chip urgent">Urgent</span>}
                      <span className="setup-pill">{workSetup}</span>
                      {experienceLevel && <span className="exp-level-pill">{experienceLevel}</span>}
                      {(() => {
                        const isHidden = Boolean(
                          detailsJob.hideSalary ||
                          detailsJob.hide_salary === 1 ||
                          detailsJob.hide_salary === "1" ||
                          detailsJob.hide_salary === true ||
                          detailsJob.hide_salary === "true" ||
                          detailsJob.salary === "Salary Confidential"
                        );
                        if (isHidden) {
                          return <span className="salary-pill confidential">Salary Confidential</span>;
                        }
                        if (detailsJob.salary) {
                          return <span className="salary-pill">{detailsJob.salary}</span>;
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="jd-section">
                    <h3>Job Description</h3>
                    <p>{descriptionText}</p>
                  </div>

                  {skills.length > 0 && (
                    <div className="jd-section">
                      <h3>Required Skills</h3>
                      <div className="jd-tags-wrap">
                        {skills.map((s, idx) => (
                          <span className="js-tag-chip js-tag-skill" key={idx} title={s}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {qualifications.length > 0 && (
                    <div className="jd-section">
                      <h3>Required Qualifications</h3>
                      <div className="jd-tags-wrap">
                        {qualifications.map((q, idx) => (
                          <span className="js-tag-chip js-tag-qualification" key={idx} title={q}>{q}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {certifications.length > 0 && (
                    <div className="jd-section">
                      <h3>Required Certifications</h3>
                      <div className="jd-tags-wrap">
                        {certifications.map((c, idx) => (
                          <span className="js-tag-chip js-tag-certification" key={idx} title={c}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slide-in FAQ Drawer */}
                <div ref={modalFaqDrawerRef} className={`jd-faq-drawer ${isFaqDrawerOpen ? "open" : ""}`}>
                  <div className="jd-faq-header">
                    <h3>Company FAQ's</h3>
                    <button type="button" className="jd-faq-back-btn" aria-label="Back to job details" onClick={() => setIsFaqDrawerOpen(false)}>
                      ←
                    </button>
                  </div>
                  <div className="jd-faq-body">
                    {modalLoadingFaqs ? (
                      <p className="jd-faq-loading">Loading FAQ's...</p>
                    ) : modalFaqsList.length === 0 ? (
                      <p className="jd-faq-empty">No FAQ's created by this company yet.</p>
                    ) : (
                      modalFaqsList.map((faq) => {
                        const isExpanded = expandedFaqIds.includes(Number(faq.id));
                        return (
                          <div key={faq.id} className={`jd-faq-item ${isExpanded ? "expanded" : ""}`}>
                            <button
                              type="button"
                              className="jd-faq-question-btn"
                              onClick={() => toggleFaqItem(faq.id)}
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

              {/* Footer */}
              <div ref={modalFooterRef} className="jd-panel-footer">
                <div className="jd-footer-meta">
                  <span><strong>Close Date:</strong> {closeDate}</span>
                </div>
                <div className="jd-footer-actions">
                  <button type="button" className="jd-cancel-btn" onClick={handleCloseJobDetails}>
                    Close
                  </button>
                  {statusInfo ? (
                    <button
                      type="button"
                      className={`solid-btn applied-btn status-${statusInfo.statusClass}`}
                      disabled
                    >
                      {statusInfo.label}
                    </button>
                  ) : isClosed ? (
                    <button
                      type="button"
                      className="solid-btn closed-btn status-closed"
                      disabled
                    >
                      Closed
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="solid-btn"
                      onClick={() => setApplyJobTarget({ jobId: detailsJob.id, title: detailsJob.title })}
                      disabled={isApplying}
                    >
                      {isApplying ? "Applying..." : "Apply Now"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Docked Side Panel (Match Breakdown or Message) */}
          {hasSidePanel && (
            <div
              ref={modalSidePanelSlotRef}
              className="jd-side-panel-slot"
              style={modalMatchedHeight ? { height: `${modalMatchedHeight}px`, maxHeight: `${modalMatchedHeight}px` } : undefined}
            >
              {(isMatchDrawerOpen || isMatchDrawerClosing) && !isJobMsgOpen ? (
                renderCompetenciesPanel()
              ) : (isJobMsgOpen || isJobMsgClosing) && !isMatchDrawerOpen ? (
                renderJobMessagePanel()
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`jobsearch-page appdash-page ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
      <aside className="appdash-sidebar" aria-label="Applicant Navigation">
        <div className="appdash-brand">
          <a href="/" className="appdash-brand-link">
            <strong>EliteCruit</strong>
            <span>Candidate Workspace</span>
          </a>
          <button
            type="button"
            className="appdash-sidebar-toggle"
            aria-label="Close sidebar menu"
            onClick={() => setIsSidebarVisible(false)}
          >
            <MenuIcon />
          </button>
        </div>

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
                <li><a href="/applicant-dashboard#section-smart-matches"><span className="item-icon"><SideIcon name="star" /></span><span>Smart Matches</span></a></li>
                <li><a href="/applicant-dashboard#section-applications"><span className="item-icon"><SideIcon name="applications" /></span><span>My Applications</span></a></li>
                <li><a href="/applicant-dashboard#section-invitations"><span className="item-icon"><SideIcon name="notifications" /></span><span>Job Invitations</span></a></li>
              </ul>
            )}
          </li>

          <li className="active"><a href="/job-search"><span className="item-icon"><SideIcon name="search" /></span><span>Job Search</span></a></li>
          <li><a href="/applicant-offer-letter"><span className="item-icon"><SideIcon name="documents" /></span><span>Offer Letters</span></a></li>
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

      {isSidebarVisible && (
        <button
          type="button"
          className="appdash-backdrop"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      <main ref={mainRef} className="appdash-main jobsearch-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <button
              type="button"
              className="appdash-mobile-nav-toggle"
              aria-label={isSidebarVisible ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setIsSidebarVisible((prev) => !prev)}
            >
              <MenuIcon />
            </button>
            <div>
              <strong>{searchMode === "jobs" ? "Job Search" : "Employer Search"}</strong>
            </div>
          </div>

          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <ApplicantChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle={searchMode === "jobs" ? "Job Search" : "Employer Search"}
              />
            </div>
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
                          <span className="company-meta-with-rating">
                            <MiniIcon name="company" />
                            <span>{job.company}</span>
                            <span className="company-inline-rating-pill" title="Company rating">
                              <span className="star-icon">★</span>
                              <span>{job.rating ? Number(job.rating).toFixed(1) : "0.0"}</span>
                            </span>
                          </span>
                          <RenderLocationMeta location={job.location} />
                        </p>
                        <p className="result-summary">{job.summary || "No job description provided yet."}</p>
                        <div className="result-tags">
                          <span className={`status-chip ${job.status === "open" ? "open" : "closed"}`}>{job.status === "open" ? "Open" : "Closed"}</span>
                          {job.urgent ? <span className="status-chip urgent">Urgent</span> : null}
                          <span className="setup-pill">{job.setup}</span>
                          {job.experienceLevel && <span className="exp-level-pill">{formatExperienceLevel(job.experienceLevel)}</span>}
                          {(() => {
                            const isHidden = Boolean(
                              job.hideSalary ||
                              job.hide_salary === 1 ||
                              job.hide_salary === "1" ||
                              job.hide_salary === true ||
                              job.hide_salary === "true" ||
                              job.salary === "Salary Confidential"
                            );
                            if (isHidden) {
                              return <span className="salary-pill confidential">Salary Confidential</span>;
                            }
                            if (job.salary) {
                              return <span className="salary-pill">{job.salary}</span>;
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      <div className="result-right-col">
                        <div className="card-top-actions">
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
                          {(() => {
                            const statusInfo = getJobApplicationStatus(job.id);
                            const isJobClosed = job.status === "closed" || isJobClosedOrExpired(job.closeDate, job.status, job.applicationLimit, job.applicantCount);
                            const isApplying = applyingJobId === job.id;
                            const isApplied = Boolean(statusInfo);
                            return (
                              <button
                                type="button"
                                className={`solid-btn apply-right-btn ${isApplied ? `applied-btn status-${statusInfo?.statusClass || "applied"}` : isJobClosed ? "status-closed" : ""}`}
                                onClick={() => !isApplied && !isJobClosed && setApplyJobTarget({ jobId: job.id, title: job.title })}
                                disabled={isApplied || isJobClosed || isApplying}
                              >
                                {isApplied ? statusInfo!.label : isJobClosed ? "Closed" : isApplying ? "Applying..." : "Apply"}
                              </button>
                            );
                          })()}
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
                            <div className="employer-name-rating-row">
                              <h3 title={employer.company_name} style={{ margin: 0, fontSize: "1.1rem" }}>
                                {employer.company_name}
                              </h3>
                              <span className="company-inline-rating-pill" title="Employer rating">
                                <span className="star-icon">★</span>
                                <span>{employer.rating ? Number(employer.rating).toFixed(1) : "0.0"}</span>
                              </span>
                            </div>
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

                      <div className="result-right-col" style={{ justifyContent: "center" }}>
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

      {/* ── Standardized Job Details Modal ── */}
      {renderJobDetailsModal()}

      {/* ── Category Skills & Certifications Popup Modal ── */}
      {activeBreakdownPopup && (
        <div
          className="skill-popup-modal-overlay"
          onClick={() => setActiveBreakdownPopup(null)}
          style={{ zIndex: 10200 }}
        >
          <div
            className="skill-popup-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="breakdown-category-modal-title"
          >
            <div className="skill-popup-modal-header">
              <div className="skill-popup-title-group">
                <span className="skill-popup-icon">
                  {activeBreakdownPopup.type === "skills" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="7"></circle>
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                    </svg>
                  )}
                </span>
                <h3 id="breakdown-category-modal-title" className="skill-popup-title">
                  {activeBreakdownPopup.category}
                </h3>
                {(() => {
                  const list = activeBreakdownPopup.type === "skills"
                    ? (groupedBreakdownSkills[activeBreakdownPopup.category] || [])
                    : (groupedBreakdownCerts[activeBreakdownPopup.category] || []);
                  const label = activeBreakdownPopup.type === "skills"
                    ? (list.length === 1 ? "skill" : "skills")
                    : (list.length === 1 ? "certification" : "certifications");
                  return (
                    <span className="skill-popup-count-badge">
                      {list.length} {label}
                    </span>
                  );
                })()}
              </div>
              <button
                type="button"
                className="skill-popup-close-btn"
                onClick={() => setActiveBreakdownPopup(null)}
                aria-label="Close popup"
              >
                ✕
              </button>
            </div>

            <div className="skill-popup-modal-body">
              <div className="skill-popup-list">
                {(() => {
                  const list = activeBreakdownPopup.type === "skills"
                    ? (groupedBreakdownSkills[activeBreakdownPopup.category] || [])
                    : (groupedBreakdownCerts[activeBreakdownPopup.category] || []);
                  const targetJobTags = activeBreakdownPopup.type === "skills"
                    ? (detailsJob?.skillTags || [])
                    : (detailsJob?.certTags || []);

                  if (list.length === 0) {
                    return (
                      <div className="empty-category-notice">
                        No items found in this category.
                      </div>
                    );
                  }

                  return list.map((item, idx) => {
                    const isCert = activeBreakdownPopup.type === "certifications";
                    const isRel = targetJobTags.length > 0 && targetJobTags.some((jt) =>
                      isCert ? isCertificationMatch(jt, item.name) : isSkillMatch(jt, item.name)
                    );
                    const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item.name;
                    const isLinked = Boolean(
                      hoveredCompareTag?.side === "employer" &&
                      hoveredCompareTag?.category === activeBreakdownPopup.type &&
                      (isCert ? isCertificationMatch(hoveredCompareTag.item, item.name) : isSkillMatch(item.name, hoveredCompareTag.item))
                    );
                    const certItem = item as BreakdownCertItem;

                    return (
                      <div
                        key={`${item.name}-${idx}`}
                        className={`skill-popup-item-row ${isRel ? "item-matched" : ""} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                        onMouseEnter={() => setHoveredCompareTag({ item: item.name, side: "applicant", category: activeBreakdownPopup.type })}
                        onMouseLeave={() => setHoveredCompareTag(null)}
                      >
                        <span className="skill-popup-item-name">{item.name}</span>
                        <div className="skill-popup-item-actions">
                          {item.year && !isCert && (
                            <span className="skill-popup-since-label">
                              Since {item.year}
                            </span>
                          )}
                          {isCert && certItem.expiry && (
                            <span className="skill-popup-since-label">
                              Expires: {certItem.expiry}
                            </span>
                          )}
                          {isRel && (
                            <span className="jd-match-status-pill matched">
                              <span className="status-icon">✓</span> Matched with Job
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="skill-popup-modal-footer">
              <button
                type="button"
                className="skill-popup-done-btn"
                onClick={() => setActiveBreakdownPopup(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPANY DETAILS MODAL ── */}
      <EmployerDetailsModal
        isOpen={Boolean(selectedEmployerDetails)}
        zIndex={isEmployerModalOnTop ? 10100 : undefined}
        onClose={() => {
          setSelectedEmployerDetails(null);
          setIsEmployerModalOnTop(false);
          setIsEmployerFaqDrawerOpen(false);
          setIsEmployerMsgOpen(false);
          setIsEmployerMsgClosing(false);
          setIsEmployerJobsOpen(false);
          setIsEmployerJobsClosing(false);
        }}
        employer={selectedEmployerDetails}
        isFaqOpen={isEmployerFaqDrawerOpen}
        onFaqOpenChange={(open) => {
          setIsEmployerFaqDrawerOpen(open);
        }}
        topFloatingActions={
          !isEmployerModalOnTop ? (
            <>
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
            </>
          ) : undefined
        }
        sidePanel={
          !isEmployerModalOnTop && (isEmployerJobsOpen || isEmployerJobsClosing) && !isEmployerMsgOpen && selectedEmployerDetails ? (
            <aside
              className={`jd-side-comparison-panel ${isEmployerJobsClosing ? "closing" : "opening"}`}
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <div className="jd-side-panel-header" style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="jd-side-title-row">
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: "'Inter', sans-serif" }}>
                    Other Employer Jobs
                  </h3>
                  <span className="jd-side-subtitle" style={{ fontSize: "0.82rem", color: "#557796", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                    Open job positions available to apply
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
                  fontFamily: "'Inter', sans-serif",
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                {sortedEmployerJobs.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748b", padding: "30px 10px", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif" }}>
                    No active job openings posted by this employer at the moment.
                  </div>
                ) : (
                  sortedEmployerJobs.map((j) => {
                    const statusInfo = getJobApplicationStatus(j.id);
                    const isApplying = applyingJobId === j.id;

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
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#01294a", fontFamily: "'Inter', sans-serif" }}>
                            {j.title}
                          </h4>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "2px", fontSize: "0.8rem", color: "#64748b", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "'Inter', sans-serif" }}>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                                <circle cx="12" cy="10" r="2.5" />
                              </svg>
                              {j.location || selectedEmployerDetails.location || "Cavite"}
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "'Inter', sans-serif" }}>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                              </svg>
                              {j.work_arrangement || "On-Site"}
                            </span>
                            {Boolean(
                              j.hide_salary === 1 ||
                              j.hide_salary === "1" ||
                              j.hide_salary === true ||
                              j.hide_salary === "true" ||
                              (j as any).hideSalary
                            ) ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "'Inter', sans-serif" }}>
                                Salary Confidential
                              </span>
                            ) : j.salary_min ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "'Inter', sans-serif" }}>
                                {formatSalary(j.salary_min, j.salary_max, false)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="jd-other-job-action-col">
                          <span
                            className={`jd-other-job-match-pill ${j.matchPct >= 80 ? "green" : j.matchPct >= 50 ? "yellow" : "red"}`}
                          >
                            {j.matchPct}% Match
                          </span>
                          <button
                            type="button"
                            className="details-btn jd-other-job-details-btn"
                            onClick={() => handleOpenJobFromEmployerModal(j.id)}
                          >
                            Details
                          </button>
                          {statusInfo ? (
                            <button
                              type="button"
                              disabled
                              className={`jd-other-job-apply-btn status-${statusInfo.statusClass}`}
                              aria-label={`Application status: ${statusInfo.label}`}
                            >
                              {statusInfo.label}
                            </button>
                          ) : isJobClosedOrExpired(j.close_date, (j as any).status) ? (
                            <button
                              type="button"
                              disabled
                              className="jd-other-job-apply-btn status-closed"
                              aria-label="Job is closed"
                            >
                              Closed
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="jd-other-job-apply-btn apply-btn-action"
                              disabled={isApplying}
                              onClick={() => setApplyJobTarget({ jobId: j.id, title: j.title })}
                            >
                              {isApplying ? "Applying..." : "Apply"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          ) : !isEmployerModalOnTop && (isEmployerMsgOpen || isEmployerMsgClosing) && !isEmployerJobsOpen && selectedEmployerDetails ? (
            <aside
              className={`jd-side-comparison-panel cand-message-side-panel ${isEmployerMsgClosing ? "closing" : "opening"}`}
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <div className="jd-side-panel-header" style={{ fontFamily: "'Inter', sans-serif" }}>
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
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {(() => {
                      const logoSrc = selectedEmployerDetails.company_logo_path
                        ? selectedEmployerDetails.company_logo_path.startsWith("http") || selectedEmployerDetails.company_logo_path.startsWith("/api")
                          ? selectedEmployerDetails.company_logo_path
                          : `/api/employers/${selectedEmployerDetails.employer_user_id}/logo`
                        : selectedEmployerDetails.employer_user_id
                        ? `/api/employers/${selectedEmployerDetails.employer_user_id}/logo`
                        : null;
                      return logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={selectedEmployerDetails.company_name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                            if (e.currentTarget.parentElement) {
                              e.currentTarget.parentElement.textContent = initialsFrom(selectedEmployerDetails.company_name);
                            }
                          }}
                        />
                      ) : (
                        initialsFrom(selectedEmployerDetails.company_name)
                      );
                    })()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>
                      {selectedEmployerDetails.company_name}
                    </h3>
                    <span className="jd-side-subtitle" style={{ fontSize: "0.78rem", color: "#557796", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
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
                }}
              >
                {/* Chat Messages List */}
                <div
                  ref={employerMsgScrollRef}
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
                          background: "rgba(2, 132, 199, 0.15)",
                          color: "#0284c7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="24"
                          height="24"
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
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
          ) : null
        }
      />

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

