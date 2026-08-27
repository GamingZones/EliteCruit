import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import { useEmployerCompanyLabel } from "./useEmployerCompanyLabel";
import ChatbotDrawer, { FAQItem } from "../components/ChatbotDrawer";
import { resolveLocalGeocode, resolveLocalGeocodeDetailed } from "../data/caviteMapData";
import "./Applicant-Dashboard.css";
import "./ApplicantDashboardOverrides.css";
import "./Employer-Dashboard.css";
import "./Employer-ApplicantScreening.css";
import "./Employer-ApplicantManagement.css";
import "./Employer-ApplicantFinder.css";

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

export type Candidate = {
  user_id: number;
  email: string;
  first_name?: string | null;
  applicant_name: string;
  desired_job_title: string;
  city: string;
  address?: string | null;
  work_arrangement?: string | null;
  expected_salary?: string | null;
  skills?: string | null;
  qualifications?: string | null;
  certifications?: string | null;
  resume_path?: string | null;
  profile_picture_path?: string | null;
  applied_count?: number;
  latest_application_status?: string | null;
  distance_km?: number;
  latitude?: number | string | null;
  longitude?: number | string | null;
  phone?: string | null;
  invited_count?: number | string | null;
}

export type ActiveJob = {
  id: number;
  title: string;
  work_arrangement?: string;
  city?: string;
  min_salary?: string;
  max_salary?: string;
  required_skills?: string | null;
  qualifications?: string | null;
};

function calculateCandidateMatch(cand?: Candidate | null, job?: ActiveJob | null): number {
  if (!cand || !job) return 85;

  let score = 52;

  // 1. Role Title Alignment (up to 25 pts)
  const candTitle = (cand.desired_job_title || "").toLowerCase();
  const jobTitle = (job.title || "").toLowerCase();
  if (candTitle && jobTitle) {
    if (candTitle === jobTitle || jobTitle.includes(candTitle) || candTitle.includes(jobTitle)) {
      score += 25;
    } else {
      const candTokens = candTitle.split(/[\s/,-]+/).filter(Boolean);
      const jobTokens = jobTitle.split(/[\s/,-]+/).filter(Boolean);
      const hasOverlap = candTokens.some((t) => jobTokens.some((jt) => jt.includes(t) || t.includes(jt)));
      if (hasOverlap) score += 18;
      else score += 8;
    }
  } else {
    score += 12;
  }

  // 2. Work Arrangement Alignment (up to 12 pts)
  const candArrangement = (cand.work_arrangement || "").toLowerCase();
  const jobArrangement = (job.work_arrangement || "").toLowerCase();
  if (!candArrangement || !jobArrangement || candArrangement === "flexible" || jobArrangement === "flexible" || candArrangement === jobArrangement) {
    score += 12;
  } else {
    score += 4;
  }

  // 3. Location Proximity (up to 8 pts)
  if (cand.distance_km !== undefined) {
    if (cand.distance_km <= 10) score += 8;
    else if (cand.distance_km <= 25) score += 5;
    else score += 2;
  } else {
    score += 5;
  }

  // 4. Skills Match (up to 15 pts)
  const candSkills = parseItemList(cand.skills, []);
  const jobSkills = parseItemList(job.required_skills, []);
  if (jobSkills.length > 0 && candSkills.length > 0) {
    const matchedCount = candSkills.filter((cs) => jobSkills.some((js) => js.toLowerCase().includes(cs.toLowerCase()) || cs.toLowerCase().includes(js.toLowerCase()))).length;
    score += Math.min(15, Math.round((matchedCount / Math.max(1, jobSkills.length)) * 15));
  } else {
    score += 10;
  }

  return Math.min(98, Math.max(65, score));
}

export type EmployerProfileData = {
  user_id: number;
  business_name?: string | null;
  company_address?: string | null;
  contact_number?: string | null;
  business_email?: string | null;
};

const AVAILABLE_SKILLS_LIST = [
  "React",
  "JavaScript",
  "TypeScript",
  "Python",
  "Node.js",
  "SQL",
  "UI/UX Design",
  "Figma",
  "API Development",
  "HTML/CSS",
  "Java",
  "PHP",
  "C#",
  "Git",
  "Customer Support",
  "Project Management",
];

