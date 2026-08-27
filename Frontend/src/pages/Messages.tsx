import React, { useEffect, useState } from "react";
import { ChevronIcon, SideIcon } from "./Applicant-Dashboard";
import { useEmployerCompanyLabel } from "./useEmployerCompanyLabel";
import ChatbotDrawer, { FAQItem } from "../components/ChatbotDrawer";
import "./Applicant-Dashboard.css";
import "./ApplicantDashboardOverrides.css";
import "./Employer-Dashboard.css";
import "./Employer-ApplicantFinder.css";
import "./JobSearch.css";
import "./Messages.css";

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
  | "messages"
  | "notifications"
  | "profile"
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
    messages: <path d="M3 6h18v11H8l-5 4v-4H3V6Zm3 3h12M6 12h8" />,
    notifications: <path d="M12 3a5 5 0 0 1 5 5v2.8l1.4 2.3c.5.8 0 1.9-.9 1.9H6.5c-.9 0-1.4-1.1-.9-1.9L7 10.8V8a5 5 0 0 1 5-5Zm-2 14a2 2 0 1 0 4 0" />,
    profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    logout: <path d="M9 4H5v16h4M14 8l4 4-4 4M10 12h8" />,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

type JobOption = {
  id: number;
  title: string;
};

type ThreadItem = {
  id: number;
  title: string;
  updated_at?: string;
  created_at?: string;
  last_message?: string;
  last_message_time?: string;
  other_user_id?: number;
  other_user_email?: string;
  other_user_phone?: string;
  other_user_name?: string;
  is_invited?: number | boolean;
  invitation_status?: string | null;
};

type JobDetailsModalData = {
  id: number;
  title: string;
  company: string;
  location: string;
  summary: string;
  salary: string;
  salaryMin: number;
  setup: string;
  status: "open" | "closed";
  closeDate: string;
  applicationLimit: number;
  applicantCount: number;
  qualifications: string;
  responsibilities: string;
  skillTags: string[];
  qualTags: string[];
  urgent: boolean;
  employerUserId?: number;
  rating?: string;
  matchScore?: number;
};

type CandidateDetails = {
  user_id: number;
  applicant_name: string;
  email: string;
  phone: string;
  desired_job_title: string;
  work_arrangement: string;
  expected_salary: string;
  skills: string;
  qualifications: string;
  certifications: string;
  resume_path?: string | null;
  city?: string;
  rating?: string;
};

type EmployerCompanyDetails = {
  user_id: number;
  business_name: string;
  business_email: string;
  contact_number?: string | null;
  industry?: string | null;
  company_size?: string | null;
  company_description?: string | null;
  company_address?: string | null;
  website?: string | null;
};

type ChatMessage = {
  id: number;
  thread_id: number;
  sender_user_id: number;
  message_text: string;
  created_at?: string;
  sender_email?: string;
};

const DEFAULT_FAQS = [
  {
    id: 1,
    question_type: "Hiring Process",
    question: "What is the hiring process like?",
    answer: "Our hiring process involves an initial resume screening, an interview with HR, a technical assessment, and a final interview with the hiring manager.",
  },
  {
    id: 2,
    question_type: "Work Setup",
    question: "What is the work setup for this role?",
    answer: "The work setup depends on the job posting (Remote, Hybrid, or On-Site). Please review the job details above for specifics.",
  },
  {
    id: 3,
    question_type: "Benefits",
    question: "What benefits and perks are offered?",
    answer: "We offer competitive compensation, health insurance (HMO), paid leaves, continuous learning allowances, and career growth opportunities.",
  },
];

