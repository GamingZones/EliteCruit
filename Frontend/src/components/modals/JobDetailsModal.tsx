import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./JobDetailsModal.css";
import {
  isJobClosedOrExpired,
  calculateJobMatchDetails,
  getMatchColorClass,
  isSkillMatch,
  isCertificationMatch,
  parseCompetencyDisplayTags,
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

  const parseToken = (token: string): BreakdownCertItem => {
    let category = "General";
    const catMatch = token.match(/\[([^\[\]]+)\]/);
    if (catMatch && catMatch[1].trim()) {
      category = catMatch[1].trim();
    }

    let acquiredYear = "2010";
    let expiry = "2026";

    const lastParen = token.match(/\(([^()]+)\)$/);
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

    let cleanName = token.replace(/\s*\[[^\[\]]*\]/g, "").replace(/\s*\([^()]*\)$/, "").trim();
    const openCount = (cleanName.match(/\(/g) || []).length;
    const closeCount = (cleanName.match(/\)/g) || []).length;
    if (openCount > closeCount) cleanName = cleanName + ")".repeat(openCount - closeCount);
    else if (closeCount > openCount) cleanName = cleanName.replace(/\)+$/, "");

    return {
      name: cleanName || token.trim(),
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
              acquiredYear: p.acquiredYear || p.acquired || "2010",
              expiry: p.expiry || p.years || "2026",
            });
          } else if (p) {
            items.push(parseToken(String(p)));
          }
        });
      }
    } catch {}

    if (items.length === 0) {
      const rawTokens = raw.includes(")")
        ? raw.split(/(?<=\))\s*,\s*/)
        : raw.split(/[\n,;•|]+/);
      rawTokens.forEach((tok) => {
        if (tok.trim()) items.push(parseToken(tok));
      });
    }
  }

  if (items.length === 0 && fallbackTags.length > 0) {
    fallbackTags.forEach((tok) => items.push(parseToken(tok)));
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
    const bannerH = bannerRef.current ? bannerRef.current.offsetHeight : 140;
    const stripH = stripRef.current ? stripRef.current.offsetHeight : 65;
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
  }, [isFaqOpen]);

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
    const minAllowed = 440;

    const h1 = measureH1();
    if (!h1) return;

    const h2 = measureH2(h1);

    const clampedH1 = Math.max(minAllowed, Math.min(h1, maxAllowed));
    const clampedH2 = Math.max(minAllowed, Math.min(h2, maxAllowed));

    const equalH = Math.min(clampedH1, clampedH2);

    setMatchedHeight((prev) => {
      if (prev !== null && Math.abs(prev - equalH) <= 2) return prev;
      return equalH;
    });
  }, [sidePanel, isMsgPanelOpen, isMsgPanelClosing, isBreakdownOpen, isBreakdownClosing, measureH1, measureH2]);

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

  const parseTags = (data: any): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      return data
        .map((item) => (typeof item === "object" && item !== null && item.name ? String(item.name) : String(item).trim()))
        .filter(Boolean);
    }
    return parseCompetencyDisplayTags(String(data));
  };

  const skills = useMemo(() => {
    const list = job?.skillTags && job.skillTags.length > 0 ? job.skillTags : parseTags(job?.required_skills);
    return list.filter((s) => s && s.trim().toLowerCase() !== "not provided");
  }, [job]);

  const cleanQualifications = useMemo(() => {
    const list = job?.qualTags && job.qualTags.length > 0 ? job.qualTags : parseTags(job?.qualifications || (job as any)?.required_qualifications);
    return list.filter((q) => q && q.trim().toLowerCase() !== "not provided");
  }, [job]);

  const cleanCertifications = useMemo(() => {
    const list = job?.certTags && job.certTags.length > 0 ? job.certTags : parseTags(job?.certifications || (job as any)?.required_certifications);
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
    const scoreVal = matchScore !== undefined ? matchScore : 0;
    const appSkills = applicantProfile?.skills || [];
    const appQuals = applicantProfile?.qualifications || [];
    const appCerts = applicantProfile?.certifications || [];

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
            <span className={`match-badge-pill ${getMatchColorClass(scoreVal)}`}>
              {scoreVal}% Match
            </span>
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
              <span><strong>Green Tag:</strong> Matched with your profile</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot red"></span>
              <span><strong>Red Tag:</strong> Required by employer, missing from your profile</span>
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
                    const matched = checkMatch(item, appSkills);
                    const isSource = hoveredCompareTag?.side === "employer" && hoveredCompareTag?.item === item;
                    const isLinked = Boolean(hoveredCompareTag?.side === "applicant" && hoveredCompareTag?.category === "skills" && isSkillMatch(item, hoveredCompareTag.item));
                    return (
                      <span
                        key={item}
                        className={`jd-comp-tag ${matched ? "tag-matched-green" : "tag-missing-red"} ${isSource ? "tag-hover-source" : ""} ${isLinked ? "tag-hover-linked" : ""}`}
                        onMouseEnter={() => setHoveredCompareTag({ item, side: "employer", category: "skills" })}
                        onMouseLeave={() => setHoveredCompareTag(null)}
                      >
                        <span className="tag-icon">{matched ? "✓" : "✗"}</span>
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

    return (
      <div
        className="skill-popup-modal-overlay"
        onClick={() => setActiveBreakdownPopup(null)}
        style={{ zIndex: 10200 }}
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

    const hasBreakdown = Boolean(applicantProfile || job.matchScore !== undefined);
    const canMessage = Boolean(empUserId && currentUserId);

    if (!empUserId && !hasBreakdown && !canMessage) return null;

    return (
      <div style={{ display: "flex", gap: "8px" }}>
        {empUserId && onEmployerClick && (
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
      : (isBreakdownOpen || isBreakdownClosing)
        ? renderBreakdownSidePanel()
        : null;

  const panelContent = (
    <div
      ref={panelRef}
      className="jd-panel"
      style={matchedHeight ? { height: `${matchedHeight}px`, maxHeight: `${matchedHeight}px` } : undefined}
    >
      {/* Cover banner */}
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

      {/* Employer strip */}
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
              <strong
                className={`jd-employer-name ${onEmployerClick ? "clickable" : ""}`}
                onClick={() => onEmployerClick && (onEmployerClick as any)(empUserId)}
                style={{ cursor: onEmployerClick ? "pointer" : "default" }}
              >
                {companyName}
              </strong>
              <span className="company-inline-rating-pill" title="Company rating">
                <span className="star-icon">★</span>
                <span>{ratingText}</span>
              </span>
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
            <div
              className={`match-score-box ${getMatchColorClass(matchScore)}`}
              title="Match Score"
            >
              <small>MATCH</small>
              <b>{matchScore}%</b>
            </div>
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

      {/* Scrollable body & drawer container */}
      <div ref={bodyWrapperRef} className="jd-body-wrapper">
        <div ref={bodyRef} className="jd-body">
          {/* Title row */}
          <div className="jd-top-section">
            <div className="jd-title-row">
              <h2 className="jd-title-h2">{jobTitle}</h2>
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
          style={!effectiveSidePanel ? { maxWidth: "820px" } : undefined}
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
    </>
  );
}
