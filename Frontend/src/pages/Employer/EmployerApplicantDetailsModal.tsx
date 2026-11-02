import React, { useState, useMemo } from "react";
import "./EmployerApplicantDetailsModal.css";
import { JobDetailsModal, type JobModalData } from "../../components/modals";
import {
  isSkillMatch,
  isCertificationMatch,
  evaluateSkillRequirementMatch,
  calculateJobMatchDetails,
  calculateCandidateMatch,
  getMatchColorClass,
} from "../../utils/filters";

export type BreakdownCourseSkillItem = {
  name: string;
  course?: string;
  year?: string;
};

export type BreakdownCertItem = {
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

  const parseToken = (token: string): BreakdownCertItem | null => {
    if (!token || !token.trim()) return null;
    const trimmed = token.trim();
    if (trimmed === "[]" || trimmed === "()" || trimmed === "null" || trimmed === '""') return null;

    let category = "General";
    const catMatch = trimmed.match(/\[([^\[\]]+)\]/);
    if (catMatch && catMatch[1].trim()) {
      category = catMatch[1].trim();
    }

    let acquiredYear = "2010";
    let expiry = "2026";

    const lastParen = trimmed.match(/\(([^()]+)\)$/);
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

    let cleanName = trimmed.replace(/\s*\[[^\[\]]*\]/g, "").replace(/\s*\([^()]*\)$/, "").trim();
    const openCount = (cleanName.match(/\(/g) || []).length;
    const closeCount = (cleanName.match(/\)/g) || []).length;
    if (openCount > closeCount) cleanName = cleanName + ")".repeat(openCount - closeCount);
    else if (closeCount > openCount) cleanName = cleanName.replace(/\)+$/, "");

    cleanName = cleanName.trim();
    if (!cleanName || cleanName === "[]" || cleanName === "()") return null;

    return {
      name: cleanName,
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
              acquiredYear: p.acquiredYear || p.year,
              expiry: p.expiry,
            });
          } else if (p) {
            const item = parseToken(String(p));
            if (item) items.push(item);
          }
        });
      }
    } catch {}

    if (items.length === 0) {
      const rawTokens = raw.split(/[\n,;•|]+/);
      rawTokens.forEach((tok) => {
        const item = parseToken(tok);
        if (item) items.push(item);
      });
    }
  }

  if (items.length === 0 && fallbackTags.length > 0) {
    fallbackTags.forEach((tok) => {
      const item = parseToken(tok);
      if (item) items.push(item);
    });
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
  job_id?: number | string | null;
  submitted_at?: string | null;
  applied_date?: string | null;
  status?: string | null;
  response_letter?: string | null;
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export type EmployerApplicantDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateModalData | null;
  customFooterActions?: React.ReactNode;
  employerJobs?: Array<{
    id: number | string;
    title: string;
    location?: string;
    work_arrangement?: string;
    required_skills?: string | string[];
    skills?: string | string[];
    qualifications?: string | string[];
    certifications?: string | string[];
    salary_min?: number | string;
    salary_max?: number | string;
    description?: string;
    [key: string]: any;
  }>;
  currentEmployerUserId?: number | string | null;
  initialSideTab?: "breakdown" | "messages" | "other-jobs" | null;
  onViewJobDetails?: (job: any) => void;
};

