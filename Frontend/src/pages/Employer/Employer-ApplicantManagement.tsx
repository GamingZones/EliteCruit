import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import {
  BSIT_BSCS_SKILLS,
  BSIT_BSCS_QUALIFICATIONS,
  BSIT_BSCS_CERTIFICATIONS,
  CAVITE_CITIES,
  PHILIPPINES_PROVINCE_CITIES_MAP,
  WORK_ARRANGEMENTS,
  EXPERIENCE_LEVELS,
  EXP_YEARS_OPTIONS,
  calculateCandidateMatch,
  calculateJobMatchDetails,
  getMatchColorClass,
  isSkillMatch,
  formatExperienceLevel,
  formatLocationWithCavite,
  parseCompetencyDisplayTags,
  parseItemList,
  parseExpectedSalary,
  parsePreferredLocationTags,
} from "../../utils/filters";
import "../Applicant/Applicant-Dashboard.css";
import "./Employer-Dashboard.css";
import "./Employer-ApplicantManagement.css";
import "../Applicant/JobSearch.css";

function isShsItem(item: string): boolean {
  if (!item) return false;
  const lower = item.toLowerCase();
  return (
    lower.includes("[shs]") ||
    lower.includes("senior high") ||
    lower.includes("vocational") ||
    lower.includes("tech-voc") ||
    lower.includes("tesda") ||
    lower.includes("strand") ||
    lower.includes("gas") ||
    lower.includes("tvl") ||
    lower.includes("stem") ||
    lower.includes("abm") ||
    lower.includes("humss")
  );
}

interface ApplicantDocumentItem {
  id: number | string;
  file_name: string;
  file_size?: number | null;
  mimetype?: string;
  created_at?: string | null;
  url: string;
  is_resume?: boolean;
}

