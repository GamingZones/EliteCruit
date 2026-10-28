import React, { useEffect, useState } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import ApplicantChatbotDrawer from "../../components/ApplicantChatbotDrawer";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ConfirmationModal from "../../components/ConfirmationModal";
import UndoToast from "../../components/UndoToast";
import "../Applicant/Applicant-Dashboard.css";
import "../Employer/Employer-Dashboard.css";
import "./Notifications.css";

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

type NotificationItem = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  is_read: number;
  related_user_id?: number | null;
  related_application_id?: number | null;
  created_at?: string;
};

type NotifSettings = {
  email: boolean;
  application_updates: boolean;
  recruitment_invites: boolean;
  messages: boolean;
  feedback: boolean;
  job_expiry: boolean;
};

const defaultSettings: NotifSettings = {
  email: true,
  application_updates: true,
  recruitment_invites: true,
  messages: true,
  feedback: true,
  job_expiry: true,
};

function groupNotifications(list: NotificationItem[]): NotificationItem[] {
  const grouped: NotificationItem[] = [];
  const appGroups: Record<string, NotificationItem[]> = {};

  for (const item of list) {
    if (item.type === "new_application") {
      const match = item.body.match(/for (?:your job post )?["']([^"']+)["']/i);
      const jobKey = match ? match[1] : item.title;
      if (!appGroups[jobKey]) appGroups[jobKey] = [];
      appGroups[jobKey].push(item);
    } else {
      grouped.push(item);
    }
  }

  for (const [jobTitle, items] of Object.entries(appGroups)) {
    if (items.length === 1) {
      grouped.push(items[0]);
    } else {
      const names = items.map((it) => {
        const m = it.body.match(/^([^]+?)\s+(?:submitted|applied)/i);
        return m ? m[1].trim() : "Applicant";
      });

      let namesSummary = "";
      if (names.length === 2) {
        namesSummary = `${names[0]} and ${names[1]}`;
      } else {
        namesSummary = `${names[0]}, ${names[1]}, and ${names.length - 2} other${names.length - 2 > 1 ? "s" : ""}`;
      }

      const hasUnread = items.some((it) => !it.is_read);
      const newestTime = items[0].created_at;

      grouped.unshift({
        id: items[0].id,
        user_id: items[0].user_id,
        type: "new_applications_group",
        title: `${items.length} New Applications`,
        body: `${namesSummary} submitted applications for "${jobTitle}".`,
        is_read: hasUnread ? 0 : 1,
        created_at: newestTime,
      });
    }
  }

  return grouped;
}

