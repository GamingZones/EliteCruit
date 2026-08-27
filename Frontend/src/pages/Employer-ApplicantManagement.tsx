import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import { useEmployerCompanyLabel } from "./useEmployerCompanyLabel";
import ChatbotDrawer, { FAQItem } from "../components/ChatbotDrawer";
import "./Applicant-Dashboard.css";
import "./ApplicantDashboardOverrides.css";
import "./Employer-Dashboard.css";
import "./Employer-ApplicantManagement.css";
import "./Employer-ApplicantScreening.css";
import "./JobSearch.css";

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
  city: string | null;
  applicant_name: string;
  desired_job_title: string | null;
  applicant_user_id: number;
  skills?: string | null;
  qualifications?: string | null;
  certifications?: string | null;
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

function getMatchPercent(app: Application): number {
  if ((app as any).match_percent && typeof (app as any).match_percent === "number") {
    return (app as any).match_percent;
  }
  const seed = (app.id * 19 + (app.applicant_name ? app.applicant_name.length * 11 : 42)) % 10;
  return 89 + seed;
}

function getMatchPercentStyle(percent: number) {
  if (percent >= 90) {
    return {
      color: "#059669",
      track: "#d1fae5",
      fill: "#10b981",
    };
  }
  if (percent >= 75) {
    return {
      color: "#d97706",
      track: "#fef3c7",
      fill: "#f59e0b",
    };
  }
  if (percent >= 60) {
    return {
      color: "#0284c7",
      track: "#e0f2fe",
      fill: "#0ea5e9",
    };
  }
  return {
    color: "#dc2626",
    track: "#fee2e2",
    fill: "#ef4444",
  };
}

