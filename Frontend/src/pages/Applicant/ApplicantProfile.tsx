import React, { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronIcon, DownloadIcon, SideIcon } from "../../components/Icons";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ImageAdjustModal from "../../components/ImageAdjustModal";
import ApplicantDocumentsModal from "../../components/ApplicantDocumentsModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import UndoToast from "../../components/UndoToast";
import { resolveLocalGeocodeDetailed } from "../../data/mapData";
import {
  BSIT_BSCS_JOB_TITLES,
  CATEGORIZED_JOB_ROLES,
  ALL_MULTI_INDUSTRY_JOB_ROLES,
  BSIT_BSCS_SKILLS,
  BSIT_BSCS_QUALIFICATIONS,
  BSIT_BSCS_CERTIFICATIONS,
  ALL_UNIFIED_SKILLS,
  ALL_UNIFIED_QUALIFICATIONS,
  ALL_UNIFIED_CERTIFICATIONS,
  SKILLS_COURSE_TAXONOMY_MAP,
  CERTIFICATION_CATEGORIES,
  CERTIFICATION_CATEGORIES_MAP,
  CAVITE_CITIES,
  ALL_PHILIPPINES_PROVINCES,
  getCitiesByProvince,
  PHILIPPINES_UNIVERSITIES_COLLEGES,
  PHILIPPINES_SENIOR_HIGH_SCHOOLS,
  fetchPhilippineUniversitiesApi,
  MULTI_INDUSTRY_COURSES,
  SHS_STRANDS_TAXONOMY,
  TESDA_VOCATIONAL_CERTIFICATIONS,
  WORK_ARRANGEMENTS,
  EXPERIENCE_LEVELS,
  EXP_YEARS_OPTIONS,
  formatLocationWithCavite,
  parseCompetencyDisplayTags,
  parsePreferredLocationTags,
  PREFERRED_LOCATION_OPTIONS,
} from "../../utils/filters";
import "./Applicant-Dashboard.css";
import "./ApplicantProfile.css";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import { usePendingInvitationsCount } from "../../hooks/usePendingInvitationsCount";

const ALL_SKILLS_OPTIONS = ALL_UNIFIED_SKILLS;

const ALL_QUALIFICATIONS_OPTIONS = ALL_UNIFIED_QUALIFICATIONS;

const ALL_CERTIFICATIONS_OPTIONS = ALL_UNIFIED_CERTIFICATIONS;

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS_LIST = Array.from({ length: 47 }, (_, i) => String(2026 - i));

const GRADUATE_DEGREE_OPTIONS = [
  "Doctor of Philosophy (PhD) in Computer Science",
  "Doctor in Information Technology (DIT)",
  "Doctor of Engineering (DEng)",
  "Master of Science in Information Technology (MSIT)",
  "Master of Science in Computer Science (MSCS)",
  "Master in Information Technology (MIT)",
  "Master of Business Administration (MBA)",
  "Master of Science in Data Science",
  "Master of Science in Cybersecurity",
  "Master of Engineering in Computer Engineering (MEng)"
];

export interface WorkExpItem {
  id: string;
  title: string;
  company: string;
  province: string;
  city: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  isCurrent: boolean;
  employmentType: string;
  responsibilities: string;
  skills: string[];
}

export type TargetRolePreferenceItem = {
  id: string;
  category?: string;
  title: string;
  work_arrangements: string[];
  salary_min: string | number;
  salary_max: string | number;
  hide_salary: boolean;
};

export const JOB_CATEGORIES_LIST = Object.keys(CATEGORIZED_JOB_ROLES);

export function getCategoryForRole(roleTitle: string): string {
  if (!roleTitle) return "Other Specializations";
  const clean = roleTitle.trim().toLowerCase();
  for (const [cat, roles] of Object.entries(CATEGORIZED_JOB_ROLES)) {
    if (roles.some((r) => r.toLowerCase() === clean)) {
      return cat;
    }
  }
  return "Other Specializations";
}

type ApplicantProfileData = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  gender?: string | null;
  email: string | null;
  phone: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  summary: string | null;
  languages: string | null;
  preferred_locations: string | null;
  desired_job_title: string | null;
  expected_salary: string | null;
  expected_salary_min?: string | number | null;
  expected_salary_max?: string | number | null;
  hide_salary?: boolean | number;
  target_roles_json?: string | null;
  work_arrangement: string | null;
  years_of_experience: string | null;
  skills: string | null;
  certifications: string | null;
  qualifications: string | null;
  work_experience_json?: string | null;
  resume_path: string | null;
  profile_picture_path: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  nearby_location?: string | null;
  is_email_verified?: boolean;
};

const emptyProfile: ApplicantProfileData = {
  first_name: null,
  middle_name: null,
  last_name: null,
  gender: "Prefer not to say",
  email: null,
  phone: null,
  province: "Cavite",
  city: null,
  address: null,
  summary: null,
  languages: null,
  preferred_locations: null,
  desired_job_title: null,
  expected_salary: null,
  expected_salary_min: null,
  expected_salary_max: null,
  hide_salary: false,
  target_roles_json: null,
  work_arrangement: null,
  years_of_experience: null,
  skills: null,
  certifications: null,
  qualifications: null,
  work_experience_json: null,
  resume_path: null,
  profile_picture_path: null,
  latitude: null,
  longitude: null,
  nearby_location: null,
  is_email_verified: false,
};

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const DESIRED_JOB_TITLES = BSIT_BSCS_JOB_TITLES;

type ItemWithExp = {
  name: string;
  years: string;
};

function parseItemsWithExp(raw?: string | null): ItemWithExp[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p) => {
          if (typeof p === "object" && p !== null && p.name) {
            const cleanName = String(p.name).replace(/^[()]+|[()]+$/g, "").trim();
            return { name: cleanName, years: p.years || p.year || "2026" };
          }
          const cleanStr = String(p).replace(/^[()]+|[()]+$/g, "").trim();
          return { name: cleanStr, years: "2026" };
        })
        .filter((item) => Boolean(item.name));
    }
  } catch {}

  return raw
    .split(/[\n,;•|]+/)
    .map((s) => s.trim().replace(/^[()]+|[()]+$/g, "").trim())
    .filter(Boolean)
    .map((token) => ({ name: token, years: "2026" }));
}

function fileNameFromPath(raw: string | null | undefined) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}