function renderNotificationIcon(type: string, title: string) {
  const t = (type || "").toLowerCase();
  const tt = (title || "").toLowerCase();

  if (t.includes("invite") || tt.includes("invitation")) {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4l-8 5-8-5V6l8 5 8-5v2Z" />
      </svg>
    );
  }
  if (t.includes("message") || tt.includes("message")) {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
      </svg>
    );
  }
  if (t.includes("feedback") || tt.includes("feedback") || tt.includes("rating")) {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="#d97706">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    );
  }
  if (t.includes("expiry") || t.includes("limit") || tt.includes("expiry") || tt.includes("limit")) {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="#dc2626">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

export default function Notifications() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return false;
    }
    return true;
  });
  const [sessionRole, setSessionRole] = useState<"applicant" | "employer">("applicant");
  const [applicantLabel, setApplicantLabel] = useState(getInitialApplicantName);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const employerNotificationsFaqs: FAQItem[] = [
    {
      question: "What alerts do I receive in Notifications?",
      answer: "You receive notifications for new applicant submissions (grouped by job), direct invitation responses, candidate messages, job expiry warnings, and ratings.",
    },
    {
      question: "What happens when multiple people apply for the same job?",
      answer: "Applications for the same job post are automatically consolidated into a single summary notification (e.g. '3 New Applications for Senior Web Developer') so your feed stays clean.",
    },
    {
      question: "What happens when I click a notification?",
      answer: "Clicking any notification automatically marks it as read and redirects you directly to the relevant page (such as Applicant Screening, Messages, or Job Posts).",
    },
  ];

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "read" | "unread">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<NotifSettings>(defaultSettings);
  const companyLabel = useEmployerCompanyLabel("Employer");
  const isEmployer = sessionRole === "employer";
  const unreadMessagesCount = useUnreadMessagesCount();

  const fetchUserNotifications = async (userId: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/notifications`);
      if (res.ok) {
        const data = await res.json();
        const dbList: NotificationItem[] = Array.isArray(data?.notifications) ? data.notifications : [];
        setNotifications(groupNotifications(dbList));
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    let detectedRole: "applicant" | "employer" = "applicant";

    if (savedUserRaw) {
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

        if (savedUser.role === "employer") {
          detectedRole = "employer";
          setSessionRole("employer");
        } else {
          setSessionRole("applicant");
          const first = savedUser.first_name || savedUser.firstName || "";
          const last = savedUser.last_name || savedUser.lastName || "";
          const fallbackName = `${first} ${last}`.trim() || savedUser.email || "Applicant";
          setApplicantLabel(fallbackName);

          if (savedUser.id) {
            fetch(`/api/applicants/${savedUser.id}/profile`)
              .then((res) => res.json())
              .then((data) => {
                const p = data?.profile;
                const fName = [p?.first_name, p?.middle_name, p?.last_name].filter(Boolean).join(" ");
                if (fName) setApplicantLabel(fName);
              })
              .catch(() => {});
          }
        }

        if (savedUser.id) {
          setCurrentUserId(savedUser.id);
          fetchUserNotifications(savedUser.id);

          const savedSettingsRaw = localStorage.getItem(`elitecruit_notif_settings_${savedUser.id}`);
          if (savedSettingsRaw) {
            try {
              setSettings(JSON.parse(savedSettingsRaw));
            } catch {}
          }
        } else {
          setNotifications([]);
        }
      } catch {
        setSessionRole("applicant");
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
  }, []);

  const handleMarkAsRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    window.dispatchEvent(new Event("elitecruit_notif_update"));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
    } catch {}
  };

  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    const previous = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    window.dispatchEvent(new Event("elitecruit_notif_update"));
    setUndoToast({
      message: "All notifications marked as read.",
      onUndo: () => {
        setNotifications(previous);
        window.dispatchEvent(new Event("elitecruit_notif_update"));
      },
    });
    for (const n of unread) {
      try {
        await fetch(`/api/notifications/${n.id}/read`, { method: "PUT" });
      } catch {}
    }
  };

  const handleClearHistory = () => {
    if (notifications.length === 0) return;
    setIsClearHistoryConfirmOpen(true);
  };

  const handleConfirmClearHistory = async () => {
    if (!currentUserId) return;
    setNotifications([]);
    setCurrentPage(1);
    setIsClearHistoryConfirmOpen(false);
    window.dispatchEvent(new Event("elitecruit_notif_update"));

    try {
      await fetch(`/api/users/${currentUserId}/notifications`, { method: "DELETE" });
    } catch (err) {
      console.error("Error clearing notification history:", err);
    }
  };

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    window.dispatchEvent(new Event("elitecruit_notif_update"));
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleNotificationClick = async (notice: NotificationItem) => {
    if (!notice.is_read) {
      handleMarkAsRead(notice.id);
    }

    const type = (notice.type || "").toLowerCase();
    const title = (notice.title || "").toLowerCase();
    const body = (notice.body || "").toLowerCase();

    let targetUrl = isEmployer ? "/employer-dashboard" : "/applicant-dashboard";

    if (isEmployer) {
      if (type.includes("invite") || title.includes("invitation") || body.includes("invitation")) {
        targetUrl = "/employer-applicant-management#direct-invitations";
      } else if (type.includes("application") || title.includes("application") || body.includes("applied")) {
        targetUrl = "/employer-applicant-management#applicant-screening";
      } else if (type.includes("message") || title.includes("message")) {
        targetUrl = "/messages";
      } else if (type.includes("job") || type.includes("expiry") || title.includes("job") || title.includes("expiry")) {
        targetUrl = "/employer-job-posts";
      } else if (type.includes("feedback") || title.includes("feedback") || title.includes("rating")) {
        targetUrl = "/feedback";
      }
    } else {
      if (type.includes("invite") || title.includes("invite") || title.includes("invitation")) {
        targetUrl = "/applicant-dashboard#section-invitations";
      } else if (type.includes("application") || type.includes("status") || title.includes("shortlisted") || title.includes("approved") || title.includes("denied")) {
        targetUrl = "/applicant-dashboard#section-applications";
      } else if (type.includes("message") || title.includes("message")) {
        targetUrl = "/messages";
      } else if (type.includes("feedback") || title.includes("feedback") || title.includes("rating")) {
        targetUrl = "/feedback";
      }
    }

    window.location.href = targetUrl;
  };

  const toggleSetting = (key: keyof NotifSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (currentUserId) {
        localStorage.setItem(`elitecruit_notif_settings_${currentUserId}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const readCount = notifications.filter((n) => n.is_read).length;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotices = notifications.filter((n) => {
    if (activeTab === "unread") return !n.is_read;
    if (activeTab === "read") return n.is_read === 1;
    return true;
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    
    const mainElem = document.querySelector(".appdash-main");
    if (mainElem) {
      mainElem.scrollTo({ top: 0, behavior: "smooth" });
      mainElem.scrollTop = 0;
    }

    const notifWrap = document.querySelector(".notification-wrap");
    if (notifWrap) {
      notifWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / ITEMS_PER_PAGE));
  const paginatedNotices = filteredNotices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className={`notifications-page appdash-page ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
      {isEmployer ? (
        <aside className="appdash-sidebar" aria-label="Employer Navigation">
          <a href="/" className="appdash-brand">
            <strong>EliteCruit</strong>
            <span>Employer Workspace</span>
          </a>

          <div className="employer-links-wrap">
            <ul className="appdash-secondary-list">
              <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
              <li><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
              <li className="employer-screening-item">
                <a
                  href="/employer-applicant-management"
                  className="employer-screening-title"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsScreeningOpen((prev) => !prev);
                  }}
                >
                  <span className="title-main">
                    <span className="item-icon"><EmployerIcon name="applicant" /></span>
                    <span>Applicant Management</span>
                  </span>
                  <span className="title-caret-btn" title="Toggle sub-menu">
                    <ChevronIcon direction={isScreeningOpen ? "down" : "up"} />
                  </span>
                </a>

                {isScreeningOpen && (
                  <ul className="appdash-menu-list">
                    <li><a href="/employer-applicant-management#applicant-screening"><span className="item-icon"><EmployerIcon name="screening" /></span><span>Applicant Screening</span></a></li>
                    <li><a href="/employer-applicant-management#shortlisted-candidates"><span className="item-icon"><EmployerIcon name="shortlisted" /></span><span>Shortlisted Candidates</span></a></li>
                    <li><a href="/employer-applicant-management#direct-invitations"><span className="item-icon"><EmployerIcon name="discovery" /></span><span>Recruitment List</span></a></li>
                  </ul>
                )}
              </li>
              <li><a href="/employer-applicant-finder"><span className="item-icon"><EmployerIcon name="nearby" /></span><span>Applicant Finder</span></a></li>
              <li><a href="/employer-notices-faqs"><span className="item-icon"><EmployerIcon name="faq" /></span><span>Notices & FAQs</span></a></li>
              <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
              <li className={`active ${unreadCount > 0 ? "has-unread" : ""}`}><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span>{unreadCount > 0 && <span className="item-badge">{unreadCount}</span>}</a></li>
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
                <a href="/settings"><SideIcon name="settings" />Settings</a>
                <button
                  type="button"
                  className="appdash-profile-menu-btn"
                  onClick={() => setIsLogoutModalOpen(true)}
                >
                  <EmployerIcon name="logout" />Logout
                </button>
              </div>
            )}
          </div>
        </aside>
      ) : (
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
            <li className="applicant-workspace-item">
              <a
                href="/applicant-dashboard"
                className="applicant-workspace-title"
                onClick={(e) => {
                  e.preventDefault();
                  setIsWorkspaceOpen((prev) => !prev);
                }}
              >
                <span className="title-main">
                  <span className="item-icon"><SideIcon name="overview" /></span>
                  <span>Applicant Workspace</span>
                </span>
                <span className="title-caret-btn" title="Toggle sub-menu">
                  <ChevronIcon direction={isWorkspaceOpen ? "down" : "up"} />
                </span>
              </a>

              {isWorkspaceOpen && (
                <ul className="appdash-menu-list">
                  <li><a href="/applicant-dashboard#section-smart-matches"><span className="item-icon"><SideIcon name="star" /></span><span>Smart Matches</span></a></li>
                  <li><a href="/applicant-dashboard#section-applications"><span className="item-icon"><SideIcon name="applications" /></span><span>My Applications</span></a></li>
                  <li><a href="/applicant-dashboard#section-invitations"><span className="item-icon"><SideIcon name="notifications" /></span><span>Job Invitations</span></a></li>
                </ul>
              )}
            </li>

            <li><a href="/job-search"><span className="item-icon"><SideIcon name="search" /></span><span>Job Search</span></a></li>
            <li><a href="/applicant-offer-letter"><span className="item-icon"><SideIcon name="documents" /></span><span>Offer Letters</span></a></li>
            <li><a href="/messages"><span className="item-icon"><SideIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
            <li className="active"><a href="/notifications"><span className="item-icon"><SideIcon name="notifications" /></span><span>Notifications</span>{unreadCount > 0 && <span className="item-badge">{unreadCount}</span>}</a></li>
            <li><a href="/feedback"><span className="item-icon"><SideIcon name="feedback" /></span><span>Feedback</span></a></li>
          </ul>

          <div className="appdash-profile-control">
            <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((value) => !value)}>
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
      )}

      {isSidebarVisible && (
        <button
          type="button"
          className="appdash-backdrop"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      <main className="appdash-main notifications-main">
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
            <div><strong>Notifications</strong></div>
          </div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              {isEmployer ? (
                <EmployerChatbotDrawer
                  isOpen={isChatbotOpen}
                  onToggle={() => setIsChatbotOpen((prev) => !prev)}
                  pageTitle="Notifications"
                  customFaqs={employerNotificationsFaqs}
                />
              ) : (
                <ApplicantChatbotDrawer
                  isOpen={isChatbotOpen}
                  onToggle={() => setIsChatbotOpen((prev) => !prev)}
                  pageTitle="Notifications"
                />
              )}
            </div>
            <CalendarDrawer />
          </div>
        </header>

        <section className="notification-wrap">
          <div className="notif-head">
            <div className="notif-tabs">
              <button
                type="button"
                className={activeTab === "all" ? "active" : ""}
                onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                className={activeTab === "read" ? "active" : ""}
                onClick={() => { setActiveTab("read"); setCurrentPage(1); }}
              >
                Read ({readCount})
              </button>
              <button
                type="button"
                className={activeTab === "unread" ? "active" : ""}
                onClick={() => { setActiveTab("unread"); setCurrentPage(1); }}
              >
                Unread ({unreadCount})
              </button>
            </div>

            <div className="notif-actions">
              <button type="button" className="ghost-btn" onClick={handleMarkAllAsRead}>
                Mark All as Read
              </button>
              <button type="button" className="ghost-btn danger-ghost-btn" onClick={handleClearHistory}>
                Clear History
              </button>
            </div>
          </div>

          <div className="notice-list">
            {isLoading ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>Loading notifications...</div>
            ) : paginatedNotices.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>No notifications found.</p>
              </div>
            ) : (
              paginatedNotices.map((notice) => (
                <article
                  key={notice.id}
                  className={`notice-card ${!notice.is_read ? "highlighted" : ""}`}
                  onClick={() => handleNotificationClick(notice)}
                  style={{ cursor: "pointer" }}
                >
                  <span className="notice-icon">
                    {renderNotificationIcon(notice.type, notice.title)}
                  </span>
                  <div className="notice-copy">
                    <strong>{notice.title}</strong>
                    <p>{notice.body}</p>
                    <small>{notice.created_at ? new Date(notice.created_at).toLocaleString() : "Recent"}</small>
                  </div>
                  <div className="notice-meta">
                    {!notice.is_read ? <span className="dot" /> : null}
                    <div className="notice-meta-actions">
                      {!notice.is_read && (
                        <button
                          type="button"
                          className="notice-read-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notice.id);
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        type="button"
                        className="notice-delete-btn"
                        title="Delete notification"
                        onClick={(e) => handleDeleteNotification(notice.id, e)}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="notif-pagination">
              <button
                type="button"
                className="page-btn"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ◄ Previous
              </button>
              <span className="page-info">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                type="button"
                className="page-btn"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next ►
              </button>
            </div>
          )}

          {/* NOTIFICATION SETTINGS PANEL */}
          <section className="notification-settings">
            <h3>Notification Settings</h3>

            <div className="setting-row">
              <div>
                <strong>Email notifications</strong>
                <p>{isEmployer ? "Receive email alerts for company account activity" : "Receive email alerts for account activity"}</p>
              </div>
              <button
                type="button"
                className={`switch ${settings.email ? "on" : ""}`}
                onClick={() => toggleSetting("email")}
                aria-label="Toggle email notifications"
              />
            </div>

            <div className="setting-row">
              <div>
                <strong>{isEmployer ? "New Job Applications" : "Application updates"}</strong>
                <p>{isEmployer ? "Get notified when jobseekers submit new applications to your job posts" : "Get notified when your application is Shortlisted, Approved, or Denied"}</p>
              </div>
              <button
                type="button"
                className={`switch ${settings.application_updates ? "on" : ""}`}
                onClick={() => toggleSetting("application_updates")}
                aria-label="Toggle application updates"
              />
            </div>

            <div className="setting-row">
              <div>
                <strong>{isEmployer ? "Recruitment Invitation Responses" : "Direct Recruitment Invitations"}</strong>
                <p>{isEmployer ? "Get notified when candidates accept or decline direct recruitment invitations" : "Get notified when employers invite you to apply for jobs"}</p>
              </div>
              <button
                type="button"
                className={`switch ${settings.recruitment_invites ? "on" : ""}`}
                onClick={() => toggleSetting("recruitment_invites")}
                aria-label="Toggle recruitment invitations"
              />
            </div>

            {isEmployer && (
              <div className="setting-row">
                <div>
                  <strong>Job Expiry & Limit Alerts</strong>
                  <p>Get notified 7 days & 3 days before job posts expire, or when application caps are reached</p>
                </div>
                <button
                  type="button"
                  className={`switch ${settings.job_expiry ? "on" : ""}`}
                  onClick={() => toggleSetting("job_expiry")}
                  aria-label="Toggle job expiry warnings"
                />
              </div>
            )}

            <div className="setting-row">
              <div>
                <strong>Messages</strong>
                <p>{isEmployer ? "Get notified when candidates send you new chat messages" : "Get notified when employers send you new chat messages"}</p>
              </div>
              <button
                type="button"
                className={`switch ${settings.messages ? "on" : ""}`}
                onClick={() => toggleSetting("messages")}
                aria-label="Toggle message notifications"
              />
            </div>

            <div className="setting-row">
              <div>
                <strong>{isEmployer ? "Candidate Feedback & Ratings" : "Employer Feedback & Ratings"}</strong>
                <p>{isEmployer ? "Get notified when candidates leave feedback or reviews for your company" : "Get notified when an employer leaves feedback or ratings for your interview"}</p>
              </div>
              <button
                type="button"
                className={`switch ${settings.feedback ? "on" : ""}`}
                onClick={() => toggleSetting("feedback")}
                aria-label="Toggle feedback notifications"
              />
            </div>
          </section>
        </section>

        {/* LOGOUT CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={isLogoutModalOpen}
          type="warning"
          title="Log Out of EliteCruit"
          message={`Are you sure you want to log out of your ${isEmployer ? "employer" : "applicant"} account?`}
          cancelLabel="Stay Signed In"
          confirmLabel="Log Out"
          onCancel={() => setIsLogoutModalOpen(false)}
          onConfirm={() => {
            localStorage.removeItem("elitecruit-user");
            window.location.href = "/";
          }}
        />

        {/* CLEAR NOTIFICATIONS CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={isClearHistoryConfirmOpen}
          type="danger"
          title="Clear Notification History"
          message="Are you sure you want to clear your notification history? All past activity logs and alerts will be wiped from your view."
          cancelLabel="Keep History"
          confirmLabel="Clear All"
          onCancel={() => setIsClearHistoryConfirmOpen(false)}
          onConfirm={handleConfirmClearHistory}
        />

        {/* UNDO TOAST */}
        {undoToast && (
          <UndoToast
            message={undoToast.message}
            onUndo={undoToast.onUndo}
            onClose={() => setUndoToast(null)}
          />
        )}
      </main>
    </div>
  );
}

