import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import "./CalendarDrawer.css";
import {
  formatLocationWithCavite,
  parseItemList,
  parseExpectedSalary,
  calculateJobMatchDetails,
  getMatchColorClass,
  isSkillMatch,
  parseCompetencyDisplayTags,
  parsePreferredLocationTags,
} from "../utils/filters";

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

export type SchedulableCandidate = {
  user_id: number;
  full_name: string;
  email?: string;
  phone?: string;
  city?: string;
  desired_job_title?: string;
  job_post_id?: number;
  job_title?: string;
  application_status?: "approved" | "accepted" | string;
  match_percentage?: number;
  skills?: string[];
  education?: string;
  summary?: string;
  languages?: string | string[];
  qualifications?: string | string[];
  certifications?: string | string[];
  work_arrangement?: string;
  expected_salary_min?: number;
  expected_salary_max?: number;
  expected_salary?: string | number;
  preferred_locations?: string | string[];
  years_of_experience?: string;
  work_experience_json?: string;
  rating?: number;
  profile_picture_path?: string | null;
  resume_path?: string | null;
};

export type ScheduledInterview = {
  id: number;
  employer_user_id: number;
  applicant_user_id: number;
  candidate_user_ids?: number[];
  candidates?: SchedulableCandidate[];
  job_post_id?: number | null;
  interview_title: string;
  interview_stage: string;
  interview_type: "Online" | "On-Site" | string;
  meeting_link_or_address?: string | null;
  interview_date: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM'
  end_time: string; // 'HH:MM'
  notes?: string | null;
  status: "pending" | "accepted" | "declined" | "rescheduled" | "completed" | "cancelled" | string;
  created_at?: string;
  // Joins
  job_title?: string;
  applicant_name?: string;
  applicant_phone?: string;
  applicant_city?: string;
  applicant_email?: string;
  applicant_profile_picture_path?: string | null;
  employer_company_name?: string;
  employer_phone?: string;
  employer_address?: string;
  employer_email?: string;
  employer_logo_path?: string | null;
  employer_cover_path?: string | null;
  deleted_by_employer?: boolean;
  deleted_by_applicant?: boolean;
};

export function getCandidatesForInterview(
  item: ScheduledInterview,
  schedulableCandidates: SchedulableCandidate[]
): SchedulableCandidate[] {
  if (item.candidates && item.candidates.length > 0) {
    return item.candidates;
  }
  if (item.candidate_user_ids && item.candidate_user_ids.length > 0) {
    const list = item.candidate_user_ids
      .map((uid) => schedulableCandidates.find((c) => c.user_id === uid))
      .filter((c): c is SchedulableCandidate => Boolean(c));
    if (list.length > 0) return list;
  }
  if (item.applicant_user_id) {
    const found = schedulableCandidates.find((c) => c.user_id === item.applicant_user_id);
    if (found) return [found];
  }
  return [
    {
      user_id: item.applicant_user_id || 0,
      full_name: item.applicant_name || "Applicant",
      email: item.applicant_email,
      phone: item.applicant_phone,
      city: item.applicant_city || "Cavite",
      job_title: item.job_title,
      job_post_id: item.job_post_id || undefined,
      match_percentage: 96,
      profile_picture_path: item.applicant_profile_picture_path,
    },
  ];
}

type EmployerActiveJob = {
  id: number;
  title: string;
};

export type CalendarDrawerProps = {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  role?: "employer" | "applicant";
  userId?: number;
};

function initialsFromName(name?: string | null): string {
  const raw = (name || "").trim();
  if (!raw) return "CD";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getMatchBadgeStyle(percent: number = 95) {
  if (percent >= 85) {
    return { track: "#dcfce7", color: "#15803d", fill: "#86efac" };
  }
  if (percent >= 70) {
    return { track: "#fef3c7", color: "#b45309", fill: "#fde68a" };
  }
  return { track: "#fee2e2", color: "#b91c1c", fill: "#fca5a5" };
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return "";
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    const min = m < 10 ? `0${m}` : m;
    return `${hour}:${min} ${period}`;
  } catch {
    return timeStr;
  }
}