function formatCurrencyInput(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const raw = String(value).replace(/,/g, "").replace(/[^0-9.]/g, "").trim();
  if (!raw) return "";
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return "";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseSalaryInteger(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const raw = String(value).replace(/,/g, "").replace(/[^0-9.]/g, "").trim();
  if (!raw) return "";
  const amount = Number(raw);
  if (Number.isFinite(amount) && amount >= 0) {
    return String(Math.round(amount));
  }
  return "";
}

function computeNextArrangements(current: string[] = [], clickedArr: string): string[] {
  if (clickedArr === "Hybrid") {
    if (current.includes("Hybrid")) {
      return current.filter((a) => a !== "Hybrid");
    } else {
      // when hybrid is clicked it will immediately highlight the other two
      return ["Remote", "On-Site", "Hybrid"];
    }
  }

  // Clicked Remote or On-Site
  const isSelected = current.includes(clickedArr);
  let next = isSelected
    ? current.filter((a) => a !== clickedArr)
    : [...current, clickedArr];

  // and when one of them is not selected the hybrid will be removed
  if (!next.includes("Remote") || !next.includes("On-Site")) {
    next = next.filter((a) => a !== "Hybrid");
  }

  return next;
}

function getSalaryRangeError(
  minVal?: string | number | null,
  maxVal?: string | number | null,
  lastField: "min" | "max" = "max"
): string {
  if (minVal == null || maxVal == null) return "";
  const rawMin = String(minVal).replace(/[^0-9.]/g, "").trim();
  const rawMax = String(maxVal).replace(/[^0-9.]/g, "").trim();
  if (!rawMin || !rawMax) return "";
  const numMin = Number(rawMin);
  const numMax = Number(rawMax);
  if (!Number.isFinite(numMin) || !Number.isFinite(numMax)) return "";
  if (numMax < numMin) {
    if (lastField === "min") {
      return "Minimum salary cannot be greater than maximum salary.";
    }
    return "Maximum salary cannot be less than minimum salary.";
  }
  return "";
}

function normalizePhoneNumber(raw?: string | null): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  while (digits.startsWith("63") && digits.length > 10) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

function buildConsolidatedSalaryString(
  minVal: string | number | null | undefined,
  maxVal: string | number | null | undefined
): string | null {
  const minRaw = minVal !== null && minVal !== undefined ? String(minVal).replace(/,/g, "").replace(/[^0-9.]/g, "").trim() : "";
  const maxRaw = maxVal !== null && maxVal !== undefined ? String(maxVal).replace(/,/g, "").replace(/[^0-9.]/g, "").trim() : "";

  const nMin = minRaw ? Number(minRaw) : null;
  const nMax = maxRaw ? Number(maxRaw) : null;

  const validMin = nMin !== null && Number.isFinite(nMin) && nMin > 0 ? nMin : null;
  const validMax = nMax !== null && Number.isFinite(nMax) && nMax > 0 ? nMax : null;

  if (validMin && validMax) {
    const formattedMin = validMin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedMax = validMax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (validMin === validMax) {
      return formattedMin;
    }
    return `${formattedMin} - ${formattedMax}`;
  }

  if (validMin) {
    return validMin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (validMax) {
    return validMax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return null;
}

function Field({
  label,
  value,
  name,
  editing,
  onChange,
  onBlur,
  prefix,
  numbersOnly = false,
  maxLength,
  wide = false,
  currencyFormat = false,
  placeholder,
  hasError = false,
  optional = false,
}: {
  label: string;
  value: string | number | null | undefined;
  name: keyof ApplicantProfileData;
  editing: boolean;
  onChange: (name: keyof ApplicantProfileData, value: string) => void;
  onBlur?: () => void;
  prefix?: string;
  numbersOnly?: boolean;
  maxLength?: number;
  wide?: boolean;
  currencyFormat?: boolean;
  placeholder?: string;
  hasError?: boolean;
  optional?: boolean;
}) {
  const maxDigits = name === "phone" ? 10 : maxLength;
  const strVal = value !== null && value !== undefined ? String(value) : "";
  const isMissing = !optional && !strVal.trim();
  const rawNum = numbersOnly ? strVal.replace(/\D/g, "") : strVal;
  const inputValue = currencyFormat
    ? editing
      ? strVal.replace(/,/g, "").replace(/[^0-9.]/g, "")
      : formatCurrencyInput(strVal)
    : numbersOnly
      ? maxDigits ? rawNum.slice(0, maxDigits) : rawNum
      : strVal;

  return (
    <label className={`${wide ? "profile-field wide" : "profile-field"} ${hasError ? "missing-field" : ""}`}>
      <span>{label}</span>
      <div className={prefix ? "input-prefix-wrap" : ""}>
        {prefix && <b>{prefix}</b>}
        <input
          value={inputValue}
          readOnly={!editing}
          inputMode={numbersOnly || currencyFormat ? "numeric" : undefined}
          maxLength={maxDigits}
          onChange={(event) => {
            if (currencyFormat) {
              const val = event.target.value.replace(/,/g, "").trim();
              const numOnly = val.replace(/[^0-9.]/g, "");
              onChange(name, numOnly);
              return;
            }
            let nextVal = numbersOnly ? event.target.value.replace(/\D/g, "") : event.target.value;
            if (maxDigits && numbersOnly) {
              nextVal = nextVal.slice(0, maxDigits);
            }
            onChange(name, nextVal);
          }}
          onBlur={onBlur}
          placeholder={placeholder || (optional ? "Optional" : "Not provided")}
        />
      </div>
    </label>
  );
}

interface SearchableSelectProps {
  options: string[];
  groupedOptions?: Record<string, string[]>;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onEnterAdd?: () => void;
  onSelectOption?: (value: string) => void;
  disabled?: boolean;
}

function SearchableSelect({
  options,
  groupedOptions,
  placeholder = "Type or select option...",
  value,
  onChange,
  onEnterAdd,
  onSelectOption,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 230;
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!isUserTyping || !value || !value.trim()) return options;
    const q = value.trim().toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, value, isUserTyping]);

  const groupedSections = useMemo(() => {
    if (!groupedOptions) return null;
    const sections: { category: string; items: { opt: string; originalIndex: number }[] }[] = [];
    const assigned = new Set<string>();

    for (const [category, items] of Object.entries(groupedOptions)) {
      const matchingItems: { opt: string; originalIndex: number }[] = [];
      items.forEach((item) => {
        const itemLower = item.toLowerCase();
        const foundIdx = filteredOptions.findIndex((fo) => fo.toLowerCase() === itemLower);
        if (foundIdx !== -1) {
          matchingItems.push({ opt: filteredOptions[foundIdx], originalIndex: foundIdx });
          assigned.add(itemLower);
        }
      });
      if (matchingItems.length > 0) {
        sections.push({ category, items: matchingItems });
      }
    }

    const leftovers: { opt: string; originalIndex: number }[] = [];
    filteredOptions.forEach((opt, idx) => {
      if (!assigned.has(opt.toLowerCase())) {
        leftovers.push({ opt, originalIndex: idx });
      }
    });
    if (leftovers.length > 0) {
      sections.push({ category: "Other Specializations", items: leftovers });
    }

    return sections;
  }, [groupedOptions, filteredOptions]);

  const exactMatch = useMemo(() => {
    return options.some((opt) => opt.toLowerCase() === value.trim().toLowerCase());
  }, [options, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsUserTyping(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (optionText: string) => {
    setIsUserTyping(false);
    onChange(optionText);
    onSelectOption?.(optionText);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsUserTyping(false);
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
        setIsUserTyping(false);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsUserTyping(false);
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
            setIsUserTyping(true);
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsUserTyping(false);
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          className={`combobox-caret-btn ${isOpen ? "open" : ""}`}
          onClick={() => {
            if (!disabled) {
              setIsUserTyping(false);
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
        <ul className={`combobox-dropdown-menu ${openUp ? "open-top" : ""}`} role="listbox">
          {groupedSections ? (
            groupedSections.length > 0 ? (
              groupedSections.map((sec) => (
                <React.Fragment key={sec.category}>
                  <li className="combobox-group-header" role="presentation">
                    {sec.category}
                  </li>
                  {sec.items.map(({ opt, originalIndex }) => {
                    const isHighlighted = originalIndex === highlightedIndex;
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
                        onMouseEnter={() => setHighlightedIndex(originalIndex)}
                      >
                        <span className="option-text">{opt}</span>
                        {isSelected && <span className="option-check">✓</span>}
                      </li>
                    );
                  })}
                </React.Fragment>
              ))
            ) : (
              <li className="combobox-no-matches">
                No matching standard options found.
              </li>
            )
          ) : filteredOptions.length > 0 ? (
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

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;

const ALL_NUMERIC_YEARS: string[] = (() => {
  const list: string[] = [];
  for (let y = CURRENT_YEAR; y >= MIN_YEAR; y--) {
    list.push(String(y));
  }
  return list;
})();

const YEAR_OPTIONS = [
  "Present",
  ...Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR + 2 - i)),
];

const EXPIRATION_YEAR_OPTIONS = [
  "No Expiry",
  ...Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR + 10 - i)),
];

function getValidStartOptions(currentEndYear: string): string[] {
  const maxAllowed = parseInt(currentEndYear, 10);
  if (isNaN(maxAllowed)) return ALL_NUMERIC_YEARS;

  return ALL_NUMERIC_YEARS.filter((yrStr) => {
    const y = parseInt(yrStr, 10);
    return y <= maxAllowed;
  });
}

function getValidEndOptions(currentStartYear: string): string[] {
  const minAllowed = parseInt(currentStartYear, 10);
  if (isNaN(minAllowed)) return ALL_NUMERIC_YEARS;

  return ALL_NUMERIC_YEARS.filter((yrStr) => {
    const y = parseInt(yrStr, 10);
    return y >= minAllowed;
  });
}

type StartEndItem = {
  name: string;
  startYear: string;
  endYear: string;
};

function parseStartEndItems(raw?: string | null): StartEndItem[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 5).map((p) => {
        if (typeof p === "object" && p !== null && p.name) {
          const yrs = String(p.years || p.period || "");
          const parts = yrs.split(/\s*-\s*/);
          const endStr = parts[1] ? parts[1].trim() : String(CURRENT_YEAR);
          return {
            name: p.name,
            startYear: parts[0] ? parts[0].trim() : "2020",
            endYear: endStr === "Present / Ongoing" ? String(CURRENT_YEAR) : endStr,
          };
        }
        return { name: String(p), startYear: "2020", endYear: String(CURRENT_YEAR) };
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
        const name = match[1].trim();
        const periodStr = match[2].trim();
        const parts = periodStr.split(/\s*-\s*/);
        const endStr = parts[1] ? parts[1].trim() : String(CURRENT_YEAR);
        return {
          name,
          startYear: parts[0] ? parts[0].trim() : "2020",
          endYear: endStr === "Present / Ongoing" ? String(CURRENT_YEAR) : endStr,
        };
      }
      return { name: token, startYear: "2020", endYear: String(CURRENT_YEAR) };
    });
}

function StartEndYearCardEditor({
  title,
  options,
  rawString,
  onSave,
  disabled,
}: {
  title: string;
  options: string[];
  rawString: string | null;
  onSave: (items: string[]) => Promise<boolean>;
  disabled: boolean;
}) {
  const items = useMemo(() => parseStartEndItems(rawString), [rawString]);
  const [inputValue, setInputValue] = useState("");
  const [selectedStart, setSelectedStart] = useState("2010");
  const [selectedEnd, setSelectedEnd] = useState("2026");
  const [yearError, setYearError] = useState("");

  const availableOptions = useMemo(
    () => options.filter((opt) => !items.some((it) => it.name.toLowerCase() === opt.toLowerCase())),
    [options, items]
  );

  const isMaxReached = items.length >= 5;

  const handleAddItem = async () => {
    if (isMaxReached) return;
    const nameToAdd = inputValue.trim();
    if (!nameToAdd) return;
    if (items.some((it) => it.name.toLowerCase() === nameToAdd.toLowerCase())) return;

    const newItems: StartEndItem[] = [
      ...items,
      { name: nameToAdd, startYear: selectedStart, endYear: selectedEnd },
    ];
    const formatted = newItems.map((it) => `${it.name} (${it.startYear} - ${it.endYear})`);
    const ok = await onSave(formatted);
    if (ok) {
      setInputValue("");
    }
  };

  const handleRemoveItem = async (indexToRemove: number) => {
    const newItems = items.filter((_, idx) => idx !== indexToRemove);
    const formatted = newItems.map((it) => `${it.name} (${it.startYear} - ${it.endYear})`);
    await onSave(formatted);
  };

  const handleUpdatePeriod = async (indexToUpdate: number, newStart: string, newEnd: string) => {
    let validStart = newStart;
    let validEnd = newEnd;

    const sNum = parseInt(newStart, 10);
    const eNum = parseInt(newEnd, 10);
    if (!isNaN(sNum) && !isNaN(eNum) && sNum > eNum) {
      validEnd = newStart;
    }

    const newItems = items.map((it, idx) =>
      idx === indexToUpdate ? { ...it, startYear: validStart, endYear: validEnd } : it
    );
    const formatted = newItems.map((it) => `${it.name} (${it.startYear} - ${it.endYear})`);
    await onSave(formatted);
  };

  const handleStartChange = (newStart: string) => {
    setSelectedStart(newStart);
    const sNum = parseInt(newStart, 10);
    const eNum = parseInt(selectedEnd, 10);
    if (!isNaN(sNum) && !isNaN(eNum) && sNum > eNum) {
      setSelectedEnd(newStart);
    }
  };

  const handleEndChange = (newEnd: string) => {
    setSelectedEnd(newEnd);
    const sNum = parseInt(selectedStart, 10);
    const eNum = parseInt(newEnd, 10);
    if (!isNaN(sNum) && !isNaN(eNum) && sNum > eNum) {
      setSelectedStart(newEnd);
    }
  };

  return (
    <article className="profile-card exp-category-card">
      <div className="category-card-header">
        <strong>{title}</strong>
        <span className={`category-count-badge ${isMaxReached ? "count-max" : ""}`}>
          {items.length} / 5 Selected
        </span>
      </div>

      <div className="selected-items-list">
        {items.length === 0 ? (
          <div className="empty-category-notice">No items selected yet. Type or select up to 5 below.</div>
        ) : (
          items.map((item, idx) => {
            const validStartOpts = getValidStartOptions(item.endYear);
            const validEndOpts = getValidEndOptions(item.startYear);
            return (
              <div key={`${item.name}-${idx}`} className="exp-item-chip">
                <span className="exp-item-name">{item.name}</span>
                <div className="exp-badge-group">
                  <span className="exp-label-text">From:</span>
                  <select
                    className="exp-years-select"
                    value={item.startYear}
                    disabled={disabled}
                    onChange={(e) => handleUpdatePeriod(idx, e.target.value, item.endYear)}
                  >
                    {validStartOpts.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  <span className="exp-label-text">To:</span>
                  <select
                    className="exp-years-select"
                    value={item.endYear}
                    disabled={disabled}
                    onChange={(e) => handleUpdatePeriod(idx, item.startYear, e.target.value)}
                  >
                    {validEndOpts.map((yr) => (
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
                  disabled={disabled}
                  title={`Remove ${item.name}`}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      {!isMaxReached ? (
        <div className="add-item-controls">
          <SearchableSelect
            options={availableOptions}
            value={inputValue}
            placeholder={`Type or select ${title.toLowerCase()}...`}
            disabled={disabled}
            onChange={setInputValue}
            onEnterAdd={handleAddItem}
          />

          <div className="add-years-group">
            <span>From:</span>
            <select
              className="add-years-select"
              value={selectedStart}
              disabled={disabled}
              onChange={(e) => handleStartChange(e.target.value)}
            >
              {getValidStartOptions(selectedEnd).map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <span>To:</span>
            <select
              className="add-years-select"
              value={selectedEnd}
              disabled={disabled}
              onChange={(e) => handleEndChange(e.target.value)}
            >
              {getValidEndOptions(selectedStart).map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          {yearError && <p className="edu-year-error" style={{ color: "#ef4444", fontSize: "0.82rem", margin: "4px 0 0", width: "100%" }}>{yearError}</p>}

          <button
            type="button"
            className="add-item-btn"
            onClick={handleAddItem}
            disabled={disabled || !inputValue.trim()}
          >
            + Add
          </button>
        </div>
      ) : (
        <div className="max-limit-reached-banner">
          Maximum of 5 items reached for this category. Remove an item above to add another.
        </div>
      )}
    </article>
  );
}

type EduItemWithSchool = {
  name: string;
  school: string;
  startYear: string;
  endYear: string;
  level: "graduate" | "college" | "shs";
};

function parseEduSchoolItems(raw?: string | null): EduItemWithSchool[] {
  if (!raw || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => {
        if (typeof p === "object" && p !== null && p.name) {
          const yrs = String(p.years || p.period || "");
          const parts = yrs.split(/\s*-\s*/);
          const endStr = parts[1] ? parts[1].trim() : String(CURRENT_YEAR);
          const nameStr = String(p.name);
          const isShs = p.level === "shs" || nameStr.includes("Senior High") || nameStr.includes("TVL") || nameStr.includes("STEM") || nameStr.includes("ABM") || nameStr.includes("HUMSS") || nameStr.includes("TESDA");
          return {
            name: nameStr,
            school: p.school || "",
            startYear: parts[0] ? parts[0].trim() : "2020",
            endYear: endStr === "Present / Ongoing" ? String(CURRENT_YEAR) : endStr,
            level: isShs ? "shs" : "college",
          };
        }
        const strVal = String(p);
        const isShs = strVal.includes("Senior High") || strVal.includes("TVL") || strVal.includes("STEM") || strVal.includes("ABM") || strVal.includes("HUMSS") || strVal.includes("TESDA");
        return { name: strVal, school: "", startYear: "2020", endYear: String(CURRENT_YEAR), level: isShs ? "shs" : "college" };
      });
    }
  } catch {}

  return raw
    .split(/[\n,;•|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const isShsTag = token.includes("[SHS]") || token.includes("Senior High") || token.includes("TVL") || token.includes("STEM") || token.includes("ABM") || token.includes("HUMSS") || token.includes("TESDA");
      const cleanToken = token.replace(/\[SHS\]/g, "").replace(/\[College\]/g, "").trim();

      const atMatch = cleanToken.match(/^(.*?)\s*@\s*(.*?)\s*\((.*?)\)$/);
      if (atMatch) {
        const name = atMatch[1].trim();
        const school = atMatch[2].trim();
        const periodStr = atMatch[3].trim();
        const parts = periodStr.split(/\s*-\s*/);
        const endStr = parts[1] ? parts[1].trim() : String(CURRENT_YEAR);
        return {
          name,
          school,
          startYear: parts[0] ? parts[0].trim() : "2020",
          endYear: endStr === "Present / Ongoing" ? String(CURRENT_YEAR) : endStr,
          level: isShsTag ? "shs" : "college",
        };
      }
      const match = cleanToken.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        const name = match[1].trim();
        const periodStr = match[2].trim();
        const parts = periodStr.split(/\s*-\s*/);
        const endStr = parts[1] ? parts[1].trim() : String(CURRENT_YEAR);
        return {
          name,
          school: "",
          startYear: parts[0] ? parts[0].trim() : "2020",
          endYear: endStr === "Present / Ongoing" ? String(CURRENT_YEAR) : endStr,
          level: isShsTag ? "shs" : "college",
        };
      }
      return { name: cleanToken, school: "", startYear: "2020", endYear: String(CURRENT_YEAR), level: isShsTag ? "shs" : "college" };
    });
}

function EduSchoolCardEditor({
  title,
  level,
  qualificationOptions,
  schoolOptions,
  rawString,
  onSaveAll,
  disabled,
  placeholderDegree = "Type or select degree / course...",
  placeholderSchool = "Type or select school name...",
}: {
  title: string;
  level: "graduate" | "college" | "shs";
  qualificationOptions: string[];
  schoolOptions: string[];
  rawString: string | null;
  onSaveAll: (allItems: string[]) => Promise<boolean>;
  disabled: boolean;
  placeholderDegree?: string;
  placeholderSchool?: string;
}) {
  const allItems = useMemo(() => parseEduSchoolItems(rawString), [rawString]);
  const levelItems = useMemo(() => allItems.filter((it) => it.level === level), [allItems, level]);
  const otherLevelItems = useMemo(() => allItems.filter((it) => it.level !== level), [allItems, level]);

  const [degreeInput, setDegreeInput] = useState("");
  const [schoolInput, setSchoolInput] = useState("");
  const [selectedStart, setSelectedStart] = useState("2010");
  const [selectedEnd, setSelectedEnd] = useState("2026");
  const [yearError, setYearError] = useState("");

  const handleAddItem = async () => {
    const nameToAdd = degreeInput.trim();
    if (!nameToAdd) return;

    const startNum = parseInt(selectedStart, 10);
    const endNum = parseInt(selectedEnd, 10);
    if (!isNaN(startNum) && !isNaN(endNum) && endNum < startNum) {
      setYearError("End year cannot be earlier than start year.");
      return;
    }
    setYearError("");

    const schoolToAdd = schoolInput.trim();
    const newItem: EduItemWithSchool = {
      name: nameToAdd,
      school: schoolToAdd,
      startYear: selectedStart,
      endYear: selectedEnd,
      level,
    };

    const updatedLevelItems = [...levelItems, newItem];
    const combined = [...otherLevelItems, ...updatedLevelItems];
    const formatted = combined.map((it) => {
      const levelTag = it.level === "graduate" ? "Graduate" : it.level === "shs" ? "SHS" : "College";
      return it.school
        ? `${it.name} @ ${it.school} (${it.startYear} - ${it.endYear}) [${levelTag}]`
        : `${it.name} (${it.startYear} - ${it.endYear}) [${levelTag}]`;
    });

    const ok = await onSaveAll(formatted);
    if (ok) {
      setDegreeInput("");
      setSchoolInput("");
      setYearError("");
    }
  };

  const handleRemoveItem = async (indexToRemove: number) => {
    const updatedLevelItems = levelItems.filter((_, idx) => idx !== indexToRemove);
    const combined = [...otherLevelItems, ...updatedLevelItems];
    const formatted = combined.map((it) =>
      it.school
        ? `${it.name} @ ${it.school} (${it.startYear} - ${it.endYear}) [${it.level === "shs" ? "SHS" : "College"}]`
        : `${it.name} (${it.startYear} - ${it.endYear}) [${it.level === "shs" ? "SHS" : "College"}]`
    );
    await onSaveAll(formatted);
  };

  const handleUpdateStart = async (indexToUpdate: number, newStart: string) => {
    const item = levelItems[indexToUpdate];
    if (item) {
      const sNum = parseInt(newStart, 10);
      const eNum = parseInt(item.endYear, 10);
      if (!isNaN(sNum) && !isNaN(eNum) && sNum > eNum) {
        setYearError("Start year cannot be later than end year.");
        return;
      }
    }
    setYearError("");

    const updatedLevelItems = levelItems.map((it, idx) =>
      idx === indexToUpdate ? { ...it, startYear: newStart } : it
    );
    const combined = [...otherLevelItems, ...updatedLevelItems];
    const formatted = combined.map((it) =>
      it.school
        ? `${it.name} @ ${it.school} (${it.startYear} - ${it.endYear}) [${it.level === "graduate" ? "Graduate" : it.level === "shs" ? "SHS" : "College"}]`
        : `${it.name} (${it.startYear} - ${it.endYear}) [${it.level === "graduate" ? "Graduate" : it.level === "shs" ? "SHS" : "College"}]`
    );
    await onSaveAll(formatted);
  };

  const handleUpdateEnd = async (indexToUpdate: number, newEnd: string) => {
    const item = levelItems[indexToUpdate];
    if (item) {
      const sNum = parseInt(item.startYear, 10);
      const eNum = parseInt(newEnd, 10);
      if (!isNaN(sNum) && !isNaN(eNum) && eNum < sNum) {
        setYearError("End year cannot be earlier than start year.");
        return;
      }
    }
    setYearError("");

    const updatedLevelItems = levelItems.map((it, idx) =>
      idx === indexToUpdate ? { ...it, endYear: newEnd } : it
    );
    const combined = [...otherLevelItems, ...updatedLevelItems];
    const formatted = combined.map((it) =>
      it.school
        ? `${it.name} @ ${it.school} (${it.startYear} - ${it.endYear}) [${it.level === "graduate" ? "Graduate" : it.level === "shs" ? "SHS" : "College"}]`
        : `${it.name} (${it.startYear} - ${it.endYear}) [${it.level === "graduate" ? "Graduate" : it.level === "shs" ? "SHS" : "College"}]`
    );
    await onSaveAll(formatted);
  };

  return (
    <article className="profile-card exp-category-card">
      <div className="category-card-header">
        <strong>{title}</strong>
        <span className="category-count-badge">
          {levelItems.length} Selected
        </span>
      </div>

      <div className="selected-items-list">
        {levelItems.length === 0 ? (
          <div className="empty-category-notice">No entries added yet. Select school and course/qualification below.</div>
        ) : (
          levelItems.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="exp-item-chip">
              {item.school && (
                <span className="exp-course-badge" title={`School: ${item.school}`}>
                  {item.school}
                </span>
              )}
              <span className="exp-item-name">{item.name}</span>
              <div className="exp-badge-group">
                <span className="exp-label-text">From:</span>
                <select
                  className="exp-years-select"
                  value={item.startYear}
                  disabled={disabled}
                  onChange={(e) => handleUpdateStart(idx, e.target.value)}
                >
                  {YEAR_OPTIONS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <span className="exp-label-text">To:</span>
                <select
                  className="exp-years-select"
                  value={item.endYear}
                  disabled={disabled}
                  onChange={(e) => handleUpdateEnd(idx, e.target.value)}
                >
                  {YEAR_OPTIONS.map((yr) => (
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
                disabled={disabled}
                title={`Remove ${item.name}`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="add-item-controls">
        <SearchableSelect
          options={schoolOptions}
          value={schoolInput}
          placeholder={placeholderSchool}
          disabled={disabled}
          onChange={setSchoolInput}
          onEnterAdd={handleAddItem}
        />
        <SearchableSelect
          options={qualificationOptions}
          value={degreeInput}
          placeholder={placeholderDegree}
          disabled={disabled}
          onChange={setDegreeInput}
          onEnterAdd={handleAddItem}
        />

        <div className="add-years-group">
          <span>From:</span>
          <select
            className="add-years-select"
            value={selectedStart}
            disabled={disabled}
            onChange={(e) => { setSelectedStart(e.target.value); setYearError(""); }}
          >
            {YEAR_OPTIONS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <span>To:</span>
          <select
            className="add-years-select"
            value={selectedEnd}
            disabled={disabled}
            onChange={(e) => { setSelectedEnd(e.target.value); setYearError(""); }}
          >
            {YEAR_OPTIONS.map((yr) => (
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
          disabled={disabled || !degreeInput.trim()}
        >
          + Add
        </button>
      </div>
      {yearError && (
        <div style={{ color: "#dc2626", fontSize: "0.82rem", fontWeight: 600, marginTop: "6px", padding: "0 4px" }}>
          ⚠ {yearError}
        </div>
      )}
    </article>
  );
}

const SKILL_COURSE_MAP: Record<string, string[]> = SKILLS_COURSE_TAXONOMY_MAP;

const SKILL_COURSES = Object.keys(SKILLS_COURSE_TAXONOMY_MAP);

type CourseSkillItem = {
  name: string;
  course: string;
  year: string;
};

function parseSingleCourseSkillToken(token: string): CourseSkillItem {
  const courseMatch = token.match(/^(.*?)\s*\[(.*?)\]\s*\((.*?)\)$/);
  if (courseMatch) {
    const cleanYear = courseMatch[3].replace(/^Since\s*/i, "").replace(/^Acquired\s*/i, "").trim();
    return {
      name: courseMatch[1].trim(),
      course: courseMatch[2].trim() || "General IT",
      year: cleanYear || "2026",
    };
  }
  const bracketOnly = token.match(/^(.*?)\s*\[(.*?)\]$/);
  if (bracketOnly) {
    return {
      name: bracketOnly[1].trim(),
      course: bracketOnly[2].trim() || "General IT",
      year: "2026",
    };
  }
  const match = token.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    const cleanYear = match[2].replace(/^Since\s*/i, "").replace(/^Acquired\s*/i, "").trim();
    return {
      name: match[1].trim(),
      course: "General IT",
      year: cleanYear || "2026",
    };
  }
  return { name: token.trim(), course: "General IT", year: "2026" };
}

function parseCourseSkillItems(raw?: string | null): CourseSkillItem[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p) => {
          if (typeof p === "object" && p !== null && p.name) {
            return {
              name: String(p.name).trim(),
              course: p.course || "General IT",
              year: p.year || p.years || "2026",
            };
          }
          return parseSingleCourseSkillToken(String(p));
        })
        .filter((item) => Boolean(item.name));
    }
  } catch {}

  return raw
    .split(/[\n,;•|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseSingleCourseSkillToken)
    .filter((item) => Boolean(item.name));
}

function CourseSkillsEditor({
  title,
  rawString,
  onSave,
  disabled,
}: {
  title: string;
  rawString: string | null;
  onSave: (items: string[]) => Promise<boolean>;
  disabled: boolean;
}) {
  const items = useMemo(() => parseCourseSkillItems(rawString), [rawString]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026");

  // Track which category has its popup list open
  const [activePopupCategory, setActivePopupCategory] = useState<string | null>(null);

  // Group items by course/category preserving original index for accurate mutations
  const groupedSkills = useMemo(() => {
    const groups: { [cat: string]: { item: CourseSkillItem; originalIndex: number }[] } = {};
    items.forEach((item, originalIndex) => {
      let cat = item.course && item.course.trim() ? item.course.trim() : "General IT";
      if (cat === "BS Information Technology") cat = "Web & Software Development";
      if (cat === "BS Computer Science") cat = "Programming & Algorithms";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push({ item, originalIndex });
    });
    return groups;
  }, [items]);

  const courseSkills = useMemo(() => {
    return (selectedCourse && SKILL_COURSE_MAP[selectedCourse]) || ALL_SKILLS_OPTIONS;
  }, [selectedCourse]);

  const availableOptions = useMemo(
    () => courseSkills.filter((opt) => !items.some((it) => it.name.toLowerCase() === opt.toLowerCase())),
    [courseSkills, items]
  );

  const handleAddItem = async () => {
    const nameToAdd = inputValue.trim();
    if (!nameToAdd) return;
    if (items.some((it) => it.name.toLowerCase() === nameToAdd.toLowerCase())) return;

    const courseTag = selectedCourse.trim() || "General IT";
    const newItems: CourseSkillItem[] = [
      ...items,
      { name: nameToAdd, course: courseTag, year: selectedYear },
    ];
    const formatted = newItems.map((it) => `${it.name} [${it.course}] (Since ${it.year})`);
    const ok = await onSave(formatted);
    if (ok) {
      setInputValue("");
      setSelectedCourse("");
    }
  };

  const handleRemoveItem = async (indexToRemove: number) => {
    const newItems = items.filter((_, idx) => idx !== indexToRemove);
    const formatted = newItems.map((it) => `${it.name} [${it.course}] (Since ${it.year})`);
    await onSave(formatted);
    if (activePopupCategory) {
      const remaining = newItems.filter(
        (it) => (it.course && it.course.trim() ? it.course.trim() : "General IT") === activePopupCategory
      );
      if (remaining.length === 0) {
        setActivePopupCategory(null);
      }
    }
  };

  const handleUpdateYear = async (indexToUpdate: number, newYear: string) => {
    const newItems = items.map((it, idx) => (idx === indexToUpdate ? { ...it, year: newYear } : it));
    const formatted = newItems.map((it) => `${it.name} [${it.course}] (Since ${it.year})`);
    await onSave(formatted);
  };

  return (
    <article className="profile-card exp-category-card">
      <div className="category-card-header">
        <strong>{title}</strong>
        <span className="category-count-badge">
          {items.length} Selected
        </span>
      </div>

      <div className="selected-items-list">
        {items.length === 0 ? (
          <div className="empty-category-notice">No items selected yet. Select a course, pick a skill, and choose the year acquired below.</div>
        ) : (
          <div className="category-pills-row">
            {Object.entries(groupedSkills).map(([catName, groupItems]) => (
              <button
                key={catName}
                type="button"
                className={`category-popup-trigger-btn ${activePopupCategory === catName ? "active" : ""}`}
                onClick={() => setActivePopupCategory(catName)}
                title={`Click to open ${catName} skills list (${groupItems.length})`}
              >
                <span className="category-pill-name">{catName}</span>
                <span className="category-pill-badge">{groupItems.length}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* POPUP LIST MODAL FOR ACTIVE CATEGORY */}
      {activePopupCategory && groupedSkills[activePopupCategory] && (
        <div className="skill-popup-modal-overlay" onClick={() => setActivePopupCategory(null)}>
          <div
            className="skill-popup-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-modal-title"
          >
            <div className="skill-popup-modal-header">
              <div className="skill-popup-title-group">
                <span className="skill-popup-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </span>
                <h3 id="skill-modal-title" className="skill-popup-title">
                  {activePopupCategory}
                </h3>
                <span className="skill-popup-count-badge">
                  {groupedSkills[activePopupCategory].length} {groupedSkills[activePopupCategory].length === 1 ? "skill" : "skills"}
                </span>
              </div>
              <button
                type="button"
                className="skill-popup-close-btn"
                onClick={() => setActivePopupCategory(null)}
                aria-label="Close popup"
              >
                ✕
              </button>
            </div>

            <div className="skill-popup-modal-body">
              <div className="skill-popup-list">
                {groupedSkills[activePopupCategory].map(({ item, originalIndex }) => (
                  <div key={`${item.name}-${originalIndex}`} className="skill-popup-item-row">
                    <span className="skill-popup-item-name">{item.name}</span>
                    <div className="skill-popup-item-actions">
                      <span className="skill-popup-since-label">Since:</span>
                      <select
                        className="exp-years-select"
                        value={ALL_NUMERIC_YEARS.includes(item.year) ? item.year : "2026"}
                        disabled={disabled}
                        onChange={(e) => handleUpdateYear(originalIndex, e.target.value)}
                      >
                        {ALL_NUMERIC_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="exp-remove-btn"
                        onClick={() => handleRemoveItem(originalIndex)}
                        disabled={disabled}
                        title={`Remove ${item.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="skill-popup-modal-footer">
              <button
                type="button"
                className="skill-popup-done-btn"
                onClick={() => setActivePopupCategory(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="add-item-controls edu-add-controls">
        <div className="edu-inputs-row">
          <SearchableSelect
            options={SKILL_COURSES}
            value={selectedCourse}
            disabled={disabled}
            onChange={(val) => {
              setSelectedCourse(val);
              setInputValue("");
            }}
            placeholder="Select or search course category..."
          />
          <SearchableSelect
            options={availableOptions}
            value={inputValue}
            placeholder={selectedCourse.trim() ? `Select ${selectedCourse} skill...` : "Select or search skill..."}
            disabled={disabled}
            onChange={setInputValue}
            onEnterAdd={handleAddItem}
          />
        </div>

        <div className="add-years-group">
          <span>Acquired:</span>
          <select
            className="add-years-select"
            value={selectedYear}
            disabled={disabled}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {ALL_NUMERIC_YEARS.map((yr) => (
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
          disabled={disabled || !inputValue.trim()}
        >
          + Add
        </button>
      </div>
    </article>
  );
}

type CertItem = {
  name: string;
  category?: string;
  acquiredYear?: string;
  expiry: string;
};

const CERT_EXPIRY_OPTIONS = [
  "Does Not Expire",
  "Expires 2025",
  "Expires 2026",
  "Expires 2027",
  "Expires 2028",
  "Expires 2029",
  "Expires 2030",
  "Expired / Renewal Needed",
];

function parseCertItems(raw?: string | null): CertItem[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p) => {
          if (typeof p === "object" && p !== null && p.name) {
            return {
              name: String(p.name).trim(),
              category: p.category || "General",
              acquiredYear: p.acquiredYear || p.acquired || "2010",
              expiry: p.expiry || p.years || "2026",
            };
          }
          return { name: String(p).trim(), category: "General", acquiredYear: "2010", expiry: "2026" };
        })
        .filter((it) => Boolean(it.name));
    }
  } catch {}

  const splitTopLevel = (str: string): string[] => {
    const res: string[] = [];
    let current = "";
    let parenCount = 0;
    let bracketCount = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === "(") parenCount++;
      else if (char === ")") parenCount = Math.max(0, parenCount - 1);
      else if (char === "[") bracketCount++;
      else if (char === "]") bracketCount = Math.max(0, bracketCount - 1);

      if (
        (char === "," || char === "\n" || char === ";" || char === "•" || char === "|") &&
        parenCount === 0 &&
        bracketCount === 0
      ) {
        if (current.trim()) res.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) res.push(current.trim());
    return res;
  };

  const rawTokens = splitTopLevel(raw);
  const parsedItems: CertItem[] = [];
  const seenNames = new Set<string>();

  for (const token of rawTokens) {
    if (!token.trim()) continue;

    let category = "General";
    const catMatch = token.match(/\[(.*?)\]/);
    if (catMatch && catMatch[1].trim()) {
      category = catMatch[1].trim();
    }

    let acquiredYear = "2010";
    let expiry = "2026";

    const acqMatch = token.match(/\(Acquired\s*([0-9]{4})(?:[\s,-]*(?:Expiration\s*|Expires\s*|Expiry\s*)?([^\)]+))?\)/i);
    if (acqMatch) {
      if (acqMatch[1]) acquiredYear = acqMatch[1].trim();
      if (acqMatch[2]) expiry = acqMatch[2].replace(/^Expires?\s*/i, "").trim();
    } else {
      const parenMatch = token.match(/\(([^\)]+)\)$/);
      if (parenMatch) {
        const inside = parenMatch[1].trim();
        const parts = inside.split(/[-,\/]+/);
        if (parts.length > 1) {
          acquiredYear = parts[0].replace(/Acquired\s*/i, "").trim() || "2010";
          expiry = parts[1].replace(/Expires?\s*/i, "").trim() || "2026";
        } else if (/^\d{4}$/.test(inside)) {
          acquiredYear = inside;
        } else if (inside.toLowerCase().includes("expire")) {
          expiry = inside;
        }
      }
    }

    let cleanName = token;
    cleanName = cleanName.replace(/\s*\[.*?\]/g, "");
    cleanName = cleanName.replace(/\s*\(Acquired.*?\)/gi, "");
    cleanName = cleanName.replace(/\s*\(Expires.*?\)/gi, "");
    cleanName = cleanName.replace(/\s*\(Expiration.*?\)/gi, "");
    cleanName = cleanName.replace(/\s*\(.*?\)/g, "");
    cleanName = cleanName.replace(/\s*[\(\[]+.*$/g, "");
    cleanName = cleanName.replace(/[\(\)\[\]]/g, "");
    cleanName = cleanName.replace(/^\s*\b\d{4}\b\s*/g, "");
    cleanName = cleanName.replace(/\s*\b\d{4}\b\s*$/g, "");
    cleanName = cleanName.trim();

    if (!cleanName || /^\d{4}$/.test(cleanName)) {
      continue;
    }

    const normKey = cleanName.toLowerCase();
    if (!seenNames.has(normKey)) {
      seenNames.add(normKey);
      parsedItems.push({
        name: cleanName,
        category,
        acquiredYear,
        expiry: expiry || "2026",
      });
    }
  }

  return parsedItems;
}

function CalendarIcon({ className = "cal-icon-svg" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

function ProperCalendarPicker({
  value,
  onChange,
  disabled,
  placement = "top",
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placement?: "top" | "bottom";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const monthsList = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const yearsList = useMemo(() => {
    const curY = new Date().getFullYear();
    const list = [];
    for (let y = curY - 2; y <= 2100; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const monthStr = String(viewMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const formattedDate = `${viewYear}-${monthStr}-${dayStr}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleSetNoExpiry = () => {
    onChange("Does Not Expire");
    setIsOpen(false);
  };

  const displayLabel = useMemo(() => {
    if (!value || value === "Does Not Expire") return "Does Not Expire";
    return value;
  }, [value]);

  return (
    <div className="proper-calendar-picker" ref={containerRef}>
      <button
        type="button"
        className="calendar-trigger-btn"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="cal-icon">
          <CalendarIcon />
        </span>
        <span className="cal-val-text">{displayLabel}</span>
        <span className="cal-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className={`calendar-popover ${placement === "bottom" ? "popover-bottom" : ""}`}>
          <div className="cal-popover-header">
            <button
              type="button"
              className="cal-no-expiry-btn"
              onClick={handleSetNoExpiry}
            >
              Does Not Expire
            </button>
          </div>

          <div className="cal-nav-bar">
            <button type="button" className="cal-nav-arrow" onClick={handlePrevMonth}>
              ‹
            </button>
            <div className="cal-month-year-selects">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="cal-select"
              >
                {monthsList.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="cal-select"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="cal-nav-arrow" onClick={handleNextMonth}>
              ›
            </button>
          </div>

          <div className="cal-weekdays-grid">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          <div className="cal-days-grid">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="cal-day-blank" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const monthStr = String(viewMonth + 1).padStart(2, "0");
              const dayStr = String(dayNum).padStart(2, "0");
              const dateIso = `${viewYear}-${monthStr}-${dayStr}`;
              const isSelected = value === dateIso;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  className={`cal-day-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectDay(dayNum)}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CertificationsWithExpiryEditor({
  title,
  options,
  rawString,
  onSave,
  disabled,
}: {
  title: string;
  options: string[];
  rawString: string | null;
  onSave: (items: string[]) => Promise<boolean>;
  disabled: boolean;
}) {
  const items = useMemo(() => parseCertItems(rawString), [rawString]);
  const [inputValue, setInputValue] = useState("");
  const [selectedAcquired, setSelectedAcquired] = useState("2010");
  const [selectedExpiry, setSelectedExpiry] = useState("2026");
  const [selectedCertCategory, setSelectedCertCategory] = useState("");

  // Track which category has its popup list open
  const [activePopupCategory, setActivePopupCategory] = useState<string | null>(null);

  const groupedCerts = useMemo(() => {
    const groups: { [cat: string]: { item: CertItem; originalIndex: number }[] } = {};
    items.forEach((item, originalIndex) => {
      const cat = item.category && item.category.trim() ? item.category.trim() : "General";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push({ item, originalIndex });
    });
    return groups;
  }, [items]);

  const categoryOptions = useMemo(
    () => CERTIFICATION_CATEGORIES.filter((cat) => cat !== "All Certification Categories"),
    []
  );

  const activeCategoryList = useMemo(() => {
    return (selectedCertCategory && CERTIFICATION_CATEGORIES_MAP[selectedCertCategory]) || options;
  }, [selectedCertCategory, options]);

  const availableOptions = useMemo(
    () => activeCategoryList.filter((opt) => !items.some((it) => it.name.toLowerCase() === opt.toLowerCase())),
    [activeCategoryList, items]
  );

  const handleAddItem = async () => {
    const nameToAdd = inputValue.trim();
    if (!nameToAdd) return;
    if (items.some((it) => it.name.toLowerCase() === nameToAdd.toLowerCase())) return;

    const expiryString = selectedExpiry || "2026";
    const categoryTag = selectedCertCategory.trim() || "General";

    const newItems: CertItem[] = [
      ...items,
      { name: nameToAdd, category: categoryTag, acquiredYear: selectedAcquired, expiry: expiryString },
    ];
    const formatted = newItems.map((it) => `${it.name} [${it.category}] (Acquired ${it.acquiredYear || "2010"} - Expiration ${it.expiry})`);
    const ok = await onSave(formatted);
    if (ok) {
      setInputValue("");
      setSelectedAcquired("2010");
      setSelectedExpiry("2026");
      setSelectedCertCategory("");
    }
  };

  const handleRemoveItem = async (indexToRemove: number) => {
    const newItems = items.filter((_, idx) => idx !== indexToRemove);
    const formatted = newItems.map((it) => `${it.name} [${it.category}] (Acquired ${it.acquiredYear || "2010"} - Expiration ${it.expiry})`);
    await onSave(formatted);
    if (activePopupCategory) {
      const remaining = newItems.filter(
        (it) => (it.category && it.category.trim() ? it.category.trim() : "General") === activePopupCategory
      );
      if (remaining.length === 0) {
        setActivePopupCategory(null);
      }
    }
  };

  const handleUpdateAcquired = async (indexToUpdate: number, newAcquired: string) => {
    const newItems = items.map((it, idx) => (idx === indexToUpdate ? { ...it, acquiredYear: newAcquired } : it));
    const formatted = newItems.map((it) => `${it.name} [${it.category}] (Acquired ${it.acquiredYear || "2010"} - Expiration ${it.expiry})`);
    await onSave(formatted);
  };

  const handleUpdateExpiry = async (indexToUpdate: number, newExpiry: string) => {
    const newItems = items.map((it, idx) => (idx === indexToUpdate ? { ...it, expiry: newExpiry } : it));
    const formatted = newItems.map((it) => `${it.name} [${it.category}] (Acquired ${it.acquiredYear || "2010"} - Expiration ${it.expiry})`);
    await onSave(formatted);
  };

  return (
    <article className="profile-card exp-category-card">
      <div className="category-card-header">
        <strong>{title}</strong>
        <span className="category-count-badge">
          {items.length} Selected
        </span>
      </div>

      <div className="selected-items-list">
        {items.length === 0 ? (
          <div className="empty-category-notice">No items selected yet. Type or select a certification below.</div>
        ) : (
          <div className="category-pills-row">
            {Object.entries(groupedCerts).map(([catName, groupItems]) => (
              <button
                key={catName}
                type="button"
                className={`category-popup-trigger-btn ${activePopupCategory === catName ? "active" : ""}`}
                onClick={() => setActivePopupCategory(catName)}
                title={`Click to open ${catName} certifications list (${groupItems.length})`}
              >
                <span className="category-pill-name">{catName}</span>
                <span className="category-pill-badge">{groupItems.length}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* POPUP LIST MODAL FOR ACTIVE CERTIFICATION CATEGORY */}
      {activePopupCategory && groupedCerts[activePopupCategory] && (
        <div className="skill-popup-modal-overlay" onClick={() => setActivePopupCategory(null)}>
          <div
            className="skill-popup-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cert-modal-title"
          >
            <div className="skill-popup-modal-header">
              <div className="skill-popup-title-group">
                <span className="skill-popup-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="7"></circle>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                  </svg>
                </span>
                <h3 id="cert-modal-title" className="skill-popup-title">
                  {activePopupCategory}
                </h3>
                <span className="skill-popup-count-badge">
                  {groupedCerts[activePopupCategory].length} {groupedCerts[activePopupCategory].length === 1 ? "certification" : "certifications"}
                </span>
              </div>
              <button
                type="button"
                className="skill-popup-close-btn"
                onClick={() => setActivePopupCategory(null)}
                aria-label="Close popup"
              >
                ✕
              </button>
            </div>

            <div className="skill-popup-modal-body">
              <div className="skill-popup-list">
                {groupedCerts[activePopupCategory].map(({ item, originalIndex }) => (
                  <div key={`${item.name}-${originalIndex}`} className="skill-popup-item-row">
                    <span className="skill-popup-item-name">{item.name}</span>
                    <div className="skill-popup-item-actions">
                      <span className="skill-popup-since-label">Acquired:</span>
                      <select
                        className="exp-years-select"
                        value={ALL_NUMERIC_YEARS.includes(item.acquiredYear || "") ? item.acquiredYear : "2010"}
                        disabled={disabled}
                        onChange={(e) => handleUpdateAcquired(originalIndex, e.target.value)}
                      >
                        {ALL_NUMERIC_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>

                      <span className="skill-popup-since-label">Expires:</span>
                      <select
                        className="exp-years-select"
                        value={EXPIRATION_YEAR_OPTIONS.includes(item.expiry) ? item.expiry : "2026"}
                        disabled={disabled}
                        onChange={(e) => handleUpdateExpiry(originalIndex, e.target.value)}
                      >
                        {EXPIRATION_YEAR_OPTIONS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="exp-remove-btn"
                        onClick={() => handleRemoveItem(originalIndex)}
                        disabled={disabled}
                        title={`Remove ${item.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="skill-popup-modal-footer">
              <button
                type="button"
                className="skill-popup-done-btn"
                onClick={() => setActivePopupCategory(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="add-item-controls edu-add-controls">
        <div className="edu-inputs-row">
          <SearchableSelect
            options={categoryOptions}
            value={selectedCertCategory}
            disabled={disabled}
            onChange={(val) => {
              setSelectedCertCategory(val);
              setInputValue("");
            }}
            placeholder="Select or search certification category..."
          />
          <SearchableSelect
            options={availableOptions}
            value={inputValue}
            placeholder={selectedCertCategory.trim() ? `Select ${selectedCertCategory} certification...` : "Select or search certification..."}
            disabled={disabled}
            onChange={setInputValue}
            onEnterAdd={handleAddItem}
          />
        </div>

        <div className="add-years-group">
          <span>Acquired:</span>
          <select
            className="add-years-select"
            value={selectedAcquired}
            disabled={disabled}
            onChange={(e) => setSelectedAcquired(e.target.value)}
          >
            {ALL_NUMERIC_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <span>Expiration:</span>
          <select
            className="add-years-select"
            value={selectedExpiry}
            disabled={disabled}
            onChange={(e) => setSelectedExpiry(e.target.value)}
          >
            {EXPIRATION_YEAR_OPTIONS.map((yr) => (
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
          disabled={disabled || !inputValue.trim()}
        >
          + Add
        </button>
      </div>
    </article>
  );
}

const SPOKEN_LANGUAGES_OPTIONS = [
  "English",
  "Tagalog / Filipino",
  "Cebuano / Bisaya",
  "Ilocano",
  "Hiligaynon / Ilonggo",
  "Bicolano",
  "Waray",
  "Kapampangan",
  "Pangasinan",
  "Mandarin Chinese",
  "Japanese",
  "Korean",
  "Spanish",
  "German",
  "French",
  "Arabic",
];

function parseLanguageItems(raw?: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p) => (typeof p === "object" && p !== null ? p.name || String(p) : String(p)))
        .filter(Boolean);
    }
  } catch {}

  return raw
    .split(/[\n,;•|]+/)
    .map((s) => s.trim().replace(/\s*\[.*?\]$/, "").replace(/\s*\(.*?\)$/, "").trim())
    .filter(Boolean);
}

function LanguagesEditor({
  title = "Spoken Languages",
  rawString,
  onSave,
  disabled,
}: {
  title?: string;
  rawString: string | null;
  onSave: (items: string[]) => Promise<boolean>;
  disabled: boolean;
}) {
  const items = useMemo(() => parseLanguageItems(rawString), [rawString]);
  const [langInput, setLangInput] = useState("");

  const availableOptions = useMemo(
    () => SPOKEN_LANGUAGES_OPTIONS.filter((opt) => !items.some((it) => it.toLowerCase() === opt.toLowerCase())),
    [items]
  );

  const handleAddItem = async () => {
    const nameToAdd = langInput.trim();
    if (!nameToAdd) return;
    if (items.some((it) => it.toLowerCase() === nameToAdd.toLowerCase())) return;

    const newItems = [...items, nameToAdd];
    const ok = await onSave(newItems);
    if (ok) {
      setLangInput("");
    }
  };

  const handleRemoveItem = async (indexToRemove: number) => {
    const newItems = items.filter((_, idx) => idx !== indexToRemove);
    await onSave(newItems);
  };

  return (
    <div className="languages-editor-block">
      <div className="category-card-header" style={{ marginBottom: "8px" }}>
        <strong>{title}</strong>
        <span className="category-count-badge">
          {items.length} Selected
        </span>
      </div>

      <div className="add-item-controls edu-add-controls languages-inline-controls">
        <div className="edu-inputs-row languages-inline-row">
          {items.map((itemName, idx) => (
            <div key={`${itemName}-${idx}`} className="exp-item-chip language-inline-chip">
              <span className="exp-item-name">{itemName}</span>
              <button
                type="button"
                className="exp-remove-btn"
                onClick={() => handleRemoveItem(idx)}
                disabled={disabled}
                title={`Remove ${itemName}`}
              >
                ×
              </button>
            </div>
          ))}

          <div className="languages-add-group">
            <SearchableSelect
              options={availableOptions}
              value={langInput}
              disabled={disabled}
              onChange={setLangInput}
              onEnterAdd={handleAddItem}
              placeholder="Select or type spoken language..."
            />
            <button
              type="button"
              className="add-item-btn"
              onClick={handleAddItem}
              disabled={disabled || !langInput.trim()}
            >
              + Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cleanAtsTag(raw?: string | null): string {
  if (!raw || !raw.trim()) return "";
  return raw
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s*[\(\[]+.*$/g, "")
    .replace(/[\(\)\[\]]/g, "")
    .replace(/@/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[,;\s]+|[,;\s]+$/g, "")
    .trim();
}

function generateAtsPlainText(data: {
  name: string;
  location: string;
  email: string;
  phone: string;
  targetRole: string;
  salary: string;
  arrangement: string;
  expYears: string;
  summary: string;
  skillsList: string[];
  categorizedSkills?: Record<string, string[]>;
  certsList: string[];
  qualsList: string[];
  educationItems?: EduItemWithSchool[];
  prefLocs: string[];
  languages: string[];
  workExperiences: WorkExpItem[];
}) {
  let doc = "";
  // Header: Name, Contact stacked
  doc += `${data.name}\t\t\t${data.location} • ${data.phone}\n`;
  doc += `\t\t\t\t\t${data.email}\n\n`;

  // Certifications Summary (Top 3 latest)
  if (data.certsList && data.certsList.length > 0) {
    doc += `${data.certsList.join(" | ")}\n\n`;
  }

  // Executive Summary Bullets
  if (data.summary) {
    const summaryLines = data.summary
      .split("\n")
      .map((s) => s.trim().replace(/^[•\-\*–]\s*/, ""))
      .filter(Boolean);
    summaryLines.forEach((line) => {
      doc += `• ${line}\n`;
    });
    doc += "\n";
  }

  const divider = "________________________________________________________________________________";

  // Professional Experience
  doc += `${divider}\n\n`;
  doc += `                          Professional Experience\n\n`;
  if (data.workExperiences.length > 0) {
    data.workExperiences.forEach((exp) => {
      const dates = `${exp.startMonth ? `${exp.startMonth} ` : ""}${exp.startYear} - ${exp.isCurrent ? "Present" : `${exp.endMonth ? `${exp.endMonth} ` : ""}${exp.endYear}`}`;
      const loc = [exp.city, exp.province].filter(Boolean).join(", ");
      doc += `${exp.company}${loc ? `, ${loc}` : ""}\n`;
      doc += `${exp.title}\t\t\t\t${dates}\n`;
      if (exp.responsibilities) {
        exp.responsibilities
          .split("\n")
          .map((l) => l.trim().replace(/^[•\-\*–]\s*/, ""))
          .filter(Boolean)
          .forEach((bullet) => {
            doc += `• ${bullet}\n`;
          });
      }
      if (exp.skills && exp.skills.length > 0) {
        doc += `• Technologies: ${exp.skills.map(cleanAtsTag).join(", ")}\n`;
      }
      doc += "\n";
    });
  }

  // Education
  const eduList = data.educationItems && data.educationItems.length > 0
    ? data.educationItems
    : data.qualsList.map((q) => ({ name: q, school: "", endYear: "", startYear: "", level: "college" as const }));

  if (eduList.length > 0) {
    doc += `                                 Education\n\n`;
    eduList.forEach((edu) => {
      doc += `${edu.name}${edu.endYear ? `, ${edu.endYear}` : ""}\n`;
      if (edu.school) {
        doc += `${edu.school}\n`;
      }
      doc += "\n";
    });
  }

  // Core Competencies & Skills
  if (data.categorizedSkills && Object.keys(data.categorizedSkills).length > 0) {
    doc += `                          Core Competencies & Skills\n\n`;
    Object.entries(data.categorizedSkills).forEach(([catName, skills]) => {
      doc += `• ${catName}: ${skills.join(", ")}\n`;
    });
    doc += "\n";
  } else if (data.skillsList.length > 0) {
    doc += `                          Core Competencies & Skills\n\n`;
    doc += `• Technical Skills: ${data.skillsList.join(", ")}\n\n`;
  }

  return doc;
}

interface AtsPageData {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  experiences: WorkExpItem[];
  includeEducation: boolean;
  includeSkills: boolean;
}

function buildAtsPages(atsData: {
  workExperiences: WorkExpItem[];
  qualsList: string[];
  educationItems?: EduItemWithSchool[];
  certsList: string[];
  skillsList: string[];
  categorizedSkills?: Record<string, string[]>;
  languages: string[];
  summary: string;
}): AtsPageData[] {
  const pages: AtsPageData[] = [];
  const PAGE_CAPACITY = 620; // Uncompressed spacious layout that naturally adds pages rather than cramming

  const summaryBullets = atsData.summary
    ? atsData.summary.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];
  const headerWeight = 160 + Math.min(summaryBullets.length, 6) * 18;

  const eduList = atsData.educationItems && atsData.educationItems.length > 0
    ? atsData.educationItems
    : (atsData.qualsList || []);
  const eduWeight = eduList.length > 0 ? 45 + eduList.length * 40 : 0;
  const categoryCount = atsData.categorizedSkills
    ? Object.keys(atsData.categorizedSkills).length
    : 0;
  const skillsWeight = categoryCount > 0
    ? 30 + categoryCount * 25
    : (atsData.skillsList.length > 0 ? 60 : 0);

  const remainingExps = [...atsData.workExperiences];
  let eduPlaced = eduWeight === 0;
  let skillsPlaced = skillsWeight === 0;

  let pageNum = 1;

  while (remainingExps.length > 0 || !eduPlaced || !skillsPlaced) {
    let currentWeight = 0;
    const isFirst = pageNum === 1;

    if (isFirst) {
      currentWeight += headerWeight + 35; // Header + "Professional Experience" heading
    }

    const pageExps: WorkExpItem[] = [];

    // Pack experiences
    while (remainingExps.length > 0) {
      const exp = remainingExps[0];
      const bulletCount = exp.responsibilities
        ? exp.responsibilities.split("\n").filter((l) => l.trim()).length
        : 0;
      const expWeight = 50 + bulletCount * 20 + (exp.skills?.length ? 22 : 0);

      if (currentWeight + expWeight > PAGE_CAPACITY && (pageExps.length > 0 || !isFirst)) {
        break;
      }
      pageExps.push(remainingExps.shift()!);
      currentWeight += expWeight;
    }

    // Try Education (only after all work experiences are placed)
    let addEdu = false;
    if (remainingExps.length === 0 && !eduPlaced) {
      if (currentWeight + eduWeight <= PAGE_CAPACITY) {
        addEdu = true;
        eduPlaced = true;
        currentWeight += eduWeight;
      }
    }

    // Try Skills (only after Education is placed)
    let addSkills = false;
    if (remainingExps.length === 0 && eduPlaced && !skillsPlaced) {
      if (currentWeight + skillsWeight <= PAGE_CAPACITY) {
        addSkills = true;
        skillsPlaced = true;
        currentWeight += skillsWeight;
      }
    }

    // Safety fallback: ensure progress
    if (pageExps.length === 0 && !addEdu && !addSkills) {
      if (remainingExps.length > 0) {
        pageExps.push(remainingExps.shift()!);
      } else if (!eduPlaced) {
        addEdu = true;
        eduPlaced = true;
      } else if (!skillsPlaced) {
        addSkills = true;
        skillsPlaced = true;
      }
    }

    pages.push({
      pageNumber: pageNum,
      totalPages: 1,
      isFirstPage: isFirst,
      experiences: pageExps,
      includeEducation: addEdu,
      includeSkills: addSkills,
    });

    pageNum += 1;
    if (pageNum > 10) break;
  }

  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      totalPages: 1,
      isFirstPage: true,
      experiences: [],
      includeEducation: true,
      includeSkills: true,
    });
  }

  const total = pages.length;
  pages.forEach((p) => {
    p.totalPages = total;
  });

  return pages;
}

async function downloadAtsPdf(data: { name: string }) {
  const container = document.getElementById("ats-paper-preview");
  if (!container) return;

  const originalZoom = (container.style as any).zoom;
  try {
    (container.style as any).zoom = "1";
    const pageElements = container.querySelectorAll<HTMLElement>(".ats-page");
    const pdf = new jsPDF("p", "mm", "a4");

    if (pageElements && pageElements.length > 0) {
      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) pdf.addPage();
        const pageCanvas = await html2canvas(pageElements[i], {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1200,
        });
        const imgData = pageCanvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
      }
    } else {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
      });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    }

    const fileName = `${data.name.replace(/\s+/g, "_")}_ATS_Resume.pdf`;
    pdf.save(fileName);
  } catch (err) {
    console.error("Canvas PDF generation failed:", err);
  } finally {
    (container.style as any).zoom = originalZoom || "";
  }
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

export default function ApplicantProfile() {
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const pendingInvitesCount = usePendingInvitationsCount();
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return false;
    }
    return true;
  });
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [atsModalViewTab, setAtsModalViewTab] = useState<"visual" | "text">("visual");
  const [isOptimizingAi, setIsOptimizingAi] = useState(false);
  const [aiOptimizedSummary, setAiOptimizedSummary] = useState<string | null>(null);
  const [aiOptimizedExperiences, setAiOptimizedExperiences] = useState<WorkExpItem[] | null>(null);
  const [isPreferredLocModalOpen, setIsPreferredLocModalOpen] = useState(false);
  const [preferredLocInput, setPreferredLocInput] = useState("");
  const [activeSection, setActiveSection] = useState<"personal" | "preferences" | "competencies" | "experience">("personal");
  const [profile, setProfile] = useState<ApplicantProfileData>(emptyProfile);
  const [draft, setDraft] = useState<ApplicantProfileData>(emptyProfile);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileMessageType, setProfileMessageType] = useState<"success" | "error">("success");
  const [salaryError, setSalaryError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [universityList, setUniversityList] = useState<string[]>(PHILIPPINES_UNIVERSITIES_COLLEGES);

  // Email OTP verification states
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [verifiedEmailAddress, setVerifiedEmailAddress] = useState<string>("");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCodeInput, setOtpCodeInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Field-level single saving & dirty state tracking
  const [savingField, setSavingField] = useState<string | null>(null);
  const [fieldSuccess, setFieldSuccess] = useState<string | null>(null);
  const [isMinSalaryFocused, setIsMinSalaryFocused] = useState(false);
  const [isMaxSalaryFocused, setIsMaxSalaryFocused] = useState(false);
  const [targetRoleInput, setTargetRoleInput] = useState("");
  const [targetRoles, setTargetRoles] = useState<TargetRolePreferenceItem[]>([]);
  const [savedTargetRoles, setSavedTargetRoles] = useState<TargetRolePreferenceItem[]>([]);
  const [isRoleEmploymentOpen, setIsRoleEmploymentOpen] = useState(true);
  const [expandedRoleIds, setExpandedRoleIds] = useState<string[]>([]);
  const [roleSavedId, setRoleSavedId] = useState<string | null>(null);
  const roleSalarySavedId = roleSavedId;
  const setRoleSalarySavedId = setRoleSavedId;
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleCategory, setNewRoleCategory] = useState<string>("");
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleArrangement, setNewRoleArrangement] = useState<string>("");
  const [newRoleSalaryMin, setNewRoleSalaryMin] = useState("");
  const [newRoleSalaryMax, setNewRoleSalaryMax] = useState("");
  const [newRoleHideSalary, setNewRoleHideSalary] = useState(false);
  const [isSavingNewRole, setIsSavingNewRole] = useState(false);
  const [activeRoleSalaryInput, setActiveRoleSalaryInput] = useState<{
    id: string;
    field: "salary_min" | "salary_max";
    value: string;
  } | null>(null);
  const [newRoleSalaryLastField, setNewRoleSalaryLastField] = useState<"min" | "max">("max");
  const [roleSalaryLastField, setRoleSalaryLastField] = useState<Record<string, "min" | "max">>({});

  const saveSingleField = async (fieldName: keyof ApplicantProfileData, value: any) => {
    if (!userId) return;
    if (fieldName === "phone") {
      const cleanPhone = normalizePhoneNumber(value);
      if (cleanPhone.length !== 10) {
        setProfileMessageType("error");
        setProfileMessage("Phone number must have exactly 10 digits.");
        return;
      }
    }
    if (fieldName === "expected_salary_min" || fieldName === "expected_salary_max") {
      const nextDraft = { ...draft, [fieldName]: value };
      const rawMin = nextDraft.expected_salary_min !== null && nextDraft.expected_salary_min !== undefined
        ? String(nextDraft.expected_salary_min).replace(/[^0-9.]/g, "").trim()
        : "";
      const rawMax = nextDraft.expected_salary_max !== null && nextDraft.expected_salary_max !== undefined
        ? String(nextDraft.expected_salary_max).replace(/[^0-9.]/g, "").trim()
        : "";
      if (rawMin && rawMax) {
        const nMin = Number(rawMin);
        const nMax = Number(rawMax);
        if (Number.isFinite(nMin) && Number.isFinite(nMax) && nMax < nMin) {
          setProfileMessageType("error");
          setProfileMessage("Maximum expected salary cannot be lower than minimum expected salary.");
          return;
        }
      }
    }
    setSavingField(fieldName);
    setProfileMessage("");
    try {
      const nextDraft = { ...draft, [fieldName]: value };
      const rawMin = nextDraft.expected_salary_min !== null && nextDraft.expected_salary_min !== undefined
        ? String(nextDraft.expected_salary_min).replace(/[^0-9.]/g, "").trim()
        : "";
      const rawMax = nextDraft.expected_salary_max !== null && nextDraft.expected_salary_max !== undefined
        ? String(nextDraft.expected_salary_max).replace(/[^0-9.]/g, "").trim()
        : "";
      const consolidated = buildConsolidatedSalaryString(rawMin, rawMax);
      const numMin = rawMin ? Number(rawMin) : null;
      const numMax = rawMax ? Number(rawMax) : null;

      const payload = {
        ...nextDraft,
        expected_salary: consolidated,
        expected_salary_min: numMin !== null && Number.isFinite(numMin) ? numMin : null,
        expected_salary_max: numMax !== null && Number.isFinite(numMax) ? numMax : null,
      };

      const response = await fetch(`/api/applicants/${userId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save field.");

      const updatedProfile = {
        ...profile,
        ...nextDraft,
        ...(data.profile || {}),
      };
      setProfile(updatedProfile);
      setDraft(updatedProfile);
      setFieldSuccess(fieldName);
      setTimeout(() => {
        setFieldSuccess((curr) => (curr === fieldName ? null : curr));
      }, 2500);

      if (fieldName === "email" && value) {
        const cleanSavedEmail = String(value).trim().toLowerCase();
        setVerifiedEmailAddress(cleanSavedEmail);
        setIsEmailVerified(true);
        try {
          const rawUser = localStorage.getItem("elitecruit-user");
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            localStorage.setItem("elitecruit-user", JSON.stringify({ ...parsed, email: String(value).trim() }));
          }
        } catch {}
      }
    } catch (err: any) {
      setProfileMessageType("error");
      setProfileMessage(err.message || "Failed to update.");
    } finally {
      setSavingField(null);
    }
  };

  const cancelField = (fieldName: keyof ApplicantProfileData) => {
    setDraft((prev) => {
      let resetVal: any = profile[fieldName] ?? "";
      if (fieldName === "phone") {
        resetVal = normalizePhoneNumber(profile.phone);
      } else if (fieldName === "expected_salary_min" || fieldName === "expected_salary_max") {
        resetVal = parseSalaryInteger(profile[fieldName]);
      }
      const next = { ...prev, [fieldName]: resetVal };
      if (fieldName === "expected_salary_min" || fieldName === "expected_salary_max") {
        next.expected_salary = profile.expected_salary;
      }
      return next;
    });
  };

  useEffect(() => {
    fetchPhilippineUniversitiesApi().then((list) => {
      if (list && list.length > 0) {
        setUniversityList(list);
      }
    });
  }, []);

  useEffect(() => {
    if (!profileMessage) return;
    const timer = setTimeout(() => {
      setProfileMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [profileMessage]);
  const [userId, setUserId] = useState<number | null>(null);
  const [workExperiences, setWorkExperiences] = useState<WorkExpItem[]>([]);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState("");
  const [expCompany, setExpCompany] = useState("");
  const [expEmploymentType, setExpEmploymentType] = useState("Full-time");
  const [expResponsibilities, setExpResponsibilities] = useState("");

  const [isAddingExp, setIsAddingExp] = useState(false);
  const [expIsCurrent, setExpIsCurrent] = useState(true);
  const [expProvince, setExpProvince] = useState("Cavite");
  const [expCity, setExpCity] = useState("");
  const [expStartMonth, setExpStartMonth] = useState("January");
  const [expStartYear, setExpStartYear] = useState(String(CURRENT_YEAR));
  const [expEndMonth, setExpEndMonth] = useState("");
  const [expEndYear, setExpEndYear] = useState("");
  const [expSkills, setExpSkills] = useState<string[]>([]);
  const [expSkillInput, setExpSkillInput] = useState("");

  const expDateError = useMemo(() => {
    if (expIsCurrent) return "";
    if (!expEndYear) return "";
    const sYear = parseInt(expStartYear, 10);
    const eYear = parseInt(expEndYear, 10);
    if (!isNaN(sYear) && !isNaN(eYear)) {
      if (eYear < sYear) {
        return "End date cannot be earlier than start date.";
      }
      if (eYear === sYear && expStartMonth && expEndMonth) {
        const MONTH_ORDER = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const sMonth = MONTH_ORDER.indexOf(expStartMonth);
        const eMonth = MONTH_ORDER.indexOf(expEndMonth);
        if (sMonth !== -1 && eMonth !== -1 && eMonth < sMonth) {
          return "End date cannot be earlier than start date.";
        }
      }
    }
    return "";
  }, [expIsCurrent, expStartYear, expStartMonth, expEndYear, expEndMonth]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isAdjustPhotoModalOpen, setIsAdjustPhotoModalOpen] = useState(false);
  const [adjustPhotoSrc, setAdjustPhotoSrc] = useState<string | null>(null);
  const [isApplyingPhotoAdjustment, setIsApplyingPhotoAdjustment] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number }>({ lat: 14.2807, lng: 120.8693 });
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const mapModalRef = useRef<L.Map | null>(null);
  const markerModalRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!isMapModalOpen) {
      if (mapModalRef.current) {
        mapModalRef.current.remove();
        mapModalRef.current = null;
        markerModalRef.current = null;
      }
      return;
    }

    let startLat = profile.latitude ? Number(profile.latitude) : null;
    let startLng = profile.longitude ? Number(profile.longitude) : null;

    if (!startLat || !startLng) {
      const defaultGeo = resolveLocalGeocodeDetailed(profile.address, profile.city);
      startLat = defaultGeo.lat;
      startLng = defaultGeo.lng;
    }

    const initialPos = { lat: startLat, lng: startLng };
    setTempCoords(initialPos);

    const timer = setTimeout(() => {
      const mapContainer = document.getElementById("applicant-pinpoint-map");
      if (!mapContainer || mapModalRef.current) return;

      const map = L.map("applicant-pinpoint-map", {
        zoomControl: true,
        attributionControl: false,
      }).setView([initialPos.lat, initialPos.lng], 15);

      mapModalRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const candidatePinHtml = `
        <div class="applicant-pin-wrapper">
          <div class="applicant-pin-inner">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
        </div>
      `;

      const candidateIcon = L.divIcon({
        className: "applicant-pin-leaflet-icon",
        html: candidatePinHtml,
        iconSize: [44, 55],
        iconAnchor: [22, 55],
      });

      const marker = L.marker([initialPos.lat, initialPos.lng], {
        draggable: true,
        icon: candidateIcon,
      }).addTo(map);

      markerModalRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setTempCoords({ lat: pos.lat, lng: pos.lng });
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setTempCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      setTimeout(() => map.invalidateSize(), 200);
    }, 100);

    return () => clearTimeout(timer);
  }, [isMapModalOpen, profile.latitude, profile.longitude, profile.address, profile.city]);

  const [nearbyModalProvince, setNearbyModalProvince] = useState("Cavite");
  const [nearbyModalCity, setNearbyModalCity] = useState("");
  const [nearbyWarningModal, setNearbyWarningModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    cancelLabel: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const handleOpenNearbyModal = () => {
    setNearbyModalProvince(profile.province || "Cavite");
    setNearbyModalCity(profile.city || "");
    setIsMapModalOpen(true);
  };

  const confirmSaveNearbyLocation = async (chosenLocStr: string) => {
    if (!userId) return;
    setNearbyWarningModal(null);
    setIsSavingLocation(true);
    try {
      const res = await fetch(`/api/applicants/${userId}/location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nearby_location: chosenLocStr,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedProf = data?.profile || {};
        setProfile((prev) => ({
          ...prev,
          ...updatedProf,
          nearby_location: chosenLocStr,
        }));
        setDraft((prev) => ({
          ...prev,
          ...updatedProf,
          nearby_location: chosenLocStr,
        }));
        setIsMapModalOpen(false);
        setProfileMessage(`Nearby location updated to ${chosenLocStr}.`);
      } else {
        alert("Unable to save location.");
      }
    } catch {
      alert("Failed to save location.");
    } finally {
      setIsSavingLocation(false);
    }
  };

  const promptSaveNearbyLocation = () => {
    if (!userId || !nearbyModalCity) return;
    const chosenLocStr = `${nearbyModalCity}${nearbyModalProvince ? `, ${nearbyModalProvince}` : ""}`;
    const currentlyActive = Boolean(
      profile.nearby_location && profile.nearby_location.trim().length > 0
    );

    setNearbyWarningModal({
      isOpen: true,
      title: "Warning",
      message: (
        <div>
          <p style={{ margin: "0 0 8px" }}>
            {currentlyActive
              ? `Are you sure you want to change your Nearby Discovery location to ${chosenLocStr}?`
              : `Are you sure you want to set your Nearby Discovery location to ${chosenLocStr}?`}
          </p>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            This will update where employers can discover your profile for local candidate searches.
          </p>
        </div>
      ),
      cancelLabel: "Cancel",
      confirmLabel: "Change Location",
      onConfirm: () => confirmSaveNearbyLocation(chosenLocStr),
    });
  };

  const [isUpdatingParticipation, setIsUpdatingParticipation] = useState(false);
  const [isUnsavedExpWarningOpen, setIsUnsavedExpWarningOpen] = useState(false);
  const [isUnsavedProfileWarningOpen, setIsUnsavedProfileWarningOpen] = useState(false);
  const [pendingTargetSection, setPendingTargetSection] = useState<"personal" | "preferences" | "competencies" | "experience" | null>(null);
  const [pendingEditMode, setPendingEditMode] = useState(false);
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);
  const [pendingCancelField, setPendingCancelField] = useState<keyof ApplicantProfileData | null>(null);

  const confirmToggleParticipation = async (newNearbyLoc: string | null) => {
    if (!userId) return;
    setNearbyWarningModal(null);
    setIsUpdatingParticipation(true);
    try {
      const res = await fetch(`/api/applicants/${userId}/location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nearby_location: newNearbyLoc,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedProf = data?.profile || {};
        setProfile((prev) => ({
          ...prev,
          ...updatedProf,
          nearby_location: newNearbyLoc,
        }));
        setDraft((prev) => ({
          ...prev,
          ...updatedProf,
          nearby_location: newNearbyLoc,
        }));
        // Silently update toggle state without showing top notification banner
      } else {
        alert("Unable to update participation status.");
      }
    } catch {
      alert("Failed to update participation status.");
    } finally {
      setIsUpdatingParticipation(false);
    }
  };

  const promptToggleParticipation = () => {
    if (!userId) return;
    const currentlyActive = Boolean(
      profile.nearby_location && profile.nearby_location.trim().length > 0
    );

    if (currentlyActive) {
      setNearbyWarningModal({
        isOpen: true,
        title: "Warning",
        message: (
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to turn off Nearby Employer Discovery?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Your profile will no longer be visible to employers conducting nearby candidate searches.
            </p>
          </div>
        ),
        cancelLabel: "Cancel",
        confirmLabel: "Turn Off",
        onConfirm: () => confirmToggleParticipation(null),
      });
    } else {
      const targetLoc = profile.nearby_location || (profile.city
        ? `${profile.city}${profile.province ? `, ${profile.province}` : ""}`
        : profile.address || "Cavite Area");
      setNearbyWarningModal({
        isOpen: true,
        title: "Warning",
        message: (
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to turn on Nearby Employer Discovery?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Your profile will become visible to employers searching for candidates in <strong>{targetLoc}</strong>.
            </p>
          </div>
        ),
        cancelLabel: "Cancel",
        confirmLabel: "Turn On",
        onConfirm: () => confirmToggleParticipation(targetLoc),
      });
    }
  };

  const fullName = useMemo(
    () => [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || "Applicant",
    [profile]
  );
  const initials = useMemo(
    () =>
      [profile.first_name, profile.last_name]
        .filter(Boolean)
        .map((name) => name?.[0])
        .join("") || "AP",
    [profile]
  );

  const [preferredLocProvince, setPreferredLocProvince] = useState("Cavite");
  const [preferredLocCity, setPreferredLocCity] = useState("");
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [setupWarningModalMsg, setSetupWarningModalMsg] = useState("");
  const hasShownInitialSetupPromptRef = useRef(false);

  const missingFieldItems = useMemo(() => {
    const p = draft;
    const list: { key: string; label: string; section: "preferences" | "competencies"; sectionName: string }[] = [];
    if (!p.desired_job_title || !String(p.desired_job_title).trim()) {
      list.push({ key: "jobTitle", label: "Job / Target Role", section: "preferences", sectionName: "Career Preferences" });
    }
    if (!p.work_arrangement || !String(p.work_arrangement).trim()) {
      list.push({ key: "workArrangement", label: "Work Arrangement", section: "preferences", sectionName: "Career Preferences" });
    }
    const hasSalaryMin =
      (p.expected_salary_min !== null && p.expected_salary_min !== undefined && String(p.expected_salary_min).trim() !== "") ||
      Boolean(p.expected_salary && String(p.expected_salary).trim());
    const hasSalaryMax =
      (p.expected_salary_max !== null && p.expected_salary_max !== undefined && String(p.expected_salary_max).trim() !== "") ||
      Boolean(p.expected_salary && String(p.expected_salary).trim());
    if (!hasSalaryMin) {
      list.push({ key: "salaryMin", label: "Minimum Salary", section: "preferences", sectionName: "Career Preferences" });
    }
    if (!hasSalaryMax) {
      list.push({ key: "salaryMax", label: "Maximum Salary", section: "preferences", sectionName: "Career Preferences" });
    }
    if (!p.qualifications || !String(p.qualifications).trim()) {
      list.push({ key: "education", label: "Qualifications / Education", section: "competencies", sectionName: "Skills & Credentials" });
    }
    if (!p.skills || !String(p.skills).trim()) {
      list.push({ key: "skills", label: "Technical Skills", section: "competencies", sectionName: "Skills & Credentials" });
    }
    return list;
  }, [profile, draft]);

  const missingMandatedFields = useMemo(() => missingFieldItems.map((item) => item.label), [missingFieldItems]);

  const completionChecks = useMemo(() => {
    const p = draft;
    const hasJobTitle = Boolean(p.desired_job_title && String(p.desired_job_title).trim());
    const hasWorkArrangement = Boolean(p.work_arrangement && String(p.work_arrangement).trim());
    const hasSalaryMin =
      (p.expected_salary_min !== null && p.expected_salary_min !== undefined && String(p.expected_salary_min).trim() !== "") ||
      Boolean(p.expected_salary && String(p.expected_salary).trim());
    const hasSalaryMax =
      (p.expected_salary_max !== null && p.expected_salary_max !== undefined && String(p.expected_salary_max).trim() !== "") ||
      Boolean(p.expected_salary && String(p.expected_salary).trim());
    const hasEducation = Boolean(p.qualifications && String(p.qualifications).trim());
    const hasSkills = Boolean(p.skills && String(p.skills).trim());

    const allChecks = [hasJobTitle, hasWorkArrangement, hasSalaryMin, hasSalaryMax, hasEducation, hasSkills];
    const done = allChecks.filter(Boolean).length;
    const percent = Math.round((done / allChecks.length) * 100);
    const colorBand = percent <= 50 ? "red" : percent <= 80 ? "yellow" : "green";

    return {
      hasJobTitle,
      hasWorkArrangement,
      hasSalaryMin,
      hasSalaryMax,
      hasEducation,
      hasSkills,
      percent,
      colorBand,
    };
  }, [profile, draft]);

  const isProfileComplete = hasLoadedProfile && (completionChecks.percent >= 100 || missingFieldItems.length === 0);
  const isProfileSetupIncomplete = hasLoadedProfile && !isProfileComplete;

  useEffect(() => {
    if (!hasLoadedProfile) return;
    try {
      const rawUser = localStorage.getItem("elitecruit-user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        const updated = {
          ...parsed,
          isProfileComplete: missingMandatedFields.length === 0,
          missingProfileFields: missingMandatedFields,
        };
        localStorage.setItem("elitecruit-user", JSON.stringify(updated));
      }
    } catch {}

    if (
      missingMandatedFields.length > 0 &&
      !hasShownInitialSetupPromptRef.current &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("setup") === "required"
    ) {
      hasShownInitialSetupPromptRef.current = true;
      setSetupWarningModalMsg(
        `Welcome to EliteCruit! Please complete your required profile details (${missingMandatedFields.join(", ")}) before navigating to other pages.`
      );
    }
  }, [hasLoadedProfile, missingMandatedFields]);

  const uploadedFiles = useMemo(
    () => [
      ...(profile.resume_path
        ? [{ label: "Primary Resume", path: profile.resume_path, updated: "Uploaded" }]
        : []),
    ],
    [profile.resume_path]
  );

  useEffect(() => {
    const savedUser = localStorage.getItem("elitecruit-user");
    if (!savedUser) {
      setProfileMessage("Sign in to view your saved profile.");
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);
      const parsedId = Number(parsed.id);
      if (!Number.isInteger(parsedId) || parsedId < 1) {
        setProfileMessage("Invalid session. Sign in again.");
        return;
      }
      setUserId(parsedId);
      fetchProfile(parsedId);
    } catch {
      setProfileMessage("Invalid session. Sign in again.");
    }
  }, []);

  const fetchProfile = async (targetUserId: number) => {
    try {
      const response = await fetch(`/api/applicants/${targetUserId}/profile`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load applicant profile.");
      }
      let initialMin = data.profile?.expected_salary_min != null ? parseSalaryInteger(data.profile.expected_salary_min) : "";
      let initialMax = data.profile?.expected_salary_max != null ? parseSalaryInteger(data.profile.expected_salary_max) : "";

      if ((!initialMin || !initialMax || initialMin === initialMax) && data.profile?.expected_salary) {
        const parts = String(data.profile.expected_salary).split("-").map((p: string) => p.trim());
        if (parts.length >= 2) {
          const pMin = parseSalaryInteger(parts[0]);
          const pMax = parseSalaryInteger(parts[1]);
          if (pMin && pMax) {
            initialMin = pMin;
            initialMax = pMax;
          }
        } else if (parts.length === 1 && parts[0] && !initialMin && !initialMax) {
          initialMin = parseSalaryInteger(parts[0]);
          initialMax = parseSalaryInteger(parts[0]);
        }
      }

      if (!initialMin && initialMax) initialMin = initialMax;
      if (!initialMax && initialMin) initialMax = initialMin;
      const isVerified = Boolean(data.profile?.is_email_verified);
      const userEmail = data.profile?.email ? String(data.profile.email).trim() : "";
      setIsEmailVerified(isVerified);
      if (isVerified && userEmail) {
        setVerifiedEmailAddress(userEmail.toLowerCase());
      }

      const loaded = {
        ...emptyProfile,
        ...data.profile,
        phone: normalizePhoneNumber(data.profile?.phone),
        expected_salary_min: initialMin,
        expected_salary_max: initialMax,
        province: data.profile?.province || "Cavite",
        is_email_verified: isVerified,
      };
      setProfile(loaded);
      setDraft(loaded);
      setHasLoadedProfile(true);

      let parsedRoles: TargetRolePreferenceItem[] = [];
      if (data.profile?.target_roles_json) {
        try {
          const arr = JSON.parse(data.profile.target_roles_json);
          if (Array.isArray(arr) && arr.length > 0) {
            parsedRoles = arr.map((r: any, idx: number) => ({
              id: r.id || `role-${idx}-${Date.now()}`,
              category: r.category || getCategoryForRole(r.title || ""),
              title: r.title || "Job Title",
              work_arrangements: Array.isArray(r.work_arrangements) ? r.work_arrangements : ["On-Site"],
              salary_min: r.salary_min != null ? r.salary_min : (initialMin || 25000),
              salary_max: r.salary_max != null ? r.salary_max : (initialMax || 35000),
              hide_salary: Boolean(r.hide_salary),
            }));
          }
        } catch {}
      }

      if (parsedRoles.length === 0 && data.profile?.desired_job_title) {
        const titles = String(data.profile.desired_job_title)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const legacyArrangements = String(data.profile.work_arrangement || "Hybrid")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        parsedRoles = titles.map((t, idx) => ({
          id: `role-legacy-${idx}-${Date.now()}`,
          category: getCategoryForRole(t),
          title: t,
          work_arrangements: legacyArrangements.length > 0 ? legacyArrangements : ["On-Site"],
          salary_min: initialMin || 25000,
          salary_max: initialMax || 35000,
          hide_salary: Boolean(data.profile?.hide_salary),
        }));
      }

      setTargetRoles(parsedRoles);
      setSavedTargetRoles(parsedRoles);
      setExpandedRoleIds(parsedRoles.map((r) => r.id));

      if (data.profile?.work_experience_json) {
        try {
          const parsed = JSON.parse(data.profile.work_experience_json);
          if (Array.isArray(parsed)) {
            setWorkExperiences(parsed);
          } else {
            setWorkExperiences([]);
          }
        } catch (e) {
          console.error("Parse work_experience_json error:", e);
          setWorkExperiences([]);
        }
      } else {
        setWorkExperiences([]);
      }
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to load profile data.");
    }
  };

  const saveWorkExperiencesToBackend = async (newList: WorkExpItem[]) => {
    if (!userId) return false;
    try {
      const response = await fetch(`/api/applicants/${userId}/work-experience`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_experience: newList }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to save work experience.");
      }
      setWorkExperiences(newList);
      return true;
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Unable to save work experience.");
      return false;
    }
  };

  const resetExpForm = () => {
    setExpTitle("");
    setExpCompany("");
    setExpProvince(profile.province || "Cavite");
    setExpCity(profile.city || "");
    setExpStartMonth("January");
    setExpStartYear(String(CURRENT_YEAR));
    setExpEndMonth("");
    setExpEndYear("");
    setExpIsCurrent(true);
    setExpEmploymentType("Full-time");
    setExpResponsibilities("");
    setExpSkills([]);
    setExpSkillInput("");
    setEditingExpId(null);
  };

  const checkHasUnsavedExp = () => {
    if (!isAddingExp) return false;
    if (editingExpId !== null) return true;
    return Boolean(
      expTitle.trim() ||
      expCompany.trim() ||
      expResponsibilities.trim() ||
      expSkills.length > 0 ||
      expSkillInput.trim() ||
      (expCity.trim() && expCity !== (profile.city || "")) ||
      !expIsCurrent ||
      expEndMonth ||
      expEndYear ||
      expEmploymentType !== "Full-time"
    );
  };

  const checkHasUnsavedSection1 = () => {
    const isFirstNameDirty = (draft.first_name || "").trim() !== (profile.first_name || "").trim();
    const isMiddleNameDirty = (draft.middle_name || "").trim() !== (profile.middle_name || "").trim();
    const isLastNameDirty = (draft.last_name || "").trim() !== (profile.last_name || "").trim();
    const isProvinceDirty = (draft.province || "Cavite") !== (profile.province || "Cavite");
    const isCityDirty = (draft.city || "") !== (profile.city || "");
    const isPhoneDirty = normalizePhoneNumber(draft.phone) !== normalizePhoneNumber(profile.phone);
    const isEmailDirty = (draft.email || "").trim().toLowerCase() !== (profile.email || "").trim().toLowerCase();
    const isSummaryDirty = (draft.summary || "").trim() !== (profile.summary || "").trim();
    return Boolean(
      isFirstNameDirty ||
      isMiddleNameDirty ||
      isLastNameDirty ||
      isProvinceDirty ||
      isCityDirty ||
      isPhoneDirty ||
      isEmailDirty ||
      isSummaryDirty
    );
  };

  const isRoleDirty = (roleId: string) => {
    const current = targetRoles.find((r) => r.id === roleId);
    const saved = savedTargetRoles.find((r) => r.id === roleId);
    if (!current || !saved) return false;

    // Check category & title
    const isCategoryDirty = (current.category || "").trim() !== (saved.category || "").trim();
    const isTitleDirty = (current.title || "").trim() !== (saved.title || "").trim();

    // Check work arrangements
    const curArr = [...(current.work_arrangements || [])].sort();
    const savedArr = [...(saved.work_arrangements || [])].sort();
    const isArrDirty =
      curArr.length !== savedArr.length ||
      curArr.some((val, idx) => val !== savedArr[idx]);

    // Check salaries
    let rawCurrentMin = current.salary_min != null ? String(current.salary_min) : "";
    let rawCurrentMax = current.salary_max != null ? String(current.salary_max) : "";
    if (activeRoleSalaryInput && activeRoleSalaryInput.id === roleId) {
      if (activeRoleSalaryInput.field === "salary_min") {
        rawCurrentMin = activeRoleSalaryInput.value;
      } else if (activeRoleSalaryInput.field === "salary_max") {
        rawCurrentMax = activeRoleSalaryInput.value;
      }
    }
    const currentMin = parseSalaryInteger(rawCurrentMin);
    const savedMin = parseSalaryInteger(saved.salary_min);
    const currentMax = parseSalaryInteger(rawCurrentMax);
    const savedMax = parseSalaryInteger(saved.salary_max);

    // Check hide salary
    const currentHide = Boolean(current.hide_salary);
    const savedHide = Boolean(saved.hide_salary);

    return (
      isCategoryDirty ||
      isTitleDirty ||
      isArrDirty ||
      currentMin !== savedMin ||
      currentMax !== savedMax ||
      currentHide !== savedHide
    );
  };
  const isRoleSalaryDirty = isRoleDirty;

  const checkHasUnsavedSection2 = () => {
    const isJobTitleDirty = (draft.desired_job_title || "").trim() !== (profile.desired_job_title || "").trim();
    const isArrangementDirty = (draft.work_arrangement || "").trim() !== (profile.work_arrangement || "").trim();
    const isMinSalaryDirty = parseSalaryInteger(draft.expected_salary_min) !== parseSalaryInteger(profile.expected_salary_min);
    const isMaxSalaryDirty = parseSalaryInteger(draft.expected_salary_max) !== parseSalaryInteger(profile.expected_salary_max);
    const isTargetRoleInputDirty = Boolean(targetRoleInput.trim());
    const isNewRoleDraftDirty = isAddingRole && Boolean(newRoleTitle.trim());
    const hasUnsavedRoles = targetRoles.some((r) => isRoleDirty(r.id));
    return Boolean(
      isJobTitleDirty ||
      isArrangementDirty ||
      isMinSalaryDirty ||
      isMaxSalaryDirty ||
      isTargetRoleInputDirty ||
      isNewRoleDraftDirty ||
      hasUnsavedRoles
    );
  };

  const salaryMinError = useMemo(() => {
    const rawMin = draft.expected_salary_min !== null && draft.expected_salary_min !== undefined ? String(draft.expected_salary_min).replace(/[^0-9.]/g, "").trim() : "";
    const rawMax = draft.expected_salary_max !== null && draft.expected_salary_max !== undefined ? String(draft.expected_salary_max).replace(/[^0-9.]/g, "").trim() : "";
    if (rawMin && rawMax) {
      const nMin = Number(rawMin);
      const nMax = Number(rawMax);
      if (Number.isFinite(nMin) && Number.isFinite(nMax) && nMin > nMax) {
        return "Min salary cannot exceed max salary.";
      }
    }
    return "";
  }, [draft.expected_salary_min, draft.expected_salary_max]);

  const salaryMaxError = useMemo(() => {
    const rawMin = draft.expected_salary_min !== null && draft.expected_salary_min !== undefined ? String(draft.expected_salary_min).replace(/[^0-9.]/g, "").trim() : "";
    const rawMax = draft.expected_salary_max !== null && draft.expected_salary_max !== undefined ? String(draft.expected_salary_max).replace(/[^0-9.]/g, "").trim() : "";
    if (rawMin && rawMax) {
      const nMin = Number(rawMin);
      const nMax = Number(rawMax);
      if (Number.isFinite(nMin) && Number.isFinite(nMax) && nMax < nMin) {
        return "Max salary cannot be lower than min salary.";
      }
    }
    return "";
  }, [draft.expected_salary_min, draft.expected_salary_max]);

  const checkHasUnsavedProfile = () => {
    return checkHasUnsavedSection1() || checkHasUnsavedSection2();
  };

  const handleInlineCancelClick = (fieldName: keyof ApplicantProfileData) => {
    setPendingCancelField(fieldName);
    setIsUnsavedProfileWarningOpen(true);
  };

  const handleSectionNavClick = (targetSection: "personal" | "preferences" | "competencies" | "experience", shouldEdit: boolean = false) => {
    if (targetSection === activeSection) {
      if (shouldEdit && !isEditing) setIsEditing(true);
      return;
    }
    if (activeSection === "experience" && checkHasUnsavedExp()) {
      setPendingTargetSection(targetSection);
      setPendingEditMode(shouldEdit);
      setIsUnsavedExpWarningOpen(true);
      return;
    }
    if (checkHasUnsavedProfile()) {
      setPendingTargetSection(targetSection);
      setPendingEditMode(shouldEdit);
      setIsUnsavedProfileWarningOpen(true);
      return;
    }
    setActiveSection(targetSection);
    if (shouldEdit && !isEditing) setIsEditing(true);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((activeSection === "experience" && checkHasUnsavedExp()) || checkHasUnsavedProfile()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [
    activeSection,
    isAddingExp,
    editingExpId,
    expTitle,
    expCompany,
    expResponsibilities,
    expSkills,
    expSkillInput,
    expCity,
    expIsCurrent,
    expEndMonth,
    expEndYear,
    expEmploymentType,
    profile,
    draft,
    targetRoleInput,
    isEditing,
  ]);

  const handleSaveWorkExperienceEntry = async () => {
    if (!expTitle.trim() || !expCompany.trim()) {
      setProfileMessage("Job title and company name are required.");
      return;
    }

    if (expDateError) {
      setProfileMessage(expDateError);
      return;
    }

    const entryId = editingExpId || `exp-${Date.now()}`;
    const newEntry: WorkExpItem = {
      id: entryId,
      title: expTitle.trim(),
      company: expCompany.trim(),
      province: expProvince,
      city: expCity,
      startMonth: expStartMonth,
      startYear: expStartYear,
      endMonth: expIsCurrent ? "" : expEndMonth,
      endYear: expIsCurrent ? "" : expEndYear,
      isCurrent: expIsCurrent,
      employmentType: expEmploymentType,
      responsibilities: expResponsibilities.trim(),
      skills: expSkills,
    };

    let updatedList: WorkExpItem[] = [];
    if (editingExpId) {
      updatedList = workExperiences.map((item) => (item.id === editingExpId ? newEntry : item));
    } else {
      updatedList = [newEntry, ...workExperiences];
    }

    const success = await saveWorkExperiencesToBackend(updatedList);
    if (success) {
      setIsAddingExp(false);
      setEditingExpId(null);
      resetExpForm();
      setProfileMessage(editingExpId ? "Work experience entry updated successfully." : "Work experience entry added successfully.");
    }
  };

  const handleEditWorkExperienceEntry = (item: WorkExpItem) => {
    setEditingExpId(item.id);
    setExpTitle(item.title);
    setExpCompany(item.company);
    setExpProvince(item.province || "Metro Manila");
    setExpCity(item.city || "Taguig City");
    setExpStartMonth(item.startMonth || "January");
    setExpStartYear(item.startYear || "2022");
    setExpEndMonth(item.endMonth || "August");
    setExpEndYear(item.endYear || "2024");
    setExpIsCurrent(item.isCurrent ?? true);
    setExpEmploymentType(item.employmentType || "Full-time");
    setExpResponsibilities(item.responsibilities || "");
    setExpSkills(item.skills || []);
    setIsAddingExp(true);
  };

  // DOUBLE VERIFICATION AND UNDO STATES
  const [isDeleteResumeModalOpen, setIsDeleteResumeModalOpen] = useState(false);
  const [workExpToDelete, setWorkExpToDelete] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ message: string; onUndo: () => void } | null>(null);

  const confirmDeleteWorkExperience = async () => {
    if (!workExpToDelete) return;
    const id = workExpToDelete;
    const itemToDelete = workExperiences.find((w) => w.id === id);
    const updatedList = workExperiences.filter((item) => item.id !== id);
    setWorkExpToDelete(null);
    const success = await saveWorkExperiencesToBackend(updatedList);
    if (success) {
      setProfileMessage("Work experience entry deleted.");
      if (itemToDelete) {
        setUndoToast({
          message: `Removed "${itemToDelete.title || (itemToDelete as any).job_title || "Work Experience"}"`,
          onUndo: async () => {
            await saveWorkExperiencesToBackend([...updatedList, itemToDelete]);
            setProfileMessage("Restored work experience entry.");
          },
        });
      }
    }
  };

  const handleDeleteWorkExperienceEntry = (id: string) => {
    setWorkExpToDelete(id);
  };

  const visibleProfile = draft;

  const updateDraft = (name: keyof ApplicantProfileData, value: string) => {
    if (name === "phone") {
      const cleanPhone = normalizePhoneNumber(value);
      setDraft((current) => ({ ...current, phone: cleanPhone }));
      return;
    }
    if (name === "email") {
      const cleanEmail = String(value).trim().toLowerCase();
      const origEmail = profile.is_email_verified && profile.email ? String(profile.email).trim().toLowerCase() : "";
      const isMatch = Boolean(
        (verifiedEmailAddress && cleanEmail === verifiedEmailAddress) ||
        (origEmail && cleanEmail === origEmail)
      );
      setIsEmailVerified(isMatch);
      setDraft((current) => ({ ...current, email: value }));
      return;
    }
    if (name === "expected_salary_min") {
      const cleanVal = value.replace(/[^0-9.]/g, "");
      setDraft((prev) => ({
        ...prev,
        expected_salary_min: cleanVal,
        expected_salary: buildConsolidatedSalaryString(cleanVal, prev.expected_salary_max),
      }));
      return;
    }
    if (name === "expected_salary_max") {
      const cleanVal = value.replace(/[^0-9.]/g, "");
      setDraft((prev) => ({
        ...prev,
        expected_salary_max: cleanVal,
        expected_salary: buildConsolidatedSalaryString(prev.expected_salary_min, cleanVal),
      }));
      return;
    }
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const validateSalaryRange = (minVal?: string | number | null, maxVal?: string | number | null) => {
    const rawMin = minVal !== null && minVal !== undefined ? String(minVal).replace(/[^0-9.]/g, "").trim() : "";
    const rawMax = maxVal !== null && maxVal !== undefined ? String(maxVal).replace(/[^0-9.]/g, "").trim() : "";
    if (rawMin && rawMax) {
      const nMin = Number(rawMin);
      const nMax = Number(rawMax);
      if (Number.isFinite(nMin) && Number.isFinite(nMax) && nMax < nMin) {
        return "Maximum expected salary cannot be lower than minimum expected salary.";
      }
    }
    return "";
  };

  const handleSalaryMinChange = (_name: keyof ApplicantProfileData, value: string) => {
    const rawVal = value.replace(/[^0-9.]/g, "");
    setDraft((prev) => {
      const consolidated = buildConsolidatedSalaryString(rawVal, prev.expected_salary_max);
      return {
        ...prev,
        expected_salary_min: rawVal,
        expected_salary: consolidated,
      };
    });
    if (salaryError) setSalaryError("");
  };

  const handleSalaryMaxChange = (_name: keyof ApplicantProfileData, value: string) => {
    const rawVal = value.replace(/[^0-9.]/g, "");
    setDraft((prev) => {
      const consolidated = buildConsolidatedSalaryString(prev.expected_salary_min, rawVal);
      return {
        ...prev,
        expected_salary_max: rawVal,
        expected_salary: consolidated,
      };
    });
    if (salaryError) setSalaryError("");
  };

  const handleSalaryBlur = () => {
    const err = validateSalaryRange(draft.expected_salary_min, draft.expected_salary_max);
    if (err) {
      setSalaryError(err);
    } else {
      setSalaryError("");
    }
  };

  const syncAndSaveTargetRoles = async (newRoles: TargetRolePreferenceItem[]) => {
    setTargetRoles(newRoles);
    setSavedTargetRoles(newRoles);
    if (!userId) return;

    const titlesJoined = newRoles.map((r) => r.title.trim()).filter(Boolean).join(", ");
    const allArrangements = Array.from(new Set(newRoles.flatMap((r) => r.work_arrangements)));
    const primaryArrangement = allArrangements.join(", ") || "On-Site";
    const primaryRole = newRoles[0];
    const primaryMin = primaryRole?.salary_min ? parseSalaryInteger(primaryRole.salary_min) : "";
    const primaryMax = primaryRole?.salary_max ? parseSalaryInteger(primaryRole.salary_max) : "";
    const primaryHide = Boolean(primaryRole?.hide_salary);
    const consolidatedSal = primaryHide
      ? "Negotiable"
      : buildConsolidatedSalaryString(primaryMin, primaryMax);

    const jsonStr = JSON.stringify(newRoles);

    setDraft((prev) => ({
      ...prev,
      desired_job_title: titlesJoined,
      work_arrangement: primaryArrangement,
      expected_salary_min: primaryMin,
      expected_salary_max: primaryMax,
      expected_salary: consolidatedSal,
      hide_salary: primaryHide,
      target_roles_json: jsonStr,
    }));
    setProfile((prev) => ({
      ...prev,
      desired_job_title: titlesJoined,
      work_arrangement: primaryArrangement,
      expected_salary_min: primaryMin,
      expected_salary_max: primaryMax,
      expected_salary: consolidatedSal,
      hide_salary: primaryHide,
      target_roles_json: jsonStr,
    }));

    setSavingField((cur) => cur || "desired_job_title");
    try {
      const res = await fetch(`/api/applicants/${userId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          desired_job_title: titlesJoined,
          work_arrangement: primaryArrangement,
          expected_salary_min: primaryMin ? Number(primaryMin) : null,
          expected_salary_max: primaryMax ? Number(primaryMax) : null,
          expected_salary: consolidatedSal,
          hide_salary: primaryHide,
          target_roles_json: jsonStr,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save profile.");
      }
      setFieldSuccess("desired_job_title");
      setTimeout(() => setFieldSuccess(null), 2500);
    } catch (err) {
      console.error("Failed to sync target roles:", err);
      setProfileMessageType("error");
      setProfileMessage(err instanceof Error ? err.message : "Failed to save target roles.");
    } finally {
      setSavingField(null);
    }
  };

  const toggleRoleExpanded = (roleId: string) => {
    setExpandedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const resetNewRoleForm = () => {
    setNewRoleCategory("");
    setNewRoleTitle("");
    setNewRoleArrangement("");
    setNewRoleSalaryMin("");
    setNewRoleSalaryMax("");
    setNewRoleHideSalary(false);
    setNewRoleSalaryLastField("max");
    setIsAddingRole(false);
    setIsSavingNewRole(false);
  };

  const handleCancelAddRole = () => {
    resetNewRoleForm();
  };

  const handleSaveNewRole = async () => {
    const title = newRoleTitle.trim();
    if (!title) {
      setProfileMessageType("error");
      setProfileMessage("Please select or type a target job role.");
      return;
    }

    if (targetRoles.some((r) => r.title.toLowerCase() === title.toLowerCase())) {
      setProfileMessageType("error");
      setProfileMessage(`Target role "${title}" is already configured.`);
      return;
    }

    if (!newRoleArrangement) {
      setProfileMessageType("error");
      setProfileMessage("Please select a work arrangement preference.");
      return;
    }

    const rawMin = newRoleSalaryMin.replace(/[^0-9.]/g, "").trim();
    const rawMax = newRoleSalaryMax.replace(/[^0-9.]/g, "").trim();
    if (!newRoleHideSalary) {
      if (!rawMin && !rawMax) {
        setProfileMessageType("error");
        setProfileMessage("Please enter your expected salary, or mark salary as hidden.");
        return;
      }
      const numMin = rawMin ? Number(rawMin) : null;
      const numMax = rawMax ? Number(rawMax) : null;
      if (numMin !== null && numMax !== null && Number.isFinite(numMin) && Number.isFinite(numMax) && numMax < numMin) {
        setProfileMessageType("error");
        setProfileMessage(newRoleSalaryLastField === "min" ? "Minimum salary cannot be greater than maximum salary." : "Maximum salary cannot be less than minimum salary.");
        return;
      }
    }

    const formatSal = (val: string) => {
      if (!val) return "";
      const num = Number(val);
      if (Number.isFinite(num) && num >= 0) {
        return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return val;
    };

    const formattedMin = formatSal(rawMin);
    const formattedMax = formatSal(rawMax);

    const category = newRoleCategory || getCategoryForRole(title);

    const newItem: TargetRolePreferenceItem = {
      id: `role-${Date.now()}`,
      category,
      title,
      work_arrangements: newRoleArrangement ? [newRoleArrangement] : ["On-Site"],
      salary_min: formattedMin,
      salary_max: formattedMax,
      hide_salary: newRoleHideSalary,
    };

    setIsSavingNewRole(true);
    try {
      setExpandedRoleIds((prev) => [...prev, newItem.id]);
      await syncAndSaveTargetRoles([...targetRoles, newItem]);
      resetNewRoleForm();
      setRoleSalarySavedId(newItem.id);
      setTimeout(() => setRoleSalarySavedId((cur) => (cur === newItem.id ? null : cur)), 3000);
    } finally {
      setIsSavingNewRole(false);
    }
  };

  const handleAddTargetRole = async (roleToAdd?: string) => {
    const toAdd = (roleToAdd || targetRoleInput).trim();
    if (!toAdd) return;
    if (!targetRoles.some((r) => r.title.toLowerCase() === toAdd.toLowerCase())) {
      const defaultMin = draft.expected_salary_min || 25000;
      const defaultMax = draft.expected_salary_max || 45000;
      const newItem: TargetRolePreferenceItem = {
        id: `role-${Date.now()}`,
        title: toAdd,
        work_arrangements: ["On-Site"],
        salary_min: defaultMin,
        salary_max: defaultMax,
        hide_salary: false,
      };
      setExpandedRoleIds((prev) => [...prev, newItem.id]);
      await syncAndSaveTargetRoles([...targetRoles, newItem]);
    }
    setTargetRoleInput("");
  };

  const handleRemoveTargetRole = async (roleId: string) => {
    const updated = targetRoles.filter((r) => r.id !== roleId && r.title !== roleId);
    setExpandedRoleIds((prev) => prev.filter((id) => id !== roleId));
    await syncAndSaveTargetRoles(updated);
  };

  const handleToggleRoleArrangement = (roleId: string, arrangement: string) => {
    setTargetRoles((prev) =>
      prev.map((r) => {
        if (r.id === roleId) {
          const cur = r.work_arrangements || [];
          const nextArr = computeNextArrangements(cur, arrangement);
          return { ...r, work_arrangements: nextArr };
        }
        return r;
      })
    );
  };

  const handleFocusRoleSalary = (roleId: string, field: "salary_min" | "salary_max") => {
    const role = targetRoles.find((r) => r.id === roleId);
    const currentVal = role && role[field] != null ? String(role[field]).replace(/,/g, "").trim() : "";
    const cleanVal = currentVal.endsWith(".00") ? currentVal.slice(0, -3) : currentVal;
    setActiveRoleSalaryInput({ id: roleId, field, value: cleanVal });
  };

  const handleChangeRoleSalary = (roleId: string, field: "salary_min" | "salary_max", rawInput: string) => {
    const sanitized = rawInput.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    const value = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : sanitized;
    setActiveRoleSalaryInput({ id: roleId, field, value });
    setTargetRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, [field]: value, hide_salary: false } : r))
    );
  };

  const handleBlurRoleSalary = (roleId: string, field: "salary_min" | "salary_max") => {
    const currentVal = activeRoleSalaryInput?.value != null ? activeRoleSalaryInput.value.trim() : "";
    setActiveRoleSalaryInput(null);

    let formatted = "";
    if (currentVal) {
      const num = Number(currentVal);
      if (Number.isFinite(num) && num >= 0) {
        formatted = num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        formatted = currentVal;
      }
    }

    const updated = targetRoles.map((r) => {
      if (r.id === roleId) {
        return { ...r, [field]: formatted };
      }
      return r;
    });
    setTargetRoles(updated);
  };

  const handleToggleRoleHideSalary = (roleId: string) => {
    const updated = targetRoles.map((r) => {
      if (r.id === roleId) {
        return { ...r, hide_salary: !r.hide_salary };
      }
      return r;
    });
    setTargetRoles(updated);
  };

  const handleCancelRole = (roleId: string) => {
    const saved = savedTargetRoles.find((r) => r.id === roleId);
    if (!saved) return;
    setActiveRoleSalaryInput(null);
    setTargetRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? {
              ...r,
              title: saved.title,
              work_arrangements: saved.work_arrangements ? [...saved.work_arrangements] : ["On-Site"],
              salary_min: saved.salary_min,
              salary_max: saved.salary_max,
              hide_salary: saved.hide_salary,
            }
          : r
      )
    );
    setEditingRoleId(null);
    setProfileMessage("");
  };
  const handleCancelRoleSalary = handleCancelRole;

  const handleSaveRole = async (roleId: string) => {
    const role = targetRoles.find((r) => r.id === roleId);
    if (!role) return;

    const title = (role.title || "").trim();
    if (!title) {
      setProfileMessageType("error");
      setProfileMessage("Target job role cannot be empty.");
      return;
    }

    if (targetRoles.some((r) => r.id !== roleId && r.title.toLowerCase() === title.toLowerCase())) {
      setProfileMessageType("error");
      setProfileMessage(`Target role "${title}" is already configured.`);
      return;
    }

    if (!role.work_arrangements || role.work_arrangements.length === 0) {
      setProfileMessageType("error");
      setProfileMessage("Please select at least one work arrangement preference.");
      return;
    }

    let rawMin = role.salary_min != null ? String(role.salary_min).replace(/[^0-9.]/g, "").trim() : "";
    let rawMax = role.salary_max != null ? String(role.salary_max).replace(/[^0-9.]/g, "").trim() : "";

    if (activeRoleSalaryInput && activeRoleSalaryInput.id === roleId) {
      if (activeRoleSalaryInput.field === "salary_min") {
        rawMin = activeRoleSalaryInput.value.replace(/[^0-9.]/g, "").trim();
      } else if (activeRoleSalaryInput.field === "salary_max") {
        rawMax = activeRoleSalaryInput.value.replace(/[^0-9.]/g, "").trim();
      }
    }

    if (!role.hide_salary) {
      if (!rawMin && !rawMax) {
        setProfileMessageType("error");
        setProfileMessage("Please enter your expected salary, or mark salary as hidden.");
        return;
      }
      const numMin = rawMin ? Number(rawMin) : null;
      const numMax = rawMax ? Number(rawMax) : null;
      if (numMin !== null && numMax !== null && Number.isFinite(numMin) && Number.isFinite(numMax) && numMax < numMin) {
        setProfileMessageType("error");
        const lastF = roleSalaryLastField[roleId] || "max";
        setProfileMessage(lastF === "min" ? "Minimum salary cannot be greater than maximum salary." : "Maximum salary cannot be less than minimum salary.");
        return;
      }
    }

    const formatSal = (val: string) => {
      if (!val) return "";
      const num = Number(val);
      if (Number.isFinite(num) && num >= 0) {
        return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return val;
    };

    const formattedMin = formatSal(rawMin);
    const formattedMax = formatSal(rawMax);

    const category = role.category || getCategoryForRole(title);

    const updated = targetRoles.map((r) =>
      r.id === roleId ? { ...r, title, category, salary_min: formattedMin, salary_max: formattedMax } : r
    );

    setActiveRoleSalaryInput(null);
    setTargetRoles(updated);
    setSavingField(`role_${roleId}`);
    try {
      await syncAndSaveTargetRoles(updated);
      setRoleSavedId(roleId);
      setEditingRoleId(null);
      setTimeout(() => setRoleSavedId((cur) => (cur === roleId ? null : cur)), 3000);
    } finally {
      setSavingField(null);
    }
  };
  const handleSaveRoleSalary = handleSaveRole;

  const saveProfile = async () => {
    if (!userId) return;
    setSalaryError("");
    setProfileMessage("");

    if (!isEmailVerified) {
      setProfileMessageType("error");
      setProfileMessage("Please verify your email address before saving.");
      return;
    }

    const cleanPhone = normalizePhoneNumber(draft.phone);
    if (draft.phone && cleanPhone.length > 0 && cleanPhone.length !== 10) {
      setProfileMessageType("error");
      setProfileMessage("Phone number must have exactly 10 digits.");
      setIsSaving(false);
      return;
    }

    // Prevent save and trigger in-card error notification if max is lower than min
    const salaryValidationErr = validateSalaryRange(draft.expected_salary_min, draft.expected_salary_max);
    if (salaryValidationErr) {
      setSalaryError(salaryValidationErr);
      setIsSaving(false);
      return; // STOP! DO NOT SAVE!
    }

    setIsSaving(true);
    try {
      const rawMin = draft.expected_salary_min !== null && draft.expected_salary_min !== undefined
        ? String(draft.expected_salary_min).replace(/[^0-9.]/g, "").trim()
        : "";
      const rawMax = draft.expected_salary_max !== null && draft.expected_salary_max !== undefined
        ? String(draft.expected_salary_max).replace(/[^0-9.]/g, "").trim()
        : "";

      const consolidated = buildConsolidatedSalaryString(rawMin, rawMax);
      const numMin = rawMin ? Number(rawMin) : null;
      const numMax = rawMax ? Number(rawMax) : null;

      const payload = {
        ...draft,
        expected_salary: consolidated,
        expected_salary_min: numMin !== null && Number.isFinite(numMin) ? numMin : null,
        expected_salary_max: numMax !== null && Number.isFinite(numMax) ? numMax : null,
      };

      const response = await fetch(`/api/applicants/${userId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save profile.");

      let resMin = data.profile?.expected_salary_min != null ? parseSalaryInteger(data.profile.expected_salary_min) : "";
      let resMax = data.profile?.expected_salary_max != null ? parseSalaryInteger(data.profile.expected_salary_max) : "";

      if ((!resMin || !resMax || resMin === resMax) && data.profile?.expected_salary) {
        const parts = String(data.profile.expected_salary).split("-").map((p: string) => p.trim());
        if (parts.length >= 2) {
          const pMin = parseSalaryInteger(parts[0]);
          const pMax = parseSalaryInteger(parts[1]);
          if (pMin && pMax) {
            resMin = pMin;
            resMax = pMax;
          }
        } else if (parts.length === 1 && parts[0] && !resMin && !resMax) {
          resMin = parseSalaryInteger(parts[0]);
          resMax = parseSalaryInteger(parts[0]);
        }
      }

      if (!resMin && rawMin) resMin = rawMin;
      if (!resMax && rawMax) resMax = rawMax;
      if (!resMin && resMax) resMin = resMax;
      if (!resMax && resMin) resMax = resMin;

      const savedProfile = {
        ...emptyProfile,
        ...data.profile,
        expected_salary: consolidated || data.profile?.expected_salary || null,
        expected_salary_min: resMin || null,
        expected_salary_max: resMax || null,
        province: data.profile?.province || "Cavite",
        is_email_verified: true,
      };
      setProfile(savedProfile);
      setDraft(savedProfile);
      setIsEmailVerified(true);
      if (savedProfile.email) {
        const cleanSavedEmail = savedProfile.email.trim().toLowerCase();
        setVerifiedEmailAddress(cleanSavedEmail);
        try {
          const rawUser = localStorage.getItem("elitecruit-user");
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            localStorage.setItem(
              "elitecruit-user",
              JSON.stringify({
                ...parsed,
                email: savedProfile.email.trim(),
                isProfileComplete: data.isProfileComplete !== undefined ? data.isProfileComplete : (missingMandatedFields.length === 0),
                missingProfileFields: data.missingProfileFields !== undefined ? data.missingProfileFields : missingMandatedFields,
              })
            );
          }
        } catch {}
      }
      setIsEditing(false);
      setProfileMessageType("success");
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unable to save profile.";
      if (errMsg.toLowerCase().includes("salary")) {
        setSalaryError(errMsg);
      } else {
        setProfileMessageType("error");
        setProfileMessage(errMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const targetEmail = (draft.email || profile.email || "").trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setProfileMessageType("error");
      setProfileMessage("Please enter a valid email address to verify.");
      return;
    }
    const resolvedUserId = userId || (() => {
      try {
        const u = localStorage.getItem("elitecruit-user");
        return u ? Number(JSON.parse(u).id) : null;
      } catch {
        return null;
      }
    })();

    setIsSendingOtp(true);
    setOtpError("");
    setOtpDevHint(null);
    try {
      const token = localStorage.getItem("elitecruit-token") || localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: targetEmail, userId: resolvedUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send verification code.");
      }
      if (data.devCode) {
        setOtpDevHint(data.devCode);
      }
      setIsOtpModalOpen(true);
      setOtpCodeInput("");
      setOtpCooldown(60);
    } catch (err: any) {
      setProfileMessageType("error");
      setProfileMessage(err.message || "Unable to send verification OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const targetEmail = (draft.email || profile.email || "").trim();
    const cleanCode = otpCodeInput.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }
    const resolvedUserId = userId || (() => {
      try {
        const u = localStorage.getItem("elitecruit-user");
        return u ? Number(JSON.parse(u).id) : null;
      } catch {
        return null;
      }
    })();

    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const token = localStorage.getItem("elitecruit-token") || localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: targetEmail, code: cleanCode, userId: resolvedUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid verification code.");
      }
      setIsEmailVerified(true);
      setVerifiedEmailAddress(targetEmail.toLowerCase());
      setDraft((prev) => ({ ...prev, is_email_verified: true, email: targetEmail }));
      if (profile.email && profile.email.trim().toLowerCase() === targetEmail.toLowerCase()) {
        setProfile((prev) => ({ ...prev, is_email_verified: true }));
      }
      setIsOtpModalOpen(false);
      setProfileMessageType("success");
      setProfileMessage("Email address verified successfully! Click 'Save Profile' to save your changes.");
    } catch (err: any) {
      setOtpError(err.message || "Verification failed. Please check the code and try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const getPreferredLocationsRaw = (prof: ApplicantProfileData): string | null => {
    if (prof.preferred_locations && prof.preferred_locations.trim()) {
      return prof.preferred_locations;
    }
    const profAny = prof as any;
    if (profAny.preferred_cities_json) {
      try {
        const parsed = JSON.parse(profAny.preferred_cities_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.join(" | ");
        }
      } catch {}
    }
    return null;
  };

  const saveTagList = async (field: "skills" | "certifications" | "qualifications" | "languages" | "preferred_locations", items: string[]) => {
    if (!userId || isSavingTags) return false;
    setIsSavingTags(true);
    setProfileMessage("");
    try {
      if (field === "preferred_locations") {
        const valueStr = items.join(" | ") || null;
        const response = await fetch(`/api/applicants/${userId}/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...profile,
            preferred_locations: valueStr,
            preferred_cities: items,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.profile) {
            setProfile(data.profile);
            setDraft(data.profile);
          } else {
            setProfile((current) => ({ ...current, preferred_locations: valueStr }));
            setDraft((current) => ({ ...current, preferred_locations: valueStr }));
          }
          return true;
        }
      }

      let response = await fetch(`/api/applicants/${userId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, items }),
      });

      let data: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {}
      }

      if (!response.ok || !data) {
        // Fallback: update via main applicant profile endpoint
        const valueStr = items.join(", ") || null;
        const profileResp = await fetch(`/api/applicants/${userId}/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            [field]: valueStr,
            preferred_locations: field === "preferred_locations" ? items : profile.preferred_locations,
          }),
        });
        if (profileResp.ok) {
          setProfile((current) => ({ ...current, [field]: valueStr }));
          setDraft((current) => ({ ...current, [field]: valueStr }));
          return true;
        }
        throw new Error(data?.message || `Server returned status ${response.status}.`);
      }

      const returnedItems = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.preferred_locations)
        ? data.preferred_locations
        : Array.isArray(data.skills)
        ? data.skills
        : items;
      const value = returnedItems.join(", ") || null;
      setProfile((current) => ({ ...current, [field]: value }));
      setDraft((current) => ({ ...current, [field]: value }));
      return true;
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to save profile items.");
      return false;
    } finally {
      setIsSavingTags(false);
    }
  };

  const processResumeUpload = async (file: File) => {
    if (!userId || isUploadingResume) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "doc", "docx"].includes(ext)) {
      setProfileMessage("Please select a valid document (.pdf, .doc, .docx).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setProfileMessage("File size exceeds maximum limit of 10 MB.");
      return;
    }

    setIsUploadingResume(true);
    setProfileMessage("");

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch(`/api/applicants/${userId}/resume`, {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {}

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload resume.");
      }

      setProfileMessage("Resume uploaded and stored in database.");
      await fetchProfile(userId);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to upload resume.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processResumeUpload(file);
    }
  };

  const handleProfilePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId || isUploadingPhoto) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage("Please select a valid image file (JPG, PNG, WEBP, GIF).");
      setProfileMessageType("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setProfileMessage("Photo file size exceeds maximum limit of 10 MB.");
      setProfileMessageType("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (src) {
        setAdjustPhotoSrc(src);
        setIsAdjustPhotoModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value = "";
    }
  };

  const handleSaveAdjustedPhoto = async (blob: Blob) => {
    if (!userId) return;
    setIsApplyingPhotoAdjustment(true);
    setProfileMessage("");

    try {
      const formData = new FormData();
      formData.append("photo", blob, "profile-photo.jpg");

      const response = await fetch(`/api/applicants/${userId}/profile-picture`, {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {}

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload profile photo.");
      }

      setProfileMessage("Profile photo adjusted and updated successfully!");
      setProfileMessageType("success");
      const photoPathWithCacheBuster = `/api/applicants/${userId}/profile-picture?t=${Date.now()}`;
      setProfile((prev) => ({ ...prev, profile_picture_path: photoPathWithCacheBuster }));
      setDraft((prev) => ({ ...prev, profile_picture_path: photoPathWithCacheBuster }));
      setIsAdjustPhotoModalOpen(false);
      setAdjustPhotoSrc(null);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to upload profile photo.");
      setProfileMessageType("error");
    } finally {
      setIsApplyingPhotoAdjustment(false);
    }
  };

  const handleDeleteResume = () => {
    if (!userId) return;
    setIsDeleteResumeModalOpen(true);
  };

  const confirmDeleteResume = async () => {
    if (!userId) return;
    setIsDeleteResumeModalOpen(false);
    setIsUploadingResume(true);
    setProfileMessage("");

    try {
      const response = await fetch(`/api/applicants/${userId}/resume`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete resume.");
      }

      setProfile((prev) => ({ ...prev, resume_path: null }));
      setDraft((prev) => ({ ...prev, resume_path: null }));
      setProfileMessage("Resume removed successfully.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to delete resume.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  return (
    <div className={`profile-shell appdash-page ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
      {/* APPLICANT SIDEBAR - Standardized 274px */}
      <aside
        className="appdash-sidebar"
        aria-label="Applicant Navigation"
        onClickCapture={(e) => {
          if (isProfileSetupIncomplete) {
            const anchor = (e.target as HTMLElement).closest("a");
            if (!anchor) return;
            const href = (anchor.getAttribute("href") || "").toLowerCase();
            if (!href || href === "/my-profile" || href === "/applicant-profile" || href.startsWith("#")) return;
            e.preventDefault();
            e.stopPropagation();
            setSetupWarningModalMsg(
              `Please complete and save your required profile information before leaving this page: ${missingMandatedFields.join(", ")}.`
            );
            return;
          }
          if (activeSection === "experience" && checkHasUnsavedExp()) {
            const anchor = (e.target as HTMLElement).closest("a");
            if (!anchor) return;
            const rawHref = anchor.getAttribute("href") || "";
            const href = rawHref.toLowerCase();
            if (!href || href === "/my-profile" || href === "/applicant-profile" || href.startsWith("#")) return;
            e.preventDefault();
            e.stopPropagation();
            setPendingNavHref(rawHref);
            setIsUnsavedExpWarningOpen(true);
            return;
          }
          if (checkHasUnsavedProfile()) {
            const anchor = (e.target as HTMLElement).closest("a");
            if (!anchor) return;
            const rawHref = anchor.getAttribute("href") || "";
            const href = rawHref.toLowerCase();
            if (!href || href === "/my-profile" || href === "/applicant-profile" || href.startsWith("#")) return;
            e.preventDefault();
            e.stopPropagation();
            setPendingNavHref(rawHref);
            setIsUnsavedProfileWarningOpen(true);
            return;
          }
        }}
      >
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
                {pendingInvitesCount > 0 && (
                  <span className="item-badge" title={`${pendingInvitesCount} pending job invitation${pendingInvitesCount > 1 ? "s" : ""}`} style={{ marginLeft: "auto", marginRight: 8 }}>
                    {pendingInvitesCount}
                  </span>
                )}
              </span>
              <span className="title-caret-btn" title="Toggle sub-menu">
                <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
              </span>
            </a>

            {isWorkspaceOpen && (
              <ul className="appdash-menu-list">
                <li><a href="/applicant-dashboard#section-smart-matches"><span className="item-icon"><SideIcon name="star" /></span><span>Smart Matches</span></a></li>
                <li><a href="/applicant-dashboard#section-applications"><span className="item-icon"><SideIcon name="applications" /></span><span>My Applications</span></a></li>
                <li><a href="/applicant-dashboard#section-invitations"><span className="item-icon"><SideIcon name="notifications" /></span><span>Job Invitations</span>{pendingInvitesCount > 0 && <span className="item-badge">{pendingInvitesCount}</span>}</a></li>
              </ul>
            )}
          </li>

          <li><a href="/job-search"><span className="item-icon"><SideIcon name="search" /></span><span>Job Search</span></a></li>
          <li><a href="/applicant-offer-letter"><span className="item-icon"><SideIcon name="documents" /></span><span>Offer Letters</span></a></li>
          <li><a href="/messages"><span className="item-icon"><SideIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
          <li><a href="/notifications"><span className="item-icon"><SideIcon name="notifications" /></span><span>Notifications</span>{unreadNotifCount > 0 && <span className="item-badge">{unreadNotifCount}</span>}</a></li>
          <li><a href="/feedback"><span className="item-icon"><SideIcon name="feedback" /></span><span>Feedback</span></a></li>
        </ul>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)}>
            <span className="item-icon"><SideIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{fullName}</strong><small>Applicant</small></span>
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

      {/* MAIN PROFILE SURFACE */}
      <main className="profile-page">
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
              <strong>My Profile</strong>
            </div>
          </div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <ApplicantChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="My Profile"
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        <div className="profile-content">
          {profileMessage && !salaryError && (
            <p className={`profile-message ${profileMessageType === "error" ? "profile-message-error" : ""}`}>
              {profileMessageType === "error" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              <span>{profileMessage}</span>
            </p>
          )}

          {/* PROFILE COMPLETENESS CARD (Disappears when finished; lists only incomplete items) */}
          {isProfileSetupIncomplete && missingFieldItems.length > 0 && (
            <section className="posting-complete-card" aria-label="Profile Completeness">
              <div className="complete-head">
                <h2>Profile Completeness</h2>
                <span className={`complete-percent ${completionChecks.colorBand}`}>
                  {completionChecks.percent}% Complete
                </span>
              </div>
              <p>Complete required profile details to unlock job matching and applications.</p>
              <div className="complete-bar">
                <i className={completionChecks.colorBand} style={{ width: `${completionChecks.percent}%` }} />
              </div>
              <div className="complete-checks list-layout">
                <ul className="completeness-list">
                  {missingFieldItems.map((item) => (
                    <li key={item.key} className="completeness-item">
                      <span className="completeness-bullet">○</span>
                      <span className="completeness-text">{item.label}</span>
                      <button
                        type="button"
                        className="completeness-jump-btn"
                        onClick={() => {
                          handleSectionNavClick(item.section, true);
                        }}
                      >
                        Set in {item.sectionName} →
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* STICKY 3-SECTION NAVIGATION TABS */}
          <nav className="profile-section-nav" aria-label="Profile Sections">
            <button
              type="button"
              className={`section-nav-btn ${activeSection === "personal" ? "active" : ""}`}
              onClick={() => handleSectionNavClick("personal")}
            >
              <span className="nav-num">1</span>
              <span>Personal & Contact</span>
            </button>
            <button
              type="button"
              className={`section-nav-btn ${activeSection === "preferences" ? "active" : ""}`}
              onClick={() => handleSectionNavClick("preferences")}
            >
              <span className="nav-num">2</span>
              <span>Career Preferences</span>
            </button>
            <button
              type="button"
              className={`section-nav-btn ${activeSection === "competencies" ? "active" : ""}`}
              onClick={() => handleSectionNavClick("competencies")}
            >
              <span className="nav-num">3</span>
              <span>Skills & Credentials</span>
            </button>
            <button
              type="button"
              className={`section-nav-btn ${activeSection === "experience" ? "active" : ""}`}
              onClick={() => handleSectionNavClick("experience")}
            >
              <span className="nav-num">4</span>
              <span>Work Experience</span>
            </button>
          </nav>

          {/* =================================================================
              SECTION 1: PERSONAL & CONTACT INFORMATION
              ================================================================= */}
          {activeSection === "personal" && (() => {
            const isFirstNameDirty = (draft.first_name || "").trim() !== (profile.first_name || "").trim();
            const isMiddleNameDirty = (draft.middle_name || "").trim() !== (profile.middle_name || "").trim();
            const isLastNameDirty = (draft.last_name || "").trim() !== (profile.last_name || "").trim();
            const isGenderDirty = (draft.gender || "Prefer not to say") !== (profile.gender || "Prefer not to say");
            const isProvinceDirty = (draft.province || "Cavite") !== (profile.province || "Cavite");
            const isCityDirty = (draft.city || "") !== (profile.city || "");
            const isPhoneDirty = normalizePhoneNumber(draft.phone) !== normalizePhoneNumber(profile.phone);
            const isEmailDirty = (draft.email || "").trim().toLowerCase() !== (profile.email || "").trim().toLowerCase();
            const isEmailVerifiedForDraft = isEmailDirty
              ? verifiedEmailAddress.trim().toLowerCase() === (draft.email || "").trim().toLowerCase()
              : Boolean(profile.is_email_verified);
            const isSummaryDirty = (draft.summary || "").trim() !== (profile.summary || "").trim();

            return (
              <section className="profile-section-block">
                <article className="profile-card personal-card">
                  <div className="person-heading">
                    <div className="person-heading-left">
                      <span
                        className="person-avatar"
                        title={fullName ? `${fullName} (Click to change photo)` : "Click to change photo"}
                        onClick={() => profilePhotoInputRef.current?.click()}
                        style={{ overflow: "hidden", position: "relative", cursor: "pointer" }}
                      >
                        {profile.profile_picture_path && (
                          <img
                            src={profile.profile_picture_path}
                            alt={fullName}
                            className="person-avatar-img"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline-flex";
                              }
                            }}
                          />
                        )}
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ display: profile.profile_picture_path ? "none" : "inline-flex" }}
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <div>
                        <strong>{fullName}</strong>
                        <small>Applicant profile</small>
                      </div>
                    </div>

                    {/* Middle Center: ATS Form & Attachments */}
                    <div className="person-heading-center">
                      <button
                        type="button"
                        className="profile-action-btn ats-form-btn"
                        onClick={() => setIsAtsModalOpen(true)}
                        title="Open ATS Document Form"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <line x1="10" y1="9" x2="8" y2="9"></line>
                        </svg>
                        <span>ATS Form</span>
                      </button>

                      <button
                        type="button"
                        className="profile-action-btn documents-btn"
                        onClick={() => setIsDocumentsModalOpen(true)}
                        title="Manage Resume & Document Attachments"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                        </svg>
                        <span>Attachments</span>
                      </button>
                    </div>

                    {/* Right Edge: Profile Photo & Edit Profile */}
                    <div className="person-heading-right">
                      <input
                        type="file"
                        ref={profilePhotoInputRef}
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleProfilePhotoSelect}
                      />

                      <button
                        type="button"
                        className="profile-action-btn photo-btn"
                        onClick={() => profilePhotoInputRef.current?.click()}
                        disabled={isUploadingPhoto || isApplyingPhotoAdjustment}
                        title="Upload or change your profile photo"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                          <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        <span>{isUploadingPhoto || isApplyingPhotoAdjustment ? "Saving..." : "Profile Photo"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="profile-divider" />

                  <div className="fields-grid" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                      {/* 1ST LINE: First Name, Middle Name, Last Name */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", width: "100%" }}>
                        {/* First Name */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label className="inline-field-label">First Name</label>
                            {fieldSuccess === "first_name" && <span className="inline-field-saved-badge">✔ Saved</span>}
                          </div>
                          <div className="inline-field-row">
                            <input
                              className="inline-field-control"
                              value={draft.first_name || ""}
                              onChange={(e) => updateDraft("first_name", e.target.value)}
                              placeholder="First Name"
                            />
                            {isFirstNameDirty && (
                              <div className="inline-field-actions">
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-cancel-btn"
                                  onClick={() => handleInlineCancelClick("first_name")}
                                  disabled={savingField === "first_name"}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-save-btn"
                                  onClick={() => saveSingleField("first_name", draft.first_name)}
                                  disabled={savingField === "first_name" || !draft.first_name?.trim()}
                                >
                                  {savingField === "first_name" ? "Saving..." : "Save"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Middle Name */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label className="inline-field-label">Middle Name (Optional)</label>
                            {fieldSuccess === "middle_name" && <span className="inline-field-saved-badge">✔ Saved</span>}
                          </div>
                          <div className="inline-field-row">
                            <input
                              className="inline-field-control"
                              value={draft.middle_name || ""}
                              onChange={(e) => updateDraft("middle_name", e.target.value)}
                              placeholder="Middle Name"
                            />
                            {isMiddleNameDirty && (
                              <div className="inline-field-actions">
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-cancel-btn"
                                  onClick={() => handleInlineCancelClick("middle_name")}
                                  disabled={savingField === "middle_name"}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-save-btn"
                                  onClick={() => saveSingleField("middle_name", draft.middle_name)}
                                  disabled={savingField === "middle_name"}
                                >
                                  {savingField === "middle_name" ? "Saving..." : "Save"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Last Name */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label className="inline-field-label">Last Name</label>
                            {fieldSuccess === "last_name" && <span className="inline-field-saved-badge">✔ Saved</span>}
                          </div>
                          <div className="inline-field-row">
                            <input
                              className="inline-field-control"
                              value={draft.last_name || ""}
                              onChange={(e) => updateDraft("last_name", e.target.value)}
                              placeholder="Last Name"
                            />
                            {isLastNameDirty && (
                              <div className="inline-field-actions">
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-cancel-btn"
                                  onClick={() => handleInlineCancelClick("last_name")}
                                  disabled={savingField === "last_name"}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-save-btn"
                                  onClick={() => saveSingleField("last_name", draft.last_name)}
                                  disabled={savingField === "last_name" || !draft.last_name?.trim()}
                                >
                                  {savingField === "last_name" ? "Saving..." : "Save"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2ND LINE: Gender, Province, City / Municipality */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", width: "100%" }}>
                        {/* Gender */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label className="inline-field-label">Gender</label>
                            {fieldSuccess === "gender" && <span className="inline-field-saved-badge">✔ Saved</span>}
                          </div>
                          <div className="inline-field-row">
                            <select
                              className="inline-field-control"
                              value={draft.gender || "Prefer not to say"}
                              onChange={(event) => updateDraft("gender", event.target.value)}
                            >
                              {GENDER_OPTIONS.map((g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))}
                            </select>
                            {isGenderDirty && (
                              <div className="inline-field-actions">
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-cancel-btn"
                                  onClick={() => handleInlineCancelClick("gender")}
                                  disabled={savingField === "gender"}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-save-btn"
                                  onClick={() => saveSingleField("gender", draft.gender || "Prefer not to say")}
                                  disabled={savingField === "gender"}
                                >
                                  {savingField === "gender" ? "Saving..." : "Save"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Province */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label className="inline-field-label">Province</label>
                            {fieldSuccess === "province" && <span className="inline-field-saved-badge">✔ Saved</span>}
                          </div>
                          <div className="inline-field-row">
                            <select
                              className="inline-field-control"
                              value={draft.province || "Cavite"}
                              onChange={(event) => {
                                const newProv = event.target.value;
                                updateDraft("province", newProv);
                                const cities = getCitiesByProvince(newProv);
                                if (!cities.includes(draft.city || "")) {
                                  updateDraft("city", cities[0] || "");
                                }
                              }}
                            >
                              <option value="">Select province</option>
                              {ALL_PHILIPPINES_PROVINCES.map((prov) => (
                                <option key={prov} value={prov}>
                                  {prov}
                                </option>
                              ))}
                            </select>
                            {isProvinceDirty && (
                              <div className="inline-field-actions">
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-cancel-btn"
                                  onClick={() => handleInlineCancelClick("province")}
                                  disabled={savingField === "province"}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-save-btn"
                                  onClick={() => saveSingleField("province", draft.province)}
                                  disabled={savingField === "province" || !draft.province}
                                >
                                  {savingField === "province" ? "Saving..." : "Save"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* City / Municipality */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label className="inline-field-label">City / Municipality</label>
                            {fieldSuccess === "city" && <span className="inline-field-saved-badge">✔ Saved</span>}
                          </div>
                          <div className="inline-field-row">
                            <select
                              className="inline-field-control"
                              value={draft.city || ""}
                              onChange={(event) => updateDraft("city", event.target.value)}
                            >
                              <option value="">Select city / municipality</option>
                              {getCitiesByProvince(draft.province || "Cavite").map((city) => (
                                <option key={city} value={city}>
                                  {city}
                                </option>
                              ))}
                            </select>
                            {isCityDirty && (
                              <div className="inline-field-actions">
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-cancel-btn"
                                  onClick={() => handleInlineCancelClick("city")}
                                  disabled={savingField === "city"}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-save-btn"
                                  onClick={() => saveSingleField("city", draft.city)}
                                  disabled={savingField === "city" || !draft.city}
                                >
                                  {savingField === "city" ? "Saving..." : "Save"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3RD LINE: Phone Number, Email Address */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px", width: "100%" }}>
                        {/* Phone Number */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label className="inline-field-label">Phone Number</label>
                            {fieldSuccess === "phone" && <span className="inline-field-saved-badge">✔ Saved</span>}
                          </div>
                          <div className="inline-field-row">
                            <div className="inline-field-input-wrap">
                              <span className="inline-field-phone-prefix">
                                +63
                              </span>
                              <input
                                className="inline-field-control inline-field-phone-input"
                                value={normalizePhoneNumber(draft.phone)}
                                maxLength={10}
                                inputMode="numeric"
                                onChange={(e) => updateDraft("phone", e.target.value)}
                                placeholder="9123456789"
                              />
                            </div>
                            {isPhoneDirty && (
                              <div className="inline-field-actions">
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-cancel-btn"
                                  onClick={() => handleInlineCancelClick("phone")}
                                  disabled={savingField === "phone"}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-save-btn"
                                  onClick={() => saveSingleField("phone", normalizePhoneNumber(draft.phone))}
                                  disabled={savingField === "phone" || normalizePhoneNumber(draft.phone).length !== 10}
                                >
                                  {savingField === "phone" ? "Saving..." : "Save"}
                                </button>
                              </div>
                            )}
                          </div>
                          <small className={`inline-field-subtext ${isPhoneDirty && normalizePhoneNumber(draft.phone).length !== 10 ? "error" : ""}`}>
                            {isPhoneDirty && normalizePhoneNumber(draft.phone).length !== 10
                              ? `Phone number must have exactly 10 digits (${normalizePhoneNumber(draft.phone).length}/10)`
                              : "10-digit mobile number excluding country code."}
                          </small>
                        </div>

                        {/* Email Address */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label className="inline-field-label">Email Address</label>
                            {fieldSuccess === "email" && <span className="inline-field-saved-badge">✔ Saved</span>}
                          </div>
                          <div className="inline-field-row">
                            <div className="inline-field-input-wrap">
                              <input
                                type="email"
                                className="inline-field-control"
                                value={draft.email || ""}
                                onChange={(e) => updateDraft("email", e.target.value)}
                                placeholder="example@domain.com"
                                style={{ width: "100%", paddingRight: !isEmailDirty && isEmailVerifiedForDraft ? "95px" : "14px" }}
                              />
                              {!isEmailDirty && isEmailVerifiedForDraft && (
                                <span className="inline-field-email-verified-pill">
                                  ✔ Verified
                                </span>
                              )}
                            </div>
                            {isEmailDirty && (
                              <div className="inline-field-actions">
                                <button
                                  type="button"
                                  className="inline-field-btn inline-field-cancel-btn"
                                  onClick={() => handleInlineCancelClick("email")}
                                  disabled={savingField === "email"}
                                >
                                  Cancel
                                </button>
                                {!isEmailVerifiedForDraft ? (
                                  <button
                                    type="button"
                                    className="inline-field-btn inline-field-verify-btn"
                                    onClick={handleSendEmailOtp}
                                    disabled={isSendingOtp || !draft.email?.trim() || !draft.email.includes("@")}
                                  >
                                    {isSendingOtp ? "Sending..." : "Verify"}
                                  </button>
                                ) : (
                                  <>
                                    <span className="inline-field-saved-badge">✔ Verified</span>
                                    <button
                                      type="button"
                                      className="inline-field-btn inline-field-save-btn"
                                      onClick={() => saveSingleField("email", draft.email)}
                                      disabled={savingField === "email"}
                                    >
                                      {savingField === "email" ? "Saving..." : "Save"}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <small className="inline-field-subtext">
                            {isEmailDirty && !isEmailVerifiedForDraft
                              ? "Changing your email requires verifying before saving."
                              : "Primary contact email used for communication and notifications."}
                          </small>
                        </div>
                      </div>

                      {/* 4TH LINE: Professional Summary / Career Bio */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <label className="inline-field-label">Professional Summary / Career Bio</label>
                          {fieldSuccess === "summary" && <span className="inline-field-saved-badge">✔ Saved</span>}
                        </div>
                        <div className="inline-field-row inline-field-row-textarea">
                          <textarea
                            className="inline-field-control"
                            rows={4}
                            value={draft.summary || ""}
                            placeholder="Briefly describe your professional background, key achievements, and core strengths..."
                            onChange={(e) => updateDraft("summary", e.target.value)}
                            style={{ resize: "vertical" }}
                          />
                          {isSummaryDirty && (
                            <div className="inline-field-actions inline-field-actions-textarea">
                              <button
                                type="button"
                                className="inline-field-btn inline-field-cancel-btn"
                                onClick={() => handleInlineCancelClick("summary")}
                                disabled={savingField === "summary"}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="inline-field-btn inline-field-save-btn"
                                onClick={() => saveSingleField("summary", draft.summary)}
                                disabled={savingField === "summary"}
                              >
                                {savingField === "summary" ? "Saving..." : "Save"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 5TH LINE: Spoken Languages inside the SAME personal-card container */}
                    <div className="languages-row wide">
                      <LanguagesEditor
                        rawString={profile.languages}
                        onSave={(items) => saveTagList("languages", items)}
                        disabled={isSavingTags}
                      />
                    </div>
                </article>
              </section>
            );
          })()}

          {/* =================================================================
              SECTION 2: CAREER TARGETS & JOB PREFERENCES
              ================================================================= */}
          {activeSection === "preferences" && (() => {
            const isJobTitleDirty = (draft.desired_job_title || "").trim() !== (profile.desired_job_title || "").trim();
            const isArrangementDirty = (draft.work_arrangement || "").trim() !== (profile.work_arrangement || "").trim();
            const isSalaryMinDirty = parseSalaryInteger(draft.expected_salary_min) !== parseSalaryInteger(profile.expected_salary_min);
            const isSalaryMaxDirty = parseSalaryInteger(draft.expected_salary_max) !== parseSalaryInteger(profile.expected_salary_max);

            return (
            <section className="profile-section-block">
              <div className="location-cards-row">
                <article className="profile-card nearby-finder-card location-subcard">
                  <div className="nearby-card-header" style={{ paddingBottom: "4px" }}>
                    <div className="nearby-card-title-wrap">
                      <strong>Nearby Employer Discovery</strong>
                      <p className="nearby-desc">
                        Set 1 location (city/municipality) to participate in nearby employer candidate searches.
                      </p>
                    </div>
                  </div>

                  <div className="profile-divider" style={{ margin: "12px 0 16px 0" }} />

                  <div className="nearby-card-footer" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
                    {/* Top Status & Chosen NAF Location Row */}
                    {(() => {
                      const isParticipating = Boolean(
                        profile.nearby_location && profile.nearby_location.trim().length > 0
                      );

                      const fullLoc = profile.nearby_location
                        || (profile.city ? `${profile.city}${profile.province ? `, ${profile.province}` : ""}` : profile.address || profile.province || "Cavite Area");

                      return (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                            {/* Left: Chosen NAF Full Location above Change Location button */}
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#0369a1" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                              </svg>
                              {fullLoc}
                            </div>

                            {/* Right: Status badge (Green when ON, Red when OFF) */}
                            {isParticipating ? (
                              <span className="nearby-pinpointed-tag">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Participating
                              </span>
                            ) : (
                              <span className="nearby-inactive-tag">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </svg>
                                Not Participating
                              </span>
                            )}
                          </div>

                          {/* Bottom Action Buttons Row */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "12px" }}>
                            <button
                              type="button"
                              className="nearby-action-btn opt-change-btn"
                              onClick={handleOpenNearbyModal}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                              </svg>
                              Change Location
                            </button>

                            {/* Modern Interactive Toggle Switch */}
                            <label
                              className="nearby-toggle-switch"
                              title={isParticipating ? "Turn OFF participation" : "Turn ON participation"}
                            >
                              <span className="nearby-toggle-label">
                                {isUpdatingParticipation ? "Updating..." : isParticipating ? "ON" : "OFF"}
                              </span>
                              <input
                                type="checkbox"
                                checked={isParticipating}
                                onChange={promptToggleParticipation}
                                disabled={isUpdatingParticipation}
                                style={{ display: "none" }}
                              />
                              <span className={`toggle-slider ${isParticipating ? "active" : ""}`}>
                                <span className="toggle-thumb" />
                              </span>
                            </label>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </article>

                <article className="profile-card preferences-card location-subcard" style={{ padding: "20px 24px" }}>
                  <div>
                    <div className="person-heading" style={{ flexWrap: "wrap", gap: "12px", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <strong style={{ fontSize: "1.1rem", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                          Preferred Work Locations
                        </strong>
                        <small style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: 400 }}>
                          Specify cities or regions where you prefer or are open to work
                        </small>
                      </div>
                      <button
                        type="button"
                        className="manage-pref-loc-btn"
                        onClick={() => setIsPreferredLocModalOpen(true)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        Manage Preferred Locations
                      </button>
                    </div>

                    <div className="profile-divider" style={{ margin: "16px 0 16px 0" }} />

                    <div className="selected-items-list" style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
                      {parsePreferredLocationTags(getPreferredLocationsRaw(profile)).length === 0 ? (
                        <div className="empty-category-notice" style={{ padding: "12px", width: "100%" }}>
                          No preferred work locations set yet. Click &quot;Manage Preferred Locations&quot; above to select up to 5 target cities.
                        </div>
                      ) : (
                        parsePreferredLocationTags(getPreferredLocationsRaw(profile)).map((locTag, idx) => (
                          <span key={`${locTag}-${idx}`} className="pref-loc-pill">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            {locTag}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </article>
              </div>

              <article className="profile-card preferences-card role-employment-accordion-card">
                <div className="person-heading role-employment-heading">
                  <div className="role-employment-heading-left">
                    <div className="role-employment-title-row">
                      <strong>Role & Employment Targeting</strong>
                      <span className="role-count-pill">
                        {targetRoles.length} {targetRoles.length === 1 ? "Role" : "Roles"} Configured
                      </span>
                    </div>
                    <small>Configure each target role with individual work arrangement and salary preferences</small>
                  </div>

                  <div className="role-employment-heading-right">
                    {fieldSuccess === "desired_job_title" && <span className="inline-field-saved-badge">✔ Saved</span>}
                    <button
                      type="button"
                      className="role-add-header-btn"
                      onClick={() => {
                        setIsRoleEmploymentOpen(true);
                        setIsAddingRole(true);
                      }}
                    >
                      + Add Role
                    </button>
                  </div>
                </div>

                {isRoleEmploymentOpen && (
                  <>
                    <div className="profile-divider" />

                    <div className="fields-grid" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* List of Configured Target Roles */}
                      <div className="target-roles-list-container">
                        {/* Expandable Add Role Card (shown when '+ Add Role' clicked above) */}
                        {isAddingRole && (
                          <div className="target-role-preference-card add-role-card">
                            <div className="role-pref-card-header">
                              <div className="role-pref-header-left">
                                <h4 className="role-pref-title" style={{ color: "#0284c7" }}>Add New Target Role</h4>
                              </div>
                              {(() => {
                                const isRoleTitleSet = Boolean(newRoleTitle.trim());
                                const isWorkArrangementSet = Boolean(newRoleArrangement);
                                const rawMin = newRoleSalaryMin.replace(/[^0-9.]/g, "").trim();
                                const rawMax = newRoleSalaryMax.replace(/[^0-9.]/g, "").trim();
                                const isSalaryValid = !rawMin || !rawMax || Number(rawMax) >= Number(rawMin);
                                const isSalaryProvided = Boolean(rawMin) || Boolean(rawMax);
                                const isSalarySet = Boolean(newRoleHideSalary) || (isSalaryProvided && isSalaryValid);
                                const canSave = !isSavingNewRole && isRoleTitleSet && isWorkArrangementSet && isSalarySet;

                                return (
                                  <div className="role-pref-header-right">
                                    <div className="inline-field-actions role-card-actions">
                                      <button
                                        type="button"
                                        className="inline-field-btn inline-field-cancel-btn"
                                        onClick={handleCancelAddRole}
                                        disabled={isSavingNewRole}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="inline-field-btn inline-field-save-btn"
                                        onClick={handleSaveNewRole}
                                        disabled={!canSave}
                                        title={!canSave ? "Job role, work arrangement, and salary must be set before saving" : "Save role"}
                                      >
                                        {isSavingNewRole ? "Saving..." : "Save"}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="role-add-form-body">
                              {/* Categorized Job Selection: Category + Specific Role */}
                              <div className="role-add-category-role-grid">
                                <div className="profile-field">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <label className="role-pref-sublabel">JOB CATEGORY *</label>
                                    <small style={{ color: "#64748b", fontSize: "0.8rem" }}>Select parent industry</small>
                                  </div>
                                  <SearchableSelect
                                    options={["All Categories", ...JOB_CATEGORIES_LIST]}
                                    value={newRoleCategory || ""}
                                    onChange={(cat) => {
                                      const nextCat = cat === "All Categories" ? "" : cat;
                                      setNewRoleCategory(nextCat);
                                      if (cat && cat !== "All Categories" && newRoleTitle && CATEGORIZED_JOB_ROLES[cat] && !CATEGORIZED_JOB_ROLES[cat].some((r) => r.toLowerCase() === newRoleTitle.toLowerCase())) {
                                        setNewRoleTitle("");
                                      }
                                    }}
                                    onSelectOption={(cat) => {
                                      const nextCat = cat === "All Categories" ? "" : cat;
                                      setNewRoleCategory(nextCat);
                                      if (cat && cat !== "All Categories" && newRoleTitle && CATEGORIZED_JOB_ROLES[cat] && !CATEGORIZED_JOB_ROLES[cat].some((r) => r.toLowerCase() === newRoleTitle.toLowerCase())) {
                                        setNewRoleTitle("");
                                      }
                                    }}
                                    placeholder="All Categories (or choose category)..."
                                    disabled={isSavingNewRole}
                                  />
                                </div>

                                <div className="profile-field">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <label className="role-pref-sublabel">TARGET JOB ROLE *</label>
                                    <small style={{ color: "#64748b", fontSize: "0.8rem" }}>
                                      {newRoleCategory ? `Roles in ${newRoleCategory}` : "Select role or type custom"}
                                    </small>
                                  </div>
                                  <SearchableSelect
                                    options={(newRoleCategory && CATEGORIZED_JOB_ROLES[newRoleCategory]
                                      ? CATEGORIZED_JOB_ROLES[newRoleCategory]
                                      : ALL_MULTI_INDUSTRY_JOB_ROLES
                                    ).filter(
                                      (opt) => !targetRoles.some((r) => r.title.toLowerCase() === opt.toLowerCase())
                                    )}
                                    groupedOptions={newRoleCategory ? undefined : CATEGORIZED_JOB_ROLES}
                                    value={newRoleTitle}
                                    onChange={(val) => {
                                      setNewRoleTitle(val);
                                      if (!newRoleCategory && val) {
                                        const detected = getCategoryForRole(val);
                                        if (detected && detected !== "Other Specializations") {
                                          setNewRoleCategory(detected);
                                        }
                                      }
                                    }}
                                    onEnterAdd={handleSaveNewRole}
                                    placeholder={newRoleCategory ? `Select role in ${newRoleCategory}...` : "Select or type target job role (e.g. Full Stack Developer, UI/UX Designer)..."}
                                    disabled={isSavingNewRole}
                                  />
                                </div>
                              </div>

                              {/* Work Arrangement & Salary Range Row */}
                              <div className="role-pref-card-body">
                                {/* Left Column: Work Arrangement */}
                                <div className="role-pref-col role-pref-col-arrangement">
                                  <label className="role-pref-sublabel">WORK ARRANGEMENT PREFERENCE *</label>
                                  <div className="role-work-arrangement-select-wrap">
                                    <select
                                      className="role-work-arrangement-select"
                                      value={newRoleArrangement}
                                      onChange={(e) => setNewRoleArrangement(e.target.value)}
                                      disabled={isSavingNewRole}
                                      aria-label="Work Arrangement Preference"
                                    >
                                      <option value="">Select work arrangement...</option>
                                      <option value="On-Site">On-Site</option>
                                      <option value="Hybrid">Hybrid</option>
                                      <option value="Remote">Remote</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Right Column: Salary Range */}
                                {(() => {
                                  const newRoleSalaryError = getSalaryRangeError(newRoleSalaryMin, newRoleSalaryMax, newRoleSalaryLastField);

                                  return (
                                    <div className="role-pref-col role-pref-col-salary">
                                      <label className="role-pref-sublabel">SALARY RANGE (PHP) *</label>
                                      <div className="salary-controls-row">
                                        <button
                                          type="button"
                                          className={`hide-salary-btn ${newRoleHideSalary ? "active" : ""}`}
                                          aria-label={newRoleHideSalary ? "Salary is hidden (Negotiable). Click to show." : "Click to hide salary (Negotiable)"}
                                          onClick={() => setNewRoleHideSalary((prev) => !prev)}
                                          title={newRoleHideSalary ? "Salary is hidden (Negotiable). Click to show." : "Click to hide salary (Negotiable)"}
                                        >
                                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            {newRoleHideSalary ? (
                                              <>
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                              </>
                                            ) : (
                                              <>
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                              </>
                                            )}
                                          </svg>
                                        </button>

                                        <div className="salary-inputs-subrow">
                                          <div className="salary-input-wrap">
                                            <input
                                              className={newRoleSalaryError ? "has-error" : ""}
                                              placeholder="Min Salary"
                                              value={newRoleSalaryMin}
                                              onFocus={() => setNewRoleSalaryLastField("min")}
                                              onChange={(e) => {
                                                setNewRoleSalaryLastField("min");
                                                if (newRoleHideSalary) setNewRoleHideSalary(false);
                                                const sanitized = e.target.value.replace(/[^0-9.]/g, "");
                                                setNewRoleSalaryMin(sanitized);
                                              }}
                                              onBlur={() => {
                                                if (newRoleSalaryMin) {
                                                  const num = Number(newRoleSalaryMin.replace(/,/g, ""));
                                                  if (Number.isFinite(num) && num >= 0) {
                                                    setNewRoleSalaryMin(num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                                  }
                                                }
                                              }}
                                              aria-label="Minimum Salary (PHP)"
                                            />
                                          </div>
                                          <div className="salary-input-wrap">
                                            <input
                                              className={newRoleSalaryError ? "has-error" : ""}
                                              placeholder="Max Salary"
                                              value={newRoleSalaryMax}
                                              onFocus={() => setNewRoleSalaryLastField("max")}
                                              onChange={(e) => {
                                                setNewRoleSalaryLastField("max");
                                                if (newRoleHideSalary) setNewRoleHideSalary(false);
                                                const sanitized = e.target.value.replace(/[^0-9.]/g, "");
                                                setNewRoleSalaryMax(sanitized);
                                              }}
                                              onBlur={() => {
                                                if (newRoleSalaryMax) {
                                                  const num = Number(newRoleSalaryMax.replace(/,/g, ""));
                                                  if (Number.isFinite(num) && num >= 0) {
                                                    setNewRoleSalaryMax(num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                                  }
                                                }
                                              }}
                                              aria-label="Maximum Salary (PHP)"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      {newRoleSalaryError && (
                                        <small className="salary-range-warning" role="alert">
                                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                          </svg>
                                          <span>{newRoleSalaryError}</span>
                                        </small>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        )}

                        {targetRoles.length === 0 && !isAddingRole ? (
                          <div className="empty-category-notice" style={{ padding: "16px", width: "100%", textAlign: "center" }}>
                            No target roles configured yet. Click &quot;+ Add Role&quot; above to set your target roles, work arrangements, and salary expectations.
                          </div>
                        ) : (
                          targetRoles.map((roleItem) => {
                            const isEditingThisRole = editingRoleId === roleItem.id;
                            const isSavingThisRole = savingField === `role_${roleItem.id}`;

                            const isRoleTitleSet = Boolean((roleItem.title || "").trim());
                            const isWorkArrangementSet = Boolean(roleItem.work_arrangements && roleItem.work_arrangements.length > 0 && roleItem.work_arrangements[0]);
                            let curMin = roleItem.salary_min != null ? String(roleItem.salary_min).replace(/[^0-9.]/g, "").trim() : "";
                            let curMax = roleItem.salary_max != null ? String(roleItem.salary_max).replace(/[^0-9.]/g, "").trim() : "";
                            if (activeRoleSalaryInput && activeRoleSalaryInput.id === roleItem.id) {
                              if (activeRoleSalaryInput.field === "salary_min") curMin = activeRoleSalaryInput.value.replace(/[^0-9.]/g, "").trim();
                              if (activeRoleSalaryInput.field === "salary_max") curMax = activeRoleSalaryInput.value.replace(/[^0-9.]/g, "").trim();
                            }
                            const isRoleSalaryValid = !curMin || !curMax || Number(curMax) >= Number(curMin);
                            const isRoleSalaryProvided = Boolean(curMin) || Boolean(curMax);
                            const isRoleSalarySet = Boolean(roleItem.hide_salary) || (isRoleSalaryProvided && isRoleSalaryValid);
                            const canSaveThisRole = !isSavingThisRole && isRoleTitleSet && isWorkArrangementSet && isRoleSalarySet;
                            const lastRoleField = roleSalaryLastField[roleItem.id] || (activeRoleSalaryInput?.id === roleItem.id && activeRoleSalaryInput.field === "salary_min" ? "min" : "max");
                            const roleSalaryError = getSalaryRangeError(curMin, curMax, lastRoleField);

                            if (!isEditingThisRole) {
                              return (
                                <div className="target-role-preference-card target-role-singular-line" key={roleItem.id}>
                                  <div className="role-pref-card-header">
                                    <div className="role-pref-header-left">
                                      <div className="role-pref-category-tag-row">
                                        <span className="role-pref-category-badge">
                                          {roleItem.category || getCategoryForRole(roleItem.title)}
                                        </span>
                                      </div>
                                      <h4 className="role-pref-title">{roleItem.title}</h4>
                                      <div className="role-pref-summary-pills">
                                        {(roleItem.work_arrangements && roleItem.work_arrangements.length > 0) && (
                                          <span className="role-summary-pill-arr">
                                            {roleItem.work_arrangements.join(", ")}
                                          </span>
                                        )}
                                        <span className="role-summary-pill-sal">
                                          {roleItem.hide_salary
                                            ? "Salary Hidden"
                                            : roleItem.salary_min && roleItem.salary_max
                                            ? `PHP ${roleItem.salary_min} - ${roleItem.salary_max}`
                                            : roleItem.salary_min
                                            ? `From PHP ${roleItem.salary_min}`
                                            : roleItem.salary_max
                                            ? `Up to PHP ${roleItem.salary_max}`
                                            : "No salary set"}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="role-pref-header-right">
                                      {roleSavedId === roleItem.id && (
                                        <span className="inline-field-saved-badge">✔ Saved</span>
                                      )}
                                      <button
                                        type="button"
                                        className="role-pref-edit-btn"
                                        onClick={() => setEditingRoleId(roleItem.id)}
                                        title={`Edit ${roleItem.title}`}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="role-pref-remove-btn"
                                        onClick={() => handleRemoveTargetRole(roleItem.id)}
                                        title={`Remove ${roleItem.title}`}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="target-role-preference-card editing-role-card" key={roleItem.id}>
                                <div className="role-pref-card-header">
                                  <div className="role-pref-header-left">
                                    <div className="role-pref-category-tag-row">
                                      <span className="role-pref-category-badge">
                                        {roleItem.category || getCategoryForRole(roleItem.title)}
                                      </span>
                                    </div>
                                    <h4 className="role-pref-title">{roleItem.title}</h4>
                                    <div className="role-pref-summary-pills">
                                      {(roleItem.work_arrangements && roleItem.work_arrangements.length > 0) && (
                                        <span className="role-summary-pill-arr">
                                          {roleItem.work_arrangements.join(", ")}
                                        </span>
                                      )}
                                      <span className="role-summary-pill-sal">
                                        {roleItem.hide_salary
                                          ? "Salary Hidden"
                                          : roleItem.salary_min && roleItem.salary_max
                                          ? `PHP ${roleItem.salary_min} - ${roleItem.salary_max}`
                                          : roleItem.salary_min
                                          ? `From PHP ${roleItem.salary_min}`
                                          : roleItem.salary_max
                                          ? `Up to PHP ${roleItem.salary_max}`
                                          : "No salary set"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="role-pref-header-right">
                                    <div className="inline-field-actions role-card-actions">
                                      <button
                                        type="button"
                                        className="inline-field-btn inline-field-cancel-btn"
                                        onClick={() => handleCancelRole(roleItem.id)}
                                        disabled={isSavingThisRole}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="inline-field-btn inline-field-save-btn"
                                        onClick={() => handleSaveRole(roleItem.id)}
                                        disabled={!canSaveThisRole}
                                        title={!canSaveThisRole ? "Job role, work arrangement, and salary must be set before saving" : "Save role"}
                                      >
                                        {isSavingThisRole ? "Saving..." : "Save"}
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      className="role-pref-remove-btn"
                                      onClick={() => handleRemoveTargetRole(roleItem.id)}
                                      title={`Remove ${roleItem.title}`}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                <div className="role-pref-card-body">
                                  <div className="role-add-category-role-grid" style={{ gridColumn: "1 / -1", width: "100%", marginBottom: "14px" }}>
                                    <div className="profile-field">
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                        <label className="role-pref-sublabel">JOB CATEGORY *</label>
                                        <small style={{ color: "#64748b", fontSize: "0.8rem" }}>Parent industry</small>
                                      </div>
                                      <SearchableSelect
                                        options={["All Categories", ...JOB_CATEGORIES_LIST]}
                                        value={roleItem.category || getCategoryForRole(roleItem.title) || ""}
                                        onChange={(cat) => {
                                          const nextCat = cat === "All Categories" ? "" : cat;
                                          setTargetRoles((prev) =>
                                            prev.map((r) =>
                                              r.id === roleItem.id
                                                ? {
                                                    ...r,
                                                    category: nextCat,
                                                    title:
                                                      nextCat &&
                                                      r.title &&
                                                      CATEGORIZED_JOB_ROLES[nextCat] &&
                                                      !CATEGORIZED_JOB_ROLES[nextCat].some(
                                                        (ro) => ro.toLowerCase() === r.title.toLowerCase()
                                                      )
                                                        ? ""
                                                        : r.title,
                                                  }
                                                : r
                                            )
                                          );
                                        }}
                                        onSelectOption={(cat) => {
                                          const nextCat = cat === "All Categories" ? "" : cat;
                                          setTargetRoles((prev) =>
                                            prev.map((r) =>
                                              r.id === roleItem.id
                                                ? {
                                                    ...r,
                                                    category: nextCat,
                                                    title:
                                                      nextCat &&
                                                      r.title &&
                                                      CATEGORIZED_JOB_ROLES[nextCat] &&
                                                      !CATEGORIZED_JOB_ROLES[nextCat].some(
                                                        (ro) => ro.toLowerCase() === r.title.toLowerCase()
                                                      )
                                                        ? ""
                                                        : r.title,
                                                  }
                                                : r
                                            )
                                          );
                                        }}
                                        placeholder="All Categories (or choose category)..."
                                        disabled={isSavingThisRole}
                                      />
                                    </div>

                                    <div className="profile-field">
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                        <label className="role-pref-sublabel">TARGET JOB ROLE *</label>
                                        <small style={{ color: "#64748b", fontSize: "0.8rem" }}>
                                          {roleItem.category ? `Roles in ${roleItem.category}` : "Select role or type custom"}
                                        </small>
                                      </div>
                                      <SearchableSelect
                                        options={(roleItem.category && CATEGORIZED_JOB_ROLES[roleItem.category]
                                          ? CATEGORIZED_JOB_ROLES[roleItem.category]
                                          : ALL_MULTI_INDUSTRY_JOB_ROLES
                                        ).filter(
                                          (opt) => opt.toLowerCase() === roleItem.title.toLowerCase() || !targetRoles.some((r) => r.id !== roleItem.id && r.title.toLowerCase() === opt.toLowerCase())
                                        )}
                                        groupedOptions={roleItem.category ? undefined : CATEGORIZED_JOB_ROLES}
                                        value={roleItem.title}
                                        onChange={(newTitle) => {
                                          const detected = getCategoryForRole(newTitle);
                                          setTargetRoles((prev) =>
                                            prev.map((r) =>
                                              r.id === roleItem.id
                                                ? {
                                                    ...r,
                                                    title: newTitle,
                                                    category: r.category || (detected !== "Other Specializations" ? detected : r.category),
                                                  }
                                                : r
                                            )
                                          );
                                        }}
                                        placeholder="Select or type target job role..."
                                      />
                                    </div>
                                  </div>

                                  {/* Left Column: Work Arrangement */}
                                  <div className="role-pref-col role-pref-col-arrangement">
                                    <label className="role-pref-sublabel">WORK ARRANGEMENT PREFERENCE *</label>
                                    <div className="role-work-arrangement-select-wrap">
                                      <select
                                        className="role-work-arrangement-select"
                                        value={roleItem.work_arrangements?.[0] || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setTargetRoles((prev) =>
                                            prev.map((r) =>
                                              r.id === roleItem.id
                                                ? { ...r, work_arrangements: val ? [val] : [] }
                                                : r
                                            )
                                          );
                                        }}
                                        disabled={isSavingThisRole}
                                        aria-label="Work Arrangement Preference"
                                      >
                                        <option value="">Select work arrangement...</option>
                                        <option value="On-Site">On-Site</option>
                                        <option value="Hybrid">Hybrid</option>
                                        <option value="Remote">Remote</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Right Column: Salary Range (PHP) */}
                                  <div className="role-pref-col role-pref-col-salary">
                                    <label className="role-pref-sublabel">
                                      SALARY RANGE (PHP) *
                                    </label>
                                    <div className="salary-controls-row">
                                      <button
                                        type="button"
                                        className={`hide-salary-btn ${roleItem.hide_salary ? "active" : ""}`}
                                        aria-label={roleItem.hide_salary ? "Salary is hidden (Negotiable). Click to show." : "Click to hide salary (Negotiable)"}
                                        onClick={() => handleToggleRoleHideSalary(roleItem.id)}
                                        title={roleItem.hide_salary ? "Salary is hidden (Negotiable). Click to show." : "Click to hide salary (Negotiable)"}
                                      >
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                          {roleItem.hide_salary ? (
                                            <>
                                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                              <line x1="1" y1="1" x2="23" y2="23" />
                                            </>
                                          ) : (
                                            <>
                                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                              <circle cx="12" cy="12" r="3" />
                                            </>
                                          )}
                                        </svg>
                                      </button>

                                      <div className="salary-inputs-subrow">
                                        <div className="salary-input-wrap">
                                          {(() => {
                                            const isEditing = activeRoleSalaryInput?.id === roleItem.id && activeRoleSalaryInput?.field === "salary_min";
                                            const displayVal = isEditing
                                              ? activeRoleSalaryInput.value
                                              : roleItem.salary_min
                                              ? formatCurrencyInput(roleItem.salary_min)
                                              : "";
                                            return (
                                              <input
                                                className={roleSalaryError ? "has-error" : ""}
                                                placeholder="Min Salary"
                                                value={displayVal}
                                                onFocus={() => {
                                                  setRoleSalaryLastField((prev) => ({ ...prev, [roleItem.id]: "min" }));
                                                  handleFocusRoleSalary(roleItem.id, "salary_min");
                                                }}
                                                onChange={(e) => {
                                                  setRoleSalaryLastField((prev) => ({ ...prev, [roleItem.id]: "min" }));
                                                  handleChangeRoleSalary(roleItem.id, "salary_min", e.target.value);
                                                }}
                                                onBlur={() => handleBlurRoleSalary(roleItem.id, "salary_min")}
                                                disabled={isSavingThisRole}
                                                aria-label="Minimum Salary (PHP)"
                                              />
                                            );
                                          })()}
                                        </div>
                                        <div className="salary-input-wrap">
                                          {(() => {
                                            const isEditing = activeRoleSalaryInput?.id === roleItem.id && activeRoleSalaryInput?.field === "salary_max";
                                            const displayVal = isEditing
                                              ? activeRoleSalaryInput.value
                                              : roleItem.salary_max
                                              ? formatCurrencyInput(roleItem.salary_max)
                                              : "";
                                            return (
                                              <input
                                                className={roleSalaryError ? "has-error" : ""}
                                                placeholder="Max Salary"
                                                value={displayVal}
                                                onFocus={() => {
                                                  setRoleSalaryLastField((prev) => ({ ...prev, [roleItem.id]: "max" }));
                                                  handleFocusRoleSalary(roleItem.id, "salary_max");
                                                }}
                                                onChange={(e) => {
                                                  setRoleSalaryLastField((prev) => ({ ...prev, [roleItem.id]: "max" }));
                                                  handleChangeRoleSalary(roleItem.id, "salary_max", e.target.value);
                                                }}
                                                onBlur={() => handleBlurRoleSalary(roleItem.id, "salary_max")}
                                                disabled={isSavingThisRole}
                                                aria-label="Maximum Salary (PHP)"
                                              />
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                    {roleSalaryError && (
                                      <small className="salary-range-warning" role="alert">
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                          <line x1="12" y1="9" x2="12" y2="13" />
                                          <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                        <span>{roleSalaryError}</span>
                                      </small>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </article>
            </section>
            );
          })()}

          {/* =================================================================
              SECTION 3: COMPETENCIES, EXPERIENCE & DOCUMENTS (MAX 5 WITH YEARS)
              ================================================================= */}
          {activeSection === "competencies" && (
            <section className="profile-section-block">
              <div className="tags-layout">
                <div className="tags-left-col">
                  {/* 1. Senior High School & Vocational Education */}
                  <EduSchoolCardEditor
                    title="Senior High School & Vocational Education"
                    level="shs"
                    qualificationOptions={[...SHS_STRANDS_TAXONOMY, ...TESDA_VOCATIONAL_CERTIFICATIONS, "Senior High School Graduate"]}
                    schoolOptions={PHILIPPINES_SENIOR_HIGH_SCHOOLS}
                    rawString={profile.qualifications}
                    onSaveAll={(items) => saveTagList("qualifications", items)}
                    disabled={isSavingTags}
                    placeholderDegree="Select or type SHS strand / TESDA course..."
                    placeholderSchool="Select or type high school / vocational school..."
                  />

                  {/* 2. College & Tertiary Education */}
                  <EduSchoolCardEditor
                    title="College & Tertiary Education"
                    level="college"
                    qualificationOptions={MULTI_INDUSTRY_COURSES}
                    schoolOptions={universityList}
                    rawString={profile.qualifications}
                    onSaveAll={(items) => saveTagList("qualifications", items)}
                    disabled={isSavingTags}
                    placeholderDegree="Select or type degree / course (e.g. BSIT)..."
                    placeholderSchool="Select or type college / university name..."
                  />

                  {/* 3. Graduate Studies & Post-Graduate Education */}
                  <EduSchoolCardEditor
                    title="Graduate Studies (Master's & Doctorate Degrees)"
                    level="graduate"
                    qualificationOptions={GRADUATE_DEGREE_OPTIONS}
                    schoolOptions={universityList}
                    rawString={profile.qualifications}
                    onSaveAll={(items) => saveTagList("qualifications", items)}
                    disabled={isSavingTags}
                    placeholderDegree="Select or type master's or PhD program..."
                    placeholderSchool="Select or type university / institute name..."
                  />

                  {/* 3. Core Technical Skills */}
                  <CourseSkillsEditor
                    title="Core Technical Skills"
                    rawString={profile.skills}
                    onSave={(items) => saveTagList("skills", items)}
                    disabled={isSavingTags}
                  />

                  {/* 4. Professional Certifications */}
                  <CertificationsWithExpiryEditor
                    title="Professional Certifications"
                    options={ALL_CERTIFICATIONS_OPTIONS}
                    rawString={profile.certifications}
                    onSave={(items) => saveTagList("certifications", items)}
                    disabled={isSavingTags}
                  />
                </div>
              </div>
            </section>
          )}

          {/* =================================================================
              SECTION 4: WORK EXPERIENCE & EMPLOYMENT HISTORY (ATS COMPLIANT)
              ================================================================= */}
          {activeSection === "experience" && (
            <section className="profile-section-block">
              <article className="profile-card">
                <div className="person-heading">
                  <div>
                    <strong>Work Experience & Employment History</strong>
                  </div>
                  <button
                    type="button"
                    className="edit-profile-button"
                    onClick={() => {
                      if (isAddingExp) {
                        const hasUnsaved = checkHasUnsavedExp();
                        if (hasUnsaved) {
                          setIsUnsavedExpWarningOpen(true);
                        } else {
                          setIsAddingExp(false);
                          resetExpForm();
                        }
                      } else {
                        resetExpForm();
                        setIsAddingExp(true);
                      }
                    }}
                  >
                    {isAddingExp ? "Close Form" : "+ Add Experience"}
                  </button>
                </div>

                <div className="profile-divider" />

                {/* EXPANDABLE ADD / EDIT WORK EXPERIENCE FORM CARD */}
                {isAddingExp && (
                  <div className="add-work-exp-form">
                    <div className="add-work-exp-header">
                      <strong>{editingExpId ? "Edit Work Experience Entry" : "Add New Work Experience Entry"}</strong>
                      <span className="add-work-exp-subtitle">Enter your employment details and key bullet points to optimize ATS resume scoring</span>
                    </div>

                    <div className="fields-grid" style={{ marginTop: "14px" }}>
                      <label className="profile-field">
                        <span>Job Title</span>
                        <input
                          type="text"
                          placeholder="e.g. Senior Software Engineer"
                          value={expTitle}
                          onChange={(e) => setExpTitle(e.target.value)}
                        />
                      </label>

                      <label className="profile-field">
                        <span>Company / Employer Name</span>
                        <input
                          type="text"
                          placeholder="e.g. Accenture Philippines"
                          value={expCompany}
                          onChange={(e) => setExpCompany(e.target.value)}
                        />
                      </label>

                      <label className="profile-field">
                        <span>Province</span>
                        <select
                          value={expProvince}
                          onChange={(e) => {
                            const newProv = e.target.value;
                            setExpProvince(newProv);
                            const cities = getCitiesByProvince(newProv);
                            setExpCity(cities[0] || "");
                          }}
                        >
                          <option value="">Select province</option>
                          {ALL_PHILIPPINES_PROVINCES.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="profile-field">
                        <span>City / Municipality</span>
                        <select
                          value={expCity}
                          onChange={(e) => setExpCity(e.target.value)}
                        >
                          <option value="">Select city / municipality</option>
                          {getCitiesByProvince(expProvince || "Cavite").map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </label>

                      {/* SAME LINE: Start Date & End Date with 2 Selection Boxes each (Month & Year) */}
                      <div className="location-row wide">
                        <div className="profile-field">
                          <span>Start Date</span>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <select value={expStartMonth} onChange={(e) => setExpStartMonth(e.target.value)} style={{ flex: 1 }}>
                              <option value="">Month</option>
                              {MONTHS_LIST.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <select value={expStartYear} onChange={(e) => setExpStartYear(e.target.value)} style={{ flex: 1 }}>
                              <option value="">Year</option>
                              {YEARS_LIST.map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="profile-field">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>End Date</span>
                            <label style={{ display: "flex", gap: "5px", alignItems: "center", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", color: "#47637c" }}>
                              <input type="checkbox" checked={expIsCurrent} onChange={(e) => setExpIsCurrent(e.target.checked)} />
                              I currently work here
                            </label>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <select value={expEndMonth} disabled={expIsCurrent} onChange={(e) => setExpEndMonth(e.target.value)} style={{ flex: 1 }}>
                              <option value="">Month</option>
                              {MONTHS_LIST.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <select value={expEndYear} disabled={expIsCurrent} onChange={(e) => setExpEndYear(e.target.value)} style={{ flex: 1 }}>
                              <option value="">Year</option>
                              {YEARS_LIST.map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {expDateError && (
                          <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <span>{expDateError}</span>
                          </div>
                        )}
                      </div>

                      <label className="profile-field">
                        <span>Employment Type</span>
                        <select
                          value={expEmploymentType}
                          onChange={(e) => setExpEmploymentType(e.target.value)}
                        >
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Contract">Contract / Project-based</option>
                          <option value="Internship">Internship</option>
                          <option value="Freelance">Freelance</option>
                        </select>
                      </label>

                      <label className="profile-field wide">
                        <span>Key Responsibilities & Quantifiable Achievements (ATS Bullet Points)</span>
                        <small style={{ display: "block", color: "#64748b", margin: "4px 0 6px", fontSize: "0.84rem" }}>
                          Itemize each key responsibility or achievement by pressing Enter for a new line.
                        </small>
                        <textarea
                          rows={3}
                          placeholder="• Engineered scalable microservices...&#10;• Led agile sprint reviews..."
                          value={expResponsibilities}
                          onChange={(e) => setExpResponsibilities(e.target.value)}
                        />
                      </label>

                      <div className="profile-field wide">
                        <span>Technologies & Key Skills Used</span>
                        <div className="add-item-controls edu-add-controls languages-inline-controls" style={{ marginTop: "4px" }}>
                          <div className="edu-inputs-row languages-inline-row">
                            {expSkills.map((skillName, idx) => (
                              <div key={`${skillName}-${idx}`} className="exp-item-chip language-inline-chip">
                                <span className="exp-item-name">{skillName}</span>
                                <button
                                  type="button"
                                  className="exp-remove-btn"
                                  onClick={() => setExpSkills((current) => current.filter((_, i) => i !== idx))}
                                  title={`Remove ${skillName}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}

                            <div className="languages-add-group">
                              <SearchableSelect
                                options={ALL_SKILLS_OPTIONS.filter((opt) => !expSkills.some((s) => s.toLowerCase() === opt.toLowerCase()))}
                                value={expSkillInput}
                                disabled={false}
                                onChange={setExpSkillInput}
                                onEnterAdd={() => {
                                  const nameToAdd = expSkillInput.trim();
                                  if (!nameToAdd) return;
                                  if (!expSkills.some((s) => s.toLowerCase() === nameToAdd.toLowerCase())) {
                                    setExpSkills([...expSkills, nameToAdd]);
                                    setExpSkillInput("");
                                  }
                                }}
                                placeholder="Select or type technology/skill..."
                              />
                              <button
                                type="button"
                                className="add-item-btn"
                                onClick={() => {
                                  const nameToAdd = expSkillInput.trim();
                                  if (!nameToAdd) return;
                                  if (!expSkills.some((s) => s.toLowerCase() === nameToAdd.toLowerCase())) {
                                    setExpSkills([...expSkills, nameToAdd]);
                                    setExpSkillInput("");
                                  }
                                }}
                                disabled={!expSkillInput.trim()}
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        </div>
                        {expDateError && (
                          <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <span>{expDateError}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="add-work-exp-actions">
                      <button
                        type="button"
                        className="edit-profile-button"
                        style={{ background: "#0c2a47", color: "#fff", borderColor: "#0c2a47" }}
                        onClick={handleSaveWorkExperienceEntry}
                      >
                        Save Experience
                      </button>
                      <button
                        type="button"
                        className="cancel-profile-button"
                        onClick={() => {
                          const hasUnsaved = checkHasUnsavedExp();
                          if (hasUnsaved) {
                            setIsUnsavedExpWarningOpen(true);
                          } else {
                            setIsAddingExp(false);
                            resetExpForm();
                          }
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="work-exp-list">
                  {workExperiences.length === 0 ? (
                    <div className="empty-category-notice">
                      No work experience entries added yet. Click "+ Add Experience" to add your employment records.
                    </div>
                  ) : (
                    workExperiences.map((item) => {
                      const periodStr = item.isCurrent
                        ? `${item.startMonth || ''} ${item.startYear || ''} – Present`.trim()
                        : `${item.startMonth || ''} ${item.startYear || ''} – ${item.endMonth || ''} ${item.endYear || ''}`.trim();
                      const locationStr = [item.city, item.province].filter(Boolean).join(", ");
                      const bullets = item.responsibilities
                        ? item.responsibilities.split("\n").filter((b) => b.trim().length > 0)
                        : [];

                      return (
                        <div key={item.id} className="work-exp-item">
                          <div className="work-exp-item-header">
                            <div>
                              <h4 className="work-exp-title">
                                {item.title}
                                {item.employmentType && <span className="work-exp-type-badge">{item.employmentType}</span>}
                              </h4>
                              <p className="work-exp-company">{item.company}{locationStr ? ` • ${locationStr}` : ""}</p>
                            </div>
                            <div className="work-exp-period">{periodStr}</div>
                          </div>
                          {bullets.length > 0 && (
                            <ul className="work-exp-bullets">
                              {bullets.map((bullet, bIdx) => (
                                <li key={bIdx}>{bullet.replace(/^[•\-\*]\s*/, "")}</li>
                              ))}
                            </ul>
                          )}
                          <div className="work-exp-footer">
                            <div className="work-exp-skills">
                              {(item.skills || []).map((sk, sIdx) => (
                                <span key={sIdx} className="work-exp-skill-tag">{sk}</span>
                              ))}
                            </div>
                            <div className="work-exp-actions-btns">
                              <button
                                type="button"
                                className="work-exp-btn-edit"
                                onClick={() => handleEditWorkExperienceEntry(item)}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="work-exp-btn-delete"
                                onClick={() => handleDeleteWorkExperienceEntry(item.id)}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            </section>
          )}
        </div>
      </main>

      {/* NEARBY APPLICANT FINDER SINGLE LOCATION POPUP MODAL */}
      {isMapModalOpen && (
        <div className="applicant-map-modal-overlay">
          <div className="applicant-map-modal preferred-locations-modal">
            <div className="applicant-map-modal-header">
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Set Nearby Applicant Finder Location
              </h3>
              <button type="button" className="applicant-map-modal-close" onClick={() => setIsMapModalOpen(false)}>
                &times;
              </button>
            </div>

            {(() => {
              const rawCities = getCitiesByProvince(nearbyModalProvince);

              return (
                <div className="preferred-locations-modal-body">
                  {/* 2 SELECTION BOXES: PROVINCE & CITY/MUNICIPALITY */}
                  <div className="location-select-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px", marginBottom: "8px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        1. Province / Region
                      </label>
                      <SearchableSelect
                        options={ALL_PHILIPPINES_PROVINCES}
                        value={nearbyModalProvince}
                        disabled={isSavingLocation}
                        onChange={(prov) => {
                          setNearbyModalProvince(prov);
                          setNearbyModalCity("");
                        }}
                        placeholder="Select province..."
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        2. City / Municipality
                      </label>
                      <SearchableSelect
                        options={rawCities}
                        value={nearbyModalCity}
                        disabled={isSavingLocation || !nearbyModalProvince}
                        onChange={setNearbyModalCity}
                        placeholder={!nearbyModalProvince ? "Choose province first..." : "Select city/municipality..."}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="applicant-map-modal-footer">
              <span className="applicant-map-instruction">
                1 Location Max (Single Selection)
              </span>
              <div className="applicant-map-modal-btns">
                <button type="button" className="applicant-map-btn-cancel" onClick={() => setIsMapModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="applicant-map-btn-save"
                  onClick={promptSaveNearbyLocation}
                  disabled={isSavingLocation || !nearbyModalCity.trim()}
                >
                  {isSavingLocation ? "Saving..." : "Save Location"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREFERRED WORK LOCATIONS POPUP MODAL OVERLAY */}
      {isPreferredLocModalOpen && (
        <div className="applicant-map-modal-overlay">
          <div className="applicant-map-modal preferred-locations-modal">
            <div className="applicant-map-modal-header">
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Set Preferred Work Locations
              </h3>
              <button type="button" className="applicant-map-modal-close" onClick={() => setIsPreferredLocModalOpen(false)}>
                &times;
              </button>
            </div>

            {(() => {
              const currentLocList = parsePreferredLocationTags(getPreferredLocationsRaw(profile));
              const isMaxLocReached = currentLocList.length >= 5;
              const rawCities = getCitiesByProvince(preferredLocProvince);
              const availableCitiesForProvince = rawCities.filter(
                (c) => !currentLocList.some((p) => p.toLowerCase().includes(c.toLowerCase()))
              );

              const handleAddLocationTag = () => {
                if (isMaxLocReached || !preferredLocCity || !preferredLocProvince) return;
                const formattedTag = `${preferredLocCity}, ${preferredLocProvince}`;
                if (!currentLocList.some((c) => c.toLowerCase() === formattedTag.toLowerCase())) {
                  saveTagList("preferred_locations", [...currentLocList, formattedTag]);
                  setPreferredLocCity("");
                }
              };

              return (
                <div className="preferred-locations-modal-body">
                  <p className="preferred-loc-modal-desc">
                    Select a province and city/municipality where you prefer or are open to work (up to 5 locations max). Employers in these areas will be able to discover your profile.
                  </p>

                  {isMaxLocReached && (
                    <div className="max-items-notice" style={{ marginBottom: "12px", background: "#fffbe6", border: "1px solid #ffe58f", padding: "8px 12px", borderRadius: "6px", color: "#873800", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>Maximum limit of 5 preferred locations reached. Remove a location below to add another.</span>
                    </div>
                  )}

                  {/* 2 SELECTION BOXES: PROVINCE & CITY/MUNICIPALITY */}
                  <div className="location-select-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        1. Province / Region
                      </label>
                      <SearchableSelect
                        options={ALL_PHILIPPINES_PROVINCES}
                        value={preferredLocProvince}
                        disabled={isSavingTags || isMaxLocReached}
                        onChange={(prov) => {
                          setPreferredLocProvince(prov);
                          setPreferredLocCity("");
                        }}
                        placeholder="Select province..."
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        2. City / Municipality
                      </label>
                      <SearchableSelect
                        options={availableCitiesForProvince}
                        value={preferredLocCity}
                        disabled={isSavingTags || isMaxLocReached || !preferredLocProvince}
                        onChange={setPreferredLocCity}
                        onEnterAdd={handleAddLocationTag}
                        placeholder={!preferredLocProvince ? "Choose province first..." : "Select city/municipality..."}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="add-item-btn"
                    style={{ width: "100%", padding: "9px 16px", justifyContent: "center", marginBottom: "8px" }}
                    disabled={isMaxLocReached || !preferredLocCity.trim() || !preferredLocProvince || isSavingTags}
                    onClick={handleAddLocationTag}
                  >
                    + Add Location {preferredLocCity ? `(${preferredLocCity}, ${preferredLocProvince})` : ""}
                  </button>

                  {/* ACTIVE SELECTED LOCATION CHIPS */}
                  <div className="selected-items-list" style={{ marginTop: "12px", maxHeight: "180px", overflowY: "auto" }}>
                    {currentLocList.length === 0 ? (
                      <div className="empty-category-notice">
                        No locations added yet. Select a province and city/municipality above to add up to 5 preferred locations.
                      </div>
                    ) : (
                      currentLocList.map((loc, idx) => (
                        <div key={`${loc}-${idx}`} className="exp-item-chip">
                          <span className="exp-item-name">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            {loc}
                          </span>
                          <button
                            type="button"
                            className="exp-remove-btn"
                            onClick={() => {
                              const updated = currentLocList.filter((_, i) => i !== idx);
                              saveTagList("preferred_locations", updated);
                            }}
                            disabled={isSavingTags}
                            title={`Remove ${loc}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="applicant-map-modal-footer">
              <span className="applicant-map-instruction">
                {parsePreferredLocationTags(getPreferredLocationsRaw(profile)).length} / 5 Locations Saved
              </span>
              <button type="button" className="applicant-map-btn-save" onClick={() => setIsPreferredLocModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATS GENERATED RESUME DOCUMENT MODAL */}
      {isAtsModalOpen && (
        <div className="applicant-map-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="applicant-map-modal preferred-locations-modal ats-modal-card">
            <div
              className="applicant-map-modal-header ats-warning-header"
              style={{
                background: "#0f2338",
                borderBottom: "2px solid #f59e0b",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <div style={{ fontSize: "0.85rem", color: "#f8fafc", lineHeight: "1.4" }}>
                  <strong style={{ color: "#fde047", marginRight: "6px" }}>Warning:</strong>
                  All information displayed here is generated automatically from the system and may not be completely accurate, verified, or official.
                </div>
              </div>
              <button
                type="button"
                className="applicant-map-modal-close"
                onClick={() => setIsAtsModalOpen(false)}
                title="Close"
              >
                &times;
              </button>
            </div>

            {(() => {
              const atsData = {
                name: [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || "Applicant Name",
                location: [profile.city, profile.province].filter(Boolean).join(", ") || profile.address || "Cavite, Philippines",
                email: profile.email || "Not provided",
                phone: profile.phone ? `+63 ${normalizePhoneNumber(profile.phone)}` : "Not provided",
                targetRole: profile.desired_job_title || "IT / Software Specialist",
                salary: (() => {
                  const minVal = visibleProfile.expected_salary_min || profile.expected_salary_min;
                  const maxVal = visibleProfile.expected_salary_max || profile.expected_salary_max;
                  if (minVal && maxVal) {
                    const numMin = Number(String(minVal).replace(/[^0-9.]/g, ""));
                    const numMax = Number(String(maxVal).replace(/[^0-9.]/g, ""));
                    if (Number.isFinite(numMin) && Number.isFinite(numMax) && numMin > 0) {
                      if (numMin === numMax) return `₱${numMin.toLocaleString("en-US")}`;
                      return `₱${numMin.toLocaleString("en-US")} – ₱${numMax.toLocaleString("en-US")}`;
                    }
                  }
                  if (!profile.expected_salary) return "Negotiable";
                  const numOnly = String(profile.expected_salary).replace(/[^0-9.]/g, "");
                  const num = Number(numOnly);
                  return Number.isFinite(num) && num > 0
                    ? `₱${num.toLocaleString("en-US")}`
                    : profile.expected_salary;
                })(),
                arrangement: profile.work_arrangement || "Full-time",
                expYears: profile.years_of_experience || "3+ years",
                summary: aiOptimizedSummary || profile.summary || `Motivated ${profile.desired_job_title || "IT Professional"} with experience in software development and technical solutions. Open to target opportunities in ${profile.city || "Cavite"} and nearby regions.`,
                categorizedSkills: (() => {
                  const parsed = parseCourseSkillItems(profile.skills);
                  const groups: Record<string, string[]> = {};
                  parsed.forEach((it) => {
                    const cat = it.course && it.course.trim() ? it.course.trim() : "General IT";
                    if (!groups[cat]) groups[cat] = [];
                    const cleanName = cleanAtsTag(it.name).trim();
                    if (cleanName && !groups[cat].includes(cleanName)) {
                      groups[cat].push(cleanName);
                    }
                  });
                  if (Object.keys(groups).length === 0) {
                    const fallback = parsePreferredLocationTags(profile.skills).map(cleanAtsTag).map((s) => s.trim()).filter(Boolean);
                    if (fallback.length > 0) {
                      groups["General IT"] = fallback;
                    }
                  }
                  return groups;
                })(),
                skillsList: (() => {
                  const parsed = parseCourseSkillItems(profile.skills);
                  const list = parsed.map((it) => cleanAtsTag(it.name).trim()).filter(Boolean);
                  if (list.length > 0) {
                    return Array.from(new Set(list));
                  }
                  return parsePreferredLocationTags(profile.skills).map(cleanAtsTag).map((s) => s.trim()).filter(Boolean);
                })(),
                certsList: (() => {
                  const parsed = parseCertItems(profile.certifications);
                  if (parsed.length > 0) {
                    const hasDistinctYears = parsed.some((c) => {
                      const y = parseInt(c.acquiredYear || "0", 10);
                      return y > 1950 && c.acquiredYear !== "2010";
                    });
                    const candidateList = hasDistinctYears
                      ? [...parsed].sort((a, b) => (parseInt(b.acquiredYear || "0", 10) || 0) - (parseInt(a.acquiredYear || "0", 10) || 0))
                      : [...parsed].reverse();
                    return candidateList.slice(0, 3).map((c) => cleanAtsTag(c.name)).filter(Boolean);
                  }
                  const fallback = parsePreferredLocationTags(profile.certifications).map(cleanAtsTag).filter(Boolean);
                  return fallback.length <= 3 ? fallback : fallback.slice(-3).reverse();
                })(),
                qualsList: parsePreferredLocationTags(profile.qualifications).map(cleanAtsTag).filter(Boolean),
                educationItems: parseEduSchoolItems(profile.qualifications),
                prefLocs: parsePreferredLocationTags(profile.preferred_locations).map(cleanAtsTag).filter(Boolean),
                languages: parsePreferredLocationTags(profile.languages).map(cleanAtsTag).filter(Boolean),
                workExperiences: aiOptimizedExperiences || (workExperiences.length > 0 ? workExperiences : []),
              };

              const rawText = generateAtsPlainText(atsData);

              const handleOptimizeWithGemini = async () => {
                if (!userId || isOptimizingAi) return;
                setIsOptimizingAi(true);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                try {
                  const res = await fetch(`/api/applicants/${userId}/ats-document/optimize`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                  });
                  clearTimeout(timeoutId);
                  const data = await res.json();
                  if (res.ok) {
                    if (data.optimized_summary) setAiOptimizedSummary(data.optimized_summary);
                    if (data.optimized_work_experiences) setAiOptimizedExperiences(data.optimized_work_experiences);
                  } else {
                    alert("AI optimization error: " + (data.message || "Unable to optimize"));
                  }
                } catch (err: any) {
                  clearTimeout(timeoutId);
                  if (err.name === "AbortError") {
                    console.warn("AI optimization request timed out after 8s");
                  } else {
                    alert("Unable to reach AI optimization endpoint.");
                  }
                } finally {
                  setIsOptimizingAi(false);
                }
              };

              const handleDownloadTxt = () => {
                const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${atsData.name.replace(/\s+/g, "_")}_ATS_Resume.txt`;
                a.click();
                URL.revokeObjectURL(url);
              };

              const handleDownloadPdf = () => {
                downloadAtsPdf(atsData);
              };

              const handleAttachToProfile = async () => {
                if (!userId) return;
                try {
                  const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
                  const file = new File([blob], `${atsData.name.replace(/\s+/g, "_")}_ATS_Resume.txt`, { type: "text/plain" });
                  await processResumeUpload(file);
                  setProfileMessage("ATS Document generated and attached to your profile!");
                  setIsAtsModalOpen(false);
                } catch {
                  alert("Failed to attach document to profile.");
                }
              };

              return (
                <>
                  <div className="ats-modal-body">
                    <div id="ats-paper-preview" className="ats-paper-preview-container">
                      {buildAtsPages(atsData).map((page) => (
                        <div key={page.pageNumber} className="ats-page-sheet-wrapper">
                          <div className="ats-page" data-page={page.pageNumber}>
                            <div className="ats-page-content">
                              {page.isFirstPage && (
                                <>
                                  {/* HEADER: Candidate Name on Left, Contact stacked on Right */}
                                  <div className="ats-doc-header">
                                    <div className="ats-doc-header-left">
                                      <h1 className="ats-doc-candidate-name">{atsData.name}</h1>
                                    </div>
                                    <div className="ats-doc-header-right">
                                      <div className="ats-doc-contact-line">
                                        {atsData.location} &bull; {atsData.phone}
                                      </div>
                                      <div className="ats-doc-contact-line">
                                        {atsData.email}
                                      </div>
                                    </div>
                                  </div>

                                  {/* HEADLINE & EXECUTIVE SUMMARY */}
                                  <div className="ats-doc-headline-block">
                                    {atsData.certsList && atsData.certsList.length > 0 && (
                                      <div className="ats-doc-headline-certs">
                                        {atsData.certsList.join(" | ")}
                                      </div>
                                    )}

                                    {atsData.summary && (
                                      <div className="ats-doc-summary-body">
                                        <ul className="ats-doc-bullets">
                                          {atsData.summary
                                            .split("\n")
                                            .map((line) => line.trim().replace(/^[•\-\*–]\s*/, ""))
                                            .filter(Boolean)
                                            .map((bullet, idx) => (
                                              <li key={idx}>
                                                <span className="ats-bullet-glyph">•</span>
                                                <span className="ats-bullet-text">{bullet}</span>
                                              </li>
                                            ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {/* HORIZONTAL DIVIDER RULE */}
                                  <hr className="ats-doc-divider" />
                                </>
                              )}

                              {/* PROFESSIONAL EXPERIENCE */}
                              {(page.experiences.length > 0 || (page.isFirstPage && atsData.workExperiences.length === 0)) && (
                                <>
                                  {page.isFirstPage && (
                                    <h2 className="ats-doc-section-heading">Professional Experience</h2>
                                  )}

                                  <div className="ats-doc-section-body">
                                    {page.experiences.length > 0 ? (
                                      page.experiences.map((exp) => {
                                        const dates = `${exp.startMonth ? `${exp.startMonth} ` : ""}${exp.startYear} – ${exp.isCurrent ? "Present" : `${exp.endMonth ? `${exp.endMonth} ` : ""}${exp.endYear}`}`;
                                        const loc = [exp.city, exp.province].filter(Boolean).join(", ");
                                        const expBullets = exp.responsibilities
                                          ? exp.responsibilities
                                              .split("\n")
                                              .map((l) => l.trim().replace(/^[•\-\*–]\s*/, ""))
                                              .filter(Boolean)
                                          : [];

                                        return (
                                          <div key={exp.id} className="ats-doc-job-entry">
                                            <div className="ats-doc-company-row">
                                              {exp.company}{loc ? `, ${loc}` : ""}
                                            </div>
                                            <div className="ats-doc-role-row">
                                              <span className="ats-doc-job-title">{exp.title}</span>
                                              <span className="ats-doc-job-dates">{dates}</span>
                                            </div>
                                            {expBullets.length > 0 && (
                                              <ul className="ats-doc-bullets">
                                                {expBullets.map((bullet, idx) => (
                                                  <li key={idx}>
                                                    <span className="ats-bullet-glyph">•</span>
                                                    <span className="ats-bullet-text">{bullet}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                            {exp.skills && exp.skills.length > 0 && (
                                              <div className="ats-doc-tech-row">
                                                <span className="ats-bullet-glyph">•</span>
                                                <span className="ats-bullet-text">
                                                  <strong>Key Technologies:</strong> {exp.skills.map(cleanAtsTag).join(", ")}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <p style={{ fontStyle: "italic", color: "#64748b", margin: "6px 0 16px 0", textAlign: "center" }}>
                                        No formal work experience added yet.
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}

                              {/* EDUCATION */}
                              {page.includeEducation && (
                                <>
                                  <h2 className="ats-doc-section-heading">Education</h2>

                                  <div className="ats-doc-section-body">
                                    {(() => {
                                      const eduList = atsData.educationItems && atsData.educationItems.length > 0
                                        ? atsData.educationItems
                                        : (atsData.qualsList.length > 0
                                            ? atsData.qualsList.map((q) => ({ name: q, school: "", endYear: "", startYear: "", level: "college" as const }))
                                            : []);

                                      if (eduList.length === 0) {
                                        return (
                                          <p style={{ fontStyle: "italic", color: "#64748b", margin: "6px 0 16px 0", textAlign: "center" }}>
                                            No education details recorded.
                                          </p>
                                        );
                                      }

                                      return eduList.map((edu, idx) => (
                                        <div key={idx} className="ats-doc-edu-entry">
                                          <div className="ats-doc-edu-degree">
                                            {edu.name}{edu.endYear ? `, ${edu.endYear}` : ""}
                                          </div>
                                          <div className="ats-doc-edu-school">
                                            {edu.school || "College / University"}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </>
                              )}

                              {/* CORE COMPETENCIES & SKILLS */}
                              {page.includeSkills && (atsData.categorizedSkills ? Object.keys(atsData.categorizedSkills).length > 0 : atsData.skillsList.length > 0) && (
                                <>
                                  <h2 className="ats-doc-section-heading">Core Competencies & Skills</h2>
                                  <div className="ats-doc-section-body">
                                    <ul className="ats-doc-bullets">
                                      {atsData.categorizedSkills && Object.keys(atsData.categorizedSkills).length > 0 ? (
                                        Object.entries(atsData.categorizedSkills).map(([catName, skills]) => (
                                          <li key={catName}>
                                            <span className="ats-bullet-glyph">•</span>
                                            <span className="ats-bullet-text">
                                              <strong>{catName}:</strong> {skills.join(", ")}
                                            </span>
                                          </li>
                                        ))
                                      ) : (
                                        <li>
                                          <span className="ats-bullet-glyph">•</span>
                                          <span className="ats-bullet-text">
                                            <strong>Technical Skills:</strong> {atsData.skillsList.join(", ")}
                                          </span>
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="applicant-map-modal-footer">
                    <button
                      type="button"
                      className="applicant-map-btn-save"
                      onClick={handleDownloadPdf}
                      style={{ background: "#073e68", display: "inline-flex", alignItems: "center", gap: "8px" }}
                    >
                      <DownloadIcon size={16} /> Download PDF Resume
                    </button>
                    <button
                      type="button"
                      className="applicant-map-btn-cancel"
                      onClick={() => setIsAtsModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* IMAGE ADJUST MODAL FOR PROFILE PHOTO */}
      <ImageAdjustModal
        isOpen={isAdjustPhotoModalOpen}
        imageSrc={adjustPhotoSrc}
        title="Adjust Profile Photo"
        aspectRatio={1}
        outputWidth={600}
        outputHeight={600}
        isCircular={true}
        onSave={handleSaveAdjustedPhoto}
        onCancel={() => {
          setIsAdjustPhotoModalOpen(false);
          setAdjustPhotoSrc(null);
        }}
        isSaving={isApplyingPhotoAdjustment}
      />

      {/* DOCUMENT ATTACHMENTS MODAL */}
      <ApplicantDocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        userId={userId}
        onProfileUpdated={() => {
          if (userId) fetchProfile(userId);
        }}
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

      {/* DOUBLE VERIFICATION: DELETE RESUME MODAL */}
      <ConfirmationModal
        isOpen={isDeleteResumeModalOpen}
        type="danger"
        title="Delete Resume"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to permanently delete your resume from the system?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Employers will no longer be able to view your uploaded resume file.
            </p>
          </div>
        }
        cancelLabel="Keep Resume"
        confirmLabel="Delete Resume"
        isConfirming={isUploadingResume}
        onCancel={() => setIsDeleteResumeModalOpen(false)}
        onConfirm={confirmDeleteResume}
      />

      {/* DOUBLE VERIFICATION: DELETE WORK EXPERIENCE MODAL */}
      <ConfirmationModal
        isOpen={!!workExpToDelete}
        type="danger"
        title="Delete Work Experience"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to remove this work experience entry from your profile?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              This will remove the role, company, and associated achievements from your resume profile.
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete Entry"
        onCancel={() => setWorkExpToDelete(null)}
        onConfirm={confirmDeleteWorkExperience}
      />

      {/* DOUBLE VERIFICATION: NEARBY EMPLOYER DISCOVERY WARNING MODAL (Rule 6 Compliant) */}
      <ConfirmationModal
        isOpen={Boolean(nearbyWarningModal?.isOpen)}
        type="warning"
        title={nearbyWarningModal?.title || "Warning"}
        message={nearbyWarningModal?.message || ""}
        cancelLabel={nearbyWarningModal?.cancelLabel || "Cancel"}
        confirmLabel={nearbyWarningModal?.confirmLabel || "Confirm"}
        isConfirming={isUpdatingParticipation || isSavingLocation}
        onCancel={() => setNearbyWarningModal(null)}
        onConfirm={() => {
          if (nearbyWarningModal?.onConfirm) {
            nearbyWarningModal.onConfirm();
          }
        }}
      />

      {/* NON-INTRUSIVE UNDO TOAST */}
      {undoToast && (
        <UndoToast
          message={undoToast.message}
          onUndo={undoToast.onUndo}
          onClose={() => setUndoToast(null)}
        />
      )}

      {/* EMAIL OTP VERIFICATION POPUP MODAL */}
      {isOtpModalOpen && (
        <div className="system-popup-overlay" onClick={() => !isVerifyingOtp && setIsOtpModalOpen(false)}>
          <div className="system-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="system-popup-icon-wrap info">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3 className="system-popup-title">Verify Email Address</h3>
            <p className="system-popup-message" style={{ marginBottom: "12px" }}>
              A 6-digit OTP code has been sent to:
              <br />
              <strong style={{ color: "#0284c7" }}>{draft.email || profile.email}</strong>
            </p>

            <div className="otp-input-container">
              <input
                type="text"
                className="otp-code-input"
                maxLength={6}
                value={otpCodeInput}
                autoFocus
                onChange={(e) => {
                  const numOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpCodeInput(numOnly);
                  if (otpError) setOtpError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && otpCodeInput.length === 6) {
                    handleVerifyEmailOtp();
                  }
                }}
                placeholder="••••••"
              />

              {otpError && <div className="otp-error-msg">{otpError}</div>}

              {otpDevHint && (
                <div className="otp-dev-hint">
                  Dev Code: <strong>{otpDevHint}</strong>
                </div>
              )}

              <div className="otp-resend-wrap">
                <span>Didn't receive the code?</span>
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleSendEmailOtp}
                  disabled={otpCooldown > 0 || isSendingOtp}
                >
                  {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>

            <div className="system-popup-actions" style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                className="system-popup-btn secondary"
                onClick={() => setIsOtpModalOpen(false)}
                disabled={isVerifyingOtp}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="system-popup-btn primary"
                onClick={handleVerifyEmailOtp}
                disabled={isVerifyingOtp || otpCodeInput.length !== 6}
                style={{ flex: 1, background: "#0284c7", color: "#ffffff" }}
              >
                {isVerifyingOtp ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNSAVED WORK EXPERIENCE WARNING MODAL (Rule 6 Compliant) */}
      {isUnsavedExpWarningOpen && (
        <div
          className="system-popup-overlay"
          onClick={() => {
            setIsUnsavedExpWarningOpen(false);
            setPendingTargetSection(null);
            setPendingEditMode(false);
            setPendingNavHref(null);
          }}
        >
          <div className="system-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="system-popup-icon-wrap warning">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ca8a04" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="system-popup-title">Warning</h3>
            <p className="system-popup-message">You have unsaved changes in your work experience draft. Discard changes?</p>
            <div className="system-popup-actions">
              <button
                type="button"
                className="system-popup-btn secondary"
                onClick={() => {
                  setIsUnsavedExpWarningOpen(false);
                  setPendingTargetSection(null);
                  setPendingEditMode(false);
                  setPendingNavHref(null);
                }}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="system-popup-btn primary"
                onClick={() => {
                  setIsAddingExp(false);
                  resetExpForm();
                  setIsUnsavedExpWarningOpen(false);
                  if (pendingTargetSection) {
                    setActiveSection(pendingTargetSection);
                    if (pendingEditMode && !isEditing) setIsEditing(true);
                    setPendingTargetSection(null);
                    setPendingEditMode(false);
                  } else if (pendingNavHref) {
                    const targetHref = pendingNavHref;
                    setPendingNavHref(null);
                    window.location.href = targetHref;
                  }
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNSAVED PROFILE WARNING MODAL (Rule 6 Compliant) */}
      {isUnsavedProfileWarningOpen && (
        <div
          className="system-popup-overlay"
          onClick={() => {
            setIsUnsavedProfileWarningOpen(false);
            setPendingTargetSection(null);
            setPendingEditMode(false);
            setPendingNavHref(null);
            setPendingCancelField(null);
          }}
        >
          <div className="system-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="system-popup-icon-wrap warning">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ca8a04" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="system-popup-title">Warning</h3>
            <p className="system-popup-message">You have unsaved changes in your profile draft. Discard changes?</p>
            <div className="system-popup-actions">
              <button
                type="button"
                className="system-popup-btn secondary"
                onClick={() => {
                  setIsUnsavedProfileWarningOpen(false);
                  setPendingTargetSection(null);
                  setPendingEditMode(false);
                  setPendingNavHref(null);
                  setPendingCancelField(null);
                }}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="system-popup-btn primary"
                onClick={() => {
                  if (pendingCancelField) {
                    cancelField(pendingCancelField);
                    setPendingCancelField(null);
                  } else {
                    setDraft(profile);
                    setSalaryError("");
                    setIsEditing(false);
                  }
                  setIsUnsavedProfileWarningOpen(false);
                  if (pendingTargetSection) {
                    setActiveSection(pendingTargetSection);
                    if (pendingEditMode && !isEditing) setIsEditing(true);
                    setPendingTargetSection(null);
                    setPendingEditMode(false);
                  } else if (pendingNavHref) {
                    const targetHref = pendingNavHref;
                    setPendingNavHref(null);
                    window.location.href = targetHref;
                  }
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY PROFILE SETUP WARNING POPUP MODAL (Rule 6 Compliant) */}
      {setupWarningModalMsg && (
        <div className="system-popup-overlay" onClick={() => setSetupWarningModalMsg("")}>
          <div className="system-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="system-popup-icon-wrap warning" style={{ background: "#fef9c3" }}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ca8a04" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="system-popup-title">Warning</h3>
            <p className="system-popup-message">{setupWarningModalMsg}</p>
            <div className="system-popup-actions">
              <button
                type="button"
                className="system-popup-btn"
                onClick={() => setSetupWarningModalMsg("")}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

