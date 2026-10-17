import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronIcon, MapPinIcon, mapPinSvgString, SideIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import { resolveLocalGeocode, resolveLocalGeocodeDetailed, CAVITE_MUNICIPALITIES, getAreaInitials } from "../../data/mapData";
import {
  BSIT_BSCS_JOB_TITLES,
  BSIT_BSCS_SKILLS,
  BSIT_BSCS_QUALIFICATIONS,
  BSIT_BSCS_CERTIFICATIONS,
  ALL_PHILIPPINES_PROVINCES,
  ALL_PHILIPPINES_CITIES,
  getCitiesByProvince,
  CAVITE_CITIES,
  WORK_ARRANGEMENTS,
  EXPERIENCE_LEVELS,
  EXP_YEARS_OPTIONS,
  AVAILABLE_SKILLS_LIST,
  calculateCandidateMatch,
  calculateDistanceKm,
  calculateJobMatchDetails,
  getMatchColorClass,
  isSkillMatch,
  formatExperienceLevel,
  formatLocationWithCavite,
  parseCompetencyDisplayTags,
  parseExpectedSalary,
  parseItemList,
  parsePreferredLocationTags,
} from "../../utils/filters";
import "../Applicant/Applicant-Dashboard.css";
import "../Applicant/JobSearch.css";
import "./Employer-Dashboard.css";
import "./Employer-ApplicantManagement.css";

import "./Employer-ApplicantFinder.css";

type ItemWithExp = {
  name: string;
  years: string;
};

