import React, { useState } from "react";
import "./ApplicantDetailsModal.css";
import {
  isSkillMatch,
  isCertificationMatch,
  evaluateSkillRequirementMatch,
  calculateJobMatchDetails,
  getMatchColorClass,
} from "../../utils/filters";

export type WorkExpItem = {
  id?: string | number;
  title: string;
  company: string;
  city?: string;
  province?: string;
  startMonth?: string;
  startYear?: string;
  endMonth?: string;
  endYear?: string;
  isCurrent?: boolean;
  employmentType?: string;
  responsibilities?: string;
  skills?: string[];
};

export type CandidateModalData = {
  user_id?: number | string;
  id?: number | string;
  applicant_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  province?: string;
  address?: string;
  rating?: number | string | null;
  match_percentage?: number | string | null;
  job_title?: string;
  profile_picture_path?: string | null;
  summary?: string;
  languages?: string | string[];
  desired_job_title?: string;
  expected_salary?: number | string | null;
  expected_salary_min?: number | string | null;
  expected_salary_max?: number | string | null;
  work_arrangement?: string;
  nearby_location?: string;
  preferred_locations?: string | string[];
  skills?: string | string[];
  qualifications?: string | string[];
  certifications?: string | string[];
  shs_strand?: string;
  shs_school?: string;
  shs_grad_year?: string | number;
  college_course?: string;
  college_school?: string;
  college_grad_year?: string | number;
  vocational_course?: string;
  vocational_grad_year?: string | number;
  years_of_experience?: string | number;
  work_experience_json?: string;
  resume_path?: string | null;
  documents?: Array<{ id: string | number; file_name: string; url?: string }>;
};

export type ApplicantDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateModalData | null;
  customFooterActions?: React.ReactNode;
  employerJobs?: Array<{ id: number | string; title: string; location?: string; work_arrangement?: string }>;
  currentEmployerUserId?: number | string | null;
};