// 100% Local Haversine Distance Calculation (Zero APIs)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function initialsFrom(name: string) {
  return (name || "Applicant")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function parseItemList(str?: string | null, fallback: string[] = []): string[] {
  if (!str || !str.trim()) return fallback;
  const items = str
    .split(/[\n,•;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}



export default function EmployerApplicantFinder() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const companyLabel = useEmployerCompanyLabel("Employer");

  const applicantFinderFaqs: FAQItem[] = [
    {
      question: "How do I find jobseekers near my company location?",
      answer: "The map displays active jobseekers in Cavite. Use the city dropdown or distance radius slider to filter candidates by proximity to your office.",
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

  // Search & Filter state
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All locations");
  const [selectedArrangement, setSelectedArrangement] = useState("Any arrangement");
  const [selectedMinSalary, setSelectedMinSalary] = useState("Any salary");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedDistanceRadius, setSelectedDistanceRadius] = useState<"all" | "5" | "10" | "15">("all");

  // Selected Candidate for Review Modal / Docs Drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);
  const [isPreviewingDoc, setIsPreviewingDoc] = useState(false);

  // Invite to Apply Modal
  const [inviteCandidate, setInviteCandidate] = useState<Candidate | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | "">("");
  const [jobCarouselIndex, setJobCarouselIndex] = useState(0);
  const [viewingJobDetails, setViewingJobDetails] = useState<ActiveJob | null>(null);
  const [customInviteMsg, setCustomInviteMsg] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState("");
  const [invitedCandidateIds, setInvitedCandidateIds] = useState<number[]>([]);

  // Office Location Pinpoint Mode state (on main map)
  const [isPinpointMode, setIsPinpointMode] = useState(false);
  const [tempPinCoords, setTempPinCoords] = useState<{ lat: number; lng: number }>({ lat: 14.2825, lng: 120.8667 });
  const [isSavingOfficePin, setIsSavingOfficePin] = useState(false);

  // Leaflet Map References (Preserve Zoom & Center)
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const companyMarkerRef = useRef<L.Marker | null>(null);

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
      let resolvedEmpCoords = { lat: 14.2825, lng: 120.8667 }; // Default: Trece Martires Business Center
      if (userId) {
        try {
          const empRes = await fetch(`/api/employers/${userId}/profile`);
          if (empRes.ok) {
            const empData = await empRes.json();
            if (empData?.profile) {
              setEmployerProfile(empData.profile);
              if (empData.profile.latitude && empData.profile.longitude) {
                resolvedEmpCoords = { lat: Number(empData.profile.latitude), lng: Number(empData.profile.longitude) };
              } else if (empData.profile.company_address && empData.profile.company_address.trim().length > 0) {
                resolvedEmpCoords = resolveLocalGeocode(empData.profile.company_address);
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
                    desired_job_title: a.desired_job_title || a.job_title || "Candidate",
                    city: a.city || "Cavite",
                    address: a.address || null,
                    work_arrangement: a.work_arrangement || "Remote",
                    expected_salary: a.expected_salary || "10,000.00",
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
        if ((!c.address || !c.email || !c.resume_path || !c.work_arrangement || !c.expected_salary) && c.user_id) {
          try {
            const pRes = await fetch(`/api/applicants/${c.user_id}/profile`);
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData?.profile) {
                if (pData.profile.address) c.address = pData.profile.address;
                if (pData.profile.city) c.city = pData.profile.city;
                if (pData.profile.email) c.email = pData.profile.email;
                if (pData.profile.resume_path) c.resume_path = pData.profile.resume_path;
                if (pData.profile.work_arrangement) c.work_arrangement = pData.profile.work_arrangement;
                if (pData.profile.expected_salary) c.expected_salary = pData.profile.expected_salary;
                if (pData.profile.desired_job_title) c.desired_job_title = pData.profile.desired_job_title;
                if (pData.profile.skills) c.skills = pData.profile.skills;
                if (pData.profile.qualifications) c.qualifications = pData.profile.qualifications;
                if (pData.profile.certifications) c.certifications = pData.profile.certifications;
                if (pData.profile.latitude) c.latitude = pData.profile.latitude;
                if (pData.profile.longitude) c.longitude = pData.profile.longitude;
              }
            }
          } catch {}
        }

        // Calculate distance from company
        const candCoords = (c.latitude && c.longitude)
          ? { lat: Number(c.latitude), lng: Number(c.longitude) }
          : resolveLocalGeocode(c.address, c.city);

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
      fetch(`/api/applicants/${selectedCandidate.user_id}/profile`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.profile) {
            setSelectedCandidate((prev) =>
              prev
                ? {
                    ...prev,
                    resume_path: data.profile.resume_path || prev.resume_path,
                    work_arrangement: data.profile.work_arrangement || prev.work_arrangement || "Remote",
                    expected_salary: data.profile.expected_salary || prev.expected_salary || "10,000.00",
                    desired_job_title: data.profile.desired_job_title || prev.desired_job_title,
                    skills: data.profile.skills || prev.skills,
                    qualifications: data.profile.qualifications || prev.qualifications,
                    certifications: data.profile.certifications || prev.certifications,
                    address: data.profile.address || prev.address,
                    city: data.profile.city || prev.city,
                    phone: data.profile.phone || prev.phone,
                    email: data.profile.email || prev.email,
                  }
                : null
            );
          }
        })
        .catch(() => {});
    }
  }, [selectedCandidate?.user_id]);

  const applySearch = () => {
    setAppliedSearchQuery(searchInput.trim().toLowerCase());
  };

  // Reset filters WITHOUT resetting distance radius
  const clearAllFilters = () => {
    setSearchInput("");
    setAppliedSearchQuery("");
    setSelectedLocation("All locations");
    setSelectedArrangement("Any arrangement");
    setSelectedMinSalary("Any salary");
    setSelectedSkills([]);
  };

  const handleAddSkill = (skill: string) => {
    if (!skill || skill === "Select a skill...") return;
    if (selectedSkills.includes(skill)) return;
    if (selectedSkills.length >= 5) {
      alert("You can select up to 5 skills.");
      return;
    }
    setSelectedSkills([...selectedSkills, skill]);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skillToRemove));
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((cand) => {
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

      // 2. Distance Radius Filter (from Company) - Only active in nearby mode
      if (searchMode === "nearby" && selectedDistanceRadius !== "all") {
        const maxKm = parseInt(selectedDistanceRadius, 10);
        if (cand.distance_km !== undefined && cand.distance_km > maxKm) {
          return false;
        }
      }

      // 3. Location
      if (selectedLocation !== "All locations") {
        const locClean = selectedLocation.toLowerCase().replace(", cavite", "").trim();
        const candCity = (cand.city || "").toLowerCase();
        const candAddr = (cand.address || "").toLowerCase();
        if (!candCity.includes(locClean) && !candAddr.includes(locClean)) {
          return false;
        }
      }

      // 4. Work Arrangement
      if (selectedArrangement !== "Any arrangement") {
        if (!cand.work_arrangement || cand.work_arrangement.toLowerCase() !== selectedArrangement.toLowerCase()) {
          return false;
        }
      }

      // 5. Expected Salary
      if (selectedMinSalary !== "Any salary") {
        const minVal = parseInt(selectedMinSalary.replace(/[^0-9]/g, ""), 10);
        const candSal = cand.expected_salary ? parseInt(cand.expected_salary.replace(/[^0-9]/g, ""), 10) : 0;
        if (!isNaN(minVal) && candSal > 0 && candSal < minVal) {
          return false;
        }
      }

      // 6. Skills Multi-Select Filter (Up to 5)
      if (selectedSkills.length > 0) {
        const candSkills = (cand.skills || "").toLowerCase();
        const matchesSkill = selectedSkills.some((s) => candSkills.includes(s.toLowerCase()));
        if (!matchesSkill) return false;
      }

      return true;
    });
  }, [candidates, appliedSearchQuery, searchMode, selectedDistanceRadius, selectedLocation, selectedArrangement, selectedMinSalary, selectedSkills]);

  // ============================================================
  // LEAFLET MAP: INITIALIZE ONCE WHEN ENTERING NEARBY MODE
  // ============================================================
  useEffect(() => {
    if (searchMode !== "nearby") {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        circleLayerRef.current = null;
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
  // LEAFLET MAP: UPDATE MARKERS & RADIUS WITHOUT CHANGING ZOOM
  // ============================================================
  useEffect(() => {
    if (searchMode !== "nearby" || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // 1. Update Circular Proximity Radius without resetting map zoom/center
    if (circleLayerRef.current) {
      circleLayerRef.current.remove();
      circleLayerRef.current = null;
    }

    if (selectedDistanceRadius !== "all") {
      const radiusMeters = parseInt(selectedDistanceRadius, 10) * 1000;
      circleLayerRef.current = L.circle([employerCoords.lat, employerCoords.lng], {
        radius: radiusMeters,
        color: "#0284c7",
        weight: 2,
        fillColor: "#0284c7",
        fillOpacity: 0.1,
      }).addTo(map);
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
    } else if (employerProfile?.latitude && employerProfile?.longitude) {
      const companyPinHtml = `
        <div class="company-headquarters-pin" title="${employerProfile?.business_name || companyLabel}">
          <div class="company-pin-inner">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
          </div>
          <div class="company-pin-badge">${employerProfile?.business_name || "Your Company"}</div>
        </div>
      `;

      const companyIcon = L.divIcon({
        className: "company-pin-wrapper",
        html: companyPinHtml,
        iconSize: [140, 80],
        iconAnchor: [70, 55],
      });

      const companyMarker = L.marker([Number(employerProfile.latitude), Number(employerProfile.longitude)], { icon: companyIcon }).addTo(map);
      companyMarker.bindPopup(`
        <div style="font-family:inherit; min-width:200px; padding:4px;">
          <strong style="color:#d97706; font-size:0.95rem; display:block;">🏢 ${employerProfile?.business_name || companyLabel}</strong>
          <small style="color:#64748b; display:block; margin:2px 0 4px;">Company Headquarters</small>
          <div style="font-size:0.78rem; color:#0f172a; font-weight:600; margin-bottom:4px;">📍 ${employerProfile?.company_address || "Office Location"}</div>
        </div>
      `);
      companyMarkerRef.current = companyMarker;
    }

    // 3. Update Filtered Candidate Pins smoothly (Only if saved pinpoint exists)
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();

      for (const cand of filteredCandidates) {
        if (!cand.latitude || !cand.longitude) continue; // Only render candidates with explicit pinpoints

        const coords = { lat: Number(cand.latitude), lng: Number(cand.longitude) };
        const dist = cand.distance_km !== undefined ? `${cand.distance_km} km` : "Nearby";

        const pinHtml = `
          <div class="custom-candidate-pin-inner" title="${cand.applicant_name} (${dist} away)">
            ${initialsFrom(cand.applicant_name)}
          </div>
        `;

        const customIcon = L.divIcon({
          className: "custom-candidate-pin",
          html: pinHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(markersLayerRef.current);

        // Popup with Candidate Details & Distance from Company
        const isCandInvited = invitedCandidateIds.includes(cand.user_id) || Number(cand.invited_count || 0) > 0;

        const popupHtml = document.createElement("div");
        popupHtml.className = "map-popup-card";
        popupHtml.innerHTML = `
          <div class="map-popup-header">
            <div class="map-popup-avatar">${initialsFrom(cand.applicant_name)}</div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <strong class="map-popup-name">${cand.applicant_name}</strong>
                <span class="finder-star-badge" style="font-size: 0.7rem; padding: 1px 6px;">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="#d97706"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  ${cand.rating ? Number(cand.rating).toFixed(1) : "0.0"}
                </span>
              </div>
          <div class="map-popup-distance-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
            <span>${cand.distance_km !== undefined ? `${cand.distance_km} km from your office` : "Nearby"}</span>
          </div>
          <div class="map-popup-actions">
            <button id="popup-view-${cand.user_id}" class="map-popup-btn primary">Details</button>
            <a href="/messages" class="map-popup-btn">Message</a>
            ${
              isCandInvited
                ? `<button class="map-popup-btn green-btn" style="background:#dcfce7; color:#15803d; border-color:#86efac; cursor:default;" disabled>Recruited</button>`
                : `<button id="popup-invite-${cand.user_id}" class="map-popup-btn green-btn">Recruit</button>`
            }
          </div>
        `;

        marker.bindPopup(popupHtml);

        marker.on("popupopen", () => {
          const viewBtn = document.getElementById(`popup-view-${cand.user_id}`);
          if (viewBtn) {
            viewBtn.onclick = () => {
              setSelectedCandidate(cand);
              setIsDocsDrawerOpen(false);
              setIsPreviewingDoc(false);
            };
          }

          const inviteBtn = document.getElementById(`popup-invite-${cand.user_id}`);
          if (inviteBtn) {
            inviteBtn.onclick = () => {
              openInviteModal(cand);
            };
          }
        });
      }
    }
  }, [searchMode, filteredCandidates, employerCoords, employerProfile, companyLabel, selectedDistanceRadius, isPinpointMode, tempPinCoords]);

  const openInviteModal = (cand: Candidate) => {
    setInviteCandidate(cand);
    setJobCarouselIndex(0);
    if (activeJobs.length > 0) {
      setSelectedJobId(activeJobs[0].id);
    }
    setCustomInviteMsg(
      `Hello ${cand.applicant_name}! We reviewed your profile and would love to invite you to apply for our open position.`
    );
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <ul className="appdash-secondary-list employer-main-links">
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
          </ul>

          <div className="appdash-menu-block employer-screening-block">
            <button
              className="appdash-menu-title employer-screening-title"
              type="button"
              onClick={() => setIsScreeningOpen((v) => !v)}
            >
              <span className="title-main">
                <span className="item-icon"><EmployerIcon name="applicant" /></span>
                <a href="/employer-applicant-management" onClick={(e) => e.stopPropagation()} className="sidebar-link-title">
                  Applicant Management
                </a>
              </span>
              <span className={`title-caret ${isScreeningOpen ? "open" : "closed"}`}>
                <ChevronIcon direction={isScreeningOpen ? "down" : "up"} />
              </span>
            </button>
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
          </div>

          <ul className="appdash-secondary-list">
            <li className="active">
              <a href="/employer-applicant-finder">
                <span className="item-icon"><EmployerIcon name="nearby" /></span>
                <span>Applicant Finder</span>
              </a>
            </li>
            <li>
              <a href="/employer-faq-management">
                <span className="item-icon"><EmployerIcon name="faq" /></span>
                <span>FAQ Management</span>
              </a>
            </li>
            <li>
              <a href="/messages">
                <span className="item-icon"><EmployerIcon name="messages" /></span>
                <span>Messages</span>
              </a>
            </li>
            <li>
              <a href="/notifications">
                <span className="item-icon"><EmployerIcon name="notifications" /></span>
                <span>Notifications</span>
                <span className="item-badge">8</span>
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
              <a href="/">
                <EmployerIcon name="logout" />Logout
              </a>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="appdash-main applicant-mgmt-main applicant-finder-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>Applicant Finder</strong>
            </div>
          </div>
          <div className="appdash-top-right">
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
                pageTitle="Applicant Finder"
                faqs={applicantFinderFaqs}
              />
            </div>
          </div>
        </header>

        {/* 2-COLUMN GRID: FILTERS ON LEFT, RIGHT CONTENT AREA */}
        <div className="finder-page-grid">
          {/* LEFT FILTERS COLUMN */}
          <aside className="finder-filters-col">
            {/* PRIMARY FILTERS PANEL */}
            <div className="finder-filters-panel">
              <h2>
                <FinderIcon name="filters" /> Filters
              </h2>

              <label>Location</label>
              <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                <option>All locations</option>
                <option>Alfonso, Cavite</option>
                <option>Amadeo, Cavite</option>
                <option>Bacoor, Cavite</option>
                <option>Carmona, Cavite</option>
                <option>Cavite City, Cavite</option>
                <option>Dasmariñas, Cavite</option>
                <option>General Trias, Cavite</option>
                <option>Imus, Cavite</option>
                <option>Indang, Cavite</option>
                <option>Kawit, Cavite</option>
                <option>Naic, Cavite</option>
                <option>Rosario, Cavite</option>
                <option>Silang, Cavite</option>
                <option>Tagaytay, Cavite</option>
                <option>Tanza, Cavite</option>
                <option>Trece Martires, Cavite</option>
              </select>

              <label>Work Arrangement</label>
              <select value={selectedArrangement} onChange={(e) => setSelectedArrangement(e.target.value)}>
                <option>Any arrangement</option>
                <option>Remote</option>
                <option>On-Site</option>
                <option>Hybrid</option>
              </select>

              <label>Expected Salary</label>
              <select value={selectedMinSalary} onChange={(e) => setSelectedMinSalary(e.target.value)}>
                <option>Any salary</option>
                <option>PHP 10,000+</option>
                <option>PHP 20,000+</option>
                <option>PHP 30,000+</option>
                <option>PHP 40,000+</option>
                <option>PHP 50,000+</option>
              </select>

              {/* SKILLS MULTI-SELECT (UP TO 5) */}
              <label>Add Skill(s) {selectedSkills.length > 0 && <span className="finder-skill-counter">({selectedSkills.length}/5)</span>}</label>
              <div className="finder-skills-select-wrap">
                <select
                  value=""
                  onChange={(e) => {
                    handleAddSkill(e.target.value);
                  }}
                  disabled={selectedSkills.length >= 5}
                >
                  <option value="">{selectedSkills.length >= 5 ? "Max 5 skills selected" : "+ Add Skill(s)..."}</option>
                  {AVAILABLE_SKILLS_LIST.map((sk) => (
                    <option key={sk} value={sk} disabled={selectedSkills.includes(sk)}>
                      {selectedSkills.includes(sk) ? `✓ ${sk}` : sk}
                    </option>
                  ))}
                </select>

                {selectedSkills.length > 0 && (
                  <div className="finder-skills-chips-row">
                    {selectedSkills.map((sk) => (
                      <span key={sk} className="finder-skill-select-chip">
                        {sk}
                        <button type="button" onClick={() => handleRemoveSkill(sk)} title={`Remove ${sk}`}>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" className="finder-reset-btn" onClick={clearAllFilters}>
                Reset Filters
              </button>
            </div>

            {/* SEPARATE DISTANCE RADIUS CARD - ONLY VISIBLE IN NEARBY APPLICANT FINDER */}
            {searchMode === "nearby" && (
              <div className="finder-radius-panel">
                <label>Distance Radius</label>
                <select
                  value={selectedDistanceRadius}
                  onChange={(e) => setSelectedDistanceRadius(e.target.value as any)}
                >
                  <option value="all">All Distances</option>
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="15">Within 15 km</option>
                </select>

                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #e2e8f0" }}>
                  <button
                    type="button"
                    className="pinpoint-location-btn"
                    style={{ width: "100%", justifyContent: "center", padding: "9px 12px", fontSize: "0.82rem" }}
                    onClick={startPinpointMode}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    Pinpoint Office Location
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT COLUMN: 2-BUTTON SELECTION ON TOP */}
          <div className={`finder-results-col ${searchMode === "nearby" ? "nearby-mode-active" : ""}`}>
            {/* 2-BUTTON SELECTION BAR */}
            <div className="finder-mode-card">
              <p>Choose search method:</p>
              <div className="finder-mode-actions">
                <button
                  type="button"
                  className={`finder-mode-btn ${searchMode === "manual" ? "active" : ""}`}
                  onClick={() => setSearchMode("manual")}
                >
                  <FinderIcon name="search" /> Manual Search
                </button>
                <button
                  type="button"
                  className={`finder-mode-btn ${searchMode === "nearby" ? "active" : ""}`}
                  onClick={() => setSearchMode("nearby")}
                >
                  <FinderIcon name="nearby" /> Nearby Finder
                </button>
              </div>
            </div>

            {/* ============================================================ */}
            {/* MODE 1: MANUAL SEARCH (Search Bar + Result List)             */}
            {/* ============================================================ */}
            {searchMode === "manual" && (
              <>
                {/* SEARCH BAR CARD */}
                <div className="finder-search-card">
                  <div className="finder-search-row">
                    <input
                      type="text"
                      className="finder-search-input"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applySearch();
                      }}
                      placeholder="Search candidates by name, job role, skills, or city..."
                    />
                    <button type="button" className="finder-search-btn" onClick={applySearch}>
                      <FinderIcon name="search" /> Search Candidates
                    </button>
                  </div>
                </div>

                {/* RESULTS HEADER */}
                <div className="finder-results-header">
                  <h2>Showing {filteredCandidates.length} candidate{filteredCandidates.length === 1 ? "" : "s"}</h2>
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
                  filteredCandidates.map((cand) => {
                    const skillsList = parseItemList(cand.skills, ["Problem Solving", "Technical Communication"]);
                    const qualiList = parseItemList(cand.qualifications, ["Relevant Experience"]);
                    const certList = parseItemList(cand.certifications, []);
                    const isInvited = invitedCandidateIds.includes(cand.user_id) || Number(cand.invited_count || 0) > 0;
                    const hasApplied = (cand.applied_count ?? 0) > 0;

                    return (
                      <article key={cand.user_id} className="finder-card">
                        <div className="finder-card-main">
                          {/* Left Column: Avatar + Profile Info + Role + Skills + Qualifications */}
                          <div className="finder-card-left">
                            <div className="finder-card-header-row">
                              <div className="finder-avatar-box">
                                {initialsFrom(cand.applicant_name)}
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
                                    <span>{cand.city || cand.address || "Cavite"}</span>
                                  </span>
                                  <span className="finder-meta-inline-item">
                                    <FinderIcon name="briefcase" />
                                    <span>{cand.work_arrangement || "On-site"}</span>
                                  </span>
                                  {cand.expected_salary && (
                                    <span className="finder-meta-inline-item">
                                      <FinderIcon name="money" />
                                      <span>
                                        Expected: {cand.expected_salary.toUpperCase().includes("PHP") ? cand.expected_salary : `PHP ${cand.expected_salary}`}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Role Title */}
                            <div className="finder-candidate-role-text">
                              {cand.desired_job_title || "Candidate"}
                            </div>

                            {/* Skills Row */}
                            {skillsList.length > 0 && (
                              <div className="finder-pill-row">
                                <span className="finder-pill-label">SKILLS:</span>
                                <div className="finder-pills-wrap">
                                  {skillsList.map((s, idx) => (
                                    <span key={idx} className="finder-pill skill">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Qualifications Row */}
                            {qualiList.length > 0 && (
                              <div className="finder-pill-row">
                                <span className="finder-pill-label">QUALIFICATIONS:</span>
                                <div className="finder-pills-wrap">
                                  {qualiList.map((q, idx) => (
                                    <span key={idx} className="finder-pill quali">{q}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Certifications Row (if any) */}
                            {certList.length > 0 && (
                              <div className="finder-pill-row">
                                <span className="finder-pill-label">CERTIFICATIONS:</span>
                                <div className="finder-pills-wrap">
                                  {certList.map((c, idx) => (
                                    <span key={idx} className="finder-pill cert">{c}</span>
                                  ))}
                                </div>
                              </div>
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
              </>
            )}

            {/* ============================================================ */}
            {/* MODE 2: NEARBY FINDER (FULL-HEIGHT RESPONSIVE MAP)           */}
            {/* ============================================================ */}
            {searchMode === "nearby" && (
              <div className="finder-leaflet-map-wrap" style={{ position: "relative" }}>
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
            )}
          </div>
        </div>

        {/* CANDIDATE DETAILS & SAVED DOCS MODAL */}
        {selectedCandidate && (
          <div className="jd-overlay" onClick={() => setSelectedCandidate(null)}>
            <div className="jd-panel" onClick={(e) => e.stopPropagation()}>
              <div className="jd-employer-strip" style={{ paddingTop: "20px" }}>
                <div className="jd-employer-logo-info">
                  <div className="jd-employer-logo" aria-label="Candidate initials">
                    <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "1.05rem" }}>
                      {initialsFrom(selectedCandidate.applicant_name)}
                    </span>
                  </div>
                  <div>
                    <strong className="jd-employer-name">{selectedCandidate.applicant_name}</strong>
                    <span className="jd-employer-location" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "3px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        {selectedCandidate.city || "Cavite"}
                      </span>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        {selectedCandidate.email}
                      </span>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {selectedCandidate.phone || "09682944632"}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="jd-header-right-actions">
                  <div className="rating-score-box" title="Applicant rating">
                    <span className="star-icon">★</span>
                    <span>{selectedCandidate?.rating ? Number(selectedCandidate.rating).toFixed(1) : "0.0"}</span>
                  </div>
                  <button
                    type="button"
                    className={`jd-faq-btn ${isDocsDrawerOpen ? "active" : ""}`}
                    onClick={() => setIsDocsDrawerOpen((prev) => !prev)}
                  >
                    Docs
                  </button>
                </div>
              </div>

              <div className="jd-body-wrapper">
                <div className="jd-body">
                  <div className="jd-top-section">
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Desired Job Title
                      </span>
                      <div className="jd-title-row">
                        <h2 className="jd-title-h2">{selectedCandidate.desired_job_title || "IT Operations Associate"}</h2>
                      </div>
                    </div>
                    <div className="jd-chips-inline">
                      <span className="setup-pill">{selectedCandidate.work_arrangement || "Remote"}</span>
                      <span className="salary-pill">
                        {(() => {
                          const sal = selectedCandidate.expected_salary || "10,000.00";
                          return sal.toUpperCase().includes("PHP") ? sal : `PHP ${sal}`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* SKILLS */}
                  <div className="jd-section">
                    <h3>SKILLS</h3>
                    <div className="jd-tags-wrap">
                      {parseItemList(selectedCandidate.skills, ["Python", "API Development"]).map((s, idx) => (
                        <span key={idx} className="js-tag-chip js-tag-skill">{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* QUALIFICATIONS */}
                  <div className="jd-section">
                    <h3>QUALIFICATIONS</h3>
                    <div className="jd-tags-wrap">
                      {parseItemList(selectedCandidate.qualifications, ["BS Information Technology (BSIT)", "Internship / OJT Completion"]).map((q, idx) => (
                        <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                      ))}
                    </div>
                  </div>

                  {/* CERTIFICATIONS */}
                  <div className="jd-section">
                    <h3>CERTIFICATIONS</h3>
                    <div className="jd-tags-wrap">
                      {parseItemList(selectedCandidate.certifications, ["Google IT Support Professional Certificate"]).map((c, idx) => (
                        <span key={idx} className="js-tag-chip" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>{c}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Slide-in Docs Drawer */}
                <div className={`jd-faq-drawer ${isDocsDrawerOpen ? "open" : ""}`}>
                  <div className="jd-faq-header">
                    <h3>{isPreviewingDoc ? "Document Preview" : "Saved Documents"}</h3>
                    <button
                      type="button"
                      className="jd-faq-back-btn"
                      onClick={() => {
                        if (isPreviewingDoc) setIsPreviewingDoc(false);
                        else setIsDocsDrawerOpen(false);
                      }}
                    >
                      ←
                    </button>
                  </div>
                  <div className="jd-faq-body" style={{ padding: "16px", display: "flex", flexDirection: "column", height: "calc(100% - 60px)" }}>
                    {!isPreviewingDoc ? (
                      <>
                        <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 16px" }}>
                          System saved documents for <strong>{selectedCandidate.applicant_name}</strong>:
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", background: "#f8fafc" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </div>
                            <div>
                              <strong style={{ display: "block", fontSize: "0.9rem", color: "#0f172a" }}>
                                {selectedCandidate.resume_path || `${selectedCandidate.applicant_name.replace(/\s+/g, "_")}_Resume.pdf`}
                              </strong>
                              <small style={{ color: "#64748b" }}>Primary Resume / CV</small>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              className="doc-action-view-btn"
                              onClick={() => setIsPreviewingDoc(true)}
                            >
                              View
                            </button>
                            <a
                              href={`/api/applicants/${selectedCandidate.user_id}/resume?download=1`}
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
                      </>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          <button
                            type="button"
                            onClick={() => setIsPreviewingDoc(false)}
                            style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", fontSize: "0.84rem", fontWeight: "600", padding: 0 }}
                          >
                            ← Back to list
                          </button>
                          <a
                            href={`/api/applicants/${selectedCandidate.user_id}/resume?download=1`}
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
                        <div style={{ flex: 1, minHeight: "420px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1", background: "#ffffff" }}>
                          <iframe
                            src={`/api/applicants/${selectedCandidate.user_id}/resume`}
                            style={{ width: "100%", height: "100%", minHeight: "420px", border: "none" }}
                            title={`${selectedCandidate.applicant_name} Document`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="jd-panel-footer" style={{ justifyContent: "flex-end" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button type="button" className="jd-cancel-btn" onClick={() => setSelectedCandidate(null)}>
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

        {/* INVITE CANDIDATE MODAL */}
        {inviteCandidate && (
          <div className="jd-overlay" onClick={() => setInviteCandidate(null)}>
            <div className="jd-panel" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
              <div className="jd-faq-header">
                <h3>Invite Candidate to Apply</h3>
                <button type="button" className="jd-faq-back-btn" onClick={() => setInviteCandidate(null)}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendInvite} style={{ padding: "20px", display: "grid", gap: "14px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#01294a", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.8rem" }}>
                    {initialsFrom(inviteCandidate.applicant_name)}
                  </div>
                  <div>
                    <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>{inviteCandidate.applicant_name}</strong>
                    <small style={{ display: "block", color: "#64748b", fontSize: "0.75rem" }}>
                      {inviteCandidate.email || "No email"} {inviteCandidate.phone ? `· ${inviteCandidate.phone}` : ""}
                    </small>
                  </div>
                </div>

                {/* JOB OPENING SELECTION (WITH LEFT/RIGHT ARROWS, MATCH %, DETAILS BUTTON) */}
                <div style={{ display: "grid", gap: "6px" }}>
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
                    <div className="job-select-card selected">
                      <div className="job-select-card-left">
                        <h4 className="job-select-title">Software Developer (General Opening)</h4>
                        <span className="job-select-apps">Applications: 0/10</span>
                      </div>
                      <div className="job-select-card-right">
                        <div className="job-select-match-box">
                          <span className="match-label">MATCH</span>
                          <span className="match-value">90%</span>
                        </div>
                        <button
                          type="button"
                          className="job-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingJobDetails({
                              id: 101,
                              title: "Software Developer (General Opening)",
                              work_arrangement: "On-Site",
                              city: "Cavite",
                              description: "General opening for proactive software developers with solid background in software engineering.",
                              required_skills: "React, JavaScript, Node.js",
                              qualifications: "BS Information Technology or Computer Science"
                            });
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const currentJob = activeJobs[jobCarouselIndex] || activeJobs[0];
                      const matchPct = calculateCandidateMatch(inviteCandidate, currentJob);
                      const appsCount = currentJob.applicants_count !== undefined && currentJob.applicants_count !== null ? Number(currentJob.applicants_count) : 0;
                      const appsLimit = currentJob.application_limit ? `/${currentJob.application_limit}` : "";

                      return (
                        <div className="job-carousel-container">
                          {/* Left Arrow Button */}
                          {activeJobs.length > 1 && (
                            <button
                              type="button"
                              className="job-carousel-arrow-btn left"
                              onClick={() => {
                                const prevIdx = (jobCarouselIndex - 1 + activeJobs.length) % activeJobs.length;
                                setJobCarouselIndex(prevIdx);
                                setSelectedJobId(activeJobs[prevIdx].id);
                              }}
                              title="Previous Job Opening"
                            >
                              ‹
                            </button>
                          )}

                          {/* Selected Job Card */}
                          <div
                            className="job-select-card selected"
                            onClick={() => setSelectedJobId(currentJob.id)}
                          >
                            <div className="job-select-card-left">
                              <h4 className="job-select-title">{currentJob.title}</h4>
                              <span className="job-select-apps">Applications: {appsCount}{appsLimit}</span>
                            </div>

                            <div className="job-select-card-right">
                              <div className="job-select-match-box">
                                <span className="match-label">MATCH</span>
                                <span className="match-value">{matchPct}%</span>
                              </div>

                              <button
                                type="button"
                                className="job-details-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingJobDetails(currentJob);
                                }}
                              >
                                Details
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
                                setJobCarouselIndex(nextIdx);
                                setSelectedJobId(activeJobs[nextIdx].id);
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

        {/* JOB DETAILS PREVIEW POPUP */}
        {viewingJobDetails && (
          <div className="jd-overlay" style={{ zIndex: 10000 }} onClick={() => setViewingJobDetails(null)}>
            <div className="jd-panel job-details-modal-panel" style={{ maxWidth: "620px", width: "95%", borderRadius: "12px", background: "#ffffff", overflow: "hidden", boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "24px 28px 20px" }}>
                {/* Top Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#01294a", lineHeight: 1.3 }}>
                    {viewingJobDetails.title}
                  </h2>
                  <button
                    type="button"
                    className="jd-faq-back-btn"
                    onClick={() => setViewingJobDetails(null)}
                    style={{ fontSize: "1.1rem", color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                  >
                    ✕
                  </button>
                </div>

                {/* Chips Row */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px", alignItems: "center" }}>
                  <span className="job-detail-chip chip-open">Open</span>
                  <span className="job-detail-chip chip-arrangement">{viewingJobDetails.work_arrangement || "On-Site"}</span>
                  {(viewingJobDetails.min_salary || viewingJobDetails.max_salary) && (
                    <span className="job-detail-chip chip-salary">
                      PHP {Number(viewingJobDetails.min_salary || 0).toLocaleString()} - {Number(viewingJobDetails.max_salary || 0).toLocaleString()}
                    </span>
                  )}
                </div>

                <div style={{ borderBottom: "1px solid #f1f5f9", margin: "18px 0" }} />

                {/* Body Content */}
                <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxHeight: "55vh", overflowY: "auto", paddingRight: "4px" }}>
                  {/* JOB DESCRIPTION */}
                  <div>
                    <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      JOB DESCRIPTION
                    </span>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                      {viewingJobDetails.description || "No job description provided."}
                    </p>
                  </div>

                  {/* REQUIRED SKILLS */}
                  {viewingJobDetails.required_skills && (
                    <div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                        REQUIRED SKILLS
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {parseItemList(viewingJobDetails.required_skills).map((sk, idx) => (
                          <span key={idx} className="job-detail-skill-pill">{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* QUALIFICATIONS */}
                  {viewingJobDetails.qualifications && (
                    <div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                        QUALIFICATIONS
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {parseItemList(viewingJobDetails.qualifications).map((qu, idx) => (
                          <span key={idx} className="job-detail-quali-pill">{qu}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 28px", borderTop: "1px solid #f1f5f9", background: "#fcfdfe" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <span style={{ fontSize: "0.84rem", color: "#01294a", fontWeight: 800 }}>
                    Applications: <span style={{ color: "#475569", fontWeight: 600 }}>{viewingJobDetails.applicants_count !== undefined && viewingJobDetails.applicants_count !== null ? Number(viewingJobDetails.applicants_count) : 0}{viewingJobDetails.application_limit ? ` / ${viewingJobDetails.application_limit}` : ""}</span>
                  </span>
                  {viewingJobDetails.close_date && (
                    <span style={{ fontSize: "0.84rem", color: "#01294a", fontWeight: 800 }}>
                      Close Date: <span style={{ color: "#475569", fontWeight: 600 }}>{viewingJobDetails.close_date}</span>
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="job-modal-back-btn"
                    onClick={() => setViewingJobDetails(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
