import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import {
  BSIT_BSCS_JOB_TITLES,
  BSIT_BSCS_SKILLS,
  BSIT_BSCS_QUALIFICATIONS,
  BSIT_BSCS_CERTIFICATIONS,
  CAVITE_CITIES,
  WORK_ARRANGEMENTS,
  EXPERIENCE_LEVELS,
  EXP_YEARS_OPTIONS,
  formatLocationWithCavite,
} from "../../utils/filters";
import "./Applicant-Dashboard.css";
import "./ApplicantProfile.css";

type ApplicantProfileData = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  desired_job_title: string | null;
  expected_salary: string | null;
  work_arrangement: string | null;
  years_of_experience: string | null;
  skills: string | null;
  certifications: string | null;
  qualifications: string | null;
  resume_path: string | null;
  profile_picture_path: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

const emptyProfile: ApplicantProfileData = {
  first_name: null,
  middle_name: null,
  last_name: null,
  email: null,
  phone: null,
  city: null,
  address: null,
  desired_job_title: null,
  expected_salary: null,
  work_arrangement: null,
  years_of_experience: null,
  skills: null,
  certifications: null,
  qualifications: null,
  resume_path: null,
  profile_picture_path: null,
  latitude: null,
  longitude: null,
};

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

function fileNameFromPath(raw: string | null | undefined) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}