export default function EmployerApplicantManagement() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
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
  const [directInvitations, setDirectInvitations] = useState<DirectInvitation[]>([]);
  const [invitationFilter, setInvitationFilter] = useState<"all" | "accepted" | "pending" | "declined">("all");
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, shortlisted: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [reviewModalApp, setReviewModalApp] = useState<Application | null>(null);
  const [reviewModalProfile, setReviewModalProfile] = useState<any>(null);
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);
  const [isPreviewingDoc, setIsPreviewingDoc] = useState(false);
  const [isDirectInvitationModal, setIsDirectInvitationModal] = useState(false);

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

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const rawId = e.dataTransfer.getData("text/plain");
    const appId = rawId ? parseInt(rawId, 10) : draggedAppId;
    if (appId) {
      handleUpdateStatus(appId, targetStatus);
      setSelectedAppId(appId);
    }
    setDraggedAppId(null);
  };

  const handleOpenReview = async (app: Application, openDocs: boolean = false, isDirectInv: boolean = false) => {
    setReviewModalApp(app);
    setReviewModalProfile(null);
    setIsDocsDrawerOpen(openDocs);
    setIsPreviewingDoc(false);
    setIsDirectInvitationModal(isDirectInv);
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
      const res = await fetch(`/api/employers/${userId}/applications`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load applications.");
      setApplications(data.applications ?? []);
      setStats(data.stats ?? { total: 0, pending: 0, shortlisted: 0 });

      const invRes = await fetch(`/api/employers/${userId}/direct-invitations`);
      if (invRes.ok) {
        const invData = await invRes.json();
        setDirectInvitations(Array.isArray(invData?.invitations) ? invData.invitations : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        app.applicant_name.toLowerCase().includes(q) ||
        (app.job_title && app.job_title.toLowerCase().includes(q)) ||
        (app.city && app.city.toLowerCase().includes(q));

      const status = (app.status || "").toLowerCase();
      let matchStatus = true;
      if (statusFilter === "pending") {
        matchStatus = !isApprovedStatus(status) && !isDeniedStatus(status) && status !== "shortlisted";
      } else if (statusFilter === "shortlisted") {
        matchStatus = status === "shortlisted";
      } else if (statusFilter === "approved") {
        matchStatus = isApprovedStatus(status);
      } else if (statusFilter === "denied") {
        matchStatus = isDeniedStatus(status);
      }
      return matchSearch && matchStatus;
    });
  }, [applications, search, statusFilter]);

  const filteredInvitations = useMemo(() => {
    return directInvitations.filter((inv) => {
      if (invitationFilter === "all") return true;
      return (inv.status || "pending").toLowerCase() === invitationFilter;
    });
  }, [directInvitations, invitationFilter]);

  const scrollToScreening = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveScreeningSection("applicant-screening");
    setStatusFilter("all");
    const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToShortlistBoard = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveScreeningSection("shortlisted-candidates");
    const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
    const boardEl = document.getElementById("applicant-shortlist-board");
    if (boardEl && mainEl) {
      const targetPos = boardEl.offsetTop - 70;
      mainEl.scrollTo({ top: Math.max(0, targetPos), behavior: "smooth" });
    }
  };

  const scrollToDirectInvitations = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveScreeningSection("direct-invitations");
    const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
    const invEl = document.getElementById("direct-invitations");
    if (invEl && mainEl) {
      const targetPos = invEl.offsetTop - 70;
      mainEl.scrollTo({ top: Math.max(0, targetPos), behavior: "smooth" });
    }
  };

  useEffect(() => {
    const mainEl = mainRef.current || document.querySelector<HTMLElement>(".appdash-main");
    if (!mainEl) return;

    const handleScroll = () => {
      const boardEl = document.getElementById("applicant-shortlist-board");
      const invEl = document.getElementById("direct-invitations");
      if (!boardEl || !mainEl) return;

      const boardRect = boardEl.getBoundingClientRect();
      const mainRect = mainEl.getBoundingClientRect();

      if (invEl && invEl.getBoundingClientRect().top <= mainRect.top + mainRect.height * 0.45) {
        setActiveScreeningSection("direct-invitations");
      } else if (boardRect.top <= mainRect.top + mainRect.height * 0.45) {
        setActiveScreeningSection("shortlisted-candidates");
      } else {
        setActiveScreeningSection("applicant-screening");
      }
    };

    mainEl.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => mainEl.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updateFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "shortlisted-candidates" || hash === "applicant-shortlist-board") {
        scrollToShortlistBoard();
      } else if (hash === "direct-invitations") {
        scrollToDirectInvitations();
      } else if (hash === "applicant-screening" || hash === "applicant-screening-section") {
        scrollToScreening();
      } else {
        setActiveScreeningSection("applicant-screening");
      }
    };

    const timer = setTimeout(updateFromHash, 100);
    window.addEventListener("hashchange", updateFromHash);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", updateFromHash);
    };
  }, []);

  const handleUpdateStatus = async (appId: number, newStatus: string) => {
    setApplications((prev) =>
      prev.map((item) => (item.id === appId ? { ...item, status: newStatus } : item))
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

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
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
      }
    } catch (err) {
      console.error("Failed to perform bulk status change", err);
    }
  };

  const allSelected = filteredApplications.length > 0 && selectedIds.size === filteredApplications.length;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredApplications.map((a) => a.id)));
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
          <ul className="appdash-secondary-list employer-main-links">
            <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
          </ul>

          <div className="appdash-menu-block employer-screening-block">
            <button
              className="appdash-menu-title employer-screening-title"
              type="button"
              onClick={() => setIsScreeningOpen((v) => !v)}
            >
              <span className="title-main">
                <span className="item-icon"><EmployerIcon name="applicant" /></span>
                <span
                  onClick={scrollToScreening}
                  className="sidebar-link-title"
                  style={{ cursor: "pointer" }}
                >
                  Applicant Management
                </span>
              </span>
              <span className={`title-caret ${isScreeningOpen ? "open" : "closed"}`}><ChevronIcon direction={isScreeningOpen ? "down" : "up"} /></span>
            </button>
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
          </div>

          <ul className="appdash-secondary-list">
            <li><a href="/employer-applicant-finder"><span className="item-icon"><EmployerIcon name="nearby" /></span><span>Applicant Finder</span></a></li>
            <li><a href="/employer-faq-management"><span className="item-icon"><EmployerIcon name="faq" /></span><span>FAQ Management</span></a></li>
            <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span></a></li>
            <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span><span className="item-badge">8</span></a></li>
            <li><a href="/feedback"><span className="item-icon"><EmployerIcon name="feedback" /></span><span>Feedback</span></a></li>
          </ul>
        </div>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((v) => !v)}>
            <span className="item-icon"><EmployerIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{companyLabel}</strong><small>Employer</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && <div className="appdash-profile-menu"><a href="/employer-company-profile"><EmployerIcon name="profile" />Company Profile</a><a href="/"><EmployerIcon name="logout" />Logout</a></div>}
        </div>
      </aside>

      <main ref={mainRef} className="appdash-main applicant-mgmt-main screening-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Applicant Management</strong></div></div>
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
                pageTitle="Applicant Management"
                faqs={applicantMgmtFaqs}
              />
            </div>
          </div>
        </header>

        <section className="applicant-mgmt-stats">
          <article className="card"><small>Candidates</small><strong>{stats.total}</strong><p>Total applied</p></article>
          <article className="card"><small>Shortlisted</small><strong>{stats.shortlisted}</strong><p>Ready for next step</p></article>
          <article className="card"><small>Pending</small><strong>{stats.pending}</strong><p>Needs review</p></article>
        </section>

        <section className="applicant-mgmt-filters card">
          <input
            type="text"
            placeholder="Search name, job title, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pendings</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
          <button type="button" className="clear-btn" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear</button>
          <button
            type="button"
            className="bulk-shortlist-btn"
            disabled={selectedIds.size === 0}
            onClick={() => handleBulkStatusChange("shortlisted")}
            title={selectedIds.size > 0 ? `Shortlist ${selectedIds.size} selected` : "Select applicants to shortlist"}
          >
            Shortlist Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </button>
          <button
            type="button"
            className="bulk-reject-btn"
            disabled={selectedIds.size === 0}
            onClick={() => handleBulkStatusChange("rejected")}
            title={selectedIds.size > 0 ? `Reject ${selectedIds.size} selected` : "Select applicants to reject"}
          >
            Reject Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </button>
        </section>

        <section id="applicant-screening" className="applicant-mgmt-table card">
          {isLoading ? (
            <p style={{ padding: "20px", color: "#607b96", fontSize: "0.88rem" }}>Loading applications…</p>
          ) : error ? (
            <p style={{ padding: "20px", color: "#c53030", fontSize: "0.88rem" }}>{error}</p>
          ) : filteredApplications.length === 0 ? (
            <p style={{ padding: "20px", color: "#607b96", fontSize: "0.88rem" }}>
              No applications found{search || statusFilter !== "all" ? " matching your filters." : " yet. Applicants who apply to your job posts will appear here."}
            </p>
          ) : (
            <table>
              <colgroup>
                <col style={{ width: "40px" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "27%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "26%", minWidth: "220px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}><input type="checkbox" aria-label="select all" checked={allSelected} onChange={toggleAll} /></th>
                  <th>Name</th>
                  <th>Applied For</th>
                  <th className="status-header">Status</th>
                  <th className="match-header">Match</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app.id)}
                    onDragEnd={handleDragEnd}
                    className={selectedIds.has(app.id) ? "row-selected" : ""}
                  >
                    <td style={{ textAlign: "center" }}><input type="checkbox" aria-label="select row" checked={selectedIds.has(app.id)} onChange={() => toggleOne(app.id)} /></td>
                    <td>
                      <div className="applicant-name">
                        <span className="pill">{initialsFrom(app.applicant_name)}</span>
                        <div>
                          <strong>{app.applicant_name}</strong>
                          {app.city && <small>{app.city}</small>}
                        </div>
                      </div>
                    </td>
                    <td className="job-title-cell">{app.job_title || "—"}</td>
                    <td className="status-cell"><span className={statusChipClass(app.status)}>{formatStatusLabel(app.status)}</span></td>
                    <td className="match-cell">
                      {(() => {
                        const percent = getMatchPercent(app);
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

                        {isApprovedStatus(app.status) ? (
                          <button
                            type="button"
                            className="merged-status-btn approved"
                            title="Click to undo approval and return to shortlisted"
                            onClick={() => handleUpdateStatus(app.id, "shortlisted")}
                          >
                            Approved
                          </button>
                        ) : isDeniedStatus(app.status) ? (
                          <button
                            type="button"
                            className="merged-status-btn denied"
                            title="Click to undo denial and return to shortlisted"
                            onClick={() => handleUpdateStatus(app.id, "shortlisted")}
                          >
                            Denied
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              title="Review Candidate"
                              aria-label="Review"
                              className="action-btn review-btn-icon"
                              onClick={() => handleOpenReview(app)}
                            >
                              <RowActionIcon name="review" />
                            </button>
                            <button
                              type="button"
                              title={app.status?.toLowerCase() === "shortlisted" ? "Remove from Shortlist" : "Shortlist Applicant"}
                              aria-label="Shortlist"
                              className={`action-btn shortlist-btn-icon ${app.status?.toLowerCase() === "shortlisted" ? "active" : ""}`}
                              onClick={() => handleUpdateStatus(app.id, app.status?.toLowerCase() === "shortlisted" ? "pending" : "shortlisted")}
                            >
                              <RowActionIcon name="shortlist" />
                            </button>
                            <button
                              type="button"
                              title="Approve Applicant"
                              aria-label="Approve"
                              className="action-btn approve-btn-icon"
                              onClick={() => handleUpdateStatus(app.id, "approved")}
                            >
                              <RowActionIcon name="approve" />
                            </button>
                            <button
                              type="button"
                              title="Reject Applicant"
                              aria-label="Reject"
                              className="action-btn reject-btn-icon"
                              onClick={() => handleUpdateStatus(app.id, "denied")}
                            >
                              <RowActionIcon name="reject" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* APPLICANT SHORTLIST BOARD BELOW TABLE */}
        <section id="applicant-shortlist-board" className="screening-board screening-card" style={{ marginTop: "24px" }}>
          <div className="board-head">
            <div>
              <h2>Applicant Shortlist Board</h2>
              <p>Manage shortlisted candidates through approval and denial stages, and preview selected applicant details.</p>
            </div>
            <span>{applications.length} candidates</span>
          </div>

          <div className="board-grid">
            <div className="stage-wrap">
              <div
                className={`stage ${dragOverStage === "shortlisted" ? "drag-over-shortlist" : ""}`}
                onDragOver={(e) => handleDragOver(e, "shortlisted")}
                onDragLeave={(e) => handleDragLeave(e, "shortlisted")}
                onDrop={(e) => handleDrop(e, "shortlisted")}
              >
                <header><b>Shortlist</b><span>{applications.filter(a => a.status?.toLowerCase() === "shortlisted").length}</span></header>
                {applications.filter(a => a.status?.toLowerCase() === "shortlisted").length === 0 ? (
                  <div className="empty drag-target-hint">Drop candidates here</div>
                ) : (
                  applications.filter(a => a.status?.toLowerCase() === "shortlisted").map(a => {
                    const percent = getMatchPercent(a);
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

              <div
                className={`stage ${dragOverStage === "approved" ? "drag-over-approved" : ""}`}
                onDragOver={(e) => handleDragOver(e, "approved")}
                onDragLeave={(e) => handleDragLeave(e, "approved")}
                onDrop={(e) => handleDrop(e, "approved")}
              >
                <header><b>Approved</b><span>{applications.filter(a => isApprovedStatus(a.status)).length}</span></header>
                {applications.filter(a => isApprovedStatus(a.status)).length === 0 ? (
                  <div className="empty drag-target-hint">Drop candidates here</div>
                ) : (
                  applications.filter(a => isApprovedStatus(a.status)).map(a => {
                    const percent = getMatchPercent(a);
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

              <div
                className={`stage ${dragOverStage === "denied" ? "drag-over-denied" : ""}`}
                onDragOver={(e) => handleDragOver(e, "denied")}
                onDragLeave={(e) => handleDragLeave(e, "denied")}
                onDrop={(e) => handleDrop(e, "denied")}
              >
                <header><b>Denied</b><span>{applications.filter(a => isDeniedStatus(a.status)).length}</span></header>
                {applications.filter(a => isDeniedStatus(a.status)).length === 0 ? (
                  <div className="empty drag-target-hint">Drop candidates here</div>
                ) : (
                  applications.filter(a => isDeniedStatus(a.status)).map(a => {
                    const percent = getMatchPercent(a);
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
            </div>

            {(() => {
              const currentApp = selectedAppId
                ? applications.find(a => a.id === selectedAppId) || null
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

              const matchPercent = getMatchPercent(currentApp);
              const matchStyle = getMatchPercentStyle(matchPercent);

              return (
                <aside
                  className="candidate-preview"
                  draggable
                  onDragStart={(e) => handleDragStart(e, currentApp.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="preview-head">
                    <div className="preview-head-left">
                      <h3>{currentApp.applicant_name}</h3>
                      <p className="preview-location">{currentApp.city || currentApp.address || "Cavite"}</p>
                    </div>
                    <div className="preview-head-badges">
                      <div className="preview-rating-badge">
                        <span className="preview-rating-star">★</span>
                        <span className="preview-rating-num">{(currentApp as any).rating ? Number((currentApp as any).rating).toFixed(1) : "0.0"}</span>
                      </div>
                      <div
                        className="preview-match-badge-box"
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

                  <div className="preview-lists-container">
                    <div className="preview-pill-group">
                      <span className="preview-group-label">SKILLS</span>
                      <div className="preview-pill-wrap">
                        {(() => {
                          const items = parseItemList(currentApp.skills, [
                            "Python",
                            "API Development",
                          ]);
                          return items.map((item, idx) => (
                            <span key={idx} className="preview-pill skill-pill">{item}</span>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="preview-pill-group">
                      <span className="preview-group-label">QUALIFICATIONS</span>
                      <div className="preview-pill-wrap">
                        {(() => {
                          const items = parseItemList(currentApp.qualifications, [
                            "BS Information Technology (BSIT)",
                            "Internship / OJT Completion",
                          ]);
                          return items.map((item, idx) => (
                            <span key={idx} className="preview-pill quali-pill">{item}</span>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="preview-pill-group">
                      <span className="preview-group-label">CERTIFICATIONS</span>
                      <div className="preview-pill-wrap">
                        {(() => {
                          const items = parseItemList(currentApp.certifications, [
                            "Google IT Support Professional Certificate",
                          ]);
                          return items.map((item, idx) => (
                            <span key={idx} className="preview-pill cert-pill">{item}</span>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="preview-actions-bottom">
                    <button
                      type="button"
                      className="solid-btn view-docs-btn"
                      onClick={() => handleOpenReview(currentApp, true)}
                    >
                      View Docs
                    </button>

                    {isApprovedStatus(currentApp.status) ? (
                      <button
                        type="button"
                        className="solid-btn merged-preview-btn approved"
                        title="Click to undo approval and return to shortlisted"
                        onClick={() => handleUpdateStatus(currentApp.id, "shortlisted")}
                      >
                        Approved
                      </button>
                    ) : isDeniedStatus(currentApp.status) ? (
                      <button
                        type="button"
                        className="solid-btn merged-preview-btn denied"
                        title="Click to undo denial and return to shortlisted"
                        onClick={() => handleUpdateStatus(currentApp.id, "shortlisted")}
                      >
                        Denied
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`solid-btn shortlist-btn ${currentApp.status?.toLowerCase() === "shortlisted" ? "active" : ""}`}
                          title={currentApp.status?.toLowerCase() === "shortlisted" ? "Click to remove from Shortlist" : "Click to Shortlist"}
                          onClick={() =>
                            handleUpdateStatus(
                              currentApp.id,
                              currentApp.status?.toLowerCase() === "shortlisted" ? "pending" : "shortlisted"
                            )
                          }
                        >
                          {currentApp.status?.toLowerCase() === "shortlisted" ? "Shortlisted" : "Shortlist"}
                        </button>
                        <button
                          type="button"
                          className="solid-btn approve-btn"
                          onClick={() => handleUpdateStatus(currentApp.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="solid-btn reject-btn"
                          onClick={() => handleUpdateStatus(currentApp.id, "denied")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </aside>
              );
            })()}
          </div>
        </section>

        {/* DIRECT INVITATIONS BOARD */}
        <section id="direct-invitations" className="applicant-shortlist-board card" style={{ margin: "24px 14px 0", padding: "20px 24px" }}>
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
              <p style={{ margin: 0, fontSize: "0.9rem" }}>No direct invitations found under "{invitationFilter}".</p>
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
                        }}
                      >
                        {initialsFrom(candidateName)}
                      </span>
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

        {/* CANDIDATE REVIEW MODAL */}
        {reviewModalApp && (
          <div className="jd-overlay" onClick={() => setReviewModalApp(null)}>
            <div className="jd-panel" onClick={(e) => e.stopPropagation()}>
              <div className="jd-employer-strip" style={{ paddingTop: "20px" }}>
                <div className="jd-employer-logo-info">
                  <div className="jd-employer-logo" aria-label="Candidate initials">
                    <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "1.05rem" }}>
                      {initialsFrom(reviewModalApp.applicant_name)}
                    </span>
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
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        {reviewModalProfile?.email || "zaki.ablando@gmail.com"}
                      </span>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {reviewModalProfile?.contact_number || reviewModalProfile?.phone || "+63 917 845 2910"}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="jd-header-right-actions">
                  <div className="rating-score-box" title="Applicant rating">
                    <span className="star-icon">★</span>
                    <span>{reviewModalProfile?.rating ? Number(reviewModalProfile.rating).toFixed(1) : "0.0"}</span>
                  </div>
                  <div className="match-score-box green" title="Match score">
                    <small>MATCH</small>
                    <b>100%</b>
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
                        <h2 className="jd-title-h2">{reviewModalApp.desired_job_title || reviewModalApp.job_title}</h2>
                      </div>
                    </div>
                    <div className="jd-chips-inline">
                      <span className="setup-pill">{reviewModalProfile?.work_arrangement || "Remote"}</span>
                      <span className="salary-pill">
                        {(() => {
                          const sal = reviewModalProfile?.expected_salary || "10,000.00";
                          return sal.toUpperCase().includes("PHP") ? sal : `PHP ${sal}`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* SKILLS */}
                  <div className="jd-section">
                    <h3>SKILLS</h3>
                    <div className="jd-tags-wrap">
                      {(reviewModalProfile?.skills ? reviewModalProfile.skills.split(",") : ["Python", "API Development"]).map((s: string) => (
                        <span key={s} className="js-tag-chip js-tag-skill">{s.trim()}</span>
                      ))}
                    </div>
                  </div>

                  {/* QUALIFICATIONS */}
                  <div className="jd-section">
                    <h3>QUALIFICATIONS</h3>
                    <div className="jd-tags-wrap">
                      {(reviewModalProfile?.qualifications ? reviewModalProfile.qualifications.split(",") : ["BS Information Technology", "Problem Solving"]).map((q: string) => (
                        <span key={q} className="js-tag-chip js-tag-qualification">{q.trim()}</span>
                      ))}
                    </div>
                  </div>

                  {/* CERTIFICATIONS */}
                  <div className="jd-section">
                    <h3>CERTIFICATIONS</h3>
                    <div className="jd-tags-wrap">
                      {(reviewModalProfile?.certifications ? reviewModalProfile.certifications.split(",") : ["AWS Certified Associate", "IT Operations Foundations"]).map((c: string) => (
                        <span key={c} className="js-tag-chip" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>{c.trim()}</span>
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
                      aria-label="Back"
                      onClick={() => {
                        if (isPreviewingDoc) {
                          setIsPreviewingDoc(false);
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
                        <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 16px" }}>
                          System saved documents for <strong>{reviewModalApp.applicant_name}</strong>:
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
                                {reviewModalProfile?.resume_path || `${reviewModalApp.applicant_name.replace(/\s+/g, "_")}_Resume.pdf`}
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
                              href={`/api/applicants/${reviewModalApp.applicant_user_id}/resume?download=1`}
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
                            href={`/api/applicants/${reviewModalApp.applicant_user_id}/resume?download=1`}
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
                            src={`/api/applicants/${reviewModalApp.applicant_user_id}/resume`}
                            style={{ width: "100%", height: "100%", minHeight: "420px", border: "none" }}
                            title={`${reviewModalApp.applicant_name} Resume Document`}
                          />
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
                <div className="jd-footer-actions" style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="jd-cancel-btn" onClick={() => setReviewModalApp(null)}>Close</button>
                  <a href="/messages" className="solid-btn" style={{ padding: "8px 16px", textDecoration: "none", fontSize: "0.85rem", borderRadius: "6px", background: "#01294a", color: "#ffffff", display: "inline-flex", alignItems: "center" }}>
                    Message
                  </a>
                  {!isDirectInvitationModal && (
                    <>
                      <button
                        type="button"
                        className={`solid-btn ${reviewModalApp.status?.toLowerCase() === "shortlisted" ? "applied-btn" : ""}`}
                        style={reviewModalApp.status?.toLowerCase() !== "shortlisted" ? { background: "#fff8e6", color: "#b85a06", border: "1px solid #f7d49e" } : {}}
                        onClick={() => {
                          const nextStatus = reviewModalApp.status?.toLowerCase() === "shortlisted" ? "pending" : "shortlisted";
                          handleUpdateStatus(reviewModalApp.id, nextStatus);
                          setReviewModalApp((prev) => prev ? { ...prev, status: nextStatus } : null);
                        }}
                      >
                        {reviewModalApp.status?.toLowerCase() === "shortlisted" ? "Shortlisted" : "Shortlist"}
                      </button>
                      <button
                        type="button"
                        className="solid-btn"
                        style={{ background: "#e1f7ee", color: "#12874f", border: "1px solid #9fdfb9" }}
                        onClick={() => {
                          handleUpdateStatus(reviewModalApp.id, "approved");
                          setReviewModalApp((prev) => prev ? { ...prev, status: "approved" } : null);
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="solid-btn"
                        style={{ background: "#ffe8e8", color: "#b02a2a", border: "1px solid #f6b3b3" }}
                        onClick={() => {
                          handleUpdateStatus(reviewModalApp.id, "denied");
                          setReviewModalApp((prev) => prev ? { ...prev, status: "denied" } : null);
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
