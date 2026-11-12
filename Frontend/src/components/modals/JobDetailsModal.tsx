import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./JobDetailsModal.css";
import ApplicantDecisionModal from "../ApplicantDecisionModal";
import { ParsedSpecialMessage, parseSpecialMessage } from "../../utils/specialMessages";
import {
  isJobClosedOrExpired,
  calculateJobMatchDetails,
  evaluateSkillRequirementMatch,
  getMatchColorClass,
  getApplicantRecommendation,
  isSkillMatch,
  isCertificationMatch,
  parseCompetencyDisplayTags,
  splitTopLevelTokens,
  lookupCategoryForSkill,
  SKILLS_COURSE_TAXONOMY_MAP,
} from "../../utils/filters";
import { authFetch } from "../../utils/auth";

export type JobModalData = {
  id?: number | string;
  title?: string;
  job_title?: string;
  company?: string;
  company_name?: string;
  employerUserId?: number | string;
  employer_user_id?: number | string;
  companyLogoPath?: string | null;
  company_logo_path?: string | null;
  companyCoverPath?: string | null;
  company_cover_path?: string | null;
  location?: string;
  company_address?: string;
  rating?: number | string | null;
  matchScore?: number;
  status?: string;
  urgent?: boolean;
  is_urgent?: boolean | number;
  setup?: string;
  work_arrangement?: string;
  salary?: string;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  hide_salary?: boolean | number;
  experienceLevel?: string | null;
  experience_level?: string | null;
  summary?: string;
  description?: string;
  skillTags?: string[];
  required_skills?: string | string[];
  qualTags?: string[];
  qualifications?: string | string[];
  certTags?: string[];
  certifications?: string | string[];
  applicantCount?: number | string;
  applicant_count?: number | string;
  applicationLimit?: number | string;
  application_limit?: number | string;
  closeDate?: string;
  close_date?: string;
  faqs?: Array<{ id: number | string; question: string; answer: string; question_type?: string }>;
};

export type ApplicantMatchProfile = {
  desiredJobTitle?: string;
  workArrangement?: string;
  expectedSalary?: number | null;
  city?: string;
  skills?: string[];
  certifications?: string[];
  qualifications?: string[];
  rawSkills?: string;
  rawCertifications?: string;
};

export type JobDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  job: JobModalData | null;
  currentUserId?: number | string;
  applicantProfile?: ApplicantMatchProfile | null;
  topFloatingActions?: React.ReactNode;
  sidePanel?: React.ReactNode;
  customFooterActions?: React.ReactNode;
  onApply?: () => void;
  isApplied?: boolean;
  appliedLabel?: string;
  isApplying?: boolean;
  onEmployerClick?: ((employerUserId?: number | string) => void) | (() => void);
  isFaqOpen?: boolean;
  onFaqOpenChange?: (open: boolean) => void;
  zIndex?: number;
  hideEmployerHeader?: boolean;
  initialOpenMessage?: boolean;
  isApplicantView?: boolean;
};

type BreakdownCourseSkillItem = {
  name: string;
  course?: string;
  year?: string;
};

type BreakdownCertItem = {
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

  // Fix unbalanced parentheses in name if any
  const openCount = (cleanName.match(/\(/g) || []).length;
  const closeCount = (cleanName.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    cleanName = cleanName + ")".repeat(openCount - closeCount);
  } else if (closeCount > openCount) {
    cleanName = cleanName.replace(/\)+$/, "");
  }

  if (course === "BS Information Technology") course = "Web & Software Development";
  if (course === "BS Computer Science") course = "Programming & Algorithms";

  if (!course || course === "General IT" || !SKILLS_COURSE_TAXONOMY_MAP[course]) {
    const inferred = lookupCategoryForSkill(cleanName);
    if (inferred) course = inferred;
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
            let course = p.course || "";
            if (!course || course === "General IT" || !SKILLS_COURSE_TAXONOMY_MAP[course]) {
              course = lookupCategoryForSkill(String(p.name)) || course || "General IT";
            }
            items.push({
              name: String(p.name).trim(),
              course,
              year: p.year || p.years || "2026",
            });
          } else if (p) {
            items.push(parseSingleBreakdownSkillToken(String(p)));
          }
        });
      }
    } catch {}

    if (items.length === 0) {
      const rawTokens = splitTopLevelTokens(raw);
      for (let i = 0; i < rawTokens.length; i++) {
        let tok = rawTokens[i].trim();
        while (tok.includes("[") && !tok.includes("]") && i + 1 < rawTokens.length) {
          i++;
          tok = tok + ", " + rawTokens[i].trim();
        }
        if (tok.trim()) items.push(parseSingleBreakdownSkillToken(tok));
      }
    }
  }

  const safeFallbackTags: string[] = Array.isArray(fallbackTags)
    ? fallbackTags
    : typeof fallbackTags === "string"
    ? splitTopLevelTokens(fallbackTags)
    : [];

  if (items.length === 0 && safeFallbackTags.length > 0) {
    safeFallbackTags.forEach((tok) => items.push(parseSingleBreakdownSkillToken(tok)));
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

  if (raw && raw.trim() && raw.trim() !== "[]" && raw.trim() !== "{}") {
    let wasJsonArray = false;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        wasJsonArray = true;
        parsed.forEach((p) => {
          if (typeof p === "object" && p !== null && p.name && String(p.name).trim() && String(p.name).trim() !== "[]") {
            items.push({
              name: String(p.name).trim(),
              category: p.category || "General",
              acquiredYear: p.acquiredYear || p.acquired || "2010",
              expiry: p.expiry || p.years || "2026",
            });
          } else if (p && typeof p === "string" && p.trim() && p.trim() !== "[]") {
            const parsedTok = parseToken(p);
            if (parsedTok) items.push(parsedTok);
          }
        });
      }
    } catch {}

    if (!wasJsonArray && items.length === 0) {
      const rawTokens = raw.includes(")")
        ? raw.split(/(?<=\))\s*,\s*/)
        : raw.split(/[\n,;•|]+/);
      rawTokens.forEach((tok) => {
        const parsedTok = parseToken(tok);
        if (parsedTok) items.push(parsedTok);
      });
    }
  }

  const safeFallbackTags: string[] = Array.isArray(fallbackTags)
    ? fallbackTags
    : typeof fallbackTags === "string"
    ? String(fallbackTags).split(/[\n,;•|]+/).map((s) => s.trim()).filter(Boolean)
    : [];

  if (items.length === 0 && safeFallbackTags.length > 0) {
    safeFallbackTags.forEach((tok) => {
      const parsedTok = parseToken(tok);
      if (parsedTok) items.push(parsedTok);
    });
  }

  const grouped: Record<string, BreakdownCertItem[]> = {};
  items.forEach((item) => {
    if (!item || !item.name || item.name === "[]") return;
    const cat = item.category && item.category.trim() ? item.category.trim() : "General";
    if (!grouped[cat]) grouped[cat] = [];
    if (!grouped[cat].some((existing) => existing.name.toLowerCase() === item.name.toLowerCase())) {
      grouped[cat].push(item);
    }
  });

  return grouped;
}

const DEFAULT_FAQS = [
  {
    id: 1,
    question: "How do I apply for jobs?",
    answer: "You can click the 'Apply' button on any job card. If your profile is complete, your application will be submitted immediately.",
    question_type: "Application",
  },
  {
    id: 2,
    question: "What does the match score mean?",
    answer: "The match score shows how well your profile skills, experience, and preferences match the job requirements.",
    question_type: "Matching",
  },
  {
    id: 3,
    question: "Can I save jobs for later?",
    answer: "Yes, you can bookmark or save jobs from the job list to review them anytime in your saved jobs tab.",
    question_type: "General",
  },
];