function formatDocBytes(bytes?: number | null, decimals = 1) {
  if (!bytes || bytes === 0) return "";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getDocIconType(fileName: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  return "generic";
}

function getDocIconStyle(type: string) {
  switch (type) {
    case "pdf":
      return { bg: "#fee2e2", color: "#dc2626" };
    case "word":
      return { bg: "#e0f2fe", color: "#0284c7" };
    case "image":
      return { bg: "#dcfce7", color: "#16a34a" };
    default:
      return { bg: "#f1f5f9", color: "#475569" };
  }
}

function parseCandidateSalaryRange(cand?: any): { min: string; max: string } {
  if (!cand) return { min: "Negotiable", max: "Negotiable" };

  const formatPhp = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const raw = String(val).replace(/,/g, "").replace(/[^0-9.]/g, "").trim();
    if (!raw) return "";
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return "";
    return `PHP ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  let minStr = formatPhp(cand.expected_salary_min);
  let maxStr = formatPhp(cand.expected_salary_max);

  if ((!minStr || !maxStr || minStr === maxStr) && cand.expected_salary) {
    const rawStr = String(cand.expected_salary).trim();
    if (rawStr.includes("-")) {
      const parts = rawStr.split("-").map((p: string) => p.trim());
      const pMin = formatPhp(parts[0]);
      const pMax = formatPhp(parts[1]);
      if (pMin && pMax) {
        minStr = pMin;
        maxStr = pMax;
      }
    } else if (!minStr && !maxStr) {
      const single = formatPhp(rawStr);
      minStr = single;
      maxStr = single;
    }
  }

  return {
    min: minStr || "Negotiable",
    max: maxStr || minStr || "Negotiable",
  };
}

type ItemWithExp = {
  name: string;
  years: string;
};

const MIN_SALARY_OPTIONS = [
  "PHP 10,000",
  "PHP 15,000",
  "PHP 20,000",
  "PHP 25,000",
  "PHP 30,000",
  "PHP 35,000",
  "PHP 40,000",
  "PHP 50,000",
];

const MAX_SALARY_OPTIONS = [
  "PHP 20,000",
  "PHP 30,000",
  "PHP 40,000",
  "PHP 50,000",
  "PHP 60,000",
  "PHP 75,000",
  "PHP 100,000+",
];

function FinderIcon({ name }: { name: "search" | "nearby" | "filters" | "location" | "briefcase" | "money" | "star" | "message" | "invite" | "docs" | "building" | "distance" }) {
  const icons: Record<string, JSX.Element> = {
    search: <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />,
    nearby: <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />,
    filters: <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />,
    location: <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />,
    briefcase: <path d="M19 6h-3V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-9-2h4v2h-4V4zm9 13H5V8h14v9zm-8-5h2v2h-2v-2z" />,
    money: <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />,
    star: <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />,
    message: <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />,
    invite: <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />,
    docs: <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />,
    building: <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2V9zm0 4h-2v2h2v-2z" />,
    distance: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />,
  };
  return (
    <svg className="mini-icon-svg" viewBox="0 0 24 24" aria-hidden="true" style={{ width: "15px", height: "15px", fill: "currentColor" }}>
      {icons[name]}
    </svg>
  );
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

function RowActionIcon({ name }: { name: "review" | "message" | "shortlist" | "approve" | "reject" }) {
  const icons: Record<string, JSX.Element> = {
    review: (
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    ),
    message: (
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
    ),
    shortlist: (
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    ),
    approve: (
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    ),
    reject: (
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    ),
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

type Application = {
  id: number;
  status: string;
  submitted_at: string | null;
  job_post_id: number;
  job_title: string;
  job_required_skills?: string | null;
  job_required_qualifications?: string | null;
  job_required_certifications?: string | null;
  job_work_arrangement?: string | null;
  job_location?: string | null;
  job_salary_min?: number;
  job_salary_max?: number;
  city: string | null;
  address?: string | null;
  applicant_name: string;
  desired_job_title: string | null;
  work_arrangement?: string | null;
  expected_salary?: number | string | null;
  applicant_user_id: number;
  province?: string | null;
  years_of_experience?: string | number | null;
  work_experience_json?: string | null;
  skills?: string | null;
  qualifications?: string | null;
  certifications?: string | null;
  profile_picture_path?: string | null;
};

type DirectInvitation = {
  id: number;
  job_post_id: number;
  applicant_user_id: number;
  status: string;
  custom_message?: string;
  created_at: string;
  updated_at: string;
  job_title: string;
  job_location?: string;
  salary_min?: number;
  salary_max?: number;
  work_arrangement?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  skills?: string;
  qualifications?: string;
  desired_job_title?: string;
  resume_path?: string | null;
  profile_picture_path?: string | null;
  applicant_email?: string;
};

type Stats = { total: number; pending: number; shortlisted: number };

function parseItemList(str?: string | null, fallback: string[] = []): string[] {
  if (!str || !str.trim()) return fallback;
  const items = str
    .split(/[\n,•;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusChipClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "shortlisted") return "status-chip shortlisted";
  if (s === "approved" || s === "accepted") return "status-chip approved";
  if (s === "denied" || s === "rejected") return "status-chip denied";
  return "status-chip pending";
}

function formatStatusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "shortlisted") return "shortlisted";
  if (s === "approved" || s === "accepted") return "approved";
  if (s === "denied" || s === "rejected") return "denied";
  return "pending";
}

function isApprovedStatus(status: string) {
  const s = (status || "").toLowerCase();
  return s === "approved" || s === "accepted";
}

function isDeniedStatus(status: string) {
  const s = (status || "").toLowerCase();
  return s === "denied" || s === "rejected";
}

function isFinalizedStatus(status: string) {
  return isApprovedStatus(status) || isDeniedStatus(status);
}

function getAutomatedDecisionTemplate(
  action: "approved" | "denied",
  applicantName: string,
  jobTitle: string,
  companyName: string,
  customTemplates?: { acceptance_template?: string; rejection_template?: string } | null
): string {
  const safeApplicant = applicantName?.trim() || "Applicant";
  const safeJob = jobTitle?.trim() || "the requested position";
  const safeCompany = companyName?.trim() || "Our Company";

  let base = "";
  if (action === "approved") {
    base = customTemplates?.acceptance_template || (
      `Dear {applicant_name},\n\n` +
      `Congratulations! We are pleased to inform you that your application for the position of "{job_title}" at {company_name} has been accepted.\n\n` +
      `Our hiring team was thoroughly impressed with your profile, qualifications, and experience. We will be reaching out to you shortly via messages with onboarding instructions and next steps.\n\n` +
      `Thank you for choosing to grow your career with {company_name}!\n\n` +
      `Best regards,\n` +
      `{company_name} Recruitment Team`
    );
  } else {
    base = customTemplates?.rejection_template || (
      `Dear {applicant_name},\n\n` +
      `Thank you for taking the time to apply for the position of "{job_title}" at {company_name}.\n\n` +
      `After careful consideration and review of all submissions, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current requirements.\n\n` +
      `We appreciate your interest in {company_name} and wish you the best of luck in your career pursuits.\n\n` +
      `Sincerely,\n` +
      `{company_name} Hiring Team`
    );
  }

  return base
    .replace(/\{applicant_name\}/g, safeApplicant)
    .replace(/\{job_title\}/g, safeJob)
    .replace(/\{company_name\}/g, safeCompany);
}

function getMatchPercent(app: Application, profileOverride?: any, jobsMap?: Record<number, any>): number {
  if ((app as any).match_percent && typeof (app as any).match_percent === "number") {
    return (app as any).match_percent;
  }
  const candSource = profileOverride || app;
  const jobSource = (jobsMap && app.job_post_id ? jobsMap[app.job_post_id] : null) || {};

  return calculateCandidateMatch(
    {
      desired_job_title: candSource.desired_job_title || app.desired_job_title || "",
      work_arrangement: candSource.work_arrangement || app.work_arrangement || "",
      expected_salary: candSource.expected_salary || app.expected_salary || 0,
      skills: candSource.skills || app.skills || "",
      qualifications: candSource.qualifications || app.qualifications || "",
      certifications: candSource.certifications || app.certifications || "",
      city: candSource.city || app.city || "",
    },
    {
      title: jobSource.title || app.job_title || "",
      work_arrangement: jobSource.work_arrangement || app.job_work_arrangement || "",
      required_skills: jobSource.required_skills || app.job_required_skills || "",
      required_qualifications: jobSource.qualifications || jobSource.required_qualifications || app.job_required_qualifications || "",
      required_certifications: jobSource.certifications || jobSource.required_certifications || app.job_required_certifications || "",
      location: jobSource.location || app.job_location || "",
      salary_min: Number(jobSource.salary_min) || Number(app.job_salary_min) || 0,
      salary_max: Number(jobSource.salary_max) || Number(app.job_salary_max) || 0,
    }
  );
}

function getMatchPercentStyle(percent: number) {
  if (percent >= 81) {
    return {
      color: "#059669",
      track: "#d1fae5",
      fill: "#10b981",
    };
  }
  if (percent >= 51) {
    return {
      color: "#d97706",
      track: "#fef3c7",
      fill: "#f59e0b",
    };
  }
  return {
    color: "#dc2626",
    track: "#fee2e2",
    fill: "#ef4444",
  };
}

function getAppMatchDetails(app: Application, profileOverride?: any, jobsMap?: Record<number, any>) {
  const candSource = profileOverride || app;
  const jobSource = (jobsMap && app.job_post_id ? jobsMap[app.job_post_id] : null) || {};

  const candCity = candSource.city || app.city || "Cavite";
  const candSetup = candSource.work_arrangement || app.work_arrangement || "Any";
  const candSalary = candSource.expected_salary || app.expected_salary;
  const candSkills = parseCompetencyDisplayTags(candSource.skills || app.skills);
  const candQuals = parseCompetencyDisplayTags(candSource.qualifications || app.qualifications);
  const candCerts = parseCompetencyDisplayTags(candSource.certifications || app.certifications);

  const jobLocation = jobSource.location || app.job_location || "Cavite";
  const jobSetup = jobSource.work_arrangement || app.job_work_arrangement || "On-Site";
  const jobSalaryMin = Number(jobSource.salary_min) || Number(app.job_salary_min) || 0;
  const jobSalaryMax = Number(jobSource.salary_max) || Number(app.job_salary_max) || 0;
  const jobSkills = parseCompetencyDisplayTags(jobSource.required_skills || app.job_required_skills);
  const jobQuals = parseCompetencyDisplayTags(jobSource.qualifications || jobSource.required_qualifications || app.job_required_qualifications);
  const jobCerts = parseCompetencyDisplayTags(jobSource.certifications || jobSource.required_certifications || app.job_required_certifications);

  return calculateJobMatchDetails(
    {
      id: app.job_post_id,
      title: jobSource.title || app.job_title,
      location: jobLocation,
      salaryMin: jobSalaryMin,
      setup: jobSetup,
      skillTags: jobSkills,
      qualTags: jobQuals,
      certTags: jobCerts,
    },
    {
      desiredJobTitle: candSource.desired_job_title || app.desired_job_title || "",
      workArrangement: candSetup,
      expectedSalary: parseExpectedSalary(candSalary),
      city: candCity,
      skills: candSkills,
      qualifications: candQuals,
      certifications: candCerts,
    }
  );
}

function matchesExperienceLevel(candExp?: string | number | null, selected?: string): boolean {
  if (!selected || selected === "Any Experience" || selected === "Any experience") return true;
  const raw = String(candExp ?? "").toLowerCase().trim();
  const num = parseFloat(raw) || 0;

  if (selected.includes("Fresh Graduate")) {
    return num < 1 || raw.includes("fresh") || raw.includes("entry") || raw === "" || raw === "0";
  }
  if (selected.includes("Junior")) {
    return (num >= 1 && num <= 2) || raw.includes("junior");
  }
  if (selected.includes("Mid-level")) {
    return (num >= 3 && num <= 5) || raw.includes("mid");
  }
  if (selected.includes("Senior")) {
    return (num >= 5 && num <= 8) || raw.includes("senior");
  }
  if (selected.includes("Lead") || selected.includes("Expert")) {
    return num >= 8 || raw.includes("lead") || raw.includes("expert");
  }
  return true;
}

export default function EmployerApplicantManagement() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const [activeScreeningSection, setActiveScreeningSection] = useState("applicant-screening");
  const companyLabel = useEmployerCompanyLabel("Employer");
  const mainRef = useRef<HTMLElement | null>(null);

  const applicantMgmtFaqs: FAQItem[] = [
    {
      question: "How are candidate Match Scores calculated?",
      answer: "Match percentages are computed automatically by comparing candidate skills, qualifications, work arrangement, and expected salary against your job posting requirements.",
    },
    {
      question: "How do I review a candidate's resume and details?",
      answer: "Click the 'Review' (eye icon) button on any applicant card to open their full profile summary and view attached PDF/Word resumes.",
    },
    {
      question: "How do I move applicants to Shortlisted or Approved?",
      answer: "Use the action buttons on candidate cards: click the Star icon to Shortlist, the Checkmark icon to Approve, or the X icon to Reject an applicant.",
    },
    {
      question: "What is the Shortlisted Candidates section?",
      answer: "The Shortlisted Candidates board displays candidate cards who passed your initial screening, organized for final interviews and decision-making.",
    },
  ];

  const [applications, setApplications] = useState<Application[]>([]);
  const [allJobsMap, setAllJobsMap] = useState<Record<number, any>>({});
  const [directInvitations, setDirectInvitations] = useState<DirectInvitation[]>([]);
  const [invitationFilter, setInvitationFilter] = useState<"all" | "accepted" | "pending" | "declined">("all");
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, shortlisted: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter state - Mirroring Applicant Finder & JobSearch
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [boardJobFilter, setBoardJobFilter] = useState("all");
  const [selectedProvince, setSelectedProvince] = useState("All Provinces");
  const [selectedCity, setSelectedCity] = useState("All Cities");

  const availableCities = useMemo(() => {
    if (selectedProvince !== "All Provinces" && PHILIPPINES_PROVINCE_CITIES_MAP[selectedProvince]) {
      return PHILIPPINES_PROVINCE_CITIES_MAP[selectedProvince];
    }
    return CAVITE_CITIES;
  }, [selectedProvince]);
  const [arrangementFilter, setArrangementFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("Any Experience");
  const [selectedMinSalary, setSelectedMinSalary] = useState("");
  const [selectedMaxSalary, setSelectedMaxSalary] = useState("");
  const [isMinFocused, setIsMinFocused] = useState(false);
  const [isMaxFocused, setIsMaxFocused] = useState(false);
  const [sortBy, setSortBy] = useState<"Best Match" | "Rating" | "Newest">("Best Match");

  const cleanDecimalInput = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }
    if (cleaned.includes(".")) {
      const [intPart, decPart] = cleaned.split(".");
      cleaned = `${intPart}.${decPart.slice(0, 2)}`;
    }
    return cleaned;
  };

  const formatSalaryDisplay = (val: string, isFocused: boolean) => {
    if (!val || !val.trim()) return "";
    if (isFocused) return val;
    const num = Number(val);
    if (isNaN(num) || num <= 0) return val;
    const parts = val.split(".");
    const hasDecimal = parts.length > 1;
    const decDigits = hasDecimal ? parts[1].length : 0;
    return `PHP ${num.toLocaleString("en-US", {
      minimumFractionDigits: decDigits,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleMinBlur = () => {
    setIsMinFocused(false);
  };

  const handleMaxBlur = () => {
    setIsMaxFocused(false);
  };

  const salaryError = useMemo(() => {
    const minNum = parseExpectedSalary(selectedMinSalary);
    const maxNum = parseExpectedSalary(selectedMaxSalary);
    return minNum > 0 && maxNum > 0 && minNum > maxNum;
  }, [selectedMinSalary, selectedMaxSalary]);

  const [filterSkills, setFilterSkills] = useState<ItemWithExp[]>([]);
  const [filterQualifications, setFilterQualifications] = useState<ItemWithExp[]>([]);
  const [filterCertifications, setFilterCertifications] = useState<ItemWithExp[]>([]);

  const applySearch = () => {
    setAppliedSearchQuery(searchInput.trim().toLowerCase());
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedProvince !== "All Provinces") count += 1;
    if (selectedCity !== "All Cities") count += 1;
    if (selectedMinSalary.trim() !== "") count += 1;
    if (selectedMaxSalary.trim() !== "") count += 1;
    if (arrangementFilter !== "all") count += 1;
    if (selectedExperience !== "Any Experience" && selectedExperience !== "Any experience") count += 1;
    if (sortBy !== "Best Match") count += 1;
    count += filterSkills.length;
    count += filterQualifications.length;
    count += filterCertifications.length;
    return count;
  }, [
    selectedProvince,
    selectedCity,
    selectedMinSalary,
    selectedMaxSalary,
    arrangementFilter,
    selectedExperience,
    sortBy,
    filterSkills,
    filterQualifications,
    filterCertifications,
  ]);

  const clearAllFilters = () => {
    setSearchInput("");
    setAppliedSearchQuery("");
    setJobFilter("all");
    setSelectedProvince("All Provinces");
    setSelectedCity("All Cities");
    setSelectedMinSalary("");
    setSelectedMaxSalary("");
    setArrangementFilter("all");
    setStatusFilter("all");
    setSelectedExperience("Any Experience");
    setSortBy("Best Match");
    setFilterSkills([]);
    setFilterQualifications([]);
    setFilterCertifications([]);
  };

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [stagedDecisions, setStagedDecisions] = useState<Record<number, "approved" | "denied">>({});
  const [reviewModalApp, setReviewModalApp] = useState<Application | null>(null);
  const [reviewModalProfile, setReviewModalProfile] = useState<any>(null);
  const [candDetailTab, setCandDetailTab] = useState<"personal" | "preferences" | "competencies" | "experience">("personal");
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);
  const [isPreviewingDoc, setIsPreviewingDoc] = useState(false);
  const [applicantDocuments, setApplicantDocuments] = useState<ApplicantDocumentItem[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ApplicantDocumentItem | null>(null);

  const fetchApplicantDocuments = async (applicantUserId: number) => {
    if (!applicantUserId) return;
    setIsDocsLoading(true);
    try {
      const res = await fetch(`/api/applicants/${applicantUserId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setApplicantDocuments(Array.isArray(data?.documents) ? data.documents : []);
      }
    } catch (err) {
      console.error("Failed to load applicant documents:", err);
    } finally {
      setIsDocsLoading(false);
    }
  };

  const [isDirectInvitationModal, setIsDirectInvitationModal] = useState(false);
  const [isMatchDrawerOpen, setIsMatchDrawerOpen] = useState(false);
  const [isMatchDrawerClosing, setIsMatchDrawerClosing] = useState(false);
  const [isOtherJobsOpen, setIsOtherJobsOpen] = useState(false);
  const [isOtherJobsClosing, setIsOtherJobsClosing] = useState(false);
  const [selectedCompareJobId, setSelectedCompareJobId] = useState<number | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<any | null>(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const [isJobDetailsClosing, setIsJobDetailsClosing] = useState(false);
  const [isJobBreakdownModalOpen, setIsJobBreakdownModalOpen] = useState(false);
  const [isRecruitModalOpen, setIsRecruitModalOpen] = useState(false);
  const [isRecruitModalClosing, setIsRecruitModalClosing] = useState(false);
  const [recruitJobTarget, setRecruitJobTarget] = useState<any | null>(null);

  const closeRecruitModal = () => {
    setIsRecruitModalClosing(true);
    setTimeout(() => {
      setIsRecruitModalOpen(false);
      setIsRecruitModalClosing(false);
    }, 200);
  };
  const [recruitCustomMsg, setRecruitCustomMsg] = useState("");
  const [isRecruitSending, setIsRecruitSending] = useState(false);
  const [recruitSuccessMsg, setRecruitSuccessMsg] = useState<string | null>(null);
  const [hoveredCompareTag, setHoveredCompareTag] = useState<{
    item: string;
    side: "applicant" | "employer";
    category: "skills" | "qualifications" | "certifications";
  } | null>(null);

  // Decision Modal and Rule 6 Warning Modal state
  const [decisionModalApps, setDecisionModalApps] = useState<Application[]>([]);
  const decisionModalApp = decisionModalApps[0] || null;
  const setDecisionModalApp = (app: Application | null) => setDecisionModalApps(app ? [app] : []);
  const [decisionModalAction, setDecisionModalAction] = useState<"approved" | "denied" | null>(null);
  const [decisionMessageType, setDecisionMessageType] = useState<"automated" | "manual">("automated");
  const [decisionMessageText, setDecisionMessageText] = useState("");
  const [manualMessageText, setManualMessageText] = useState("");
  const [isDecisionSubmitting, setIsDecisionSubmitting] = useState(false);
  const [warningPopup, setWarningPopup] = useState<string>("");
  const [customDecisionTemplates, setCustomDecisionTemplates] = useState<{
    acceptance_template?: string;
    rejection_template?: string;
  } | null>(null);

  const handleCloseMatchDrawer = () => {
    setIsMatchDrawerClosing(true);
    setTimeout(() => {
      setIsMatchDrawerOpen(false);
      setIsMatchDrawerClosing(false);
    }, 220);
  };

  const handleToggleMatchDrawer = () => {
    if (isMatchDrawerOpen) {
      handleCloseMatchDrawer();
    } else {
      setIsMatchDrawerOpen(true);
    }
  };

  const handleSendRecruitmentInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalApp || !selectedJobDetails) return;

    const rawUser = localStorage.getItem("elitecruit-user");
    if (!rawUser) return;
    let employerUserId: number | undefined;
    try {
      employerUserId = JSON.parse(rawUser)?.id;
    } catch (err) {
      console.error(err);
    }
    if (!employerUserId) return;

    const targetApplicantUserId = reviewModalApp.applicant_user_id || reviewModalApp.user_id;

    setIsRecruitSending(true);
    setRecruitSuccessMsg(null);

    try {
      const res = await fetch(`/api/employers/${employerUserId}/invite-candidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_user_id: targetApplicantUserId,
          job_post_id: selectedJobDetails.id,
          custom_message: recruitCustomMsg,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecruitSuccessMsg(`Invitation successfully sent to ${reviewModalApp.applicant_name}!`);
        setTimeout(() => {
          setIsRecruitModalOpen(false);
          setRecruitSuccessMsg(null);
        }, 1800);
      } else {
        alert(data.message || "Failed to send invitation.");
      }
    } catch (err) {
      console.error("Error sending invite:", err);
      alert("Network error sending invitation.");
    } finally {
      setIsRecruitSending(false);
    }
  };

  const calculateAppMatch = useCallback((app: Application, profileOverride?: any) => {
    return getMatchPercent(app, profileOverride, allJobsMap);
  }, [allJobsMap]);

  // Drag and Drop state
  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, appId: number) => {
    setDraggedAppId(appId);
    e.dataTransfer.setData("text/plain", String(appId));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedAppId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageKey: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverStage === stageKey) {
      setDragOverStage(null);
    }
  };

  const handleOpenReview = async (
    app: Application,
    openDocs: boolean = false,
    isDirectInv: boolean = false,
    openBreakdown: boolean = false
  ) => {
    setReviewModalApp(app);
    setReviewModalProfile(null);
    setCandDetailTab("personal");
    setSelectedCompareJobId(null);
    setSelectedJobDetails(null);
    setIsJobDetailsOpen(false);
    setIsJobDetailsClosing(false);
    setIsDocsDrawerOpen(openDocs);
    setIsPreviewingDoc(false);
    setPreviewDoc(null);
    setApplicantDocuments([]);
    if (app.applicant_user_id) {
      fetchApplicantDocuments(app.applicant_user_id);
    }
    setIsDirectInvitationModal(isDirectInv);
    setIsMatchDrawerOpen(openBreakdown);
    setIsMatchDrawerClosing(false);
    try {
      const res = await fetch(`/api/applicants/${app.applicant_user_id}/profile`);
      const data = await res.json();
      if (data?.profile) {
        setReviewModalProfile(data.profile);
      }
    } catch {}
  };

  const fetchApplications = useCallback(async () => {
    const raw = localStorage.getItem("elitecruit-user");
    if (!raw) { setError("Sign in as employer to view applications."); setIsLoading(false); return; }
    let userId: number;
    try {
      const parsed = JSON.parse(raw) as { id?: number; role?: string };
      if (parsed.role !== "employer" || !parsed.id) {
        setError("This page is available to employer accounts.");
        setIsLoading(false);
        return;
      }
      userId = parsed.id;
    } catch { setError("Unable to read account session."); setIsLoading(false); return; }

    setIsLoading(true);
    setError("");
    try {
      const [res, invRes, jobsRes] = await Promise.all([
        fetch(`/api/employers/${userId}/applications`),
        fetch(`/api/employers/${userId}/direct-invitations`),
        fetch(`/api/employers/${userId}/job-posts`).then((r) => (r.ok ? r : fetch("/api/job-posts"))),
      ]);

      if (jobsRes && jobsRes.ok) {
        const jobsData = await jobsRes.json();
        const rows = Array.isArray(jobsData?.jobPosts) ? jobsData.jobPosts : [];
        const map: Record<number, any> = {};
        rows.forEach((j: any) => {
          map[Number(j.id)] = j;
        });
        setAllJobsMap(map);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load applications.");
      setApplications(data.applications ?? []);
      setStats(data.stats ?? { total: 0, pending: 0, shortlisted: 0 });

      if (invRes.ok) {
        const invData = await invRes.json();
        setDirectInvitations(Array.isArray(invData?.invitations) ? invData.invitations : []);
      }

      fetch(`/api/employers/${userId}/decision-templates`)
        .then(async (tmplRes) => {
          if (!tmplRes.ok) return;
          const tmplData = await tmplRes.json();
          setCustomDecisionTemplates({
            acceptance_template: tmplData.acceptance_template,
            rejection_template: tmplData.rejection_template,
          });
        })
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const uniqueJobs = useMemo(() => {
    const map = new Map<string, string>();
    applications.forEach((app) => {
      if (app.job_post_id && app.job_title) {
        map.set(String(app.job_post_id), app.job_title);
      }
    });
    Object.values(allJobsMap).forEach((j: any) => {
      if (j.id && j.title) {
        map.set(String(j.id), j.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [applications, allJobsMap]);

  const filteredApplications = useMemo(() => {
    const list = applications.filter((app) => {
      // 1. Search Query
      if (appliedSearchQuery) {
        const q = appliedSearchQuery.toLowerCase();
        const name = (app.applicant_name || "").toLowerCase();
        const title = (app.job_title || "").toLowerCase();
        const desired = (app.desired_job_title || "").toLowerCase();
        const city = (app.city || "").toLowerCase();
        const skills = (app.skills || "").toLowerCase();
        const quals = (app.qualifications || "").toLowerCase();
        if (
          !name.includes(q) &&
          !title.includes(q) &&
          !desired.includes(q) &&
          !city.includes(q) &&
          !skills.includes(q) &&
          !quals.includes(q)
        ) {
          return false;
        }
      }

      // 2. Job Post Pool
      if (jobFilter !== "all") {
        if (String(app.job_post_id) !== String(jobFilter) && (app.job_title || "").toLowerCase() !== jobFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Location - Province
      if (selectedProvince !== "All Provinces") {
        const provClean = selectedProvince.toLowerCase().trim();
        const appProv = (app.province || "").toLowerCase();
        const appCity = (app.city || "").toLowerCase();
        const appAddr = (app.address || "").toLowerCase();
        const provCities = (PHILIPPINES_PROVINCE_CITIES_MAP[selectedProvince] || []).map((c) => c.toLowerCase());
        const matchesCityInProv = provCities.some((c) => appCity.includes(c) || appAddr.includes(c));
        const matchesProvName = appProv.includes(provClean) || appCity.includes(provClean) || appAddr.includes(provClean);
        if (!matchesCityInProv && !matchesProvName) return false;
      }

      // 4. Location - City / Municipality
      if (selectedCity !== "All Cities") {
        const cityClean = selectedCity.toLowerCase().replace(", cavite", "").trim();
        const appCity = (app.city || "").toLowerCase();
        const appAddr = (app.address || "").toLowerCase();
        if (!appCity.includes(cityClean) && !appAddr.includes(cityClean)) return false;
      }

      // 5. Work Arrangement
      if (arrangementFilter !== "all") {
        const appSetup = (app.work_arrangement || "").toLowerCase();
        const jobSetup = (app.job_work_arrangement || "").toLowerCase();
        const targetSetup = arrangementFilter.toLowerCase();
        const isFlexible = appSetup.includes("any") || appSetup.includes("flexible") || appSetup === "";
        if (!isFlexible && !appSetup.includes(targetSetup) && !jobSetup.includes(targetSetup)) return false;
      }

      // 6. Experience Level
      if (selectedExperience !== "Any Experience" && selectedExperience !== "Any experience") {
        const candExp = app.years_of_experience ?? (app as any).experience;
        if (!matchesExperienceLevel(candExp, selectedExperience)) {
          return false;
        }
      }

      // 7. Expected Salary Range (Min & Max numeric inputs)
      if (!salaryError) {
        if (selectedMinSalary.trim() !== "") {
          const minVal = parseExpectedSalary(selectedMinSalary);
          const appSal = parseExpectedSalary(app.expected_salary);
          if (!isNaN(minVal) && minVal > 0 && appSal > 0 && appSal < minVal) return false;
        }

        if (selectedMaxSalary.trim() !== "") {
          const maxVal = parseExpectedSalary(selectedMaxSalary);
          const appSal = parseExpectedSalary(app.expected_salary);
          if (!isNaN(maxVal) && maxVal > 0 && appSal > 0 && appSal > maxVal) return false;
        }
      }

      // 8. Technical Skills (ItemWithExp)
      if (filterSkills.length > 0) {
        const appSkills = parseCompetencyDisplayTags(app.skills || "");
        const matchesSkill = filterSkills.some((s) =>
          appSkills.some((ask) => isSkillMatch(s.name, ask)) || isSkillMatch(s.name, app.skills || "")
        );
        if (!matchesSkill) return false;
      }

      // 9. Qualifications (ItemWithExp)
      if (filterQualifications.length > 0) {
        const appQuals = parseCompetencyDisplayTags(app.qualifications || "");
        const matchesQual = filterQualifications.some((q) =>
          appQuals.some((aq) => isSkillMatch(q.name, aq)) || isSkillMatch(q.name, app.qualifications || "")
        );
        if (!matchesQual) return false;
      }

      // 10. Certifications (ItemWithExp)
      if (filterCertifications.length > 0) {
        const appCerts = parseCompetencyDisplayTags(app.certifications || "");
        const matchesCert = filterCertifications.some((c) =>
          appCerts.some((ac) => isSkillMatch(c.name, ac)) || isSkillMatch(c.name, app.certifications || "")
        );
        if (!matchesCert) return false;
      }

      return true;
    });

    if (sortBy === "Rating") {
      return [...list].sort((a, b) => Number((b as any).rating || 0) - Number((a as any).rating || 0));
    }
    if (sortBy === "Newest") {
      return [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    // Default "Best Match" (neutral selected filter): Sort by match percentage descending (highest match % first)
    const matchScoreMap = new Map<number, number>();
    list.forEach((app) => {
      matchScoreMap.set(app.id, getMatchPercent(app, undefined, allJobsMap));
    });

    return [...list].sort((a, b) => {
      const scoreA = matchScoreMap.get(a.id) ?? 0;
      const scoreB = matchScoreMap.get(b.id) ?? 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return (b.id || 0) - (a.id || 0);
    });
  }, [
    applications,
    appliedSearchQuery,
    jobFilter,
    selectedProvince,
    selectedCity,
    selectedExperience,
    arrangementFilter,
    selectedMinSalary,
    selectedMaxSalary,
    filterSkills,
    filterQualifications,
    filterCertifications,
    sortBy,
    allJobsMap,
  ]);

  const filteredInvitations = useMemo(() => {
    return directInvitations.filter((inv) => {
      if (invitationFilter === "all") return true;
      return (inv.status || "pending").toLowerCase() === invitationFilter;
    });
  }, [directInvitations, invitationFilter]);

  // Table Pagination (10 candidates per page)
  const [currentPage, setCurrentPage] = useState(1);
  const APPLICANTS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    appliedSearchQuery,
    jobFilter,
    selectedProvince,
    selectedCity,
    selectedExperience,
    arrangementFilter,
    statusFilter,
    selectedMinSalary,
    selectedMaxSalary,
    filterSkills,
    filterQualifications,
    filterCertifications,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / APPLICANTS_PER_PAGE));

  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * APPLICANTS_PER_PAGE;
    return filteredApplications.slice(start, start + APPLICANTS_PER_PAGE);
  }, [filteredApplications, currentPage]);

  const boardApplications = useMemo(() => {
    if (boardJobFilter === "all" || !boardJobFilter) {
      return [];
    }
    const list = applications.filter(
      (a) =>
        String(a.job_post_id) === String(boardJobFilter) ||
        (a.job_title || "").toLowerCase() === boardJobFilter.toLowerCase()
    );
    return [...list].sort((a, b) => {
      const matchA = getMatchPercent(a, undefined, allJobsMap);
      const matchB = getMatchPercent(b, undefined, allJobsMap);
      if (matchB !== matchA) return matchB - matchA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [applications, boardJobFilter, allJobsMap]);

  const jobGroups = useMemo(() => {
    const jobMap = new Map<
      string,
      {
        id: string;
        title: string;
        location?: string;
        workArrangement?: string;
        salaryMin?: number;
        salaryMax?: number;
      }
    >();

    // 1. Gather from applications
    applications.forEach((app) => {
      if (app.job_post_id) {
        const key = String(app.job_post_id);
        if (!jobMap.has(key)) {
          jobMap.set(key, {
            id: key,
            title: app.job_title || "Untitled Job",
            location: app.job_location || undefined,
            workArrangement: app.job_work_arrangement || undefined,
            salaryMin: app.job_salary_min,
            salaryMax: app.job_salary_max,
          });
        }
      }
    });

    // 2. Merge from allJobsMap
    Object.values(allJobsMap).forEach((j: any) => {
      if (j.id) {
        const key = String(j.id);
        const existing = jobMap.get(key);
        jobMap.set(key, {
          id: key,
          title: j.title || existing?.title || "Untitled Job",
          location: j.location || existing?.location || undefined,
          workArrangement: j.work_arrangement || existing?.workArrangement || undefined,
          salaryMin: j.salary_min ?? existing?.salaryMin,
          salaryMax: j.salary_max ?? existing?.salaryMax,
        });
      }
    });

    const groups: {
      id: string;
      title: string;
      location?: string;
      workArrangement?: string;
      salaryMin?: number;
      salaryMax?: number;
      applicants: Application[];
      totalApplicants: number;
    }[] = [];

    const assignedAppIds = new Set<number>();

    jobMap.forEach((jobInfo, jobId) => {
      if (
        jobFilter !== "all" &&
        String(jobFilter) !== jobId &&
        jobInfo.title.toLowerCase() !== jobFilter.toLowerCase()
      ) {
        return;
      }

      const jobApplicants = filteredApplications.filter((app) => {
        const match =
          String(app.job_post_id) === jobId ||
          (app.job_title || "").toLowerCase() === jobInfo.title.toLowerCase();
        if (match) assignedAppIds.add(app.id);
        return match;
      });

      const totalForJob = applications.filter(
        (app) =>
          String(app.job_post_id) === jobId ||
          (app.job_title || "").toLowerCase() === jobInfo.title.toLowerCase()
      ).length;

      if (
        totalForJob > 0 ||
        jobApplicants.length > 0 ||
        (activeFilterCount === 0 && !appliedSearchQuery)
      ) {
        groups.push({
          ...jobInfo,
          applicants: jobApplicants,
          totalApplicants: totalForJob,
        });
      }
    });

    const leftover = filteredApplications.filter((app) => !assignedAppIds.has(app.id));
    if (leftover.length > 0) {
      groups.push({
        id: "other",
        title: "Other Applications",
        applicants: leftover,
        totalApplicants: leftover.length,
      });
    }

    return groups;
  }, [applications, filteredApplications, allJobsMap, jobFilter, activeFilterCount, appliedSearchQuery]);

  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (jobFilter !== "all") {
      setExpandedJobIds((prev) => new Set(prev).add(String(jobFilter)));
    }
  }, [jobFilter]);

  const toggleJobAccordion = (jobId: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedJobIds(new Set(jobGroups.map((g) => g.id)));
  };

  const handleCollapseAll = () => {
    setExpandedJobIds(new Set());
  };

  const toggleJobAll = (jobApplicants: Application[]) => {
    const unfinalized = jobApplicants.filter((a) => !isFinalizedStatus(a.status));
    if (unfinalized.length === 0) return;
    const allInJobSelected = unfinalized.every((a) => selectedIds.has(a.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allInJobSelected) {
        unfinalized.forEach((a) => next.delete(a.id));
      } else {
        unfinalized.forEach((a) => next.add(a.id));
      }
      return next;
    });
  };

  const formatJobSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    const fmt = (n: number) => `PHP ${n.toLocaleString("en-US")}`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    if (max) return `Up to ${fmt(max)}`;
    return null;
  };

  const parseJobLocationsList = (locStr?: string | null): string[] => {
    if (!locStr || !locStr.trim()) return [];
    const trimmed = locStr.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {}

    const parenLocations: string[] = [];
    const regex = /([^)]+\))\s*(?:,\s*|$)/g;
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
      if (match[1].trim()) parenLocations.push(match[1].trim());
    }
    if (parenLocations.length > 1) {
      return parenLocations;
    }

    if (trimmed.includes(";")) return trimmed.split(";").map((s) => s.trim()).filter(Boolean);
    if (trimmed.includes("|")) return trimmed.split("|").map((s) => s.trim()).filter(Boolean);
    if (trimmed.includes("\n")) return trimmed.split("\n").map((s) => s.trim()).filter(Boolean);

    if (parenLocations.length === 1) {
      return parenLocations;
    }

    return [trimmed];
  };

  const scrollToScreening = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveScreeningSection("applicant-screening");
    setStatusFilter("all");
    window.location.hash = "applicant-screening";
    const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToShortlistBoard = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveScreeningSection("shortlisted-candidates");
    window.location.hash = "shortlisted-candidates";
    const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToDirectInvitations = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveScreeningSection("direct-invitations");
    window.location.hash = "direct-invitations";
    const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const updateFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "shortlisted-candidates" || hash === "applicant-shortlist-board") {
        setActiveScreeningSection("shortlisted-candidates");
        const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
      } else if (hash === "direct-invitations") {
        setActiveScreeningSection("direct-invitations");
        const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
      } else if (hash === "applicant-screening" || hash === "applicant-screening-section") {
        setActiveScreeningSection("applicant-screening");
        const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);

    return () => {
      window.removeEventListener("hashchange", updateFromHash);
    };
  }, []);

  const handleUpdateStatus = async (appId: number, newStatus: string) => {
    setApplications((prev) =>
      prev.map((item) => (item.id === appId ? { ...item, status: newStatus } : item))
    );
    setReviewModalApp((prev) =>
      prev && prev.id === appId ? { ...prev, status: newStatus } : prev
    );
    try {
      const response = await fetch(`/api/applications/${appId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        fetchApplications();
      }
    } catch (err) {
      console.error("Failed to update status", err);
      fetchApplications();
    }
  };

  const triggerLockedDecisionWarning = (app: Application) => {
    const finalLabel = isApprovedStatus(app.status) ? "Accepted" : "Denied";
    setWarningPopup(
      `This application for ${app.applicant_name} has already been finalized as "${finalLabel}". Application decisions can only be set once and cannot be modified.`
    );
  };

  const handleInitiateMultiStatusChange = (apps: Application[], action: "approved" | "denied") => {
    const unfinalized = apps.filter((a) => !isFinalizedStatus(a.status));
    if (unfinalized.length === 0) {
      if (apps.length > 0) triggerLockedDecisionWarning(apps[0]);
      return;
    }

    const firstApp = unfinalized[0];
    const initialTemplate = getAutomatedDecisionTemplate(
      action,
      unfinalized.length === 1 ? firstApp.applicant_name : "[Candidate Name]",
      unfinalized.length === 1 ? (firstApp.job_title || "Job Position") : (firstApp.job_title || "Job Position"),
      companyLabel || "Employer",
      customDecisionTemplates
    );

    setDecisionModalApps(unfinalized);
    setDecisionModalAction(action);
    setDecisionMessageType("automated");
    setDecisionMessageText(initialTemplate);
    setManualMessageText("");
  };

  const handleInitiateStatusChange = (app: Application, targetStatus: string) => {
    if (isFinalizedStatus(app.status)) {
      triggerLockedDecisionWarning(app);
      return;
    }

    const s = (targetStatus || "").toLowerCase();
    if (s === "approved" || s === "accepted" || s === "denied" || s === "rejected") {
      const action: "approved" | "denied" = (s === "approved" || s === "accepted") ? "approved" : "denied";
      handleInitiateMultiStatusChange([app], action);
      return;
    }

    handleUpdateStatus(app.id, targetStatus);
  };

  const handleConfirmDecision = async () => {
    if (decisionModalApps.length === 0 || !decisionModalAction) return;

    setIsDecisionSubmitting(true);

    try {
      const results = await Promise.all(
        decisionModalApps.map(async (app) => {
          const finalMessageText =
            decisionMessageType === "automated"
              ? getAutomatedDecisionTemplate(
                  decisionModalAction,
                  app.applicant_name,
                  app.job_title || "Job Position",
                  companyLabel || "Employer",
                  customDecisionTemplates
                )
              : manualMessageText.trim();

          const res = await fetch(`/api/applications/${app.id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: decisionModalAction,
              message_type: decisionMessageType,
              message_text: finalMessageText,
            }),
          });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, appId: app.id, data };
        })
      );

      const succeeded = results.filter((r) => r.ok);
      const succeededIds = new Set(succeeded.map((r) => r.appId));

      if (succeeded.length === 0) {
        const firstError = results[0]?.data?.message || "Failed to finalize decision.";
        setWarningPopup(firstError);
        setIsDecisionSubmitting(false);
        return;
      }

      setApplications((prev) =>
        prev.map((item) =>
          succeededIds.has(item.id) ? { ...item, status: decisionModalAction } : item
        )
      );

      if (reviewModalApp && succeededIds.has(reviewModalApp.id)) {
        setReviewModalApp((prev) => (prev ? { ...prev, status: decisionModalAction } : null));
      }

      setStagedDecisions((prev) => {
        const next = { ...prev };
        succeededIds.forEach((id) => delete next[id]);
        return next;
      });

      setDecisionModalApps([]);
      setDecisionModalAction(null);
      fetchApplications();
    } catch (err) {
      console.error("Decision error:", err);
      setWarningPopup("A network error occurred while submitting the decision. Please try again.");
    } finally {
      setIsDecisionSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const rawId = e.dataTransfer.getData("text/plain");
    const appId = rawId ? parseInt(rawId, 10) : draggedAppId;
    if (appId) {
      const targetApp = applications.find((a) => a.id === appId);
      if (targetApp) {
        if (isFinalizedStatus(targetApp.status)) {
          triggerLockedDecisionWarning(targetApp);
        } else {
          const s = (targetStatus || "").toLowerCase();
          if (s === "approved" || s === "accepted") {
            setStagedDecisions((prev) => ({ ...prev, [appId]: "approved" }));
            setSelectedAppId(appId);
          } else if (s === "denied" || s === "rejected") {
            setStagedDecisions((prev) => ({ ...prev, [appId]: "denied" }));
            setSelectedAppId(appId);
          } else if (s === "shortlisted") {
            setStagedDecisions((prev) => {
              const next = { ...prev };
              delete next[appId];
              return next;
            });
            setSelectedAppId(appId);
            if (targetApp.status?.toLowerCase() !== "shortlisted") {
              handleUpdateStatus(appId, "shortlisted");
            }
          }
        }
      }
    }
    setDraggedAppId(null);
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    const s = (newStatus || "").toLowerCase();
    if (s === "approved" || s === "accepted" || s === "rejected" || s === "denied") {
      setWarningPopup(
        "Application decisions (Acceptance or Denial) are permanent and require choosing an Automated or Manual message for each candidate. Please review and decide candidates individually."
      );
      return;
    }
    const ids = Array.from(selectedIds);
    try {
      const response = await fetch("/api/applications/bulk-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: newStatus }),
      });
      if (response.ok) {
        setSelectedIds(new Set());
        fetchApplications();
      } else {
        const data = await response.json();
        setWarningPopup(data.message || "Unable to update applications.");
      }
    } catch (err) {
      console.error("Failed to perform bulk status change", err);
    }
  };

  const unfinalizedApplicationsOnPage = useMemo(() => {
    return filteredApplications.filter((a) => !isFinalizedStatus(a.status));
  }, [filteredApplications]);

  const allSelected =
    unfinalizedApplicationsOnPage.length > 0 &&
    unfinalizedApplicationsOnPage.every((a) => selectedIds.has(a.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        unfinalizedApplicationsOnPage.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        unfinalizedApplicationsOnPage.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="appdash-page employer-page sidebar-visible">
      <aside className="appdash-sidebar" aria-label="Employer Navigation">
        <a href="/" className="appdash-brand"><strong>EliteCruit</strong><span>Employer Workspace</span></a>

        <div className="employer-links-wrap">
          <ul className="appdash-secondary-list">
            <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
            <li className="employer-screening-item active">
              <a
                href="/employer-applicant-management"
                className="employer-screening-title active"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest(".title-caret-btn")) {
                    e.preventDefault();
                    setIsScreeningOpen((prev) => !prev);
                  } else {
                    scrollToScreening();
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
                  <li className={activeScreeningSection === "applicant-screening" ? "active" : ""}>
                    <a
                      href="#applicant-screening"
                      onClick={scrollToScreening}
                    >
                      <span className="item-icon"><EmployerIcon name="screening" /></span>
                      <span>Applicant Screening</span>
                    </a>
                  </li>
                  <li className={activeScreeningSection === "shortlisted-candidates" ? "active" : ""}>
                    <a
                      href="#applicant-shortlist-board"
                      onClick={scrollToShortlistBoard}
                    >
                      <span className="item-icon"><EmployerIcon name="shortlisted" /></span>
                      <span>Shortlisted Candidates</span>
                    </a>
                  </li>
                  <li className={activeScreeningSection === "direct-invitations" ? "active" : ""}>
                    <a
                      href="#direct-invitations"
                      onClick={scrollToDirectInvitations}
                    >
                      <span className="item-icon"><EmployerIcon name="discovery" /></span>
                      <span>Recruitment List</span>
                    </a>
                  </li>
                </ul>
              )}
            </li>
            <li><a href="/employer-applicant-finder"><span className="item-icon"><EmployerIcon name="nearby" /></span><span>Applicant Finder</span></a></li>
            <li><a href="/employer-notices-faqs"><span className="item-icon"><EmployerIcon name="faq" /></span><span>Notices & FAQs</span></a></li>
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
              <a href="/settings"><SideIcon name="settings" />Settings</a>
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

      <main ref={mainRef} className="appdash-main applicant-mgmt-main screening-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Applicant Management</strong></div></div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Applicant Management"
                customFaqs={applicantMgmtFaqs}
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        {/* 3-STEP PILL TAB NAVIGATION BAR */}
        <nav className="company-section-nav applicant-mgmt-section-nav" aria-label="Applicant Management Sections">
          <button
            type="button"
            className={`section-nav-btn ${activeScreeningSection === "applicant-screening" ? "active" : ""}`}
            onClick={scrollToScreening}
          >
            <span className="nav-num">1</span>
            <span>Applicant Screening</span>
          </button>
          <button
            type="button"
            className={`section-nav-btn ${activeScreeningSection === "shortlisted-candidates" ? "active" : ""}`}
            onClick={scrollToShortlistBoard}
          >
            <span className="nav-num">2</span>
            <span>Shortlisted Candidates</span>
          </button>
          <button
            type="button"
            className={`section-nav-btn ${activeScreeningSection === "direct-invitations" ? "active" : ""}`}
            onClick={scrollToDirectInvitations}
          >
            <span className="nav-num">3</span>
            <span>Recruitment List</span>
          </button>
        </nav>

        {activeScreeningSection === "applicant-screening" && (
          <>
        {/* SEARCH BAR CARD - MATCHES APPLICANT FINDER */}
        <section className="applicant-mgmt-filters search-bar-card card" style={{ width: "auto", margin: "0 14px 0", padding: "12px 16px", boxSizing: "border-box", overflow: "hidden" }}>
          <div className="search-input-row" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", width: "100%", boxSizing: "border-box" }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value;
                setSearchInput(val);
                setAppliedSearchQuery(val.trim().toLowerCase());
              }}
              placeholder="Search candidates by name, job role, skills, or city..."
              style={{ flex: "1 1 180px", minWidth: "150px", boxSizing: "border-box" }}
            />
            <button
              type="button"
              className={`filter-toggle-btn ${isFiltersOpen ? "active" : ""}`}
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              style={{ flexShrink: 0 }}
            >
              <FinderIcon name="filters" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="filter-badge-count">{activeFilterCount}</span>
              )}
              <ChevronIcon direction={isFiltersOpen ? "up" : "down"} />
            </button>
            <button
              type="button"
              className="bulk-shortlist-btn"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkStatusChange("shortlisted")}
              title={selectedIds.size > 0 ? `Shortlist ${selectedIds.size} selected` : "Select applicants to shortlist"}
              style={{ flexShrink: 0, width: "auto", minWidth: "120px", padding: "8px 12px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            >
              Shortlist Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </button>
            <button
              type="button"
              className="bulk-reject-btn"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkStatusChange("rejected")}
              title={selectedIds.size > 0 ? `Reject ${selectedIds.size} selected` : "Select applicants to reject"}
              style={{ flexShrink: 0, width: "auto", minWidth: "120px", padding: "8px 12px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            >
              Reject Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </button>
          </div>

          {isFiltersOpen && (
            <div className="search-filters-dropdown">
              <div className="filters-grid">

                <div className="filter-field">
                  <label>Province</label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      const newProv = e.target.value;
                      setSelectedProvince(newProv);
                      setSelectedCity("All Cities");
                    }}
                  >
                    <option>All Provinces</option>
                    {Object.keys(PHILIPPINES_PROVINCE_CITIES_MAP).map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>City / Municipality</label>
                  <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                    <option>All Cities</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Min Salary (PHP)</label>
                  <div className="filter-input-wrapper">
                    <input
                      type="text"
                      inputMode="decimal"
                      className={salaryError ? "input-field-error" : ""}
                      placeholder="e.g. 10000.00"
                      value={formatSalaryDisplay(selectedMinSalary, isMinFocused)}
                      onFocus={() => setIsMinFocused(true)}
                      onBlur={handleMinBlur}
                      onChange={(e) => {
                        setSelectedMinSalary(cleanDecimalInput(e.target.value));
                      }}
                      onKeyDown={(e) => {
                        if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                        if (e.key === "." && selectedMinSalary.includes(".")) e.preventDefault();
                      }}
                    />
                    {salaryError && (
                      <div className="input-warning-icon-wrap">
                        <svg
                          className="input-warning-icon"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 2L1 21h22L12 2zm0 3.99L20.53 19H3.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z" />
                        </svg>
                        <span className="input-warning-tooltip">
                          Min salary cannot be greater than max salary
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="filter-field">
                  <label>Max Salary (PHP)</label>
                  <div className="filter-input-wrapper">
                    <input
                      type="text"
                      inputMode="decimal"
                      className={salaryError ? "input-field-error" : ""}
                      placeholder="e.g. 50000.00"
                      value={formatSalaryDisplay(selectedMaxSalary, isMaxFocused)}
                      onFocus={() => setIsMaxFocused(true)}
                      onBlur={handleMaxBlur}
                      onChange={(e) => {
                        setSelectedMaxSalary(cleanDecimalInput(e.target.value));
                      }}
                      onKeyDown={(e) => {
                        if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                        if (e.key === "." && selectedMaxSalary.includes(".")) e.preventDefault();
                      }}
                    />
                    {salaryError && (
                      <div className="input-warning-icon-wrap">
                        <svg
                          className="input-warning-icon"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 2L1 21h22L12 2zm0 3.99L20.53 19H3.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z" />
                        </svg>
                        <span className="input-warning-tooltip">
                          Max salary cannot be less than min salary
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="filter-field">
                  <label>Work Arrangement</label>
                  <select value={arrangementFilter} onChange={(e) => setArrangementFilter(e.target.value)}>
                    <option value="all">Any Arrangement</option>
                    {WORK_ARRANGEMENTS.map((wa) => (
                      <option key={wa.toLowerCase()} value={wa.toLowerCase()}>{wa}</option>
                    ))}
                  </select>
                </div>


                <div className="filter-field">
                  <label>Experience Level</label>
                  <select value={selectedExperience} onChange={(e) => setSelectedExperience(e.target.value)}>
                    <option>Any Experience</option>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Sort By</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                    <option value="Best Match">Best Match</option>
                    <option value="Rating">Highest Rating</option>
                    <option value="Newest">Newest Applicants</option>
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
                    <span>Showing all applicant results</span>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button type="button" className="reset-filters-btn" onClick={clearAllFilters}>
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <section id="applicant-screening" className="applicant-mgmt-table accordions-card">
          {isLoading ? (
            <div className="card" style={{ padding: "24px", color: "#607b96", fontSize: "0.88rem" }}>
              Loading applications…
            </div>
          ) : error ? (
            <div className="card" style={{ padding: "24px", color: "#c53030", fontSize: "0.88rem" }}>
              {error}
            </div>
          ) : jobGroups.length === 0 ? (
            <div className="card" style={{ padding: "24px", color: "#607b96", fontSize: "0.88rem" }}>
              No applications found{appliedSearchQuery || activeFilterCount > 0 ? " matching your filters." : " yet. Applicants who apply to your job posts will appear here."}
            </div>
          ) : (
            <div className="job-accordions-container">
              {/* Accordions Toolbar */}
              <div className="job-accordions-toolbar">
                <div className="job-accordions-summary">
                  <strong>Applicant Pools by Job Posting</strong>
                  <span className="job-accordions-summary-divider">•</span>
                  <span>{jobGroups.length} {jobGroups.length === 1 ? "Job Position" : "Job Positions"}</span>
                  <span className="job-accordions-summary-divider">•</span>
                  <span>{filteredApplications.length} {filteredApplications.length === 1 ? "Candidate" : "Candidates"}</span>
                </div>

                <div className="job-accordions-controls">
                  <button
                    type="button"
                    className="accordion-ctrl-btn"
                    onClick={handleExpandAll}
                    title="Expand all job sections"
                  >
                    <span>▼ Expand All</span>
                  </button>

                  <button
                    type="button"
                    className="accordion-ctrl-btn"
                    onClick={handleCollapseAll}
                    title="Collapse all job sections"
                  >
                    <span>▲ Collapse All</span>
                  </button>
                </div>
              </div>

              {/* Accordion Cards */}
              {jobGroups.map((jobGroup) => {
                const isExpanded = expandedJobIds.has(jobGroup.id);
                const unfinalized = jobGroup.applicants.filter((a) => !isFinalizedStatus(a.status));
                const isJobAllSelected = unfinalized.length > 0 && unfinalized.every((a) => selectedIds.has(a.id));

                const pendingCount = jobGroup.applicants.filter((a) => {
                  const s = (a.status || "").toLowerCase();
                  return s === "pending" || s === "submitted";
                }).length;

                const locations = parseJobLocationsList(jobGroup.location);
                const salaryText = formatJobSalary(jobGroup.salaryMin, jobGroup.salaryMax);

                return (
                  <div
                    key={jobGroup.id}
                    className={`job-accordion-card ${isExpanded ? "is-expanded" : ""}`}
                  >
                    <div
                      className="job-accordion-header"
                      onClick={() => toggleJobAccordion(jobGroup.id)}
                    >
                      <div className="job-accordion-header-left">
                        <span className="accordion-chevron-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>

                        <div className="job-title-and-meta">
                          <h3 className="job-accordion-title">
                            {jobGroup.title}
                          </h3>
                          <div className="job-accordion-meta-pills">
                            {locations.length > 0 && (
                              <span
                                className="job-meta-pill location-pill"
                                title={locations.length > 1 ? locations.join(" • ") : locations[0]}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="13"
                                  height="13"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ flexShrink: 0, color: "#be123c" }}
                                >
                                  <path d="M12 21s-7-4.35-7-10a7 7 0 1 1 14 0c0 5.65-7 10-7 10z" />
                                  <circle cx="12" cy="11" r="2.5" />
                                </svg>
                                <span>
                                  {locations.length >= 2
                                    ? `${locations.length} Locations`
                                    : locations[0]}
                                </span>
                              </span>
                            )}
                            {jobGroup.workArrangement && (
                              <span className="job-meta-pill setup-pill">
                                <svg
                                  viewBox="0 0 24 24"
                                  width="12"
                                  height="12"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ flexShrink: 0, color: "#0369a1" }}
                                >
                                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                </svg>
                                <span>{jobGroup.workArrangement}</span>
                              </span>
                            )}
                            {salaryText && (
                              <span className="job-meta-pill salary-pill">
                                <svg
                                  viewBox="0 0 24 24"
                                  width="13"
                                  height="13"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ flexShrink: 0, color: "#047857" }}
                                >
                                  <rect x="2" y="6" width="20" height="12" rx="2" />
                                  <circle cx="12" cy="12" r="2.5" />
                                  <path d="M6 12h.01M18 12h.01" />
                                </svg>
                                <span>{salaryText}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="job-accordion-header-right" onClick={(e) => e.stopPropagation()}>
                        <div className="status-mini-pills">
                          {pendingCount > 0 && (
                            <span className="status-mini-pill pending" title={`${pendingCount} Pending Review`}>
                              <svg
                                viewBox="0 0 24 24"
                                width="12"
                                height="12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ flexShrink: 0, color: "#b45309" }}
                              >
                                <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                              </svg>
                              <span>{pendingCount} Pending</span>
                            </span>
                          )}
                        </div>

                        <span
                          className={`applicant-count-badge ${jobGroup.applicants.length === 0 ? "zero-count" : ""}`}
                          onClick={() => toggleJobAccordion(jobGroup.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="13"
                            height="13"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0, color: "#1d4ed8" }}
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <strong>{jobGroup.applicants.length}</strong> {jobGroup.applicants.length === 1 ? "Candidate" : "Candidates"}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="job-accordion-body">
                        {jobGroup.applicants.length === 0 ? (
                          <div className="job-accordion-empty">
                            No candidates {activeFilterCount > 0 || appliedSearchQuery ? "match your current filters for this position." : "have applied to this job post yet."}
                          </div>
                        ) : (
                          <table className="job-accordion-table">
                            <colgroup>
                              <col style={{ width: "44px" }} />
                              <col style={{ width: "32%" }} />
                              <col style={{ width: "16%" }} />
                              <col style={{ width: "18%" }} />
                              <col style={{ width: "34%", minWidth: "220px" }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th style={{ width: "44px", textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    aria-label={`Select all candidates for ${jobGroup.title}`}
                                    checked={isJobAllSelected}
                                    onChange={() => toggleJobAll(jobGroup.applicants)}
                                  />
                                </th>
                                <th>Name</th>
                                <th className="date-header">Applied Date</th>
                                <th className="match-header">Match</th>
                                <th className="actions-header">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobGroup.applicants.map((app) => (
                                <tr
                                  key={app.id}
                                  draggable={!isFinalizedStatus(app.status)}
                                  onDragStart={(e) => {
                                    if (isFinalizedStatus(app.status)) return;
                                    handleDragStart(e, app.id);
                                  }}
                                  onDragEnd={handleDragEnd}
                                  className={`${selectedIds.has(app.id) ? "row-selected" : ""} ${isFinalizedStatus(app.status) ? "row-finalized" : ""}`}
                                >
                                  <td style={{ textAlign: "center" }}>
                                    <input
                                      type="checkbox"
                                      aria-label="select row"
                                      checked={selectedIds.has(app.id)}
                                      disabled={isFinalizedStatus(app.status)}
                                      onChange={() => {
                                        if (isFinalizedStatus(app.status)) {
                                          triggerLockedDecisionWarning(app);
                                          return;
                                        }
                                        toggleOne(app.id);
                                      }}
                                      title={isFinalizedStatus(app.status) ? "Application decision already finalized" : undefined}
                                    />
                                  </td>
                                  <td>
                                    <div className="applicant-name">
                                      {(() => {
                                        const picUrl = app.profile_picture_path
                                          ? (app.profile_picture_path.startsWith("http") || app.profile_picture_path.startsWith("/api")
                                              ? app.profile_picture_path
                                              : `/api/applicants/${app.applicant_user_id}/profile-picture`)
                                          : null;
                                        return (
                                          <span className="pill" style={{ overflow: "hidden", position: "relative" }}>
                                            {picUrl && (
                                              <img
                                                src={picUrl}
                                                alt={app.applicant_name}
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                onError={(e) => {
                                                  (e.currentTarget as HTMLElement).style.display = "none";
                                                  if (e.currentTarget.nextElementSibling) {
                                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                                                  }
                                                }}
                                              />
                                            )}
                                            <span style={{ display: picUrl ? "none" : "inline" }}>
                                              {initialsFrom(app.applicant_name)}
                                            </span>
                                          </span>
                                        );
                                      })()}
                                      <div>
                                        <strong>{app.applicant_name}</strong>
                                        {app.city && <small>{app.city}</small>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="date-cell">
                                    <span className="applied-date-chip">{formatDate(app.submitted_at)}</span>
                                  </td>
                                  <td className="match-cell">
                                    {(() => {
                                      const percent = calculateAppMatch(app);
                                      const style = getMatchPercentStyle(percent);
                                      return (
                                        <div className="match-display-wrap" title={`Match: ${percent}%`}>
                                          <span className="match-percent-val" style={{ color: style.color }}>
                                            {percent}%
                                          </span>
                                          <div className="match-bar-track" style={{ backgroundColor: style.track }}>
                                            <div
                                              className="match-bar-fill"
                                              style={{ width: `${percent}%`, backgroundColor: style.fill }}
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            className="match-breakdown-cell-btn"
                                            onClick={() => handleOpenReview(app, false, false, true)}
                                            title="View match breakdown"
                                          >
                                            Match Breakdown
                                          </button>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="actions-cell">
                                    <div className="actions">
                                      <button
                                        type="button"
                                        title="Message Applicant"
                                        aria-label="Message"
                                        className="action-btn message-btn-icon"
                                        onClick={() => { window.location.href = "/messages"; }}
                                      >
                                        <RowActionIcon name="message" />
                                      </button>

                                      <button
                                        type="button"
                                        title="Review Candidate"
                                        aria-label="Review"
                                        className="action-btn review-btn-icon"
                                        onClick={() => handleOpenReview(app)}
                                      >
                                        <RowActionIcon name="review" />
                                      </button>

                                      {(() => {
                                        const isShortlisted = app.status?.toLowerCase() === "shortlisted";
                                        const isApproved = isApprovedStatus(app.status);
                                        const isDenied = isDeniedStatus(app.status);
                                        const isFinalized = isFinalizedStatus(app.status);

                                        if (isFinalized) {
                                          return (
                                            <button
                                              type="button"
                                              className={`merged-status-btn ${isApproved ? "approved" : "denied"}`}
                                              title={`Application decision finalized as ${isApproved ? "Approved" : "Denied"} (cannot be modified)`}
                                              onClick={() => triggerLockedDecisionWarning(app)}
                                            >
                                              {isApproved ? "Approved" : "Denied"}
                                            </button>
                                          );
                                        }

                                        return (
                                          <div className="status-actions-trio" role="group" aria-label="Status actions">
                                            <button
                                              type="button"
                                              className={`action-btn shortlist-action-btn shortlist-btn-icon ${isShortlisted ? "active-shortlisted active" : ""}`}
                                              title={isShortlisted ? "Shortlisted (click to un-shortlist)" : "Shortlist candidate"}
                                              aria-label="Shortlist candidate"
                                              onClick={() => handleInitiateStatusChange(app, isShortlisted ? "pending" : "shortlisted")}
                                            >
                                              <RowActionIcon name="shortlist" />
                                            </button>

                                            <button
                                              type="button"
                                              className="action-btn approve-action-btn approve-btn-icon"
                                              title="Approve candidate"
                                              aria-label="Approve candidate"
                                              onClick={() => handleInitiateStatusChange(app, "approved")}
                                            >
                                              <RowActionIcon name="approve" />
                                            </button>

                                            <button
                                              type="button"
                                              className="action-btn reject-action-btn reject-btn-icon"
                                              title="Deny candidate"
                                              aria-label="Deny candidate"
                                              onClick={() => handleInitiateStatusChange(app, "denied")}
                                            >
                                              <RowActionIcon name="reject" />
                                            </button>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
          </>
        )}

        {/* APPLICANT SHORTLIST BOARD BELOW TABLE */}
        {activeScreeningSection === "shortlisted-candidates" && (
          <section id="applicant-shortlist-board" className="screening-board screening-card" style={{ margin: "0 14px 24px" }}>
          <div className="board-head">
            <div className="board-head-info">
              <h2>Applicant Shortlist Board</h2>
              <p>Manage shortlisted candidates through approval and denial stages, and preview selected applicant details.</p>
            </div>
            <div className="board-head-controls">
              <select
                className="board-job-select"
                value={boardJobFilter}
                onChange={(e) => {
                  setBoardJobFilter(e.target.value);
                  setSelectedAppId(null);
                }}
              >
                <option value="all">Select Job Postings</option>
                {uniqueJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
              <span className="board-total-count-pill">
                {boardApplications.length} candidate{boardApplications.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="board-grid">
            {(() => {
              const shortlistApps = boardApplications.filter(
                (a) => a.status?.toLowerCase() === "shortlisted" && !stagedDecisions[a.id]
              );
              const approvedApps = boardApplications.filter(
                (a) => isApprovedStatus(a.status) || stagedDecisions[a.id] === "approved"
              );
              const deniedApps = boardApplications.filter(
                (a) => isDeniedStatus(a.status) || stagedDecisions[a.id] === "denied"
              );
              const finalizedApprovedApps = boardApplications.filter((a) => isApprovedStatus(a.status));
              const finalizedDeniedApps = boardApplications.filter((a) => isDeniedStatus(a.status));
              const stagedApprovedApps = boardApplications.filter(
                (a) => stagedDecisions[a.id] === "approved" && !isFinalizedStatus(a.status)
              );
              const stagedDeniedApps = boardApplications.filter(
                (a) => stagedDecisions[a.id] === "denied" && !isFinalizedStatus(a.status)
              );

              return (
                <div className="stage-wrap">
                  {/* Shortlist Stage Column */}
                  <div
                    className={`stage ${dragOverStage === "shortlisted" ? "drag-over-shortlist" : ""}`}
                    onDragOver={(e) => handleDragOver(e, "shortlisted")}
                    onDragLeave={(e) => handleDragLeave(e, "shortlisted")}
                    onDrop={(e) => handleDrop(e, "shortlisted")}
                  >
                    <header><b>Shortlist</b><span>{shortlistApps.length}</span></header>
                    {shortlistApps.length === 0 ? (
                      <div className="empty drag-target-hint">Drop candidates here</div>
                    ) : (
                      shortlistApps.map(a => {
                        const percent = calculateAppMatch(a);
                        const style = getMatchPercentStyle(percent);
                        return (
                          <div
                            key={a.id}
                              draggable
                            onDragStart={(e) => handleDragStart(e, a.id)}
                            onDragEnd={handleDragEnd}
                            className={`ticket ${selectedAppId === a.id ? "active-ticket" : ""} ${draggedAppId === a.id ? "dragging" : ""}`}
                            onClick={() => setSelectedAppId(a.id)}
                            style={{ cursor: "grab" }}
                            title="Drag to move between Shortlist, Approved, or Denied"
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong>{a.applicant_name}</strong>
                              <span className="ticket-match-badge" style={{ color: style.color }}>{percent}%</span>
                            </div>
                            <small style={{ display: "block", color: "#64748b" }}>{a.job_title}</small>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Approved Stage Column */}
                  <div
                    className={`stage ${dragOverStage === "approved" ? "drag-over-approved" : ""}`}
                    onDragOver={(e) => handleDragOver(e, "approved")}
                    onDragLeave={(e) => handleDragLeave(e, "approved")}
                    onDrop={(e) => handleDrop(e, "approved")}
                  >
                    <header>
                      <b>Approved</b>
                      {stagedApprovedApps.length > 0 ? (
                        <button
                          type="button"
                          className="stage-header-confirm-btn confirm-approve"
                          onClick={() => handleInitiateMultiStatusChange(stagedApprovedApps, "approved")}
                          title={`Confirm Acceptance for ${stagedApprovedApps.length} candidate${stagedApprovedApps.length > 1 ? "s" : ""}`}
                        >
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Confirm {stagedApprovedApps.length > 1 ? `(${stagedApprovedApps.length})` : ""}
                        </button>
                      ) : (
                        <span>{finalizedApprovedApps.length}</span>
                      )}
                    </header>
                    {approvedApps.length === 0 ? (
                      <div className="empty drag-target-hint">Drop candidates here</div>
                    ) : (
                      approvedApps.map(a => {
                        const percent = calculateAppMatch(a);
                        const style = getMatchPercentStyle(percent);
                        const isStaged = stagedDecisions[a.id] === "approved";
                        const isFinalized = isApprovedStatus(a.status);
                        return (
                          <div
                            key={a.id}
                              draggable={isStaged}
                            onDragStart={(e) => isStaged && handleDragStart(e, a.id)}
                            onDragEnd={handleDragEnd}
                            className={`ticket ${isFinalized ? "ticket-finalized" : "ticket-staged ticket-staged-approved"} ${selectedAppId === a.id ? "active-ticket" : ""} ${draggedAppId === a.id ? "dragging" : ""}`}
                            onClick={() => setSelectedAppId(a.id)}
                            onDoubleClick={() => isFinalized && triggerLockedDecisionWarning(a)}
                            style={{ cursor: isStaged ? "grab" : "pointer" }}
                            title={isFinalized ? "Accepted candidate - Finalized decision (cannot be moved)" : "Staged for Approval — Click Confirm in header to finalize decision"}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {isFinalized && (
                                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#059669" style={{ flexShrink: 0 }}>
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                  </svg>
                                )}
                                <strong>{a.applicant_name}</strong>
                              </span>
                              <span className="ticket-match-badge" style={{ color: style.color }}>{percent}%</span>
                            </div>
                            <small style={{ display: "block", color: "#64748b" }}>{a.job_title}</small>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Denied Stage Column */}
                  <div
                    className={`stage ${dragOverStage === "denied" ? "drag-over-denied" : ""}`}
                    onDragOver={(e) => handleDragOver(e, "denied")}
                    onDragLeave={(e) => handleDragLeave(e, "denied")}
                    onDrop={(e) => handleDrop(e, "denied")}
                  >
                    <header>
                      <b>Denied</b>
                      {stagedDeniedApps.length > 0 ? (
                        <button
                          type="button"
                          className="stage-header-confirm-btn confirm-denied"
                          onClick={() => handleInitiateMultiStatusChange(stagedDeniedApps, "denied")}
                          title={`Confirm Denial for ${stagedDeniedApps.length} candidate${stagedDeniedApps.length > 1 ? "s" : ""}`}
                        >
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          Confirm {stagedDeniedApps.length > 1 ? `(${stagedDeniedApps.length})` : ""}
                        </button>
                      ) : (
                        <span>{finalizedDeniedApps.length}</span>
                      )}
                    </header>
                    {deniedApps.length === 0 ? (
                      <div className="empty drag-target-hint">Drop candidates here</div>
                    ) : (
                      deniedApps.map(a => {
                        const percent = calculateAppMatch(a);
                        const style = getMatchPercentStyle(percent);
                        const isStaged = stagedDecisions[a.id] === "denied";
                        const isFinalized = isDeniedStatus(a.status);
                        return (
                          <div
                            key={a.id}
                              draggable={isStaged}
                            onDragStart={(e) => isStaged && handleDragStart(e, a.id)}
                            onDragEnd={handleDragEnd}
                            className={`ticket ${isFinalized ? "ticket-finalized" : "ticket-staged ticket-staged-denied"} ${selectedAppId === a.id ? "active-ticket" : ""} ${draggedAppId === a.id ? "dragging" : ""}`}
                            onClick={() => setSelectedAppId(a.id)}
                            onDoubleClick={() => isFinalized && triggerLockedDecisionWarning(a)}
                            style={{ cursor: isStaged ? "grab" : "pointer" }}
                            title={isFinalized ? "Denied candidate - Finalized decision (cannot be moved)" : "Staged for Denial — Click Confirm in header to finalize decision"}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {isFinalized && (
                                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#dc2626" style={{ flexShrink: 0 }}>
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                  </svg>
                                )}
                                <strong>{a.applicant_name}</strong>
                              </span>
                              <span className="ticket-match-badge" style={{ color: style.color }}>{percent}%</span>
                            </div>
                            <small style={{ display: "block", color: "#64748b" }}>{a.job_title}</small>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const currentApp = selectedAppId
                ? boardApplications.find(a => a.id === selectedAppId) || null
                : null;

              if (!currentApp) {
                return (
                  <aside className="candidate-preview candidate-preview-empty">
                    <div className="preview-empty-state">
                      <div className="preview-empty-icon">
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <h3>No Candidate Selected</h3>
                      <p style={{ margin: 0 }}>Select or click any candidate ticket from Shortlist, Approved, or Denied to view their details.</p>
                    </div>
                  </aside>
                );
              }

              const matchPercent = calculateAppMatch(currentApp);
              const matchStyle = getMatchPercentStyle(matchPercent);
              const matchColorClass = getMatchColorClass(matchPercent);

              return (
                <aside
                  className="candidate-preview"
                  draggable
                  onDragStart={(e) => handleDragStart(e, currentApp.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="preview-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", width: "100%", flexWrap: "wrap", boxSizing: "border-box" }}>
                    <div className="preview-head-left" style={{ flex: "1 1 130px", minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 800, color: "#01294a", wordBreak: "break-word" }}>{currentApp.applicant_name}</h3>
                    </div>
                    <div className="preview-head-badges" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "auto" }}>
                      <div className="preview-rating-badge">
                        <span className="preview-rating-star">★</span>
                        <span className="preview-rating-num">{(currentApp as any).rating ? Number((currentApp as any).rating).toFixed(1) : "0.0"}</span>
                      </div>
                      <div
                        className={`preview-match-badge-box ${matchColorClass}`}
                        style={{
                          borderColor: matchStyle.fill,
                          backgroundColor: matchStyle.track,
                        }}
                      >
                        <span className="preview-match-label" style={{ color: matchStyle.color }}>MATCH</span>
                        <span className="preview-match-num" style={{ color: matchStyle.color }}>{matchPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px", width: "100%", overflow: "hidden" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "#64748b", fontFamily: '"Manrope", sans-serif' }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      {currentApp.city || currentApp.address || "Cavite"}
                    </span>
                    {(currentApp.email || currentApp.phone || (currentApp as any).contact_number) && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "0.78rem", color: "#64748b", fontFamily: '"Manrope", sans-serif', wordBreak: "break-all" }}>
                        {currentApp.email && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", wordBreak: "break-all" }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                            {currentApp.email}
                          </span>
                        )}
                        {currentApp.email && (currentApp.phone || (currentApp as any).contact_number) && (
                          <span style={{ color: "#cbd5e1" }}>•</span>
                        )}
                        {(currentApp.phone || (currentApp as any).contact_number) && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            {currentApp.phone || (currentApp as any).contact_number}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="preview-lists-container">
                    <div className="preview-pill-group">
                      <span className="preview-group-label">SKILLS</span>
                      <div className="preview-pill-wrap">
                        {(() => {
                          const items = parseItemList(currentApp.skills);
                          return items.length > 0 ? (
                            items.map((item, idx) => (
                              <span key={idx} className="preview-pill skill-pill">{item}</span>
                            ))
                          ) : (
                            <span style={{ fontSize: "0.78rem", color: "#64748b", fontStyle: "italic", fontFamily: '"Manrope", sans-serif' }}>
                              No skills listed
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="preview-pill-group">
                      <span className="preview-group-label">QUALIFICATIONS</span>
                      <div className="preview-pill-wrap">
                        {(() => {
                          const items = parseItemList(currentApp.qualifications);
                          return items.length > 0 ? (
                            items.map((item, idx) => (
                              <span key={idx} className="preview-pill quali-pill">{item}</span>
                            ))
                          ) : (
                            <span style={{ fontSize: "0.78rem", color: "#64748b", fontStyle: "italic", fontFamily: '"Manrope", sans-serif' }}>
                              No qualifications listed
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="preview-pill-group">
                      <span className="preview-group-label">CERTIFICATIONS</span>
                      <div className="preview-pill-wrap">
                        {(() => {
                          const items = parseItemList(currentApp.certifications);
                          return items.length > 0 ? (
                            items.map((item, idx) => (
                              <span key={idx} className="preview-pill cert-pill">{item}</span>
                            ))
                          ) : (
                            <span style={{ fontSize: "0.78rem", color: "#64748b", fontStyle: "italic", fontFamily: '"Manrope", sans-serif' }}>
                              No certifications listed
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="preview-actions-bottom">
                    <button
                      type="button"
                      className="solid-btn preview-message-btn view-docs-btn"
                      onClick={() => { window.location.href = "/messages"; }}
                      title="Message Candidate"
                    >
                      Message
                    </button>

                    <button
                      type="button"
                      className="solid-btn preview-breakdown-btn"
                      onClick={() => handleOpenReview(currentApp, false, false, true)}
                      title="View Match Breakdown"
                    >
                      Breakdown
                    </button>

                    {(() => {
                      const isApproved = isApprovedStatus(currentApp.status);
                      const isDenied = isDeniedStatus(currentApp.status);
                      const isFinalized = isFinalizedStatus(currentApp.status);
                      const isShortlisted = currentApp.status?.toLowerCase() === "shortlisted";

                      if (isFinalized) {
                        return (
                          <button
                            type="button"
                            className={`merged-status-btn preview-fused-status-btn ${isApproved ? "approved" : "denied"}`}
                            title={`Application decision finalized as ${isApproved ? "Approved" : "Denied"} (cannot be modified)`}
                            onClick={() => triggerLockedDecisionWarning(currentApp)}
                          >
                            {isApproved ? "Approved" : "Denied"}
                          </button>
                        );
                      }

                      return (
                        <div className="status-actions-trio preview-status-actions-trio" role="group" aria-label="Status actions">
                          <button
                            type="button"
                            className={`action-btn preview-action-btn shortlist-action-btn shortlist-btn-icon ${isShortlisted ? "active-shortlisted active" : ""}`}
                            title={isShortlisted ? "Shortlisted (click to un-shortlist)" : "Shortlist candidate"}
                            aria-label="Shortlist candidate"
                            onClick={() => {
                              handleInitiateStatusChange(currentApp, isShortlisted ? "pending" : "shortlisted");
                            }}
                          >
                            <RowActionIcon name="shortlist" />
                          </button>

                          <button
                            type="button"
                            className="action-btn preview-action-btn approve-action-btn approve-btn-icon"
                            title="Approve candidate"
                            aria-label="Approve candidate"
                            onClick={() => {
                              handleInitiateStatusChange(currentApp, "approved");
                            }}
                          >
                            <RowActionIcon name="approve" />
                          </button>

                          <button
                            type="button"
                            className="action-btn preview-action-btn reject-action-btn reject-btn-icon"
                            title="Deny candidate"
                            aria-label="Deny candidate"
                            onClick={() => {
                              handleInitiateStatusChange(currentApp, "denied");
                            }}
                          >
                            <RowActionIcon name="reject" />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </aside>
              );
            })()}
          </div>
        </section>
        )}

        {/* DIRECT INVITATIONS BOARD */}
        {activeScreeningSection === "direct-invitations" && (
          <section id="direct-invitations" className="applicant-shortlist-board card" style={{ margin: "0 14px 24px", padding: "20px 24px" }}>
          <div className="matches-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.35rem", color: "#01294a" }}>Direct Recruitment Invitations</h2>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.84rem" }}>
                Candidates directly invited from Applicant Finder to apply for active job openings.
              </p>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["all", "accepted", "pending", "declined"] as const).map((filterKey) => {
                const count =
                  filterKey === "all"
                    ? directInvitations.length
                    : directInvitations.filter((inv) => (inv.status || "pending").toLowerCase() === filterKey).length;
                return (
                  <button
                    key={filterKey}
                    type="button"
                    className={`invitation-filter-btn ${invitationFilter === filterKey ? "active" : ""}`}
                    onClick={() => setInvitationFilter(filterKey)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      border: invitationFilter === filterKey ? "1px solid #0284c7" : "1px solid #cbd5e1",
                      background: invitationFilter === filterKey ? "#e0f2fe" : "#f8fafc",
                      color: invitationFilter === filterKey ? "#0369a1" : "#475569",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {filterKey} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredInvitations.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748b" }}>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                {invitationFilter === "all" ? "No direct invitations found." : `No ${invitationFilter} direct invitations found.`}
              </p>
              <a href="/employer-applicant-finder" className="solid-btn" style={{ display: "inline-block", marginTop: "12px", textDecoration: "none", padding: "8px 16px", fontSize: "0.82rem" }}>
                Find Nearby Candidates
              </a>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
              {filteredInvitations.map((inv) => {
                const candidateName = [inv.first_name, inv.last_name].filter(Boolean).join(" ") || inv.applicant_email || "Candidate";
                const status = (inv.status || "pending").toLowerCase();
                const synthApp: Application = {
                  id: inv.id,
                  status: status === "accepted" ? "approved" : status,
                  submitted_at: inv.created_at,
                  job_post_id: inv.job_post_id,
                  job_title: inv.job_title,
                  city: inv.city || "Cavite",
                  applicant_name: candidateName,
                  desired_job_title: inv.desired_job_title || inv.job_title,
                  applicant_user_id: inv.applicant_user_id,
                  skills: inv.skills,
                  qualifications: inv.qualifications,
                };
                return (
                  <article
                    key={inv.id}
                    className="applicant-card"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 20px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "#fff",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: "14px", alignItems: "center", minWidth: "240px", flex: "1 1 auto" }}>
                      {(() => {
                        const picUrl = inv.profile_picture_path
                          ? (inv.profile_picture_path.startsWith("http") || inv.profile_picture_path.startsWith("/api")
                              ? inv.profile_picture_path
                              : `/api/applicants/${inv.applicant_user_id}/profile-picture`)
                          : null;
                        return (
                          <span
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "50%",
                              background: "#e0f2fe",
                              color: "#0369a1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "700",
                              fontSize: "0.92rem",
                              flexShrink: 0,
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            {picUrl && (
                              <img
                                src={picUrl}
                                alt={candidateName}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                                  }
                                }}
                              />
                            )}
                            <span style={{ display: picUrl ? "none" : "inline" }}>
                              {initialsFrom(candidateName)}
                            </span>
                          </span>
                        );
                      })()}
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#01294a" }}>{candidateName}</h3>
                        <p style={{ margin: "2px 0 0", fontSize: "0.86rem", color: "#0284c7", fontWeight: 600 }}>
                          {inv.job_title}
                        </p>
                        <small style={{ color: "#64748b" }}>
                          {inv.city || "Cavite"} • Recruited: {formatDate(inv.created_at)}
                        </small>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "999px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          textTransform: "capitalize",
                          background: status === "accepted" ? "#ecfdf5" : status === "declined" ? "#fef2f2" : "#fffbeb",
                          color: status === "accepted" ? "#065f46" : status === "declined" ? "#991b1b" : "#92400e",
                          border: status === "accepted" ? "1px solid #a7f3d0" : status === "declined" ? "1px solid #fecaca" : "1px solid #fde68a",
                        }}
                      >
                        {status === "accepted" ? "Recruited" : status === "declined" ? "Denied" : "Pending Response"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                      <button
                        type="button"
                        className="solid-btn"
                        style={{
                          padding: "8px 16px",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          borderRadius: "6px",
                          background: "#01294a",
                          color: "#ffffff",
                          border: "none",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => handleOpenReview(synthApp, false, true)}
                      >
                        Details
                      </button>
                      <a
                        href="/messages"
                        className="solid-btn"
                        style={{
                          textDecoration: "none",
                          padding: "8px 16px",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          borderRadius: "6px",
                          background: "#01294a",
                          color: "#ffffff",
                          border: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Message
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        )}

        {/* CANDIDATE REVIEW MODAL */}
        {reviewModalApp && (
          <div
            className="jd-overlay"
            onClick={() => {
              setReviewModalApp(null);
              setReviewModalProfile(null);
              setIsMatchDrawerOpen(false);
              setIsMatchDrawerClosing(false);
              setIsOtherJobsOpen(false);
              setIsOtherJobsClosing(false);
              setIsJobDetailsOpen(false);
              setIsJobDetailsClosing(false);
              setIsDocsDrawerOpen(false);
              setIsPreviewingDoc(false);
              setApplicantDocuments([]);
              setPreviewDoc(null);
              setCandDetailTab("personal");
            }}
          >
            <div
              className={`jd-modal-container ${
                isMatchDrawerOpen || isMatchDrawerClosing || isOtherJobsOpen || isOtherJobsClosing || isJobDetailsOpen || isJobDetailsClosing ? "with-side-panel" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="jd-panel-outer-wrap">
                <div className="jd-floating-tabs-container">
                  <button
                    type="button"
                    className={`jd-floating-breakdown-tab ${isMatchDrawerOpen && !isMatchDrawerClosing ? "active" : ""}`}
                    onClick={() => {
                      if (isMatchDrawerOpen) {
                        handleCloseMatchDrawer();
                      } else {
                        setIsOtherJobsOpen(false);
                        setIsMatchDrawerOpen(true);
                        setIsMatchDrawerClosing(false);
                      }
                    }}
                  >
                    <span>{isMatchDrawerOpen && !isMatchDrawerClosing ? "Hide Breakdown" : "Match Breakdown"}</span>
                  </button>
                  <button
                    type="button"
                    className={`jd-floating-breakdown-tab ${isOtherJobsOpen && !isOtherJobsClosing ? "active" : ""}`}
                    onClick={() => {
                      if (isOtherJobsOpen) {
                        setIsOtherJobsClosing(true);
                        setTimeout(() => {
                          setIsOtherJobsOpen(false);
                          setIsOtherJobsClosing(false);
                        }, 220);
                      } else {
                        setIsMatchDrawerOpen(false);
                        setIsOtherJobsOpen(true);
                        setIsOtherJobsClosing(false);
                      }
                    }}
                  >
                    <span>{isOtherJobsOpen && !isOtherJobsClosing ? "Hide Other Jobs" : "Other Jobs"}</span>
                  </button>
                </div>
                <div className="jd-panel">
                  <div className="jd-employer-strip" style={{ paddingTop: "20px" }}>
                  <div className="jd-employer-logo-info">
                    <div className="jd-employer-logo" aria-label="Candidate initials" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      {(() => {
                        const pic = reviewModalProfile?.profile_picture_path || reviewModalApp.profile_picture_path;
                        const picUrl = pic
                          ? (pic.startsWith("http") || pic.startsWith("/api") ? pic : `/api/applicants/${reviewModalApp.applicant_user_id}/profile-picture`)
                          : null;
                        return (
                          <>
                            {picUrl && (
                              <img
                                src={picUrl}
                                alt={reviewModalApp.applicant_name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                                  }
                                }}
                              />
                            )}
                            <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "1.05rem", display: picUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                              {initialsFrom(reviewModalApp.applicant_name)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <div>
                      <strong className="jd-employer-name">{reviewModalApp.applicant_name}</strong>
                      <span className="jd-employer-location" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "3px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          {reviewModalApp.city || reviewModalApp.address || reviewModalProfile?.city || reviewModalProfile?.address || "Cavite"}
                        </span>
                        {(reviewModalProfile?.email || reviewModalApp?.email) && (
                          <>
                            <span style={{ color: "#cbd5e1" }}>•</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                              {reviewModalProfile?.email || reviewModalApp?.email}
                            </span>
                          </>
                        )}
                        {(reviewModalProfile?.phone || reviewModalProfile?.contact_number || reviewModalApp?.phone) && (
                          <>
                            <span style={{ color: "#cbd5e1" }}>•</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                              {reviewModalProfile?.phone || reviewModalProfile?.contact_number || reviewModalApp?.phone}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="jd-header-right-actions">
                    <div className="rating-score-box" title="Applicant rating">
                      <span className="star-icon">★</span>
                      <span>{reviewModalProfile?.rating ? Number(reviewModalProfile.rating).toFixed(1) : "0.0"}</span>
                    </div>
                    {(() => {
                      const modalMatchScore = reviewModalApp ? calculateAppMatch(reviewModalApp, reviewModalProfile) : 75;
                      return (
                        <div className={`match-score-box ${getMatchColorClass(modalMatchScore)}`} title="Match score">
                          <small>MATCH</small>
                          <b>{modalMatchScore}%</b>
                        </div>
                      );
                    })()}
                    <button
                      type="button"
                      className={`jd-faq-btn ${isDocsDrawerOpen ? "active" : ""}`}
                      onClick={() => {
                        setIsDocsDrawerOpen((prev) => {
                          const next = !prev;
                          if (next && reviewModalApp?.applicant_user_id) {
                            fetchApplicantDocuments(reviewModalApp.applicant_user_id);
                          }
                          return next;
                        });
                      }}
                    >
                      Docs
                    </button>
                  </div>
                </div>

                {/* 4-SECTION NAVIGATION TABS (Matching Applicant Profile Design) */}
                <div className="cand-modal-nav-wrap">
                  <nav className="profile-section-nav cand-modal-tabs" aria-label="Profile Sections">
                    <button
                      type="button"
                      className={`section-nav-btn ${candDetailTab === "personal" ? "active" : ""}`}
                      onClick={() => {
                        setCandDetailTab("personal");
                        setIsDocsDrawerOpen(false);
                        setIsPreviewingDoc(false);
                      }}
                    >
                      <span className="nav-num">1</span>
                      <span>Personal & Contact</span>
                    </button>
                    <button
                      type="button"
                      className={`section-nav-btn ${candDetailTab === "preferences" ? "active" : ""}`}
                      onClick={() => {
                        setCandDetailTab("preferences");
                        setIsDocsDrawerOpen(false);
                        setIsPreviewingDoc(false);
                      }}
                    >
                      <span className="nav-num">2</span>
                      <span>Career Preferences</span>
                    </button>
                    <button
                      type="button"
                      className={`section-nav-btn ${candDetailTab === "competencies" ? "active" : ""}`}
                      onClick={() => {
                        setCandDetailTab("competencies");
                        setIsDocsDrawerOpen(false);
                        setIsPreviewingDoc(false);
                      }}
                    >
                      <span className="nav-num">3</span>
                      <span>Skills & Credentials</span>
                    </button>
                    <button
                      type="button"
                      className={`section-nav-btn ${candDetailTab === "experience" ? "active" : ""}`}
                      onClick={() => {
                        setCandDetailTab("experience");
                        setIsDocsDrawerOpen(false);
                        setIsPreviewingDoc(false);
                      }}
                    >
                      <span className="nav-num">4</span>
                      <span>Work Experience</span>
                    </button>
                  </nav>
                </div>

                <div className="jd-body-wrapper">
                  <div className="jd-body">
                    {/* TAB 1: PERSONAL & CONTACT */}
                    {candDetailTab === "personal" && (
                      <div className="cand-tab-content">
                        <div className="cand-details-card">
                          <div className="cand-card-header">
                            <h4>Professional Summary</h4>
                          </div>
                          <p className="cand-summary-text">
                            {reviewModalProfile?.summary || reviewModalApp.summary || "No professional summary provided by the applicant."}
                          </p>
                        </div>

                        <div className="cand-details-card">
                          <div className="cand-card-header">
                            <h4>Languages Spoken</h4>
                          </div>
                          <div className="cand-details-tags-wrap">
                            {parseItemList(reviewModalProfile?.languages || reviewModalApp.languages, []).length > 0 ? (
                              parseItemList(reviewModalProfile?.languages || reviewModalApp.languages, []).map((lang: string, idx: number) => (
                                <span key={idx} className="js-tag-chip js-tag-skill">{lang}</span>
                              ))
                            ) : (
                              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No specific languages specified</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: CAREER PREFERENCES */}
                    {candDetailTab === "preferences" && (
                      <div className="cand-tab-content">
                        <div className="cand-details-card">
                          <div className="cand-card-header">
                            <h4>Career Target</h4>
                          </div>
                          <div className="cand-info-row">
                            <div className="cand-info-item">
                              <span className="cand-info-label">Desired Job Title</span>
                              <span className="cand-info-val highlight">
                                {reviewModalProfile?.desired_job_title || reviewModalApp.desired_job_title || reviewModalApp.job_title || "Not specified"}
                              </span>
                            </div>
                            {(() => {
                              const sal = parseCandidateSalaryRange(reviewModalProfile || reviewModalApp);
                              return (
                                <>
                                  <div className="cand-info-item">
                                    <span className="cand-info-label">Minimum Expected Salary</span>
                                    <span className="cand-info-val">{sal.min}</span>
                                  </div>
                                  <div className="cand-info-item">
                                    <span className="cand-info-label">Maximum Expected Salary</span>
                                    <span className="cand-info-val">{sal.max}</span>
                                  </div>
                                </>
                              );
                            })()}
                            <div className="cand-info-item">
                              <span className="cand-info-label">Work Arrangement</span>
                              <span className="setup-pill" style={{ alignSelf: "flex-start", marginTop: "2px" }}>
                                {reviewModalProfile?.work_arrangement || reviewModalApp.work_arrangement || "On-Site"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="cand-details-card">
                          <div className="cand-card-header">
                            <h4>Preferred Work Locations</h4>
                          </div>
                          <div className="cand-details-tags-wrap">
                            {parsePreferredLocationTags(reviewModalProfile?.preferred_locations || reviewModalApp.preferred_locations).length > 0 ? (
                              parsePreferredLocationTags(reviewModalProfile?.preferred_locations || reviewModalApp.preferred_locations).map((loc: string, idx: number) => (
                                <span key={idx} className="js-tag-chip js-tag-skill" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                                  {loc}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No preferred location restrictions specified</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: SKILLS & CREDENTIALS */}
                    {candDetailTab === "competencies" && (
                      <div className="cand-tab-content">
                        {(() => {
                          const allQuals = parseItemList(reviewModalProfile?.qualifications || reviewModalApp.qualifications, []);
                          const shsList = allQuals.filter(isShsItem);
                          const collegeList = allQuals.filter((q: string) => !isShsItem(q));
                          const skillsList = parseItemList(reviewModalProfile?.skills || reviewModalApp.skills, []);
                          const certList = parseItemList(reviewModalProfile?.certifications || reviewModalApp.certifications, []);

                          return (
                            <>
                              {/* 1. Senior High School & Vocational Education */}
                              <div className="cand-details-card">
                                <div className="cand-card-header">
                                  <h4>Senior High School & Vocational</h4>
                                </div>
                                <div className="cand-details-tags-wrap">
                                  {shsList.length > 0 ? (
                                    shsList.map((q: string, idx: number) => (
                                      <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No senior high / vocational records listed</span>
                                  )}
                                </div>
                              </div>

                              {/* 2. College & Tertiary Education */}
                              <div className="cand-details-card">
                                <div className="cand-card-header">
                                  <h4>College & Tertiary Education</h4>
                                </div>
                                <div className="cand-details-tags-wrap">
                                  {collegeList.length > 0 ? (
                                    collegeList.map((q: string, idx: number) => (
                                      <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No college / tertiary degree listed</span>
                                  )}
                                </div>
                              </div>

                              {/* 3. Core Technical Skills */}
                              <div className="cand-details-card">
                                <div className="cand-card-header">
                                  <h4>Core Technical Skills</h4>
                                </div>
                                <div className="cand-details-tags-wrap">
                                  {skillsList.length > 0 ? (
                                    skillsList.map((s: string, idx: number) => (
                                      <span key={idx} className="js-tag-chip js-tag-skill">{s}</span>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No technical skills listed</span>
                                  )}
                                </div>
                              </div>

                              {/* 4. Professional Certifications */}
                              <div className="cand-details-card">
                                <div className="cand-card-header">
                                  <h4>Professional Certifications</h4>
                                </div>
                                <div className="cand-details-tags-wrap">
                                  {certList.length > 0 ? (
                                    certList.map((c: string, idx: number) => (
                                      <span key={idx} className="js-tag-chip" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>{c}</span>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No certifications listed</span>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* TAB 4: WORK EXPERIENCE */}
                    {candDetailTab === "experience" && (
                      <div className="cand-tab-content">
                        {(reviewModalProfile?.years_of_experience || reviewModalApp.years_of_experience) && (
                          <div className="cand-exp-banner">
                            <strong>Total Professional Experience:</strong> {reviewModalProfile?.years_of_experience || reviewModalApp.years_of_experience}
                          </div>
                        )}

                        {(() => {
                          let parsedWorkExp: any[] = [];
                          const expJson = reviewModalProfile?.work_experience_json || reviewModalApp.work_experience_json;
                          if (expJson) {
                            try {
                              const parsed = JSON.parse(expJson);
                              if (Array.isArray(parsed)) parsedWorkExp = parsed;
                            } catch {}
                          }

                          if (parsedWorkExp.length === 0) {
                            return (
                              <div className="cand-details-card" style={{ textAlign: "center", padding: "36px 20px" }}>
                                <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                                  No employment history entries added by the applicant.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="cand-work-exp-list">
                              {parsedWorkExp.map((exp: any, idx: number) => (
                                <div key={exp.id || idx} className="cand-work-exp-card">
                                  <div className="cand-exp-header">
                                    <div>
                                      <h4 className="cand-exp-title">{exp.title}</h4>
                                      <span className="cand-exp-company">{exp.company}</span>
                                      {(exp.city || exp.province) && (
                                        <span className="cand-exp-loc"> • {[exp.city, exp.province].filter(Boolean).join(", ")}</span>
                                      )}
                                    </div>
                                    <div className="cand-exp-period">
                                      {exp.isCurrent
                                        ? `${exp.startMonth || ""} ${exp.startYear || ""} - Present`
                                        : `${exp.startMonth || ""} ${exp.startYear || ""} - ${exp.endMonth || ""} ${exp.endYear || ""}`}
                                      {exp.employmentType && <span className="cand-exp-type-pill">{exp.employmentType}</span>}
                                    </div>
                                  </div>

                                  {exp.responsibilities && (
                                    <div className="cand-exp-bullets">
                                      {exp.responsibilities.split("\n").filter(Boolean).map((bullet: string, bIdx: number) => (
                                        <p key={bIdx} className="cand-exp-bullet-line">
                                          {bullet.startsWith("•") ? bullet : `• ${bullet}`}
                                        </p>
                                      ))}
                                    </div>
                                  )}

                                  {Array.isArray(exp.skills) && exp.skills.length > 0 && (
                                    <div className="cand-exp-skills-row">
                                      <span className="cand-exp-skills-label">Technologies / Skills:</span>
                                      <div className="cand-details-tags-wrap">
                                        {exp.skills.map((sk: string, sIdx: number) => (
                                          <span key={sIdx} className="js-tag-chip js-tag-skill" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                                            {sk}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Slide-in Docs Drawer */}
                  <div className={`jd-faq-drawer ${isDocsDrawerOpen ? "open" : ""}`}>
                    <div className="jd-faq-header">
                      <h3>{isPreviewingDoc ? "Document Preview" : "Saved Documents"}</h3>
                      <button
                        type="button"
                        className="jd-faq-back-btn"
                        aria-label="Back"
                        onClick={() => {
                          if (isPreviewingDoc) {
                            setIsPreviewingDoc(false);
                            setPreviewDoc(null);
                          } else {
                            setIsDocsDrawerOpen(false);
                          }
                        }}
                      >
                        ←
                      </button>
                    </div>
                    <div className="jd-faq-body" style={{ padding: "16px", display: "flex", flexDirection: "column", height: "calc(100% - 60px)" }}>
                      {!isPreviewingDoc ? (
                        <>
                          {isDocsLoading ? (
                            <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                              Loading documents...
                            </div>
                          ) : applicantDocuments.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", paddingRight: "4px" }}>
                              {applicantDocuments.map((doc) => {
                                const iconType = getDocIconType(doc.file_name);
                                const iconStyle = getDocIconStyle(iconType);
                                const formattedSize = formatDocBytes(doc.file_size);
                                const uploadDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : null;
                                const subtext = [formattedSize, uploadDate ? `Uploaded ${uploadDate}` : "Attached file"].filter(Boolean).join(" • ") || "Attached file";

                                return (
                                  <div
                                    key={`${doc.id}-${doc.file_name}`}
                                    className="cand-doc-item-card"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "12px 14px",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "10px",
                                      background: "#f8fafc",
                                      transition: "all 0.15s ease",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1, paddingRight: "10px" }}>
                                      <div
                                        style={{
                                          width: "38px",
                                          height: "38px",
                                          borderRadius: "8px",
                                          background: iconStyle.bg,
                                          color: iconStyle.color,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {iconType === "pdf" && (
                                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="16" y1="13" x2="8" y2="13" />
                                            <line x1="16" y1="17" x2="8" y2="17" />
                                            <polyline points="10 9 9 9 8 9" />
                                          </svg>
                                        )}
                                        {iconType === "word" && (
                                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <path d="M9 13l2 4 2-4" />
                                          </svg>
                                        )}
                                        {iconType === "image" && (
                                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <polyline points="21 15 16 10 5 21" />
                                          </svg>
                                        )}
                                        {iconType === "generic" && (
                                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                          </svg>
                                        )}
                                      </div>
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <strong
                                          className="cand-doc-item-title"
                                          style={{
                                            display: "block",
                                            fontSize: "0.9rem",
                                            color: "#0f172a",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                          }}
                                          title={doc.file_name}
                                        >
                                          {doc.file_name}
                                        </strong>
                                        <small className="cand-doc-item-subtext" style={{ color: "#64748b", fontSize: "0.78rem" }}>{subtext}</small>
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        className="doc-action-view-btn"
                                        onClick={() => {
                                          setPreviewDoc(doc);
                                          setIsPreviewingDoc(true);
                                        }}
                                      >
                                        View
                                      </button>
                                      <a
                                        href={`${doc.url}?download=1`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="doc-action-dl-btn"
                                        title="Download document"
                                      >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                          <polyline points="7 10 12 15 17 10" />
                                          <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6" style={{ marginBottom: "10px" }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span style={{ fontSize: "0.85rem", fontWeight: "500" }}>No documents attached by this applicant.</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: "10px", height: "100%" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setIsPreviewingDoc(false);
                                setPreviewDoc(null);
                              }}
                              style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", fontSize: "0.84rem", fontWeight: "600", padding: 0, display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              ← Back to list
                            </button>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                              <span style={{ fontSize: "0.82rem", color: "#475569", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }} title={previewDoc?.file_name}>
                                {previewDoc?.file_name}
                              </span>
                              <a
                                href={`${previewDoc?.url || `/api/applicants/${reviewModalApp.applicant_user_id}/resume`}?download=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: "0.8rem", color: "#0369a1", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600" }}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download Raw File
                              </a>
                            </div>
                          </div>
                          <div style={{ flex: 1, minHeight: "360px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1", background: "#ffffff" }}>
                            {previewDoc && getDocIconType(previewDoc.file_name) === "image" ? (
                              <div style={{ width: "100%", height: "100%", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "#0f172a" }}>
                                <img src={previewDoc.url} alt={previewDoc.file_name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "6px" }} />
                              </div>
                            ) : (
                              <iframe
                                src={previewDoc?.url || `/api/applicants/${reviewModalApp.applicant_user_id}/resume`}
                                style={{ width: "100%", height: "100%", border: "none" }}
                                title={`${reviewModalApp.applicant_name} Document`}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="jd-panel-footer">
                  <div className="jd-footer-meta">
                    <span><strong>{isDirectInvitationModal ? "Recruited On:" : "Applied On:"}</strong> {formatDate(reviewModalApp.submitted_at)}</span>
                  </div>

                  <div className="jd-footer-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      className="jd-cancel-btn"
                      onClick={() => {
                        setReviewModalApp(null);
                        setReviewModalProfile(null);
                        setIsMatchDrawerOpen(false);
                        setIsMatchDrawerClosing(false);
                        setIsOtherJobsOpen(false);
                        setIsOtherJobsClosing(false);
                        setIsJobDetailsOpen(false);
                        setIsJobDetailsClosing(false);
                        setIsDocsDrawerOpen(false);
                        setIsPreviewingDoc(false);
                        setApplicantDocuments([]);
                        setPreviewDoc(null);
                        setCandDetailTab("personal");
                      }}
                    >
                      Close
                    </button>
                    <a href="/messages" className="solid-btn" style={{ padding: "8px 16px", textDecoration: "none", fontSize: "0.85rem", borderRadius: "6px", background: "#01294a", color: "#ffffff", display: "inline-flex", alignItems: "center" }}>
                      Message
                    </a>
                    {!isDirectInvitationModal && (() => {
                      const isShortlisted = reviewModalApp.status?.toLowerCase() === "shortlisted";
                      const isApproved = isApprovedStatus(reviewModalApp.status);
                      const isDenied = isDeniedStatus(reviewModalApp.status);
                      const isFinalized = isFinalizedStatus(reviewModalApp.status);

                      if (isFinalized) {
                        return (
                          <button
                            type="button"
                            className={`modal-fused-status-btn ${isApproved ? "approved" : "denied"}`}
                            title={`Application decision finalized as ${isApproved ? "Approved" : "Denied"} (cannot be modified)`}
                            onClick={() => triggerLockedDecisionWarning(reviewModalApp)}
                          >
                            {isApproved ? "Approved" : "Denied"}
                          </button>
                        );
                      }

                      return (
                        <div className="status-actions-trio modal-status-actions-trio" role="group" aria-label="Status actions">
                          <button
                            type="button"
                            className={`modal-status-word-btn modal-shortlist-btn ${isShortlisted ? "active-shortlisted active" : ""}`}
                            title={isShortlisted ? "Shortlisted (click to un-shortlist)" : "Shortlist candidate"}
                            aria-label="Shortlist candidate"
                            onClick={() => handleInitiateStatusChange(reviewModalApp, isShortlisted ? "pending" : "shortlisted")}
                          >
                            <span>{isShortlisted ? "Shortlisted" : "Shortlist"}</span>
                          </button>

                          <button
                            type="button"
                            className="modal-status-word-btn modal-approve-btn"
                            title="Approve application"
                            aria-label="Approve application"
                            onClick={() => handleInitiateStatusChange(reviewModalApp, "approved")}
                          >
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            className="modal-status-word-btn modal-reject-btn"
                            title="Deny application"
                            aria-label="Deny application"
                            onClick={() => handleInitiateStatusChange(reviewModalApp, "denied")}
                          >
                            <span>Deny</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

              {/* ── Right Side Comparison Panel ── */}
              {(isMatchDrawerOpen || isMatchDrawerClosing) && (() => {
                const targetJobId = selectedCompareJobId || reviewModalApp.job_post_id;
                const jobPost = (allJobsMap && targetJobId ? allJobsMap[targetJobId] : null) || {};
                const candCity = reviewModalProfile?.city || reviewModalApp.city || "Cavite";
                const candSetup = reviewModalProfile?.work_arrangement || reviewModalApp.work_arrangement || "Any";
                const candSalary = reviewModalProfile?.expected_salary || reviewModalApp.expected_salary;
                const candSkills = parseCompetencyDisplayTags(reviewModalProfile?.skills || reviewModalApp.skills);
                const candQuals = parseCompetencyDisplayTags(reviewModalProfile?.qualifications || reviewModalApp.qualifications);
                const candCerts = parseCompetencyDisplayTags(reviewModalProfile?.certifications || reviewModalApp.certifications);

                const jobLocation = jobPost.location || reviewModalApp.job_location || "Cavite";
                const jobSetup = jobPost.work_arrangement || reviewModalApp.job_work_arrangement || "On-Site";
                const jobSalaryMin = Number(jobPost.salary_min) || Number(reviewModalApp.job_salary_min) || 0;
                const jobSalaryMax = Number(jobPost.salary_max) || Number(reviewModalApp.job_salary_max) || 0;
                const jobSalaryDisplay = (jobSalaryMin || jobSalaryMax) ? `PHP ${jobSalaryMin.toLocaleString()} - ${jobSalaryMax.toLocaleString()}` : "Market Rate";
                const jobSkills = parseCompetencyDisplayTags(jobPost.required_skills || reviewModalApp.job_required_skills);
                const jobQuals = parseCompetencyDisplayTags(jobPost.qualifications || jobPost.required_qualifications || reviewModalApp.job_required_qualifications);
                const jobCerts = parseCompetencyDisplayTags(jobPost.certifications || jobPost.required_certifications || reviewModalApp.job_required_certifications);

                const matchDetails = calculateJobMatchDetails(
                  {
                    id: reviewModalApp.job_post_id,
                    title: jobPost.title || reviewModalApp.job_title,
                    location: jobLocation,
                    salaryMin: jobSalaryMin,
                    setup: jobSetup,
                    skillTags: jobSkills,
                    qualTags: jobQuals,
                    certTags: jobCerts,
                  },
                  {
                    desiredJobTitle: reviewModalProfile?.desired_job_title || reviewModalApp.desired_job_title || "",
                    workArrangement: candSetup,
                    expectedSalary: parseExpectedSalary(candSalary),
                    city: candCity,
                    skills: candSkills,
                    qualifications: candQuals,
                    certifications: candCerts,
                  }
                );

                const checkMatch = (jobItem: string, appItems: string[]) => {
                  if (!appItems || appItems.length === 0) return false;
                  return appItems.some((appItem) => isSkillMatch(jobItem, appItem));
                };

                const isCandRelevant = (appItem: string, jItems: string[]) => {
                  if (!jItems || jItems.length === 0) return false;
                  return jItems.some((jobItem) => isSkillMatch(jobItem, appItem));
                };

                return (
                  <aside className={`jd-side-comparison-panel ${isMatchDrawerClosing ? "closing" : "opening"}`} style={{ marginTop: "44px", fontFamily: '"Manrope", sans-serif' }}>
                    <div className="jd-side-panel-header" style={{ fontFamily: '"Manrope", sans-serif' }}>
                      <div className="jd-side-title-row">
                        <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>Match Breakdown</h3>
                        <span className="jd-side-subtitle" style={{ fontSize: "0.82rem", color: "#557796", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>Side-by-side candidate profile vs job requirements</span>
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
                          <span><strong>Green Tag:</strong> Matched candidate competency</span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-dot red"></span>
                          <span><strong>Red Tag:</strong> Required by job, missing from candidate</span>
                        </div>
                      </div>

                      {/* Master 2-Column Unified Container */}
                      <div className="jd-unified-compare-container">
                        {/* ── Column 1: Candidate Profile ── */}
                        <div className="jd-master-col applicant-col">
                          <div className="jd-master-col-header">
                            <span>Candidate Profile</span>
                          </div>
                          <div className="jd-master-col-content">
                            {/* 1. Location */}
                            <div className="jd-master-row">
                              <span className="jd-row-label">Location</span>
                              <div className="jd-col-tags-container">
                                <span className="jd-comp-tag app-neutral">
                                  <span className="tag-text">{candCity}</span>
                                </span>
                              </div>
                            </div>

                            {/* 2. Work Arrangement */}
                            <div className="jd-master-row">
                              <span className="jd-row-label">Work Arrangement</span>
                              <div className="jd-col-tags-container">
                                <span className="jd-comp-tag app-neutral">
                                  <span className="tag-text">{candSetup}</span>
                                </span>
                              </div>
                            </div>

                            {/* 3. Salary Expectation */}
                            <div className="jd-master-row">
                              <span className="jd-row-label">Salary Range</span>
                              <div className="jd-col-tags-container">
                                <span className="jd-comp-tag app-neutral">
                                  <span className="tag-text">
                                    {candSalary ? (String(candSalary).toUpperCase().includes("PHP") ? String(candSalary) : `PHP ${Number(parseExpectedSalary(candSalary)).toLocaleString()}`) : "Not set"}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* 4. Skills */}
                            <div className="jd-master-row">
                              <div className="jd-row-label-wrap">
                                <span className="jd-row-label">Skills</span>
                                <span className="col-count-text">{candSkills.length} listed</span>
                              </div>
                              <div className="jd-col-tags-container">
                                {candSkills.length > 0 ? (
                                  candSkills.map((item) => {
                                    const isRel = isCandRelevant(item, jobSkills);
                                    const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                    const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                    return (
                                      <span
                                        key={item}
                                        className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                        onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "skills" })}
                                        onMouseLeave={() => setHoveredCompareTag(null)}
                                      >
                                        <span className="tag-text">{item}</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="jd-no-data-text">No skills in candidate profile</span>
                                )}
                              </div>
                            </div>

                            {/* 5. Qualifications */}
                            <div className="jd-master-row">
                              <div className="jd-row-label-wrap">
                                <span className="jd-row-label">Qualifications</span>
                                <span className="col-count-text">{candQuals.length} listed</span>
                              </div>
                              <div className="jd-col-tags-container">
                                {candQuals.length > 0 ? (
                                  candQuals.map((item) => {
                                    const isRel = isCandRelevant(item, jobQuals);
                                    const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                    const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                    return (
                                      <span
                                        key={item}
                                        className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                        onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "qualifications" })}
                                        onMouseLeave={() => setHoveredCompareTag(null)}
                                      >
                                        <span className="tag-text">{item}</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="jd-no-data-text">No qualifications in candidate profile</span>
                                )}
                              </div>
                            </div>

                            {/* 6. Certifications */}
                            <div className="jd-master-row">
                              <div className="jd-row-label-wrap">
                                <span className="jd-row-label">Certifications</span>
                                <span className="col-count-text">{candCerts.length} listed</span>
                              </div>
                              <div className="jd-col-tags-container">
                                {candCerts.length > 0 ? (
                                  candCerts.map((item) => {
                                    const isRel = isCandRelevant(item, jobCerts);
                                    const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                    const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                    return (
                                      <span
                                        key={item}
                                        className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                        onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "certifications" })}
                                        onMouseLeave={() => setHoveredCompareTag(null)}
                                      >
                                        <span className="tag-text">{item}</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="jd-no-data-text">No certifications in candidate profile</span>
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
                                      title={matched ? "Matched candidate location" : "Different location"}
                                    >
                                      <span className="tag-text">{jobLocation}</span>
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
                                      title={matched ? "Matched candidate arrangement" : "Different work arrangement"}
                                    >
                                      <span className="tag-text">{jobSetup}</span>
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
                                      title={matched ? "Matches candidate salary" : "Different salary range"}
                                    >
                                      <span className="tag-text">{jobSalaryDisplay}</span>
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
                                    const matched = checkMatch(item, candSkills);
                                    const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                    const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                    return (
                                      <span
                                        key={item}
                                        className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                        onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "skills" })}
                                        onMouseLeave={() => setHoveredCompareTag(null)}
                                      >
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
                                    const matched = checkMatch(item, candQuals);
                                    const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                    const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                    return (
                                      <span
                                        key={item}
                                        className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                        onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "qualifications" })}
                                        onMouseLeave={() => setHoveredCompareTag(null)}
                                      >
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
                                    const matched = checkMatch(item, candCerts);
                                    const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                    const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                    return (
                                      <span
                                        key={item}
                                        className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                        onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "certifications" })}
                                        onMouseLeave={() => setHoveredCompareTag(null)}
                                      >
                                        <span className="tag-text">{item}</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="jd-no-data-text">No specific certifications required</span>
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

              {/* ── Other Employer Jobs Panel (Container 2) ── */}
              {(isOtherJobsOpen || isOtherJobsClosing) && (
                <aside className={`jd-side-comparison-panel ${isOtherJobsClosing ? "closing" : "opening"}`} style={{ marginTop: "44px", fontFamily: '"Manrope", sans-serif' }}>
                  <div className="jd-side-panel-header" style={{ fontFamily: '"Manrope", sans-serif' }}>
                    <div className="jd-side-title-row">
                      <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>Other Employer Jobs</h3>
                      <span className="jd-side-subtitle" style={{ fontSize: "0.82rem", color: "#557796", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>Candidate compatibility across your active job postings</span>
                    </div>
                    <div className="jd-side-header-actions">
                      <button
                        type="button"
                        className="jd-side-close-btn"
                        aria-label="Close panel"
                        onClick={() => {
                          setIsOtherJobsClosing(true);
                          setTimeout(() => {
                            setIsOtherJobsOpen(false);
                            setIsOtherJobsClosing(false);
                          }, 220);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="jd-side-panel-body" style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "18px", fontFamily: '"Manrope", sans-serif' }}>
                    {(() => {
                      const otherJobsList = Object.values(allJobsMap).filter(
                        (j: any) => Number(j.id) !== Number(reviewModalApp.job_post_id)
                      );

                      if (otherJobsList.length === 0) {
                        return (
                          <div style={{ textAlign: "center", color: "#64748b", padding: "30px 10px", fontSize: "0.9rem", fontFamily: '"Manrope", sans-serif' }}>
                            No other job posts found for this employer.
                          </div>
                        );
                      }

                      return otherJobsList.map((otherJob: any) => {
                        const percent = calculateCandidateMatch(
                          {
                            desired_job_title: reviewModalProfile?.desired_job_title || reviewModalApp.desired_job_title || "",
                            work_arrangement: reviewModalProfile?.work_arrangement || reviewModalApp.work_arrangement || "",
                            expected_salary: reviewModalProfile?.expected_salary || reviewModalApp.expected_salary || 0,
                            skills: reviewModalProfile?.skills || reviewModalApp.skills || "",
                            qualifications: reviewModalProfile?.qualifications || reviewModalApp.qualifications || "",
                            certifications: reviewModalProfile?.certifications || reviewModalApp.certifications || "",
                            city: reviewModalProfile?.city || reviewModalApp.city || "",
                          },
                          {
                            title: otherJob.title || "",
                            work_arrangement: otherJob.work_arrangement || "",
                            required_skills: otherJob.required_skills || "",
                            required_qualifications: otherJob.qualifications || otherJob.required_qualifications || "",
                            required_certifications: otherJob.certifications || otherJob.required_certifications || "",
                            location: otherJob.location || "",
                            salary_min: Number(otherJob.salary_min) || 0,
                            salary_max: Number(otherJob.salary_max) || 0,
                          }
                        );
                        const matchStyle = getMatchPercentStyle(percent);

                        return (
                          <div
                            key={otherJob.id}
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
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                                {otherJob.title}
                              </h4>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "2px", fontSize: "0.8rem", color: "#64748b", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: '"Manrope", sans-serif' }}>
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                                    <circle cx="12" cy="10" r="2.5" />
                                  </svg>
                                  {otherJob.location || "Cavite"}
                                </span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: '"Manrope", sans-serif' }}>
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                  </svg>
                                  {otherJob.work_arrangement || "On-Site"}
                                </span>
                                {otherJob.salary_min ? (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: '"Manrope", sans-serif' }}>
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="12" y1="1" x2="12" y2="23" />
                                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                    </svg>
                                    PHP {Number(otherJob.salary_min).toLocaleString()} - {Number(otherJob.salary_max).toLocaleString()}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                              <div
                                className={`jd-other-job-match-pill ${percent >= 85 ? "green" : percent >= 70 ? "yellow" : "red"}`}
                                style={{
                                  fontWeight: 800,
                                  fontSize: "0.82rem",
                                  padding: "4px 10px",
                                  borderRadius: "999px",
                                  whiteSpace: "nowrap",
                                  fontFamily: '"Manrope", sans-serif',
                                }}
                              >
                                {percent}% Match
                              </div>
                              <button
                                type="button"
                                className="details-btn jd-other-job-details-btn"
                                style={{
                                  background: "#01294a",
                                  color: "#ffffff",
                                  fontWeight: 800,
                                  fontSize: "0.82rem",
                                  padding: "4px 12px",
                                  borderRadius: "999px",
                                  border: "1px solid #01294a",
                                  whiteSpace: "nowrap",
                                  cursor: "pointer",
                                  boxShadow: "0 2px 6px rgba(1, 41, 74, 0.2)",
                                  transition: "all 0.15s ease",
                                  width: "100%",
                                  textAlign: "center",
                                  fontFamily: '"Manrope", sans-serif',
                                }}
                                onClick={() => {
                                  setSelectedJobDetails(otherJob);
                                  setIsJobDetailsOpen(true);
                                  setIsJobDetailsClosing(false);
                                }}
                              >
                                Details
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {/* ── 3rd & 4th Floating Containers: Job Details (LEFT) & Match Breakdown (RIGHT) Side-by-Side Overlay ── */}
        {(isJobDetailsOpen || isJobDetailsClosing) && selectedJobDetails && (
          (() => {
            const detailsMatchPct = reviewModalApp ? calculateCandidateMatch(reviewModalApp, selectedJobDetails) : 0;
            const matchStyle = detailsMatchPct >= 85
              ? { track: "#dcfce7", color: "#15803d", fill: "#86efac" }
              : detailsMatchPct >= 70
              ? { track: "#fef3c7", color: "#b45309", fill: "#fde68a" }
              : { track: "#fee2e2", color: "#b91c1c", fill: "#fca5a5" };

            return (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(10, 30, 50, 0.68)",
                  backdropFilter: "blur(5px)",
                  WebkitBackdropFilter: "blur(5px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "20px",
                  zIndex: 25000,
                  padding: "24px 36px",
                  overflowX: "hidden",
                  fontFamily: '"Manrope", sans-serif',
                  animation: isJobDetailsClosing
                    ? "jdFadeOut 0.2s ease forwards"
                    : "jdFadeIn 0.22s ease forwards",
                }}
                onClick={() => {
                  setIsJobDetailsClosing(true);
                  setTimeout(() => {
                    setIsJobDetailsOpen(false);
                    setIsJobDetailsClosing(false);
                    setSelectedJobDetails(null);
                    setIsJobBreakdownModalOpen(false);
                  }, 200);
                }}
              >
                {/* ── 3rd Container: Job Details Card (POSITIONED ON THE LEFT) ── */}
                <div className="jd-details-side-card"
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    width: "100%",
                    maxWidth: "540px",
                    maxHeight: "85vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                    overflow: "hidden",
                    position: "relative",
                    flexShrink: 0,
                    fontFamily: '"Manrope", sans-serif',
                    animation: isJobDetailsClosing
                      ? "jdPopOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                      : "jdPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="jd-details-side-header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 24px",
                      borderBottom: "1px solid #f1f5f9",
                      background: "#f8fbff",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                        Job Details
                      </h3>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        className={`jd-match-header-badge ${detailsMatchPct >= 85 ? "green" : detailsMatchPct >= 70 ? "yellow" : "red"}`}
                        style={{
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          whiteSpace: "nowrap",
                          fontFamily: '"Manrope", sans-serif',
                        }}
                      >
                        {detailsMatchPct}% Match
                      </div>
                      <button
                        type="button"
                        style={{
                          background: "#01294a",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          padding: "4px 12px",
                          borderRadius: "999px",
                          border: "1px solid #01294a",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(1, 41, 74, 0.2)",
                          transition: "all 0.15s ease",
                          fontFamily: '"Manrope", sans-serif',
                        }}
                        onClick={() => {
                          setIsJobBreakdownModalOpen((prev) => !prev);
                        }}
                      >
                        Match Breakdown
                      </button>
                      <button
                        type="button"
                        className="jd-side-close-btn"
                        aria-label="Close job details"
                        onClick={() => {
                          setIsJobDetailsClosing(true);
                          setTimeout(() => {
                            setIsJobDetailsOpen(false);
                            setIsJobDetailsClosing(false);
                            setSelectedJobDetails(null);
                            setIsJobBreakdownModalOpen(false);
                          }, 200);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", flex: 1, fontFamily: '"Manrope", sans-serif' }}>
                    <div>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                        {selectedJobDetails.title}
                      </h4>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <span className="jd-side-status-pill" style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "4px 10px", borderRadius: "999px", fontSize: "0.76rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                          {selectedJobDetails.status ? selectedJobDetails.status.toUpperCase() : "OPEN"}
                        </span>
                        {(selectedJobDetails.is_urgent === 1 || selectedJobDetails.is_urgent === true || String(selectedJobDetails.is_urgent) === "1") && (
                          <span className="jd-side-urgent-pill" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", padding: "4px 10px", borderRadius: "999px", fontSize: "0.76rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                            Urgent
                          </span>
                        )}
                        <span className="jd-side-setup-pill" style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                          {selectedJobDetails.work_arrangement || "On-Site"}
                        </span>
                        {(selectedJobDetails.salary_min || selectedJobDetails.salary_max) && (
                          <span className="jd-side-salary-pill" style={{ background: "#fef3c7", color: "#b45309", padding: "4px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                            PHP {Number(selectedJobDetails.salary_min || 0).toLocaleString()} - {Number(selectedJobDetails.salary_max || 0).toLocaleString()}
                          </span>
                        )}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "#64748b", fontFamily: '"Manrope", sans-serif' }}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          {selectedJobDetails.location || "Cavite"}
                        </span>
                      </div>
                    </div>

                    {/* JOB DESCRIPTION */}
                    <div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                        JOB DESCRIPTION
                      </span>
                      <p style={{ margin: 0, fontSize: "0.86rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-line", fontFamily: '"Manrope", sans-serif' }}>
                        {selectedJobDetails.description || "No job description provided."}
                      </p>
                    </div>

                    {/* REQUIRED SKILLS */}
                    <div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                        REQUIRED SKILLS
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {parseCompetencyDisplayTags(selectedJobDetails.required_skills || selectedJobDetails.skills || "").length > 0 ? (
                          parseCompetencyDisplayTags(selectedJobDetails.required_skills || selectedJobDetails.skills || "").map((sk, idx) => (
                            <span key={idx} className="jd-side-tag jd-side-skill-tag" style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                              {sk}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic", fontFamily: '"Manrope", sans-serif' }}>
                            No specific skills required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* QUALIFICATIONS */}
                    <div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                        QUALIFICATIONS
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {parseCompetencyDisplayTags(selectedJobDetails.qualifications || selectedJobDetails.required_qualifications || "").length > 0 ? (
                          parseCompetencyDisplayTags(selectedJobDetails.qualifications || selectedJobDetails.required_qualifications || "").map((qu, idx) => (
                            <span key={idx} className="jd-side-tag jd-side-qual-tag" style={{ background: "#faf5ff", color: "#7e22ce", border: "1px solid #e9d5ff", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                              {qu}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic", fontFamily: '"Manrope", sans-serif' }}>
                            No specific qualifications required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CERTIFICATIONS */}
                    <div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                        CERTIFICATIONS
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {parseCompetencyDisplayTags(selectedJobDetails.certifications || selectedJobDetails.required_certifications || "").length > 0 ? (
                          parseCompetencyDisplayTags(selectedJobDetails.certifications || selectedJobDetails.required_certifications || "").map((cert, idx) => (
                            <span key={idx} className="jd-side-tag jd-side-cert-tag" style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                              {cert}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic", fontFamily: '"Manrope", sans-serif' }}>
                            No specific certifications required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer with Application count, Close date, and Recruit Button */}
                  <div className="jd-details-side-footer"
                    style={{
                      padding: "14px 24px",
                      borderTop: "1px solid #f1f5f9",
                      background: "#ffffff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      {selectedJobDetails.close_date && (
                        <span style={{ fontSize: "0.8rem", color: "#64748b", fontFamily: '"Manrope", sans-serif', display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <strong style={{ color: "#0f172a" }}>Close Date:</strong> {selectedJobDetails.close_date}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      style={{
                        background: "#01294a",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.88rem",
                        padding: "8px 22px",
                        borderRadius: "999px",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(1, 41, 74, 0.25)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                        fontFamily: '"Manrope", sans-serif',
                      }}
                      onClick={() => {
                        setRecruitJobTarget(selectedJobDetails);
                        if (reviewModalApp) {
                          setRecruitCustomMsg(
                            `Hello ${reviewModalApp.applicant_name}! We reviewed your profile and would like to invite you to apply for our open position: ${selectedJobDetails.title}.`
                          );
                        }
                        setRecruitSuccessMsg(null);
                        setIsRecruitModalOpen(true);
                      }}
                    >
                      Recruit
                    </button>
                  </div>
                </div>

                {/* ── 4th Container: Job Match Breakdown (POSITIONED ON THE RIGHT OF 3rd CONTAINER) ── */}
                {isJobBreakdownModalOpen && reviewModalApp && (
                  (() => {
                    const candSkills = parseCompetencyDisplayTags(reviewModalApp.skills || reviewModalProfile?.skills || "");
                    const candQuals = parseCompetencyDisplayTags(reviewModalApp.qualifications || reviewModalProfile?.qualifications || "");
                    const candCerts = parseCompetencyDisplayTags(reviewModalApp.certifications || reviewModalProfile?.certifications || "");
                    const candCity = reviewModalApp.city || reviewModalProfile?.city || "Cavite";
                    const candSetup = reviewModalApp.work_arrangement || reviewModalProfile?.work_arrangement || "On-Site";
                    const candSalary = reviewModalApp.expected_salary || reviewModalProfile?.expected_salary || "";

                    const jobSkills = parseCompetencyDisplayTags(selectedJobDetails.required_skills || selectedJobDetails.skills || "");
                    const jobQuals = parseCompetencyDisplayTags(selectedJobDetails.qualifications || selectedJobDetails.required_qualifications || "");
                    const jobCerts = parseCompetencyDisplayTags(selectedJobDetails.certifications || selectedJobDetails.required_certifications || "");
                    const jobLocation = selectedJobDetails.location || "Cavite";
                    const jobSetup = selectedJobDetails.work_arrangement || "On-Site";
                    const jobSalaryMin = Number(selectedJobDetails.salary_min) || 0;
                    const jobSalaryMax = Number(selectedJobDetails.salary_max) || 0;
                    const jobSalaryDisplay = (jobSalaryMin || jobSalaryMax) ? `PHP ${jobSalaryMin.toLocaleString()} - ${jobSalaryMax.toLocaleString()}` : "Market Rate";

                    const matchDetails = calculateJobMatchDetails(
                      {
                        id: selectedJobDetails.id,
                        title: selectedJobDetails.title,
                        location: jobLocation,
                        salaryMin: jobSalaryMin,
                        setup: jobSetup,
                        skillTags: jobSkills,
                        qualTags: jobQuals,
                        certTags: jobCerts,
                      },
                      {
                        desiredJobTitle: reviewModalProfile?.desired_job_title || reviewModalApp.desired_job_title || "",
                        workArrangement: candSetup,
                        expectedSalary: parseExpectedSalary(candSalary),
                        city: candCity,
                        skills: candSkills,
                        qualifications: candQuals,
                        certifications: candCerts,
                      }
                    );

                    const checkMatch = (jobItem: string, appItems: string[]) => {
                      if (!appItems || appItems.length === 0) return false;
                      return appItems.some((appItem) => isSkillMatch(jobItem, appItem));
                    };

                    const isCandRelevant = (appItem: string, jItems: string[]) => {
                      if (!jItems || jItems.length === 0) return false;
                      return jItems.some((jobItem) => isSkillMatch(jobItem, appItem));
                    };

                    const bdStyle = getMatchColorClass(matchDetails.score);

                    return (
                      <div className="jd-match-breakdown-card"
                        style={{
                          background: "#ffffff",
                          borderRadius: "16px",
                          width: "100%",
                          maxWidth: "680px",
                          maxHeight: "85vh",
                          display: "flex",
                          flexDirection: "column",
                          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                          overflow: "hidden",
                          flexShrink: 0,
                          fontFamily: '"Manrope", sans-serif',
                          animation: isJobDetailsClosing
                            ? "jdSlideOutRight 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                            : "jdSlideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="jd-match-breakdown-header"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "16px 24px",
                            borderBottom: "1px solid #f1f5f9",
                            background: "#f8fbff",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                              Match Breakdown
                            </h3>
                            <span style={{ fontSize: "0.82rem", color: "#557796", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
                              Side-by-side comparison: {reviewModalApp.applicant_name} vs {selectedJobDetails.title}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span className={`match-badge-pill ${bdStyle}`} style={{ fontFamily: '"Manrope", sans-serif' }}>
                              {matchDetails.score}% Match
                            </span>
                            <button
                              type="button"
                              className="jd-side-close-btn"
                              onClick={() => setIsJobBreakdownModalOpen(false)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", flex: 1, fontFamily: '"Manrope", sans-serif' }}>
                          {/* Legend strip */}
                          <div className="jd-compare-legend" style={{ fontFamily: '"Manrope", sans-serif' }}>
                            <div className="legend-item">
                              <span className="legend-dot green"></span>
                              <span><strong>Green Tag:</strong> Matched candidate competency</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-dot red"></span>
                              <span><strong>Red Tag:</strong> Required by job, missing from candidate</span>
                            </div>
                          </div>

                          {/* Master 2-Column Unified Container */}
                          <div className="jd-unified-compare-container" style={{ fontFamily: '"Manrope", sans-serif' }}>
                            {/* ── Column 1: Candidate Profile ── */}
                            <div className="jd-master-col applicant-col">
                              <div className="jd-master-col-header">
                                <span>Candidate Profile</span>
                              </div>
                              <div className="jd-master-col-content">
                                {/* 1. Location */}
                                <div className="jd-master-row">
                                  <span className="jd-row-label">Location</span>
                                  <div className="jd-col-tags-container">
                                    <span className="jd-comp-tag app-neutral">
                                      <span className="tag-text">{candCity}</span>
                                    </span>
                                  </div>
                                </div>

                                {/* 2. Work Arrangement */}
                                <div className="jd-master-row">
                                  <span className="jd-row-label">Work Arrangement</span>
                                  <div className="jd-col-tags-container">
                                    <span className="jd-comp-tag app-neutral">
                                      <span className="tag-text">{candSetup}</span>
                                    </span>
                                  </div>
                                </div>

                                {/* 3. Experience Level */}
                                <div className="jd-master-row">
                                  <span className="jd-row-label">Experience Level</span>
                                  <div className="jd-col-tags-container">
                                    <span className="jd-comp-tag app-neutral">
                                      <span className="tag-text">
                                        {(reviewModalProfile?.years_of_experience || (reviewModalApp as any).years_of_experience)
                                          ? `${reviewModalProfile?.years_of_experience || (reviewModalApp as any).years_of_experience} yrs experience`
                                          : "Fresh Graduate / Entry-level"}
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {/* 4. Salary Expectation */}
                                <div className="jd-master-row">
                                  <span className="jd-row-label">Salary Range</span>
                                  <div className="jd-col-tags-container">
                                    <span className="jd-comp-tag app-neutral">
                                      <span className="tag-text">
                                        {candSalary ? (String(candSalary).toUpperCase().includes("PHP") ? String(candSalary) : `PHP ${Number(parseExpectedSalary(candSalary)).toLocaleString()}`) : "Not set"}
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {/* 4. Skills */}
                                <div className="jd-master-row">
                                  <div className="jd-row-label-wrap">
                                    <span className="jd-row-label">Skills</span>
                                    <span className="col-count-text">{candSkills.length} listed</span>
                                  </div>
                                  <div className="jd-col-tags-container">
                                    {candSkills.length > 0 ? (
                                      candSkills.map((item) => {
                                        const isRel = isCandRelevant(item, jobSkills);
                                        const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                        const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                        return (
                                          <span
                                            key={item}
                                            className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                            onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "skills" })}
                                            onMouseLeave={() => setHoveredCompareTag(null)}
                                          >
                                            <span className="tag-text">{item}</span>
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="jd-no-data-text">No skills in candidate profile</span>
                                    )}
                                  </div>
                                </div>

                                {/* 5. Qualifications */}
                                <div className="jd-master-row">
                                  <div className="jd-row-label-wrap">
                                    <span className="jd-row-label">Qualifications</span>
                                    <span className="col-count-text">{candQuals.length} listed</span>
                                  </div>
                                  <div className="jd-col-tags-container">
                                    {candQuals.length > 0 ? (
                                      candQuals.map((item) => {
                                        const isRel = isCandRelevant(item, jobQuals);
                                        const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                        const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                        return (
                                          <span
                                            key={item}
                                            className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                            onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "qualifications" })}
                                            onMouseLeave={() => setHoveredCompareTag(null)}
                                          >
                                            <span className="tag-text">{item}</span>
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="jd-no-data-text">No qualifications in candidate profile</span>
                                    )}
                                  </div>
                                </div>

                                {/* 6. Certifications */}
                                <div className="jd-master-row">
                                  <div className="jd-row-label-wrap">
                                    <span className="jd-row-label">Certifications</span>
                                    <span className="col-count-text">{candCerts.length} listed</span>
                                  </div>
                                  <div className="jd-col-tags-container">
                                    {candCerts.length > 0 ? (
                                      candCerts.map((item) => {
                                        const isRel = isCandRelevant(item, jobCerts);
                                        const isSource = hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.item === item;
                                        const isLinked = Boolean(hoveredCompareTag?.side === "employer" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                        return (
                                          <span
                                            key={item}
                                            className={`jd-comp-tag ${isRel ? "app-matched" : "app-neutral"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                            onMouseEnter={() => setHoveredCompareTag({ item, side: "applicant", category: "certifications" })}
                                            onMouseLeave={() => setHoveredCompareTag(null)}
                                          >
                                            <span className="tag-text">{item}</span>
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="jd-no-data-text">No certifications in candidate profile</span>
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
                                          title={matched ? "Matched candidate location" : "Different location"}
                                        >
                                          <span className="tag-text">{jobLocation}</span>
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
                                          title={matched ? "Matched candidate arrangement" : "Different work arrangement"}
                                        >
                                          <span className="tag-text">{jobSetup}</span>
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* 3. Experience Level */}
                                <div className="jd-master-row">
                                  <span className="jd-row-label">Experience Level</span>
                                  <div className="jd-col-tags-container">
                                    {(() => {
                                      const candExpNum = parseFloat(String(reviewModalProfile?.years_of_experience || (reviewModalApp as any).years_of_experience || "0")) || 0;
                                      const jobExp = (selectedJobDetails.experience_level || "").toLowerCase();
                                      let isExpMatched = true;
                                      if (jobExp.includes("senior") || jobExp.includes("lead")) {
                                        isExpMatched = candExpNum >= 5;
                                      } else if (jobExp.includes("mid")) {
                                        isExpMatched = candExpNum >= 2;
                                      } else if (jobExp.includes("entry") || jobExp.includes("fresh")) {
                                        isExpMatched = true;
                                      }
                                      return (
                                        <span
                                          className={`jd-comp-tag ${isExpMatched ? "tag-matched-green" : "tag-missing-red"}`}
                                          title={isExpMatched ? "Meets experience requirements" : "Requires more experience"}
                                        >
                                          <span className="tag-text">
                                            {formatExperienceLevel(selectedJobDetails.experience_level || "") || selectedJobDetails.experience_level || "Any Experience"}
                                          </span>
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* 4. Salary Range */}
                                <div className="jd-master-row">
                                  <span className="jd-row-label">Salary Range</span>
                                  <div className="jd-col-tags-container">
                                    {(() => {
                                      const matched = matchDetails.salaryPts >= 12;
                                      return (
                                        <span
                                          className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}
                                          title={matched ? "Matches candidate salary" : "Different salary range"}
                                        >
                                          <span className="tag-text">{jobSalaryDisplay}</span>
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
                                        const matched = checkMatch(item, candSkills);
                                        const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                        const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                                        return (
                                          <span
                                            key={item}
                                            className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                            onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "skills" })}
                                            onMouseLeave={() => setHoveredCompareTag(null)}
                                          >
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
                                        const matched = checkMatch(item, candQuals);
                                        const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                        const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "qualifications" && isSkillMatch(item, hoveredCompareTag.item));
                                        return (
                                          <span
                                            key={item}
                                            className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                            onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "qualifications" })}
                                            onMouseLeave={() => setHoveredCompareTag(null)}
                                          >
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
                                        const matched = checkMatch(item, candCerts);
                                        const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                                        const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "certifications" && isSkillMatch(item, hoveredCompareTag.item));
                                        return (
                                          <span
                                            key={item}
                                            className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                                            onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "certifications" })}
                                            onMouseLeave={() => setHoveredCompareTag(null)}
                                          >
                                            <span className="tag-text">{item}</span>
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="jd-no-data-text">No specific certifications required</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            );
          })()
        )}

        {/* DIRECT RECRUITMENT INVITATION MODAL */}
        {(isRecruitModalOpen || isRecruitModalClosing) && reviewModalApp && selectedJobDetails && (
          <div
            className="cand-details-overlay"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 30000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(1, 41, 74, 0.45)",
              backdropFilter: "blur(4px)",
              animation: isRecruitModalClosing
                ? "jdFadeOut 0.2s ease forwards"
                : "jdFadeIn 0.22s ease forwards",
            }}
            onClick={closeRecruitModal}
          >
            <div
              className="cand-details-panel recruit-invite-panel cand-invite-panel"
              style={{
                maxWidth: "520px",
                height: "auto",
                minHeight: "unset",
                width: "90%",
                borderRadius: "16px",
                background: "#ffffff",
                boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
                overflow: "hidden",
                fontFamily: '"Manrope", sans-serif',
                animation: isRecruitModalClosing
                  ? "jdPopOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                  : "jdPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="cand-details-docs-header recruit-invite-header"
                style={{
                  padding: "16px 20px",
                  background: "#f8fbff",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                  Invite Candidate to Apply
                </h3>
                <button
                  type="button"
                  className="cand-details-docs-back recruit-invite-close"
                  onClick={closeRecruitModal}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendRecruitmentInvite} className="recruit-invite-form" style={{ padding: "20px", display: "grid", gap: "16px", fontFamily: '"Manrope", sans-serif' }}>
                {/* Applicant Summary */}
                <div className="recruit-applicant-summary" style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  {(() => {
                    const pic = (reviewModalApp as any).profile_picture_path || reviewModalProfile?.profile_picture_path;
                    const picUrl = pic
                      ? (pic.startsWith("http") || pic.startsWith("/api") ? pic : `/api/applicants/${reviewModalApp.applicant_user_id}/profile-picture`)
                      : null;
                    return (
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#01294a", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0, overflow: "hidden", position: "relative" }}>
                        {picUrl && (
                          <img
                            src={picUrl}
                            alt={reviewModalApp.applicant_name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                              }
                            }}
                          />
                        )}
                        <span style={{ display: picUrl ? "none" : "inline" }}>
                          {initialsFrom(reviewModalApp.applicant_name)}
                        </span>
                      </div>
                    );
                  })()}
                  <div>
                    <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{reviewModalApp.applicant_name}</strong>
                    <small style={{ display: "block", color: "#64748b", fontSize: "0.78rem" }}>
                      {reviewModalApp.email || "Candidate"} {reviewModalApp.phone ? `· ${reviewModalApp.phone}` : ""}
                    </small>
                  </div>
                </div>

                {/* Target Job Info */}
                <div className="recruit-target-job-box" style={{ padding: "12px 14px", background: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Target Job Opening</span>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#01294a" }}>{selectedJobDetails.title}</h4>
                  <span style={{ fontSize: "0.78rem", color: "#475569" }}>{selectedJobDetails.location || "Cavite"} • {selectedJobDetails.work_arrangement || "On-Site"}</span>
                </div>

                {/* Invitation Message Field */}
                <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", fontFamily: '"Manrope", sans-serif' }}>
                  Invitation Message:
                  <textarea
                    className="recruit-msg-textarea"
                    value={recruitCustomMsg}
                    onChange={(e) => setRecruitCustomMsg(e.target.value)}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      fontFamily: '"Manrope", sans-serif',
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </label>

                {/* Success Banner */}
                {recruitSuccessMsg && (
                  <div style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", padding: "12px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700 }}>
                    {recruitSuccessMsg}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                  <button
                    type="button"
                    style={{
                      padding: "9px 18px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#475569",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontFamily: '"Manrope", sans-serif',
                    }}
                    onClick={closeRecruitModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRecruitSending}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#01294a",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontFamily: '"Manrope", sans-serif',
                      opacity: isRecruitSending ? 0.7 : 1,
                    }}
                  >
                    {isRecruitSending ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DECISION MODAL (ACCEPT / DENY WITH MESSAGE PREFERENCE) ── */}
        {decisionModalApps.length > 0 && decisionModalAction && (
          <div className="decision-modal-overlay" onClick={() => !isDecisionSubmitting && setDecisionModalApps([])}>
            <div className="decision-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="decision-modal-header">
                <div className="decision-header-left">
                  <h3 className="decision-modal-title">
                    {decisionModalApps.length > 1
                      ? decisionModalAction === "approved"
                        ? `Accept Multiple Candidates (${decisionModalApps.length})`
                        : `Deny Multiple Candidates (${decisionModalApps.length})`
                      : decisionModalAction === "approved"
                      ? "Accept Candidate"
                      : "Deny Candidate"}
                  </h3>
                  <p className="decision-modal-sub">
                    {decisionModalApps.length > 1 ? (
                      <>Reviewing decision for <strong>{decisionModalApps.length} candidates</strong></>
                    ) : (
                      <>Candidate: <strong>{decisionModalApps[0].applicant_name}</strong> &bull; Position: <strong>{decisionModalApps[0].job_title || "Job Post"}</strong></>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="decision-close-btn"
                  disabled={isDecisionSubmitting}
                  onClick={() => setDecisionModalApps([])}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="decision-modal-body">
                {/* Multi-candidate chips if multiple */}
                {decisionModalApps.length > 1 && (
                  <div
                    className="decision-multi-candidates-box"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      marginBottom: "16px",
                      maxHeight: "110px",
                      overflowY: "auto",
                    }}
                  >
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.03em" }}>
                      Target Candidates ({decisionModalApps.length}):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {decisionModalApps.map((a) => (
                        <span
                          key={a.id}
                          className="decision-candidate-chip"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "0.76rem",
                            color: "#1e293b",
                            fontWeight: 600,
                          }}
                        >
                          <span>{a.applicant_name}</span>
                          <small style={{ color: "#64748b", fontWeight: 400 }}>({a.job_title || "Job Post"})</small>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message type selector */}
                <div className="decision-type-selector">
                  <label className="decision-field-label">Select Response Type:</label>
                  <div className="decision-options-grid">
                    <label
                      className={`decision-option-card ${decisionMessageType === "automated" ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="decisionMessageType"
                        value="automated"
                        checked={decisionMessageType === "automated"}
                        onChange={() => {
                          setDecisionMessageType("automated");
                          setDecisionMessageText(
                            getAutomatedDecisionTemplate(
                              decisionModalAction,
                              decisionModalApps.length === 1 ? decisionModalApps[0].applicant_name : "[Candidate Name]",
                              decisionModalApps[0]?.job_title || "Job Position",
                              companyLabel || "Employer",
                              customDecisionTemplates
                            )
                          );
                        }}
                      />
                      <div className="decision-option-info">
                        <strong>
                          {decisionModalApps.length > 1 ? "Automated Notice (Personalized)" : "Automated Notice"}
                        </strong>
                      </div>
                    </label>

                    <label
                      className={`decision-option-card ${decisionMessageType === "manual" ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="decisionMessageType"
                        value="manual"
                        checked={decisionMessageType === "manual"}
                        onChange={() => {
                          setDecisionMessageType("manual");
                        }}
                      />
                      <div className="decision-option-info">
                        <strong>
                          {decisionModalApps.length > 1 ? "Manual Message (Broadcast)" : "Manual Message"}
                        </strong>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Message content textarea / preview */}
                <div className="decision-message-wrapper">
                  <div className="decision-message-header">
                    <label className="decision-field-label" htmlFor="decision-msg-input">
                      {decisionMessageType === "automated"
                        ? decisionModalApps.length > 1
                          ? `Standard Notice Template (Sent individually to each candidate):`
                          : "Standard Notice Preview (Automated):"
                        : decisionModalApps.length > 1
                        ? `Custom Message Content (Sent to all ${decisionModalApps.length} candidates):`
                        : "Custom Message Content:"}
                    </label>
                  </div>

                  <textarea
                    id="decision-msg-input"
                    className={`decision-textarea ${decisionMessageType === "automated" ? "automated-preview" : ""}`}
                    rows={8}
                    readOnly={decisionMessageType === "automated"}
                    value={decisionMessageType === "automated" ? decisionMessageText : manualMessageText}
                    onChange={(e) => {
                      if (decisionMessageType === "manual") {
                        setManualMessageText(e.target.value);
                      }
                    }}
                    placeholder={
                      decisionMessageType === "manual"
                        ? decisionModalApps.length > 1
                          ? "Enter your message to be sent to all selected candidates..."
                          : "Enter your personalized message to the applicant..."
                        : ""
                    }
                  />
                  <div className="decision-message-footnote" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    {decisionMessageType === "manual" ? (
                      <span>{manualMessageText.length} characters written.</span>
                    ) : decisionModalApps.length > 1 ? (
                      <span style={{ color: "#0284c7", fontWeight: 600 }}>
                        EliteCruit will automatically substitute each candidate's real name upon sending.
                      </span>
                    ) : (
                      <span />
                    )}
                    <a
                      href="/employer-notices-faqs"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.78rem", color: "#0284c7", fontWeight: 600, textDecoration: "none", marginLeft: "auto" }}
                    >
                      Configure master templates in Notices &amp; FAQs ↗
                    </a>
                  </div>
                </div>
              </div>

              <div className="decision-modal-footer">
                <button
                  type="button"
                  className="decision-cancel-btn"
                  disabled={isDecisionSubmitting}
                  onClick={() => setDecisionModalApps([])}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`decision-confirm-btn ${decisionModalAction}`}
                  disabled={isDecisionSubmitting || (decisionMessageType === "manual" && !manualMessageText.trim())}
                  onClick={handleConfirmDecision}
                >
                  {isDecisionSubmitting
                    ? `Submitting Decision${decisionModalApps.length > 1 ? ` (${decisionModalApps.length})` : ""}...`
                    : decisionModalAction === "approved"
                    ? decisionModalApps.length > 1
                      ? `Confirm Acceptance (${decisionModalApps.length})`
                      : "Confirm Acceptance"
                    : decisionModalApps.length > 1
                    ? `Confirm Denial (${decisionModalApps.length})`
                    : "Confirm Denial"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RULE 6 COMPLIANT WARNING POPUP MODAL ── */}
        {warningPopup && (
          <div className="system-popup-overlay" onClick={() => setWarningPopup("")}>
            <div className="system-popup-card" onClick={(e) => e.stopPropagation()}>
              <div className="system-popup-icon-wrap warning">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ca8a04" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="system-popup-title">Warning</h3>
              <p className="system-popup-message">{warningPopup}</p>
              <div className="system-popup-actions">
                <button type="button" className="system-popup-btn" onClick={() => setWarningPopup("")}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Confirm Logout"
        message="Are you sure you want to log out of your employer account?"
        confirmText="Yes, Log Out"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/";
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}