function isShsItem(item: string): boolean {
  if (!item) return false;
  const lower = item.toLowerCase();
  return (
    lower.includes("[shs]") ||
    lower.includes("senior high") ||
    lower.includes("high school") ||
    lower.includes("tvl") ||
    lower.includes("stem") ||
    lower.includes("abm") ||
    lower.includes("humss") ||
    lower.includes("gas") ||
    lower.includes("tesda") ||
    lower.includes("vocational")
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

function parseCandidateSalaryRange(cand?: Candidate | null): { min: string; max: string } {
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
      const parts = rawStr.split("-").map((p) => p.trim());
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

/**
 * Checks whether two locations refer to the same municipality/city or are within 1.5 km of each other.
 */
function isSameOrNearbyArea(
  areaNameA: string,
  coordsA: [number, number] | { lat: number; lng: number } | null | undefined,
  areaNameB: string,
  coordsB: [number, number] | { lat: number; lng: number } | null | undefined
): boolean {
  const normA = (areaNameA || "").toLowerCase().replace(/city|municipality/gi, "").trim();
  const normB = (areaNameB || "").toLowerCase().replace(/city|municipality/gi, "").trim();

  if (normA && normB && (normA === normB || normA.includes(normB) || normB.includes(normA))) {
    return true;
  }

  if (coordsA && coordsB) {
    const latA = Array.isArray(coordsA) ? coordsA[0] : coordsA.lat;
    const lngA = Array.isArray(coordsA) ? coordsA[1] : coordsA.lng;
    const latB = Array.isArray(coordsB) ? coordsB[0] : coordsB.lat;
    const lngB = Array.isArray(coordsB) ? coordsB[1] : coordsB.lng;

    const dLat = Math.abs(latA - latB);
    const dLng = Math.abs(lngA - lngB);
    // Within ~1.5 km (~0.015 degrees)
    if (dLat < 0.015 && dLng < 0.015) {
      return true;
    }
  }

  return false;
}

/**
 * When employer and applicant group share the same municipal area,
 * disperse their geographic coordinates within the municipality bounds (~1.0 - 1.4 km apart).
 * This ensures:
 * 1. Both pins stay 100% inside the municipality boundary (never fly to other towns like Maragondon).
 * 2. As the user zooms in and out, the distance between them scales naturally with the map.
 * 3. Company pin is placed in the Northern sector (with badge on top), and applicant cluster in the Southern sector.
 */
function getDispersedMunicipalityCoords(
  baseLat: number,
  baseLng: number,
  isCompany: boolean,
  seedStr: string = ""
): [number, number] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) & 0xffffffff;
  }
  // Alternate East/West based on seed while keeping Company strictly North and Applicant strictly South
  const isEast = Math.abs(seed) % 2 === 1;

  // Offset within municipality (~1.0 km north/south, ~1.3 km east/west)
  const dLat = 0.009;
  const dLng = 0.012;

  if (isCompany) {
    // Company is in the Northern sector (higher latitude), West or East
    return [baseLat + dLat, baseLng + (isEast ? dLng : -dLng)];
  } else {
    // Applicant is in the Southern sector (lower latitude), opposite East or West
    return [baseLat - dLat, baseLng + (isEast ? -dLng : dLng)];
  }
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

function normalizeLocStr(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/[(),.\-\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLocMatch(candText: string, targetText: string): boolean {
  if (!candText || !targetText) return false;
  const c = normalizeLocStr(candText);
  const t = normalizeLocStr(targetText);
  if (!c || !t) return false;
  if (c === t) return true;
  if (c.includes(t)) return true;
  // If target contains candidate word, require at least 3 characters to avoid false matches
  if (c.length >= 3 && t.includes(c)) return true;
  return false;
}

function candidateMatchesLocationTag(cand: Candidate, locTag: string): boolean {
  if (!locTag) return true;
  const parts = locTag.split(",").map((s) => s.trim());
  const cityTarget = parts[0] || "";
  const provTarget = parts[1] || "";

  const candCity = (cand.city || "").trim();
  const candProv = (cand.province || "").trim();
  const candAddr = (cand.address || "").trim();
  const candPref = (cand.preferred_locations || "").trim();
  const candNearby = (cand.nearby_location || "").trim();

  // If candidate has absolutely no location information, they cannot match a specific location filter
  if (!candCity && !candProv && !candAddr && !candPref && !candNearby) {
    return false;
  }

  // If "All Cities" or "All Cities / Municipalities"
  if (cityTarget.toLowerCase().includes("all cities") || !cityTarget) {
    if (provTarget) {
      return (
        isLocMatch(candProv, provTarget) ||
        isLocMatch(candNearby, provTarget) ||
        isLocMatch(candAddr, provTarget) ||
        isLocMatch(candPref, provTarget)
      );
    }
    return true;
  }

  // Exact or partial city matching
  const matchesCity =
    isLocMatch(candCity, cityTarget) ||
    isLocMatch(candNearby, cityTarget) ||
    isLocMatch(candAddr, cityTarget) ||
    isLocMatch(candPref, cityTarget);

  if (!matchesCity) return false;

  if (provTarget) {
    const matchesProv =
      isLocMatch(candProv, provTarget) ||
      isLocMatch(candNearby, provTarget) ||
      isLocMatch(candAddr, provTarget) ||
      isLocMatch(candPref, provTarget);

    return matchesProv;
  }

  return true;
}

function getCandidateLocationScore(cand: Candidate, locations: string[]): number {
  if (locations.length === 0) return 0;
  let maxScore = 0;

  for (const locTag of locations) {
    const parts = locTag.split(",").map((s) => s.trim());
    const cityTarget = parts[0] || "";
    const provTarget = parts[1] || "";

    const candCity = (cand.city || "").trim();
    const candProv = (cand.province || "").trim();
    const candAddr = (cand.address || "").trim();
    const candPref = (cand.preferred_locations || "").trim();
    const candNearby = (cand.nearby_location || "").trim();

    if (!candCity && !candProv && !candAddr && !candPref && !candNearby) {
      continue;
    }

    const isCity = (field: string) => isLocMatch(field, cityTarget);
    const isProv = (field: string) => isLocMatch(field, provTarget);

    // Exact city match in home residence = 100
    if (isCity(candCity) || isCity(candNearby) || isCity(candAddr)) {
      maxScore = Math.max(maxScore, 100);
    }
    // Preferred work location match = 80
    else if (isCity(candPref)) {
      maxScore = Math.max(maxScore, 80);
    }
    // Same province match = 50
    else if (isProv(candProv) || isProv(candNearby) || isProv(candAddr) || isProv(candPref)) {
      maxScore = Math.max(maxScore, 50);
    }
  }

  return maxScore;
}

function SingleLinePillsWithOverflow({
  label,
  items,
  type,
}: {
  label: string;
  items: string[];
  type: "skill" | "qualification" | "certification";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(() => Math.min(items.length, 5));

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const calcVisible = () => {
      const availableWidth = container.clientWidth;
      if (availableWidth <= 0) return;

      const spans = Array.from(measure.children) as HTMLElement[];
      if (spans.length === 0) return;

      const gap = 6;
      const dotsWidth = 36 + gap;

      // Check if all items fit on one line
      let totalWidth = 0;
      for (let i = 0; i < spans.length; i++) {
        totalWidth += spans[i].offsetWidth + (i > 0 ? gap : 0);
      }

      if (totalWidth <= availableWidth) {
        setVisibleCount(spans.length);
        return;
      }

      // If they exceed one line, find how many fit alongside the '...' dots pill
      let accWidth = 0;
      let count = 0;
      for (let i = 0; i < spans.length; i++) {
        const itemWidth = spans[i].offsetWidth + (i > 0 ? gap : 0);
        if (accWidth + itemWidth + dotsWidth > availableWidth) {
          break;
        }
        accWidth += itemWidth;
        count++;
      }

      setVisibleCount(Math.max(1, count));
    };

    calcVisible();

    const ro = new ResizeObserver(() => {
      calcVisible();
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [items]);

  if (!items || items.length === 0) return null;

  const visibleItems = items.slice(0, visibleCount);
  const hasOverflow = visibleCount < items.length;
  const hiddenItems = items.slice(visibleCount);
  const hiddenListText = hiddenItems.join(", ");
  const pillClass = type === "skill" ? "skill" : type === "qualification" ? "quali" : "cert";

  return (
    <div className="finder-pill-row single-line-row">
      <span className="finder-pill-label">{label}</span>

      {/* Invisible measuring container that renders ALL items for width calculation */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          visibility: "hidden",
          height: 0,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          display: "flex",
          gap: "6px",
          zIndex: -9999,
        }}
      >
        {items.map((it, idx) => (
          <span key={idx} className={`finder-pill ${pillClass}`}>
            {it}
          </span>
        ))}
      </div>

      {/* Visible single-line flex wrap */}
      <div ref={containerRef} className="finder-pills-wrap single-line">
        {visibleItems.map((item, idx) => (
          <span key={idx} className={`finder-pill ${pillClass}`}>
            {item}
          </span>
        ))}

        {hasOverflow && (
          <span className="js-overflow-dots" tabIndex={0} title="Hover to view more">
            ...
            <span className="js-overflow-tip">
              <strong>{label}</strong>
              <span>{hiddenListText}</span>
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function FilterLocationCategoryEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [selectedProv, setSelectedProv] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const isMaxReached = items.length >= 5;

  const availableCities = useMemo(() => {
    if (!selectedProv) return [];
    const cities = getCitiesByProvince(selectedProv);
    const optionsWithAll = ["All Cities / Municipalities", ...cities];
    return optionsWithAll.filter(
      (c) => !items.some((it) => it.toLowerCase() === `${c}, ${selectedProv}`.toLowerCase())
    );
  }, [selectedProv, items]);

  const handleAddLocation = () => {
    if (isMaxReached || !selectedProv || !selectedCity) return;
    const fusedTag = `${selectedCity}, ${selectedProv}`;
    if (!items.some((it) => it.toLowerCase() === fusedTag.toLowerCase())) {
      onChange([...items, fusedTag]);
      setSelectedCity("");
    }
  };

  const handleRemoveLocation = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="filter-category-box filter-location-box">
      <div className="category-card-header">
        <strong>Province and Cities</strong>
        <span className={`category-count-badge ${isMaxReached ? "count-max" : ""}`}>
          {items.length} / 5 Selected
        </span>
      </div>

      <div className="selected-items-list location-selected-list">
        {items.length === 0 ? (
          <div className="empty-category-notice">
            No province and cities selected. Type or select up to 5 below.
          </div>
        ) : (
          <div className="location-chips-grid">
            {items.map((loc, idx) => (
              <div key={`${loc}-${idx}`} className="exp-item-chip location-chip">
                <span className="exp-item-name">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: "4px", verticalAlign: "middle", display: "inline-block" }}
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {loc}
                </span>
                <button
                  type="button"
                  className="exp-remove-btn"
                  onClick={() => handleRemoveLocation(idx)}
                  title={`Remove ${loc}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isMaxReached ? (
        <div className="add-item-controls location-add-controls">
          <div className="location-inputs-inline-row">
            <div className="location-input-field">
              <SearchableSelect
                options={ALL_PHILIPPINES_PROVINCES}
                value={selectedProv}
                placeholder="Type or select province / region..."
                onChange={(prov) => {
                  setSelectedProv(prov);
                  setSelectedCity("");
                }}
              />
            </div>
            <div className="location-input-field">
              <SearchableSelect
                options={availableCities}
                value={selectedCity}
                placeholder={!selectedProv ? "Choose province first..." : "Type or select city / municipality..."}
                disabled={!selectedProv}
                onChange={setSelectedCity}
                onEnterAdd={handleAddLocation}
              />
            </div>
            <button
              type="button"
              className="add-item-btn"
              onClick={handleAddLocation}
              disabled={!selectedProv || !selectedCity}
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

export interface WorkExpItem {
  id?: string;
  title: string;
  company: string;
  province?: string;
  city?: string;
  startMonth?: string;
  startYear?: string;
  endMonth?: string;
  endYear?: string;
  isCurrent?: boolean;
  employmentType?: string;
  responsibilities?: string;
  skills?: string[];
}

export type Candidate = {
  user_id: number;
  email: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  applicant_name: string;
  desired_job_title: string;
  city: string;
  province?: string | null;
  address?: string | null;
  work_arrangement?: string | null;
  expected_salary?: string | null;
  expected_salary_min?: string | number | null;
  expected_salary_max?: string | number | null;
  summary?: string | null;
  languages?: string | null;
  skills?: string | null;
  qualifications?: string | null;
  certifications?: string | null;
  preferred_locations?: string | null;
  preferred_cities_json?: string | null;
  nearby_location?: string | null;
  resume_path?: string | null;
  profile_picture_path?: string | null;
  applied_count?: number;
  latest_application_status?: string | null;
  distance_km?: number;
  latitude?: number | string | null;
  longitude?: number | string | null;
  phone?: string | null;
  invited_count?: number | string | null;
  rating?: number | string | null;
  work_experience_json?: string | null;
  years_of_experience?: string | null;
  shs_strand?: string | null;
  shs_school?: string | null;
  shs_grad_year?: string | null;
  college_grad_year?: string | null;
  vocational_grad_year?: string | null;
};

export type ActiveJob = {
  id: number;
  title: string;
  work_arrangement?: string;
  experience_level?: string;
  city?: string;
  location?: string;
  min_salary?: string;
  max_salary?: string;
  salary_min?: string | number;
  salary_max?: string | number;
  required_skills?: string | null;
  skills?: string | null;
  qualifications?: string | null;
  required_qualifications?: string | null;
  certifications?: string | null;
  required_certifications?: string | null;
  description?: string | null;
  applicants_count?: number;
  application_limit?: number;
  close_date?: string;
  is_urgent?: boolean | number;
  status?: string;
  company_name?: string;
};

export type EmployerProfileData = {
  user_id: number;
  business_name?: string | null;
  company_address?: string | null;
  city?: string | null;
  province?: string | null;
  contact_number?: string | null;
  business_email?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

export type GeoMatchLevel = "exact_city" | "preferred_city" | "same_province" | "all_matched" | "none";

export interface CandidateGeoMatch {
  level: GeoMatchLevel;
  badgeLabel: string;
  badgeType: "exact" | "preferred" | "province" | "general";
  matchedCity: string;
  score: number;
}

export function evaluateCandidateGeoMatch(
  cand: Candidate,
  targetProvince: string,
  targetCity: string,
  scope: "exact_and_preferred" | "exact" | "province" | "all"
): CandidateGeoMatch {
  if (scope === "all") {
    const locName = cand.nearby_location || (cand.city ? `${cand.city}${cand.province ? `, ${cand.province}` : ""}` : cand.province || "Participating Applicant");
    return {
      level: "all_matched",
      badgeLabel: locName,
      badgeType: "general",
      matchedCity: cand.city || "",
      score: 50,
    };
  }

  const cleanCity = (targetCity || "").toLowerCase().replace(/city/g, "").replace(/,/g, "").trim();
  const cleanProv = (targetProvince || "").toLowerCase().trim();

  const candNearby = (cand.nearby_location || "").toLowerCase();
  const candCity = (cand.city || "").toLowerCase();
  const candProv = (cand.province || "").toLowerCase();
  const candAddr = (cand.address || "").toLowerCase();
  const candPref = (cand.preferred_locations || "").toLowerCase();

  // If "All Cities" in this province is chosen or targetCity is empty
  if (targetCity === "All Cities" || !cleanCity) {
    const isProvMatch =
      targetProvince === "All Provinces" ||
      candProv.includes(cleanProv) ||
      candNearby.includes(cleanProv) ||
      candAddr.includes(cleanProv);

    if (isProvMatch) {
      const displayLoc = targetProvince === "All Provinces"
        ? (cand.city ? `${cand.city}${cand.province ? `, ${cand.province}` : ""}` : cand.nearby_location || "Philippines")
        : (cand.city ? `${cand.city}, ${targetProvince}` : cand.nearby_location || targetProvince);
      return {
        level: "same_province",
        badgeLabel: displayLoc,
        badgeType: targetProvince === "All Provinces" ? "general" : "province",
        matchedCity: cand.city || "",
        score: 75,
      };
    }
    return {
      level: "none",
      badgeLabel: "Outside Selected Province",
      badgeType: "general",
      matchedCity: "",
      score: 0,
    };
  }

  // Exact target city match (candidate designated nearby location, home city, or address)
  const isExactCity =
    candNearby.includes(cleanCity) ||
    candCity.includes(cleanCity) ||
    candAddr.includes(cleanCity);

  if (isExactCity) {
    const cityName = cand.city || targetCity;
    return {
      level: "exact_city",
      badgeLabel: `Exact City: ${cityName}`,
      badgeType: "exact",
      matchedCity: cityName,
      score: 100,
    };
  }

  // Preferred work location match (candidate chose this city in their career preferences)
  const isPrefMatch = candPref.includes(cleanCity);
  if (isPrefMatch) {
    return {
      level: "preferred_city",
      badgeLabel: `Preferred City: ${targetCity}`,
      badgeType: "preferred",
      matchedCity: targetCity,
      score: 90,
    };
  }

  // Same province match (fallback when target city didn't match, but scope permits or displays)
  const isSameProv =
    targetProvince === "All Provinces" ||
    candProv.includes(cleanProv) ||
    candNearby.includes(cleanProv) ||
    candAddr.includes(cleanProv);

  if (isSameProv) {
    return {
      level: "same_province",
      badgeLabel: `Same Province: ${cand.city ? `${cand.city}, ` : ""}${targetProvince}`,
      badgeType: "province",
      matchedCity: cand.city || "",
      score: 70,
    };
  }

  return {
    level: "none",
    badgeLabel: "Outside Selected Area",
    badgeType: "general",
    matchedCity: "",
    score: 0,
  };
}

export interface GeoBoundaryResult {
  geojson: any;
  center: [number, number];
  displayName: string;
  source: "online" | "local";
}

const geoBoundaryCache = new Map<string, GeoBoundaryResult>();

export async function fetchOnlineBoundary(province: string, city: string): Promise<GeoBoundaryResult | null> {
  const cacheKey = `${province}:::${city}`.toLowerCase();
  if (geoBoundaryCache.has(cacheKey)) {
    return geoBoundaryCache.get(cacheKey)!;
  }

  // 1. Try Live OpenStreetMap Nominatim with polygon_geojson
  if (city && city !== "All Cities") {
    try {
      const cleanCity = city.replace(/city/i, "").trim();
      const provQuery = province && province !== "All Provinces" ? `, ${province}` : "";
      const query = `${cleanCity}${provQuery}, Philippines`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=1`;

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const items = await res.json();
        if (items && items.length > 0 && items[0].geojson) {
          const item = items[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const result: GeoBoundaryResult = {
            geojson: item.geojson,
            center: [lat, lng],
            displayName: item.display_name,
            source: "online",
          };
          geoBoundaryCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn("Live OSM boundary fetch error, falling back to local geometry:", err);
    }
  } else if (province && province !== "All Provinces") {
    try {
      const query = `${province}, Philippines`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=1`;

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const items = await res.json();
        if (items && items.length > 0 && items[0].geojson) {
          const item = items[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const result: GeoBoundaryResult = {
            geojson: item.geojson,
            center: [lat, lng],
            displayName: item.display_name,
            source: "online",
          };
          geoBoundaryCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn("Live OSM province boundary fetch error:", err);
    }
  }

  // 2. Offline / Local fallback to CAVITE_MUNICIPALITIES
  if (city && city !== "All Cities" && CAVITE_MUNICIPALITIES[city]) {
    const muni = CAVITE_MUNICIPALITIES[city];
    const geoJsonCoords = muni.coordinates.map(([lat, lng]) => [lng, lat]);
    const result: GeoBoundaryResult = {
      geojson: {
        type: "Polygon",
        coordinates: [geoJsonCoords],
      },
      center: muni.center,
      displayName: muni.name,
      source: "local",
    };
    geoBoundaryCache.set(cacheKey, result);
    return result;
  }

  return null;
}

function initialsFrom(name: string) {
  return (name || "Applicant")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export interface AreaApplicantGroup {
  areaKey: string;
  areaName: string;
  provinceName: string;
  center: [number, number];
  candidates: Candidate[];
  bestScore: number;
  badgeType: "exact" | "preferred" | "province" | "general";
}

export function getAreaForCandidate(
  cand: Candidate,
  targetProvince: string
): { areaName: string; provinceName: string; center: [number, number] } | null {
  // Only applicants who have Nearby Employer Discovery ACTIVE participate in nearby finder map
  const isNearbyDiscoveryActive = Boolean(
    cand.nearby_location && cand.nearby_location.trim().length > 0
  );
  if (!isNearbyDiscoveryActive) {
    return null;
  }

  const nearbyStr = (cand.nearby_location || "").trim();
  const parts = nearbyStr.split(",").map((s) => s.trim());
  let rawCity = parts[0] || (cand.city || "").trim();
  let rawProv = parts[1] || (cand.province || "").trim();
  const rawAddr = (cand.address || "").trim();

  // Strip non-specific placeholders
  if (
    rawCity.toLowerCase().includes("all cities") ||
    rawCity.toLowerCase() === "all provinces" ||
    rawCity.toLowerCase() === "all locations"
  ) {
    rawCity = "";
  }
  if (rawProv.toLowerCase() === "all provinces") {
    rawProv = "";
  }

  // If candidate has preferred locations (e.g. "Alfonso, Cavite | Amadeo, Cavite"), extract secondary location hints
  if (!rawCity && cand.preferred_locations) {
    const prefList = cand.preferred_locations.split("|").map((p) => p.trim()).filter(Boolean);
    if (prefList.length > 0) {
      const parts = prefList[0].split(",").map((s) => s.trim());
      if (parts[0] && !parts[0].toLowerCase().includes("all")) {
        rawCity = parts[0];
      }
      if (!rawProv && parts[1] && parts[1].toLowerCase() !== "all provinces") {
        rawProv = parts[1];
      }
    }
  }

  const cleanTargetProv =
    targetProvince && targetProvince.toLowerCase() !== "all provinces" ? targetProvince.trim() : "";
  if (!rawProv && cleanTargetProv) {
    rawProv = cleanTargetProv;
  }

  const hasCoords =
    cand.latitude &&
    cand.longitude &&
    !isNaN(Number(cand.latitude)) &&
    !isNaN(Number(cand.longitude)) &&
    Number(cand.latitude) !== 0;

  // Candidates with absolutely no location and no coordinates cannot be placed on the map
  if (!rawCity && !rawProv && !rawAddr && !hasCoords) {
    return null;
  }

  // If candidate has coordinates
  if (hasCoords) {
    return {
      areaName: rawCity || (rawProv && rawProv.toLowerCase() !== "all provinces" ? rawProv : "Applicant Location"),
      provinceName: rawProv && rawProv.toLowerCase() !== "all provinces" ? rawProv : "Philippines",
      center: [Number(cand.latitude), Number(cand.longitude)],
    };
  }

  // 1. Match known Cavite municipalities
  for (const [muniKey, muniData] of Object.entries(CAVITE_MUNICIPALITIES)) {
    const k = muniKey.toLowerCase();
    if (
      (rawCity && (rawCity.toLowerCase().includes(k) || k.includes(rawCity.toLowerCase()))) ||
      (rawAddr && rawAddr.toLowerCase().includes(k))
    ) {
      return {
        areaName: muniKey,
        provinceName: "Cavite",
        center: muniData.center,
      };
    }
  }

  // 2. Match all Philippines standard cities
  if (rawCity) {
    for (const c of ALL_PHILIPPINES_CITIES) {
      const k = c.toLowerCase().replace(/city/i, "").trim();
      if (k && (rawCity.toLowerCase().includes(k) || (rawAddr && rawAddr.toLowerCase().includes(k)))) {
        const geo = resolveLocalGeocode(c, rawProv || "Cavite");
        return {
          areaName: c,
          provinceName: rawProv || "Philippines",
          center: [geo.lat || 14.2825, geo.lng || 120.8667],
        };
      }
    }
  }

  // 3. Fallback: only if rawCity exists and is not a generic placeholder
  if (rawCity && !rawCity.toLowerCase().includes("all cities") && rawCity.toLowerCase() !== "all provinces") {
    const geo = resolveLocalGeocode(rawCity, rawProv);
    return {
      areaName: rawCity,
      provinceName: rawProv || "Philippines",
      center: [geo.lat || 14.2825, geo.lng || 120.8667],
    };
  }

  // 4. Province-level centroid only if a REAL specific province was provided (never "All Provinces")
  if (rawProv && rawProv.toLowerCase() !== "all provinces" && rawProv.toLowerCase() !== "philippines") {
    const geo = resolveLocalGeocode(rawProv, rawProv);
    if (
      geo &&
      geo.lat &&
      geo.lng &&
      (geo.lat !== 14.2825 || geo.lng !== 120.8667 || rawProv.toLowerCase().includes("cavite"))
    ) {
      return {
        areaName: rawProv,
        provinceName: rawProv,
        center: [geo.lat, geo.lng],
      };
    }
  }

  return null;
}

export default function EmployerApplicantFinder() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const companyLabel = useEmployerCompanyLabel("Employer");

  const applicantFinderFaqs: FAQItem[] = [
    {
      question: "How do I find jobseekers near my company location?",
      answer: "The map displays active jobseekers across Cavite and nearby regions. Use the province and city/municipality filters to discover candidates located in or open to working in your target geographic area.",
    },
    {
      question: "How do direct recruitment invitations work?",
      answer: "Click 'Invite Candidate' on an applicant card to send a direct job invitation. Once sent, a message thread opens in Messages and the candidate appears in your Recruitment List.",
      actionLabel: "View Messages",
      actionHref: "/messages",
    },
    {
      question: "Can I filter applicants by specific skills or job titles?",
      answer: "Yes! Use the search bar at the top of the map to filter candidates by desired job titles (e.g. 'Web Developer') or technical skills.",
    },
  ];

  // Mode Selection: "manual" (Manual Search) | "nearby" (Nearby Finder)
  const [searchMode, setSearchMode] = useState<"manual" | "nearby">("manual");

  // Employer Data (Location Starting Point)
  const [employerProfile, setEmployerProfile] = useState<EmployerProfileData | null>(null);
  // Default Company Location: Trece Martires Business Center / Governor's Drive (14.2825, 120.8667)
  const [employerCoords, setEmployerCoords] = useState<{ lat: number; lng: number }>({ lat: 14.2825, lng: 120.8667 });

  // Database-driven candidates state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEmployerId, setCurrentEmployerId] = useState<number | null>(null);

  // Search & Filter state - Matches JobSearch on Applicant side
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All roles");
  const [selectedLocation, setSelectedLocation] = useState("All locations");
  const [selectedArrangement, setSelectedArrangement] = useState("Any arrangement");
  const [selectedExperience, setSelectedExperience] = useState("Any experience");
  const [selectedMinSalary, setSelectedMinSalary] = useState("Any salary");
  const [sortBy, setSortBy] = useState<"Best Match" | "Rating" | "Newest">("Best Match");
  // ============================================================
  // GEOGRAPHIC LOCATION FILTER STATE (PROVINCE AND CITIES UP TO 5)
  // ============================================================
  const [filterLocations, setFilterLocations] = useState<string[]>([]);

  const selectedGeoProvince = useMemo(() => {
    if (filterLocations.length === 1) {
      const parts = filterLocations[0].split(",").map((s) => s.trim());
      return parts[1] || "All Provinces";
    }
    if (filterLocations.length > 1) {
      const firstProv = filterLocations[0].split(",")[1]?.trim();
      const allSame = filterLocations.every((loc) => loc.split(",")[1]?.trim() === firstProv);
      return allSame && firstProv ? firstProv : "All Provinces";
    }
    return "All Provinces";
  }, [filterLocations]);

  const selectedGeoCity = useMemo(() => {
    if (filterLocations.length === 1) {
      const parts = filterLocations[0].split(",").map((s) => s.trim());
      return parts[0] || "All Cities";
    }
    return "All Cities";
  }, [filterLocations]);
  const [selectedGeoScope, setSelectedGeoScope] = useState<"exact_and_preferred" | "exact" | "province" | "all">("exact_and_preferred");
  const [geoLandmarkQuery, setGeoLandmarkQuery] = useState("");
  const [isSearchingLandmark, setIsSearchingLandmark] = useState(false);
  const [activeLandmark, setActiveLandmark] = useState<{
    lat: number;
    lng: number;
    name: string;
    displayName: string;
  } | null>(null);
  const [geoBoundarySource, setGeoBoundarySource] = useState<"online" | "local" | "none">("none");
  const [isFetchingBoundary, setIsFetchingBoundary] = useState(false);
  const [filterSkills, setFilterSkills] = useState<ItemWithExp[]>([]);
  const [filterQualifications, setFilterQualifications] = useState<ItemWithExp[]>([]);
  const [filterCertifications, setFilterCertifications] = useState<ItemWithExp[]>([]);

  // Selected Candidate for Review Modal / Docs Drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candDetailTab, setCandDetailTab] = useState<"personal" | "preferences" | "competencies" | "experience">("personal");
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);
  const [isPreviewingDoc, setIsPreviewingDoc] = useState(false);
  const [candidateDocuments, setCandidateDocuments] = useState<ApplicantDocumentItem[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ApplicantDocumentItem | null>(null);

  const fetchCandidateDocuments = async (userId: number) => {
    if (!userId) return;
    setIsDocsLoading(true);
    try {
      const res = await fetch(`/api/applicants/${userId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setCandidateDocuments(Array.isArray(data?.documents) ? data.documents : []);
      }
    } catch (err) {
      console.error("Failed to load candidate documents:", err);
    } finally {
      setIsDocsLoading(false);
    }
  };

  // Invite to Apply Modal
  const [inviteCandidate, setInviteCandidate] = useState<Candidate | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | "">("");
  const [jobCarouselIndex, setJobCarouselIndex] = useState(0);
  const [viewingJobDetails, setViewingJobDetails] = useState<ActiveJob | null>(null);
  const [customInviteMsg, setCustomInviteMsg] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState("");
  const [invitedCandidateIds, setInvitedCandidateIds] = useState<number[]>([]);

  // Match Breakdown Drawer State
  const [isMatchDrawerOpen, setIsMatchDrawerOpen] = useState(false);
  const [isMatchDrawerClosing, setIsMatchDrawerClosing] = useState(false);
  const [isJobDetailsClosing, setIsJobDetailsClosing] = useState(false);
  const [hoveredCompareTag, setHoveredCompareTag] = useState<{
    item: string;
    side: "applicant" | "employer";
    category: "skills" | "qualifications" | "certifications";
  } | null>(null);

  const handleCloseMatchDrawer = () => {
    setIsMatchDrawerClosing(true);
    setTimeout(() => {
      setIsMatchDrawerOpen(false);
      setIsMatchDrawerClosing(false);
    }, 200);
  };

  const handleCloseJobDetails = () => {
    setIsJobDetailsClosing(true);
    setTimeout(() => {
      setViewingJobDetails(null);
      setIsJobDetailsClosing(false);
      setIsMatchDrawerOpen(false);
      setIsMatchDrawerClosing(false);
    }, 200);
  };

  const handleToggleMatchDrawer = () => {
    if (isMatchDrawerOpen) {
      handleCloseMatchDrawer();
    } else {
      setIsMatchDrawerOpen(true);
    }
  };

  // Selected Area Cluster for Side Drawer / Detailed List
  const [selectedAreaGroup, setSelectedAreaGroup] = useState<AreaApplicantGroup | null>(null);
  const [isAreaDrawerClosing, setIsAreaDrawerClosing] = useState(false);

  const handleCloseAreaDrawer = () => {
    setIsAreaDrawerClosing(true);
    setTimeout(() => {
      setSelectedAreaGroup(null);
      setIsAreaDrawerClosing(false);
    }, 200);
  };

  // Office Location Pinpoint Mode state (on main map)
  const [isPinpointMode, setIsPinpointMode] = useState(false);
  const [tempPinCoords, setTempPinCoords] = useState<{ lat: number; lng: number }>({ lat: 14.2825, lng: 120.8667 });
  const [isSavingOfficePin, setIsSavingOfficePin] = useState(false);

  // Leaflet Map References (Preserve Zoom & Center)
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.GeoJSON | L.Polygon | null>(null);
  const companyMarkerRef = useRef<L.Marker | null>(null);
  const landmarkMarkerRef = useRef<L.Marker | null>(null);

  const startPinpointMode = () => {
    setSearchMode("nearby");
    setIsPinpointMode(true);

    if (mapInstanceRef.current) {
      const curCenter = mapInstanceRef.current.getCenter();
      setTempPinCoords({ lat: curCenter.lat, lng: curCenter.lng });
    } else {
      const startLat = employerProfile?.latitude ? Number(employerProfile.latitude) : employerCoords.lat;
      const startLng = employerProfile?.longitude ? Number(employerProfile.longitude) : employerCoords.lng;
      setTempPinCoords({ lat: startLat, lng: startLng });
    }
  };

  const handleSaveOfficePin = async () => {
    if (!currentEmployerId) return;
    setIsSavingOfficePin(true);
    try {
      const res = await fetch(`/api/employers/${currentEmployerId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: tempPinCoords.lat,
          longitude: tempPinCoords.lng,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) setEmployerProfile(data.profile);
        setEmployerCoords({ lat: tempPinCoords.lat, lng: tempPinCoords.lng });
        setIsPinpointMode(false);
        fetchTalentData();
      } else {
        alert("Unable to save office location.");
      }
    } catch {
      alert("Failed to save office location.");
    } finally {
      setIsSavingOfficePin(false);
    }
  };

  const handleCancelPinpointMode = () => {
    setIsPinpointMode(false);
  };

  const handleUseCompanyLocation = () => {
    const compProv = employerProfile?.province || "Cavite";
    const compCity = employerProfile?.city;
    if (compCity) {
      setFilterLocations([`${compCity}, ${compProv}`]);
    } else {
      setFilterLocations([`All Cities / Municipalities, ${compProv}`]);
    }
    setSelectedGeoScope("exact_and_preferred");
  };

  const handleSearchLandmark = async () => {
    if (!geoLandmarkQuery.trim() || !mapInstanceRef.current) return;
    setIsSearchingLandmark(true);
    try {
      const q = `${geoLandmarkQuery.trim()}, ${selectedGeoProvince}, Philippines`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const items = await res.json();
        if (items && items.length > 0) {
          const lat = parseFloat(items[0].lat);
          const lng = parseFloat(items[0].lon);
          const found = {
            lat,
            lng,
            name: geoLandmarkQuery.trim(),
            displayName: items[0].display_name,
          };
          setActiveLandmark(found);

          if (landmarkMarkerRef.current) {
            landmarkMarkerRef.current.remove();
          }

          const landmarkIcon = L.divIcon({
            className: "custom-landmark-pin",
            html: `
              <div class="custom-landmark-pin-inner" title="${found.name}">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          landmarkMarkerRef.current = L.marker([lat, lng], { icon: landmarkIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div style="font-family: inherit; font-size: 0.85rem; padding: 2px;">
                <strong style="color: #072948; display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">${mapPinSvgString("#e11d48", 16)} ${found.name}</strong>
                <span style="color: #64748b; font-size: 0.76rem;">${found.displayName}</span>
              </div>
            `)
            .openPopup();

          mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 0.6 });
        } else {
          alert(`Could not find landmark "${geoLandmarkQuery}" in ${selectedGeoProvince}.`);
        }
      }
    } catch (err) {
      console.warn("Landmark search failed:", err);
    } finally {
      setIsSearchingLandmark(false);
    }
  };

  const handleClearLandmark = () => {
    setGeoLandmarkQuery("");
    setActiveLandmark(null);
    if (landmarkMarkerRef.current) {
      landmarkMarkerRef.current.remove();
      landmarkMarkerRef.current = null;
    }
  };

  const fetchTalentData = useCallback(async () => {
    const raw = localStorage.getItem("elitecruit-user");
    let userId: number | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.id) userId = parsed.id;
      } catch {}
    }
    setCurrentEmployerId(userId);

    setIsLoading(true);
    try {
      // 1. Fetch Employer Profile to determine Company Starting Location
      let resolvedEmpCoords = { lat: 14.1953, lng: 120.8769 }; // Default: Indang, Cavite
      if (userId) {
        try {
          const empRes = await fetch(`/api/employers/${userId}/profile`);
          if (empRes.ok) {
            const empData = await empRes.json();
            if (empData?.profile) {
              setEmployerProfile(empData.profile);
              const p = empData.profile;
              // Base employer location on the registered profile city / address
              if (p.city || p.company_address) {
                resolvedEmpCoords = resolveLocalGeocode(p.company_address, p.city || p.province || "Cavite");
              } else if (p.latitude && p.longitude) {
                resolvedEmpCoords = { lat: Number(p.latitude), lng: Number(p.longitude) };
              }
              setEmployerCoords(resolvedEmpCoords);
            }
          }
        } catch {}
      }

      // 2. Fetch Candidates
      let loadedCandidates: Candidate[] = [];
      const talentEndpoint = userId ? `/api/employers/${userId}/talent-pool` : `/api/talent-pool`;

      try {
        const talentRes = await fetch(talentEndpoint);
        if (talentRes.ok) {
          const data = await talentRes.json();
          if (Array.isArray(data?.candidates)) {
            loadedCandidates = data.candidates;
          }
        }
      } catch {}

      // Fallback: Employer applications API
      if (loadedCandidates.length === 0 && userId) {
        try {
          const appRes = await fetch(`/api/employers/${userId}/applications`);
          if (appRes.ok) {
            const data = await appRes.json();
            if (Array.isArray(data?.applications)) {
              const seen = new Set<number>();
              const mapped: Candidate[] = [];
              for (const a of data.applications) {
                const aId = a.applicant_user_id || a.id;
                if (!seen.has(aId)) {
                  seen.add(aId);
                  mapped.push({
                    user_id: aId,
                    email: a.email || "",
                    applicant_name: a.applicant_name || "Applicant",
                    desired_job_title: a.desired_job_title || a.job_title || "",
                    city: a.city || "",
                    address: a.address || null,
                    work_arrangement: a.work_arrangement || null,
                    expected_salary: a.expected_salary || null,
                    skills: a.skills || null,
                    qualifications: a.qualifications || null,
                    certifications: a.certifications || null,
                    resume_path: a.resume_path || null,
                    applied_count: 1,
                    latest_application_status: a.status || null,
                  });
                }
              }
              loadedCandidates = mapped;
            }
          }
        } catch {}
      }

      // Ensure address, email, resume_path & work_arrangement are present and compute distance from Company
      for (const c of loadedCandidates) {
        if ((!c.address || !c.email || !c.resume_path || !c.work_arrangement || !c.expected_salary || !c.phone) && c.user_id) {
          try {
            const pRes = await fetch(`/api/applicants/${c.user_id}/profile`);
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData?.profile) {
                if (pData.profile.phone) c.phone = pData.profile.phone;
                if (pData.profile.address) c.address = pData.profile.address;
                if (pData.profile.city) c.city = pData.profile.city;
                if (pData.profile.province) c.province = pData.profile.province;
                if (pData.profile.email) c.email = pData.profile.email;
                if (pData.profile.resume_path) c.resume_path = pData.profile.resume_path;
                if (pData.profile.work_arrangement) c.work_arrangement = pData.profile.work_arrangement;
                if (pData.profile.expected_salary) c.expected_salary = pData.profile.expected_salary;
                if (pData.profile.desired_job_title) c.desired_job_title = pData.profile.desired_job_title;
                if (pData.profile.summary) c.summary = pData.profile.summary;
                if (pData.profile.languages) c.languages = pData.profile.languages;
                if (pData.profile.skills) c.skills = pData.profile.skills;
                if (pData.profile.qualifications) c.qualifications = pData.profile.qualifications;
                if (pData.profile.certifications) c.certifications = pData.profile.certifications;
                if (pData.profile.years_of_experience) c.years_of_experience = pData.profile.years_of_experience;
                if (pData.profile.work_experience_json) c.work_experience_json = pData.profile.work_experience_json;
                if (pData.profile.preferred_locations) c.preferred_locations = pData.profile.preferred_locations;
                if (pData.profile.preferred_cities_json) c.preferred_cities_json = pData.profile.preferred_cities_json;
                if (pData.profile.nearby_location) c.nearby_location = pData.profile.nearby_location;
                if (pData.profile.latitude) c.latitude = pData.profile.latitude;
                if (pData.profile.longitude) c.longitude = pData.profile.longitude;
                if (pData.profile.shs_strand) c.shs_strand = pData.profile.shs_strand;
                if (pData.profile.shs_school) c.shs_school = pData.profile.shs_school;
                if (pData.profile.shs_grad_year) c.shs_grad_year = pData.profile.shs_grad_year;
                if (pData.profile.college_grad_year) c.college_grad_year = pData.profile.college_grad_year;
                if (pData.profile.vocational_grad_year) c.vocational_grad_year = pData.profile.vocational_grad_year;
              }
            }
          } catch {}
        }

        // Calculate distance from company
        const candCoords = (c.latitude && c.longitude && !isNaN(Number(c.latitude)) && Number(c.latitude) !== 0)
          ? { lat: Number(c.latitude), lng: Number(c.longitude) }
          : resolveLocalGeocode(c.nearby_location || c.address || c.city, c.province || "Cavite");

        c.distance_km = calculateDistanceKm(
          resolvedEmpCoords.lat,
          resolvedEmpCoords.lng,
          candCoords.lat,
          candCoords.lng
        );
      }

      setCandidates(loadedCandidates);

      // Fetch Active Job Posts
      if (userId) {
        try {
          const jobsRes = await fetch(`/api/employers/${userId}/active-job-posts`);
          if (jobsRes.ok) {
            const jdata = await jobsRes.json();
            if (Array.isArray(jdata?.jobs)) {
              setActiveJobs(jdata.jobs);
              if (jdata.jobs.length > 0) setSelectedJobId(jdata.jobs[0].id);
            }
          } else {
            const allJobsRes = await fetch(`/api/employers/${userId}/job-posts`);
            if (allJobsRes.ok) {
              const ajData = await allJobsRes.json();
              if (Array.isArray(ajData?.jobPosts)) {
                setActiveJobs(ajData.jobPosts);
                if (ajData.jobPosts.length > 0) setSelectedJobId(ajData.jobPosts[0].id);
              }
            }
          }
        } catch {}
      }
    } catch (err) {
      console.error("Failed to load talent pool:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTalentData();
  }, [fetchTalentData]);

  useEffect(() => {
    if (selectedCandidate?.user_id) {
      fetchCandidateDocuments(selectedCandidate.user_id);
      fetch(`/api/applicants/${selectedCandidate.user_id}/profile`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.profile) {
            setSelectedCandidate((prev) =>
              prev
                ? {
                    ...prev,
                    resume_path: data.profile.resume_path || prev.resume_path,
                    profile_picture_path: data.profile.profile_picture_path || prev.profile_picture_path,
                    work_arrangement: data.profile.work_arrangement || prev.work_arrangement || null,
                    expected_salary: data.profile.expected_salary || prev.expected_salary || null,
                    desired_job_title: data.profile.desired_job_title || prev.desired_job_title,
                    skills: data.profile.skills || prev.skills,
                    qualifications: data.profile.qualifications || prev.qualifications,
                    certifications: data.profile.certifications || prev.certifications,
                    preferred_locations: data.profile.preferred_locations || prev.preferred_locations,
                    preferred_cities_json: data.profile.preferred_cities_json || prev.preferred_cities_json,
                    address: data.profile.address || prev.address,
                    city: data.profile.city || prev.city,
                    province: data.profile.province || prev.province || "Cavite",
                    phone: data.profile.phone || prev.phone,
                    email: data.profile.email || prev.email,
                    summary: data.profile.summary || prev.summary,
                    languages: data.profile.languages || prev.languages,
                    work_experience_json: data.profile.work_experience_json || prev.work_experience_json,
                    years_of_experience: data.profile.years_of_experience || prev.years_of_experience,
                    rating: data.profile.rating !== undefined ? data.profile.rating : prev.rating,
                  }
                : null
            );
          }
        })
        .catch(() => {});
    } else {
      setCandidateDocuments([]);
      setPreviewDoc(null);
    }
  }, [selectedCandidate?.user_id]);

  const applySearch = () => {
    setAppliedSearchQuery(searchInput.trim().toLowerCase());
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedRole !== "All roles") count += 1;
    if (filterLocations.length > 0) count += filterLocations.length;
    if (selectedArrangement !== "Any arrangement") count += 1;
    if (selectedExperience !== "Any experience") count += 1;
    if (selectedMinSalary !== "Any salary") count += 1;
    if (sortBy !== "Best Match") count += 1;
    count += filterSkills.length;
    count += filterQualifications.length;
    count += filterCertifications.length;
    return count;
  }, [
    selectedRole,
    filterLocations,
    selectedArrangement,
    selectedExperience,
    selectedMinSalary,
    sortBy,
    filterSkills,
    filterQualifications,
    filterCertifications,
  ]);

  const clearAllFilters = () => {
    setSearchInput("");
    setAppliedSearchQuery("");
    setSelectedRole("All roles");
    setSelectedLocation("All locations");
    setFilterLocations([]);
    setSelectedGeoScope("exact_and_preferred");
    setSelectedArrangement("Any arrangement");
    setSelectedExperience("Any experience");
    setSelectedMinSalary("Any salary");
    setSortBy("Best Match");
    setFilterSkills([]);
    setFilterQualifications([]);
    setFilterCertifications([]);
    setGeoLandmarkQuery("");
    setActiveLandmark(null);
    if (landmarkMarkerRef.current) {
      landmarkMarkerRef.current.remove();
      landmarkMarkerRef.current = null;
    }
  };

  const filteredCandidates = useMemo(() => {
    const list = candidates.filter((cand) => {
      // In Nearby Finder mode, only show applicants who have Nearby Employer Discovery ACTIVE
      if (searchMode === "nearby") {
        const isNearbyDiscoveryActive = Boolean(
          cand.nearby_location && cand.nearby_location.trim().length > 0
        );
        if (!isNearbyDiscoveryActive) {
          return false;
        }
      }

      // 1. Search Query
      if (appliedSearchQuery) {
        const name = (cand.applicant_name || "").toLowerCase();
        const role = (cand.desired_job_title || "").toLowerCase();
        const skills = (cand.skills || "").toLowerCase();
        const city = (cand.city || "").toLowerCase();
        const addr = (cand.address || "").toLowerCase();
        if (
          !name.includes(appliedSearchQuery) &&
          !role.includes(appliedSearchQuery) &&
          !skills.includes(appliedSearchQuery) &&
          !city.includes(appliedSearchQuery) &&
          !addr.includes(appliedSearchQuery)
        ) {
          return false;
        }
      }

      // 2. Geographic Location Matching (Province & Cities up to 5)
      if (filterLocations.length > 0) {
        const matchesLoc = filterLocations.some((locTag) => candidateMatchesLocationTag(cand, locTag));
        if (!matchesLoc) return false;
      }

      // 3. Target Role
      if (selectedRole !== "All roles") {
        const target = selectedRole.toLowerCase();
        const candRole = (cand.desired_job_title || "").toLowerCase();
        const candSummary = (cand.summary || "").toLowerCase();
        const candWorkExp = (cand.work_experience_json || "").toLowerCase();

        const roleMatches =
          (candRole && (candRole.includes(target) || target.includes(candRole))) ||
          candSummary.includes(target) ||
          candWorkExp.includes(target);

        if (!roleMatches) return false;
      }

      // 4. Experience Level
      if (selectedExperience !== "Any experience") {
        const candExp = (cand.years_of_experience || "").toLowerCase();
        const targetExp = selectedExperience.toLowerCase();

        const expMatches = (() => {
          if (!candExp) return false;
          if (candExp === targetExp) return true;
          if (candExp.includes(targetExp) || targetExp.includes(candExp)) return true;

          if (targetExp.includes("fresh") && (candExp.includes("fresh") || candExp.includes("entry") || candExp.includes("< 1") || candExp.includes("0 year") || candExp.includes("less than"))) return true;
          if (targetExp.includes("junior") && (candExp.includes("junior") || candExp.includes("1 - 2") || candExp.includes("1-2") || candExp.includes("1 year") || candExp.includes("2 year"))) return true;
          if (targetExp.includes("mid") && (candExp.includes("mid") || candExp.includes("3 - 5") || candExp.includes("3-5") || candExp.includes("3 year") || candExp.includes("4 year") || candExp.includes("5 year") || candExp.includes("3+ year"))) return true;
          if (targetExp.includes("senior") && (candExp.includes("senior") || candExp.includes("5 - 8") || candExp.includes("5-8") || candExp.includes("6 year") || candExp.includes("7 year") || candExp.includes("8 year"))) return true;
          if ((targetExp.includes("lead") || targetExp.includes("expert")) && (candExp.includes("lead") || candExp.includes("expert") || candExp.includes("8+") || candExp.includes("10+"))) return true;

          return false;
        })();

        if (!expMatches) return false;
      }

      // 5. Work Arrangement
      if (selectedArrangement !== "Any arrangement") {
        const candWa = (cand.work_arrangement || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
        const targetWa = selectedArrangement.replace(/[^a-zA-Z]/g, "").toLowerCase();
        if (!candWa || candWa !== targetWa) {
          return false;
        }
      }

      // 6. Expected Salary
      if (selectedMinSalary !== "Any salary") {
        const minVal = parseInt(selectedMinSalary.replace(/[^0-9]/g, ""), 10);
        const candSalMin = cand.expected_salary_min ? Number(cand.expected_salary_min) : parseExpectedSalary(cand.expected_salary);
        const candSalMax = cand.expected_salary_max
          ? Number(cand.expected_salary_max)
          : (cand.expected_salary && cand.expected_salary.includes("-")
              ? parseExpectedSalary(cand.expected_salary.split("-")[1])
              : candSalMin);

        if (!isNaN(minVal) && candSalMax > 0 && candSalMax < minVal) {
          return false;
        }
      }

      // 7. Technical Skills (ItemWithExp)
      if (filterSkills.length > 0) {
        const candSkillsList = parseItemList(cand.skills, []);
        const candSkillsRaw = (cand.skills || "").toLowerCase();
        const matchesSkill = filterSkills.some((s) => {
          if (candSkillsRaw.includes(s.name.toLowerCase())) return true;
          const parts = s.name.split("/").map((p) => p.trim());
          if (parts.some((p) => candSkillsRaw.includes(p.toLowerCase()))) return true;
          return candSkillsList.some((cs) => isSkillMatch(cs, s.name));
        });
        if (!matchesSkill) return false;
      }

      // 8. Qualifications (ItemWithExp)
      if (filterQualifications.length > 0) {
        const candQualList = parseItemList(cand.qualifications, []);
        const candQualRaw = (cand.qualifications || "").toLowerCase();
        const matchesQual = filterQualifications.some((q) => {
          if (candQualRaw.includes(q.name.toLowerCase())) return true;
          const parts = q.name.split("/").map((p) => p.trim());
          if (parts.some((p) => candQualRaw.includes(p.toLowerCase()))) return true;
          return candQualList.some((cq) => isSkillMatch(cq, q.name));
        });
        if (!matchesQual) return false;
      }

      // 9. Certifications (ItemWithExp)
      if (filterCertifications.length > 0) {
        const candCertList = parseItemList(cand.certifications, []);
        const candCertRaw = (cand.certifications || "").toLowerCase();
        const matchesCert = filterCertifications.some((c) => {
          if (candCertRaw.includes(c.name.toLowerCase())) return true;
          const parts = c.name.split("/").map((p) => p.trim());
          if (parts.some((p) => candCertRaw.includes(p.toLowerCase()))) return true;
          return candCertList.some((cc) => isSkillMatch(cc, c.name));
        });
        if (!matchesCert) return false;
      }

      return true;
    });

    if (searchMode === "nearby") {
      return [...list].sort((a, b) => {
        if (filterLocations.length > 0) {
          const scoreA = getCandidateLocationScore(a, filterLocations);
          const scoreB = getCandidateLocationScore(b, filterLocations);
          if (scoreB !== scoreA) return scoreB - scoreA;
        } else {
          const scoreA = evaluateCandidateGeoMatch(a, selectedGeoProvince, selectedGeoCity, selectedGeoScope).score;
          const scoreB = evaluateCandidateGeoMatch(b, selectedGeoProvince, selectedGeoCity, selectedGeoScope).score;
          if (scoreB !== scoreA) return scoreB - scoreA;
        }
        return Number(b.rating || 0) - Number(a.rating || 0);
      });
    }
    if (sortBy === "Rating") {
      return [...list].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }
    if (sortBy === "Newest") {
      return [...list].sort((a, b) => (b.user_id || 0) - (a.user_id || 0));
    }
    if (sortBy === "Best Match" && searchMode === "manual") {
      return [...list].sort((a, b) => {
        let scoreA = Number(a.rating || 0) * 10;
        let scoreB = Number(b.rating || 0) * 10;
        if (a.profile_picture_path) scoreA += 5;
        if (b.profile_picture_path) scoreB += 5;
        if (a.resume_path) scoreA += 5;
        if (b.resume_path) scoreB += 5;
        if (filterSkills.length > 0) {
          const sA = (a.skills || "").toLowerCase();
          const sB = (b.skills || "").toLowerCase();
          const countA = filterSkills.filter((s) => sA.includes(s.name.toLowerCase())).length;
          const countB = filterSkills.filter((s) => sB.includes(s.name.toLowerCase())).length;
          scoreA += countA * 15;
          scoreB += countB * 15;
        }
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.user_id || 0) - (a.user_id || 0);
      });
    }
    return list;
  }, [
    candidates,
    appliedSearchQuery,
    searchMode,
    filterLocations,
    selectedGeoProvince,
    selectedGeoCity,
    selectedGeoScope,
    selectedRole,
    selectedLocation,
    selectedArrangement,
    selectedExperience,
    selectedMinSalary,
    filterSkills,
    filterQualifications,
    filterCertifications,
    sortBy,
  ]);

  const CANDIDATES_PER_PAGE = 10;
  const [candidatePage, setCandidatePage] = useState(1);
  const totalCandidatePages = Math.max(1, Math.ceil(filteredCandidates.length / CANDIDATES_PER_PAGE));
  const paginatedCandidates = useMemo(() => {
    const start = (candidatePage - 1) * CANDIDATES_PER_PAGE;
    return filteredCandidates.slice(start, start + CANDIDATES_PER_PAGE);
  }, [filteredCandidates, candidatePage]);

  // Reset page to 1 whenever any filter changes
  useEffect(() => {
    setCandidatePage(1);
  }, [
    appliedSearchQuery,
    filterLocations,
    selectedGeoProvince,
    selectedGeoCity,
    selectedGeoScope,
    selectedRole,
    selectedLocation,
    selectedArrangement,
    selectedExperience,
    selectedMinSalary,
    filterSkills,
    filterQualifications,
    filterCertifications,
    sortBy,
  ]);

  useEffect(() => {
    if (candidatePage > totalCandidatePages) {
      setCandidatePage(totalCandidatePages);
    }
  }, [candidatePage, totalCandidatePages]);

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
      ".appdash-main, .applicant-finder-main, .finder-main-content"
    );
    containers.forEach((el) => {
      try {
        el.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      el.scrollTop = 0;
    });
    // 3. Native scrollIntoView on header / search bar
    const topAnchor = document.querySelector(".finder-results-header, .search-bar-card, .appdash-topbar") as HTMLElement | null;
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
  }, [candidatePage]);

  // Group candidates strictly by municipal area to enforce privacy and show single pin per area
  const areaGroups = useMemo<AreaApplicantGroup[]>(() => {
    const map = new Map<string, AreaApplicantGroup>();

    for (const cand of filteredCandidates) {
      const area = getAreaForCandidate(cand, selectedGeoProvince);
      if (
        !area ||
        !area.areaName ||
        area.areaName.toLowerCase() === "all provinces" ||
        area.areaName.toLowerCase().includes("all cities")
      ) {
        continue;
      }
      const key = area.areaName.toLowerCase();

      const geoMatch = evaluateCandidateGeoMatch(
        cand,
        selectedGeoProvince,
        selectedGeoCity,
        selectedGeoScope
      );

      if (!map.has(key)) {
        map.set(key, {
          areaKey: key,
          areaName: area.areaName,
          provinceName: area.provinceName,
          center: area.center,
          candidates: [cand],
          bestScore: geoMatch.score,
          badgeType: geoMatch.badgeType,
        });
      } else {
        const group = map.get(key)!;
        group.candidates.push(cand);
        if (geoMatch.score > group.bestScore) {
          group.bestScore = geoMatch.score;
          group.badgeType = geoMatch.badgeType;
        }
      }
    }

    return Array.from(map.values());
  }, [filteredCandidates, selectedGeoProvince, selectedGeoCity, selectedGeoScope]);

  // Keep selectedAreaGroup in sync with filtered candidates or auto-close if filtered out
  useEffect(() => {
    if (selectedAreaGroup) {
      const match = areaGroups.find((g) => g.areaKey === selectedAreaGroup.areaKey);
      if (match) {
        setSelectedAreaGroup(match);
      } else {
        setSelectedAreaGroup(null);
      }
    }
  }, [areaGroups]);

  // ============================================================
  // LEAFLET MAP: INITIALIZE ONCE WHEN ENTERING NEARBY MODE
  // ============================================================
  useEffect(() => {
    if (searchMode !== "nearby") {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        polygonLayerRef.current = null;
        companyMarkerRef.current = null;
      }
      return;
    }

    const mapContainer = document.getElementById("leaflet-pinpoint-map");
    if (!mapContainer) return;

    if (!mapInstanceRef.current) {
      const map = L.map("leaflet-pinpoint-map", {
        zoomControl: true,
        attributionControl: false,
      }).setView([employerCoords.lat, employerCoords.lng], 13);

      mapInstanceRef.current = map;

      // Vector Tile Layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Layer groups for dynamic elements
      markersLayerRef.current = L.layerGroup().addTo(map);

      // Invalidate size once container mounts
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }

    const handleResize = () => {
      mapInstanceRef.current?.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [searchMode]);

  // ============================================================
  // LEAFLET MAP: UPDATE MARKERS & GEOGRAPHIC BOUNDARY
  // ============================================================
  useEffect(() => {
    if (searchMode !== "nearby" || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // 1. Update Geographic Area Boundary / Municipal Polygon
    if (polygonLayerRef.current) {
      polygonLayerRef.current.remove();
      polygonLayerRef.current = null;
    }

    let isCancelled = false;

    if (selectedGeoCity !== "All Cities" || selectedGeoProvince !== "All Provinces") {
      setIsFetchingBoundary(true);
      fetchOnlineBoundary(selectedGeoProvince, selectedGeoCity).then((result) => {
        if (isCancelled || !mapInstanceRef.current) return;
        setIsFetchingBoundary(false);

        if (polygonLayerRef.current) {
          polygonLayerRef.current.remove();
          polygonLayerRef.current = null;
        }

        if (result && result.geojson) {
          setGeoBoundarySource(result.source);
          try {
            const boundaryLayer = L.geoJSON(result.geojson, {
              style: {
                color: "#0284c7",
                weight: 2,
                fillColor: "#0284c7",
                fillOpacity: 0.08,
                dashArray: "4, 4",
              },
            }).addTo(mapInstanceRef.current);

            polygonLayerRef.current = boundaryLayer;

            const label = selectedGeoCity !== "All Cities"
              ? (result.displayName || selectedGeoCity)
              : (result.displayName || selectedGeoProvince);

            const emptyNotice = filteredCandidates.length === 0 && filterLocations.length > 0 ? " — No applicants currently available" : "";
            boundaryLayer.bindTooltip(
              `${label}${emptyNotice}`,
              { sticky: true, opacity: 0.9 }
            );

            const bounds = boundaryLayer.getBounds();
            if (bounds.isValid()) {
              mapInstanceRef.current.fitBounds(bounds, { padding: [25, 25], maxZoom: 14, duration: 0.6 });
            } else {
              mapInstanceRef.current.flyTo(result.center, 12, { duration: 0.6 });
            }
          } catch (e) {
            console.warn("Failed to render GeoJSON boundary layer:", e);
            mapInstanceRef.current.flyTo(result.center, 12, { duration: 0.6 });
          }
        } else {
          setGeoBoundarySource("none");
          const targetLoc = selectedGeoCity !== "All Cities" ? selectedGeoCity : selectedGeoProvince;
          const geo = resolveLocalGeocode(targetLoc, selectedGeoProvince);
          if (geo && geo.lat && geo.lng) {
            mapInstanceRef.current.flyTo([geo.lat, geo.lng], selectedGeoCity !== "All Cities" ? 13 : 11, { duration: 0.6 });
          }
        }
      });
    } else {
      setGeoBoundarySource("none");
      setIsFetchingBoundary(false);
      // All Provinces & All Cities: Pan cleanly to regional default center
      map.flyTo([14.2825, 120.8667], 10, { duration: 0.6 });
    }

    // 2. Update Company Pin
    if (companyMarkerRef.current) {
      companyMarkerRef.current.remove();
      companyMarkerRef.current = null;
    }

    if (isPinpointMode) {
      const companyPinHtml = `
        <div class="company-headquarters-pin pinpoint-active" title="Drag to set office location">
          <div class="company-pin-inner" style="background:#073e68; border-color:#ffffff;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
          </div>
        </div>
      `;

      const companyIcon = L.divIcon({
        className: "company-pin-wrapper",
        html: companyPinHtml,
        iconSize: [44, 55],
        iconAnchor: [22, 55],
      });

      const companyMarker = L.marker([tempPinCoords.lat, tempPinCoords.lng], {
        draggable: true,
        icon: companyIcon,
      }).addTo(map);

      companyMarker.on("dragend", () => {
        const pos = companyMarker.getLatLng();
        setTempPinCoords({ lat: pos.lat, lng: pos.lng });
      });

      const handleMapClick = (e: L.LeafletMouseEvent) => {
        companyMarker.setLatLng(e.latlng);
        setTempPinCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      };

      map.on("click", handleMapClick);
      companyMarkerRef.current = companyMarker;
    } else if (employerProfile) {
      // Determine company location based on profile city / address
      const empCity = employerProfile.city || employerProfile.company_address || "";
      const rawCompanyLoc = empCity
        ? resolveLocalGeocode(employerProfile.company_address, empCity)
        : (employerProfile.latitude && employerProfile.longitude
            ? { lat: Number(employerProfile.latitude), lng: Number(employerProfile.longitude) }
            : null);

      let isCollidingWithApplicantGroup = false;
      let collidingAreaName = "";
      if (rawCompanyLoc) {
        for (const group of areaGroups) {
          if (
            isSameOrNearbyArea(
              empCity,
              rawCompanyLoc,
              group.areaName,
              group.center
            )
          ) {
            isCollidingWithApplicantGroup = true;
            collidingAreaName = group.areaName;
            break;
          }
        }
      }

      let finalCompanyCoords: [number, number] | null = rawCompanyLoc ? [rawCompanyLoc.lat, rawCompanyLoc.lng] : null;
      if (rawCompanyLoc && isCollidingWithApplicantGroup) {
        finalCompanyCoords = getDispersedMunicipalityCoords(
          rawCompanyLoc.lat,
          rawCompanyLoc.lng,
          true,
          collidingAreaName || empCity || "company"
        );
      }

      if (finalCompanyCoords) {
        const companyPinHtml = `
          <div class="company-headquarters-pin ${isCollidingWithApplicantGroup ? "badge-top" : ""}" title="${employerProfile?.business_name || companyLabel}">
            <div class="company-pin-badge">${employerProfile?.business_name || "Your Company"}</div>
            <div class="company-pin-inner">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
            </div>
          </div>
        `;

        const companyIcon = L.divIcon({
          className: "company-pin-wrapper",
          html: companyPinHtml,
          iconSize: [140, 80],
          iconAnchor: isCollidingWithApplicantGroup ? [70, 78] : [70, 55],
          popupAnchor: isCollidingWithApplicantGroup ? [0, -78] : [0, -55],
        });

        const companyMarker = L.marker([finalCompanyCoords[0], finalCompanyCoords[1]], { icon: companyIcon }).addTo(map);
        const companyName = employerProfile?.business_name || companyLabel;
        const companyCity = employerProfile?.city || employerProfile?.company_address || "Office Location";
        const logoUrl = employerProfile?.company_logo_path
          ? (employerProfile.company_logo_path.startsWith("http") || employerProfile.company_logo_path.startsWith("/api")
              ? employerProfile.company_logo_path
              : `/api/employers/${currentEmployerId}/logo`)
          : "";

        const companyLogoHtml = logoUrl
          ? `<img src="${logoUrl}" alt="${companyName}" style="width:34px; height:34px; border-radius:8px; object-fit:cover; border:1px solid #e2e8f0; flex-shrink:0;" />`
          : `<div style="width:34px; height:34px; border-radius:8px; background:linear-gradient(135deg, #072948 0%, #0d4b82 100%); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 6px rgba(7,41,72,0.25);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f6be45" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <path d="M9 22v-4h6v4"></path>
                <path d="M8 6h.01"></path>
                <path d="M16 6h.01"></path>
                <path d="M12 6h.01"></path>
                <path d="M12 10h.01"></path>
                <path d="M12 14h.01"></path>
                <path d="M16 10h.01"></path>
                <path d="M16 14h.01"></path>
                <path d="M8 10h.01"></path>
                <path d="M8 14h.01"></path>
              </svg>
            </div>`;

        companyMarker.bindPopup(`
          <div style="font-family:inherit; min-width:210px; padding:6px 2px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
              ${companyLogoHtml}
              <div style="min-width:0;">
                <strong style="color:#0f172a; font-size:0.95rem; font-weight:800; display:block; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${companyName}</strong>
                <small style="color:#64748b; font-size:0.74rem; font-weight:600;">Company Headquarters</small>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; font-size:0.78rem; color:#334155; font-weight:600; padding-top:6px; border-top:1px solid #f1f5f9;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${companyCity}</span>
            </div>
          </div>
        `);
        companyMarkerRef.current = companyMarker;
      }
    }

    // 3. Update Area Group Pinpoints (One pinpoint per municipality/area)
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();

      const empCity = employerProfile?.city || employerProfile?.company_address || "";
      const rawCompanyLoc = empCity
        ? resolveLocalGeocode(employerProfile?.company_address, empCity)
        : (employerProfile?.latitude && employerProfile?.longitude
            ? { lat: Number(employerProfile.latitude), lng: Number(employerProfile.longitude) }
            : null);

      for (const group of areaGroups) {
        if (
          !group.areaName ||
          group.areaName.toLowerCase() === "all provinces" ||
          group.areaName.toLowerCase().includes("all cities")
        ) {
          continue;
        }
        const isMulti = group.candidates.length > 1;

        // Disperse applicant pin if in same location as company pin so they never overlap
        const isCollidingWithCompany = Boolean(
          rawCompanyLoc &&
          isSameOrNearbyArea(
            group.areaName,
            group.center,
            empCity,
            rawCompanyLoc
          )
        );

        let finalGroupCoords: [number, number] = [group.center[0], group.center[1]];
        if (isCollidingWithCompany) {
          finalGroupCoords = getDispersedMunicipalityCoords(
            group.center[0],
            group.center[1],
            false,
            group.areaName || empCity || "company"
          );
        }

        const pinHtml = `
          <div class="custom-candidate-pin-inner ${group.badgeType} ${isMulti ? "is-area-cluster" : ""}" title="${group.areaName} (${group.candidates.length} ${isMulti ? "Applicants" : "Applicant"}) - Click to view list">
            <span class="pin-initials-text">${getAreaInitials(group.areaName)}</span>
            ${isMulti ? `<span class="pin-group-count-badge" title="${group.candidates.length} applicants">${group.candidates.length}</span>` : ""}
          </div>
          <div class="pin-area-label-tag">
            ${group.areaName}${isMulti ? ` (${group.candidates.length})` : ""}
          </div>
        `;

        const customIcon = L.divIcon({
          className: "custom-candidate-pin-container",
          html: pinHtml,
          iconSize: [64, 56],
          iconAnchor: [32, 28],
          popupAnchor: [0, -28],
        });

        const marker = L.marker([finalGroupCoords[0], finalGroupCoords[1]], { icon: customIcon }).addTo(markersLayerRef.current);

        // Compact Leaflet Popup Bubble (Only shows location, applicant count, and button to open full list modal)
        const popupDiv = document.createElement("div");
        popupDiv.className = "area-map-popup compact-bubble";
        popupDiv.innerHTML = `
          <div class="area-popup-header">
            <div class="area-popup-header-title">
              <span class="area-header-pin-icon" style="display:inline-flex; align-items:center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </span>
              <strong class="area-header-name">${group.areaName}. ${group.provinceName}</strong>
            </div>
          </div>
          <div class="area-popup-bubble-body">
            <div class="area-popup-bubble-stat">
              <span class="area-stat-num">${group.candidates.length}</span>
              <span class="area-stat-label">${group.candidates.length === 1 ? "applicant in this area" : "applicants in this area"}</span>
            </div>
            <button id="area-bubble-btn-${group.areaKey}" class="area-view-applicants-modal-btn" type="button">
              View Applicants List
            </button>
          </div>
        `;

        marker.bindPopup(popupDiv, { maxWidth: 320, minWidth: 260, className: "area-cluster-leaflet-popup" });

        marker.on("popupopen", () => {
          const openModalBtn = document.getElementById(`area-bubble-btn-${group.areaKey}`);
          if (openModalBtn) {
            openModalBtn.onclick = (e) => {
              e.stopPropagation();
              mapInstanceRef.current?.closePopup();
              setSelectedAreaGroup(group);
            };
          }
        });
      }

      // Render 0-applicant indicator pins for any selected location that has no applicants
      if (filterLocations.length > 0) {
        for (const locTag of filterLocations) {
          const parts = locTag.split(",").map((s) => s.trim());
          const locCity = parts[0] || "";
          const locProv = parts[1] || "";

          if (
            !locCity ||
            locCity.toLowerCase() === "all provinces" ||
            locCity.toLowerCase().includes("all cities")
          ) {
            continue;
          }

          const hasCandidatesInLoc = filteredCandidates.some((c) => candidateMatchesLocationTag(c, locTag));
          if (!hasCandidatesInLoc) {
            let emptyCoords: [number, number] | null = null;
            const cacheKey = `${locProv}:::${locCity}`.toLowerCase();
            if (geoBoundaryCache.has(cacheKey)) {
              emptyCoords = geoBoundaryCache.get(cacheKey)!.center;
            } else if (CAVITE_MUNICIPALITIES[locCity]) {
              emptyCoords = CAVITE_MUNICIPALITIES[locCity].center;
            } else {
              const geo = resolveLocalGeocode(locCity, locProv);
              if (geo && geo.lat && geo.lng && (geo.lat !== 14.2825 || geo.lng !== 120.8667 || locCity.toLowerCase().includes("trece"))) {
                emptyCoords = [geo.lat, geo.lng];
              }
            }

            if (emptyCoords) {
              const emptyPinHtml = `
                <div class="custom-candidate-pin-inner empty-location-pin" title="${locTag} (0 Applicants Available)">
                  <span class="pin-initials-text">${getAreaInitials(locCity)}</span>
                  <span class="pin-group-count-badge zero-count" title="0 Applicants Available">0</span>
                </div>
                <div class="pin-area-label-tag empty-label">
                  ${locCity} (0)
                </div>
              `;

              const customEmptyIcon = L.divIcon({
                className: "custom-candidate-pin-container",
                html: emptyPinHtml,
                iconSize: [64, 56],
                iconAnchor: [32, 28],
                popupAnchor: [0, -28],
              });

              const emptyMarker = L.marker([emptyCoords[0], emptyCoords[1]], { icon: customEmptyIcon }).addTo(markersLayerRef.current);

              const emptyPopupDiv = document.createElement("div");
              emptyPopupDiv.className = "area-map-popup compact-bubble";
              emptyPopupDiv.innerHTML = `
                <div class="area-popup-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                  <div class="area-popup-header-title">
                    <span class="area-header-pin-icon" style="display:inline-flex; align-items:center;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </span>
                    <div>
                      <strong class="area-header-name" style="color:#334155;">${locCity}${locProv ? `, ${locProv}` : ""}</strong>
                      <span class="area-header-count" style="color:#e11d48; font-weight:700;">0 Applicants currently available</span>
                    </div>
                  </div>
                </div>
                <div class="area-popup-bubble-body" style="padding:12px 14px; text-align:center;">
                  <p style="font-size:0.78rem; color:#64748b; margin:0 0 10px; line-height:1.45;">
                    There are no registered jobseekers currently located in or seeking work in <strong>${locCity}</strong>.
                  </p>
                  <div style="font-size:0.72rem; color:#94a3b8; font-style:italic;">
                    Try selecting nearby municipalities or expanding your search filters.
                  </div>
                </div>
              `;

              emptyMarker.bindPopup(emptyPopupDiv, { maxWidth: 300, minWidth: 240, className: "area-cluster-leaflet-popup" });
            }
          }
        }
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [
    searchMode,
    areaGroups,
    filterLocations,
    filteredCandidates,
    employerCoords,
    employerProfile,
    companyLabel,
    selectedGeoProvince,
    selectedGeoCity,
    selectedGeoScope,
    isPinpointMode,
    tempPinCoords,
    invitedCandidateIds,
  ]);

  const openInviteModal = (cand: Candidate, initialJobId?: number) => {
    setInviteCandidate(cand);
    let targetIndex = 0;
    if (initialJobId && activeJobs.length > 0) {
      const foundIdx = activeJobs.findIndex((j) => j.id === initialJobId);
      if (foundIdx !== -1) targetIndex = foundIdx;
    }
    setJobCarouselIndex(targetIndex);
    const targetJob = activeJobs[targetIndex];
    if (targetJob) {
      setSelectedJobId(targetJob.id);
      setCustomInviteMsg(
        `Hello ${cand.applicant_name}! We reviewed your profile and would love to invite you to apply for our open position: ${targetJob.title}.`
      );
    } else {
      setSelectedJobId("");
      setCustomInviteMsg(
        `Hello ${cand.applicant_name}! We reviewed your profile and would love to invite you to apply for our open position.`
      );
    }
  };

  const handleSelectJobIndex = (newIndex: number) => {
    setJobCarouselIndex(newIndex);
    const nextJob = activeJobs[newIndex];
    if (nextJob) {
      setSelectedJobId(nextJob.id);
      if (inviteCandidate) {
        setCustomInviteMsg(
          `Hello ${inviteCandidate.applicant_name}! We reviewed your profile and would love to invite you to apply for our open position: ${nextJob.title}.`
        );
      }
    }
  };

  const [isConfirmRecruitOpen, setIsConfirmRecruitOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleInitiateSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveJobId = selectedJobId || (activeJobs.length > 0 ? activeJobs[jobCarouselIndex]?.id || activeJobs[0]?.id : null);
    if (!currentEmployerId || !inviteCandidate || !effectiveJobId) return;
    setIsConfirmRecruitOpen(true);
  };

  const handleConfirmSendInvite = async () => {
    const effectiveJobId = selectedJobId || (activeJobs.length > 0 ? activeJobs[jobCarouselIndex]?.id || activeJobs[0]?.id : null);
    if (!currentEmployerId || !inviteCandidate || !effectiveJobId) return;

    setIsSendingInvite(true);
    setInviteSuccessMsg("");
    try {
      const res = await fetch(`/api/employers/${currentEmployerId}/invite-candidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_user_id: inviteCandidate.user_id,
          job_post_id: effectiveJobId,
          custom_message: customInviteMsg,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unable to send invitation.");

      setInvitedCandidateIds((prev) => [...prev, inviteCandidate.user_id]);
      setInviteSuccessMsg(`Invitation sent to ${inviteCandidate.applicant_name}!`);
      setIsConfirmRecruitOpen(false);
      setTimeout(() => {
        setInviteCandidate(null);
        setInviteSuccessMsg("");
        setCustomInviteMsg("");
      }, 1600);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to send invitation.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  return (
    <div className="appdash-page employer-page sidebar-visible">
      {/* EMPLOYER SIDEBAR */}
      <aside className="appdash-sidebar" aria-label="Employer Navigation">
        <a href="/" className="appdash-brand">
          <strong>EliteCruit</strong>
          <span>Employer Workspace</span>
        </a>

        <div className="employer-links-wrap">
          <ul className="appdash-secondary-list">
            <li>
              <a href="/employer-dashboard">
                <span className="item-icon"><EmployerIcon name="dashboard" /></span>
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a href="/employer-job-posts">
                <span className="item-icon"><EmployerIcon name="jobposts" /></span>
                <span>Job Posts</span>
              </a>
            </li>
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
                  <li>
                    <a href="/employer-applicant-management#applicant-screening">
                      <span className="item-icon"><EmployerIcon name="screening" /></span>
                      <span>Applicant Screening</span>
                    </a>
                  </li>
                  <li>
                    <a href="/employer-applicant-management#shortlisted-candidates">
                      <span className="item-icon"><EmployerIcon name="shortlisted" /></span>
                      <span>Shortlisted Candidates</span>
                    </a>
                  </li>
                  <li>
                    <a href="/employer-applicant-management#direct-invitations">
                      <span className="item-icon"><EmployerIcon name="discovery" /></span>
                      <span>Recruitment List</span>
                    </a>
                  </li>
                </ul>
              )}
            </li>
            <li className="active">
              <a href="/employer-applicant-finder">
                <span className="item-icon"><EmployerIcon name="nearby" /></span>
                <span>Applicant Finder</span>
              </a>
            </li>
            <li>
              <a href="/employer-notices-faqs">
                <span className="item-icon"><EmployerIcon name="faq" /></span>
                <span>Notices & FAQs</span>
              </a>
            </li>
            <li>
              <a href="/messages">
                <span className="item-icon"><EmployerIcon name="messages" /></span>
                <span>Messages</span>
                {unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}
              </a>
            </li>
            <li>
              <a href="/notifications">
                <span className="item-icon"><EmployerIcon name="notifications" /></span>
                <span>Notifications</span>
                {unreadNotifCount > 0 && <span className="item-badge">{unreadNotifCount}</span>}
              </a>
            </li>
            <li>
              <a href="/feedback">
                <span className="item-icon"><EmployerIcon name="feedback" /></span>
                <span>Feedback</span>
              </a>
            </li>
          </ul>
        </div>

        <div className="appdash-profile-control">
          <button
            type="button"
            className="appdash-profile-anchor"
            onClick={() => setIsProfileMenuOpen((v) => !v)}
          >
            <span className="item-icon"><EmployerIcon name="profile" /></span>
            <span className="profile-user-copy">
              <strong>{companyLabel}</strong>
              <small>Employer</small>
            </span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && (
            <div className="appdash-profile-menu">
              <a href="/employer-company-profile">
                <EmployerIcon name="profile" />Company Profile
              </a>
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

      {/* MAIN CONTENT AREA */}
      <main ref={mainRef} className="appdash-main applicant-mgmt-main applicant-finder-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>Applicant Finder</strong>
            </div>
          </div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Applicant Finder"
                customFaqs={applicantFinderFaqs}
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        {/* FULL-WIDTH FINDER MAIN CONTENT */}
        <div className="finder-main-content">
          {/* MODE SELECTION CARD */}
          <section className="mode-toggle-card">
            <p>Choose how you want to browse applicants.</p>
            <div className="mode-actions">
              <button
                type="button"
                className={searchMode === "manual" ? "mode-active" : ""}
                onClick={() => setSearchMode("manual")}
              >
                <FinderIcon name="search" />
                <span>Standard Search</span>
              </button>
              <button
                type="button"
                className={searchMode === "nearby" ? "mode-active" : ""}
                onClick={() => setSearchMode("nearby")}
              >
                <FinderIcon name="nearby" />
                <span>Nearby Finder</span>
              </button>
            </div>
          </section>

          {/* SEARCH BAR CARD - MATCHES JOB SEARCH ON APPLICANT SIDE */}
          <section className="search-bar-card">
            <div className="search-input-row">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                placeholder="Search candidates by name, job role, skills, or city..."
              />
              <button type="button" className="find-jobs-btn" onClick={applySearch}>
                Search Candidates
              </button>
              <button
                type="button"
                className={`filter-toggle-btn ${isFiltersOpen ? "active" : ""}`}
                onClick={() => setIsFiltersOpen((prev) => !prev)}
              >
                <FinderIcon name="filters" />
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
                    <label>Target Role</label>
                    <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                      <option>All roles</option>
                      {BSIT_BSCS_JOB_TITLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-field">
                    <label>Work Arrangement</label>
                    <select value={selectedArrangement} onChange={(e) => setSelectedArrangement(e.target.value)}>
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
                    <label>Expected Salary</label>
                    <select value={selectedMinSalary} onChange={(e) => setSelectedMinSalary(e.target.value)}>
                      <option>Any salary</option>
                      {SALARY_RANGES.map((sal) => (
                        <option key={sal} value={sal}>{sal}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-field">
                    <label>Sort By</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                      <option value="Best Match">Best Match</option>
                      <option value="Rating">Highest Rating</option>
                      <option value="Newest">Newest Candidates</option>
                    </select>
                  </div>
                </div>

                {/* Province & Cities Card - Placed on top of skills */}
                <div className="filter-location-card-row">
                  <FilterLocationCategoryEditor
                    items={filterLocations}
                    onChange={setFilterLocations}
                  />
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
                    <button type="button" className="reset-filters-btn" onClick={clearAllFilters}>
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* MODE 1: MANUAL SEARCH (Result List)                          */}
          {/* ============================================================ */}
          {searchMode === "manual" && (
            <>

                {/* RESULTS HEADER */}
                <div className="finder-results-header">
                  <h2>
                    Showing {filteredCandidates.length === 0 ? 0 : `${(candidatePage - 1) * CANDIDATES_PER_PAGE + 1} - ${Math.min(candidatePage * CANDIDATES_PER_PAGE, filteredCandidates.length)}`} of {filteredCandidates.length} candidate{filteredCandidates.length === 1 ? "" : "s"}
                  </h2>
                  <span className="finder-sort-hint">Sorted by: Best Match & Profile Completeness</span>
                </div>

                {/* CANDIDATES LIST */}
                {isLoading ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748b", background: "#fff", borderRadius: "8px", border: "1px solid #d7dfeb" }}>
                    Loading candidates from database...
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="finder-empty-card">
                    <h3>No Candidates Found</h3>
                    <p>
                      {candidates.length === 0
                        ? "There are currently no registered applicant profiles in the database."
                        : filterLocations.length > 0
                        ? "There are currently no jobseekers registered or open to work in selected locations. Try selecting another province or city, or reset filters."
                        : "No candidates match your current search and filter criteria. Try resetting filters."}
                    </p>
                    {candidates.length > 0 && (
                      <button
                        type="button"
                        className="finder-btn finder-btn-navy"
                        style={{ marginTop: "14px" }}
                        onClick={clearAllFilters}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  paginatedCandidates.map((cand) => {
                    const allQuals = parseItemList(cand.qualifications, []);
                    const candShsList = allQuals.filter(isShsItem);
                    const candCollegeList = allQuals.filter((q) => !isShsItem(q));
                    const skillsList = parseItemList(cand.skills, []);
                    const certList = parseItemList(cand.certifications, []);
                    const isInvited = invitedCandidateIds.includes(cand.user_id) || Number(cand.invited_count || 0) > 0;
                    const hasApplied = (cand.applied_count ?? 0) > 0;

                    return (
                      <article key={cand.user_id} className="finder-card">
                        <div className="finder-card-main">
                          {/* Left Column: Avatar + Profile Info + Role + Education + Skills + Certifications */}
                          <div className="finder-card-left">
                            <div className="finder-card-header-row">
                              <div className="finder-avatar-box">
                                {cand.profile_picture_path ? (
                                  <img
                                    src={cand.profile_picture_path.startsWith("http") || cand.profile_picture_path.startsWith("/api") ? cand.profile_picture_path : `/api/applicants/${cand.user_id}/profile-picture`}
                                    alt={cand.applicant_name}
                                    style={{ width: "100%", height: "100%", borderRadius: "8px", objectFit: "cover" }}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  initialsFrom(cand.applicant_name)
                                )}
                              </div>
                              <div className="finder-candidate-info">
                                <div className="finder-name-row">
                                  <h3 className="finder-candidate-name">{cand.applicant_name}</h3>
                                  <span className="finder-star-pill">
                                    <span className="star-icon">★</span> {cand.rating ? Number(cand.rating).toFixed(1) : "0.0"}
                                  </span>
                                </div>
                                <div className="finder-candidate-meta-inline">
                                  <span className="finder-meta-inline-item">
                                    <FinderIcon name="location" />
                                    <span>{formatLocationWithCavite(cand.city || cand.address)}</span>
                                  </span>
                                  <span className="finder-meta-inline-item">
                                    <FinderIcon name="briefcase" />
                                    <span>{cand.work_arrangement ? (cand.work_arrangement.toLowerCase() === "on-site" || cand.work_arrangement.toLowerCase() === "onsite" ? "On-Site" : cand.work_arrangement) : "On-Site"}</span>
                                  </span>
                                  {(() => {
                                    const sal = parseCandidateSalaryRange(cand);
                                    if (sal.min === "Negotiable" && sal.max === "Negotiable") return null;
                                    const displaySal = sal.min === sal.max ? sal.min : `${sal.min} - ${sal.max}`;
                                    return (
                                      <span className="finder-meta-inline-item">
                                        <FinderIcon name="money" />
                                        <span>Expected: {displaySal}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Skills Row with single-line overflow and hover tooltip */}
                            {skillsList.length > 0 && (
                              <SingleLinePillsWithOverflow
                                label="SKILLS:"
                                items={skillsList}
                                type="skill"
                              />
                            )}


                            {/* Certifications Row with single-line overflow and hover tooltip */}
                            {certList.length > 0 && (
                              <SingleLinePillsWithOverflow
                                label="CERTIFICATIONS:"
                                items={certList}
                                type="certification"
                              />
                            )}
                          </div>

                          {/* Right Column: Vertical Actions Stack */}
                          <div className="finder-card-right">
                            <div className="finder-actions-stack">
                              <a href="/messages" className="finder-card-btn btn-message">
                                Message
                              </a>

                              <button
                                type="button"
                                className="finder-card-btn btn-details"
                                onClick={() => {
                                  setSelectedCandidate(cand);
                                  setIsDocsDrawerOpen(false);
                                  setIsPreviewingDoc(false);
                                }}
                              >
                                Details
                              </button>

                              <button
                                type="button"
                                className={`finder-card-btn btn-invite ${isInvited ? "invited" : ""}`}
                                onClick={() => openInviteModal(cand)}
                                disabled={isInvited}
                              >
                                {isInvited ? "Recruited" : "Recruit"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}

                  {totalCandidatePages > 1 && (
                    <div
                      className="finder-pagination-bar"
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "12px",
                        marginTop: "20px",
                        marginBottom: "20px",
                      }}
                    >
                      <button
                        type="button"
                        className="finder-btn"
                        disabled={candidatePage === 1}
                        onClick={() => {
                          setCandidatePage((p) => Math.max(1, p - 1));
                          scrollToTop();
                        }}
                        style={{
                          padding: "8px 18px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          background: candidatePage === 1 ? "#f8fafc" : "#ffffff",
                          color: candidatePage === 1 ? "#94a3b8" : "#1e293b",
                          cursor: candidatePage === 1 ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: "0.88rem",
                          boxShadow: candidatePage === 1 ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        &larr; Previous
                      </button>
                      <span style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 600 }}>
                        Page {candidatePage} of {totalCandidatePages}
                      </span>
                      <button
                        type="button"
                        className="finder-btn"
                        disabled={candidatePage === totalCandidatePages}
                        onClick={() => {
                          setCandidatePage((p) => Math.min(totalCandidatePages, p + 1));
                          scrollToTop();
                        }}
                        style={{
                          padding: "8px 18px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          background: candidatePage === totalCandidatePages ? "#f8fafc" : "#ffffff",
                          color: candidatePage === totalCandidatePages ? "#94a3b8" : "#1e293b",
                          cursor: candidatePage === totalCandidatePages ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: "0.88rem",
                          boxShadow: candidatePage === totalCandidatePages ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Next &rarr;
                      </button>
                    </div>
                  )}
                </>
              )}

            {/* ============================================================ */}
            {/* MODE 2: NEARBY FINDER (FULL-HEIGHT RESPONSIVE MAP)           */}
            {/* ============================================================ */}
            {searchMode === "nearby" && (
              <div className="finder-nearby-container">
                <div className="finder-map-toolbar">
                  <div className="finder-map-stats-wrap">
                    <div className="finder-map-stats">
                      {filterLocations.length > 0 && filteredCandidates.length === 0 ? (
                        <span style={{ color: "#e11d48", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                          No applicants available in selected locations
                        </span>
                      ) : (
                        <>
                          <strong>{filteredCandidates.length}</strong> candidate{filteredCandidates.length === 1 ? "" : "s"} found
                        </>
                      )}
                    </div>
                    {activeLandmark && (
                      <span className="geo-source-pill" style={{ background: "#ffe4e6", color: "#e11d48", border: "1px solid #fecdd3", fontSize: "0.72rem", padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <MapPinIcon size={12} color="#e11d48" /> {activeLandmark.name}
                        <button
                          type="button"
                          onClick={handleClearLandmark}
                          style={{ border: "none", background: "none", color: "#e11d48", cursor: "pointer", marginLeft: "4px", padding: 0, fontWeight: "bold" }}
                          title="Clear landmark marker"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                <div className="finder-leaflet-map-wrap" style={{ position: "relative" }}>
                  {filterLocations.length > 0 && filteredCandidates.length === 0 && (
                    <div className="finder-map-no-applicants-banner">
                      <div className="no-applicants-banner-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      </div>
                      <div className="no-applicants-banner-body">
                        <div className="no-applicants-banner-title">
                          No applicants available in this location
                        </div>
                        <div className="no-applicants-banner-desc">
                          There are currently no jobseekers registered or open to work in selected locations.
                        </div>
                      </div>
                      <button
                        type="button"
                        className="no-applicants-banner-btn"
                        onClick={() => setFilterLocations([])}
                      >
                        Reset Location
                      </button>
                    </div>
                  )}
                  {isPinpointMode && (
                    <div className="pinpoint-bottom-bar">
                      <div className="pinpoint-bar-content">
                        <div className="pinpoint-bar-header">
                          <span className="pinpoint-pin-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                          </span>
                          <div className="pinpoint-bar-text">
                            <strong>Click the map to set the location of the company</strong>
                          </div>
                        </div>
                      </div>
                      <div className="pinpoint-bar-actions">
                        <button
                          type="button"
                          className="pinpoint-btn-cancel"
                          onClick={handleCancelPinpointMode}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="pinpoint-btn-save"
                          onClick={handleSaveOfficePin}
                          disabled={isSavingOfficePin}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          {isSavingOfficePin ? "Saving..." : "Save Location"}
                        </button>
                      </div>
                    </div>
                  )}
                  <div id="leaflet-pinpoint-map" />

                </div>
              </div>
            )}
        </div>

        {/* ── Privacy-Compliant Centered Area Applicants Modal (Middle of Page) ── */}
        {selectedAreaGroup && (
          <div
            className={`area-applicants-modal-overlay ${isAreaDrawerClosing ? "closing" : ""}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseAreaDrawer();
              }
            }}
          >
            <div className="area-applicants-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="area-modal-header">
                <div className="area-modal-title-wrap">
                  <div className="area-modal-icon-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3 className="area-modal-title">
                      {selectedAreaGroup.areaName}, {selectedAreaGroup.provinceName}
                    </h3>
                    <span className="area-modal-subtitle">
                      {selectedAreaGroup.candidates.length} {selectedAreaGroup.candidates.length === 1 ? "applicant" : "applicants"} found
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="area-modal-close-btn"
                  onClick={handleCloseAreaDrawer}
                  title="Close area applicant list"
                >
                  ✕
                </button>
              </div>

              <div className="area-modal-list">
                {selectedAreaGroup.candidates.map((cand) => {
                  const isInvited = invitedCandidateIds.includes(cand.user_id) || Number(cand.invited_count || 0) > 0;
                  const skillsList = parseItemList(cand.skills, []);
                  const certList = parseItemList(cand.certifications, []);

                  return (
                    <article key={cand.user_id} className="finder-card">
                      <div className="finder-card-main">
                        {/* Left Column: Avatar + Profile Info + Skills + Certifications */}
                        <div className="finder-card-left">
                          <div className="finder-card-header-row">
                            <div className="finder-avatar-box">
                              {cand.profile_picture_path ? (
                                <img
                                  src={cand.profile_picture_path.startsWith("http") || cand.profile_picture_path.startsWith("/api") ? cand.profile_picture_path : `/api/applicants/${cand.user_id}/profile-picture`}
                                  alt={cand.applicant_name}
                                  style={{ width: "100%", height: "100%", borderRadius: "8px", objectFit: "cover" }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                initialsFrom(cand.applicant_name)
                              )}
                            </div>
                            <div className="finder-candidate-info">
                              <div className="finder-name-row">
                                <h3 className="finder-candidate-name">{cand.applicant_name}</h3>
                                <span className="finder-star-pill">
                                  <span className="star-icon">★</span> {cand.rating ? Number(cand.rating).toFixed(1) : "0.0"}
                                </span>
                              </div>
                              <div className="finder-candidate-meta-inline">
                                <span className="finder-meta-inline-item">
                                  <FinderIcon name="location" />
                                  <span>{formatLocationWithCavite(cand.city || cand.address)}</span>
                                </span>
                                <span className="finder-meta-inline-item">
                                  <FinderIcon name="briefcase" />
                                  <span>{cand.work_arrangement ? (cand.work_arrangement.toLowerCase() === "on-site" || cand.work_arrangement.toLowerCase() === "onsite" ? "On-Site" : cand.work_arrangement) : "On-Site"}</span>
                                </span>
                                {(() => {
                                  const sal = parseCandidateSalaryRange(cand);
                                  if (sal.min === "Negotiable" && sal.max === "Negotiable") return null;
                                  const displaySal = sal.min === sal.max ? sal.min : `${sal.min} - ${sal.max}`;
                                  return (
                                    <span className="finder-meta-inline-item">
                                      <FinderIcon name="money" />
                                      <span>Expected: {displaySal}</span>
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Skills Row with single-line overflow and hover tooltip */}
                          {skillsList.length > 0 && (
                            <SingleLinePillsWithOverflow
                              label="SKILLS:"
                              items={skillsList}
                              type="skill"
                            />
                          )}

                          {/* Certifications Row with single-line overflow and hover tooltip */}
                          {certList.length > 0 && (
                            <SingleLinePillsWithOverflow
                              label="CERTIFICATIONS:"
                              items={certList}
                              type="certification"
                            />
                          )}
                        </div>

                        {/* Right Column: Vertical Actions Stack */}
                        <div className="finder-card-right">
                          <div className="finder-actions-stack">
                            <a href="/messages" className="finder-card-btn btn-message">
                              Message
                            </a>

                            <button
                              type="button"
                              className="finder-card-btn btn-details"
                              onClick={() => {
                                setSelectedCandidate(cand);
                                setIsDocsDrawerOpen(false);
                                setIsPreviewingDoc(false);
                              }}
                            >
                              Details
                            </button>

                            <button
                              type="button"
                              className={`finder-card-btn btn-invite ${isInvited ? "invited" : ""}`}
                              onClick={() => openInviteModal(cand)}
                              disabled={isInvited}
                            >
                              {isInvited ? "Recruited" : "Recruit"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CANDIDATE DETAILS & SAVED DOCS MODAL */}
        {selectedCandidate && (
          <div
            className="cand-details-overlay"
            onClick={() => {
              setSelectedCandidate(null);
              setIsDocsDrawerOpen(false);
              setIsPreviewingDoc(false);
              setCandidateDocuments([]);
              setPreviewDoc(null);
            }}
          >
            <div className="cand-details-panel" onClick={(e) => e.stopPropagation()}>
              <div className="cand-details-strip" style={{ paddingTop: "20px" }}>
                <div className="cand-details-logo-info">
                  <div className="cand-details-logo" aria-label="Candidate initials">
                    {selectedCandidate.profile_picture_path ? (
                      <img
                        src={selectedCandidate.profile_picture_path.startsWith("http") || selectedCandidate.profile_picture_path.startsWith("/api") ? selectedCandidate.profile_picture_path : `/api/applicants/${selectedCandidate.user_id}/profile-picture`}
                        alt={selectedCandidate.applicant_name}
                        style={{ width: "100%", height: "100%", borderRadius: "12px", objectFit: "cover" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "1.05rem" }}>
                        {initialsFrom(selectedCandidate.applicant_name)}
                      </span>
                    )}
                  </div>
                  <div>
                    <strong className="cand-details-name">{selectedCandidate.applicant_name}</strong>
                    <span className="cand-details-location" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "3px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        {formatLocationWithCavite(selectedCandidate.city || selectedCandidate.address)}
                      </span>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        {selectedCandidate.email}
                      </span>
                      {selectedCandidate.phone && (
                        <>
                          <span style={{ color: "#cbd5e1" }}>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            {selectedCandidate.phone}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div className="cand-details-header-right">
                  <div className="rating-score-box" title="Applicant rating">
                    <span className="star-icon">★</span>
                    <span>{selectedCandidate?.rating ? Number(selectedCandidate.rating).toFixed(1) : "0.0"}</span>
                  </div>
                  <button
                    type="button"
                    className={`cand-details-docs-btn ${isDocsDrawerOpen ? "active" : ""}`}
                    onClick={() => {
                      setIsDocsDrawerOpen((prev) => {
                        const next = !prev;
                        if (next && selectedCandidate?.user_id) {
                          fetchCandidateDocuments(selectedCandidate.user_id);
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

              <div className="cand-details-body-wrapper">
                <div className="cand-details-body">
                  {/* TAB 1: PERSONAL & CONTACT */}
                  {candDetailTab === "personal" && (
                    <div className="cand-tab-content">
                      <div className="cand-details-card">
                        <div className="cand-card-header">
                          <h4>Professional Summary</h4>
                        </div>
                        <p className="cand-summary-text">
                          {selectedCandidate.summary || "No professional summary provided by the applicant."}
                        </p>
                      </div>

                      <div className="cand-details-card">
                        <div className="cand-card-header">
                          <h4>Languages Spoken</h4>
                        </div>
                        <div className="cand-details-tags-wrap">
                          {parseItemList(selectedCandidate.languages, []).length > 0 ? (
                            parseItemList(selectedCandidate.languages, []).map((lang, idx) => (
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
                            <span className="cand-info-val highlight">{selectedCandidate.desired_job_title || "Not specified"}</span>
                          </div>
                          {(() => {
                            const sal = parseCandidateSalaryRange(selectedCandidate);
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
                              {selectedCandidate.work_arrangement || "On-site"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="cand-details-card">
                        <div className="cand-card-header">
                          <h4>Geographic & Discovery Location</h4>
                        </div>
                        <div className="cand-info-row">
                          <div className="cand-info-item">
                            <span className="cand-info-label">Designated Nearby Location</span>
                            <span className="cand-info-val highlight">
                              {selectedCandidate.nearby_location || selectedCandidate.city || "Not designated"}
                            </span>
                          </div>
                          <div className="cand-info-item">
                            <span className="cand-info-label">Home Address / Municipality</span>
                            <span className="cand-info-val">
                              {selectedCandidate.address || selectedCandidate.city || "Not specified"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="cand-details-card">
                        <div className="cand-card-header">
                          <h4>Preferred Work Locations</h4>
                        </div>
                        <div className="cand-details-tags-wrap">
                          {parsePreferredLocationTags(selectedCandidate.preferred_locations).length > 0 ? (
                            parsePreferredLocationTags(selectedCandidate.preferred_locations).map((loc, idx) => (
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
                        const allQuals = parseItemList(selectedCandidate.qualifications, []);
                        const shsList = allQuals.filter(isShsItem);
                        const collegeList = allQuals.filter((q) => !isShsItem(q));
                        const skillsList = parseItemList(selectedCandidate.skills, []);
                        const certList = parseItemList(selectedCandidate.certifications, []);

                        return (
                          <>
                            {/* 1. Senior High School & Vocational Education */}
                            <div className="cand-details-card">
                              <div className="cand-card-header">
                                <h4>Senior High School & Vocational</h4>
                              </div>
                              <div className="cand-details-tags-wrap">
                                {shsList.length > 0 ? (
                                  shsList.map((q, idx) => (
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
                                  collegeList.map((q, idx) => (
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
                                  skillsList.map((s, idx) => (
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
                                  certList.map((c, idx) => (
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
                      {selectedCandidate.years_of_experience && (
                        <div className="cand-exp-banner">
                          <strong>Total Professional Experience:</strong> {selectedCandidate.years_of_experience}
                        </div>
                      )}

                      {(() => {
                        let parsedWorkExp: WorkExpItem[] = [];
                        if (selectedCandidate.work_experience_json) {
                          try {
                            const parsed = JSON.parse(selectedCandidate.work_experience_json);
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
                            {parsedWorkExp.map((exp, idx) => (
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
                                    {exp.responsibilities.split("\n").filter(Boolean).map((bullet, bIdx) => (
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
                                      {exp.skills.map((sk, sIdx) => (
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
                <div className={`cand-details-docs-drawer ${isDocsDrawerOpen ? "open" : ""}`}>
                  <div className="cand-details-docs-header">
                    <h3>{isPreviewingDoc ? "Document Preview" : "Saved Documents"}</h3>
                    <button
                      type="button"
                      className="cand-details-docs-back"
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
                  <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {!isPreviewingDoc ? (
                      <>
                        {isDocsLoading ? (
                          <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                            Loading documents...
                          </div>
                        ) : candidateDocuments.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", paddingRight: "4px" }}>
                            {candidateDocuments.map((doc) => {
                              const iconType = getDocIconType(doc.file_name);
                              const iconStyle = getDocIconStyle(iconType);
                              const formattedSize = formatDocBytes(doc.file_size);
                              const uploadDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : null;
                              const subtext = [formattedSize, uploadDate ? `Uploaded ${uploadDate}` : "Attached file"].filter(Boolean).join(" • ") || "Attached file";

                              return (
                                <div
                                  key={`${doc.id}-${doc.file_name}`}
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
                                      <small style={{ color: "#64748b", fontSize: "0.78rem" }}>{subtext}</small>
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
                              href={`${previewDoc?.url || `/api/applicants/${selectedCandidate.user_id}/resume`}?download=1`}
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
                              src={previewDoc?.url || `/api/applicants/${selectedCandidate.user_id}/resume`}
                              style={{ width: "100%", height: "100%", border: "none" }}
                              title={`${selectedCandidate.applicant_name} Document`}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="cand-details-footer" style={{ justifyContent: "flex-end" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    className="cand-details-cancel-btn"
                    onClick={() => {
                      setSelectedCandidate(null);
                      setIsDocsDrawerOpen(false);
                      setIsPreviewingDoc(false);
                      setCandidateDocuments([]);
                      setPreviewDoc(null);
                    }}
                  >
                    Close
                  </button>
                  <a href="/messages" className="finder-btn finder-btn-outline">
                    Message
                  </a>
                  {(() => {
                    const isInvited = invitedCandidateIds.includes(selectedCandidate.user_id);
                    return (
                      <button
                        type="button"
                        className={`finder-btn finder-btn-green ${isInvited ? "invited" : ""}`}
                        disabled={isInvited}
                        onClick={() => {
                          setInviteCandidate(selectedCandidate);
                          setCustomInviteMsg(
                            `Hello ${selectedCandidate.applicant_name}! We reviewed your profile and would love to invite you to apply for our open position.`
                          );
                        }}
                      >
                        {isInvited ? "Recruited" : "Recruit"}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVITE / RECRUIT CONFIRMATION MODAL */}
        {inviteCandidate && (
          <div className="cand-details-overlay" onClick={() => setInviteCandidate(null)}>
            <div className="cand-details-panel cand-invite-panel" style={{ maxWidth: "560px", width: "94%", boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
              <div className="cand-details-docs-header">
                <h3>Invite Candidate to Apply</h3>
                <button type="button" className="cand-details-docs-back" onClick={() => setInviteCandidate(null)}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleInitiateSendInvite} style={{ padding: "20px", display: "grid", gap: "14px", minWidth: 0, width: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px" }}>
                  {(() => {
                    const pic = inviteCandidate.profile_picture_path;
                    const picUrl = pic
                      ? (pic.startsWith("http") || pic.startsWith("/api") ? pic : `/api/applicants/${inviteCandidate.user_id}/profile-picture`)
                      : null;
                    const initials = initialsFrom(inviteCandidate.applicant_name);
                    return (
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#01294a", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0, overflow: "hidden", position: "relative" }}>
                        {picUrl && (
                          <img
                            src={picUrl}
                            alt={inviteCandidate.applicant_name}
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
                          {initials}
                        </span>
                      </div>
                    );
                  })()}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ fontSize: "0.92rem", color: "#0f172a", display: "block" }}>{inviteCandidate.applicant_name}</strong>
                    <small style={{ display: "block", color: "#64748b", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {inviteCandidate.email || "No email"} {inviteCandidate.phone ? `· ${inviteCandidate.phone}` : ""}
                    </small>
                  </div>
                </div>

                {/* JOB OPENING SELECTION (WITH LEFT/RIGHT ARROWS, MATCH %, DETAILS BUTTON) */}
                <div style={{ display: "grid", gap: "6px", minWidth: 0, width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                      Select Job Opening:
                    </span>
                    {activeJobs.length > 1 && (
                      <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                        {jobCarouselIndex + 1} of {activeJobs.length}
                      </span>
                    )}
                  </div>

                  {activeJobs.length === 0 ? (
                    (() => {
                      const generalJob = {
                        id: 101,
                        title: "Software Developer (General Opening)",
                        work_arrangement: "On-Site",
                        city: "Cavite",
                        location: "Cavite",
                        description: "General opening for proactive software developers with solid background in software engineering.",
                        required_skills: "React, JavaScript, Node.js",
                        required_qualifications: "BS Information Technology or Computer Science"
                      };
                      const generalMatch = calculateCandidateMatch(inviteCandidate, generalJob);

                      return (
                        <div className="job-select-card selected">
                          <div className="job-select-card-left">
                            <h4 className="job-select-title" title={generalJob.title}>{generalJob.title}</h4>
                            <span className="job-select-apps">Applications: 0</span>
                          </div>
                          <div className="job-select-card-right">
                            <div className={`job-select-match-box ${getMatchColorClass(generalMatch)}`}>
                              <span className="match-label">MATCH</span>
                              <span className="match-value">{generalMatch}%</span>
                            </div>
                            <button
                              type="button"
                              className="job-details-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingJobDetails(generalJob);
                                setIsMatchDrawerOpen(false);
                              }}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              className="job-details-btn job-breakdown-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingJobDetails(generalJob);
                                setIsMatchDrawerOpen(true);
                              }}
                            >
                              Breakdown
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    (() => {
                      const currentJob = activeJobs[jobCarouselIndex] || activeJobs[0];
                      const matchPct = calculateCandidateMatch(inviteCandidate, currentJob);
                      const appsCount = currentJob.applicants_count !== undefined && currentJob.applicants_count !== null ? Number(currentJob.applicants_count) : 0;

                      return (
                        <div className="job-carousel-container">
                          {/* Left Arrow Button */}
                          {activeJobs.length > 1 && (
                            <button
                              type="button"
                              className="job-carousel-arrow-btn left"
                              onClick={() => {
                                const prevIdx = (jobCarouselIndex - 1 + activeJobs.length) % activeJobs.length;
                                handleSelectJobIndex(prevIdx);
                              }}
                              title="Previous Job Opening"
                            >
                              ‹
                            </button>
                          )}

                          {/* Selected Job Card */}
                          <div
                            className="job-select-card selected"
                            onClick={() => handleSelectJobIndex(jobCarouselIndex)}
                          >
                            <div className="job-select-card-left">
                              <h4 className="job-select-title" title={currentJob.title}>{currentJob.title}</h4>
                              <span className="job-select-apps">Applications: {appsCount}</span>
                            </div>

                            <div className="job-select-card-right">
                              <div className={`job-select-match-box ${getMatchColorClass(matchPct)}`}>
                                <span className="match-label">MATCH</span>
                                <span className="match-value">{matchPct}%</span>
                              </div>

                              <button
                                type="button"
                                className="job-details-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingJobDetails(currentJob);
                                  setIsMatchDrawerOpen(false);
                                }}
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                className="job-details-btn job-breakdown-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingJobDetails(currentJob);
                                  setIsMatchDrawerOpen(true);
                                }}
                              >
                                Breakdown
                              </button>
                            </div>
                          </div>

                          {/* Right Arrow Button */}
                          {activeJobs.length > 1 && (
                            <button
                              type="button"
                              className="job-carousel-arrow-btn right"
                              onClick={() => {
                                const nextIdx = (jobCarouselIndex + 1) % activeJobs.length;
                                handleSelectJobIndex(nextIdx);
                              }}
                              title="Next Job Opening"
                            >
                              ›
                            </button>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>

                <label style={{ display: "grid", gap: "4px", fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                  Invitation Message:
                  <textarea
                    value={customInviteMsg}
                    onChange={(e) => setCustomInviteMsg(e.target.value)}
                    rows={3}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </label>

                {inviteSuccessMsg && (
                  <div style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", padding: "10px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600 }}>
                    ✓ {inviteSuccessMsg}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button type="button" className="modal-action-btn btn-cancel" onClick={() => setInviteCandidate(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-action-btn btn-submit" disabled={isSendingInvite}>
                    {isSendingInvite ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 3rd & 4th Floating Containers: Job Details (LEFT) & Match Breakdown (RIGHT) Side-by-Side Overlay ── */}
        {(viewingJobDetails || isJobDetailsClosing) && viewingJobDetails && (
          (() => {
            const targetCandidate = inviteCandidate || selectedCandidate;
            const detailsMatchPct = targetCandidate ? calculateCandidateMatch(targetCandidate, viewingJobDetails) : 0;
            const matchStyle = detailsMatchPct >= 85
              ? { track: "#dcfce7", color: "#15803d", fill: "#86efac" }
              : detailsMatchPct >= 70
              ? { track: "#fef3c7", color: "#b45309", fill: "#fde68a" }
              : { track: "#fee2e2", color: "#b91c1c", fill: "#fca5a5" };

            const jobSalaryMin = Number(viewingJobDetails.salary_min ?? viewingJobDetails.min_salary) || 0;
            const jobSalaryMax = Number(viewingJobDetails.salary_max ?? viewingJobDetails.max_salary) || 0;
            const jobLocation = formatLocationWithCavite(viewingJobDetails.location || viewingJobDetails.city || "Cavite");

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
                onClick={handleCloseJobDetails}
              >
                {/* ── 3rd Container: Job Details Card (POSITIONED ON THE LEFT) ── */}
                <div
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
                  <div
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
                        style={{
                          background: matchStyle.track,
                          color: matchStyle.color,
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          border: `1px solid ${matchStyle.fill}`,
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
                          setIsMatchDrawerOpen((prev) => !prev);
                        }}
                      >
                        Match Breakdown
                      </button>
                      <button
                        type="button"
                        className="jd-side-close-btn"
                        aria-label="Close job details"
                        onClick={handleCloseJobDetails}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", flex: 1, fontFamily: '"Manrope", sans-serif' }}>
                    <div>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: '"Manrope", sans-serif' }}>
                        {viewingJobDetails.title}
                      </h4>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "4px 10px", borderRadius: "999px", fontSize: "0.76rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                          {viewingJobDetails.status ? viewingJobDetails.status.toUpperCase() : "OPEN"}
                        </span>
                        {(viewingJobDetails.is_urgent === 1 || viewingJobDetails.is_urgent === true || String(viewingJobDetails.is_urgent) === "1") && (
                          <span style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", padding: "4px 10px", borderRadius: "999px", fontSize: "0.76rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                            Urgent
                          </span>
                        )}
                        <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                          {viewingJobDetails.work_arrangement || "On-Site"}
                        </span>
                        {(jobSalaryMin || jobSalaryMax) ? (
                          <span style={{ background: "#fef3c7", color: "#b45309", padding: "4px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, fontFamily: '"Manrope", sans-serif' }}>
                            PHP {Number(jobSalaryMin).toLocaleString()} - {Number(jobSalaryMax).toLocaleString()}
                          </span>
                        ) : null}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "#64748b", fontFamily: '"Manrope", sans-serif' }}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          {jobLocation}
                        </span>
                      </div>
                    </div>

                    {/* JOB DESCRIPTION */}
                    <div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                        JOB DESCRIPTION
                      </span>
                      <p style={{ margin: 0, fontSize: "0.86rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-line", fontFamily: '"Manrope", sans-serif' }}>
                        {viewingJobDetails.description || "No job description provided."}
                      </p>
                    </div>

                    {/* REQUIRED SKILLS */}
                    <div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: '"Manrope", sans-serif' }}>
                        REQUIRED SKILLS
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {parseCompetencyDisplayTags(viewingJobDetails.required_skills || (viewingJobDetails as any).skills || "").length > 0 ? (
                          parseCompetencyDisplayTags(viewingJobDetails.required_skills || (viewingJobDetails as any).skills || "").map((sk, idx) => (
                            <span key={idx} style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
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
                        {parseCompetencyDisplayTags(viewingJobDetails.qualifications || (viewingJobDetails as any).required_qualifications || "").length > 0 ? (
                          parseCompetencyDisplayTags(viewingJobDetails.qualifications || (viewingJobDetails as any).required_qualifications || "").map((qu, idx) => (
                            <span key={idx} style={{ background: "#faf5ff", color: "#7e22ce", border: "1px solid #e9d5ff", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
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
                        {parseCompetencyDisplayTags((viewingJobDetails as any).certifications || (viewingJobDetails as any).required_certifications || "").length > 0 ? (
                          parseCompetencyDisplayTags((viewingJobDetails as any).certifications || (viewingJobDetails as any).required_certifications || "").map((cert, idx) => (
                            <span key={idx} style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600, fontFamily: '"Manrope", sans-serif' }}>
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
                  <div
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
                      {viewingJobDetails.close_date && (
                        <span style={{ fontSize: "0.8rem", color: "#64748b", fontFamily: '"Manrope", sans-serif', display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <strong style={{ color: "#0f172a" }}>Close Date:</strong> {viewingJobDetails.close_date}
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
                        if (targetCandidate) {
                          openInviteModal(targetCandidate, viewingJobDetails.id);
                        }
                        setInviteSuccessMsg("");
                        handleCloseJobDetails();
                      }}
                    >
                      Recruit
                    </button>
                  </div>
                </div>

                {/* ── 4th Container: Job Match Breakdown (POSITIONED ON THE RIGHT OF 3rd CONTAINER) ── */}
                {isMatchDrawerOpen && targetCandidate && (
                  (() => {
                    const candSkills = parseCompetencyDisplayTags(targetCandidate.skills || "");
                    const candQuals = parseCompetencyDisplayTags(targetCandidate.qualifications || "");
                    const candCerts = parseCompetencyDisplayTags(targetCandidate.certifications || "");
                    const candCity = formatLocationWithCavite(targetCandidate.city || targetCandidate.address || "Cavite");
                    const candSetup = targetCandidate.work_arrangement || "On-Site";
                    const candSalary = targetCandidate.expected_salary || "";
                    const candSalaryDisplay = (() => {
                      if (targetCandidate.expected_salary_min || targetCandidate.expected_salary_max) {
                        const minVal = Number(targetCandidate.expected_salary_min) || 0;
                        const maxVal = Number(targetCandidate.expected_salary_max) || 0;
                        return `PHP ${minVal.toLocaleString()} - ${maxVal.toLocaleString()}`;
                      }
                      if (!candSalary) return "Not set";
                      return String(candSalary).toUpperCase().includes("PHP") ? String(candSalary) : `PHP ${Number(parseExpectedSalary(candSalary)).toLocaleString()}`;
                    })();

                    const jobSkills = parseCompetencyDisplayTags(viewingJobDetails.required_skills || (viewingJobDetails as any).skills || "");
                    const jobQuals = parseCompetencyDisplayTags(viewingJobDetails.qualifications || (viewingJobDetails as any).required_qualifications || "");
                    const jobCerts = parseCompetencyDisplayTags((viewingJobDetails as any).certifications || (viewingJobDetails as any).required_certifications || "");
                    const jobSalaryDisplay = (jobSalaryMin || jobSalaryMax) ? `PHP ${jobSalaryMin.toLocaleString()} - ${jobSalaryMax.toLocaleString()}` : "Market Rate";

                    const matchDetails = calculateJobMatchDetails(
                      {
                        id: viewingJobDetails.id,
                        title: viewingJobDetails.title,
                        location: jobLocation,
                        salaryMin: jobSalaryMin,
                        setup: viewingJobDetails.work_arrangement || "On-Site",
                        skillTags: jobSkills,
                        qualTags: jobQuals,
                        certTags: jobCerts,
                      },
                      {
                        desiredJobTitle: targetCandidate.desired_job_title || "",
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
                      <div
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
                        <div
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
                              Side-by-side comparison: {targetCandidate.applicant_name} vs {viewingJobDetails.title}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span className={`match-badge-pill ${bdStyle}`} style={{ fontFamily: '"Manrope", sans-serif' }}>
                              {matchDetails.score}% Match
                            </span>
                            <button
                              type="button"
                              className="jd-side-close-btn"
                              onClick={() => setIsMatchDrawerOpen(false)}
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
                                        {targetCandidate.years_of_experience
                                          ? `${targetCandidate.years_of_experience} yrs experience`
                                          : "Fresh Graduate / Entry-level"}
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {/* 4. Salary Range */}
                                <div className="jd-master-row">
                                  <span className="jd-row-label">Salary Range</span>
                                  <div className="jd-col-tags-container">
                                    <span className="jd-comp-tag app-neutral">
                                      <span className="tag-text">{candSalaryDisplay}</span>
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
                                          <span className="tag-text">{viewingJobDetails.work_arrangement || "On-Site"}</span>
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
                                      const candExpNum = parseFloat(String(targetCandidate.years_of_experience || "0")) || 0;
                                      const jobExp = (viewingJobDetails.experience_level || "").toLowerCase();
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
                                            {formatExperienceLevel(viewingJobDetails.experience_level || "") || viewingJobDetails.experience_level || "Any Experience"}
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

        {/* DOUBLE VERIFICATION: RECRUIT CANDIDATE CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={isConfirmRecruitOpen && !!inviteCandidate}
          type="info"
          title="Confirm Recruitment Invitation"
          message={
            <div>
              <p style={{ margin: "0 0 8px" }}>
                Are you sure you want to recruit <strong>{inviteCandidate?.applicant_name}</strong> for{" "}
                <strong>
                  {activeJobs.find((j) => j.id === (selectedJobId || (activeJobs[jobCarouselIndex]?.id || activeJobs[0]?.id)))?.title || "the selected position"}
                </strong>
                ?
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                This will officially dispatch a direct job invitation and start candidate screening in your messages.
              </p>
            </div>
          }
          cancelLabel="Review Details"
          confirmLabel="Confirm & Send Invitation"
          isConfirming={isSendingInvite}
          onCancel={() => setIsConfirmRecruitOpen(false)}
          onConfirm={handleConfirmSendInvite}
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
      </main>
    </div>
  );
}

