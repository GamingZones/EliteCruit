import React, { useEffect, useMemo, useRef, useState } from "react";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import ApplicantDecisionModal from "../../components/ApplicantDecisionModal";
import {
  calculateJobMatch,
  calculateJobMatchDetails,
  getMatchColorClass,
  inferMatchScore,
  parseCompetencyDisplayTags,
  formatExperienceLevel,
  formatLocationWithCavite,
  parseLocations,
} from "../../utils/filters";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import { JobDetailsModal, EmployerDetailsModal, type JobModalData } from "../../components/modals";
import "./Applicant-Dashboard.css";
import { SideIcon, ChevronIcon, type SideNavItem } from "../../components/Icons";


type StatCard = {
  label: string;
  value: string;
  hint: string;
  icon: SideNavItem["icon"];
};

type JobCard = {
  id: number;
  title: string;
  company: string;
  location: string;
  summary: string;
  salary: string;
  salaryMin: number;
  setup: string;
  experienceLevel?: string | null;
  status: "open" | "closed";
  closeDate: string;
  applicationLimit: number;
  applicantCount: number;
  qualifications: string;
  certifications?: string;
  responsibilities: string;
  skillTags: string[];
  qualTags: string[];
  certTags: string[];
  jobType: string;
  functionGroup: string;
  distance: string;
  badges: string[];
  urgent: boolean;
  matchScore?: number;
  matchBreakdown?: string;
  matchColor?: "red" | "orange" | "green";
  createdAt?: string | null;
  createdRank?: number;
  employerUserId?: number;
  companyLogoPath?: string | null;
  companyCoverPath?: string | null;
  rating?: string;
};

type ApplicantMatchProfile = {
  desiredJobTitle?: string;
  workArrangement?: string;
  expectedSalary?: number | null;
  city?: string;
  skills?: string[];
  qualifications?: string[];
  certifications?: string[];
  rawSkills?: string;
  rawCertifications?: string;
};

type JobInvitationItem = {
  id: number;
  job_post_id: number;
  employer_user_id: number;
  status: string;
  custom_message?: string;
  created_at: string;
  updated_at: string;
  job_title: string;
  job_location?: string;
  salary_min?: number;
  salary_max?: number;
  hide_salary?: number | boolean | null;
  work_arrangement?: string;
  job_description?: string;
  required_skills?: string;
  job_qualifications?: string;
  close_date?: string;
  application_limit?: number;
  job_status?: string;
  business_name?: string;
  contact_number?: string;
  company_address?: string;
  industry?: string;
  employer_email?: string;
};

const baseStatCards: StatCard[] = [
  { label: "My Applications", value: "0", hint: "Active submissions", icon: "applications" },
  { label: "Direct Invitations", value: "0", hint: "Employer invites", icon: "notifications" },
  { label: "Smart Matches", value: "0", hint: "High compatibility", icon: "search" },
  { label: "Saved Jobs", value: "0", hint: "Bookmarked openings", icon: "star" },
];

const navWorkspace: SideNavItem[] = [
  { label: "Overview", icon: "overview", sectionId: "section-overview" },
  { label: "Smart Matches", icon: "star", sectionId: "section-smart-matches" },
  { label: "My Applications", icon: "applications", sectionId: "section-applications" },
  { label: "Job Invitations", icon: "notifications", sectionId: "section-invitations" },
];

const navGeneral: SideNavItem[] = [
  { label: "Job Search", icon: "search", href: "/job-search" },
  { label: "Offer Letters", icon: "documents", href: "/applicant-offer-letter" },
  { label: "Messages", icon: "messages", href: "/messages" },
  { label: "Notifications", icon: "notifications", href: "/notifications" },
  { label: "Feedback", icon: "feedback", href: "/feedback" },
];

function RenderTagChips({
  items,
  type,
  maxVisible = 1,
}: {
  items: string[];
  type: "skill" | "qualification" | "certification";
  maxVisible?: number;
}) {
  if (!items || items.length === 0) return null;
  const firstIsTooLong = Boolean(items[0] && items[0].length > 15);
  const visible = firstIsTooLong ? [] : items.slice(0, maxVisible);
  const hidden = firstIsTooLong ? items : items.slice(maxVisible);
  const fullListText = items.join(", ");
  const typeLabel =
    type === "skill" ? "SKILLS:" : type === "qualification" ? "QUALIFICATIONS:" : "CERTIFICATIONS:";

  return (
    <span className="js-chips-wrap">
      {visible.map((item) => (
        <span className={`js-tag-chip js-tag-${type}`} key={item}>
          {item}
        </span>
      ))}
      {hidden.length > 0 && (
        <span className="js-overflow-dots" tabIndex={0}>
          ...
          <span className="js-overflow-tip">
            <strong>{typeLabel}</strong>
            <span>{fullListText}</span>
          </span>
        </span>
      )}
    </span>
  );
}