function formatCurrencyInput(value: string | null) {
  const raw = (value ?? "").replace(/,/g, "").trim();
  if (!raw) return "";
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return "";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseSalaryInteger(value: string | null | undefined): string {
  if (!value) return "";
  const raw = String(value).replace(/,/g, "").trim();
  const amount = Number(raw);
  if (Number.isFinite(amount) && amount >= 0) {
    return String(Math.round(amount));
  }
  return raw.replace(/\D/g, "");
}

function Field({
  label,
  value,
  name,
  editing,
  onChange,
  prefix,
  numbersOnly = false,
  wide = false,
  currencyFormat = false,
}: {
  label: string;
  value: string | null;
  name: keyof ApplicantProfileData;
  editing: boolean;
  onChange: (name: keyof ApplicantProfileData, value: string) => void;
  prefix?: string;
  numbersOnly?: boolean;
  wide?: boolean;
  currencyFormat?: boolean;
}) {
  const isMissing = !value?.trim();
  const salaryInteger = parseSalaryInteger(value);
  const inputValue = currencyFormat
    ? editing
      ? salaryInteger
      : formatCurrencyInput(value)
    : numbersOnly
      ? (value ?? "").replace(/\D/g, "")
      : value ?? "";

  return (
    <label className={`${wide ? "profile-field wide" : "profile-field"} ${isMissing ? "missing-field" : ""}`}>
      <span>{label}</span>
      <div className={prefix ? "input-prefix-wrap" : ""}>
        {prefix && <b>{prefix}</b>}
        <input
          value={inputValue}
          readOnly={!editing}
          inputMode={numbersOnly || currencyFormat ? "numeric" : undefined}
          onChange={(event) => {
            if (currencyFormat) {
              const val = event.target.value.replace(/,/g, "").trim();
              const numOnly = val.replace(/[^0-9.]/g, "");
              onChange(name, numOnly);
              return;
            }
            onChange(name, numbersOnly ? event.target.value.replace(/\D/g, "") : event.target.value);
          }}
          placeholder="Not provided"
        />
      </div>
    </label>
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

function MaxFiveExperienceEditor({
  title,
  subtitle,
  options,
  rawString,
  onSave,
  disabled,
}: {
  title: string;
  subtitle?: string;
  options: string[];
  rawString: string | null;
  onSave: (items: string[]) => Promise<boolean>;
  disabled: boolean;
}) {
  const items = useMemo(() => parseItemsWithExp(rawString), [rawString]);
  const [inputValue, setInputValue] = useState("");
  const [selectedYears, setSelectedYears] = useState("1 year");

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

    const newItems: ItemWithExp[] = [...items, { name: nameToAdd, years: selectedYears || "1 year" }];
    const formatted = newItems.map((it) => `${it.name} (${it.years})`);
    const ok = await onSave(formatted);
    if (ok) {
      setInputValue("");
      setSelectedYears("1 year");
    }
  };

  const handleRemoveItem = async (indexToRemove: number) => {
    const newItems = items.filter((_, idx) => idx !== indexToRemove);
    const formatted = newItems.map((it) => `${it.name} (${it.years})`);
    await onSave(formatted);
  };

  const handleUpdateYears = async (indexToUpdate: number, newYears: string) => {
    const newItems = items.map((it, idx) => (idx === indexToUpdate ? { ...it, years: newYears } : it));
    const formatted = newItems.map((it) => `${it.name} (${it.years})`);
    await onSave(formatted);
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
          items.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="exp-item-chip">
              <span className="exp-item-name">{item.name}</span>
              <div className="exp-badge-group">
                <span className="exp-label-text">Experience:</span>
                <select
                  className="exp-years-select"
                  value={item.years}
                  disabled={disabled}
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
                disabled={disabled}
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
            options={availableOptions}
            value={inputValue}
            placeholder={`Type or select ${title.toLowerCase()}...`}
            disabled={disabled}
            onChange={setInputValue}
            onEnterAdd={handleAddItem}
          />

          <div className="add-years-group">
            <span>Experience:</span>
            <select
              className="add-years-select"
              value={selectedYears}
              disabled={disabled}
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

export default function ApplicantProfile() {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"personal" | "preferences" | "competencies">("personal");
  const [profile, setProfile] = useState<ApplicantProfileData>(emptyProfile);
  const [draft, setDraft] = useState<ApplicantProfileData>(emptyProfile);
  const [profileMessage, setProfileMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
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

    const startLat = profile.latitude ? Number(profile.latitude) : 14.2807;
    const startLng = profile.longitude ? Number(profile.longitude) : 120.8693;
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
  }, [isMapModalOpen, profile.latitude, profile.longitude]);

  const handleSaveLocation = async () => {
    if (!userId) return;
    setIsSavingLocation(true);
    try {
      const res = await fetch(`/api/applicants/${userId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: tempCoords.lat,
          longitude: tempCoords.lng,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          setProfile(data.profile);
          setDraft(data.profile);
        } else {
          setProfile((prev) => ({ ...prev, latitude: tempCoords.lat, longitude: tempCoords.lng }));
          setDraft((prev) => ({ ...prev, latitude: tempCoords.lat, longitude: tempCoords.lng }));
        }
        setIsMapModalOpen(false);
        setProfileMessage("Location pinpointed successfully.");
      } else {
        alert("Unable to save location.");
      }
    } catch {
      alert("Failed to save location.");
    } finally {
      setIsSavingLocation(false);
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
      const loaded = { ...emptyProfile, ...data.profile };
      setProfile(loaded);
      setDraft(loaded);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to load profile data.");
    }
  };

  const visibleProfile = isEditing ? draft : profile;

  const updateDraft = (name: keyof ApplicantProfileData, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const saveProfile = async () => {
    if (!userId) return;
    setIsSaving(true);
    setProfileMessage("");
    try {
      const response = await fetch(`/api/applicants/${userId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save profile.");
      const savedProfile = { ...emptyProfile, ...data.profile };
      setProfile(savedProfile);
      setDraft(savedProfile);
      setIsEditing(false);
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveTagList = async (field: "skills" | "certifications" | "qualifications", items: string[]) => {
    if (!userId || isSavingTags) return false;
    setIsSavingTags(true);
    setProfileMessage("");
    try {
      const response = await fetch(`/api/applicants/${userId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, items }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save profile items.");
      const value = data.items.join(", ") || null;
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

  const handleDeleteResume = async () => {
    if (!userId) return;
    if (!window.confirm("Are you sure you want to delete your resume from the system?")) return;

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
    <div className="profile-shell appdash-page sidebar-visible">
      {/* APPLICANT SIDEBAR - Standardized 274px */}
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

          <li><a href="/job-search"><span className="item-icon"><SideIcon name="search" /></span><span>Job Search</span></a></li>
          <li><a href="/messages"><span className="item-icon"><SideIcon name="messages" /></span><span>Messages</span></a></li>
          <li><a href="/notifications"><span className="item-icon"><SideIcon name="notifications" /></span><span>Notifications</span></a></li>
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
              <a href="/"><SideIcon name="logout" />Logout</a>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN PROFILE SURFACE */}
      <main className="profile-page">
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>My Profile</strong>
            </div>
          </div>
          <div className="appdash-top-right">
            <ApplicantChatbotDrawer
              isOpen={isChatbotOpen}
              onToggle={() => setIsChatbotOpen((prev) => !prev)}
              pageTitle="My Profile"
            />
          </div>
        </header>

        <div className="profile-content">
          {profileMessage && <p className="profile-message">{profileMessage}</p>}

          {/* STICKY 3-SECTION NAVIGATION TABS */}
          <nav className="profile-section-nav" aria-label="Profile Sections">
            <button
              type="button"
              className={`section-nav-btn ${activeSection === "personal" ? "active" : ""}`}
              onClick={() => setActiveSection("personal")}
            >
              <span className="nav-num">1</span>
              <span>Personal & Contact</span>
            </button>
            <button
              type="button"
              className={`section-nav-btn ${activeSection === "preferences" ? "active" : ""}`}
              onClick={() => setActiveSection("preferences")}
            >
              <span className="nav-num">2</span>
              <span>Career Preferences</span>
            </button>
            <button
              type="button"
              className={`section-nav-btn ${activeSection === "competencies" ? "active" : ""}`}
              onClick={() => setActiveSection("competencies")}
            >
              <span className="nav-num">3</span>
              <span>Skills & Credentials</span>
            </button>
          </nav>

          {/* =================================================================
              SECTION 1: PERSONAL & CONTACT INFORMATION
              ================================================================= */}
          {activeSection === "personal" && (
            <section className="profile-section-block">
              <article className="profile-card personal-card">
                <div className="person-heading">
                  <span className="person-avatar">{initials}</span>
                  <div>
                    <strong>{fullName}</strong>
                    <small>Applicant profile - {profile.city ? formatLocationWithCavite(profile.city) : "Location not provided"}</small>
                  </div>
                  <button type="button" className="edit-profile-button" onClick={() => (isEditing ? saveProfile() : setIsEditing(true))} disabled={isSaving}>
                    {isEditing ? (isSaving ? "Saving..." : "Save Profile") : "Edit Profile"}
                  </button>
                  {isEditing && (
                    <button type="button" className="cancel-profile-button" onClick={() => { setDraft(profile); setIsEditing(false); }}>
                      Cancel
                    </button>
                  )}
                </div>

                <div className="profile-divider" />

                <div className="fields-grid">
                  <Field label="First Name" name="first_name" value={visibleProfile.first_name} editing={isEditing} onChange={updateDraft} />
                  <Field label="Middle Name" name="middle_name" value={visibleProfile.middle_name} editing={isEditing} onChange={updateDraft} />
                  <Field label="Last Name" name="last_name" value={visibleProfile.last_name} editing={isEditing} onChange={updateDraft} />
                  <Field label="Email Address" name="email" value={visibleProfile.email} editing={isEditing} onChange={updateDraft} />
                  <Field label="Phone Number" name="phone" value={visibleProfile.phone} editing={isEditing} onChange={updateDraft} prefix="+63" numbersOnly />
                  <label className={`profile-field ${!visibleProfile.city ? "missing-field" : ""}`}>
                    <span>Current City</span>
                    <select
                      value={visibleProfile.city || ""}
                      disabled={!isEditing}
                      onChange={(event) => updateDraft("city", event.target.value)}
                    >
                      <option value="">Select current city</option>
                      {CAVITE_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label="Address" name="address" value={visibleProfile.address} editing={isEditing} onChange={updateDraft} wide />
                </div>
              </article>
            </section>
          )}

          {/* =================================================================
              SECTION 2: CAREER TARGETS & JOB PREFERENCES
              ================================================================= */}
          {activeSection === "preferences" && (
            <section className="profile-section-block">
              <article className="profile-card nearby-finder-card">
                <div className="nearby-card-header">
                  <div className="nearby-card-title-wrap">
                    <span className="nearby-pill">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      Nearby Applicant Finder
                    </span>
                    <strong>Set Your Pinpoint Location</strong>
                    <p className="nearby-desc">
                      Pinpoint your location on the map so nearby employers can easily discover your profile for jobs in your area.
                    </p>
                  </div>
                </div>
                <div className="nearby-card-footer">
                  {profile.latitude && profile.longitude ? (
                    <div className="nearby-status-group">
                      <span className="nearby-pinpointed-tag">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Location Pinpointed on Map
                      </span>
                      <button type="button" className="nearby-action-btn" onClick={() => setIsMapModalOpen(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        Change Pinpoint Location
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="nearby-action-btn" onClick={() => setIsMapModalOpen(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      Pinpoint Location on Map
                    </button>
                  )}
                </div>
              </article>

              <article className="profile-card preferences-card">
                <div className="person-heading">
                  <div>
                    <strong>Role & Employment Targeting</strong>
                    <small>Align your target role and salary expectations for accurate matching</small>
                  </div>
                  <button type="button" className="edit-profile-button" onClick={() => (isEditing ? saveProfile() : setIsEditing(true))} disabled={isSaving}>
                    {isEditing ? (isSaving ? "Saving..." : "Save Preferences") : "Edit Preferences"}
                  </button>
                  {isEditing && (
                    <button type="button" className="cancel-profile-button" onClick={() => { setDraft(profile); setIsEditing(false); }}>
                      Cancel
                    </button>
                  )}
                </div>

                <div className="profile-divider" />

                <div className="fields-grid">
                  <label className={`profile-field ${!visibleProfile.desired_job_title ? "missing-field" : ""}`}>
                    <span>Desired Job Title</span>
                    <select
                      value={visibleProfile.desired_job_title || ""}
                      disabled={!isEditing}
                      onChange={(event) => updateDraft("desired_job_title", event.target.value)}
                    >
                      <option value="">Select desired job title</option>
                      {DESIRED_JOB_TITLES.map((title) => (
                        <option key={title} value={title}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={`profile-field ${!visibleProfile.work_arrangement ? "missing-field" : ""}`}>
                    <span>Work Arrangement</span>
                    <select
                      value={visibleProfile.work_arrangement || ""}
                      disabled={!isEditing}
                      onChange={(event) => updateDraft("work_arrangement", event.target.value)}
                    >
                      <option value="">Select arrangement</option>
                      <option value="Remote">Remote</option>
                      <option value="On-Site">On-Site</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </label>

                  <Field
                    label="Expected Salary"
                    name="expected_salary"
                    value={visibleProfile.expected_salary}
                    editing={isEditing}
                    onChange={updateDraft}
                    prefix="PHP"
                    currencyFormat
                  />

                  <label className={`profile-field ${!visibleProfile.years_of_experience ? "missing-field" : ""}`}>
                    <span>Overall Experience Level</span>
                    <select
                      value={visibleProfile.years_of_experience || ""}
                      disabled={!isEditing}
                      onChange={(event) => updateDraft("years_of_experience", event.target.value)}
                    >
                      <option value="">Select experience level</option>
                      {EXPERIENCE_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </article>
            </section>
          )}

          {/* =================================================================
              SECTION 3: COMPETENCIES, EXPERIENCE & DOCUMENTS (MAX 5 WITH YEARS)
              ================================================================= */}
          {activeSection === "competencies" && (
            <section className="profile-section-block">
              <div className="tags-layout">
                <div className="tags-left-col">
                  {/* 1. Core Technical Skills - Max 5 with individual years of experience */}
                  <MaxFiveExperienceEditor
                    title="Core Technical Skills"
                    options={BSIT_BSCS_SKILLS}
                    rawString={profile.skills}
                    onSave={(items) => saveTagList("skills", items)}
                    disabled={isSavingTags}
                  />

                  {/* 2. Qualifications & Education - Max 5 with individual years of experience */}
                  <MaxFiveExperienceEditor
                    title="Educational Qualifications"
                    options={BSIT_BSCS_QUALIFICATIONS}
                    rawString={profile.qualifications}
                    onSave={(items) => saveTagList("qualifications", items)}
                    disabled={isSavingTags}
                  />

                  {/* 3. Professional Certifications - Max 5 with individual years of experience */}
                  <MaxFiveExperienceEditor
                    title="Professional Certifications"
                    options={BSIT_BSCS_CERTIFICATIONS}
                    rawString={profile.certifications}
                    onSave={(items) => saveTagList("certifications", items)}
                    disabled={isSavingTags}
                  />
                </div>

                {/* Resume / CV Document Card */}
                <section className="profile-card resume-card resume-side-card">
                  <strong>Resume / CV</strong>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />
                  <div
                    className={`resume-drop ${isDragging ? "dragging" : ""} ${isUploadingResume ? "uploading" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processResumeUpload(file);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload resume file"
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                  >
                    <span>♧</span>
                    <b>{isUploadingResume ? "Saving to database..." : "Upload new resume"}</b>
                    <small>PDF or DOCX - Maximum 10 MB</small>
                  </div>
                  <div className="uploaded-files-box">
                    <h4>Files in System</h4>
                    <p>Track uploaded documents linked to your profile.</p>
                    {uploadedFiles.length === 0 ? (
                      <div className="uploaded-files-empty">No files uploaded yet.</div>
                    ) : (
                      <ul>
                        {uploadedFiles.map((file) => (
                          <li key={`${file.label}-${file.path}`} className="uploaded-file-item">
                            <div className="file-info-col">
                              <strong>{file.label}</strong>
                              <span>{fileNameFromPath(file.path)}</span>
                            </div>
                            {file.label.includes("Resume") && (
                              <div className="resume-action-btns">
                                <a
                                  href={`/api/applicants/${userId}/resume`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="resume-view-btn"
                                  title="View resume"
                                >
                                  View
                                </a>
                                <button
                                  type="button"
                                  className="resume-delete-btn"
                                  onClick={handleDeleteResume}
                                  disabled={isUploadingResume}
                                  title="Delete resume"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* INTERACTIVE PINPOINT LOCATION LEAFLET MODAL */}
      {isMapModalOpen && (
        <div className="applicant-map-modal-overlay">
          <div className="applicant-map-modal">
            <div className="applicant-map-modal-header">
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Pinpoint Your Location on Map
              </h3>
              <button type="button" className="applicant-map-modal-close" onClick={() => setIsMapModalOpen(false)}>
                &times;
              </button>
            </div>

            <div className="applicant-map-container" id="applicant-pinpoint-map" />

            <div className="applicant-map-modal-footer">
              <span className="applicant-map-instruction">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Click or drag the pin to set your exact location
              </span>
              <div className="applicant-map-modal-btns">
                <button type="button" className="applicant-map-btn-cancel" onClick={() => setIsMapModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="applicant-map-btn-save" onClick={handleSaveLocation} disabled={isSavingLocation}>
                  {isSavingLocation ? "Saving..." : "Save Location"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