export default function ApplicantDetailsModal({
  isOpen,
  onClose,
  candidate,
  customFooterActions,
  employerJobs = [],
  currentEmployerUserId = null,
}: ApplicantDetailsModalProps) {
  const [candDetailTab, setCandDetailTab] = useState<"personal" | "preferences" | "competencies" | "experience">("personal");
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);
  const [docsList, setDocsList] = useState<Array<{ id: string | number; file_name: string; url?: string }>>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ file_name: string; url: string } | null>(null);

  // Side Panel Tabs state: "breakdown" | "otherJobs" | "messages" | null
  const [activeSideTab, setActiveSideTab] = useState<"breakdown" | "otherJobs" | "messages" | null>(null);
  const [hoveredCompareTag, setHoveredCompareTag] = useState<{ item: string; side: "applicant" | "employer"; category: string } | null>(null);

  // Candidate Messages state & handlers
  const [candMsgThread, setCandMsgThread] = useState<any | null>(null);
  const [candMessages, setCandMessages] = useState<any[]>([]);
  const [isCandMsgLoading, setIsCandMsgLoading] = useState(false);
  const [candMsgInput, setCandMsgInput] = useState("");
  const [isCandMsgSending, setIsCandMsgSending] = useState(false);
  const candMsgEndRef = React.useRef<HTMLDivElement | null>(null);

  // Prevent background page scrolling when modal is open
  React.useEffect(() => {
    if (isOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      setIsDocsDrawerOpen(false);
      setPreviewDoc(null);
      setCandDetailTab("personal");
      setActiveSideTab(null);
      setCandMessages([]);
      setCandMsgThread(null);
      setCandMsgInput("");
    }
  }, [isOpen]);

  // Load candidate messages when Messages side tab is opened
  const fetchApplicantMessages = async () => {
    const rawUser = localStorage.getItem("elitecruit-user");
    const currentUid = currentEmployerUserId || (rawUser ? JSON.parse(rawUser)?.id : null);
    const applicantUserId = candidate?.user_id || candidate?.id;
    if (!currentUid || !applicantUserId) return;

    setIsCandMsgLoading(true);
    try {
      const threadsRes = await fetch(`/api/users/${currentUid}/messages`);
      if (!threadsRes.ok) return;
      const threadsData = await threadsRes.json();
      const allThreads = threadsData?.threads || [];
      const existing = allThreads.find((t: any) => Number(t.other_user_id) === Number(applicantUserId));
      if (existing) {
        setCandMsgThread(existing);
        const msgRes = await fetch(`/api/messages/threads/${existing.id}`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setCandMessages(msgData?.messages || []);
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
        setCandMsgThread(null);
        setCandMessages([]);
      }
    } catch (err) {
      console.error("Error loading candidate messages:", err);
    } finally {
      setIsCandMsgLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeSideTab === "messages" && candidate) {
      fetchApplicantMessages();
    }
  }, [activeSideTab, candidate?.user_id, candidate?.id]);

  React.useEffect(() => {
    if (activeSideTab === "messages" && candMsgEndRef.current) {
      candMsgEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [candMessages, activeSideTab]);

  const handleSendCandidateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = candMsgInput.trim();
    if (!text || isCandMsgSending) return;
    const rawUser = localStorage.getItem("elitecruit-user");
    const currentUid = currentEmployerUserId || (rawUser ? JSON.parse(rawUser)?.id : null);
    const applicantUserId = candidate?.user_id || candidate?.id;
    if (!currentUid || !applicantUserId) return;

    setIsCandMsgSending(true);
    try {
      if (candMsgThread?.id) {
        const res = await fetch(`/api/messages/threads/${candMsgThread.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender_user_id: currentUid, message_text: text }),
        });
        if (res.ok) {
          const data = await res.json();
          setCandMessages((prev) => [...prev, data.message]);
          setCandMsgInput("");
          window.dispatchEvent(new Event("elitecruit_messages_update"));
        }
      } else {
        const res = await fetch("/api/messages/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_by_user_id: currentUid,
            participant_user_ids: [applicantUserId],
            title: `Application: ${candidate?.job_title || "Job Application"}`,
            message_text: text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setCandMsgThread(data.thread);
          setCandMessages([data.message]);
          setCandMsgInput("");
          window.dispatchEvent(new Event("elitecruit_messages_update"));
        }
      }
    } catch (err) {
      console.error("Failed to send candidate message:", err);
    } finally {
      setIsCandMsgSending(false);
    }
  };

  React.useEffect(() => {
    if (candidate?.documents && candidate.documents.length > 0) {
      setDocsList(candidate.documents);
      return;
    }
    const candUserId = candidate?.user_id || candidate?.id;
    if (candUserId && isOpen) {
      setIsDocsLoading(true);
      fetch(`/api/applicants/${candUserId}/documents`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data?.documents)) {
            setDocsList(data.documents);
          }
        })
        .catch(() => {})
        .finally(() => setIsDocsLoading(false));
    }
  }, [candidate?.user_id, candidate?.id, candidate?.documents, isOpen]);

  if (!isOpen || !candidate) return null;

  const candUserId = candidate.user_id || candidate.id;
  const displayName =
    candidate.applicant_name ||
    candidate.name ||
    (candidate.first_name || candidate.last_name
      ? `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim()
      : "Applicant Details");

  const locationStr =
    candidate.city || candidate.province || candidate.address || "Cavite";

  const parseItemList = (data: any, fallback: string[] = []): string[] => {
    if (!data) return fallback;
    if (Array.isArray(data)) return data;
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
    return String(data)
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
  };

  const isShsItem = (q: string) => {
    const lower = q.toLowerCase();
    return (
      lower.includes("strand") ||
      lower.includes("senior high") ||
      lower.includes("shs") ||
      lower.includes("stem") ||
      lower.includes("abm") ||
      lower.includes("humss") ||
      lower.includes("gas") ||
      lower.includes("tvl")
    );
  };

  const parseCandidateSalaryRange = (c: CandidateModalData) => {
    if (c.expected_salary_min && c.expected_salary_max) {
      return {
        min: `PHP ${Number(c.expected_salary_min).toLocaleString()}`,
        max: `PHP ${Number(c.expected_salary_max).toLocaleString()}`,
      };
    }
    if (c.expected_salary) {
      return {
        min: `PHP ${Number(c.expected_salary).toLocaleString()}`,
        max: "Negotiable",
      };
    }
    return { min: "Negotiable", max: "Negotiable" };
  };

  const profilePicSrc = candidate.profile_picture_path
    ? candidate.profile_picture_path.startsWith("http") || candidate.profile_picture_path.startsWith("/api")
      ? candidate.profile_picture_path
      : candUserId ? `/api/applicants/${candUserId}/profile-picture` : null
    : candUserId ? `/api/applicants/${candUserId}/profile-picture` : null;

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const allQuals = parseItemList(candidate.qualifications, []);
  const shsList = allQuals.filter(isShsItem);
  const collegeList = allQuals.filter((q) => !isShsItem(q));
  const skillsList = parseItemList(candidate.skills, []);
  const certList = parseItemList(candidate.certifications, []);
  const langList = parseItemList(candidate.languages, []);
  const prefLocs = parseItemList(candidate.preferred_locations, []);

  let parsedWorkExp: WorkExpItem[] = [];
  if (candidate.work_experience_json) {
    try {
      const parsed = JSON.parse(candidate.work_experience_json);
      if (Array.isArray(parsed)) parsedWorkExp = parsed;
    } catch {}
  }

  const candSkills = skillsList;
  const candQuals = allQuals;
  const candCerts = certList;
  const targetJobTitle = candidate.job_title || candidate.desired_job_title || "Job Position";
  const targetJob = (employerJobs || []).find(
    (j) => j.title.toLowerCase() === targetJobTitle.toLowerCase()
  ) || {
    id: 1,
    title: targetJobTitle,
    location: locationStr,
    work_arrangement: candidate.work_arrangement || "On-Site",
  };
  const jobSkills = candSkills.length > 0 ? candSkills.slice(0, 5) : ["Frontend Development", "UI/UX Design", "React", "TypeScript", "HTML/CSS"];
  const jobQuals = candQuals.length > 0 ? candQuals.slice(0, 2) : ["BS in Information Technology or Computer Science"];
  const jobCerts = candCerts.length > 0 ? candCerts.slice(0, 2) : ["IT Specialist Certification"];

  const matchDetails = calculateJobMatchDetails(
    {
      id: Number(targetJob.id) || 1,
      title: targetJob.title,
      location: targetJob.location || "Cavite",
      salaryMin: 25000,
      setup: targetJob.work_arrangement || "On-Site",
      skillTags: jobSkills,
      qualTags: jobQuals,
      certTags: jobCerts,
    },
    {
      desiredJobTitle: candidate.desired_job_title || candidate.job_title || "",
      workArrangement: candidate.work_arrangement || "On-Site",
      expectedSalary: candidate.expected_salary ? Number(candidate.expected_salary) : 30000,
      city: candidate.city || "Cavite",
      skills: candSkills,
      qualifications: candQuals,
      certifications: candCerts,
    }
  );

  const checkMatch = (jobItem: string, appItems: string[]) => {
    if (!appItems || appItems.length === 0) return false;
    return appItems.some((appItem) => isSkillMatch(jobItem, appItem));
  };

  const otherJobsList = (employerJobs || []).filter(
    (j) => String(j.title).toLowerCase() !== String(targetJobTitle).toLowerCase()
  );
  const displayOtherJobs = otherJobsList.length > 0 ? otherJobsList : [
    { id: 101, title: "UI/UX Designer", location: "Cavite", work_arrangement: "Hybrid", match: 92 },
    { id: 102, title: "Full-Stack Web Developer", location: "Cavite", work_arrangement: "On-Site", match: 88 },
    { id: 103, title: "QA / Software Tester", location: "Cavite", work_arrangement: "Remote", match: 81 },
  ];

  return (
    <div
      className="cand-details-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Applicant Details"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`jd-modal-container applicant-details-modal-container ${activeSideTab ? "with-side-panel" : ""}`}
        style={{
          maxWidth: activeSideTab ? "min(1320px, calc(100vw - 48px))" : "920px",
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
          justifyContent: "center",
          position: "relative",
          margin: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="applicant-details-modal-outer-wrap jd-panel-outer-wrap"
          style={{
            position: "relative",
            width: activeSideTab ? "min(720px, 54vw)" : "100%",
            maxWidth: activeSideTab ? "min(720px, 54vw)" : "920px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── FLOATING ACTION TABS ABOVE: Match Breakdown | Other Jobs | Messages ── */}
          <div className="cal-modal-floating-tabs-container jd-floating-tabs-container">
            <button
              type="button"
              className={`cal-modal-floating-tab jd-floating-breakdown-tab ${activeSideTab === "breakdown" ? "active" : ""}`}
              onClick={() => setActiveSideTab((prev) => (prev === "breakdown" ? null : "breakdown"))}
            >
              <span>{activeSideTab === "breakdown" ? "Hide Breakdown" : "Match Breakdown"}</span>
            </button>
            <button
              type="button"
              className={`cal-modal-floating-tab jd-floating-breakdown-tab ${activeSideTab === "otherJobs" ? "active" : ""}`}
              onClick={() => setActiveSideTab((prev) => (prev === "otherJobs" ? null : "otherJobs"))}
            >
              <span>{activeSideTab === "otherJobs" ? "Hide Other Jobs" : "Other Jobs"}</span>
            </button>
            <button
              type="button"
              className={`cal-modal-floating-tab jd-floating-breakdown-tab ${activeSideTab === "messages" ? "active" : ""}`}
              onClick={() => setActiveSideTab((prev) => (prev === "messages" ? null : "messages"))}
            >
              <span>{activeSideTab === "messages" ? "Hide Message" : "Messages"}</span>
            </button>
          </div>

          <div className="cand-details-panel jd-panel">
          {/* Candidate Strip */}
          <div className="cand-details-strip" style={{ paddingTop: "20px" }}>
            <div className="cand-details-logo-info">
              <div className="cand-details-logo" aria-label="Candidate initials">
                {profilePicSrc ? (
                  <img
                    src={profilePicSrc}
                    alt={displayName}
                    style={{ width: "100%", height: "100%", borderRadius: "12px", objectFit: "cover" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "1.05rem" }}>
                    {initials}
                  </span>
                )}
              </div>
              <div>
                <strong className="cand-details-name">{displayName}</strong>
                <span className="cand-details-location" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "3px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    {locationStr}
                  </span>
                  {candidate.email && (
                    <>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-10 7L2 7" />
                        </svg>
                        {candidate.email}
                      </span>
                    </>
                  )}
                  {candidate.phone && (
                    <>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {candidate.phone}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="cand-details-header-right">
              <div className="rating-score-box" title="Applicant rating">
                <span className="star-icon">★</span>
                <span>{candidate.rating ? Number(candidate.rating).toFixed(1) : "0.0"}</span>
              </div>
              {candidate.match_percentage != null && (
                <div
                  className={`match-score-box ${
                    Number(candidate.match_percentage) >= 80
                      ? "green"
                      : Number(candidate.match_percentage) >= 50
                      ? "yellow"
                      : "orange"
                  }`}
                  title="Match score"
                >
                  <small>MATCH</small>
                  <b>{candidate.match_percentage}%</b>
                </div>
              )}
              <button
                type="button"
                className={`cand-details-docs-btn ${isDocsDrawerOpen ? "active" : ""}`}
                onClick={() => setIsDocsDrawerOpen((prev) => !prev)}
              >
                Docs
              </button>
              <button
                type="button"
                className="applicant-modal-close-btn"
                style={{ marginLeft: "8px", background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" }}
                onClick={onClose}
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 4-Section Navigation Tabs */}
          <div className="cand-modal-nav-wrap">
            <nav className="profile-section-nav cand-modal-tabs" aria-label="Profile Sections">
              <button
                type="button"
                className={`cand-modal-tab-btn ${candDetailTab === "personal" ? "active" : ""}`}
                onClick={() => { setCandDetailTab("personal"); setIsDocsDrawerOpen(false); setPreviewDoc(null); }}
              >
                <span className="tab-num">1</span>
                <span>Personal & Contact</span>
              </button>
              <button
                type="button"
                className={`cand-modal-tab-btn ${candDetailTab === "preferences" ? "active" : ""}`}
                onClick={() => { setCandDetailTab("preferences"); setIsDocsDrawerOpen(false); setPreviewDoc(null); }}
              >
                <span className="tab-num">2</span>
                <span>Career Preferences</span>
              </button>
              <button
                type="button"
                className={`cand-modal-tab-btn ${candDetailTab === "competencies" ? "active" : ""}`}
                onClick={() => { setCandDetailTab("competencies"); setIsDocsDrawerOpen(false); setPreviewDoc(null); }}
              >
                <span className="tab-num">3</span>
                <span>Skills & Credentials</span>
              </button>
              <button
                type="button"
                className={`cand-modal-tab-btn ${candDetailTab === "experience" ? "active" : ""}`}
                onClick={() => { setCandDetailTab("experience"); setIsDocsDrawerOpen(false); setPreviewDoc(null); }}
              >
                <span className="tab-num">4</span>
                <span>Work Experience</span>
              </button>
            </nav>
          </div>

          <div className="cand-details-body-wrapper" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="cand-details-body">
              {/* TAB 1: PERSONAL & CONTACT */}
              {candDetailTab === "personal" && (
                <div className="cand-tab-content">
                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Professional Summary
                    </h4>
                    <p style={{ margin: 0, color: "#334155", lineHeight: 1.6, fontSize: "0.95rem" }}>
                      {candidate.summary || "No professional summary provided by the applicant."}
                    </p>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Languages Spoken
                    </h4>
                    <div className="jd-tags-wrap">
                      {langList.length > 0 ? (
                        langList.map((lang, idx) => (
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
                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Career Target
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                      <div className="company-info-card">
                        <small className="company-info-card-label">Desired Job Title</small>
                        <span className="company-info-card-val" style={{ color: "#0284c7" }}>
                          {candidate.desired_job_title || "Not specified"}
                        </span>
                      </div>
                      {(() => {
                        const sal = parseCandidateSalaryRange(candidate);
                        return (
                          <>
                            <div className="company-info-card">
                              <small className="company-info-card-label">Minimum Expected Salary</small>
                              <span className="company-info-card-val">{sal.min}</span>
                            </div>
                            <div className="company-info-card">
                              <small className="company-info-card-label">Maximum Expected Salary</small>
                              <span className="company-info-card-val">{sal.max}</span>
                            </div>
                          </>
                        );
                      })()}
                      <div className="company-info-card">
                        <small className="company-info-card-label">Work Arrangement</small>
                        <span className="setup-pill" style={{ alignSelf: "flex-start", marginTop: "2px", display: "inline-block" }}>
                          {candidate.work_arrangement || "On-site"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Geographic & Discovery Location
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                      <div className="company-info-card">
                        <small className="company-info-card-label">Designated Nearby Location</small>
                        <span className="company-info-card-val" style={{ color: "#0284c7" }}>
                          {candidate.nearby_location || candidate.city || "Not designated"}
                        </span>
                      </div>
                      <div className="company-info-card">
                        <small className="company-info-card-label">Home Address / Municipality</small>
                        <span className="company-info-card-val">
                          {candidate.address || candidate.city || "Not specified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Preferred Work Locations
                    </h4>
                    <div className="jd-tags-wrap">
                      {prefLocs.length > 0 ? (
                        prefLocs.map((loc, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-skill">{loc}</span>
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
                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Senior High School & Vocational
                    </h4>
                    <div className="jd-tags-wrap">
                      {shsList.length > 0 ? (
                        shsList.map((q, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No senior high / vocational records listed</span>
                      )}
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      College & Tertiary Education
                    </h4>
                    <div className="jd-tags-wrap">
                      {collegeList.length > 0 ? (
                        collegeList.map((q, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No college / tertiary degree listed</span>
                      )}
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Core Technical Skills
                    </h4>
                    <div className="jd-tags-wrap">
                      {skillsList.length > 0 ? (
                        skillsList.map((s, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-skill">{s}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No technical skills listed</span>
                      )}
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Professional Certifications
                    </h4>
                    <div className="jd-tags-wrap">
                      {certList.length > 0 ? (
                        certList.map((c, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-certification">{c}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No certifications listed</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: WORK EXPERIENCE */}
              {candDetailTab === "experience" && (
                <div className="cand-tab-content">
                  {candidate.years_of_experience && (
                    <div style={{ background: "#e0f2fe", border: "1px solid #bae6fd", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", color: "#0369a1", fontSize: "0.92rem" }}>
                      <strong>Total Professional Experience:</strong> {candidate.years_of_experience}
                    </div>
                  )}

                  {parsedWorkExp.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "36px 20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                        No employment history entries added by the applicant.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {parsedWorkExp.map((exp, idx) => (
                        <div key={exp.id || idx} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                              <h4 style={{ margin: "0 0 2px", fontSize: "1rem", color: "#0f172a" }}>{exp.title}</h4>
                              <span style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 600 }}>{exp.company}</span>
                              {(exp.city || exp.province) && (
                                <span style={{ fontSize: "0.84rem", color: "#94a3b8" }}> • {[exp.city, exp.province].filter(Boolean).join(", ")}</span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                              {exp.isCurrent
                                ? `${exp.startMonth || ""} ${exp.startYear || ""} - Present`
                                : `${exp.startMonth || ""} ${exp.startYear || ""} - ${exp.endMonth || ""} ${exp.endYear || ""}`}
                              {exp.employmentType && (
                                <span className="setup-pill" style={{ marginLeft: "8px" }}>{exp.employmentType}</span>
                              )}
                            </div>
                          </div>
                          {exp.responsibilities && (
                            <p style={{ margin: "8px 0 0", color: "#475569", fontSize: "0.88rem", whiteSpace: "pre-line", lineHeight: 1.5 }}>
                              {exp.responsibilities}
                            </p>
                          )}
                          {Array.isArray(exp.skills) && exp.skills.length > 0 && (
                            <div className="jd-tags-wrap" style={{ marginTop: "10px" }}>
                              {exp.skills.map((sk, sIdx) => (
                                <span key={sIdx} className="js-tag-chip js-tag-skill" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Slide-in Docs Drawer */}
            <div className={`jd-faq-drawer ${isDocsDrawerOpen ? "open" : ""}`}>
              <div className="jd-faq-header">
                <h3>{previewDoc ? "Document Preview" : "Candidate Documents"}</h3>
                <button
                  type="button"
                  className="jd-faq-back-btn"
                  onClick={() => {
                    if (previewDoc) setPreviewDoc(null);
                    else setIsDocsDrawerOpen(false);
                  }}
                >
                  ←
                </button>
              </div>
              <div className="jd-faq-body">
                {!previewDoc ? (
                  isDocsLoading ? (
                    <p className="jd-faq-loading">Loading documents...</p>
                  ) : docsList.length === 0 ? (
                    <p className="jd-faq-empty">No documents attached by this candidate.</p>
                  ) : (
                    docsList.map((doc) => (
                      <div
                        key={doc.id}
                        className="jd-faq-item"
                        style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0d2f4f" }}>
                          {doc.file_name}
                        </span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="solid-btn"
                            style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                            onClick={() => setPreviewDoc({ file_name: doc.file_name, url: doc.url || `/api/applicants/${candUserId}/resume` })}
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
                    <iframe
                      src={previewDoc.url}
                      style={{ width: "100%", height: "420px", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                      title={previewDoc.file_name}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="cand-details-footer" style={{ display: "flex", justifyContent: candidate.job_title ? "space-between" : "flex-end", alignItems: "center", width: "100%", gap: "10px" }}>
            {candidate.job_title && (
              <span style={{ fontSize: "0.88rem", color: "#64748b" }}>
                Target Job: <strong style={{ color: "inherit" }}>{candidate.job_title}</strong>
              </span>
            )}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {customFooterActions}
              <button
                type="button"
                className="cand-details-cancel-btn"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIDE PANEL 1: MATCH BREAKDOWN ── */}
      {activeSideTab === "breakdown" && (
        <aside
          className="applicant-side-comparison-panel jd-side-comparison-panel"
          style={{
            width: "480px",
            height: "700px",
            maxHeight: "88vh",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
            border: "1px solid #cbd5e1",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <div
            className="side-panel-header jd-side-panel-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "#f8fbff",
              borderBottom: "1px solid #e8f0f8",
              flexShrink: 0,
            }}
          >
            <div className="side-title-row jd-side-title-row">
              <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 800, color: "#01294a" }}>
                Match Breakdown
              </h3>
              <span className="side-subtitle jd-side-subtitle" style={{ fontSize: "0.78rem", color: "#557796", fontWeight: 600 }}>
                Side-by-side candidate profile vs job requirements
              </span>
            </div>
            <div className="side-header-actions jd-side-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className={`match-badge-pill ${getMatchColorClass(Number(candidate.match_percentage) || matchDetails.score)}`}>
                {candidate.match_percentage || matchDetails.score}% Match
              </span>
              <button
                type="button"
                className="side-close-btn jd-side-close-btn"
                onClick={() => setActiveSideTab(null)}
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="side-panel-body jd-side-panel-body" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Legend strip */}
            <div className="jd-compare-legend" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px", padding: "10px 14px", background: "#f4f8fc", borderRadius: "8px", border: "1px solid #dbe7f3", fontSize: "0.78rem", color: "#315170" }}>
              <div className="legend-item" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="legend-dot green" style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                <span><strong>Green:</strong> Fully satisfied</span>
              </div>
              <div className="legend-item" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="legend-dot yellow" style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                <span><strong>Yellow:</strong> Partial match</span>
              </div>
              <div className="legend-item" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="legend-dot red" style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                <span><strong>Red:</strong> Missing</span>
              </div>
            </div>

            {/* Master 2-Column Unified Container */}
            <div className="jd-unified-compare-container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* ── Column 1: Candidate Profile ── */}
              <div className="jd-master-col applicant-col" style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div className="jd-master-col-header" style={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a", borderBottom: "1px solid #cbd5e1", paddingBottom: "6px" }}>
                  <span>Candidate Profile</span>
                </div>
                <div className="jd-master-col-content" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="jd-master-row">
                    <div className="jd-row-label-wrap" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Skills</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{candSkills.length} listed</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {candSkills.length > 0 ? (
                        candSkills.map((item) => (
                          <span key={item} className="jd-comp-tag app-matched" style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "6px" }}>
                            {item}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>No skills listed</span>
                      )}
                    </div>
                  </div>

                  <div className="jd-master-row">
                    <div className="jd-row-label-wrap" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Qualifications</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{candQuals.length} listed</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {candQuals.length > 0 ? (
                        candQuals.map((item) => (
                          <span key={item} className="jd-comp-tag app-matched" style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "6px" }}>
                            {item}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>No qualifications listed</span>
                      )}
                    </div>
                  </div>

                  <div className="jd-master-row">
                    <div className="jd-row-label-wrap" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Certifications</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{candCerts.length} listed</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {candCerts.length > 0 ? (
                        candCerts.map((item) => (
                          <span key={item} className="jd-comp-tag app-matched" style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "6px" }}>
                            {item}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>No certifications listed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Column 2: Employer Requirements ── */}
              <div className="jd-master-col employer-col" style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div className="jd-master-col-header employer" style={{ fontWeight: 800, fontSize: "0.85rem", color: "#0284c7", borderBottom: "1px solid #cbd5e1", paddingBottom: "6px" }}>
                  <span>Employer Requirements</span>
                </div>
                <div className="jd-master-col-content" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="jd-master-row">
                    <div className="jd-row-label-wrap" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Skills</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{jobSkills.length} required</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {jobSkills.map((item) => {
                        const evalResult = evaluateSkillRequirementMatch(item, candSkills, candCerts);
                        const statusClass = evalResult.status === "matched" ? "tag-matched-green" : evalResult.status === "partial" ? "tag-partial-yellow" : "tag-missing-red";
                        const icon = evalResult.status === "matched" ? "✓" : evalResult.status === "partial" ? "▲" : "✗";
                        return (
                          <span key={item} className={`jd-comp-tag ${statusClass}`} style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "6px" }}>
                            <span style={{ marginRight: "4px", fontWeight: 800 }}>{icon}</span>
                            {item}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="jd-master-row">
                    <div className="jd-row-label-wrap" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Qualifications</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{jobQuals.length} required</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {jobQuals.map((item) => {
                        const matched = checkMatch(item, candQuals);
                        return (
                          <span key={item} className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"}`} style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "6px" }}>
                            <span style={{ marginRight: "4px", fontWeight: 800 }}>{matched ? "✓" : "✗"}</span>
                            {item}
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
      )}

      {/* ── SIDE PANEL 2: OTHER JOBS ── */}
      {activeSideTab === "otherJobs" && (
        <aside
          className="applicant-side-comparison-panel jd-side-comparison-panel"
          style={{
            width: "480px",
            height: "700px",
            maxHeight: "88vh",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
            border: "1px solid #cbd5e1",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <div
            className="side-panel-header jd-side-panel-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "#f8fbff",
              borderBottom: "1px solid #e8f0f8",
              flexShrink: 0,
            }}
          >
            <div className="side-title-row jd-side-title-row">
              <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 800, color: "#01294a" }}>
                Other Employer Jobs
              </h3>
              <span className="side-subtitle jd-side-subtitle" style={{ fontSize: "0.78rem", color: "#557796", fontWeight: 600 }}>
                Candidate compatibility across active job postings
              </span>
            </div>
            <button
              type="button"
              className="side-close-btn jd-side-close-btn"
              onClick={() => setActiveSideTab(null)}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          <div className="side-panel-body jd-side-panel-body" style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {displayOtherJobs.map((otherJob: any) => {
              const baseMatch = Number(candidate.match_percentage) || 90;
              const percent = otherJob.match || Math.max(70, Math.min(99, baseMatch - (((Number(otherJob.id) || 1) * 3) % 12)));
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
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#01294a" }}>
                      {otherJob.title}
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "2px", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        {otherJob.location || "Cavite"}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                        {otherJob.work_arrangement || "On-Site"}
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

      {/* ── SIDE PANEL 3: MESSAGES ── */}
      {activeSideTab === "messages" && (
        <aside
          className="applicant-side-comparison-panel cand-message-side-panel jd-side-comparison-panel"
          style={{
            width: "480px",
            height: "700px",
            maxHeight: "88vh",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
            border: "1px solid #cbd5e1",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <div
            className="side-panel-header jd-side-panel-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "#f8fbff",
              borderBottom: "1px solid #e8f0f8",
              flexShrink: 0,
            }}
          >
            <div className="side-title-row jd-side-title-row">
              <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 800, color: "#01294a" }}>
                Messages
              </h3>
              <span className="side-subtitle jd-side-subtitle" style={{ fontSize: "0.78rem", color: "#557796", fontWeight: 600 }}>
                Chat with {displayName}
              </span>
            </div>
            <button
              type="button"
              className="side-close-btn jd-side-close-btn"
              onClick={() => setActiveSideTab(null)}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          <div
            className="cand-msg-chat-body"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
              background: "#f8fafc",
            }}
          >
            <div
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
              {isCandMsgLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", fontSize: "0.88rem", gap: "8px" }}>
                  <span>Loading conversation...</span>
                </div>
              ) : candMessages.length === 0 ? (
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
                      background: "rgba(2, 132, 199, 0.12)",
                      color: "#0284c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.4rem",
                    }}
                  >
                    💬
                  </div>
                  <h4 className="cand-msg-empty-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
                    Start a conversation
                  </h4>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Send an interview follow-up or question directly to {displayName}.
                  </span>
                </div>
              ) : (
                <>
                  {candMessages.map((msg: any) => {
                    const rawUser = localStorage.getItem("elitecruit-user");
                    const myUid = currentEmployerUserId || (rawUser ? JSON.parse(rawUser)?.id : null);
                    const isMe = Number(msg.sender_user_id) === Number(myUid);
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
                            {displayName}
                          </span>
                        )}
                        <div
                          className={`cand-msg-bubble ${isMe ? "outgoing" : "incoming"}`}
                          style={{
                            maxWidth: "82%",
                            padding: "10px 14px",
                            borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                            background: isMe ? "#0284c7" : "#ffffff",
                            color: isMe ? "#ffffff" : "#1e293b",
                            border: isMe ? "none" : "1px solid #e2e8f0",
                            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
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
                  <div ref={candMsgEndRef} />
                </>
              )}
            </div>

            {/* Compose Bar */}
            <form
              onSubmit={handleSendCandidateMessage}
              className="cand-msg-compose-bar"
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #e2e8f0",
                background: "#ffffff",
                display: "flex",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                className="cand-msg-input"
                placeholder={`Message ${displayName}...`}
                value={candMsgInput}
                onChange={(e) => setCandMsgInput(e.target.value)}
                disabled={isCandMsgSending}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={isCandMsgSending || !candMsgInput.trim()}
                className="cand-msg-send-btn"
                style={{
                  padding: "10px 18px",
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  cursor: candMsgInput.trim() ? "pointer" : "not-allowed",
                  opacity: candMsgInput.trim() ? 1 : 0.6,
                }}
              >
                Send
              </button>
            </form>
          </div>
        </aside>
      )}
    </div>
  </div>
  );
}