function parseItemList(raw?: string | null, fallback: string[] = []): string[] {
  if (!raw || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {}
  return raw
    .split(/[\n,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function initialsFromName(name?: string | null) {
  if (!name) return "EC";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function Messages() {
  const [sessionRole, setSessionRole] = useState<"applicant" | "employer">("applicant");
  const [applicantLabel, setApplicantLabel] = useState("Applicant");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const employerMessagesFaqs: FAQItem[] = [
    {
      question: "When can I message an applicant?",
      answer: "You can chat with applicants who have submitted an application to your job post or candidates who have accepted a direct recruitment invitation.",
    },
    {
      question: "How do I filter chat threads by job posting?",
      answer: "Use the 'Job Opening' filter dropdown at the top of the chat sidebar to view messages associated with a specific job post.",
    },
  ];
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composeText, setComposeText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "applied" | "recruited">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState<CandidateDetails | null>(null);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<EmployerCompanyDetails | null>(null);
  const [detailsJob, setDetailsJob] = useState<JobDetailsModalData | null>(null);
  const [isFaqDrawerOpen, setIsFaqDrawerOpen] = useState(false);
  const [companyFaqs, setCompanyFaqs] = useState<any[]>(DEFAULT_FAQS);
  const [faqLoading, setFaqLoading] = useState(false);
  const [expandedFaqIds, setExpandedFaqIds] = useState<number[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [invitationStatus, setInvitationStatus] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [isRespondingInvitation, setIsRespondingInvitation] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isPreviewingDoc, setIsPreviewingDoc] = useState(false);
  const [employerJobs, setEmployerJobs] = useState<JobOption[]>([]);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");
  const companyLabel = useEmployerCompanyLabel("Employer");
  const isEmployer = sessionRole === "employer";

  const fetchEmployerJobs = async (employerId: number) => {
    try {
      const res = await fetch(`/api/employers/${employerId}/active-job-posts`);
      if (res.ok) {
        const data = await res.json();
        setEmployerJobs(data?.jobs || []);
      }
    } catch {}
  };

  const handleOpenJobDetailsForApplicant = async (thread: ThreadItem) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch("/api/job-posts");
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data?.jobPosts) ? data.jobPosts : [];
        
        const cleanThreadTitle = (thread.title || "").replace(/^Job Invitation:\s*/i, "").trim().toLowerCase();
        
        let matched = rows.find((r: any) => {
          const rowTitle = (r.title || "").trim().toLowerCase();
          return rowTitle === cleanThreadTitle || (cleanThreadTitle && (rowTitle.includes(cleanThreadTitle) || cleanThreadTitle.includes(rowTitle)));
        });

        if (!matched && thread.other_user_id) {
          matched = rows.find((r: any) => Number(r.employer_user_id) === Number(thread.other_user_id));
        }

        const formatSalary = (min: number | null, max: number | null) => {
          if (min && max) return `PHP ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}`;
          if (min) return `PHP ${Number(min).toLocaleString()}+`;
          return "Competitive Salary";
        };

        const parseSkills = (raw?: string | null) => {
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
          } catch {}
          return String(raw).split(/[\n,;|]+/).map((s) => s.trim()).filter(Boolean);
        };

        if (matched) {
          const matchedId = Number(matched.id);
          setDetailsJob({
            id: matchedId,
            title: matched.title || "Job Opening",
            company: matched.company_name || thread.other_user_name || "Employer",
            location: matched.location || "Kawit, Cavite",
            summary: matched.description || "No job description provided yet.",
            salary: formatSalary(matched.salary_min ?? null, matched.salary_max ?? null),
            salaryMin: Number(matched.salary_min) || 0,
            setup: matched.work_arrangement || "Flexible",
            status: matched.status === "closed" ? "closed" : "open",
            closeDate: matched.close_date || "08/28/2026",
            applicationLimit: Number(matched.application_limit) || 10,
            applicantCount: Number(matched.applicant_count) || 1,
            qualifications: matched.qualifications || "Not provided",
            responsibilities: matched.responsibilities || "Not provided",
            skillTags: parseSkills(matched.required_skills),
            qualTags: matched.qualifications ? String(matched.qualifications).split(",").map((q: string) => q.trim()).filter(Boolean) : [],
            urgent: Boolean(Number(matched.is_urgent || 0)),
            employerUserId: Number(matched.employer_user_id) || thread.other_user_id,
            rating: matched.rating ? String(matched.rating) : "0.0",
            matchScore: 35,
          });
          setIsFaqDrawerOpen(false);

          if (currentUserId) {
            try {
              const invRes = await fetch(`/api/job-invitations/status?job_post_id=${matchedId}&applicant_user_id=${currentUserId}`);
              if (invRes.ok) {
                const invData = await invRes.json();
                if (invData?.invitation?.status) {
                  setInvitationStatus(invData.invitation.status);
                } else if (thread.is_invited || thread.title?.toLowerCase().includes("job invitation")) {
                  setInvitationStatus("pending");
                } else {
                  setInvitationStatus(null);
                }
              }
            } catch {
              if (thread.is_invited || thread.title?.toLowerCase().includes("job invitation")) {
                setInvitationStatus("pending");
              } else {
                setInvitationStatus(null);
              }
            }
          }
          return;
        }
      }
      
      const fallbackJobId = 0;
      setDetailsJob({
        id: fallbackJobId,
        title: (thread.title || "Job Opening").replace(/^Job Invitation:\s*/i, ""),
        company: thread.other_user_name || "Employer",
        location: "Kawit, Cavite",
        summary: "Join our dynamic team! We are looking for talented candidates ready to grow and succeed in this role.",
        salary: "PHP 25,000 - 35,000",
        salaryMin: 25000,
        setup: "On-Site",
        status: "open",
        closeDate: "08/28/2026",
        applicationLimit: 10,
        applicantCount: 1,
        qualifications: "Web Development Bootcamp, BS Computer Science (BSCS)",
        responsibilities: "Develop web apps",
        skillTags: ["Web Development", "Data Structures and Algorithms", "TypeScript"],
        qualTags: ["Web Development Bootcamp", "BS Computer Science (BSCS)"],
        urgent: false,
        employerUserId: thread.other_user_id,
        rating: "0.0",
        matchScore: 35,
      });
      setIsFaqDrawerOpen(false);
      if (thread.is_invited || thread.title?.toLowerCase().includes("job invitation")) {
        setInvitationStatus("pending");
      } else {
        setInvitationStatus(null);
      }
    } catch (err) {
      console.error("Error opening job details:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleRespondInvitation = async (action: "accept" | "decline") => {
    if (!currentUserId || !detailsJob?.id) return;
    setIsRespondingInvitation(true);
    try {
      const res = await fetch("/api/job-invitations/respond-by-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_post_id: detailsJob.id,
          applicant_user_id: currentUserId,
          action,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newStatus = data.status || (action === "accept" ? "accepted" : "declined");
        setInvitationStatus(newStatus);
        if (action === "accept") {
          setAppliedJobIds((prev) => [...prev, detailsJob.id]);
        }
        setSelectedThread((prev) => (prev ? { ...prev, invitation_status: newStatus } : null));
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedThread?.id ? { ...t, invitation_status: newStatus } : t))
        );
        if (selectedThread?.id) {
          fetchThreadMessages(selectedThread.id);
        }
      }
    } catch (err) {
      console.error("Error responding to invitation:", err);
    } finally {
      setIsRespondingInvitation(false);
    }
  };

  const handleRespondInvitationFromChat = async (action: "accept" | "decline") => {
    if (!currentUserId || !selectedThread?.id) return;
    setIsRespondingInvitation(true);
    try {
      const res = await fetch("/api/job-invitations/respond-by-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: selectedThread.id,
          applicant_user_id: currentUserId,
          action,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newStatus = data.status || (action === "accept" ? "accepted" : "declined");
        setInvitationStatus(newStatus);
        setSelectedThread((prev) => (prev ? { ...prev, invitation_status: newStatus } : null));
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedThread.id ? { ...t, invitation_status: newStatus } : t))
        );
        fetchThreadMessages(selectedThread.id);
      }
    } catch {
      alert("Unable to process your response. Please try again.");
    } finally {
      setIsRespondingInvitation(false);
    }
  };

  const handleOpenFaqs = (job: JobDetailsModalData) => {
    setIsFaqDrawerOpen(true);
    setFaqLoading(true);
    if (job.employerUserId) {
      fetch(`/api/employers/${job.employerUserId}/faqs`)
        .then((res) => res.json())
        .then((data) => {
          const rows = Array.isArray(data?.faqs)
            ? data.faqs.filter((f: any) => f.is_active !== 0)
            : [];
          setCompanyFaqs(rows.length > 0 ? rows : DEFAULT_FAQS);
        })
        .catch(() => setCompanyFaqs(DEFAULT_FAQS))
        .finally(() => setFaqLoading(false));
    } else {
      setCompanyFaqs(DEFAULT_FAQS);
      setFaqLoading(false);
    }
  };

  const applyToJob = async (jobId: number) => {
    if (!currentUserId || jobId === 0) return;
    if (appliedJobIds.includes(jobId)) return;
    setApplyingJobId(jobId);
    try {
      const res = await fetch(`/api/applicants/${currentUserId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_post_id: jobId }),
      });
      if (res.ok) {
        setAppliedJobIds((prev) => [...prev, jobId]);
        if (detailsJob) {
          setDetailsJob({ ...detailsJob, applicantCount: detailsJob.applicantCount + 1 });
        }
      }
    } catch {}
    finally {
      setApplyingJobId(null);
    }
  };

  const handleOpenDetails = async (targetUserId: number, fallbackName: string, fallbackEmail?: string, fallbackPhone?: string) => {
    setIsLoadingDetails(true);
    try {
      let res = await fetch(`/api/applicants/${targetUserId}/profile`);
      if (res.ok) {
        const data = await res.json();
        const profile = data?.profile;
        if (profile) {
          const resolvedCity = profile.city || profile.address || "Cavite";
          setSelectedCandidateDetails({
            user_id: targetUserId,
            applicant_name: [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || fallbackName,
            email: profile.email || fallbackEmail || "",
            phone: profile.phone || fallbackPhone || "",
            desired_job_title: profile.desired_job_title || "Applicant",
            work_arrangement: profile.work_arrangement || "On-Site",
            expected_salary: profile.expected_salary || "PHP 20,000",
            skills: profile.skills || "",
            qualifications: profile.qualifications || "",
            certifications: profile.certifications || "",
            resume_path: profile.resume_path || null,
            city: resolvedCity,
            rating: profile.rating ? String(profile.rating) : "0.0",
          });
          return;
        }
      }

      res = await fetch(`/api/employers/${targetUserId}/profile`);
      if (res.ok) {
        const data = await res.json();
        const profile = data?.profile;
        if (profile) {
          const resolvedCity = profile.company_address || profile.city || "Cavite";
          setSelectedCandidateDetails({
            user_id: targetUserId,
            applicant_name: profile.business_name || fallbackName,
            email: profile.business_email || fallbackEmail || "",
            phone: profile.contact_number || fallbackPhone || "",
            desired_job_title: profile.industry || "Company",
            work_arrangement: profile.company_size || "Employer",
            expected_salary: "Company Profile",
            skills: profile.company_description || "",
            qualifications: "",
            certifications: "",
            resume_path: null,
            city: resolvedCity,
            rating: profile.rating ? String(profile.rating) : "0.0",
          });
          return;
        }
      }

      setSelectedCandidateDetails({
        user_id: targetUserId,
        applicant_name: fallbackName,
        email: fallbackEmail || "",
        phone: fallbackPhone || "",
        desired_job_title: "Applicant",
        work_arrangement: "On-Site",
        expected_salary: "PHP 20,000",
        skills: "",
        qualifications: "",
        certifications: "",
        resume_path: null,
        city: "Cavite",
      });
    } catch {
      setSelectedCandidateDetails({
        user_id: targetUserId,
        applicant_name: fallbackName,
        email: fallbackEmail || "",
        phone: fallbackPhone || "",
        desired_job_title: "Applicant",
        work_arrangement: "On-Site",
        expected_salary: "PHP 20,000",
        skills: "",
        qualifications: "",
        certifications: "",
        resume_path: null,
        city: "Cavite",
      });
    } finally {
      setIsLoadingDetails(false);
      setIsPreviewingDoc(false);
    }
  };

  const fetchThreads = async (userId: number) => {
    setIsLoadingThreads(true);
    try {
      const res = await fetch(`/api/users/${userId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const loadedThreads = data?.threads || [];
        setThreads(loadedThreads);
        if (loadedThreads.length > 0 && !selectedThread) {
          setSelectedThread(loadedThreads[0]);
        }
      }
    } catch {
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const fetchThreadMessages = async (threadId: number) => {
    try {
      const res = await fetch(`/api/messages/threads/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data?.messages || []);
      }
    } catch {}
  };

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) return;
    try {
      const savedUser = JSON.parse(savedUserRaw) as {
        id?: number;
        role?: "applicant" | "employer";
        first_name?: string;
        firstName?: string;
        last_name?: string;
        lastName?: string;
        email?: string;
      };

      if (savedUser.id) {
        setCurrentUserId(savedUser.id);
        fetchThreads(savedUser.id);
      }

      if (savedUser.role === "employer") {
        setSessionRole("employer");
        if (savedUser.id) {
          fetchEmployerJobs(savedUser.id);
        }
        return;
      }
      setSessionRole("applicant");
      if (savedUser.id) {
        fetch(`/api/applicants/${savedUser.id}/applications`)
          .then((res) => res.json())
          .then((data) => {
            const ids = Array.isArray(data?.applications)
              ? data.applications.map((item: any) => Number(item?.job_post_id)).filter(Boolean)
              : [];
            setAppliedJobIds(ids);
          })
          .catch(() => {});
      }
      const first = savedUser.first_name || savedUser.firstName || "";
      const last = savedUser.last_name || savedUser.lastName || "";
      const fullName = `${first} ${last}`.trim();
      setApplicantLabel(fullName || "Applicant");

      if (!savedUser.id) {
        return;
      }

      fetch(`/api/applicants/${savedUser.id}/profile`)
        .then((response) => response.json())
        .then((data) => {
          const profile = data?.profile;
          const apiName = [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(" ");
          if (apiName) {
            setApplicantLabel(apiName);
          }
        })
        .catch(() => {
          // Keep local fallback name when profile API is unavailable.
        });
    } catch {
      setSessionRole("applicant");
    }
  }, []);

  useEffect(() => {
    if (selectedThread?.id) {
      fetchThreadMessages(selectedThread.id);
    }
  }, [selectedThread?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeText.trim() || !selectedThread?.id || !currentUserId || isSending) return;

    const textToSend = composeText.trim();
    setIsSending(true);
    setComposeText("");

    try {
      const res = await fetch(`/api/messages/threads/${selectedThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_user_id: currentUserId,
          message_text: textToSend,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.message) {
          setMessages((prev) => [...prev, data.message]);
          // Update thread list preview
          setThreads((prev) =>
            prev.map((t) =>
              t.id === selectedThread.id
                ? { ...t, last_message: textToSend, last_message_time: new Date().toISOString() }
                : t
            )
          );
        }
      }
    } catch {
      alert("Unable to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const filteredThreads = threads.filter((t) => {
    const isRecruited = Boolean(t.is_invited) || Boolean(t.title && t.title.toLowerCase().includes("job invitation"));
    if (filterType === "applied" && isRecruited) return false;
    if (filterType === "recruited" && !isRecruited) return false;

    if (isEmployer && selectedJobFilter !== "all") {
      const jobObj = employerJobs.find((j) => String(j.id) === selectedJobFilter);
      if (jobObj && t.title) {
        const match = t.title.toLowerCase().includes(jobObj.title.toLowerCase());
        if (!match) return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const name = (t.other_user_name || t.title || "").toLowerCase();
    const lastMsg = (t.last_message || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || lastMsg.includes(q);
  });

  return (
    <div className="messages-page appdash-page sidebar-visible">
      {isEmployer ? (
        <aside className="appdash-sidebar" aria-label="Employer Navigation">
          <a href="/" className="appdash-brand">
            <strong>EliteCruit</strong>
            <span>Employer Workspace</span>
          </a>

          <div className="employer-links-wrap">
            <ul className="appdash-secondary-list employer-main-links">
              <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
              <li><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
            </ul>

            <div className="appdash-menu-block employer-screening-block">
              <button className="appdash-menu-title employer-screening-title" type="button" onClick={() => setIsScreeningOpen((v) => !v)}>
                <span className="title-main">
                  <span className="item-icon"><EmployerIcon name="applicant" /></span>
                  <a href="/employer-applicant-management" onClick={(e) => e.stopPropagation()} className="sidebar-link-title">Applicant Management</a>
                </span>
                <span className={`title-caret ${isScreeningOpen ? "open" : "closed"}`}><ChevronIcon direction={isScreeningOpen ? "down" : "up"} /></span>
              </button>
              {isScreeningOpen && (
                <ul className="appdash-menu-list">
                  <li><a href="/employer-applicant-management#applicant-screening"><span className="item-icon"><EmployerIcon name="screening" /></span><span>Applicant Screening</span></a></li>
                  <li><a href="/employer-applicant-management#shortlisted-candidates"><span className="item-icon"><EmployerIcon name="shortlisted" /></span><span>Shortlisted Candidates</span></a></li>
                  <li><a href="/employer-applicant-management#direct-invitations"><span className="item-icon"><EmployerIcon name="discovery" /></span><span>Recruitment List</span></a></li>
                </ul>
              )}
            </div>

            <ul className="appdash-secondary-list">
              <li><a href="/employer-applicant-finder"><span className="item-icon"><EmployerIcon name="nearby" /></span><span>Applicant Finder</span></a></li>
              <li><a href="/employer-faq-management"><span className="item-icon"><EmployerIcon name="faq" /></span><span>FAQ Management</span></a></li>
              <li className="active"><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span></a></li>
              <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span><span className="item-badge">8</span></a></li>
              <li><a href="/feedback"><span className="item-icon"><EmployerIcon name="feedback" /></span><span>Feedback</span></a></li>
            </ul>
          </div>

          <div className="appdash-profile-control">
            <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)}>
              <span className="item-icon"><EmployerIcon name="profile" /></span>
              <span className="profile-user-copy"><strong>{companyLabel}</strong><small>Employer</small></span>
              <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
            </button>
            {isProfileMenuOpen && (
              <div className="appdash-profile-menu">
                <a href="/employer-company-profile"><EmployerIcon name="profile" />Company Profile</a>
                <a href="/"><EmployerIcon name="logout" />Logout</a>
              </div>
            )}
          </div>
        </aside>
      ) : (
        <aside className="appdash-sidebar" aria-label="Applicant Navigation">
          <a href="/" className="appdash-brand"><strong>EliteCruit</strong><span>Candidate Workspace</span></a>
          <div className="appdash-menu-block"><button className="appdash-menu-title workspace-route-title" type="button" onClick={() => setIsWorkspaceOpen((value) => !value)}><span className="title-main"><span className="item-icon"><SideIcon name="overview" /></span>Applicant Workspace</span><span className={`title-caret ${isWorkspaceOpen ? "open" : "closed"}`}><ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} /></span></button>{isWorkspaceOpen && <ul className="appdash-menu-list"><li><a href="/applicant-dashboard#section-overview"><span className="item-icon"><SideIcon name="overview" /></span>Overview</a></li><li><a href="/applicant-dashboard#section-smart-matches"><span className="item-icon"><SideIcon name="star" /></span>Smart Matches</a></li><li><a href="/applicant-dashboard#section-applications"><span className="item-icon"><SideIcon name="applications" /></span>My Applications</a></li><li><a href="/applicant-dashboard#section-invitations"><span className="item-icon"><SideIcon name="notifications" /></span>Job Invitations</a></li></ul>}</div>
          <ul className="appdash-secondary-list"><li><a href="/job-search"><span className="item-icon"><SideIcon name="search" /></span>Job Search</a></li><li><a href="/applicant-document-converter"><span className="item-icon"><SideIcon name="documents" /></span>Document Converter</a></li><li className="active"><a href="/messages"><span className="item-icon"><SideIcon name="messages" /></span>Messages</a></li><li><a href="/notifications"><span className="item-icon"><SideIcon name="notifications" /></span>Notifications<span className="item-badge">8</span></a></li><li><a href="/feedback"><span className="item-icon"><SideIcon name="feedback" /></span>Feedback</a></li></ul>
          <div className="appdash-profile-control"><button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)}><span className="item-icon"><SideIcon name="profile" /></span><span className="profile-user-copy"><strong>{applicantLabel}</strong><small>Applicant</small></span><ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} /></button>{isProfileMenuOpen && <div className="appdash-profile-menu"><a href="/my-profile"><SideIcon name="profile" />My Profile</a><a href="/"><SideIcon name="logout" />Logout</a></div>}</div>
        </aside>
      )}

      <main className="appdash-main messages-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Messages</strong></div></div>
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
                pageTitle="Messages"
                faqs={employerMessagesFaqs}
              />
            </div>
          </div>
        </header>

        <section className="messages-shell">
          <aside className="thread-list-panel">
            <div className="thread-list-header">
              {!isEmployer && (
                <>
                  <label className="job-opening-select-label">Filter</label>
                  <select
                    className="job-opening-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as "all" | "applied" | "recruited")}
                  >
                    <option value="all">All Messages</option>
                    <option value="applied">By Applied</option>
                    <option value="recruited">By Recruited</option>
                  </select>
                </>
              )}

              {isEmployer && (
                <>
                  <label className="job-opening-select-label">Job Opening</label>
                  <select
                    className="job-opening-select"
                    value={selectedJobFilter}
                    onChange={(e) => setSelectedJobFilter(e.target.value)}
                  >
                    <option value="all">All Job Openings</option>
                    {employerJobs.map((job) => (
                      <option key={job.id} value={String(job.id)}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <input
              className="thread-search"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="thread-list">
              {isLoadingThreads ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                  Loading conversations...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                  No conversations found.
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const displayName = thread.other_user_name || thread.title || "Conversation";
                  const isSelected = selectedThread?.id === thread.id;
                  const isRecruited = Boolean(thread.is_invited) || Boolean(thread.title?.toLowerCase().includes("job invitation"));
                  return (
                    <article
                      key={thread.id}
                      className={`thread-row ${isSelected ? "active" : ""}`}
                      onClick={() => setSelectedThread(thread)}
                    >
                      <span className="avatar-dot">{initialsFromName(displayName)}</span>
                      <div className="thread-copy">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                          <strong style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</strong>
                          {isRecruited ? (
                            <span className="thread-invited-badge">Recruited</span>
                          ) : (
                            <span className="thread-applied-badge">Applied</span>
                          )}
                        </div>
                        <p>{thread.last_message || "No messages yet"}</p>
                        <small>{thread.last_message_time ? new Date(thread.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recent"}</small>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </aside>

          <section className="chat-panel">
            {selectedThread ? (
              <>
                <header className="chat-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <span className="avatar-dot">{initialsFromName(selectedThread.other_user_name || selectedThread.title)}</span>
                    <div style={{ minWidth: 0 }}>
                      <strong>{selectedThread.other_user_name || selectedThread.title || (isEmployer ? "Applicant" : "Employer")}</strong>
                      <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "0.82rem" }}>
                        {selectedThread.other_user_email || "No email"}
                        {selectedThread.other_user_phone ? ` · ${selectedThread.other_user_phone}` : ""}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    {(() => {
                      if (isEmployer) {
                        const status = (selectedThread.invitation_status || "").toLowerCase();
                        let label = "Pending";
                        let className = "pending";
                        if (status === "accepted") {
                          label = "Accepted";
                          className = "accepted";
                        } else if (status === "declined") {
                          label = "Declined";
                          className = "declined";
                        } else if (status === "pending" || Boolean(selectedThread.is_invited) || selectedThread.title?.toLowerCase().includes("job invitation")) {
                          label = "Pending";
                          className = "pending";
                        } else {
                          return null;
                        }

                        return (
                          <span className={`invitation-status-pill ${className}`}>
                            {label}
                          </span>
                        );
                      } else {
                        const isInvitedThread = Boolean(selectedThread.is_invited) || selectedThread.title?.toLowerCase().includes("job invitation") || Boolean(selectedThread.invitation_status);
                        if (!isInvitedThread) return null;

                        const status = (selectedThread.invitation_status || "pending").toLowerCase();
                        if (status === "accepted") {
                          return <span className="invitation-status-pill accepted">Accepted</span>;
                        }
                        if (status === "declined") {
                          return <span className="invitation-status-pill declined">Declined</span>;
                        }
                        return (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              className="chat-header-accept-btn"
                              onClick={() => handleRespondInvitationFromChat("accept")}
                              disabled={isRespondingInvitation}
                            >
                              {isRespondingInvitation ? "..." : "Accept"}
                            </button>
                            <button
                              type="button"
                              className="chat-header-decline-btn"
                              onClick={() => handleRespondInvitationFromChat("decline")}
                              disabled={isRespondingInvitation}
                            >
                              {isRespondingInvitation ? "..." : "Decline"}
                            </button>
                          </div>
                        );
                      }
                    })()}

                    {selectedThread.other_user_id && (
                      <button
                        type="button"
                        className="chat-details-btn"
                        onClick={() =>
                          isEmployer
                            ? handleOpenDetails(
                                selectedThread.other_user_id!,
                                selectedThread.other_user_name || "Applicant",
                                selectedThread.other_user_email,
                                selectedThread.other_user_phone
                              )
                            : handleOpenJobDetailsForApplicant(selectedThread)
                        }
                        disabled={isLoadingDetails}
                      >
                        {isLoadingDetails ? "Loading..." : "Details"}
                      </button>
                    )}
                  </div>
                </header>

                <div className="chat-body">
                  {messages.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>No messages yet in this conversation.</p>
                      <small>Send a message below to get started.</small>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_user_id === currentUserId;
                      return (
                        <article key={msg.id} className={`chat-bubble ${isMe ? "outgoing" : "incoming"}`}>
                          <small>{isMe ? "You" : selectedThread.other_user_name || "Sender"}</small>
                          <p>{msg.message_text}</p>
                          <time>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</time>
                        </article>
                      );
                    })
                  )}
                </div>

                <form className="chat-compose" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    disabled={isSending}
                  />
                  <button type="submit" className="send-btn" disabled={!composeText.trim() || isSending}>
                    {isSending ? "Sending..." : "Send"}
                  </button>
                </form>
              </>
            ) : (
              <div className="chat-empty">
                <p>Select a conversation to start chatting</p>
              </div>
            )}
          </section>
        </section>
      </main>

      {/* Candidate Profile Details Modal (Employer View) */}
      {selectedCandidateDetails && (
        <div className="jd-overlay" role="dialog" aria-modal="true" aria-label="Candidate Details" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCandidateDetails(null); }}>
          <div className="jd-panel" onClick={(e) => e.stopPropagation()}>
            <div className="jd-employer-strip" style={{ paddingTop: "20px" }}>
              <div className="jd-employer-logo-info">
                <div className="jd-employer-logo" aria-label="Candidate initials">
                  <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "1.05rem" }}>
                    {initialsFromName(selectedCandidateDetails.applicant_name)}
                  </span>
                </div>
                <div>
                  <strong className="jd-employer-name">{selectedCandidateDetails.applicant_name}</strong>
                  <span className="jd-employer-location" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "3px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      {selectedCandidateDetails.city || "Cavite"}
                    </span>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      {selectedCandidateDetails.email || "No email"}
                    </span>
                    {selectedCandidateDetails.phone && (
                      <>
                        <span style={{ color: "#cbd5e1" }}>•</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {selectedCandidateDetails.phone}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </div>
              <div className="jd-header-right-actions">
                <div className="rating-score-box" title="Rating">
                  <span className="star-icon">★</span>
                  <span>{selectedCandidateDetails.rating ? Number(selectedCandidateDetails.rating).toFixed(1) : "0.0"}</span>
                </div>
                <button
                  type="button"
                  className={`jd-faq-btn ${isPreviewingDoc ? "active" : ""}`}
                  onClick={() => setIsPreviewingDoc((prev) => !prev)}
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
                      <h2 className="jd-title-h2">{selectedCandidateDetails.desired_job_title || "IT Support Specialist"}</h2>
                    </div>
                  </div>
                  <div className="jd-chips-inline">
                    <span className="setup-pill">{selectedCandidateDetails.work_arrangement || "On-Site"}</span>
                    <span className="salary-pill">
                      {(() => {
                        const sal = selectedCandidateDetails.expected_salary || "PHP 20,000";
                        return sal.toUpperCase().includes("PHP") ? sal : `PHP ${sal}`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* SKILLS */}
                <div className="jd-section">
                  <h3>SKILLS</h3>
                  <div className="jd-tags-wrap">
                    {parseItemList(selectedCandidateDetails.skills, ["General Skills", "Communication", "Problem Solving"]).map((s, idx) => (
                      <span key={idx} className="js-tag-chip js-tag-skill">{s}</span>
                    ))}
                  </div>
                </div>

                {/* QUALIFICATIONS */}
                <div className="jd-section">
                  <h3>QUALIFICATIONS</h3>
                  <div className="jd-tags-wrap">
                    {parseItemList(selectedCandidateDetails.qualifications, ["College Graduate / Related Experience"]).map((q, idx) => (
                      <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                    ))}
                  </div>
                </div>

                {/* CERTIFICATIONS */}
                <div className="jd-section">
                  <h3>CERTIFICATIONS</h3>
                  <div className="jd-tags-wrap">
                    {parseItemList(selectedCandidateDetails.certifications).length === 0 ? (
                      <span className="js-tag-chip js-tag-certification">None listed</span>
                    ) : (
                      parseItemList(selectedCandidateDetails.certifications).map((c, idx) => (
                        <span key={idx} className="js-tag-chip js-tag-certification">{c}</span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* DOCS DRAWER */}
              {isPreviewingDoc && (
                <div className="jd-faq-drawer">
                  <div className="jd-faq-head">
                    <h3>Resume & Documents</h3>
                    <button type="button" className="jd-faq-back-btn" onClick={() => setIsPreviewingDoc(false)}>✕</button>
                  </div>
                  <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", background: "#f8fafc" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          📄
                        </div>
                        <div>
                          <strong style={{ display: "block", fontSize: "0.9rem", color: "#0f172a" }}>
                            {selectedCandidateDetails.resume_path || `${selectedCandidateDetails.applicant_name.replace(/\s+/g, "_")}_Resume.pdf`}
                          </strong>
                          <small style={{ color: "#64748b" }}>Primary Resume / CV</small>
                        </div>
                      </div>
                      <a
                        href={`/api/applicants/${selectedCandidateDetails.user_id}/resume?download=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.85rem", padding: "8px 14px", textDecoration: "none", background: "#01294a", color: "#fff", borderRadius: "6px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        Download
                      </a>
                    </div>
                    <div style={{ flex: 1, minHeight: "380px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1", background: "#ffffff" }}>
                      <iframe
                        src={`/api/applicants/${selectedCandidateDetails.user_id}/resume`}
                        style={{ width: "100%", height: "100%", minHeight: "380px", border: "none" }}
                        title={`${selectedCandidateDetails.applicant_name} Resume`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="jd-panel-footer" style={{ justifyContent: "flex-end" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button type="button" className="jd-cancel-btn" onClick={() => setSelectedCandidateDetails(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal (Applicant View) */}
      {detailsJob && (
        <div className="jd-overlay" role="dialog" aria-modal="true" aria-label="Job Details" onClick={(e) => { if (e.target === e.currentTarget) setDetailsJob(null); }}>
          <div className="jd-panel">
            {/* Cover banner */}
            <div className="jd-cover-banner">
              <div className="jd-cover-placeholder">
                <span>Cover photo</span>
              </div>
              <div className="jd-employer-strip">
                <div className="jd-employer-logo-info">
                  <div className="jd-employer-logo" aria-label="Company logo">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" /></svg>
                  </div>
                  <div>
                    <strong className="jd-employer-name">{detailsJob.company}</strong>
                    <span className="jd-employer-location">
                      <svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12" fill="none" stroke="#5b8ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {detailsJob.location}
                    </span>
                  </div>
                </div>
                <div className="jd-header-right-actions">
                  <div className="rating-score-box" title="Company rating">
                    <span className="star-icon">★</span>
                    <span>{detailsJob.rating ? Number(detailsJob.rating).toFixed(1) : "0.0"}</span>
                  </div>
                  <div className="match-score-box match-low" title="Job match score">
                    <small>MATCH</small>
                    <b>{detailsJob.matchScore || 35}%</b>
                  </div>
                  <button
                    type="button"
                    className={`jd-faq-btn ${isFaqDrawerOpen ? "active" : ""}`}
                    onClick={() => {
                      if (isFaqDrawerOpen) {
                        setIsFaqDrawerOpen(false);
                      } else {
                        handleOpenFaqs(detailsJob);
                      }
                    }}
                  >
                    FAQ's
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable body & drawer container */}
            <div className="jd-body-wrapper">
              <div className="jd-body">
                {/* Title row */}
                <div className="jd-top-section">
                  <div className="jd-title-row">
                    <h2 className="jd-title-h2">{detailsJob.title}</h2>
                  </div>
                  <div className="jd-chips-inline">
                    <span className={`status-chip ${detailsJob.status === "open" ? "open" : "closed"}`}>{detailsJob.status === "open" ? "Open" : "Closed"}</span>
                    {detailsJob.urgent && <span className="status-chip urgent">Urgent</span>}
                    <span className="setup-pill">{detailsJob.setup}</span>
                    <span className="salary-pill">{detailsJob.salary}</span>
                  </div>
                </div>

                <div className="jd-section">
                  <h3>Job Description</h3>
                  <p>{detailsJob.summary || "No description provided."}</p>
                </div>

                {detailsJob.skillTags.length > 0 && (
                  <div className="jd-section">
                    <h3>Required Skills</h3>
                    <div className="jd-tags-wrap">
                      {detailsJob.skillTags.map((s) => (
                        <span className="js-tag-chip js-tag-skill" key={s}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {detailsJob.qualTags.length > 0 && (
                  <div className="jd-section">
                    <h3>Required Qualifications</h3>
                    <div className="jd-tags-wrap">
                      {detailsJob.qualTags.map((q) => (
                        <span className="js-tag-chip js-tag-qualification" key={q}>{q}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Slide-in FAQ Drawer */}
              <div className={`jd-faq-drawer ${isFaqDrawerOpen ? "open" : ""}`}>
                <div className="jd-faq-header">
                  <h3>Company FAQ's</h3>
                  <button type="button" className="jd-faq-back-btn" aria-label="Back to job details" onClick={() => setIsFaqDrawerOpen(false)}>
                    ←
                  </button>
                </div>
                <div className="jd-faq-body">
                  {faqLoading ? (
                    <p className="jd-faq-loading">Loading FAQ's...</p>
                  ) : companyFaqs.length === 0 ? (
                    <p className="jd-faq-empty">No FAQ's created by this company yet.</p>
                  ) : (
                    companyFaqs.map((faq) => {
                      const isExpanded = expandedFaqIds.includes(faq.id);
                      return (
                        <div key={faq.id} className={`jd-faq-item ${isExpanded ? "expanded" : ""}`}>
                          <button
                            type="button"
                            className="jd-faq-question-btn"
                            onClick={() => {
                              setExpandedFaqIds((prev) =>
                                prev.includes(faq.id) ? prev.filter((id) => id !== faq.id) : [...prev, faq.id]
                              );
                            }}
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

            <div className="jd-panel-footer">
              <div className="jd-footer-meta">
                <span><strong>Applications:</strong> {detailsJob.applicantCount} / {detailsJob.applicationLimit}</span>
                <span><strong>Close Date:</strong> {detailsJob.closeDate}</span>
              </div>
              <div className="jd-footer-actions">
                <button type="button" className="jd-cancel-btn" onClick={() => { setDetailsJob(null); setIsFaqDrawerOpen(false); }}>Close</button>
                {invitationStatus === "accepted" ? (
                  <button type="button" className="solid-btn applied-btn" disabled>
                    Accepted
                  </button>
                ) : invitationStatus === "declined" ? (
                  <button type="button" className="solid-btn" style={{ background: "#ef4444", color: "#fff", cursor: "not-allowed", border: "none" }} disabled>
                    Declined
                  </button>
                ) : invitationStatus === "pending" || Boolean(selectedThread?.is_invited) || selectedThread?.title?.toLowerCase().includes("job invitation") ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="solid-btn"
                      style={{ background: "#fff", border: "1px solid #ef4444", color: "#ef4444", fontWeight: 700 }}
                      onClick={() => handleRespondInvitation("decline")}
                      disabled={isRespondingInvitation}
                    >
                      {isRespondingInvitation ? "..." : "Decline"}
                    </button>
                    <button
                      type="button"
                      className="solid-btn applied-btn"
                      onClick={() => handleRespondInvitation("accept")}
                      disabled={isRespondingInvitation}
                    >
                      {isRespondingInvitation ? "Processing..." : "Accept Invitation"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`solid-btn ${appliedJobIds.includes(detailsJob.id) ? "applied-btn" : ""}`}
                    onClick={() => applyToJob(detailsJob.id)}
                    disabled={appliedJobIds.includes(detailsJob.id) || applyingJobId === detailsJob.id}
                  >
                    {appliedJobIds.includes(detailsJob.id) ? "Applied" : applyingJobId === detailsJob.id ? "Applying..." : "Apply Now"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