export default function JobDetailsModal({
  isOpen,
  onClose,
  job,
  currentUserId,
  applicantProfile,
  topFloatingActions,
  sidePanel,
  customFooterActions,
  onApply,
  isApplied = false,
  appliedLabel,
  isApplying = false,
  onEmployerClick,
  isFaqOpen: isFaqOpenProp,
  onFaqOpenChange,
  zIndex,
  hideEmployerHeader = false,
  initialOpenMessage = false,
  isApplicantView = false,
}: JobDetailsModalProps) {
  const [internalFaqOpen, setInternalFaqOpen] = useState(false);
  const isFaqOpen = isFaqOpenProp !== undefined ? isFaqOpenProp : internalFaqOpen;
  const [expandedFaqIds, setExpandedFaqIds] = useState<(number | string)[]>([]);
  const [faqsList, setFaqsList] = useState<Array<{ id: number | string; question: string; answer: string; question_type?: string }>>(job?.faqs || []);
  const [loadingFaqs, setLoadingFaqs] = useState(false);

  // Equal-height synchronization refs and state
  const panelRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const bodyWrapperRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const faqDrawerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const sidePanelSlotRef = useRef<HTMLDivElement>(null);
  const [matchedHeight, setMatchedHeight] = useState<number | null>(null);

  // Built-in Messaging Side Panel state
  const [isMsgPanelOpen, setIsMsgPanelOpen] = useState(false);
  const [isMsgPanelClosing, setIsMsgPanelClosing] = useState(false);
  const [activeMsgThread, setActiveMsgThread] = useState<any | null>(null);
  const [panelMessages, setPanelMessages] = useState<any[]>([]);
  const [isMsgLoading, setIsMsgLoading] = useState(false);
  const [msgInputText, setMsgInputText] = useState("");
  const [isMsgSending, setIsMsgSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const msgScrollRef = useRef<HTMLDivElement>(null);

  const [viewLetterModalTarget, setViewLetterModalTarget] = useState<{
    title: string;
    company: string;
    letterText?: string;
    offerLetter?: string;
    startDate?: string;
    respondedAt?: string;
    decision?: string;
    defaultTab?: "response" | "offer";
    applicationId?: number;
    jobId?: number;
  } | null>(null);
  const [viewLetterActiveTab, setViewLetterActiveTab] = useState<"response" | "offer">("offer");
  const [decisionModalTarget, setDecisionModalTarget] = useState<{
    action: "accept" | "decline" | null;
    title?: string;
    companyName?: string;
    offerLetter?: string;
    isInvitation?: boolean;
    applicationId?: number;
    jobId?: number;
  } | null>(null);

  const openViewLetterModal = (target: {
    title: string;
    company: string;
    letterText?: string;
    offerLetter?: string;
    startDate?: string;
    respondedAt?: string;
    decision?: string;
    defaultTab?: "response" | "offer";
    applicationId?: number;
    jobId?: number;
  }) => {
    const hasOffer = Boolean(target.offerLetter && target.offerLetter.trim());
    const hasResponse = Boolean(target.letterText && target.letterText.trim());
    const initialTab = target.defaultTab
      ? target.defaultTab
      : target.decision === "extended" || (hasOffer && !hasResponse)
      ? "offer"
      : hasResponse
      ? "response"
      : "offer";
    setViewLetterActiveTab(initialTab);
    setViewLetterModalTarget(target);
  };

  const handleRespondFromModal = async ({
    action,
    letter_text,
    letter_type,
    start_date,
  }: {
    action: "accept" | "decline";
    letter_text?: string;
    letter_type?: string;
    start_date?: string;
  }) => {
    if (!currentUserId) return;
    try {
      if (activeMsgThread?.id) {
        await authFetch("/api/job-invitations/respond-by-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: activeMsgThread.id,
            applicant_user_id: currentUserId,
            action,
            letter_text,
            letter_type,
            start_date,
          }),
        }).catch(() => {});
      }

      const jobId = job?.id;
      if (jobId) {
        await authFetch("/api/job-invitations/respond-by-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_post_id: jobId,
            applicant_user_id: currentUserId,
            action,
            letter_text,
            letter_type,
            start_date,
          }),
        }).catch(() => {});
      }

      const otherUid = job?.employerUserId || job?.employer_user_id;
      if (otherUid) {
        await fetchThreadMessages(Number(otherUid));
      }
    } catch (err) {
      console.error("Error responding from modal:", err);
    } finally {
      setDecisionModalTarget(null);
      setViewLetterModalTarget(null);
    }
  };

  // Built-in Match Breakdown Side Panel state
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isBreakdownClosing, setIsBreakdownClosing] = useState(false);
  const [hoveredCompareTag, setHoveredCompareTag] = useState<{
    item: string;
    side: "applicant" | "employer";
    category: "skills" | "qualifications" | "certifications";
  } | null>(null);
  const [activeBreakdownPopup, setActiveBreakdownPopup] = useState<{
    type: "skills" | "certifications";
    category: string;
  } | null>(null);

  const scrollMsgChatToBottom = (instant = true) => {
    const doScroll = () => {
      if (msgScrollRef.current) {
        msgScrollRef.current.scrollTop = msgScrollRef.current.scrollHeight;
      }
      if (msgEndRef.current) {
        msgEndRef.current.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "end" });
      }
    };
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 40);
    setTimeout(doScroll, 120);
  };

  useEffect(() => {
    if (isMsgPanelOpen) {
      scrollMsgChatToBottom(true);
    }
  }, [isMsgPanelOpen, panelMessages]);

  useEffect(() => {
    if (isOpen && initialOpenMessage) {
      setIsBreakdownOpen(false);
      setIsBreakdownClosing(false);
      setIsMsgPanelClosing(false);
      setIsMsgPanelOpen(true);
      const empId = job?.employerUserId || job?.employer_user_id;
      if (empId) {
        fetchThreadMessages(Number(empId));
      }
    }
  }, [isOpen, initialOpenMessage, job?.employerUserId, job?.employer_user_id]);

  useEffect(() => {
    if (!isOpen) {
      setInternalFaqOpen(false);
      if (onFaqOpenChange) onFaqOpenChange(false);
      setExpandedFaqIds([]);
      setIsMsgPanelOpen(false);
      setIsMsgPanelClosing(false);
      setIsBreakdownOpen(false);
      setIsBreakdownClosing(false);
      setActiveBreakdownPopup(null);
      setActiveMsgThread(null);
      setPanelMessages([]);
      setMsgInputText("");
    }
  }, [isOpen, onFaqOpenChange]);

  const handleToggleFaq = () => {
    const nextVal = !isFaqOpen;
    if (onFaqOpenChange) onFaqOpenChange(nextVal);
    setInternalFaqOpen(nextVal);
  };

  const handleCloseFaq = () => {
    if (onFaqOpenChange) onFaqOpenChange(false);
    setInternalFaqOpen(false);
  };

  useEffect(() => {
    if (job?.faqs && job.faqs.length > 0) {
      setFaqsList(job.faqs);
      return;
    }
    const empId = job?.employerUserId || job?.employer_user_id;
    if (empId) {
      setLoadingFaqs(true);
      fetch(`/api/employers/${empId}/faqs`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data?.faqs)) {
            const activeFaqs = data.faqs.filter((f: any) => f.is_active !== 0);
            if (activeFaqs.length > 0) {
              setFaqsList(activeFaqs);
              return;
            }
          }
          setFaqsList(DEFAULT_FAQS);
        })
        .catch(() => setFaqsList(DEFAULT_FAQS))
        .finally(() => setLoadingFaqs(false));
    } else {
      setFaqsList(DEFAULT_FAQS);
    }
  }, [job?.employerUserId, job?.employer_user_id, job?.faqs]);

  const fetchThreadMessages = async (otherUserId: number) => {
    if (!currentUserId) return;
    setIsMsgLoading(true);
    try {
      const threadsRes = await authFetch(`/api/users/${currentUserId}/messages`);
      if (!threadsRes.ok) {
        setIsMsgLoading(false);
        return;
      }

      const threadsData = await threadsRes.json();
      const allThreads = threadsData?.threads || [];
      const existing = allThreads.find((t: any) => Number(t.other_user_id) === Number(otherUserId));

      if (existing) {
        setActiveMsgThread(existing);
        const msgRes = await authFetch(`/api/messages/threads/${existing.id}`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setPanelMessages(msgData?.messages || []);
        }
        try {
          await authFetch(`/api/messages/threads/${existing.id}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: currentUserId }),
          });
          window.dispatchEvent(new Event("elitecruit_messages_update"));
        } catch {}
      } else {
        setActiveMsgThread(null);
        setPanelMessages([]);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setIsMsgLoading(false);
    }
  };

  const handleCloseMsgPanel = () => {
    setIsMsgPanelClosing(true);
    setTimeout(() => {
      setIsMsgPanelOpen(false);
      setIsMsgPanelClosing(false);
    }, 220);
  };

  const handleToggleMsgPanel = () => {
    if (isMsgPanelOpen) {
      handleCloseMsgPanel();
    } else {
      setIsBreakdownOpen(false);
      setIsBreakdownClosing(false);
      setIsMsgPanelClosing(false);
      setIsMsgPanelOpen(true);
      const empId = job?.employerUserId || job?.employer_user_id;
      if (empId) {
        fetchThreadMessages(Number(empId));
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = msgInputText.trim();
    const empId = job?.employerUserId || job?.employer_user_id;
    const companyTitle = job?.company || job?.company_name || "Employer";

    if (!text || isMsgSending || !empId || !currentUserId) return;

    setIsMsgSending(true);
    try {
      if (activeMsgThread?.id) {
        const res = await authFetch(`/api/messages/threads/${activeMsgThread.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender_user_id: currentUserId,
            message_text: text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPanelMessages((prev) => [...prev, data.message]);
          setMsgInputText("");
          window.dispatchEvent(new Event("elitecruit_messages_update"));
          scrollMsgChatToBottom(false);
        }
      } else {
        const res = await authFetch("/api/messages/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_by_user_id: currentUserId,
            participant_user_ids: [Number(empId)],
            title: `Employer: ${companyTitle}`,
            message_text: text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setActiveMsgThread(data.thread);
          setPanelMessages([data.message]);
          setMsgInputText("");
          window.dispatchEvent(new Event("elitecruit_messages_update"));
          scrollMsgChatToBottom(false);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsMsgSending(false);
    }
  };

  const handleCloseBreakdown = () => {
    setIsBreakdownClosing(true);
    setTimeout(() => {
      setIsBreakdownOpen(false);
      setIsBreakdownClosing(false);
    }, 220);
  };

  const handleToggleBreakdown = () => {
    if (isBreakdownOpen && !isBreakdownClosing) {
      handleCloseBreakdown();
    } else {
      setIsMsgPanelOpen(false);
      setIsMsgPanelClosing(false);
      setIsBreakdownOpen(true);
      setIsBreakdownClosing(false);
    }
  };

  const initialsFrom = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Measure natural unconstrained height of Container 1 (Job details)
  const measureH1 = useCallback(() => {
    if (!panelRef.current) return 0;
    const bannerH = hideEmployerHeader ? 0 : (bannerRef.current ? bannerRef.current.offsetHeight : 140);
    const stripH = hideEmployerHeader ? 0 : (stripRef.current ? stripRef.current.offsetHeight : 65);
    const footerH = footerRef.current ? footerRef.current.offsetHeight : 65;

    let bodyH = 0;
    if (isFaqOpen && faqDrawerRef.current) {
      const faqHeader = faqDrawerRef.current.querySelector(".jd-faq-header") as HTMLElement | null;
      const faqBody = faqDrawerRef.current.querySelector(".jd-faq-body") as HTMLElement | null;
      bodyH = (faqHeader?.offsetHeight || 50) + (faqBody?.scrollHeight || 200);
    } else if (bodyRef.current) {
      bodyH = bodyRef.current.scrollHeight || 180;
    }

    return bannerH + stripH + bodyH + footerH;
  }, [isFaqOpen, hideEmployerHeader]);

  // Measure natural unconstrained height of Container 2 (Side Panel)
  const measureH2 = useCallback((h1: number) => {
    const sideEl = sidePanelSlotRef.current?.firstElementChild as HTMLElement | null;
    if (!sideEl) return h1;

    const sideHeader = sideEl.querySelector(".jd-side-panel-header") as HTMLElement | null;
    const headerH = sideHeader?.offsetHeight || 60;
    const sideBody = (sideEl.querySelector(".jd-side-panel-body") || sideEl.querySelector(".cand-msg-chat-body")) as HTMLElement | null;
    if (sideBody) {
      return headerH + (sideBody.scrollHeight || 0);
    }

    return sideEl.scrollHeight || h1;
  }, []);

  // Equal height calculation
  const calculateEqualHeight = useCallback(() => {
    const hasSide = Boolean(sidePanel || isMsgPanelOpen || isMsgPanelClosing || isBreakdownOpen || isBreakdownClosing);
    if (!hasSide || window.innerWidth <= 860) {
      setMatchedHeight(null);
      return;
    }

    const maxAllowed = Math.floor(window.innerHeight * 0.88 - 40);
    const minAllowed = hideEmployerHeader ? 320 : 440;

    const h1 = measureH1();
    if (!h1) return;

    // The job details modal is master; docked side drawers match its height
    // so opening messages or breakdown never shrinks or changes the job card height
    const clampedH1 = Math.max(minAllowed, Math.min(h1, maxAllowed));
    const equalH = clampedH1;

    setMatchedHeight((prev) => {
      if (prev !== null && Math.abs(prev - equalH) <= 2) return prev;
      return equalH;
    });
  }, [sidePanel, isMsgPanelOpen, isMsgPanelClosing, isBreakdownOpen, isBreakdownClosing, measureH1, hideEmployerHeader]);

  const hasAnySidePanel = Boolean(sidePanel || isMsgPanelOpen || isMsgPanelClosing || isBreakdownOpen || isBreakdownClosing);

  useEffect(() => {
    if (!isOpen || !hasAnySidePanel) {
      setMatchedHeight(null);
      return;
    }

    let rafId: number;
    const runMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        calculateEqualHeight();
      });
    };

    runMeasure();
    const t1 = setTimeout(runMeasure, 60);
    const t2 = setTimeout(runMeasure, 180);

    window.addEventListener("resize", runMeasure);

    let observer: MutationObserver | null = null;
    if (sidePanelSlotRef.current) {
      observer = new MutationObserver(() => {
        runMeasure();
      });
      observer.observe(sidePanelSlotRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", runMeasure);
      if (observer) observer.disconnect();
    };
  }, [isOpen, hasAnySidePanel, isFaqOpen, expandedFaqIds, job, calculateEqualHeight]);

  const empUserId = job?.employerUserId || job?.employer_user_id;
  const jobTitle = job?.title || job?.job_title || "Job Details";
  const companyName = job?.company || job?.company_name || "Employer";
  const locationStr = job?.location || job?.company_address || "Cavite";
  const appCount = job?.applicantCount ?? job?.applicant_count ?? 0;
  const closeDate = job?.closeDate || job?.close_date || "-";
  const isClosed = job ? isJobClosedOrExpired(closeDate, job.status, (job as any).applicationLimit || (job as any).application_limit, appCount) : false;
  const isOpenStatus = !isClosed;
  const isUrgent = Boolean(job?.urgent || job?.is_urgent);
  const workSetup = job?.setup || job?.work_arrangement || "On-Site";
  const experienceLevel = job?.experienceLevel || job?.experience_level || "";
  const descriptionText = job?.summary || job?.description || "No job description provided.";
  const ratingText = job?.rating ? Number(job.rating).toFixed(1) : "0.0";

  const parseTags = (data: any, category?: "skills" | "qualifications" | "certifications"): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      return parseCompetencyDisplayTags(data, category);
    }
    return parseCompetencyDisplayTags(String(data), category);
  };

  const skills = useMemo(() => {
    const list = job?.skillTags && job.skillTags.length > 0 ? job.skillTags : parseTags(job?.required_skills, "skills");
    return list.filter((s) => s && s.trim().toLowerCase() !== "not provided");
  }, [job]);

  const cleanQualifications = useMemo(() => {
    const list = job?.qualTags && job.qualTags.length > 0 ? job.qualTags : parseTags(job?.qualifications || (job as any)?.required_qualifications, "qualifications");
    return list.filter((q) => q && q.trim().toLowerCase() !== "not provided");
  }, [job]);

  const cleanCertifications = useMemo(() => {
    const list = job?.certTags && job.certTags.length > 0 ? job.certTags : parseTags(job?.certifications || (job as any)?.required_certifications, "certifications");
    return list.filter((c) => c && c.trim().toLowerCase() !== "not provided");
  }, [job]);

  const qualifications = cleanQualifications;
  const certifications = cleanCertifications;
  const displayQualifications = cleanQualifications.length > 0 ? cleanQualifications : ["Not provided"];
  const displayCertifications = cleanCertifications.length > 0 ? cleanCertifications : ["Not provided"];

  // Match details calculation
  const matchInfo = useMemo(() => {
    if (!job || !applicantProfile) return null;
    return calculateJobMatchDetails(
      {
        id: typeof job.id === "number" ? job.id : 0,
        title: jobTitle,
        salaryMin: Number(job.salary_min || 0),
        location: locationStr,
        setup: workSetup,
        skillTags: skills,
        qualTags: qualifications,
        certTags: certifications,
      },
      applicantProfile as any
    );
  }, [job, applicantProfile, jobTitle, locationStr, workSetup, skills, qualifications, certifications]);

  const matchScore = job?.matchScore !== undefined ? job.matchScore : matchInfo?.score;

  const groupedBreakdownSkills = useMemo(() => {
    return parseBreakdownSkillItems(applicantProfile?.rawSkills, applicantProfile?.skills || []);
  }, [applicantProfile?.rawSkills, applicantProfile?.skills]);

  const groupedBreakdownCerts = useMemo(() => {
    return parseBreakdownCertItems(applicantProfile?.rawCertifications, applicantProfile?.certifications || []);
  }, [applicantProfile?.rawCertifications, applicantProfile?.certifications]);

  const formatSalary = () => {
    if (!job) return "Competitive Salary";
    const isHidden = Boolean(
      job.hide_salary === true ||
      job.hide_salary === 1 ||
      job.hide_salary === "1" ||
      job.hide_salary === "true" ||
      (job as any).hideSalary === true ||
      (job as any).hideSalary === 1 ||
      (job as any).hideSalary === "1" ||
      (job as any).hideSalary === "true" ||
      job.salary === "Salary Confidential"
    );
    if (isHidden) return "Salary Confidential";
    if (job.salary) return job.salary;
    if (job.salary_min && job.salary_max) {
      return `PHP ${Number(job.salary_min).toLocaleString()} - ${Number(job.salary_max).toLocaleString()}`;
    }
    if (job.salary_min) return `PHP ${Number(job.salary_min).toLocaleString()}+`;
    return "Competitive Salary";
  };

  const toggleFaq = (id: number | string) => {
    setExpandedFaqIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const coverSrc = job?.companyCoverPath || job?.company_cover_path
    ? (job.companyCoverPath || job.company_cover_path)!.startsWith("http") || (job.companyCoverPath || job.company_cover_path)!.startsWith("/api")
      ? (job.companyCoverPath || job.company_cover_path)!
      : empUserId ? `/api/employers/${empUserId}/cover` : null
    : empUserId ? `/api/employers/${empUserId}/cover` : null;

  const logoSrc = job?.companyLogoPath || job?.company_logo_path
    ? (job.companyLogoPath || job.company_logo_path)!.startsWith("http") || (job.companyLogoPath || job.company_logo_path)!.startsWith("/api")
      ? (job.companyLogoPath || job.company_logo_path)!
      : empUserId ? `/api/employers/${empUserId}/logo` : null
    : empUserId ? `/api/employers/${empUserId}/logo` : null;

  if (!isOpen || !job) return null;

  // Render Built-in Messaging Side Panel
  const renderMessageSidePanel = () => {
    return (
      <aside
        className={`cand-message-side-panel jd-side-comparison-panel ${isMsgPanelClosing ? "closing" : "opening"}`}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          maxHeight: "100%",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div className="jd-side-panel-header" style={{ padding: "12px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#e0f2fe",
                color: "#0369a1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.85rem",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={companyName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                    }
                  }}
                />
              ) : null}
              <span style={{ display: logoSrc ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                {initialsFrom(companyName)}
              </span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#01294a", fontFamily: "'Inter', sans-serif" }}>
                {companyName}
              </h3>
              <span className="jd-side-subtitle" style={{ fontSize: "0.78rem", color: "#557796", fontWeight: 600 }}>
                {locationStr}
              </span>
            </div>
          </div>

          <div className="jd-side-header-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="jd-side-close-btn"
              aria-label="Close message panel"
              onClick={handleCloseMsgPanel}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="cand-msg-chat-body" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div
            ref={msgScrollRef}
            className="cand-msg-messages-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {isMsgLoading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                Loading conversation...
              </div>
            ) : panelMessages.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0284c7",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <strong className="cand-msg-empty-title" style={{ fontSize: "0.95rem" }}>
                  Send a message to {companyName}
                </strong>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", textAlign: "center", maxWidth: "260px" }}>
                  Reach out with any questions about this opening or follow up on your application.
                </p>
              </div>
            ) : (
              panelMessages.map((m: any, idx: number) => {
                const isOutgoing = Number(m.sender_user_id) === Number(currentUserId);
                const timeStr = m.created_at
                  ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "";
                const special = parseSpecialMessage(m.message_text);

                if (special.type === "formal_offer") {
                  const matchingResponseMsg = panelMessages.find((other: any) => {
                    const p = parseSpecialMessage(other.message_text);
                    if (p.type !== "offer_response") return false;
                    if (!p.jobTitle || !special.jobTitle) return false;
                    const pTitle = p.jobTitle.toLowerCase().trim();
                    const sTitle = special.jobTitle.toLowerCase().trim();
                    return pTitle === sTitle || pTitle.includes(sTitle) || sTitle.includes(pTitle);
                  });
                  const matchingResponse = matchingResponseMsg ? parseSpecialMessage(matchingResponseMsg.message_text) : null;
                  const isAccepted = matchingResponse
                    ? matchingResponse.isAccepted
                    : false;
                  const isDeclined = matchingResponse
                    ? !matchingResponse.isAccepted
                    : false;
                  const hasDecision = isAccepted || isDeclined;
                  const decisionType = isAccepted ? "accepted" : isDeclined ? "declined" : "extended";

                  return (
                    <article
                      key={m.id || idx}
                      className={`chat-bubble chat-special-card chat-offer-card ${isOutgoing ? "outgoing" : "incoming"} ${isAccepted ? "offer-card-accepted" : isDeclined ? "offer-card-declined" : ""}`}
                    >
                      <div className="chat-special-header">
                        <div className="chat-special-badge-row">
                          <span className={`chat-special-badge ${isAccepted ? "badge-accepted" : isDeclined ? "badge-declined" : "badge-formal-offer"}`}>
                            {isAccepted ? (
                              <>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Offer Accepted</span>
                              </>
                            ) : isDeclined ? (
                              <>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <span>Offer Declined</span>
                              </>
                            ) : (
                              <>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                  <line x1="16" y1="13" x2="8" y2="13" />
                                  <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                                <span>Formal Employment Offer</span>
                              </>
                            )}
                          </span>
                          <time className="chat-special-time">{timeStr}</time>
                        </div>
                        <h4 className="chat-special-title">{special.jobTitle || job?.title}</h4>
                        <div className="chat-special-subtitle">{special.companyName || companyName}</div>
                      </div>

                      <div className="chat-special-notice">
                        <p>
                          {isAccepted
                            ? `Candidate has officially accepted this employment offer.${matchingResponse?.startDate ? ` Target Start Date: ${matchingResponse.startDate}.` : ""} Click below to review the offer and signed response letter.`
                            : isDeclined
                            ? "Candidate has formally declined this employment offer. Click below to view the response details."
                            : "An official employment offer has been extended for this position. Click below to review the full offer letter, compensation, and benefits."}
                        </p>
                      </div>

                      <div className="chat-special-actions">
                        <button
                          type="button"
                          className="chat-action-btn chat-btn-view"
                          onClick={() => openViewLetterModal({
                            title: special.jobTitle || job?.title || "Job Position",
                            company: special.companyName || companyName,
                            offerLetter: special.cleanBody,
                            letterText: matchingResponse?.cleanBody,
                            startDate: matchingResponse?.startDate,
                            decision: decisionType,
                            defaultTab: "offer",
                            jobId: Number(job?.id) || undefined,
                          })}
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          <span>View Full Offer Letter</span>
                        </button>

                        {!hasDecision ? (
                          !isOutgoing ? (
                            <button
                              type="button"
                              className="chat-action-btn chat-btn-respond"
                              onClick={() => {
                                openViewLetterModal({
                                  title: special.jobTitle || job?.title || "Job Position",
                                  company: special.companyName || companyName || "Company",
                                  offerLetter: special.cleanBody,
                                  decision: null,
                                  defaultTab: "offer",
                                  jobId: Number(job?.id) || undefined,
                                });
                                setDecisionModalTarget({
                                  action: "accept",
                                  title: special.jobTitle || job?.title,
                                  companyName: special.companyName || companyName,
                                  offerLetter: special.cleanBody,
                                  jobId: Number(job?.id) || undefined,
                                });
                              }}
                            >
                              <span>Review &amp; Respond</span>
                            </button>
                          ) : (
                            <span className="chat-action-status-pill pending">Awaiting Candidate Response</span>
                          )
                        ) : isAccepted ? (
                          <button
                            type="button"
                            className="chat-action-btn chat-btn-accepted"
                            onClick={() => openViewLetterModal({
                              title: special.jobTitle || job?.title || "Job Position",
                              company: special.companyName || companyName,
                              offerLetter: special.cleanBody,
                              letterText: matchingResponse?.cleanBody,
                              startDate: matchingResponse?.startDate,
                              decision: "accepted",
                              defaultTab: "response",
                              jobId: Number(job?.id) || undefined,
                            })}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Offer Accepted</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="chat-action-btn chat-btn-declined"
                            onClick={() => openViewLetterModal({
                              title: special.jobTitle || job?.title || "Job Position",
                              company: special.companyName || companyName,
                              offerLetter: special.cleanBody,
                              letterText: matchingResponse?.cleanBody,
                              decision: "declined",
                              defaultTab: "response",
                              jobId: Number(job?.id) || undefined,
                            })}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <span>Offer Declined</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                }

                if (special.type === "offer_response") {
                  return null;
                }

                if (special.type === "interview_scheduled") {
                  return (
                    <article
                      key={m.id || idx}
                      className={`chat-bubble chat-special-card chat-interview-card ${isOutgoing ? "outgoing" : "incoming"}`}
                    >
                      <div className="chat-special-header">
                        <div className="chat-special-badge-row">
                          <span className="chat-special-badge badge-interview-sched">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>Interview Scheduled</span>
                          </span>
                          <time className="chat-special-time">{timeStr}</time>
                        </div>
                        <h4 className="chat-special-title">{special.jobTitle || job?.title}</h4>
                        {special.stage && <div className="chat-special-subtitle">{special.stage}</div>}
                      </div>

                      <div className="chat-special-grid">
                        {special.date && (
                          <div className="chat-grid-row">
                            <span className="chat-grid-lbl">Date &amp; Time:</span>
                            <span className="chat-grid-val">{special.date} {special.time ? `at ${special.time}` : ""}</span>
                          </div>
                        )}
                        {special.interviewType && (
                          <div className="chat-grid-row">
                            <span className="chat-grid-lbl">Format:</span>
                            <span className="chat-grid-val">{special.interviewType}</span>
                          </div>
                        )}
                        {special.location && (
                          <div className="chat-grid-row">
                            <span className="chat-grid-lbl">Venue / Link:</span>
                            <span className="chat-grid-val">{special.location}</span>
                          </div>
                        )}
                        {special.notes && (
                          <div className="chat-grid-row">
                            <span className="chat-grid-lbl">Notes:</span>
                            <span className="chat-grid-val">{special.notes}</span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }

                return (
                  <div key={m.id || idx} className={`cand-msg-row ${isOutgoing ? "outgoing" : "incoming"}`}>
                    <div className={`cand-msg-bubble ${isOutgoing ? "outgoing" : "incoming"}`}>
                      {m.message_text}
                    </div>
                    {timeStr && (
                      <small style={{ fontSize: "0.7rem", color: "#94a3b8", padding: "0 4px" }}>
                        {timeStr}
                      </small>
                    )}
                  </div>
                );
              })
            )}
            <div ref={msgEndRef} />
          </div>

          <form
            className="cand-msg-compose-bar"
            onSubmit={handleSendMessage}
            style={{
              padding: "12px 16px",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              className="cand-msg-input"
              value={msgInputText}
              onChange={(e) => setMsgInputText(e.target.value)}
              placeholder="Type your message..."
              disabled={isMsgSending}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.86rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              className="cand-msg-send-btn"
              disabled={!msgInputText.trim() || isMsgSending}
              style={{
                padding: "10px 18px",
              }}
            >
              {isMsgSending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </aside>
    );
  };

  // Render Built-in Option 2 Match Breakdown Panel (Matching JobSearch Pic 4)
  const renderBreakdownSidePanel = () => {
    if (isApplicantView) return null;
    const scoreVal = matchScore !== undefined ? matchScore : 0;
    const appSkills: string[] = Array.isArray(applicantProfile?.skills)
      ? applicantProfile.skills
      : typeof applicantProfile?.skills === "string"
      ? String(applicantProfile.skills).split(/[\n,;•|]+/).map((s) => s.trim()).filter(Boolean)
      : [];
    const appQuals: string[] = Array.isArray(applicantProfile?.qualifications)
      ? applicantProfile.qualifications
      : typeof applicantProfile?.qualifications === "string"
      ? String(applicantProfile.qualifications).split(/[\n,;•|]+/).map((s) => s.trim()).filter(Boolean)
      : [];
    const appCerts: string[] = Array.isArray(applicantProfile?.certifications)
      ? applicantProfile.certifications
      : typeof applicantProfile?.certifications === "string"
      ? String(applicantProfile.certifications).split(/[\n,;•|]+/).map((s) => s.trim()).filter(Boolean)
      : [];

    const jobSkills = skills;
    const jobQuals = qualifications;
    const jobCerts = certifications;

    const checkMatch = (jobItem: string, appItems: string[], type?: "skills" | "qualifications" | "certifications") => {
      if (!appItems || appItems.length === 0) return false;
      if (type === "certifications") {
        return appItems.some((appItem) => isCertificationMatch(jobItem, appItem));
      }
      return appItems.some((appItem) => isSkillMatch(jobItem, appItem));
    };

    const isAppRelevant = (appItem: string, jItems: string[], type?: "skills" | "qualifications" | "certifications") => {
      if (!jItems || jItems.length === 0) return false;
      if (type === "certifications") {
        return jItems.some((jobItem) => isCertificationMatch(jobItem, appItem));
      }
      return jItems.some((jobItem) => isSkillMatch(jobItem, appItem));
    };

    return (
      <aside className={`jd-side-comparison-panel ${isBreakdownClosing ? "closing" : "opening"}`} style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="jd-side-panel-header">
          <div className="jd-side-title-row">
            <h3>Competencies & Requirements</h3>
            <span className="jd-side-subtitle">Side-by-side profile match vs employer postings</span>
          </div>
          <div className="jd-side-header-actions">
            {isApplicantView ? (
              (() => {
                const rec = getApplicantRecommendation(scoreVal);
                if (!rec) return null;
                return (
                  <span className={`applicant-rec-badge ${rec.colorClass}`}>
                    {rec.label}
                  </span>
                );
              })()
            ) : (
              <span className={`match-badge-pill ${getMatchColorClass(scoreVal)}`}>
                {scoreVal}% Match
              </span>
            )}
            <button
              type="button"
              className="jd-side-close-btn"
              aria-label="Close comparison panel"
              onClick={handleCloseBreakdown}
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
              <span><strong>Green Tag:</strong> Fully satisfied (Skill & Experience)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot yellow"></span>
              <span><strong>Yellow Tag:</strong> Skill matched, lacking experience</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot red"></span>
              <span><strong>Red Tag:</strong> Missing requirement</span>
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
                <span className="col-count-text">{appSkills.length} listed</span>
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
                  <span className="jd-no-data-text">No skills in your profile</span>
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
                    const evalResult = evaluateSkillRequirementMatch(item, appSkills, appCerts);
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
                        title={
                          evalResult.status === "matched"
                            ? `Fully Satisfied: ${item}`
                            : evalResult.status === "partial"
                            ? `Skill matched, but lacking ${evalResult.reqYears} yrs experience (Profile: ${evalResult.candYears} yr${evalResult.candYears === 1 ? "" : "s"})`
                            : `Missing: ${item}`
                        }
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
                <span className="col-count-text">{appQuals.length} listed</span>
              </div>
              <div className="jd-col-tags-container">
                {appQuals.length > 0 ? (
                  appQuals.map((item) => {
                    const isRel = isAppRelevant(item, jobQuals);
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
                  <span className="jd-no-data-text">No qualifications in your profile</span>
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
                    const isMatched = checkMatch(jQual, appQuals);
                    const isHoverSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === jQual;
                    const isHoverLinked = hoveredCompareTag?.side === "applicant" && isSkillMatch(jQual, hoveredCompareTag.item);
                    return (
                      <span
                        key={jQual}
                        className={`jd-comp-tag ${isMatched ? "tag-matched-green" : "tag-missing-red"} ${isHoverSource ? "tag-hover-source" : ""} ${isHoverLinked ? "tag-hover-linked" : ""}`}
                        onMouseEnter={() => setHoveredCompareTag({ item: jQual, side: "employer", category: "qualifications" })}
                        onMouseLeave={() => setHoveredCompareTag(null)}
                        title={isMatched ? `Matched: ${jQual}` : `Missing: ${jQual}`}
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
                <span className="col-count-text">{appCerts.length} listed</span>
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
                    const isMatched = checkMatch(jCert, appCerts, "certifications");
                    const isHoverSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === jCert;
                    const isHoverLinked = hoveredCompareTag?.side === "applicant" && isCertificationMatch(jCert, hoveredCompareTag.item);
                    return (
                      <span
                        key={jCert}
                        className={`jd-comp-tag ${isMatched ? "tag-matched-green" : "tag-missing-red"} ${isHoverSource ? "tag-hover-source" : ""} ${isHoverLinked ? "tag-hover-linked" : ""}`}
                        onMouseEnter={() => setHoveredCompareTag({ item: jCert, side: "employer", category: "certifications" })}
                        onMouseLeave={() => setHoveredCompareTag(null)}
                        title={isMatched ? `Matched: ${jCert}` : `Missing: ${jCert}`}
                      >
                        <span className="tag-icon">{isMatched ? "✓" : "✗"}</span>
                        <span className="tag-text">{jCert}</span>
                      </span>
                    );
                  })
                ) : (
                  <span className="jd-no-data-text">None specified</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  };

  // Render Category Drill-down Modal (Matching JobSearch Pic 5)
  const renderBreakdownPopupModal = () => {
    if (!activeBreakdownPopup) return null;
    const { type, category } = activeBreakdownPopup;
    const itemsList = type === "skills" ? groupedBreakdownSkills[category] || [] : groupedBreakdownCerts[category] || [];
    const comparisonTargetList = type === "skills" ? skills : certifications;
    const label = type === "skills" ? (itemsList.length === 1 ? "skill" : "skills") : (itemsList.length === 1 ? "certification" : "certifications");

    const effectivePopupZIndex = Math.max(100050, (zIndex ? Number(zIndex) + 500 : 100050));

    return (
      <div
        className="skill-popup-modal-overlay"
        onClick={() => setActiveBreakdownPopup(null)}
        style={{ zIndex: effectivePopupZIndex }}
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
                <div className="empty-category-notice">
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

  // Floating Tabs
  const renderFloatingTabs = () => {
    if (topFloatingActions !== undefined) return topFloatingActions;

    const hasBreakdown = !isApplicantView && Boolean(applicantProfile || job.matchScore !== undefined);
    const canMessage = Boolean(empUserId && currentUserId && !hideEmployerHeader);
    const canShowEmployerDetails = Boolean(empUserId && onEmployerClick && !hideEmployerHeader);

    if (!canShowEmployerDetails && !hasBreakdown && !canMessage) return null;

    return (
      <div style={{ display: "flex", gap: "8px" }}>
        {canShowEmployerDetails && (
          <button
            type="button"
            className="jd-floating-breakdown-tab"
            onClick={() => (onEmployerClick as any)(empUserId)}
          >
            <span>Employer Details</span>
          </button>
        )}
        {hasBreakdown && (
          <button
            type="button"
            className={`jd-floating-breakdown-tab ${isBreakdownOpen && !isBreakdownClosing ? "active" : ""}`}
            onClick={handleToggleBreakdown}
          >
            <span>{isBreakdownOpen && !isBreakdownClosing ? "Hide Breakdown" : "Match Breakdown"}</span>
          </button>
        )}
        {canMessage && (
          <button
            type="button"
            className={`jd-floating-breakdown-tab ${isMsgPanelOpen && !isMsgPanelClosing ? "active" : ""}`}
            onClick={handleToggleMsgPanel}
          >
            <span>{isMsgPanelOpen && !isMsgPanelClosing ? "Hide Message" : "Message"}</span>
          </button>
        )}
      </div>
    );
  };

  // Determine effective side panel to render
  const effectiveSidePanel = sidePanel !== undefined
    ? sidePanel
    : (isMsgPanelOpen || isMsgPanelClosing)
      ? renderMessageSidePanel()
      : (!isApplicantView && (isBreakdownOpen || isBreakdownClosing))
        ? renderBreakdownSidePanel()
        : null;

  const panelContent = (
    <div
      ref={panelRef}
      className="jd-panel"
      style={matchedHeight ? { height: `${matchedHeight}px`, maxHeight: `${matchedHeight}px` } : undefined}
    >
      {/* Cover banner */}
      {!hideEmployerHeader && (
        <div ref={bannerRef} className="jd-cover-banner">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={`${companyName} cover`}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
                const placeholder = e.currentTarget.parentElement?.querySelector(".jd-cover-placeholder") as HTMLElement;
                if (placeholder) placeholder.style.display = "flex";
              }}
            />
          ) : null}
          <div className="jd-cover-placeholder" style={{ display: coverSrc ? "none" : "flex" }}>
            <span>Cover photo</span>
          </div>
        </div>
      )}

      {/* Employer strip */}
      {!hideEmployerHeader && (
        <div ref={stripRef} className="jd-employer-strip">
          <div className="jd-employer-logo-info">
            <div
              className={`jd-employer-logo ${onEmployerClick ? "clickable" : ""}`}
              aria-label="Company logo"
              onClick={() => onEmployerClick && (onEmployerClick as any)(empUserId)}
              style={{
                cursor: onEmployerClick ? "pointer" : "default",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={companyName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
                    }
                  }}
                />
              ) : null}
              <svg viewBox="0 0 24 24" aria-hidden="true" style={{ display: logoSrc ? "none" : "block", width: "32px", height: "32px", stroke: "#0284c7" }}>
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
              </svg>
            </div>
            <div>
              <div className="jd-employer-name-row">
                <span className="company-inline-rating-pill" title="Company rating">
                  <span className="star-icon">★</span>
                  <span>{ratingText}</span>
                </span>
                <strong
                  className={`jd-employer-name ${onEmployerClick ? "clickable" : ""}`}
                  onClick={() => onEmployerClick && (onEmployerClick as any)(empUserId)}
                  style={{ cursor: onEmployerClick ? "pointer" : "default" }}
                >
                  {companyName}
                </strong>
              </div>
              <span className="jd-employer-location">
                <svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12" fill="none" stroke="#5b8ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {locationStr}
              </span>
            </div>
          </div>

          <div className="jd-header-right-actions">
            {matchScore !== undefined && (
              isApplicantView ? (
                (() => {
                  const rec = getApplicantRecommendation(matchScore);
                  if (!rec) return null;
                  return (
                    <span
                      className={`applicant-rec-badge ${rec.colorClass}`}
                      title={rec.label}
                    >
                      {rec.label}
                    </span>
                  );
                })()
              ) : (
                <div
                  className={`match-score-box ${getMatchColorClass(matchScore)}`}
                  title="Match Score"
                >
                  <small>MATCH</small>
                  <b>{matchScore}%</b>
                </div>
              )
            )}
            <button
              type="button"
              className={`jd-faq-btn ${isFaqOpen ? "active" : ""}`}
              onClick={handleToggleFaq}
            >
              FAQ's
            </button>
          </div>
        </div>
      )}

      {/* Scrollable body & drawer container */}
      <div ref={bodyWrapperRef} className="jd-body-wrapper">
        <div ref={bodyRef} className="jd-body" style={hideEmployerHeader ? { paddingTop: "24px" } : undefined}>
          {/* Title row */}
          <div className="jd-top-section">
            <div
              className="jd-title-row"
              style={hideEmployerHeader ? { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "nowrap" } : undefined}
            >
              <h2 className="jd-title-h2" style={hideEmployerHeader ? { flex: 1, minWidth: 0, margin: 0 } : undefined}>{jobTitle}</h2>
              {hideEmployerHeader && matchScore !== undefined && (
                isApplicantView ? (
                  (() => {
                    const rec = getApplicantRecommendation(matchScore);
                    if (!rec) return null;
                    return (
                      <span
                        className={`applicant-rec-badge ${rec.colorClass}`}
                        title={rec.label}
                        style={{ flexShrink: 0, margin: 0 }}
                      >
                        {rec.label}
                      </span>
                    );
                  })()
                ) : (
                  <div
                    className={`match-score-box ${getMatchColorClass(matchScore)}`}
                    title="Match Score"
                    style={{ flexShrink: 0, margin: 0 }}
                  >
                    <small>MATCH</small>
                    <b>{matchScore}%</b>
                  </div>
                )
              )}
            </div>
            <div className="jd-chips-inline">
              <span className={`status-chip ${isOpenStatus ? "open" : "closed"}`}>
                {isOpenStatus ? "Open" : "Closed"}
              </span>
              {isUrgent && <span className="status-chip urgent">Urgent</span>}
              <span className="setup-pill">{workSetup}</span>
              {experienceLevel && <span className="exp-level-pill">{experienceLevel}</span>}
              <span className="salary-pill">{formatSalary()}</span>
            </div>
          </div>

          <div className="jd-section">
            <h3>Job Description</h3>
            <p>{descriptionText}</p>
          </div>

          {skills.length > 0 && (
            <div className="jd-section">
              <h3>Required Skills</h3>
              <div className="jd-tags-wrap">
                {skills.map((s, idx) => (
                  <span className="js-tag-chip js-tag-skill" key={idx} title={s}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="jd-section">
            <h3>Required Qualifications</h3>
            <div className="jd-tags-wrap">
              {displayQualifications.map((q, idx) => (
                <span className="js-tag-chip js-tag-qualification" key={idx} title={q}>{q}</span>
              ))}
            </div>
          </div>

          <div className="jd-section">
            <h3>Required Certifications</h3>
            <div className="jd-tags-wrap">
              {displayCertifications.map((c, idx) => (
                <span className="js-tag-chip js-tag-certification" key={idx} title={c}>{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Slide-in FAQ Drawer */}
        <div ref={faqDrawerRef} className={`jd-faq-drawer ${isFaqOpen ? "open" : ""}`}>
          <div className="jd-faq-header">
            <h3>Company FAQ's</h3>
            <button type="button" className="jd-faq-back-btn" aria-label="Back to job details" onClick={handleCloseFaq}>
              ←
            </button>
          </div>
          <div className="jd-faq-body">
            {loadingFaqs ? (
              <p className="jd-faq-loading">Loading FAQ's...</p>
            ) : faqsList.length === 0 ? (
              <p className="jd-faq-empty">No FAQ's created by this company yet.</p>
            ) : (
              faqsList.map((faq) => {
                const isExpanded = expandedFaqIds.includes(faq.id);
                return (
                  <div key={faq.id} className={`jd-faq-item ${isExpanded ? "expanded" : ""}`}>
                    <button
                      type="button"
                      className="jd-faq-question-btn"
                      onClick={() => toggleFaq(faq.id)}
                    >
                      <div className="jd-faq-q-left">
                        {faq.question_type && <span className="jd-faq-type-badge">{faq.question_type}</span>}
                        <span className="jd-faq-question-text">{faq.question}</span>
                      </div>
                      <span className="jd-faq-toggle-icon">{isExpanded ? "−" : "+"}</span>
                    </button>
                    {isExpanded && (
                      <div className="jd-faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div ref={footerRef} className="jd-panel-footer">
        <div className="jd-footer-meta">
          <span><strong>Close Date:</strong> {closeDate}</span>
        </div>
        <div className="jd-footer-actions">
          <button type="button" className="jd-cancel-btn" onClick={onClose}>
            Close
          </button>
          {customFooterActions ? (
            customFooterActions
          ) : (
            <>
              {isApplied || appliedLabel ? (
                <button
                  type="button"
                  className={`solid-btn applied-btn status-${(appliedLabel || "applied").toLowerCase()}`}
                  disabled
                >
                  {appliedLabel || "Applied"}
                </button>
              ) : isClosed ? (
                <button
                  type="button"
                  className="solid-btn closed-btn status-closed"
                  disabled
                >
                  Closed
                </button>
              ) : onApply ? (
                <button
                  type="button"
                  className="solid-btn"
                  onClick={onApply}
                  disabled={isApplying}
                >
                  {isApplying ? "Applying..." : "Apply Now"}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );

  const tabsContent = renderFloatingTabs();

  return (
    <>
      <div
        className="jd-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Job Details"
        style={zIndex ? { zIndex } : undefined}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`jd-modal-container ${effectiveSidePanel ? "with-side-panel" : ""}`}
        >
          <div className="jd-panel-outer-wrap">
            {tabsContent && (
              <div className="jd-floating-tabs-container">
                {tabsContent}
              </div>
            )}
            {panelContent}
          </div>

          {effectiveSidePanel && (
            <div
              ref={sidePanelSlotRef}
              className="jd-side-panel-slot"
              style={matchedHeight ? { height: `${matchedHeight}px`, maxHeight: `${matchedHeight}px` } : undefined}
            >
              {effectiveSidePanel}
            </div>
          )}
        </div>
      </div>

      {renderBreakdownPopupModal()}

      {/* ── STANDALONE APPLICANT DECISION MODAL (Only when opened without offer letter) ── */}
      {!viewLetterModalTarget && decisionModalTarget && (
        <ApplicantDecisionModal
          isOpen={true}
          withoutBackdrop={false}
          position="center"
          action={decisionModalTarget?.action || "accept"}
          title="Respond to Employment Offer"
          jobTitle={decisionModalTarget?.title || job?.title}
          companyName={decisionModalTarget?.companyName || companyName}
          candidateName={(applicantProfile as any)?.applicant_name || "Candidate"}
          currentUserId={currentUserId ? Number(currentUserId) : undefined}
          offerLetter={decisionModalTarget?.offerLetter}
          onClose={() => setDecisionModalTarget(null)}
          onConfirm={async ({ action, letter_text, letter_type, start_date }) => {
            await handleRespondFromModal({ action, letter_text, letter_type, start_date });
          }}
        />
      )}

      {/* ── FORMAL LETTER VIEWER MODAL (Contains 1st modal Offer Letter + either 2nd modal Decision Form or Candidate Response) ── */}
      {viewLetterModalTarget && (() => {
        const hasDecision = viewLetterModalTarget.decision === "accepted" || viewLetterModalTarget.decision === "declined";
        const offerText = viewLetterModalTarget.offerLetter || `Dear ${(applicantProfile as any)?.applicant_name || "Candidate"},\n\nCongratulations! On behalf of ${viewLetterModalTarget.company || "the company"}, we are thrilled to formally extend an offer of employment for the position of "${viewLetterModalTarget.title}".\n\nPlease review this official offer letter and submit your formal response.\n\nWe look forward to welcoming you to our team!`;
        const isAcc = viewLetterModalTarget.decision === "accepted";
        const responseText = viewLetterModalTarget.letterText || (isAcc
          ? `Dear ${viewLetterModalTarget.company || "Hiring Team"},\n\nThank you for extending the offer for the position of "${viewLetterModalTarget.title}". I am pleased to accept your offer and excited to join the team.${viewLetterModalTarget.startDate ? ` My target start date is ${viewLetterModalTarget.startDate}.` : ""}\n\nSincerely,\n${(applicantProfile as any)?.applicant_name || "Candidate"}`
          : `Dear ${viewLetterModalTarget.company || "Hiring Team"},\n\nThank you for considering me for the position of "${viewLetterModalTarget.title}". After careful consideration, I regret to inform you that I must decline this offer.\n\nSincerely,\n${(applicantProfile as any)?.applicant_name || "Candidate"}`);

        return (
          <div
            className="view-letter-backdrop"
            onClick={() => {
              setViewLetterModalTarget(null);
              setDecisionModalTarget(null);
            }}
            style={{ zIndex: 100000 }}
          >
            <div
              className="view-letter-pair-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── LEFT MODAL: THE LETTER FROM THE SENDER (Employer Offer Letter) ── */}
              <div className="view-letter-modal-card">
                <div className="view-letter-header">
                  <div>
                    <span className="view-letter-eyebrow">OFFICIAL CORRESPONDENCE</span>
                    <h3 className="view-letter-title">{viewLetterModalTarget.title}</h3>
                    <p className="view-letter-company">{viewLetterModalTarget.company}</p>
                  </div>
                  <button
                    type="button"
                    className="view-letter-close-btn"
                    onClick={() => {
                      setViewLetterModalTarget(null);
                      setDecisionModalTarget(null);
                    }}
                    title="Close"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="view-letter-body-content">
                  <div className="view-letter-meta-row">
                    {viewLetterModalTarget.decision && (
                      <span className={`view-letter-badge ${viewLetterModalTarget.decision === "accepted" ? "accepted" : viewLetterModalTarget.decision === "declined" ? "declined" : "extended"}`}>
                        {viewLetterModalTarget.decision === "accepted" ? "Offer Accepted" : viewLetterModalTarget.decision === "declined" ? "Offer Declined" : "Formal Offer Extended"}
                      </span>
                    )}
                  </div>

                  <div className="view-letter-body-box view-letter-offer-box">
                    <div className="view-letter-box-header">
                      <span className="view-letter-box-label offer-label">
                        EMPLOYMENT OFFER LETTER FROM {viewLetterModalTarget.company?.toUpperCase() || "EMPLOYER"}
                      </span>
                    </div>
                    <pre className="view-letter-pre-text">{offerText}</pre>
                  </div>
                </div>

                <div className="view-letter-footer">
                  <button
                    type="button"
                    className="solid-btn view-letter-done-btn"
                    onClick={() => {
                      setViewLetterModalTarget(null);
                      setDecisionModalTarget(null);
                    }}
                  >
                    Close
                  </button>

                  {!hasDecision && !decisionModalTarget && (
                    <button
                      type="button"
                      className="solid-btn view-letter-respond-btn"
                      onClick={() => {
                        setDecisionModalTarget({
                          action: "accept",
                          title: viewLetterModalTarget.title,
                          companyName: viewLetterModalTarget.company,
                          offerLetter: viewLetterModalTarget.offerLetter,
                          jobId: viewLetterModalTarget.jobId,
                          applicationId: viewLetterModalTarget.applicationId,
                        });
                      }}
                    >
                      Review &amp; Respond
                    </button>
                  )}
                </div>
              </div>

              {/* ── RIGHT MODAL CASE A: DECISION FORM (When Review & Respond is active) ── */}
              {decisionModalTarget && (
                <ApplicantDecisionModal
                  isOpen={true}
                  withoutBackdrop={true}
                  position="right"
                  action={decisionModalTarget?.action || "accept"}
                  title="Respond to Employment Offer"
                  jobTitle={decisionModalTarget?.title || job?.title}
                  companyName={decisionModalTarget?.companyName || companyName}
                  candidateName={(applicantProfile as any)?.applicant_name || "Candidate"}
                  currentUserId={currentUserId ? Number(currentUserId) : undefined}
                  offerLetter={decisionModalTarget?.offerLetter}
                  onClose={() => setDecisionModalTarget(null)}
                  onConfirm={async ({ action, letter_text, letter_type, start_date }) => {
                    await handleRespondFromModal({ action, letter_text, letter_type, start_date });
                  }}
                />
              )}

              {/* ── RIGHT MODAL CASE B: USERS RESPONSE (For Approved / Declined Offers) ── */}
              {!decisionModalTarget && hasDecision && (
                <div className="view-letter-modal-card view-letter-response-modal">
                  <div className="view-letter-header" style={{ alignItems: "center" }}>
                    <div>
                      <h3 className="view-letter-title" style={{ fontSize: "1.15rem" }}>
                        Response Letter ({viewLetterModalTarget.decision === "accepted" ? "Accepted" : "Denied"})
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="view-letter-close-btn"
                      onClick={() => {
                        setViewLetterModalTarget(null);
                        setDecisionModalTarget(null);
                      }}
                      title="Close"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="view-letter-body-content">
                    {viewLetterModalTarget.startDate && (
                      <div className="view-letter-meta-row" style={{ marginBottom: "12px" }}>
                        <span className="view-letter-start-date-tag">
                          📅 Target Start Date: <strong>{viewLetterModalTarget.startDate}</strong>
                        </span>
                        {viewLetterModalTarget.respondedAt && (
                          <span className="view-letter-timestamp-tag">
                            Submitted: {typeof formatDate === "function" ? formatDate(viewLetterModalTarget.respondedAt) : String(viewLetterModalTarget.respondedAt)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="view-letter-body-box">
                      <div className="view-letter-box-header">
                        <span className="view-letter-box-label">
                          FORMAL RESPONSE LETTER
                        </span>
                      </div>
                      <pre className="view-letter-pre-text">{responseText}</pre>
                    </div>
                  </div>

                  <div className="view-letter-footer">
                    <button
                      type="button"
                      className="solid-btn view-letter-done-btn"
                      onClick={() => {
                        setViewLetterModalTarget(null);
                        setDecisionModalTarget(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </>
  );
}