export default function EmployerApplicantDetailsModal({
  isOpen,
  onClose,
  candidate,
  customFooterActions,
  employerJobs = [],
  currentEmployerUserId = null,
  initialSideTab = null,
  onViewJobDetails,
}: EmployerApplicantDetailsModalProps) {
  const [candDetailTab, setCandDetailTab] = useState<"personal" | "preferences" | "competencies" | "experience">("personal");
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);
  const [docsList, setDocsList] = useState<Array<{ id: string | number; file_name: string; url?: string }>>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ file_name: string; url: string } | null>(null);

  // Side Panel Tabs state: "breakdown" | "messages" | "other-jobs" | null
  const [activeSideTab, setActiveSideTab] = useState<"breakdown" | "messages" | "other-jobs" | null>(initialSideTab || null);
  const [selectedPreviewJob, setSelectedPreviewJob] = useState<any | null>(null);
  const [activeBreakdownPopup, setActiveBreakdownPopup] = useState<{
    type: "skills" | "certifications";
    category: string;
  } | null>(null);
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
    if (isOpen) {
      setActiveSideTab(initialSideTab || null);
    } else {
      setIsDocsDrawerOpen(false);
      setPreviewDoc(null);
      setCandDetailTab("personal");
      setActiveSideTab(null);
      setSelectedPreviewJob(null);
      setActiveBreakdownPopup(null);
      setCandMessages([]);
      setCandMsgThread(null);
      setCandMsgInput("");
    }
  }, [isOpen, initialSideTab]);

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
    if (Array.isArray(data)) {
      return data
        .flatMap((item) => {
          if (typeof item === "string" && (item.startsWith("[") || item.startsWith("{"))) {
            try {
              const inner = JSON.parse(item);
              if (Array.isArray(inner)) return inner;
            } catch {}
          }
          return item;
        })
        .map(String)
        .map((s) => s.replace(/^[\["']+|[\]"']+$/g, "").trim())
        .filter(Boolean);
    }
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed
          .map(String)
          .map((s) => s.replace(/^[\["']+|[\]"']+$/g, "").trim())
          .filter(Boolean);
      }
    } catch {}
    return String(data)
      .replace(/^[\[\(\{]+|[\]\)\}]+$/g, "")
      .split(/[,;\n•|]+/)
      .map((t) => t.trim().replace(/^["']+|["']+$/g, "").trim())
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
  const jobSkills = parseItemList(
    (targetJob as any).required_skills || (targetJob as any).skills,
    candSkills.length > 0 ? candSkills.slice(0, 5) : ["Frontend Development", "UI/UX Design", "React", "TypeScript", "HTML/CSS"]
  );
  const jobQuals = parseItemList(
    (targetJob as any).qualifications,
    candQuals.length > 0 ? candQuals.slice(0, 2) : ["BS in Information Technology or Computer Science"]
  );
  const jobCerts = parseItemList(
    (targetJob as any).certifications,
    []
  );

  const groupedBreakdownSkills = useMemo(() => {
    return parseBreakdownSkillItems(
      typeof candidate.skills === "string" ? candidate.skills : null,
      candSkills
    );
  }, [candidate.skills, candSkills]);

  const groupedBreakdownCerts = useMemo(() => {
    return parseBreakdownCertItems(
      typeof candidate.certifications === "string" ? candidate.certifications : null,
      candCerts
    );
  }, [candidate.certifications, candCerts]);

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

  const renderBreakdownPopupModal = () => {
    if (!activeBreakdownPopup) return null;
    const { type, category } = activeBreakdownPopup;
    const itemsList = type === "skills" ? groupedBreakdownSkills[category] || [] : groupedBreakdownCerts[category] || [];
    const comparisonTargetList = type === "skills" ? jobSkills : jobCerts;
    const label = type === "skills" ? (itemsList.length === 1 ? "skill" : "skills") : (itemsList.length === 1 ? "certification" : "certifications");

    return (
      <div
        className="skill-popup-modal-overlay"
        onClick={() => setActiveBreakdownPopup(null)}
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
                {type === "skills" ? (
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
                {category}
              </h3>
              <span className="skill-popup-count-badge">
                {itemsList.length} {label}
              </span>
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
              {itemsList.length === 0 ? (
                <div className="jd-no-data-text">
                  No items found in this category.
                </div>
              ) : (
                itemsList.map((item, idx) => {
                  const isCert = activeBreakdownPopup.type === "certifications";
                  const isRel = comparisonTargetList.length > 0 && comparisonTargetList.some((jt) =>
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
                })
              )}
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
    );
  };

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
        className={`cand-details-modal-container jd-modal-container ${activeSideTab ? "with-side-panel" : ""}`}
        style={{
          maxWidth: activeSideTab ? "min(1480px, calc(100vw - 32px))" : "920px",
          width: "fit-content",
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
          justifyContent: "center",
          position: "relative",
          margin: "auto",
          background: "transparent",
          border: "none",
          boxShadow: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="cand-details-panel-wrap jd-panel-outer-wrap"
          style={{
            position: "relative",
            width: "920px",
            maxWidth: "min(920px, calc(100vw - 40px))",
            minWidth: "min(920px, calc(100vw - 40px))",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "transparent",
            border: "none",
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
              className={`cal-modal-floating-tab jd-floating-breakdown-tab ${activeSideTab === "other-jobs" ? "active" : ""}`}
              onClick={() => setActiveSideTab((prev) => (prev === "other-jobs" ? null : "other-jobs"))}
            >
              <span>{activeSideTab === "other-jobs" ? "Hide Other Jobs" : "Other Jobs"}</span>
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
                  <div className="cand-details-card">
                    <h4 className="cand-details-card-title">
                      Professional Summary
                    </h4>
                    <p className="cand-summary-text">
                      {candidate.summary || "No professional summary provided by the applicant."}
                    </p>
                  </div>

                  <div className="cand-details-card">
                    <h4 className="cand-details-card-title">
                      Languages Spoken
                    </h4>
                    <div className="jd-tags-wrap">
                      {langList.length > 0 ? (
                        langList.map((lang, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-skill">{lang}</span>
                        ))
                      ) : (
                        <span className="cand-empty-muted-text">No specific languages specified</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CAREER PREFERENCES */}
              {candDetailTab === "preferences" && (
                <div className="cand-tab-content">
                  <div className="cand-details-card">
                    <h4 className="cand-details-card-title">
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

                  <div className="cand-details-card">
                    <h4 className="cand-details-card-title">
                      Preferred Work Locations
                    </h4>
                    <div className="jd-tags-wrap">
                      {prefLocs.length > 0 ? (
                        prefLocs.map((loc, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-skill">{loc}</span>
                        ))
                      ) : (
                        <span className="cand-empty-muted-text">No preferred location restrictions specified</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SKILLS & CREDENTIALS */}
              {candDetailTab === "competencies" && (
                <div className="cand-tab-content">
                  <div className="cand-details-card">
                    <h4 className="cand-details-card-title">
                      Senior High School & Vocational
                    </h4>
                    <div className="jd-tags-wrap">
                      {shsList.length > 0 ? (
                        shsList.map((q, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                        ))
                      ) : (
                        <span className="cand-empty-muted-text">No senior high / vocational records listed</span>
                      )}
                    </div>
                  </div>

                  <div className="cand-details-card">
                    <h4 className="cand-details-card-title">
                      College & Tertiary Education
                    </h4>
                    <div className="jd-tags-wrap">
                      {collegeList.length > 0 ? (
                        collegeList.map((q, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                        ))
                      ) : (
                        <span className="cand-empty-muted-text">No college / tertiary degree listed</span>
                      )}
                    </div>
                  </div>

                  <div className="cand-details-card">
                    <h4 className="cand-details-card-title">
                      Core Technical Skills
                    </h4>
                    <div className="jd-tags-wrap">
                      {skillsList.length > 0 ? (
                        skillsList.map((s, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-skill">{s}</span>
                        ))
                      ) : (
                        <span className="cand-empty-muted-text">No technical skills listed</span>
                      )}
                    </div>
                  </div>

                  <div className="cand-details-card">
                    <h4 className="cand-details-card-title">
                      Professional Certifications
                    </h4>
                    <div className="jd-tags-wrap">
                      {certList.length > 0 ? (
                        certList.map((c, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-certification">{c}</span>
                        ))
                      ) : (
                        <span className="cand-empty-muted-text">No certifications listed</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: WORK EXPERIENCE */}
              {candDetailTab === "experience" && (
                <div className="cand-tab-content">
                  {candidate.years_of_experience && (
                    <div className="cand-exp-banner">
                      <strong>Total Professional Experience:</strong> {candidate.years_of_experience}
                    </div>
                  )}

                  {parsedWorkExp.length === 0 ? (
                    <div className="cand-exp-empty-card">
                      <p className="cand-exp-empty-text">
                        No employment history entries added by the applicant.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {parsedWorkExp.map((exp, idx) => (
                        <div key={exp.id || idx} className="cand-exp-item-card">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                              <h4 className="cand-exp-title">{exp.title}</h4>
                              <span className="cand-exp-company">{exp.company}</span>
                              {(exp.city || exp.province) && (
                                <span className="cand-exp-loc"> • {[exp.city, exp.province].filter(Boolean).join(", ")}</span>
                              )}
                            </div>
                            <div className="cand-exp-date">
                              {exp.isCurrent
                                ? `${exp.startMonth || ""} ${exp.startYear || ""} - Present`
                                : `${exp.startMonth || ""} ${exp.startYear || ""} - ${exp.endMonth || ""} ${exp.endYear || ""}`}
                              {exp.employmentType && (
                                <span className="setup-pill" style={{ marginLeft: "8px" }}>{exp.employmentType}</span>
                              )}
                            </div>
                          </div>
                          {exp.responsibilities && (
                            <p className="cand-exp-responsibilities">
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

          {/* Modal Footer (Target Job removed for Applicant Management) */}
          <div className="cand-details-footer" style={{ display: "flex", justifyContent: (candidate.submitted_at || candidate.applied_date) ? "space-between" : "flex-end", alignItems: "center", width: "100%", gap: "10px" }}>
            <div className="cand-footer-meta jd-footer-meta" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {(candidate.submitted_at || candidate.applied_date) && (
                <span><strong>Applied On:</strong> {formatDate(candidate.submitted_at || candidate.applied_date)}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                className="cand-details-cancel-btn"
                onClick={onClose}
              >
                Close
              </button>
              {customFooterActions}
            </div>
          </div>
        </div>
      </div>

      {/* ── SIDE PANEL 1: MATCH BREAKDOWN (COMPETENCIES & REQUIREMENTS) ── */}
      {activeSideTab === "breakdown" && (
        <aside
          className="applicant-side-comparison-panel jd-side-comparison-panel"
          style={{
            width: "480px",
            maxWidth: "min(480px, calc(100vw - 976px))",
            minWidth: "320px",
            flex: "1 1 440px",
            height: "700px",
            maxHeight: "88vh",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 1,
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <div className="side-panel-header jd-side-panel-header">
            <div className="side-title-row jd-side-title-row">
              <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 800 }}>
                Competencies & Requirements
              </h3>
              <span className="side-subtitle jd-side-subtitle" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                Side-by-side profile match vs employer postings
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
            <div className="jd-compare-legend">
              <div className="legend-item" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="legend-dot green" style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                <span><strong>Green:</strong> Fully satisfied (Skill & Experience)</span>
              </div>
              <div className="legend-item" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="legend-dot yellow" style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                <span><strong>Yellow:</strong> Partial match</span>
              </div>
              <div className="legend-item" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="legend-dot red" style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                <span><strong>Red:</strong> Missing requirement</span>
              </div>
            </div>

            {/* Master 2-Column Unified Container */}
            <div className="jd-unified-compare-container">
              <div className="jd-master-col-header applicant-header">
                <span>Your Profile</span>
              </div>
              <div className="jd-master-col-header employer-header">
                <span>Employer's Requirements</span>
              </div>

              {/* Row 1: Skills */}
              <div className="jd-master-row-card applicant-col">
                <div className="jd-row-label-wrap">
                  <span className="jd-row-label">Skills</span>
                  <span className="col-count-text">{candSkills.length} listed</span>
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
                    <span className="jd-no-data-text">No skills listed</span>
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
                      const evalResult = evaluateSkillRequirementMatch(item, candSkills, candCerts);
                      const statusClass =
                        evalResult.status === "matched"
                          ? "tag-matched-green"
                          : evalResult.status === "partial"
                          ? "tag-partial-yellow"
                          : "tag-missing-red";
                      const icon =
                        evalResult.status === "matched"
                          ? "✓"
                          : evalResult.status === "partial"
                          ? "▲"
                          : "✗";
                      const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                      const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                      return (
                        <span
                          key={item}
                          className={`jd-comp-tag ${statusClass} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                          onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "skills" })}
                          onMouseLeave={() => setHoveredCompareTag(null)}
                        >
                          <span className="tag-icon">{icon}</span>
                          <span className="tag-text">{item}</span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="jd-no-data-text">No specific skills required</span>
                  )}
                </div>
              </div>

              {/* Row 2: Qualifications */}
              <div className="jd-master-row-card applicant-col">
                <div className="jd-row-label-wrap">
                  <span className="jd-row-label">Qualifications</span>
                  <span className="col-count-text">{candQuals.length} listed</span>
                </div>
                <div className="jd-col-tags-container">
                  {candQuals.length > 0 ? (
                    candQuals.map((item) => {
                      const isRel = checkMatch(item, jobQuals);
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
                    <span className="jd-no-data-text">No qualifications listed</span>
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
                    jobQuals.map((jQual) => {
                      const isMatched = checkMatch(jQual, candQuals);
                      const isHoverSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === jQual;
                      const isHoverLinked = hoveredCompareTag?.side === "applicant" && isSkillMatch(jQual, hoveredCompareTag.item);
                      return (
                        <span
                          key={jQual}
                          className={`jd-comp-tag ${isMatched ? "tag-matched-green" : "tag-missing-red"} ${isHoverSource ? "tag-hover-source" : ""} ${isHoverLinked ? "tag-hover-linked" : ""}`}
                          onMouseEnter={() => setHoveredCompareTag({ item: jQual, side: "employer", category: "qualifications" })}
                          onMouseLeave={() => setHoveredCompareTag(null)}
                        >
                          <span className="tag-icon">{isMatched ? "✓" : "✗"}</span>
                          <span className="tag-text">{jQual}</span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="jd-no-data-text">None specified</span>
                  )}
                </div>
              </div>

              {/* Row 3: Certifications */}
              <div className="jd-master-row-card applicant-col">
                <div className="jd-row-label-wrap">
                  <span className="jd-row-label">Certifications</span>
                  <span className="col-count-text">{candCerts.length} listed</span>
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
                    <span className="jd-no-data-text">No certifications listed</span>
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
                    jobCerts.map((jCert) => {
                      const isMatched = checkMatch(jCert, candCerts);
                      const isHoverSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === jCert;
                      const isHoverLinked = hoveredCompareTag?.side === "applicant" && isCertificationMatch(jCert, hoveredCompareTag.item);
                      return (
                        <span
                          key={jCert}
                          className={`jd-comp-tag ${isMatched ? "tag-matched-green" : "tag-missing-red"} ${isHoverSource ? "tag-hover-source" : ""} ${isHoverLinked ? "tag-hover-linked" : ""}`}
                          onMouseEnter={() => setHoveredCompareTag({ item: jCert, side: "employer", category: "certifications" })}
                          onMouseLeave={() => setHoveredCompareTag(null)}
                        >
                          <span className="tag-icon">{isMatched ? "✓" : "✗"}</span>
                          <span className="tag-text">{jCert}</span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="jd-no-data-text" style={{ fontStyle: "italic", color: "#94a3b8" }}>
                      No certifications required for this position
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ── SIDE PANEL 2: MESSAGES ── */}
      {activeSideTab === "messages" && (
        <aside
          className="applicant-side-comparison-panel cand-message-side-panel jd-side-comparison-panel"
          style={{
            width: "480px",
            maxWidth: "min(480px, calc(100vw - 976px))",
            minWidth: "320px",
            flex: "1 1 440px",
            height: "700px",
            maxHeight: "88vh",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 1,
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
              flexShrink: 0,
            }}
          >
            <div className="side-title-row jd-side-title-row">
              <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 800 }}>
                Messages
              </h3>
              <span className="side-subtitle jd-side-subtitle" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
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

          <div className="cand-msg-chat-body">
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
            >
              <input
                type="text"
                className="cand-msg-input"
                placeholder={`Message ${displayName}...`}
                value={candMsgInput}
                onChange={(e) => setCandMsgInput(e.target.value)}
                disabled={isCandMsgSending}
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

      {/* ── SIDE PANEL 3: OTHER EMPLOYER JOBS ── */}
      {activeSideTab === "other-jobs" && (
        <aside
          className="applicant-side-comparison-panel jd-side-comparison-panel"
          style={{
            width: "480px",
            maxWidth: "min(480px, calc(100vw - 976px))",
            minWidth: "320px",
            flex: "1 1 440px",
            height: "700px",
            maxHeight: "88vh",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 1,
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <div className="side-panel-header jd-side-panel-header">
            <div className="side-title-row jd-side-title-row">
              <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 800 }}>
                Other Employer Jobs
              </h3>
              <span className="side-subtitle jd-side-subtitle" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                Candidate compatibility across your active job postings
              </span>
            </div>
            <div className="side-header-actions jd-side-header-actions">
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
            {(() => {
              const otherJobsList = (employerJobs || []).filter((j) => {
                if (candidate.job_id && String(j.id) === String(candidate.job_id)) return false;
                if (!candidate.job_id && candidate.job_title && j.title && j.title.trim().toLowerCase() === candidate.job_title.trim().toLowerCase()) return false;
                return true;
              });

              if (otherJobsList.length === 0) {
                return (
                  <div style={{ textAlign: "center", color: "#64748b", padding: "30px 10px", fontSize: "0.9rem" }}>
                    No other active job postings found for this employer.
                  </div>
                );
              }

              return otherJobsList.map((otherJob) => {
                const percent = calculateCandidateMatch(
                  {
                    desired_job_title: candidate.desired_job_title || candidate.job_title || "",
                    work_arrangement: candidate.work_arrangement || "",
                    expected_salary: candidate.expected_salary || 0,
                    skills: candidate.skills || "",
                    qualifications: candidate.qualifications || "",
                    certifications: candidate.certifications || "",
                    city: candidate.city || candidate.address || "",
                  },
                  {
                    title: otherJob.title || "",
                    work_arrangement: otherJob.work_arrangement || "",
                    required_skills: otherJob.required_skills || otherJob.skills || "",
                    required_qualifications: otherJob.qualifications || otherJob.required_qualifications || "",
                    required_certifications: otherJob.certifications || otherJob.required_certifications || "",
                    location: otherJob.location || "",
                    salary_min: Number(otherJob.salary_min) || 0,
                    salary_max: Number(otherJob.salary_max) || 0,
                  }
                );

                const pillClass = percent >= 80 ? "green" : percent >= 50 ? "yellow" : "red";

                return (
                  <div
                    key={otherJob.id}
                    className="jd-other-job-card"
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
                        {otherJob.title}
                      </h4>
                      <div className="jd-other-job-meta">
                        <span>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          {otherJob.location || "Cavite"}
                        </span>
                        <span>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                          </svg>
                          {otherJob.work_arrangement || "On-Site"}
                        </span>
                        {otherJob.salary_min ? (
                          <span>
                            PHP {Number(otherJob.salary_min).toLocaleString()} - {Number(otherJob.salary_max).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                      <div className={`jd-other-job-match-pill ${pillClass}`}>
                        {percent}% Match
                      </div>
                      <button
                        type="button"
                        className="details-btn jd-other-job-details-btn"
                        onClick={() => {
                          if (onViewJobDetails) {
                            onViewJobDetails(otherJob);
                          } else {
                            setSelectedPreviewJob(otherJob);
                          }
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
    {renderBreakdownPopupModal()}
    {/* ── Standardized Job Details Modal (from JobDetailsModal.tsx) ── */}
    <JobDetailsModal
      isOpen={Boolean(selectedPreviewJob)}
      onClose={() => setSelectedPreviewJob(null)}
      job={selectedPreviewJob ? {
        id: selectedPreviewJob.id,
        title: selectedPreviewJob.title,
        company: selectedPreviewJob.company || selectedPreviewJob.company_name,
        employerUserId: selectedPreviewJob.employerUserId || selectedPreviewJob.employer_user_id || currentEmployerUserId,
        companyLogoPath: selectedPreviewJob.companyLogoPath || selectedPreviewJob.company_logo_path,
        companyCoverPath: selectedPreviewJob.companyCoverPath || selectedPreviewJob.company_cover_path,
        location: selectedPreviewJob.location,
        rating: selectedPreviewJob.rating,
        status: selectedPreviewJob.status || "open",
        urgent: Boolean(selectedPreviewJob.urgent || selectedPreviewJob.is_urgent),
        setup: selectedPreviewJob.work_arrangement || selectedPreviewJob.setup || "On-Site",
        work_arrangement: selectedPreviewJob.work_arrangement,
        salary_min: selectedPreviewJob.salary_min,
        salary_max: selectedPreviewJob.salary_max,
        experience_level: selectedPreviewJob.experience_level || selectedPreviewJob.experienceLevel,
        summary: selectedPreviewJob.summary || selectedPreviewJob.description,
        description: selectedPreviewJob.description || selectedPreviewJob.summary,
        required_skills: selectedPreviewJob.required_skills || selectedPreviewJob.skills,
        skills: selectedPreviewJob.skills || selectedPreviewJob.required_skills,
        qualifications: selectedPreviewJob.qualifications,
        certifications: selectedPreviewJob.certifications,
        applicantCount: selectedPreviewJob.applicantCount ?? selectedPreviewJob.applicant_count ?? 0,
        applicationLimit: selectedPreviewJob.applicationLimit ?? selectedPreviewJob.application_limit,
        closeDate: selectedPreviewJob.closeDate || selectedPreviewJob.close_date,
        faqs: selectedPreviewJob.faqs || [],
      } : null}
      applicantProfile={{
        desiredJobTitle: candidate?.desired_job_title || candidate?.job_title,
        workArrangement: candidate?.work_arrangement,
        expectedSalary: Number(candidate?.expected_salary) || 0,
        skills: parseItemList(candidate?.skills),
        qualifications: parseItemList(candidate?.qualifications),
        certifications: parseItemList(candidate?.certifications),
        rawSkills: typeof candidate?.skills === "string" ? candidate?.skills : Array.isArray(candidate?.skills) ? candidate?.skills.join(", ") : undefined,
        rawCertifications: typeof candidate?.certifications === "string" ? candidate?.certifications : Array.isArray(candidate?.certifications) ? candidate?.certifications.join(", ") : undefined,
        nearbyLocation: candidate?.nearby_location,
        preferredLocations: candidate?.preferred_locations,
      }}
      hideEmployerHeader={true}
      zIndex={45000}
    />
  </div>
  );
}