function MiniIcon({ name }: { name: "company" | "location" | "bookmark" | "bookmarkFilled" }) {
  const icons: Record<"company" | "location" | "bookmark" | "bookmarkFilled", JSX.Element> = {
    company: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />,
    location: <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />,
    bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />,
    bookmarkFilled: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" fill="currentColor" />,
  };

  return (
    <svg className={`mini-icon-svg ${name === "bookmarkFilled" ? "filled" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function RenderLocationMeta({ location }: { location?: string | null }) {
  const locItems = parseLocations(location);

  if (locItems.length === 0) {
    return (
      <span className="location-meta">
        <MiniIcon name="location" />
        <span>Location not set</span>
      </span>
    );
  }

  if (locItems.length === 1) {
    return (
      <span className="location-meta">
        <MiniIcon name="location" />
        <span>{locItems[0]}</span>
      </span>
    );
  }

  const fullListText = locItems.join(", ");

  return (
    <span className="location-meta">
      <MiniIcon name="location" />
      <span>{locItems[0]}</span>
      <span className="overflow-dots-badge" tabIndex={0} aria-label="View all locations">
        ...
        <span className="overflow-tooltip">
          <strong>Locations:</strong>
          <span>{fullListText}</span>
        </span>
      </span>
    </span>
  );
}

function parseSkills(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function shortenText(raw: string | null | undefined, fallback: string, limit = 84) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return fallback;
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function formatSalaryRange(minSalary: number | null, maxSalary: number | null, hideSalary?: boolean | number | null) {
  if (hideSalary) return "Salary Confidential";
  const min = Number.isFinite(Number(minSalary)) ? Number(minSalary).toLocaleString("en-US") : "0";
  const max = Number.isFinite(Number(maxSalary)) ? Number(maxSalary).toLocaleString("en-US") : "0";
  return `PHP ${min} - ${max}`;
}

function parseExpectedSalary(raw: string | null | undefined) {
  if (!raw) return 0;
  const amount = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}


function statusChipBadgeClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "shortlisted") return "chip-shortlisted";
  if (s === "approved" || s === "accepted") return "chip-approved";
  if (s === "denied" || s === "rejected") return "chip-denied";
  return "chip-pending";
}

function statusChipClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "shortlisted") return "match-chip chip-amber";
  if (s === "approved" || s === "accepted") return "match-chip chip-green";
  if (s === "denied" || s === "rejected") return "match-chip chip-amber";
  return "match-chip chip-green";
}

function formatStatusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "shortlisted") return "Shortlisted";
  if (s === "approved" || s === "accepted") return "Approved";
  if (s === "denied" || s === "rejected") return "Denied";
  return "Pending";
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export { SideIcon, ChevronIcon } from "../../components/Icons";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

function getInitialApplicantName() {
  if (typeof window === "undefined") return "Applicant";
  const raw = localStorage.getItem("elitecruit-user");
  if (!raw) return "Applicant";
  try {
    const u = JSON.parse(raw);
    if (u.full_name) return u.full_name;
    const full = [u.first_name || u.firstName, u.last_name || u.lastName].filter(Boolean).join(" ").trim();
    if (full) return full;
    return u.email || "Applicant";
  } catch {
    return "Applicant";
  }
}

const WORKSPACE_TABS = [
  { id: "section-smart-matches", label: "Smart Matches" },
  { id: "section-applications", label: "My Applications" },
  { id: "section-invitations", label: "Job Invitations" },
] as const;

export default function ApplicantDashboard() {
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return false;
    }
    return true;
  });
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const h = window.location.hash.replace("#", "");
      if (["section-smart-matches", "section-applications", "section-invitations"].includes(h)) {
        return h;
      }
    }
    return "section-smart-matches";
  });
  const [applicantLabel, setApplicantLabel] = useState(getInitialApplicantName);
  const [myApplicationsList, setMyApplicationsList] = useState<any[]>([]);
  const [invitationsList, setInvitationsList] = useState<JobInvitationItem[]>([]);
  const [invitationFilter, setInvitationFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");
  const [isRespondingInvId, setIsRespondingInvId] = useState<number | null>(null);

  // Real job search state & details modal for Smart Matches
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [applicantUserId, setApplicantUserId] = useState<number | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [detailsJob, setDetailsJob] = useState<JobCard | null>(null);
  const [applicantMatchProfile, setApplicantMatchProfile] = useState<ApplicantMatchProfile | null>(null);
  const [selectedEmployerDetails, setSelectedEmployerDetails] = useState<any>(null);

  const handleOpenEmployerDetails = async (empUserId: number | string) => {
    try {
      const res = await fetch(`/api/employers/${empUserId}/profile`);
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          setSelectedEmployerDetails({
            ...data.profile,
            employer_user_id: empUserId,
            company_name: data.profile.business_name || data.profile.company_name,
            company_description: data.profile.company_description || data.profile.description,
            contact_number: data.profile.contact_number || data.profile.phone,
            business_email: data.profile.business_email || data.profile.email,
            company_address: data.profile.company_address || data.profile.location,
            rating: data.profile.rating || detailsJob?.rating,
          });
          return;
        }
      }
    } catch {}

    if (detailsJob) {
      setSelectedEmployerDetails({
        employer_user_id: empUserId,
        company_name: detailsJob.company || "Employer",
        business_name: detailsJob.company || "Employer",
        company_description: detailsJob.summary || "Employer organization description.",
        company_address: detailsJob.location || "Cavite",
        address: detailsJob.location || "Cavite",
        rating: detailsJob.rating || "0.0",
        company_logo_path: detailsJob.companyLogoPath || null,
        company_cover_path: detailsJob.companyCoverPath || null,
      });
    }
  };

  const jobModalData: JobModalData | null = useMemo(() => {
    if (!detailsJob) return null;
    return {
      id: detailsJob.id,
      title: detailsJob.title,
      job_title: detailsJob.title,
      company: detailsJob.company,
      company_name: detailsJob.company,
      employerUserId: detailsJob.employerUserId,
      employer_user_id: detailsJob.employerUserId,
      companyLogoPath: detailsJob.companyLogoPath,
      company_logo_path: detailsJob.companyLogoPath,
      companyCoverPath: detailsJob.companyCoverPath,
      company_cover_path: detailsJob.companyCoverPath,
      location: detailsJob.location,
      company_address: detailsJob.location,
      rating: detailsJob.rating,
      status: detailsJob.status,
      urgent: detailsJob.urgent,
      is_urgent: detailsJob.urgent,
      setup: detailsJob.setup,
      work_arrangement: detailsJob.setup,
      experienceLevel: detailsJob.experienceLevel,
      experience_level: detailsJob.experienceLevel,
      salary: detailsJob.salary,
      salary_min: detailsJob.salaryMin,
      hide_salary: (detailsJob as any).hideSalary || (detailsJob as any).hide_salary,
      summary: detailsJob.summary,
      description: detailsJob.summary || detailsJob.responsibilities,
      skillTags: detailsJob.skillTags,
      qualTags: detailsJob.qualTags,
      certTags: detailsJob.certTags,
      applicantCount: detailsJob.applicantCount,
      closeDate: detailsJob.closeDate,
      close_date: detailsJob.closeDate,
      applicationLimit: detailsJob.applicationLimit,
    };
  }, [detailsJob]);

  // DOUBLE VERIFICATION MODAL STATES
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [decisionModalTarget, setDecisionModalTarget] = useState<{
    inv: JobInvitationItem;
    action: "accept" | "decline";
  } | null>(null);
  const [applyJobTarget, setApplyJobTarget] = useState<{ jobId: number; title: string } | null>(null);

  const handleConfirmApply = async () => {
    if (!applyJobTarget) return;
    const targetId = applyJobTarget.jobId;
    setApplyJobTarget(null);
    await applyToJob(targetId);
  };

  const mainRef = useRef<HTMLElement | null>(null);

  const navItemsWithSection = useMemo(
    () => [...navWorkspace, ...navGeneral].filter((item): item is SideNavItem & { sectionId: string } => Boolean(item.sectionId)),
    []
  );

  const scrollToHashSection = () => {
    const hash = window.location.hash;
    if (!hash) {
      setActiveSection("section-smart-matches");
      return;
    }
    const sectionId = hash.replace("#", "");
    if (sectionId === "applicant-overview" || sectionId === "section-overview" || sectionId === "section-smart-matches") {
      setActiveSection("section-smart-matches");
      if (mainRef.current) mainRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    if (["section-applications", "section-invitations"].includes(sectionId)) {
      setActiveSection(sectionId);
      if (mainRef.current) mainRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "auto", block: "start" });
    setActiveSection(sectionId);
  };

  useEffect(() => {
    const applyHashScroll = () => {
      requestAnimationFrame(scrollToHashSection);
    };
    applyHashScroll();
    window.addEventListener("hashchange", applyHashScroll);
    return () => window.removeEventListener("hashchange", applyHashScroll);
  }, []);

  useEffect(() => {
    const sectionIds = ["section-overview", "section-smart-matches", "section-applications", "section-invitations"];
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "-20% 0px -50% 0px",
      threshold: 0.1,
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setApplicantLabel("Applicant");
      return;
    }

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

      const first = savedUser.first_name || savedUser.firstName || "";
      const last = savedUser.last_name || savedUser.lastName || "";
      const fallbackName = `${first} ${last}`.trim() || savedUser.email || "Applicant";
      setApplicantLabel(fallbackName);

      if (savedUser.role !== "applicant" || !savedUser.id) return;
      setApplicantUserId(savedUser.id);

      fetch(`/api/applicants/${savedUser.id}/applications`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data?.message || "Unable to load applications.");
          const total = Number(data?.stats?.total || 0);
          const underReview = Number(data?.stats?.underReview || 0);
          const shortlisted = Number(data?.stats?.shortlisted || 0);
          setMyApplicationsList(Array.isArray(data?.applications) ? data.applications : []);

          const ids = Array.isArray(data?.applications)
            ? data.applications
                .map((item: any) => Number(item?.job_post_id))
                .filter((id: number) => Number.isInteger(id) && id > 0)
            : [];
          setAppliedJobIds(ids);
        })
        .catch(() => {});

      fetch(`/api/applicants/${savedUser.id}/invitations`)
        .then((res) => res.json())
        .then((data) => {
          setInvitationsList(Array.isArray(data?.invitations) ? data.invitations : []);
        })
        .catch(() => {});

      fetch(`/api/applicants/${savedUser.id}/profile`)
        .then((response) => response.json())
        .then((data) => {
          const profile = data?.profile;
          const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(" ");
          if (fullName) {
            setApplicantLabel(fullName);
            try {
              const updated = {
                ...savedUser,
                first_name: profile?.first_name || "",
                last_name: profile?.last_name || "",
                full_name: fullName,
              };
              localStorage.setItem("elitecruit-user", JSON.stringify(updated));
            } catch {}
          }

          setApplicantMatchProfile({
            desiredJobTitle: profile?.desired_job_title || "",
            workArrangement: profile?.work_arrangement || "",
            expectedSalary: parseExpectedSalary(profile?.expected_salary),
            city: profile?.city || "",
            skills: parseCompetencyDisplayTags(profile?.skills),
            qualifications: parseCompetencyDisplayTags(profile?.qualifications),
            certifications: parseCompetencyDisplayTags(profile?.certifications),
            rawSkills: typeof profile?.skills === "string" ? profile?.skills : JSON.stringify(profile?.skills || []),
            rawCertifications: typeof profile?.certifications === "string" ? profile?.certifications : JSON.stringify(profile?.certifications || []),
          });
        })
        .catch(() => {});
    } catch {
      setApplicantLabel("Applicant");
    }
  }, []);

  const handleRespondInvitation = async (
    invitationId: number,
    action: "accept" | "decline",
    letter_text?: string,
    letter_type?: string,
    start_date?: string
  ) => {
    setIsRespondingInvId(invitationId);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, letter_text, letter_type, start_date }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvitationsList((prev) =>
          prev.map((inv) => (inv.id === invitationId ? { ...inv, status: data.status } : inv))
        );
        if (action === "accept" && applicantUserId) {
          fetch(`/api/applicants/${applicantUserId}/applications`)
            .then((r) => r.json())
            .then((d) => {
              setMyApplicationsList(Array.isArray(d?.applications) ? d.applications : []);
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error("Error responding to invitation:", err);
    } finally {
      setIsRespondingInvId(null);
    }
  };

  const handleReviewInvitation = (inv: JobInvitationItem) => {
    const jobObj: JobCard = {
      id: Number(inv.job_post_id),
      title: inv.job_title || "Invited Role",
      company: inv.business_name || "Employer",
      location: inv.job_location || "Cavite",
      summary: inv.job_description || "No job description provided yet.",
      salary: formatSalaryRange(inv.salary_min ?? null, inv.salary_max ?? null, inv.hide_salary),
      salaryMin: Number(inv.salary_min) || 0,
      setup: inv.work_arrangement || "On-Site",
      status: inv.job_status === "closed" ? "closed" : "open",
      closeDate: inv.close_date || "-",
      applicationLimit: Number(inv.application_limit) || 10,
      applicantCount: 1,
      qualifications: inv.job_qualifications || "Not provided",
      responsibilities: "Not provided",
      skillTags: parseCompetencyDisplayTags(inv.required_skills),
      qualTags: parseCompetencyDisplayTags(inv.job_qualifications),
      certTags: parseCompetencyDisplayTags((inv as any).certifications),
      jobType: inv.work_arrangement === "Remote" ? "Remote" : "Full-time",
      functionGroup: "General",
      distance: "Cavite",
      badges: parseCompetencyDisplayTags(inv.required_skills),
      urgent: false,
      createdAt: inv.created_at,
      createdRank: 0,
      employerUserId: Number(inv.employer_user_id) || undefined,
      companyLogoPath: (inv as any).company_logo_path || null,
      companyCoverPath: (inv as any).company_cover_path || null,
      rating: (inv as any).rating ? String((inv as any).rating) : "0.0",
    };
    setDetailsJob(jobObj);
  };

  useEffect(() => {
    const savedBookmarks = localStorage.getItem("elitecruit-bookmarked-jobs");
    if (!savedBookmarks) return;
    try {
      const parsed = JSON.parse(savedBookmarks);
      if (Array.isArray(parsed)) {
        setBookmarkedIds(parsed.filter((id) => Number.isInteger(id)));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/job-posts")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Unable to load job postings.");
        const rows = Array.isArray(data?.jobPosts) ? data.jobPosts : [];
        const mapped: JobCard[] = rows.map((row: any, index: number) => ({
          id: Number(row.id),
          title: row.title || "Untitled Job",
          company: row.company_name || "Employer",
          location: formatLocationWithCavite(row.location || row.company_address),
          summary: row.description || "No job description provided yet.",
          salary: formatSalaryRange(row.salary_min ?? null, row.salary_max ?? null, row.hide_salary),
          salaryMin: Number.isFinite(Number(row.salary_min)) ? Number(row.salary_min) : 0,
          setup: row.work_arrangement || "Flexible",
          experienceLevel: row.experience_level || null,
          status: row.status === "closed" ? "closed" : "open",
          closeDate: row.close_date || "-",
          applicationLimit: Number.isFinite(Number(row.application_limit)) ? Number(row.application_limit) : 0,
          applicantCount: Number.isFinite(Number(row.applicant_count)) ? Number(row.applicant_count) : 0,
          qualifications: row.qualifications || "Not provided",
          certifications: row.certifications || "Not provided",
          responsibilities: row.responsibilities || "Not provided",
          skillTags: parseCompetencyDisplayTags(row.required_skills),
          qualTags: parseCompetencyDisplayTags(row.qualifications),
          certTags: parseCompetencyDisplayTags(row.certifications),
          jobType: row.work_arrangement === "Remote" ? "Remote" : "Full-time",
          functionGroup: "General",
          distance: "Cavite",
          badges: parseCompetencyDisplayTags(row.required_skills),
          urgent: Boolean(Number(row.is_urgent || 0)),
          createdAt: typeof row.created_at === "string" ? row.created_at : null,
          createdRank: index,
          employerUserId: Number(row.employer_user_id) || undefined,
          companyLogoPath: row.company_logo_path || null,
          companyCoverPath: row.company_cover_path || null,
          rating: row.rating ? String(row.rating) : "0.0",
        }));
        setJobs(mapped);
      })
      .catch(() => setJobs([]));
  }, []);

  const sortedSmartMatches = useMemo(() => {
    const unappliedJobs = jobs.filter((job) => !appliedJobIds.includes(job.id));
    return [...unappliedJobs].sort((a, b) => calculateJobMatch(b, applicantMatchProfile) - calculateJobMatch(a, applicantMatchProfile));
  }, [jobs, appliedJobIds, applicantMatchProfile]);

  const dashboardStats: StatCard[] = useMemo(() => [
    {
      label: "My Applications",
      value: String(myApplicationsList.length),
      hint: "Active submissions",
      icon: "applications",
    },
    {
      label: "Direct Invitations",
      value: String(invitationsList.length),
      hint: "Employer invites",
      icon: "notifications",
    },
    {
      label: "Smart Matches",
      value: String(sortedSmartMatches.length),
      hint: "High compatibility",
      icon: "search",
    },
    {
      label: "Saved Jobs",
      value: String(bookmarkedIds.length),
      hint: "Bookmarked openings",
      icon: "star",
    },
  ], [myApplicationsList.length, invitationsList.length, sortedSmartMatches.length, bookmarkedIds.length]);

  const applyToJob = async (jobId: number) => {
    if (!applicantUserId) {
      alert("Sign in as applicant to apply for jobs.");
      return;
    }
    if (appliedJobIds.includes(jobId)) return;

    setApplyingJobId(jobId);
    try {
      const response = await fetch(`/api/applicants/${applicantUserId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_post_id: jobId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to submit application.");
      setAppliedJobIds((current) => (current.includes(jobId) ? current : [...current, jobId]));
      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j))
      );
      setDetailsJob((current) => {
        if (!current || current.id !== jobId) return current;
        return { ...current, applicantCount: current.applicantCount + 1 };
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to submit application.");
    } finally {
      setApplyingJobId(null);
    }
  };

  const toggleBookmark = (jobId: number) => {
    setBookmarkedIds((current) => {
      const next = current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId];
      localStorage.setItem("elitecruit-bookmarked-jobs", JSON.stringify(next));
      return next;
    });
  };

  const handleReviewApplication = (app: any) => {
    const existingJob = jobs.find((j) => j.id === Number(app.job_post_id));
    if (existingJob) {
      setDetailsJob(existingJob);
      return;
    }

    const jobObj: JobCard = {
      id: Number(app.job_post_id),
      title: app.job_title || app.title || "Applied Role",
      company: app.company_name || "Employer",
      location: app.location || app.city || "Cavite",
      summary: app.description || "No job description provided yet.",
      salary: formatSalaryRange(app.salary_min ?? null, app.salary_max ?? null, app.hide_salary),
      salaryMin: Number.isFinite(Number(app.salary_min)) ? Number(app.salary_min) : 0,
      setup: app.work_arrangement || "Flexible",
      status: app.status === "closed" ? "closed" : "open",
      closeDate: app.close_date || "-",
      applicationLimit: Number.isFinite(Number(app.application_limit)) ? Number(app.application_limit) : 0,
      applicantCount: Number.isFinite(Number(app.applicant_count)) ? Number(app.applicant_count) : 0,
      qualifications: app.qualifications || "Not provided",
      certifications: app.certifications || "Not provided",
      responsibilities: app.responsibilities || "Not provided",
      skillTags: parseCompetencyDisplayTags(app.required_skills),
      qualTags: parseCompetencyDisplayTags(app.qualifications),
      certTags: parseCompetencyDisplayTags(app.certifications),
      jobType: app.work_arrangement === "Remote" ? "Remote" : "Full-time",
      functionGroup: "General",
      distance: "Cavite",
      badges: parseCompetencyDisplayTags(app.required_skills),
      urgent: Boolean(Number(app.is_urgent || 0)),
      createdAt: typeof app.created_at === "string" ? app.created_at : null,
      createdRank: 0,
      employerUserId: Number(app.employer_user_id) || undefined,
      companyLogoPath: app.company_logo_path || null,
      companyCoverPath: app.company_cover_path || null,
      rating: app.rating ? String(app.rating) : "0.0",
    };
    setDetailsJob(jobObj);
  };

  const handleTabClick = (sectionId: string) => {
    setActiveSection(sectionId);
    window.location.hash = sectionId;
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentTabIndex = WORKSPACE_TABS.findIndex((tab) => tab.id === activeSection);
  const safeTabIndex = currentTabIndex >= 0 ? currentTabIndex : 0;

  const handlePrevTab = () => {
    const prev = (safeTabIndex - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length;
    handleTabClick(WORKSPACE_TABS[prev].id);
  };

  const handleNextTab = () => {
    const next = (safeTabIndex + 1) % WORKSPACE_TABS.length;
    handleTabClick(WORKSPACE_TABS[next].id);
  };

  const handleSectionClick = (event: React.MouseEvent<HTMLAnchorElement>, sectionId?: string) => {
    if (!sectionId) return;
    event.preventDefault();
    handleTabClick(sectionId);
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setIsSidebarVisible(false);
    }
  };

  return (
    <div className={`appdash-page ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
      <aside className="appdash-sidebar" aria-label="Applicant Navigation">
        <div className="appdash-brand">
          <a href="/" className="appdash-brand-link">
            <strong>EliteCruit</strong>
            <span>Candidate Workspace</span>
          </a>
          <button
            type="button"
            className="appdash-sidebar-toggle"
            aria-label="Close sidebar menu"
            onClick={() => setIsSidebarVisible(false)}
          >
            <MenuIcon />
          </button>
        </div>

        <ul className="appdash-secondary-list">
          <li className="applicant-workspace-item active">
            <a
              href="/applicant-dashboard"
              className="applicant-workspace-title active"
              onClick={(e) => {
                e.preventDefault();
                setIsWorkspaceOpen((prev) => !prev);
              }}
            >
              <span className="title-main">
                <span className="item-icon">
                  <SideIcon name="overview" />
                </span>
                <span>Applicant Workspace</span>
              </span>
              <span className="title-caret-btn" title="Toggle sub-menu">
                <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
              </span>
            </a>

            {isWorkspaceOpen && (
              <ul id="workspace-links" className="appdash-menu-list">
                <li className={activeSection === "section-smart-matches" ? "active" : ""}>
                  <a href="/applicant-dashboard#section-smart-matches" onClick={(event) => handleSectionClick(event, "section-smart-matches")}>
                    <span className="item-icon"><SideIcon name="star" /></span>
                    <span>Smart Matches</span>
                  </a>
                </li>
                <li className={activeSection === "section-applications" ? "active" : ""}>
                  <a href="/applicant-dashboard#section-applications" onClick={(event) => handleSectionClick(event, "section-applications")}>
                    <span className="item-icon"><SideIcon name="applications" /></span>
                    <span>My Applications</span>
                  </a>
                </li>
                <li className={activeSection === "section-invitations" ? "active" : ""}>
                  <a href="/applicant-dashboard#section-invitations" onClick={(event) => handleSectionClick(event, "section-invitations")}>
                    <span className="item-icon"><SideIcon name="notifications" /></span>
                    <span>Job Invitations</span>
                  </a>
                </li>
              </ul>
            )}
          </li>

          {navGeneral.map((item) => {
            const isNotif = item.label === "Notifications";
            const isMessages = item.label === "Messages";
            const badgeCount = isNotif
              ? (unreadNotifCount > 0 ? unreadNotifCount : null)
              : isMessages
              ? (unreadMessagesCount > 0 ? unreadMessagesCount : null)
              : item.badge;
            return (
              <li key={item.label} className={item.sectionId === activeSection ? "active" : ""}>
                <a href={item.href ?? (item.sectionId ? `#${item.sectionId}` : "#applicant-overview")} onClick={(event) => handleSectionClick(event, item.sectionId)}>
                  <span className="item-icon">
                    <SideIcon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                  {badgeCount ? <span className="item-badge">{badgeCount}</span> : null}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)} aria-expanded={isProfileMenuOpen}>
            <span className="item-icon"><SideIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{applicantLabel}</strong><small>Applicant</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && (
            <div className="appdash-profile-menu">
              <a href="/my-profile"><SideIcon name="profile" />My Profile</a>
            <a href="/settings">
              <SideIcon name="settings" />
              Settings
            </a>
              <button type="button" className="appdash-profile-menu-btn" onClick={() => setIsLogoutModalOpen(true)}>
                <SideIcon name="logout" />Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="appdash-main" id="applicant-overview" ref={mainRef}>
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <button
              type="button"
              className="appdash-mobile-nav-toggle"
              aria-label={isSidebarVisible ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setIsSidebarVisible((prev) => !prev)}
            >
              <MenuIcon />
            </button>
            <div>
              <strong>Applicant Workspace</strong>
            </div>
          </div>

          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <ApplicantChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Dashboard"
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        {/* 3-SECTION NAVIGATION TABS (Smart Matches, My Applications, Job Invitations) */}
        <div className="dash-nav-container">
          {/* Desktop Tab Row (Hidden on mobile screens <= 768px) */}
          <nav className="profile-section-nav dash-section-nav dash-desktop-tabs" aria-label="Workspace Sections">
            {WORKSPACE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`section-nav-btn ${activeSection === tab.id ? "active" : ""}`}
                onClick={() => handleTabClick(tab.id)}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile Single Item Switcher with Swap Arrows (Visible on mobile <= 768px) */}
          <div className="dash-mobile-switcher" aria-label="Workspace Sections">
            <button
              type="button"
              className="dash-switcher-btn prev"
              onClick={handlePrevTab}
              aria-label="Previous Section"
            >
              <ChevronIcon direction="left" />
            </button>
            <div className="dash-switcher-center">
              <span className="dash-switcher-title">{WORKSPACE_TABS[safeTabIndex].label}</span>
              <div className="dash-switcher-dots" aria-hidden="true">
                {WORKSPACE_TABS.map((tab, idx) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`dash-switcher-dot ${idx === safeTabIndex ? "active" : ""}`}
                    onClick={() => handleTabClick(tab.id)}
                    aria-label={tab.label}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              className="dash-switcher-btn next"
              onClick={handleNextTab}
              aria-label="Next Section"
            >
              <ChevronIcon direction="right" />
            </button>
          </div>
        </div>

        {/* ── SECTION 1: SMART MATCHES ── */}
        {activeSection === "section-smart-matches" && (
        <section className="matches-card section-anchor" id="section-smart-matches">
          <div className="matches-head">
            <div>
              <small>Dashboard Section</small>
              <h2>Smart Matches</h2>
              <p>Ranked by skills, qualifications, location, salary, and work arrangement.</p>
            </div>
            <a href="/job-search">View All</a>
          </div>

          {sortedSmartMatches.length === 0 ? (
            <article className="result-card empty-state">
              <div className="result-top">
                <div>
                  <h3>No smart matches yet.</h3>
                  <p>Job recommendations will appear here once active job posts are available.</p>
                </div>
              </div>
            </article>
          ) : (
            sortedSmartMatches.slice(0, 5).map((job) => (
              <article key={job.id} className="result-card" style={{ marginBottom: "12px" }}>
                <div className="result-card-main">
                  <div className="result-left-col">
                    <div className="result-title-row">
                      <h3 title={job.title}>{job.title}</h3>
                    </div>
                    <p className="meta-line">
                      <span><MiniIcon name="company" />{job.company}</span>
                      <RenderLocationMeta location={job.location} />
                    </p>
                    <p className="result-summary">{job.summary || "No job description provided yet."}</p>
                    <div className="result-tags">
                      <span className={`status-chip ${job.status === "open" ? "open" : "closed"}`}>{job.status === "open" ? "Open" : "Closed"}</span>
                      {job.urgent ? <span className="status-chip urgent">Urgent</span> : null}
                      <span className="setup-pill">{job.setup}</span>
                      {job.experienceLevel && <span className="exp-level-pill">{formatExperienceLevel(job.experienceLevel)}</span>}
                      {(() => {
                        const isHidden = Boolean(
                          (job as any).hideSalary ||
                          (job as any).hide_salary === 1 ||
                          (job as any).hide_salary === "1" ||
                          (job as any).hide_salary === true ||
                          (job as any).hide_salary === "true" ||
                          job.salary === "Salary Confidential"
                        );
                        if (isHidden) {
                          return <span className="salary-pill confidential">Salary Confidential</span>;
                        }
                        if (job.salary) {
                          return <span className="salary-pill">{job.salary}</span>;
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="result-right-col">
                    <div className="card-top-actions">
                      <div className="rating-score-box" title="Company rating">
                        <span className="star-icon">★</span>
                        <span>{job.rating ? Number(job.rating).toFixed(1) : "0.0"}</span>
                      </div>
                      {(() => {
                        const matchInfo = calculateJobMatchDetails(job, applicantMatchProfile);
                        return (
                          <div className={`match-score-box ${getMatchColorClass(matchInfo.score)}`} title={matchInfo.breakdown}>
                            <small>Match</small>
                            <b>{matchInfo.score}%</b>
                          </div>
                        );
                      })()}
                    </div>
                    <button type="button" className="details-btn" onClick={() => setDetailsJob(job)}>Details</button>
                    <div className="card-bottom-actions">
                      <button
                        type="button"
                        className={`solid-btn apply-right-btn ${appliedJobIds.includes(job.id) ? "applied-btn" : ""}`}
                        onClick={() => setApplyJobTarget({ jobId: job.id, title: job.title })}
                        disabled={appliedJobIds.includes(job.id) || applyingJobId === job.id}
                      >
                        {appliedJobIds.includes(job.id) ? "Applied" : applyingJobId === job.id ? "Applying..." : "Apply"}
                      </button>
                      <button
                        type="button"
                        className="bookmark-icon-btn"
                        aria-label={bookmarkedIds.includes(job.id) ? "Remove bookmark" : "Bookmark job"}
                        onClick={() => toggleBookmark(job.id)}
                      >
                        <MiniIcon name={bookmarkedIds.includes(job.id) ? "bookmarkFilled" : "bookmark"} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
        )}

        {/* ── SECTION 2: MY APPLICATIONS ── */}
        {activeSection === "section-applications" && (
        <section className="matches-card section-anchor" id="section-applications" style={{ marginTop: "24px" }}>
          <div className="matches-head">
            <div>
              <small>Dashboard Section</small>
              <h2>My Applications</h2>
              <p>Positions you have applied for and their real-time application status.</p>
            </div>
            <a href="/job-search">Find More Jobs</a>
          </div>

          {myApplicationsList.length === 0 ? (
            <article className="job-card job-empty-card">
              <div>
                <h3>No applications submitted yet.</h3>
                <p>Browse open job listings on the Job Search page and submit applications.</p>
              </div>
              <div className="job-actions">
                <button type="button" className="solid-btn" onClick={() => { window.location.href = "/job-search"; }}>Browse Jobs</button>
              </div>
            </article>
          ) : (
            myApplicationsList.map((app: any) => (
              <article key={app.id || app.job_post_id} className="job-card">
                <div className="job-card-left">
                  <h3>{app.job_title || app.title || "Applied Role"}</h3>
                  <p>{app.company_name ? `${app.company_name} · ` : ""}{app.location || app.city || "Location not set"}</p>
                  <p style={{ marginTop: "4px", fontSize: "0.82rem", color: "#355172" }}>
                    Submitted on: {formatDate(app.submitted_at)}
                  </p>
                </div>
                <div className="job-card-middle">
                  <span className={`status-badge-chip ${statusChipBadgeClass(app.status)}`}>
                    {formatStatusLabel(app.status)}
                  </span>
                </div>
                <div className="job-actions">
                  {["approved", "accepted", "shortlisted"].includes((app.status || "").toLowerCase()) || app.response_letter ? (
                    <a
                      href={`/applicant-offer-letter?applicationId=${app.id}&action=accept`}
                      className="solid-btn"
                      style={{ background: "#059669", borderColor: "#059669", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px" }}
                    >
                      {app.response_letter ? "View Letter ✉" : "Formal Offer Letter ✉"}
                    </a>
                  ) : null}
                  <button type="button" className="solid-btn" onClick={() => handleReviewApplication(app)}>
                    Review
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => { window.location.href = "/messages"; }}>Message</button>
                </div>
              </article>
            ))
          )}
        </section>
        )}

        {/* ── SECTION 3: JOB INVITATIONS ── */}
        {activeSection === "section-invitations" && (
        <section className="matches-card section-anchor" id="section-invitations" style={{ marginTop: "24px" }}>
          <div className="matches-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <small>Direct Invitations</small>
              <h2>Job Invitations</h2>
              <p>Positions where employers reviewed your profile and directly invited you.</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["all", "pending", "accepted", "declined"] as const).map((key) => {
                const count = key === "all"
                  ? invitationsList.length
                  : invitationsList.filter((i) => (i.status || "pending").toLowerCase() === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`inv-filter-btn ${invitationFilter === key ? "active" : ""}`}
                    onClick={() => setInvitationFilter(key)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: invitationFilter === key ? "1px solid #0284c7" : "1px solid #cbd5e1",
                      background: invitationFilter === key ? "#e0f2fe" : "#f8fafc",
                      color: invitationFilter === key ? "#0369a1" : "#475569",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {key} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {invitationsList.filter((inv) => invitationFilter === "all" || (inv.status || "pending").toLowerCase() === invitationFilter).length === 0 ? (
            <article className="job-card job-empty-card">
              <div>
                <h3>
                  {invitationFilter === "all"
                    ? "No job invitations found."
                    : `No ${invitationFilter} job invitations found.`}
                </h3>
                <p>When employers discover your profile and invite you to their open positions, they will appear here.</p>
              </div>
              <div className="job-actions">
                <a href="/job-search" className="solid-btn" style={{ textDecoration: "none" }}>Browse Job Search</a>
              </div>
            </article>
          ) : (
            invitationsList
              .filter((inv) => invitationFilter === "all" || (inv.status || "pending").toLowerCase() === invitationFilter)
              .map((inv) => {
                const status = (inv.status || "pending").toLowerCase();
                return (
                  <article key={inv.id} className="job-card" style={{ gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="job-card-left" style={{ flex: 1, minWidth: "260px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0 }}>{inv.job_title}</h3>
                        <span style={{ fontSize: "0.75rem", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                          Direct Invitation
                        </span>
                      </div>
                      <p style={{ margin: "4px 0" }}>
                        <strong>{inv.business_name || "Employer"}</strong> • {inv.job_location || "Cavite"} • {inv.work_arrangement || "On-Site"}
                      </p>
                      {(inv.hide_salary || inv.salary_min) && (
                        <p style={{ margin: "2px 0", color: "#0284c7", fontWeight: 600, fontSize: "0.86rem" }}>
                          {formatSalaryRange(inv.salary_min ?? null, inv.salary_max ?? null, inv.hide_salary)}
                        </p>
                      )}
                      <small style={{ color: "#64748b" }}>
                        Invited on: {formatDate(inv.created_at)}
                      </small>
                    </div>

                    <div className="job-actions invitation-card-actions">
                      <button type="button" className="inv-action-btn inv-details-btn" onClick={() => handleReviewInvitation(inv)}>
                        Details
                      </button>
                      {status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="inv-action-btn inv-accept-btn"
                            onClick={() => setDecisionModalTarget({ inv, action: "accept" })}
                            disabled={isRespondingInvId === inv.id}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="inv-action-btn inv-decline-btn"
                            onClick={() => setDecisionModalTarget({ inv, action: "decline" })}
                            disabled={isRespondingInvId === inv.id}
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <a
                          href={`/applicant-offer-letter?invitationId=${inv.id}`}
                          className={`inv-action-btn ${status === "accepted" ? "inv-accepted-status-btn" : "inv-declined-status-btn"}`}
                          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        >
                          {status === "accepted" ? "Accepted · View Letter" : "Declined · View Letter"}
                        </a>
                      )}
                      <a href="/messages" className="inv-action-btn inv-message-btn">
                        Message
                      </a>
                    </div>
                  </article>
                );
              })
          )}
        </section>
        )}
      </main>

      {/* ── JOB DETAILS MODAL ── */}
      <JobDetailsModal
        isOpen={Boolean(detailsJob)}
        job={jobModalData}
        onClose={() => {
          setDetailsJob(null);
          setIsFaqDrawerOpen(false);
        }}
        currentUserId={applicantUserId || undefined}
        applicantProfile={applicantMatchProfile}
        onApply={() => {
          if (detailsJob) {
            setApplyJobTarget({ jobId: detailsJob.id, title: detailsJob.title });
          }
        }}
        isApplied={detailsJob ? appliedJobIds.includes(detailsJob.id) : false}
        isApplying={detailsJob ? applyingJobId === detailsJob.id : false}
        appliedLabel="Applied"
        onEmployerClick={(empId) => {
          if (empId) handleOpenEmployerDetails(empId);
        }}
        zIndex={10000}
      />

      {/* ── EMPLOYER DETAILS MODAL ── */}
      <EmployerDetailsModal
        isOpen={Boolean(selectedEmployerDetails)}
        onClose={() => setSelectedEmployerDetails(null)}
        employer={selectedEmployerDetails}
        zIndex={10250}
      />

      {isSidebarVisible && (
        <button
          type="button"
          className="appdash-backdrop"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      {!isSidebarVisible && (
        <button
          type="button"
          className="appdash-fab"
          aria-label="Show sidebar"
          onClick={() => setIsSidebarVisible(true)}
        >
          <MenuIcon />
        </button>
      )}

      {/* DOUBLE VERIFICATION: LOGOUT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        type="warning"
        title="Log Out of EliteCruit"
        message="Are you sure you want to log out of your applicant account?"
        cancelLabel="Stay Signed In"
        confirmLabel="Log Out"
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          localStorage.removeItem("elitecruit-user");
          window.location.href = "/";
        }}
      />

      {/* APPLICANT DECISION MODAL (Accept / Decline Recruitment - Pic 2 & Pic 3 Design) */}
      <ApplicantDecisionModal
        isOpen={!!decisionModalTarget}
        action={decisionModalTarget?.action || null}
        jobTitle={decisionModalTarget?.inv.job_title}
        companyName={decisionModalTarget?.inv.business_name}
        candidateName={applicantLabel}
        currentUserId={applicantUserId || undefined}
        onClose={() => setDecisionModalTarget(null)}
        onConfirm={async ({ action, letter_text, letter_type, start_date }) => {
          if (!decisionModalTarget) return;
          await handleRespondInvitation(
            decisionModalTarget.inv.id,
            action,
            letter_text,
            letter_type,
            start_date
          );
        }}
      />

      {/* DOUBLE VERIFICATION: APPLY TO JOB MODAL */}
      <ConfirmationModal
        isOpen={!!applyJobTarget}
        type="info"
        title="Submit Job Application"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to apply for <strong>{applyJobTarget?.title || "this position"}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Your profile, qualifications, and attached resume will be submitted to the employer for review.
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Confirm & Apply"
        onCancel={() => setApplyJobTarget(null)}
        onConfirm={handleConfirmApply}
      />
    </div>
  );
}