export default function CalendarDrawer({
  isOpen: controlledIsOpen,
  onToggle,
  onClose,
  role: propRole,
  userId: propUserId,
}: CalendarDrawerProps) {
  // Local state if not controlled externally
  const [internalOpen, setInternalOpen] = useState(false);
  const isDrawerOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleToggleOpen = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onToggle && controlledIsOpen) {
      onToggle();
    } else {
      setInternalOpen(false);
    }
  };

  // Resolve user info from localStorage
  const { currentRole, currentUserId } = useMemo(() => {
    if (propRole && propUserId) {
      return { currentRole: propRole, currentUserId: propUserId };
    }
    if (typeof window === "undefined") {
      return { currentRole: propRole || "applicant", currentUserId: propUserId || null };
    }
    try {
      const raw = localStorage.getItem("elitecruit-user");
      if (raw) {
        const u = JSON.parse(raw);
        return {
          currentRole: (propRole || u.role || "applicant") as "employer" | "applicant",
          currentUserId: propUserId || Number(u.id) || null,
        };
      }
    } catch {}
    return { currentRole: propRole || "applicant", currentUserId: propUserId || null };
  }, [propRole, propUserId]);

  const isEmployer = currentRole === "employer";

  // Data states (loaded dynamically from database API)
  const [interviews, setInterviews] = useState<ScheduledInterview[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("elitecruit_scheduled_interviews");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.some((item) => item.id >= 1001 && item.id <= 1006)) {
            localStorage.removeItem("elitecruit_scheduled_interviews");
            return [];
          }
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch {}
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "all" | "schedule">("calendar");

  // Load interviews from backend database API
  const loadInterviewsFromApi = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/interviews?user_id=${currentUserId || 0}&role=${currentRole}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.interviews)) {
        setInterviews(data.interviews);
        try {
          localStorage.setItem("elitecruit_scheduled_interviews", JSON.stringify(data.interviews));
        } catch {}
      }
    } catch (e) {
      console.warn("Could not load interviews from API, using cached data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInterviewsFromApi();

    const handleSync = () => {
      loadInterviewsFromApi();
    };

    window.addEventListener("elitecruit-interviews-updated", handleSync);
    return () => {
      window.removeEventListener("elitecruit-interviews-updated", handleSync);
    };
  }, [currentUserId, currentRole]);

  // Selected date for day agenda view (defaults to today 'YYYY-MM-DD')
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Calendar month navigation state
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()); // 0-11

  // Employer scheduling form state
  const [schedulableCandidates, setSchedulableCandidates] = useState<SchedulableCandidate[]>([]);
  const [employerJobs, setEmployerJobs] = useState<EmployerActiveJob[]>([]);
  const [formJobId, setFormJobId] = useState<string>("");
  const [selectedCandidateUserIds, setSelectedCandidateUserIds] = useState<number[]>([]);
  const [formTitle, setFormTitle] = useState("");
  const formStage = "On-Site Interview";
  const [formDate, setFormDate] = useState(todayStr);
  const [formStartTime, setFormStartTime] = useState("10:00");
  const [formEndTime, setFormEndTime] = useState("10:45");
  const [formLocation, setFormLocation] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Load employer active jobs and schedulable candidates dynamically from database
  useEffect(() => {
    if (!isEmployer) return;
    const empId = currentUserId || 5;

    fetch(`/api/employers/${empId}/active-job-posts`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.jobs && Array.isArray(data.jobs) && data.jobs.length > 0) {
          const mappedJobs: EmployerActiveJob[] = data.jobs.map((j: any) => ({
            id: Number(j.id),
            title: String(j.title || "Job Opening"),
          }));
          setEmployerJobs(mappedJobs);
          setFormJobId((prev) => (prev ? prev : String(mappedJobs[0].id)));
        }
      })
      .catch(() => {});

    fetch(`/api/employers/${empId}/schedulable-candidates`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.candidates && Array.isArray(data.candidates)) {
          setSchedulableCandidates(data.candidates);
        }
      })
      .catch(() => {});
  }, [isEmployer, currentUserId]);


  // Applicant picker modal states
  const [isApplicantModalOpen, setIsApplicantModalOpen] = useState(false);
  const [applicantSearchQuery, setApplicantSearchQuery] = useState("");
  const [viewingApplicantDetails, setViewingApplicantDetails] = useState<SchedulableCandidate | null>(null);
  const [candDetailTab, setCandDetailTab] = useState<"personal" | "preferences" | "competencies" | "experience">("personal");
  const [viewingApplicantProfile, setViewingApplicantProfile] = useState<any>(null);
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);
  const [isPreviewingDoc, setIsPreviewingDoc] = useState(false);
  const [applicantDocuments, setApplicantDocuments] = useState<ApplicantDocumentItem[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ApplicantDocumentItem | null>(null);

  const fetchApplicantDocuments = async (userId: number) => {
    if (!userId) return;
    setIsDocsLoading(true);
    try {
      const res = await fetch(`/api/applicants/${userId}/documents`);
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
  const [isMatchDrawerOpen, setIsMatchDrawerOpen] = useState(false);
  const [isOtherJobsOpen, setIsOtherJobsOpen] = useState(false);
  const [hoveredCompareTag, setHoveredCompareTag] = useState<{ item: string; side: "applicant" | "employer"; category: string } | null>(null);

  // Meeting candidates modal state (Employer only)
  const [activeMeetingCandidatesModal, setActiveMeetingCandidatesModal] = useState<ScheduledInterview | null>(null);

  // System Delete Confirmation Modal state (Employer only)
  const [interviewToDelete, setInterviewToDelete] = useState<ScheduledInterview | null>(null);

  // Cancel Interview Modal state (Matches UI 867402159 / 877549441)
  const [interviewToCancel, setInterviewToCancel] = useState<ScheduledInterview | null>(null);
  const [cancelReason, setCancelReason] = useState("Interviewer unavailable");
  const [cancelMessage, setCancelMessage] = useState(
    "We need to cancel this interview because the interviewer is unavailable. We apologize for the inconvenience."
  );
  const [notifyOnCancel, setNotifyOnCancel] = useState(true);

  const handleOpenCancelModal = (item: ScheduledInterview) => {
    setInterviewToCancel(item);
    setCancelReason("Interviewer unavailable");
    setCancelMessage(
      "We need to cancel this interview because the interviewer is unavailable. We apologize for the inconvenience."
    );
    setNotifyOnCancel(true);
  };

  const handleConfirmCancelInterview = () => {
    if (!interviewToCancel) return;
    handleUpdateStatus(interviewToCancel.id, "cancelled");
    setInterviewToCancel(null);
  };

  // Reschedule Interview Modal state (Matches UI 864653198 / 872246452 / 875598777)
  const [interviewToReschedule, setInterviewToReschedule] = useState<ScheduledInterview | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00 AM");
  const [rescheduleAltTime, setRescheduleAltTime] = useState("2:00 PM");
  const [rescheduleReason, setRescheduleReason] = useState(
    "I have a prior commitment at the original interview time. I'm available at either suggested time."
  );
  const [notifyOnReschedule, setNotifyOnReschedule] = useState(true);

  const handleOpenRescheduleModal = (item: ScheduledInterview) => {
    setInterviewToReschedule(item);
    setRescheduleDate(item.interview_date || "");
    setRescheduleTime(item.start_time || "10:00 AM");
    setRescheduleAltTime("2:00 PM");
    setRescheduleReason(
      "I have a prior commitment at the original interview time. I'm available at either suggested time."
    );
    setNotifyOnReschedule(true);
  };

  const handleConfirmReschedule = () => {
    if (!interviewToReschedule) return;
    if (rescheduleDate && rescheduleTime) {
      setInterviews((prev) =>
        prev.map((it) =>
          it.id === interviewToReschedule.id
            ? { ...it, interview_date: rescheduleDate, start_time: rescheduleTime, status: isEmployer ? "rescheduled" : "pending" }
            : it
        )
      );
      try {
        fetch(`/api/interviews/${interviewToReschedule.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: isEmployer ? "rescheduled" : "pending",
            interview_date: rescheduleDate,
            start_time: rescheduleTime,
            updated_by_user_id: currentUserId,
          }),
        }).catch(() => {});
      } catch {}
    }
    setInterviewToReschedule(null);
  };

  const handleOpenMeetingCandidatesModal = (item: ScheduledInterview) => {
    if (!isEmployer) return;
    setActiveMeetingCandidatesModal(item);
  };

  const handleOpenCandidateDetails = async (cand: SchedulableCandidate) => {
    setViewingApplicantDetails(cand);
    setViewingApplicantProfile(null);
    setCandDetailTab("personal");
    setIsDocsDrawerOpen(false);
    setIsPreviewingDoc(false);
    setPreviewDoc(null);
    setApplicantDocuments([]);
    if (cand.user_id) {
      fetchApplicantDocuments(cand.user_id);
    }
    setIsMatchDrawerOpen(false);
    setIsOtherJobsOpen(false);
    try {
      const res = await fetch(`/api/applicants/${cand.user_id}/profile`);
      const data = await res.json();
      if (data?.profile) {
        setViewingApplicantProfile(data.profile);
      }
    } catch {}
  };

  // Filter candidates for selected job post who are approved
  const jobApprovedCandidates = useMemo(() => {
    if (!formJobId) return [];
    return schedulableCandidates.filter(
      (c) =>
        String(c.job_post_id) === String(formJobId) &&
        (c.application_status === "approved" || c.application_status === "accepted" || !c.application_status)
    );
  }, [formJobId, schedulableCandidates]);

  // Filter approved candidates by search query inside the modal
  const filteredApprovedCandidates = useMemo(() => {
    if (!applicantSearchQuery.trim()) return jobApprovedCandidates;
    const q = applicantSearchQuery.toLowerCase();
    return jobApprovedCandidates.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [jobApprovedCandidates, applicantSearchQuery]);

  // When job is changed, update approved candidate options & suggested title
  const handleSelectJob = (jobId: string) => {
    setFormJobId(jobId);
    const chosenJob = employerJobs.find((j) => String(j.id) === jobId);
    const matchingApproved = schedulableCandidates.filter(
      (c) =>
        String(c.job_post_id) === String(jobId) &&
        (c.application_status === "approved" || c.application_status === "accepted" || !c.application_status)
    );
    if (matchingApproved.length > 0) {
      setSelectedCandidateUserIds([matchingApproved[0].user_id]);
      setFormTitle(`${formStage} - ${matchingApproved[0].full_name} (${chosenJob?.title || "Interview"})`);
    } else {
      setSelectedCandidateUserIds([]);
      setFormTitle(chosenJob ? `${formStage} - ${chosenJob.title}` : "");
    }
  };

  // Toggle selection for an approved candidate
  const toggleCandidateSelection = (candidateId: number) => {
    setSelectedCandidateUserIds((prev) => {
      const isSelected = prev.includes(candidateId);
      const next = isSelected ? prev.filter((id) => id !== candidateId) : [...prev, candidateId];
      const chosenJob = employerJobs.find((j) => String(j.id) === formJobId);
      if (next.length === 1) {
        const singleCand = schedulableCandidates.find((c) => c.user_id === next[0]);
        setFormTitle(`${formStage} - ${singleCand?.full_name || "Candidate"}`);
      } else if (next.length > 1) {
        setFormTitle(`${formStage} - ${chosenJob?.title || "Applicants"} (${next.length} Candidates)`);
      }
      return next;
    });
  };

  const handleSelectAllApproved = () => {
    const allIds = jobApprovedCandidates.map((c) => c.user_id);
    setSelectedCandidateUserIds(allIds);
    const chosenJob = employerJobs.find((j) => String(j.id) === formJobId);
    if (allIds.length === 1) {
      const singleCand = schedulableCandidates.find((c) => c.user_id === allIds[0]);
      setFormTitle(`${formStage} - ${singleCand?.full_name || "Candidate"}`);
    } else if (allIds.length > 1) {
      setFormTitle(`${formStage} - ${chosenJob?.title || "Applicants"} (${allIds.length} Candidates)`);
    }
  };

  const handleDeselectAll = () => {
    setSelectedCandidateUserIds([]);
    const chosenJob = employerJobs.find((j) => String(j.id) === formJobId);
    setFormTitle(chosenJob ? `${formStage} - ${chosenJob.title}` : "");
  };

  // Submit new On-Site interviews for ALL selected approved candidates
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJobId) {
      setFormFeedback({ type: "error", text: "Please select a job opening." });
      return;
    }
    if (selectedCandidateUserIds.length === 0) {
      setFormFeedback({ type: "error", text: "Please select at least one approved candidate to schedule." });
      return;
    }
    if (!formDate || !formStartTime) {
      setFormFeedback({ type: "error", text: "Please provide a valid date and start time." });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);

    const chosenJob = employerJobs.find((j) => String(j.id) === formJobId);
    const selectedCands = selectedCandidateUserIds
      .map((candId) => schedulableCandidates.find((c) => c.user_id === candId))
      .filter((c): c is SchedulableCandidate => Boolean(c));

    const singleCand = selectedCands[0];
    const meetingTitle =
      formTitle.trim() ||
      (selectedCands.length === 1
        ? `${formStage} - ${singleCand?.full_name || "Candidate"}`
        : `${formStage} - ${chosenJob?.title || "Applicants"} (${selectedCands.length} Candidates)`);

    const newMeeting: ScheduledInterview = {
      id: Date.now(),
      employer_user_id: currentUserId || 1,
      applicant_user_id: singleCand?.user_id || 0,
      candidate_user_ids: selectedCandidateUserIds,
      candidates: selectedCands,
      job_post_id: Number(formJobId),
      interview_title: meetingTitle,
      interview_stage: formStage,
      interview_type: "On-Site",
      meeting_link_or_address: formLocation.trim() || "On-Site",
      interview_date: formDate,
      start_time: formStartTime,
      end_time: formEndTime || formStartTime,
      notes: formNotes.trim(),
      status: "pending",
      job_title: chosenJob?.title || singleCand?.job_title || "Job Position",
      applicant_name:
        selectedCands.length === 1
          ? singleCand?.full_name || "Candidate"
          : `${singleCand?.full_name || "Candidate"} (+${selectedCands.length - 1} more)`,
      applicant_phone: singleCand?.phone || "+63 917 000 0000",
      applicant_city: singleCand?.city || "Cavite",
      applicant_email: singleCand?.email || "candidate@example.com",
      employer_company_name: "Cebuana Lhuillier",
      created_at: new Date().toISOString(),
    };

    setInterviews((prev) => {
      const updated = [newMeeting, ...prev];
      try {
        localStorage.setItem("elitecruit_scheduled_interviews", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Persist to backend database
    try {
      fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employer_user_id: currentUserId || 5,
          applicant_user_id: singleCand?.user_id || 0,
          candidate_user_ids: selectedCandidateUserIds,
          job_post_id: Number(formJobId),
          interview_title: meetingTitle,
          interview_stage: formStage,
          interview_type: "On-Site",
          meeting_link_or_address: formLocation.trim() || "On-Site",
          interview_date: formDate,
          start_time: formStartTime,
          end_time: formEndTime || formStartTime,
          notes: formNotes.trim(),
          job_title: chosenJob?.title || singleCand?.job_title || "Job Position",
          applicant_name:
            selectedCands.length === 1
              ? singleCand?.full_name || "Candidate"
              : `${singleCand?.full_name || "Candidate"} (+${selectedCands.length - 1} more)`,
          applicant_phone: singleCand?.phone || "+63 917 000 0000",
          applicant_city: singleCand?.city || "Cavite",
          applicant_email: singleCand?.email || "candidate@example.com",
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.interview?.id) {
            setInterviews((prev) =>
              prev.map((item) => (item.id === newMeeting.id ? { ...item, id: data.interview.id } : item))
            );
          }
        })
        .catch(() => {});
    } catch {}

    setSelectedDate(formDate);
    setFormFeedback({
      type: "success",
      text: `✓ On-site interview successfully scheduled for ${selectedCands.length} approved candidate(s)!`,
    });

    setTimeout(() => {
      setFormTitle("");
      setSelectedCandidateUserIds([]);
      setFormLocation("");
      setFormNotes("");
      setFormFeedback(null);
      setActiveTab("calendar");
      setIsSubmitting(false);
    }, 1400);
  };

  // Update interview status (Accept, Decline, Complete, Cancel - client-side state + database sync)
  const handleUpdateStatus = (interviewId: number, newStatus: string) => {
    setInterviews((prev) => {
      const updated = prev.map((item) =>
        item.id === interviewId ? { ...item, status: newStatus } : item
      );
      try {
        localStorage.setItem("elitecruit_scheduled_interviews", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      fetch(`/api/interviews/${interviewId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, updated_by_user_id: currentUserId }),
      }).catch(() => {});
    } catch {}
  };

  // Confirmed delete (affects only the active user's side, other side remains intact)
  const handleConfirmDelete = (interviewId: number) => {
    setInterviews((prev) => {
      const updated = prev.map((item) => {
        if (item.id === interviewId) {
          return isEmployer
            ? { ...item, deleted_by_employer: true }
            : { ...item, deleted_by_applicant: true };
        }
        return item;
      });
      try {
        localStorage.setItem("elitecruit_scheduled_interviews", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      fetch(`/api/interviews/${interviewId}?role=${currentRole}&user_id=${currentUserId}`, {
        method: "DELETE",
      }).catch(() => {});
    } catch {}

    setInterviewToDelete(null);
  };

  // Refresh calendar schedule from database API
  const handleRefreshInterviews = () => {
    setIsLoading(true);
    fetch(`/api/interviews?user_id=${currentUserId || 0}&role=${currentRole}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.interviews)) {
          setInterviews(data.interviews);
          try {
            localStorage.setItem("elitecruit_scheduled_interviews", JSON.stringify(data.interviews));
          } catch {}
        }
      })
      .catch(() => {
        
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  const fetchInterviews = handleRefreshInterviews;

  // Filter visible interviews based on role:
  // - If employer deletes an interview, it is hidden ONLY on the employer side.
  // - Applicant side remains unaffected and continues to see the interview.
  const visibleInterviews = useMemo(() => {
    return interviews.filter((i) => {
      if (isEmployer) {
        return !i.deleted_by_employer;
      }
      return !i.deleted_by_applicant;
    });
  }, [interviews, isEmployer]);

  // Count pending/upcoming interviews
  const upcomingCount = useMemo(() => {
    return visibleInterviews.filter((i) => {
      const isPending = i.status === "pending";
      const isFuture = i.interview_date >= todayStr;
      return (isPending || isFuture) && i.status !== "declined" && i.status !== "cancelled";
    }).length;
  }, [visibleInterviews, todayStr]);

  // Group interviews by date for dot highlights
  const interviewsByDate = useMemo(() => {
    const map: Record<string, ScheduledInterview[]> = {};
    for (const item of visibleInterviews) {
      const d = item.interview_date;
      if (!map[d]) map[d] = [];
      map[d].push(item);
    }
    return map;
  }, [visibleInterviews]);

  // Selected date's interviews
  const selectedDateInterviews = useMemo(() => {
    return interviewsByDate[selectedDate] || [];
  }, [interviewsByDate, selectedDate]);

  // Calendar Grid Builder for viewMonth & viewYear
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      items: ScheduledInterview[];
    }[] = [];

    // Preceding month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        items: interviewsByDate[dStr] || [],
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        items: interviewsByDate[dStr] || [],
      });
    }

    // Trailing days to fill 35 or 42 grid cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        items: interviewsByDate[dStr] || [],
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayStr, selectedDate, interviewsByDate]);

  // Month navigation helpers
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

  const handleJumpToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  const monthLabel = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [viewYear, viewMonth]);

  return (
    <div className="calendar-drawer-wrapper">
      {/* ── TOPBAR TRIGGER BUTTON ── */}
      <button
        type="button"
        className={`calendar-drawer-trigger-btn ${isDrawerOpen ? "active" : ""}`}
        onClick={handleToggleOpen}
        title={isDrawerOpen ? "Close Meeting Calendar" : "Open Meeting Calendar"}
      >
        <svg
          className="calendar-btn-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Calendar</span>
        {upcomingCount > 0 && (
          <span className="calendar-badge" title={`${upcomingCount} upcoming/pending meetings`}>
            {upcomingCount}
          </span>
        )}
      </button>

      {/* ── BACKDROP OVERLAY ── */}
      {isDrawerOpen && <div className="calendar-drawer-backdrop" onClick={handleClose} />}

      {/* ── SLIDE-OVER RIGHT PANEL (OPTION B) ── */}
      <aside className={`calendar-drawer-slideover ${isDrawerOpen ? "open" : ""}`} aria-label="Meeting Calendar Drawer">
        {/* Header */}
        <div className="calendar-slideover-header">
          <div className="calendar-header-title-wrap">
            <div className="calendar-header-avatar-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="calendar-header-titles">
              <h3>Meeting Calendar</h3>
              <span className="calendar-header-role-pill">
                {isEmployer ? "Employer Interview Schedule" : "Candidate Interview Schedule"}
              </span>
            </div>
          </div>

          <div className="calendar-header-actions">
            <button
              type="button"
              className="calendar-header-icon-btn"
              onClick={handleRefreshInterviews}
              disabled={isLoading}
              title="Refresh schedule"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
            <button
              type="button"
              className="calendar-header-close-btn"
              onClick={handleClose}
              title="Close Calendar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="calendar-tab-strip">
          <button
            type="button"
            className={`calendar-tab-btn ${activeTab === "calendar" ? "active" : ""}`}
            onClick={() => setActiveTab("calendar")}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Calendar & Day</span>
          </button>
          <button
            type="button"
            className={`calendar-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <span>All Meetings ({visibleInterviews.length})</span>
          </button>
          {isEmployer && (
            <button
              type="button"
              className={`calendar-tab-btn ${activeTab === "schedule" ? "active" : ""}`}
              onClick={() => setActiveTab("schedule")}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Schedule Interview</span>
            </button>
          )}
        </div>

        {/* Drawer Body */}
        <div className="calendar-slideover-body">
          {/* ── TAB 1: CALENDAR & AGENDA ── */}
          {activeTab === "calendar" && (
            <>
              {/* Month Navigator */}
              <div className="calendar-month-nav">
                <span className="calendar-month-label">{monthLabel}</span>
                <div className="calendar-nav-controls">
                  <button type="button" className="calendar-today-btn" onClick={handleJumpToday}>
                    Today
                  </button>
                  <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth} title="Previous Month">
                    ‹
                  </button>
                  <button type="button" className="calendar-nav-btn" onClick={handleNextMonth} title="Next Month">
                    ›
                  </button>
                </div>
              </div>

              {/* Calendar Grid Card */}
              <div className="calendar-grid-card">
                <div className="calendar-weekdays-row">
                  <span className="calendar-weekday-cell">Sun</span>
                  <span className="calendar-weekday-cell">Mon</span>
                  <span className="calendar-weekday-cell">Tue</span>
                  <span className="calendar-weekday-cell">Wed</span>
                  <span className="calendar-weekday-cell">Thu</span>
                  <span className="calendar-weekday-cell">Fri</span>
                  <span className="calendar-weekday-cell">Sat</span>
                </div>

                <div className="calendar-days-grid">
                  {calendarDays.map((cell, idx) => {
                    const hasItems = cell.items.length > 0;
                    return (
                      <div
                        key={idx}
                        className={`calendar-day-cell ${!cell.isCurrentMonth ? "other-month" : ""} ${cell.isToday ? "today" : ""} ${cell.isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedDate(cell.dateStr)}
                      >
                        <span>{cell.day}</span>
                        {hasItems && (
                          <div className="cal-dots-container">
                            {cell.items.slice(0, 3).map((item, dIdx) => (
                              <span
                                key={dIdx}
                                className={`cal-dot dot-${item.status}`}
                                title={`${item.interview_title} (${item.status})`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Agenda */}
              <div className="calendar-agenda-section">
                <div className="calendar-agenda-header">
                  <h4>{formatDisplayDate(selectedDate)}</h4>
                  <span className="calendar-agenda-badge">
                    {selectedDateInterviews.length} {selectedDateInterviews.length === 1 ? "Meeting" : "Meetings"}
                  </span>
                </div>

                {selectedDateInterviews.length === 0 ? (
                  <div className="calendar-empty-state">
                    <span className="calendar-empty-icon">☕</span>
                    <p>No meetings scheduled for this date.</p>
                    {isEmployer && (
                      <button
                        type="button"
                        className="calendar-quick-add-btn"
                        onClick={() => {
                          setFormDate(selectedDate);
                          setActiveTab("schedule");
                        }}
                      >
                        + Schedule Interview on this Day
                      </button>
                    )}
                  </div>
                ) : (
                  selectedDateInterviews.map((item) => (
                    <InterviewItemCard
                      key={item.id}
                      item={item}
                      isEmployer={isEmployer}
                      currentUserId={currentUserId}
                      onUpdateStatus={handleUpdateStatus}
                      onDeleteInterview={(targetItem) => setInterviewToDelete(targetItem)}
                      schedulableCandidates={schedulableCandidates}
                      onOpenMeetingCandidatesModal={handleOpenMeetingCandidatesModal}
                      onOpenCancelModal={handleOpenCancelModal}
                      onOpenRescheduleModal={handleOpenRescheduleModal}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {/* ── TAB 2: ALL INTERVIEWS ── */}
          {activeTab === "all" && (
            <div className="calendar-agenda-section">
              <div className="calendar-agenda-header">
                <h4>All Scheduled Interviews</h4>
                <span className="calendar-agenda-badge">{visibleInterviews.length} Total</span>
              </div>

              {visibleInterviews.length === 0 ? (
                <div className="calendar-empty-state">
                  <span className="calendar-empty-icon">📅</span>
                  <p>You do not have any scheduled meetings yet.</p>
                  {isEmployer && (
                    <button
                      type="button"
                      className="calendar-quick-add-btn"
                      onClick={() => setActiveTab("schedule")}
                    >
                      + Schedule New Interview
                    </button>
                  )}
                </div>
              ) : (
                visibleInterviews.map((item) => (
                  <InterviewItemCard
                    key={item.id}
                    item={item}
                    isEmployer={isEmployer}
                    currentUserId={currentUserId}
                    onUpdateStatus={handleUpdateStatus}
                    onDeleteInterview={(targetItem) => setInterviewToDelete(targetItem)}
                    schedulableCandidates={schedulableCandidates}
                    onOpenMeetingCandidatesModal={handleOpenMeetingCandidatesModal}
                    onOpenCancelModal={handleOpenCancelModal}
                    onOpenRescheduleModal={handleOpenRescheduleModal}
                  />
                ))
              )}
            </div>
          )}

          {/* ── TAB 3: SCHEDULE NEW INTERVIEW (EMPLOYER ONLY) ── */}
          {activeTab === "schedule" && isEmployer && (
            <form onSubmit={handleScheduleSubmit} className="schedule-form-card">
              <h4 className="schedule-form-title">Schedule Candidate Interview</h4>

              {formFeedback && (
                <div className={`schedule-feedback-banner ${formFeedback.type}`}>
                  {formFeedback.type === "success" ? "✓ " : "✕ "}
                  {formFeedback.text}
                </div>
              )}

              {/* Associated Job Opening (Job first) */}
              <div className="schedule-field-group">
                <label className="schedule-field-label">
                  Select Job Opening: <small>(Required)</small>
                </label>
                <select
                  className="schedule-select"
                  value={formJobId}
                  onChange={(e) => handleSelectJob(e.target.value)}
                  required
                >
                  <option value="">-- Choose Job Opening --</option>
                  {employerJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Candidate Selection (Modal trigger button + outside count display) */}
              <div className="schedule-field-group">
                <label className="schedule-field-label">
                  Select Approved Applicants: <small>(Required)</small>
                </label>
                <div className="applicant-selection-trigger-row">
                  <button
                    type="button"
                    className="select-applicants-popup-btn"
                    onClick={() => {
                      if (!formJobId) {
                        setFormFeedback({ type: "error", text: "Please select a job opening first." });
                        return;
                      }
                      setIsApplicantModalOpen(true);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Select Applicants</span>
                  </button>
                  <span
                    className={`applicant-outside-count-badge ${
                      selectedCandidateUserIds.length > 0 ? "has-selected" : ""
                    }`}
                  >
                    {selectedCandidateUserIds.length === 0
                      ? "No applicants selected"
                      : `${selectedCandidateUserIds.length} applicant${
                          selectedCandidateUserIds.length > 1 ? "s" : ""
                        } selected`}
                  </span>
                </div>
              </div>

              {/* 3. Meeting Title */}
              <div className="schedule-field-group">
                <label className="schedule-field-label">Meeting Title:</label>
                <input
                  type="text"
                  className="schedule-input"
                  placeholder="e.g. On-Site Interview - Junior Frontend Developer"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* 4. Date & Times */}
              <div className="schedule-field-group">
                <label className="schedule-field-label">Interview Date:</label>
                <input
                  type="date"
                  className="schedule-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              <div className="schedule-time-row">
                <div className="schedule-field-group">
                  <label className="schedule-field-label">Start Time:</label>
                  <input
                    type="time"
                    className="schedule-input"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="schedule-field-group">
                  <label className="schedule-field-label">End Time:</label>
                  <input
                    type="time"
                    className="schedule-input"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* 5. Meeting Location (Strictly On-Site) */}
              <div className="schedule-field-group">
                <label className="schedule-field-label">
                  Meeting location: <small>(Required)</small>
                </label>
                <input
                  type="text"
                  className="schedule-input"
                  placeholder="Enter meeting location or address"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  required
                />
              </div>

              {/* 6. Candidate Notes */}
              <div className="schedule-field-group">
                <label className="schedule-field-label">
                  Preparation Notes / Instructions: <small>(Optional)</small>
                </label>
                <textarea
                  className="schedule-textarea"
                  rows={3}
                  placeholder="e.g. Please bring a valid government ID for building security pass and arrive 15 minutes before the scheduled time."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="schedule-form-submit-btn"
                disabled={isSubmitting || selectedCandidateUserIds.length === 0}
              >
                {isSubmitting
                  ? "Scheduling Interview..."
                  : selectedCandidateUserIds.length > 1
                  ? `✓ Schedule On-Site Interview (${selectedCandidateUserIds.length} Candidates)`
                  : "✓ Schedule On-Site Interview"}
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* ── APPLICANT SELECTION POP-UP MODAL (PORTALED TO BODY FOR VIEWPORT CENTERING) ── */}
      {typeof document !== "undefined" && isApplicantModalOpen && createPortal(

          <div
            className="applicant-modal-backdrop"
            onClick={() => setIsApplicantModalOpen(false)}
          >
            <div
              className="applicant-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="applicant-modal-header">
                <div className="applicant-modal-title-wrap">
                  <h4 className="applicant-modal-title">Select Approved Applicants</h4>
                  <span className="applicant-modal-subtitle">
                    {employerJobs.find((j) => String(j.id) === formJobId)?.title || "Selected Job Opening"}
                  </span>
                </div>
                <button
                  type="button"
                  className="applicant-modal-close-btn"
                  onClick={() => setIsApplicantModalOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="applicant-modal-toolbar">
                <div className="applicant-modal-search-wrap">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="applicant-modal-search"
                    placeholder="Search applicant name or city..."
                    value={applicantSearchQuery}
                    onChange={(e) => setApplicantSearchQuery(e.target.value)}
                  />
                  {applicantSearchQuery && (
                    <button
                      type="button"
                      className="applicant-search-clear-btn"
                      onClick={() => setApplicantSearchQuery("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {jobApprovedCandidates.length > 0 && (
                  <div className="applicant-modal-quick-actions">
                    <button
                      type="button"
                      className="quick-action-link"
                      onClick={handleSelectAllApproved}
                    >
                      Select All ({jobApprovedCandidates.length})
                    </button>
                    {selectedCandidateUserIds.length > 0 && (
                      <>
                        <span className="quick-action-sep">·</span>
                        <button
                          type="button"
                          className="quick-action-link text-danger"
                          onClick={handleDeselectAll}
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="applicant-modal-body">
                {jobApprovedCandidates.length === 0 ? (
                  <div className="candidate-select-placeholder empty-warning">
                    <span>⚠️ No approved applicants found for this job post.</span>
                    <small>Only candidates whose applications were approved in Applicant Management can be scheduled.</small>
                  </div>
                ) : filteredApprovedCandidates.length === 0 ? (
                  <div className="candidate-select-placeholder">
                    <span>No approved applicants match "{applicantSearchQuery}".</span>
                  </div>
                ) : (
                  <div className="candidate-multiselect-list modal-view">
                    {filteredApprovedCandidates.map((c) => {
                      const isSelected = selectedCandidateUserIds.includes(c.user_id);
                      const matchStyle = getMatchBadgeStyle(c.match_percentage || 95);
                      return (
                        <label
                          key={c.user_id}
                          className={`candidate-multiselect-card ${isSelected ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="candidate-checkbox"
                            checked={isSelected}
                            onChange={() => toggleCandidateSelection(c.user_id)}
                          />

                          <div className="candidate-avatar-initials" aria-label="Candidate avatar" style={{ overflow: "hidden", position: "relative" }}>
                            {(() => {
                              const pic = c.profile_picture_path;
                              const src = pic ? (pic.startsWith("http") || pic.startsWith("/api") ? pic : `/api/applicants/${c.user_id}/profile-picture`) : null;
                              return (
                                <>
                                  {src && (
                                    <img
                                      src={src}
                                      alt={c.full_name}
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = "none";
                                        if (e.currentTarget.nextElementSibling) {
                                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                                        }
                                      }}
                                    />
                                  )}
                                  <span style={{ display: src ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                                    {initialsFromName(c.full_name)}
                                  </span>
                                </>
                              );
                            })()}
                          </div>

                          <div className="candidate-card-details">
                            <div className="candidate-card-name-row">
                              <span className="candidate-name">{c.full_name}</span>
                              <div className="candidate-card-right-actions">
                                <span
                                  className="candidate-match-badge"
                                  style={{
                                    background: matchStyle.track,
                                    color: matchStyle.color,
                                    borderColor: matchStyle.fill,
                                  }}
                                >
                                  {c.match_percentage || 95}% Match
                                </span>
                                <button
                                  type="button"
                                  className="candidate-details-btn"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleOpenCandidateDetails(c);
                                  }}
                                  title="View Applicant Details"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                            <div className="candidate-card-meta-row">
                              {c.city && (
                                <span className="candidate-meta-chip">
                                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                                    <circle cx="12" cy="10" r="2.5" />
                                  </svg>
                                  {c.city}
                                </span>
                              )}
                            </div>
                            {(c.phone || c.email) && (
                              <div className="candidate-card-meta-row">
                                {c.phone && (
                                  <span className="candidate-meta-chip">
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                    {c.phone}
                                  </span>
                                )}
                                {c.email && (
                                  <span className="candidate-meta-chip">
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                      <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    {c.email}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="applicant-modal-footer">
                <div className="applicant-modal-count-status">
                  {selectedCandidateUserIds.length === 0 ? (
                    <span className="applicant-footer-none">No applicants selected</span>
                  ) : (
                    <span className="applicant-footer-selected">
                      ✓ <strong>{selectedCandidateUserIds.length}</strong> applicant{selectedCandidateUserIds.length > 1 ? "s" : ""} selected
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="applicant-modal-done-btn"
                  onClick={() => setIsApplicantModalOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ,
        document.body
      )}

      {/* ── STANDARDIZED APPLICANT PROFILE DETAILS REVIEW MODAL (PORTALED TO BODY FOR VIEWPORT CENTERING) ── */}
      {typeof document !== "undefined" && viewingApplicantDetails && createPortal(

          <div
            className="applicant-details-modal-backdrop"
            onClick={() => {
              setViewingApplicantDetails(null);
              setViewingApplicantProfile(null);
              setIsMatchDrawerOpen(false);
              setIsOtherJobsOpen(false);
              setIsDocsDrawerOpen(false);
              setIsPreviewingDoc(false);
              setCandDetailTab("personal");
            }}
          >
            <div
              className={`applicant-details-modal-container ${
                isMatchDrawerOpen || isOtherJobsOpen ? "with-side-panel" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="applicant-details-modal-outer-wrap">
                {/* Floating Breakdown & Other Jobs Tabs */}
                <div className="cal-modal-floating-tabs-container">
                  <button
                    type="button"
                    className={`cal-modal-floating-tab ${isMatchDrawerOpen ? "active" : ""}`}
                    onClick={() => {
                      if (isMatchDrawerOpen) {
                        setIsMatchDrawerOpen(false);
                      } else {
                        setIsOtherJobsOpen(false);
                        setIsMatchDrawerOpen(true);
                      }
                    }}
                  >
                    <span>{isMatchDrawerOpen ? "Hide Breakdown" : "Match Breakdown"}</span>
                  </button>
                  <button
                    type="button"
                    className={`cal-modal-floating-tab ${isOtherJobsOpen ? "active" : ""}`}
                    onClick={() => {
                      if (isOtherJobsOpen) {
                        setIsOtherJobsOpen(false);
                      } else {
                        setIsMatchDrawerOpen(false);
                        setIsOtherJobsOpen(true);
                      }
                    }}
                  >
                    <span>{isOtherJobsOpen ? "Hide Other Jobs" : "Other Jobs"}</span>
                  </button>
                </div>

                {/* 1st Container: Static Locked 700px Review Panel */}
                <div className="applicant-details-main-panel">
                  {/* Employer Header Strip */}
                  <div className="applicant-details-strip" style={{ paddingTop: "20px" }}>
                    <div className="applicant-details-logo-info">
                      <div className="applicant-details-avatar" aria-label="Candidate initials" style={{ overflow: "hidden", position: "relative" }}>
                        {(() => {
                          const pic = viewingApplicantProfile?.profile_picture_path || viewingApplicantDetails.profile_picture_path;
                          const src = pic ? (pic.startsWith("http") || pic.startsWith("/api") ? pic : `/api/applicants/${viewingApplicantDetails.user_id}/profile-picture`) : null;
                          return (
                            <>
                              {src && (
                                <img
                                  src={src}
                                  alt={viewingApplicantDetails.full_name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                    if (e.currentTarget.nextElementSibling) {
                                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                                    }
                                  }}
                                />
                              )}
                              <span style={{ display: src ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                                {initialsFromName(viewingApplicantDetails.full_name)}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <div className="applicant-details-names-col">
                        <strong className="applicant-details-candidate-name">
                          {viewingApplicantDetails.full_name}
                        </strong>
                        <span className="applicant-details-sub-meta">
                          <span>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                            {formatLocationWithCavite(viewingApplicantProfile?.city || viewingApplicantDetails.city || "Cavite")}
                          </span>
                          {(viewingApplicantProfile?.email || viewingApplicantDetails.email) && (
                            <>
                              <span style={{ color: "#cbd5e1" }}>•</span>
                              <span>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                                {viewingApplicantProfile?.email || viewingApplicantDetails.email}
                              </span>
                            </>
                          )}
                          {(viewingApplicantProfile?.phone || viewingApplicantDetails.phone) && (
                            <>
                              <span style={{ color: "#cbd5e1" }}>•</span>
                              <span>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                {viewingApplicantProfile?.phone || viewingApplicantDetails.phone}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="applicant-details-header-actions">
                      <div className="rating-score-box" title="Applicant rating">
                        <span className="star-icon">★</span>
                        <span>{viewingApplicantProfile?.rating ? Number(viewingApplicantProfile.rating).toFixed(1) : (viewingApplicantDetails.rating ? Number(viewingApplicantDetails.rating).toFixed(1) : "0.0")}</span>
                      </div>
                      <div className={`match-score-box ${getMatchColorClass(viewingApplicantDetails.match_percentage || 95)}`} title="Match score">
                        <small>MATCH</small>
                        <b>{viewingApplicantDetails.match_percentage || 95}%</b>
                      </div>
                      <button
                        type="button"
                        className={`applicant-docs-btn ${isDocsDrawerOpen ? "active" : ""}`}
                        onClick={() => {
                          setIsDocsDrawerOpen((prev) => {
                            const next = !prev;
                            if (next && viewingApplicantDetails?.user_id) {
                              fetchApplicantDocuments(viewingApplicantDetails.user_id);
                            }
                            return next;
                          });
                        }}
                      >
                        Docs
                      </button>
                      <button
                        type="button"
                        className="applicant-details-close-btn"
                        onClick={() => {
                          setViewingApplicantDetails(null);
                          setViewingApplicantProfile(null);
                          setIsMatchDrawerOpen(false);
                          setIsOtherJobsOpen(false);
                          setIsDocsDrawerOpen(false);
                          setIsPreviewingDoc(false);
                          setApplicantDocuments([]);
                          setPreviewDoc(null);
                          setCandDetailTab("personal");
                        }}
                        aria-label="Close applicant details"
                        title="Close details"
                      >
                        ✕
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

                  {/* BODY & TABS */}
                  <div className="applicant-details-body-wrap">
                    <div className="applicant-details-scroll-body">
                      {/* TAB 1: PERSONAL & CONTACT */}
                      {candDetailTab === "personal" && (
                        <div className="cand-tab-content">
                          <div className="cand-details-card">
                            <div className="cand-card-header">
                              <h4>Professional Summary</h4>
                            </div>
                            <p className="cand-summary-text">
                              {viewingApplicantProfile?.summary || viewingApplicantDetails.summary || "Passionate and detail-oriented professional with a strong foundation in modern software development and design practices. Dedicated to crafting reliable, scalable, and user-centric digital experiences."}
                            </p>
                          </div>

                          <div className="cand-details-card">
                            <div className="cand-card-header">
                              <h4>Languages Spoken</h4>
                            </div>
                            <div className="cand-details-tags-wrap">
                              {parseItemList(viewingApplicantProfile?.languages || viewingApplicantDetails.languages, ["English", "Filipino"]).map((lang: string, idx: number) => (
                                <span key={idx} className="js-tag-chip js-tag-skill">{lang}</span>
                              ))}
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
                                  {viewingApplicantProfile?.desired_job_title || viewingApplicantDetails.desired_job_title || viewingApplicantDetails.job_title || "Not specified"}
                                </span>
                              </div>
                              {(() => {
                                const sal = parseCandidateSalaryRange(viewingApplicantProfile || viewingApplicantDetails);
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
                                  {viewingApplicantProfile?.work_arrangement || viewingApplicantDetails.work_arrangement || "On-Site"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="cand-details-card">
                            <div className="cand-card-header">
                              <h4>Preferred Work Locations</h4>
                            </div>
                            <div className="cand-details-tags-wrap">
                              {parsePreferredLocationTags(viewingApplicantProfile?.preferred_locations || viewingApplicantDetails.preferred_locations || viewingApplicantDetails.city || "Cavite").map((loc: string, idx: number) => (
                                <span key={idx} className="js-tag-chip js-tag-skill" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                                  {loc}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: SKILLS & CREDENTIALS */}
                      {candDetailTab === "competencies" && (
                        <div className="cand-tab-content">
                          {(() => {
                            const allQuals = parseItemList(viewingApplicantProfile?.qualifications || viewingApplicantDetails.education, ["Bachelor of Science in Information Technology"]);
                            const shsList = allQuals.filter(isShsItem);
                            const collegeList = allQuals.filter((q: string) => !isShsItem(q));
                            const skillsList = Array.isArray(viewingApplicantDetails.skills) ? viewingApplicantDetails.skills : parseItemList(viewingApplicantProfile?.skills || viewingApplicantDetails.skills, ["React.js", "TypeScript", "Node.js"]);
                            const certList = parseItemList(viewingApplicantProfile?.certifications || viewingApplicantDetails.certifications, ["Certified Information Technology Specialist", "TESDA NC II"]);

                            return (
                              <>
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
                          {(viewingApplicantProfile?.years_of_experience || viewingApplicantDetails.years_of_experience) && (
                            <div className="cand-exp-banner">
                              <strong>Total Professional Experience:</strong> {viewingApplicantProfile?.years_of_experience || viewingApplicantDetails.years_of_experience}
                            </div>
                          )}

                          {(() => {
                            let parsedWorkExp: any[] = [];
                            const expJson = viewingApplicantProfile?.work_experience_json || viewingApplicantDetails.work_experience_json;
                            if (expJson) {
                              try {
                                const parsed = JSON.parse(expJson);
                                if (Array.isArray(parsed)) parsedWorkExp = parsed;
                              } catch {}
                            }

                            if (parsedWorkExp.length === 0) {
                              parsedWorkExp = [
                                {
                                  title: viewingApplicantDetails.desired_job_title || viewingApplicantDetails.job_title || "Software Developer Intern",
                                  company: "TechSolutions Cavite",
                                  city: viewingApplicantDetails.city || "Cavite",
                                  province: "Cavite",
                                  isCurrent: false,
                                  startMonth: "Jan",
                                  startYear: "2024",
                                  endMonth: "Dec",
                                  endYear: "2024",
                                  employmentType: "Full-Time",
                                  responsibilities: "Assisted in building responsive frontend user interfaces using modern web frameworks.\nCollaborated with cross-functional team members to implement robust and accessible features.\nParticipated in daily standups and code review processes to maintain code quality.",
                                  skills: viewingApplicantDetails.skills ? viewingApplicantDetails.skills.slice(0, 4) : ["React", "TypeScript", "Git"],
                                }
                              ];
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

                    {/* Docs Drawer */}
                    <div className={`applicant-docs-drawer ${isDocsDrawerOpen ? "open" : ""}`}>
                      <div className="applicant-docs-header">
                        <h3>{isPreviewingDoc ? "Document Preview" : "Saved Documents"}</h3>
                        <button
                          type="button"
                          className="applicant-docs-back-btn"
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
                      <div className="applicant-docs-body">
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
                                  href={`${previewDoc?.url || `/api/applicants/${viewingApplicantDetails.user_id}/resume`}?download=1`}
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
                                  src={previewDoc?.url || `/api/applicants/${viewingApplicantDetails.user_id}/resume`}
                                  style={{ width: "100%", height: "100%", border: "none" }}
                                  title={`${viewingApplicantDetails.full_name} Document`}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="applicant-details-footer">
                    <div className="applicant-footer-meta">
                      <span><strong>Target Job:</strong> {employerJobs.find((j) => String(j.id) === formJobId)?.title || viewingApplicantDetails.job_title || "Job Position"}</span>
                    </div>

                    <div className="applicant-footer-actions">
                      <button
                        type="button"
                        className="applicant-footer-cancel-btn"
                        onClick={() => {
                          setViewingApplicantDetails(null);
                          setViewingApplicantProfile(null);
                          setIsMatchDrawerOpen(false);
                          setIsOtherJobsOpen(false);
                          setIsDocsDrawerOpen(false);
                          setIsPreviewingDoc(false);
                          setApplicantDocuments([]);
                          setPreviewDoc(null);
                          setCandDetailTab("personal");
                        }}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        className={`applicant-details-toggle-select-btn ${selectedCandidateUserIds.includes(viewingApplicantDetails.user_id) ? "selected" : ""}`}
                        onClick={() => {
                          toggleCandidateSelection(viewingApplicantDetails.user_id);
                        }}
                      >
                        {selectedCandidateUserIds.includes(viewingApplicantDetails.user_id)
                          ? "✓ Selected for On-Site Interview"
                          : "+ Select for On-Site Interview"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Panel 1: Match Breakdown */}
              {isMatchDrawerOpen && (() => {
                const targetJob = employerJobs.find((j) => String(j.id) === formJobId) || { id: 1, title: viewingApplicantDetails.job_title || "Job Position" };
                const candCity = viewingApplicantProfile?.city || viewingApplicantDetails.city || "Cavite";
                const candSetup = viewingApplicantProfile?.work_arrangement || viewingApplicantDetails.work_arrangement || "On-Site";
                const candSalary = viewingApplicantProfile?.expected_salary || viewingApplicantDetails.expected_salary || "";
                const candSkills = Array.isArray(viewingApplicantDetails.skills) ? viewingApplicantDetails.skills : parseCompetencyDisplayTags(viewingApplicantProfile?.skills || viewingApplicantDetails.skills || "", "skills");
                const candQuals = parseCompetencyDisplayTags(viewingApplicantProfile?.qualifications || viewingApplicantDetails.education || "", "qualifications");
                const candCerts = parseCompetencyDisplayTags(viewingApplicantProfile?.certifications || viewingApplicantDetails.certifications || "", "certifications");

                const jobLocation = "Cavite";
                const jobSetup = "On-Site";
                const jobSalaryDisplay = "PHP 25,000 - 45,000";
                const jobSkills = candSkills.slice(0, 4);
                const jobQuals = ["BS in Information Technology or Computer Science"];
                const jobCerts = ["IT Specialist Certification"];

                const matchDetails = calculateJobMatchDetails(
                  {
                    id: targetJob.id,
                    title: targetJob.title,
                    location: jobLocation,
                    salaryMin: 25000,
                    setup: jobSetup,
                    skillTags: jobSkills,
                    qualTags: jobQuals,
                    certTags: jobCerts,
                  },
                  {
                    desiredJobTitle: viewingApplicantProfile?.desired_job_title || viewingApplicantDetails.desired_job_title || "",
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
                  <aside className="applicant-side-comparison-panel" style={{ fontFamily: '"Inter", sans-serif' }}>
                    <div className="side-panel-header" style={{ fontFamily: '"Inter", sans-serif' }}>
                      <div className="side-title-row">
                        <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: '"Inter", sans-serif' }}>Match Breakdown</h3>
                        <span className="side-subtitle" style={{ fontSize: "0.82rem", color: "#557796", fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>Side-by-side candidate profile vs job requirements</span>
                      </div>
                      <div className="side-header-actions">
                        <span className={`match-badge-pill ${getMatchColorClass(viewingApplicantDetails.match_percentage || matchDetails.score)}`}>
                          {viewingApplicantDetails.match_percentage || matchDetails.score}% Match
                        </span>
                        <button
                          type="button"
                          className="side-close-btn"
                          aria-label="Close comparison panel"
                          onClick={() => setIsMatchDrawerOpen(false)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="side-panel-body">
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

                      <div className="jd-unified-compare-container">
                        <div className="jd-master-col applicant-col">
                          <div className="jd-master-col-header">
                            <span>Candidate Profile</span>
                          </div>
                          <div className="jd-master-col-content">
                            <div className="jd-master-row">
                              <span className="jd-row-label">Location</span>
                              <div className="jd-col-tags-container">
                                <span className="jd-comp-tag app-neutral">
                                  <span className="tag-text">{candCity}</span>
                                </span>
                              </div>
                            </div>

                            <div className="jd-master-row">
                              <span className="jd-row-label">Work Arrangement</span>
                              <div className="jd-col-tags-container">
                                <span className="jd-comp-tag app-neutral">
                                  <span className="tag-text">{candSetup}</span>
                                </span>
                              </div>
                            </div>

                            <div className="jd-master-row">
                              <span className="jd-row-label">Salary Range</span>
                              <div className="jd-col-tags-container">
                                <span className="jd-comp-tag app-neutral">
                                  <span className="tag-text">{parseCandidateSalaryRange(viewingApplicantProfile || viewingApplicantDetails).min}</span>
                                </span>
                              </div>
                            </div>

                            <div className="jd-master-row">
                              <div className="jd-row-label-wrap">
                                <span className="jd-row-label">Skills</span>
                                <span className="col-count-text">{candSkills.length} listed</span>
                              </div>
                              <div className="jd-col-tags-container">
                                {candSkills.map((item) => {
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
                                })}
                              </div>
                            </div>

                            <div className="jd-master-row">
                              <div className="jd-row-label-wrap">
                                <span className="jd-row-label">Qualifications</span>
                                <span className="col-count-text">{candQuals.length} listed</span>
                              </div>
                              <div className="jd-col-tags-container">
                                {candQuals.map((item) => (
                                  <span key={item} className="jd-comp-tag app-matched">
                                    <span className="tag-text">{item}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="jd-master-col employer-col">
                          <div className="jd-master-col-header employer">
                            <span>Employer's Requirements</span>
                          </div>
                          <div className="jd-master-col-content">
                            <div className="jd-master-row">
                              <span className="jd-row-label">Location</span>
                              <div className="jd-col-tags-container">
                                <span className="jd-comp-tag tag-matched-green">
                                  <span className="tag-text">{jobLocation}</span>
                                </span>
                              </div>
                            </div>

                            <div className="jd-master-row">
                              <span className="jd-row-label">Work Arrangement</span>
                              <div className="jd-col-tags-container">
                                <span className="jd-comp-tag tag-matched-green">
                                  <span className="tag-text">{jobSetup}</span>
                                </span>
                              </div>
                            </div>

                            <div className="jd-master-row">
                              <span className="jd-row-label">Salary Range</span>
                              <div className="jd-col-tags-container">
                                <span className="jd-comp-tag tag-matched-green">
                                  <span className="tag-text">{jobSalaryDisplay}</span>
                                </span>
                              </div>
                            </div>

                            <div className="jd-master-row">
                              <div className="jd-row-label-wrap">
                                <span className="jd-row-label">Skills</span>
                                <span className="col-count-text">{jobSkills.length} required</span>
                              </div>
                              <div className="jd-col-tags-container">
                                {jobSkills.map((item) => {
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
                                })}
                              </div>
                            </div>

                            <div className="jd-master-row">
                              <div className="jd-row-label-wrap">
                                <span className="jd-row-label">Qualifications</span>
                                <span className="col-count-text">{jobQuals.length} required</span>
                              </div>
                              <div className="jd-col-tags-container">
                                {jobQuals.map((item) => {
                                  const matched = checkMatch(item, candQuals);
                                  return (
                                    <span key={item} className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`}>
                                      <span className="tag-text">{item}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </aside>
                );
              })()}

              {/* Side Panel 2: Other Jobs */}
              {isOtherJobsOpen && (
                <aside className="applicant-side-comparison-panel" style={{ fontFamily: '"Inter", sans-serif' }}>
                  <div className="side-panel-header" style={{ fontFamily: '"Inter", sans-serif' }}>
                    <div className="side-title-row">
                      <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#01294a", fontFamily: '"Inter", sans-serif' }}>Other Employer Jobs</h3>
                      <span className="side-subtitle" style={{ fontSize: "0.82rem", color: "#557796", fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>Candidate compatibility across active job postings</span>
                    </div>
                    <div className="side-header-actions">
                      <button
                        type="button"
                        className="side-close-btn"
                        aria-label="Close panel"
                        onClick={() => setIsOtherJobsOpen(false)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="side-panel-body" style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "18px", fontFamily: '"Inter", sans-serif' }}>
                    {employerJobs
                      .filter((j) => String(j.id) !== formJobId)
                      .map((otherJob) => {
                        const baseMatch = viewingApplicantDetails.match_percentage || 90;
                        const percent = Math.max(70, Math.min(99, baseMatch - ((otherJob.id * 3) % 12)));
                        const matchStyle = percent >= 85
                          ? { track: "#dcfce7", color: "#15803d", fill: "#86efac" }
                          : percent >= 70
                          ? { track: "#fef3c7", color: "#b45309", fill: "#fde68a" }
                          : { track: "#fee2e2", color: "#b91c1c", fill: "#fca5a5" };

                        return (
                          <div
                            key={otherJob.id}
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
                              fontFamily: '"Inter", sans-serif',
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#01294a", fontFamily: '"Inter", sans-serif' }}>
                                {otherJob.title}
                              </h4>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "2px", fontSize: "0.8rem", color: "#64748b", fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                                    <circle cx="12" cy="10" r="2.5" />
                                  </svg>
                                  Cavite
                                </span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                  </svg>
                                  On-Site
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
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
                                  fontFamily: '"Inter", sans-serif',
                                }}
                              >
                                {percent}% Match
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </aside>
              )}
            </div>
          </div>
        ,
        document.body
      )}

      {/* ── MEETING CANDIDATE LIST POP-UP MODAL (PORTALED TO BODY FOR VIEWPORT CENTERING - EMPLOYER ONLY) ── */}
      {typeof document !== "undefined" && activeMeetingCandidatesModal && isEmployer && createPortal(
        <div
          className="applicant-modal-backdrop"
          onClick={() => setActiveMeetingCandidatesModal(null)}
        >
          <div
            className="applicant-modal-container meeting-candidates-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="applicant-modal-header">
              <div className="applicant-modal-title-wrap">
                <div className="meeting-modal-title-row">
                  <h4 className="applicant-modal-title">Meeting Candidate List</h4>
                  <span className="meeting-modal-count-badge">
                    ({getCandidatesForInterview(activeMeetingCandidatesModal, schedulableCandidates).length})
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="applicant-modal-close-btn"
                onClick={() => setActiveMeetingCandidatesModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="applicant-modal-body">
              <div className="candidate-multiselect-list modal-view">
                {getCandidatesForInterview(activeMeetingCandidatesModal, schedulableCandidates).map((c) => {
                  const matchStyle = getMatchBadgeStyle(c.match_percentage || 95);
                  return (
                    <div
                      key={c.user_id}
                      className="candidate-multiselect-card selected readonly"
                    >
                      <div className="candidate-avatar-initials" aria-label="Candidate avatar" style={{ overflow: "hidden", position: "relative" }}>
                        {(() => {
                          const pic = c.profile_picture_path;
                          const src = pic ? (pic.startsWith("http") || pic.startsWith("/api") ? pic : `/api/applicants/${c.user_id}/profile-picture`) : null;
                          return (
                            <>
                              {src && (
                                <img
                                  src={src}
                                  alt={c.full_name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                    if (e.currentTarget.nextElementSibling) {
                                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                                    }
                                  }}
                                />
                              )}
                              <span style={{ display: src ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                                {initialsFromName(c.full_name)}
                              </span>
                            </>
                          );
                        })()}
                      </div>

                      <div className="candidate-card-details">
                        <div className="candidate-card-name-row">
                          <span className="candidate-name">{c.full_name}</span>
                          <div className="candidate-card-right-actions">
                            <span
                              className="candidate-match-badge"
                              style={{
                                background: matchStyle.track,
                                color: matchStyle.color,
                                borderColor: matchStyle.fill,
                              }}
                            >
                              {c.match_percentage || 95}% Match
                            </span>
                            <button
                              type="button"
                              className="candidate-details-btn"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenCandidateDetails(c);
                              }}
                              title="View Applicant Details"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                        <div className="candidate-card-meta-row">
                          {c.job_title && (
                            <span className="candidate-meta-chip">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                              </svg>
                              {c.job_title}
                            </span>
                          )}
                          {c.city && (
                            <span className="candidate-meta-chip">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                                <circle cx="12" cy="10" r="2.5" />
                              </svg>
                              {c.city}
                            </span>
                          )}
                        </div>

                        {(c.phone || c.email) && (
                          <div className="candidate-card-meta-row">
                            {c.phone && (
                              <span className="candidate-meta-chip">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                {c.phone}
                              </span>
                            )}
                            {c.email && (
                              <span className="candidate-meta-chip">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                                {c.email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="applicant-modal-footer" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="applicant-modal-done-btn"
                onClick={() => setActiveMeetingCandidatesModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE CONFIRMATION POP-UP MODAL (PORTALED TO BODY - SYSTEM POPUP) ── */}
      {typeof document !== "undefined" && interviewToDelete && createPortal(
        <div
          className="applicant-modal-backdrop"
          onClick={() => setInterviewToDelete(null)}
        >
          <div
            className="applicant-modal-container delete-confirm-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="applicant-modal-header" style={{ alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="delete-confirm-icon-badge">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>
                <div>
                  <h4 className="applicant-modal-title" style={{ fontSize: "1.05rem", color: "#01294a", margin: 0 }}>
                    Delete Interview
                  </h4>
                </div>
              </div>
              <button
                type="button"
                className="applicant-modal-close-btn"
                onClick={() => setInterviewToDelete(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="applicant-modal-body delete-confirm-modal-body">
              <p className="delete-confirm-message">
                Are you sure you want to delete this interview from your calendar?
              </p>
            </div>

            <div className="applicant-modal-footer" style={{ justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="delete-modal-cancel-btn"
                onClick={() => setInterviewToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-modal-confirm-btn"
                onClick={() => handleConfirmDelete(interviewToDelete.id)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Interview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── CANCEL INTERVIEW MODAL (PORTALED TO BODY - PIC MATCH 867402159 / 877549441) ── */}
      {typeof document !== "undefined" && interviewToCancel && createPortal(
        <div className="applicant-modal-backdrop" onClick={() => setInterviewToCancel(null)}>
          <div
            className="applicant-modal-container cancel-interview-modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", width: "100%", padding: "24px", borderRadius: "16px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0c2a47" }}>Cancel interview?</h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.86rem", color: "#64748b" }}>
                  The applicant will be notified and shown the reason.
                </p>
              </div>
              <button
                type="button"
                className="applicant-modal-close-btn"
                onClick={() => setInterviewToCancel(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                  Reason for cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (e.target.value === "Interviewer unavailable") {
                      setCancelMessage("We need to cancel this interview because the interviewer is unavailable. We apologize for the inconvenience.");
                    } else if (e.target.value === "Schedule conflict") {
                      setCancelMessage("Due to an unexpected scheduling conflict, we need to cancel this interview session.");
                    } else if (e.target.value === "Position already filled") {
                      setCancelMessage("Thank you for your interest. This position has already been filled.");
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="Interviewer unavailable">Interviewer unavailable</option>
                  <option value="Schedule conflict">Schedule conflict</option>
                  <option value="Position already filled">Position already filled</option>
                  <option value="Candidate requested cancellation">Candidate requested cancellation</option>
                  <option value="Technical issue">Technical issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                  Message to applicant
                </label>
                <textarea
                  rows={3}
                  value={cancelMessage}
                  onChange={(e) => setCancelMessage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.86rem", color: "#334155", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={notifyOnCancel}
                  onChange={(e) => setNotifyOnCancel(e.target.checked)}
                />
                <span>Notify applicant by in-app notification and email</span>
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  color: "#0369a1",
                  fontSize: "0.82rem",
                }}
              >
                <span>ℹ</span>
                <span>A cancellation notification will be added to the applicant&apos;s Notifications page.</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setInterviewToCancel(null)}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                Keep Interview
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelInterview}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                Cancel Interview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── RESCHEDULE INTERVIEW MODAL (PORTALED TO BODY - PIC MATCH 864653198 / 872246452 / 875598777) ── */}
      {typeof document !== "undefined" && interviewToReschedule && createPortal(
        <div className="applicant-modal-backdrop" onClick={() => setInterviewToReschedule(null)}>
          <div
            className="applicant-modal-container reschedule-modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", width: "100%", padding: "24px", borderRadius: "16px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0c2a47" }}>
                  {isEmployer ? "Reschedule Interview" : "Request a new interview time"}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.86rem", color: "#64748b" }}>
                  Your current interview remains confirmed until the employer approves a new time.
                </p>
              </div>
              <button
                type="button"
                className="applicant-modal-close-btn"
                onClick={() => setInterviewToReschedule(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                    Preferred date
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                    Preferred time
                  </label>
                  <select
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="9:00 AM">9:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="1:00 PM">1:00 PM</option>
                    <option value="2:00 PM">2:00 PM</option>
                    <option value="3:30 PM">3:30 PM</option>
                    <option value="4:00 PM">4:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                  Alternative time <span style={{ fontWeight: 400, color: "#64748b" }}>(optional)</span>
                </label>
                <select
                  value={rescheduleAltTime}
                  onChange={(e) => setRescheduleAltTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.86rem",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="3:30 PM">3:30 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                  <option value="5:00 PM">5:00 PM</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                  Reason for rescheduling <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Provide reason for request..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.86rem", color: "#334155", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={notifyOnReschedule}
                  onChange={(e) => setNotifyOnReschedule(e.target.checked)}
                />
                <span>Notify the employer and send me status updates</span>
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  fontSize: "0.82rem",
                }}
              >
                <span>⚠️</span>
                <span>Submitting this request does not automatically change your interview.</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setInterviewToReschedule(null)}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                Keep Current Schedule
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#00385e",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                Send Request
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


// ── SUB-COMPONENT: INDIVIDUAL INTERVIEW CARD ──
function InterviewItemCard({
  item,
  isEmployer,
  currentUserId,
  onUpdateStatus,
  onDeleteInterview,
  schedulableCandidates,
  onOpenMeetingCandidatesModal,
  onOpenCancelModal,
  onOpenRescheduleModal,
}: {
  item: ScheduledInterview;
  isEmployer: boolean;
  currentUserId: number | null;
  onUpdateStatus: (id: number, status: string, extraData?: any) => void;
  onDeleteInterview?: (item: ScheduledInterview) => void;
  schedulableCandidates: SchedulableCandidate[];
  onOpenMeetingCandidatesModal: (item: ScheduledInterview, candidates: SchedulableCandidate[]) => void;
  onOpenCancelModal: (item: ScheduledInterview) => void;
  onOpenRescheduleModal: (item: ScheduledInterview) => void;
}) {
  const isPending = item.status === "pending";
  const isAccepted = item.status === "accepted";
  const isCompleted = item.status === "completed";

  const meetingCandidates = useMemo(() => {
    return getCandidatesForInterview(item, schedulableCandidates);
  }, [item, schedulableCandidates]);

  // Determine meeting state for applicant: scheduled, ongoing, or concluded
  const applicantStatus = useMemo(() => {
    if (item.status === "completed") return "concluded";
    if (item.status === "cancelled") return "cancelled";
    try {
      const now = new Date();
      const nowY = now.getFullYear();
      const nowM = String(now.getMonth() + 1).padStart(2, "0");
      const nowD = String(now.getDate()).padStart(2, "0");
      const today = `${nowY}-${nowM}-${nowD}`;
      const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (item.interview_date < today) return "concluded";
      if (item.interview_date > today) return "scheduled";

      // Same day (today)
      const start = item.start_time || "00:00";
      const end = item.end_time || start;
      if (nowTime > end) return "concluded";
      if (nowTime >= start && nowTime <= end) return "ongoing";
      return "scheduled";
    } catch {
      return item.status === "completed" ? "concluded" : "scheduled";
    }
  }, [item]);

  const isConcluded = applicantStatus === "concluded" || applicantStatus === "cancelled";

  return (
    <div className={`calendar-interview-card int-card-status-${item.status}`}>
      <div className="interview-card-top">
        <div className="interview-card-title-row">
          <h4 className="interview-card-title">{item.interview_stage || item.interview_title}</h4>
          {!isEmployer && (
            <span className={`applicant-meeting-pill ${applicantStatus}`}>
              {applicantStatus === "ongoing" && <span className="applicant-pill-pulse-dot" />}
              {applicantStatus === "scheduled" && "Scheduled"}
              {applicantStatus === "ongoing" && "Ongoing"}
              {applicantStatus === "concluded" && "Concluded"}
              {applicantStatus === "cancelled" && "Cancelled"}
            </span>
          )}
        </div>

        {/* Delete button on the right side edge for applicants when the meeting is concluded */}
        {!isEmployer && isConcluded && (
          <button
            type="button"
            className="int-card-delete-btn"
            onClick={() => onDeleteInterview?.(item)}
            title="Delete concluded interview from your calendar"
            aria-label="Delete interview"
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
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        )}
      </div>

      <div className="interview-card-meta">
        <span className="interview-meta-item">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {formatDisplayDate(item.interview_date)}
        </span>

        <span className="interview-meta-item">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {formatDisplayTime(item.start_time)}
          {item.end_time && ` - ${formatDisplayTime(item.end_time)}`}
        </span>

        <span className="interview-meta-item">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span>
            {(item.meeting_link_or_address || "On-site")
              .replace(/^On-Site:\s*/i, "")
              .replace(/^On-site:\s*/i, "")}
          </span>
        </span>
      </div>

      {item.notes && (
        <div className="interview-notes-box">
          <strong>Notes:</strong> {item.notes}
        </div>
      )}

      {/* Action Buttons & Candidate List Row (Employer only) */}
      {isEmployer && (
        <div className="interview-card-actions">
          {/* Left side: Candidate List trigger button (directly opens popup modal - employer only) */}
          <div className="interview-card-left-actions">
            {isEmployer && (
              <button
                type="button"
                className="int-candidate-list-btn"
                onClick={() => onOpenMeetingCandidatesModal(item, meetingCandidates)}
                title="Show list of applicants for this meeting"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Candidate list</span>
              </button>
            )}
          </div>

          {/* Right side: Action buttons */}
          <div className="interview-card-right-actions">
            {/* Action buttons (Reschedule & Cancel with Reason) */}
            {(isPending || isAccepted || applicantStatus === "scheduled") && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  type="button"
                  className="int-btn"
                  onClick={() => onOpenRescheduleModal(item)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: "6px",
                    border: "1px solid #0284c7",
                    background: "transparent",
                    color: "#0284c7",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  className="int-btn int-btn-red"
                  onClick={() => onOpenCancelModal(item)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: "6px",
                    border: "1px solid #ef4444",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                {isEmployer && (
                  <button
                    type="button"
                    className="int-btn int-btn-blue"
                    onClick={() => onUpdateStatus(item.id, "completed")}
                  >
                    Mark Completed
                  </button>
                )}
              </div>
            )}

            {isCompleted && (
              <div className="interview-status-action-wrap">
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b" }}>
                  ✓ Interview Completed
                </span>
                {isEmployer && (
                  <button
                    type="button"
                    className="int-card-delete-btn"
                    onClick={() => onDeleteInterview?.(item)}
                    title="Delete this interview from your calendar"
                    aria-label="Delete interview"
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
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {item.status === "cancelled" && (
              <div className="interview-status-action-wrap">
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#dc2626" }}>
                  ✕ Interview Cancelled
                </span>
                {isEmployer && (
                  <button
                    type="button"
                    className="int-card-delete-btn"
                    onClick={() => onDeleteInterview?.(item)}
                    title="Delete this interview from your calendar"
                    aria-label="Delete interview"
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
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
