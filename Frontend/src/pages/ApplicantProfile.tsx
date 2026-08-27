import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import "./Applicant-Dashboard.css";
import "./ApplicantProfile.css";
import "./ApplicantProfileOverrides.css";

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
  skills: null,
  certifications: null,
  qualifications: null,
  resume_path: null,
  profile_picture_path: null,
  latitude: null,
  longitude: null,
};

const BSIT_BSCS_SKILLS = [
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

const DESIRED_JOB_TITLES = [
  "IT Support Specialist / IT Support Staff",
  "Technical Support Representative",
  "Help Desk Technician",
  "IT Service Desk Analyst",
  "Junior Software Developer",
  "Junior Web Developer",
  "Software Engineer",
  "QA Tester / Quality Assurance Analyst",
  "Systems Analyst",
  "Junior Systems Administrator",
  "Network Administrator / Network Support",
  "Database Administrator Junior",
  "IT Operations Associate",
  "Application Support Analyst",
  "Business/Systems Analyst",
  "Cybersecurity Analyst Junior",
  "Cloud Support Associate",
  "Data Analyst Junior",
  "UI/UX Designer",
  "IT Project Coordinator",
];

const BSIT_BSCS_CERTIFICATIONS = [
  "Oracle Certified Foundations Associate, Java",
  "AWS Certified Cloud Practitioner",
  "Microsoft Azure Fundamentals (AZ-900)",
  "Google IT Support Professional Certificate",
  "Meta Front-End Developer Certificate",
  "Cisco Certified Support Technician (CCST)",
  "CompTIA IT Fundamentals (ITF+)",
  "CompTIA A+",
  "Scrum Fundamentals Certified (SFC)",
  "Fortinet Certified Associate Cybersecurity",
];

const BSIT_BSCS_QUALIFICATIONS = [
  "BS Information Technology (BSIT)",
  "BS Computer Science (BSCS)",
  "Capstone Project Completion",
  "Internship / OJT Completion",
  "Database Management Training",
  "Web Development Bootcamp",
  "Software Engineering Training",
  "Data Analytics Training",
];

function splitTags(value: string | null | undefined) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function MultiSelectTagEditor({
  title,
  subtitle,
  options,
  items,
  onSave,
  disabled,
}: {
  title: string;
  subtitle: string;
  options: string[];
  items: string[];
  onSave: (items: string[]) => Promise<boolean>;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState("");
  const availableOptions = useMemo(
    () => options.filter((option) => !items.some((item) => item.toLowerCase() === option.toLowerCase())),
    [options, items]
  );

  const addSelected = async () => {
    if (!selected || items.includes(selected)) return;
    const ok = await onSave([...items, selected]);
    if (ok) setSelected("");
  };

  const removeItem = async (item: string) => {
    await onSave(items.filter((value) => value !== item));
  };

  return (
    <article className="profile-card">
      <strong>{title}</strong>
      <span>{subtitle}</span>
      <div className={`tag-editor ${!items.length ? "missing-field" : ""}`}>
        <div className="skills-tags">
          {items.length ? (
            items.map((item) => (
              <span className="profile-skill-pill" key={item}>
                {item}
                <button type="button" aria-label={`Remove ${item}`} onClick={() => removeItem(item)} disabled={disabled}>
                  ×
                </button>
              </span>
            ))
          ) : (
            <em>Not provided</em>
          )}
        </div>

        <div className="skill-add-row">
          <select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={disabled}>
            <option value="">Select from BSIT/BSCS options</option>
            {availableOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button type="button" onClick={addSelected} disabled={disabled || !selected}>
            + Add
          </button>
        </div>
      </div>
    </article>
  );
}

function Tip({ title, text }: { title: string; text: string }) {
  return (
    <article>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

export default function ApplicantProfile() {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
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

  const skillChips = useMemo(() => splitTags(profile.skills), [profile.skills]);
  const certificationChips = useMemo(() => splitTags(profile.certifications), [profile.certifications]);
  const qualificationChips = useMemo(() => splitTags(profile.qualifications), [profile.qualifications]);
  const uploadedFiles = useMemo(
    () => [
      { label: "Resume / CV", path: profile.resume_path },
      { label: "Profile Picture", path: profile.profile_picture_path },
    ].filter((file) => Boolean(file.path && String(file.path).trim())),
    [profile.resume_path, profile.profile_picture_path]
  );
  const visibleProfile = isEditing ? draft : profile;

  const completionItems = useMemo(
    () => [
      Boolean(profile.first_name && profile.last_name && profile.email),
      Boolean(profile.skills),
      Boolean(profile.resume_path),
      Boolean(profile.certifications),
      Boolean(profile.phone && profile.city),
    ],
    [profile]
  );

  const completionScore = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  useEffect(() => {
    const savedUser = localStorage.getItem("elitecruit-user");
    if (!savedUser) {
      setProfileMessage("Sign in to view your saved profile.");
      return;
    }

    try {
      const user = JSON.parse(savedUser);
      if (user.role !== "applicant" || !user.id) {
        setProfileMessage("This page is available to applicant accounts.");
        return;
      }

      fetch(`/api/applicants/${user.id}/profile`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);
          const loadedProfile = { ...emptyProfile, ...data.profile };
          setProfile(loadedProfile);
          setDraft(loadedProfile);
          setUserId(user.id);
        })
        .catch((error) => setProfileMessage(error.message || "Unable to load profile."));
    } catch {
      setProfileMessage("Unable to read your sign-in details.");
    }
  }, []);

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
      if (!response.ok) throw new Error(data.message || "Unable to save profile tags.");
      const value = data.items.join(", ") || null;
      setProfile((current) => ({ ...current, [field]: value }));
      setDraft((current) => ({ ...current, [field]: value }));
      return true;
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to save profile tags.");
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
        // Do NOT set Content-Type header — browser sets it automatically with correct boundary for multipart
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        // Handle non-JSON server error responses gracefully
      }

      if (!response.ok) {
        throw new Error(data?.message || `Unable to save resume (Server status: ${response.status}).`);
      }

      if (data.profile) {
        const loadedProfile = { ...emptyProfile, ...data.profile };
        setProfile(loadedProfile);
        setDraft(loadedProfile);
      } else {
        setProfile((prev) => ({ ...prev, resume_path: file.name }));
        setDraft((prev) => ({ ...prev, resume_path: file.name }));
      }
      setProfileMessage("Resume uploaded and saved to database successfully!");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to save resume.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processResumeUpload(file);
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleDeleteResume = async () => {
    if (!userId || isUploadingResume) return;
    setIsUploadingResume(true);
    setProfileMessage("");
    try {
      const response = await fetch(`/api/applicants/${userId}/resume`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to delete resume.");
      if (data.profile) {
        const loadedProfile = { ...emptyProfile, ...data.profile };
        setProfile(loadedProfile);
        setDraft(loadedProfile);
      } else {
        setProfile((prev) => ({ ...prev, resume_path: null }));
        setDraft((prev) => ({ ...prev, resume_path: null }));
      }
      setProfileMessage("Resume removed successfully.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to delete resume.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  return (
    <div className="profile-shell">
      <aside className="appdash-sidebar" aria-label="Applicant Navigation">
        <a href="/" className="appdash-brand">
          <strong>EliteCruit</strong>
          <span>Candidate Workspace</span>
        </a>

        <div className="appdash-menu-block">
          <button className="appdash-menu-title workspace-route-title" type="button" onClick={() => setIsWorkspaceOpen((value) => !value)}>
            <span className="title-main">
              <span className="item-icon"><SideIcon name="overview" /></span>
              Applicant Workspace
            </span>
            <span className={`title-caret ${isWorkspaceOpen ? "open" : "closed"}`}>
              <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
            </span>
          </button>

          {isWorkspaceOpen && (
            <ul className="appdash-menu-list">
              <li><a href="/applicant-dashboard#section-overview"><span className="item-icon"><SideIcon name="overview" /></span>Overview</a></li>
              <li><a href="/applicant-dashboard#section-smart-matches"><span className="item-icon"><SideIcon name="star" /></span>Smart Matches</a></li>
              <li><a href="/applicant-dashboard#section-applications"><span className="item-icon"><SideIcon name="applications" /></span>My Applications</a></li>
              <li><a href="/applicant-dashboard#section-invitations"><span className="item-icon"><SideIcon name="notifications" /></span>Job Invitations</a></li>
            </ul>
          )}
        </div>

        <ul className="appdash-secondary-list">
          <li><a href="/job-search"><span className="item-icon"><SideIcon name="search" /></span>Job Search</a></li>
          <li><a href="/applicant-document-converter"><span className="item-icon"><SideIcon name="documents" /></span>Document Converter</a></li>
          <li><a href="/messages"><span className="item-icon"><SideIcon name="messages" /></span>Messages</a></li>
          <li><a href="/notifications"><span className="item-icon"><SideIcon name="notifications" /></span>Notifications<span className="item-badge">8</span></a></li>
          <li><a href="/feedback"><span className="item-icon"><SideIcon name="feedback" /></span>Feedback</a></li>
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

      <main className="profile-page">
        <header className="profile-header">
          <div>
            <strong>My Profile</strong>
            <span>Manage your professional information and resume</span>
          </div>
          <div className="profile-header-actions">
            <button type="button" className="chatbot-button"><SideIcon name="chat" />ChatBot</button>
          </div>
        </header>

        <div className="profile-content">
          {profileMessage && <p className="profile-message">{profileMessage}</p>}

          <section className="profile-top-grid">
            <article className="profile-card completion-card">
              <small>Profile Completion Score</small>
              <strong>{completionScore}%</strong>
              <span>{completionScore === 100 ? "Profile complete" : "Complete your profile"}</span>
              <div className="completion-bar"><i style={{ width: `${completionScore}%` }} /></div>
            </article>
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
          </section>

          <section className="profile-card match-card">
            <div>
              <strong>Match Optimization Panel</strong>
              <span>Improve the details that employers and job-matching tools use.</span>
            </div>
            <div className="match-tips">
              <Tip title="Resume" text="Make sure your skills appear in your uploaded resume." />
              <Tip title="Work History" text="Write strong, role-relevant work accomplishments." />
              <Tip title="Location" text="Include your city and preferred work location." />
              <Tip title="Skills" text="Keep your technical and soft skills current." />
              <Tip title="Career Goals" text="Share the type of job you want to pursue." />
            </div>
          </section>

          <section className="profile-card personal-card">
            <div className="person-heading">
              <span className="person-avatar">{initials}</span>
              <div>
                <strong>{fullName}</strong>
                <small>Applicant profile - {profile.city || "Location not provided"}</small>
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
              <Field label="Expected Salary" name="expected_salary" value={visibleProfile.expected_salary} editing={isEditing} onChange={updateDraft} prefix="PHP" currencyFormat />
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
            </div>
          </section>

          <section className="tags-layout">
            <div className="tags-left-col">
              <MultiSelectTagEditor
                title="Skills"
                subtitle="Select one-by-one from BSIT/BSCS skill options. You can add multiple selections."
                options={BSIT_BSCS_SKILLS}
                items={skillChips}
                onSave={(items) => saveTagList("skills", items)}
                disabled={isSavingTags}
              />

              <MultiSelectTagEditor
                title="Certifications"
                subtitle="Select certifications aligned to BSIT/BSCS career paths."
                options={BSIT_BSCS_CERTIFICATIONS}
                items={certificationChips}
                onSave={(items) => saveTagList("certifications", items)}
                disabled={isSavingTags}
              />

              <MultiSelectTagEditor
                title="Qualifications"
                subtitle="Select educational qualifications and trainings related to BSIT/BSCS."
                options={BSIT_BSCS_QUALIFICATIONS}
                items={qualificationChips}
                onSave={(items) => saveTagList("qualifications", items)}
                disabled={isSavingTags}
              />
            </div>

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
                <p>Track uploaded files linked to your profile.</p>
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
          </section>
        </div>
      </main>

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
