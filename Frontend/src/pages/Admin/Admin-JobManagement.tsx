import React, { useEffect, useState, useMemo } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import ConfirmationModal from "../../components/ConfirmationModal";
import JobDetailsModal from "../../components/modals/JobDetailsModal";
import "./Admin-JobManagement.css";
import { authFetch, getStoredUser } from "../../utils/auth";

export interface AdminJobPostItem {
  id: number;
  employer_user_id: number;
  title: string;
  company_name: string;
  employer_email?: string;
  contact_number?: string;
  location: string | null;
  company_address?: string | null;
  company_city?: string | null;
  company_logo_path?: string | null;
  company_cover_path?: string | null;
  status: "open" | "closed" | "suspended" | string;
  raw_db_status?: string;
  is_urgent?: number | boolean;
  hide_salary?: number | boolean;
  work_arrangement?: string;
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
  qualifications?: string;
  certifications?: string;
  required_skills?: string;
  application_limit?: number | null;
  close_date?: string;
  created_at?: string;
  updated_at?: string;
  applicant_count: number;
  rating?: string | null;
}

export default function AdminJobManagement() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [jobs, setJobs] = useState<AdminJobPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedArrangement, setSelectedArrangement] = useState("All");
  const [viewingJob, setViewingJob] = useState<AdminJobPostItem | null>(null);
  const [statusJobTarget, setStatusJobTarget] = useState<{
    job: AdminJobPostItem;
    targetStatus: "open" | "closed" | "suspended";
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || stored.role !== "admin") {
      window.location.href = "/login";
      return;
    }
    setAdminUser(stored);
    loadJobPosts();
  }, []);

  const loadJobPosts = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch("/api/admin/job-posts");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobPosts || []);
      } else {
        showToast("Unable to load job postings from server.", "error");
      }
    } catch {
      showToast("Network error while loading job postings.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleRequestStatusChange = (job: AdminJobPostItem, targetStatus: "open" | "closed" | "suspended") => {
    setStatusJobTarget({ job, targetStatus });
  };

  const doConfirmStatusChange = async () => {
    if (!statusJobTarget) return;
    const { job, targetStatus } = statusJobTarget;
    setStatusJobTarget(null);

    try {
      setIsUpdating(true);
      const res = await authFetch(`/api/admin/job-posts/${job.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: targetStatus } : j))
        );
        if (viewingJob?.id === job.id) {
          setViewingJob({ ...viewingJob, status: targetStatus });
        }
        showToast(
          targetStatus === "suspended"
            ? `Job "${job.title}" has been suspended. It is now hidden from job search.`
            : `Job "${job.title}" suspension has been lifted.`,
          "success"
        );
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.message || "Failed to update job post status.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // KPI Calculations
  const totalCount = jobs.length;
  const openCount = jobs.filter((j) => j.status === "open").length;
  const suspendedCount = jobs.filter((j) => j.status === "suspended").length;
  const closedCount = jobs.filter((j) => j.status === "closed").length;

  // Filtered list
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (selectedStatus !== "All") {
        if (selectedStatus === "Open" && j.status !== "open") return false;
        if (selectedStatus === "Suspended" && j.status !== "suspended") return false;
        if (selectedStatus === "Closed" && j.status !== "closed") return false;
      }

      if (selectedArrangement !== "All") {
        if (
          !j.work_arrangement ||
          j.work_arrangement.toLowerCase() !== selectedArrangement.toLowerCase()
        ) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = j.title?.toLowerCase().includes(q);
        const matchesCompany = j.company_name?.toLowerCase().includes(q);
        const matchesEmail = j.employer_email?.toLowerCase().includes(q);
        const matchesLoc = j.location?.toLowerCase().includes(q);
        const matchesSkills = j.required_skills?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCompany && !matchesEmail && !matchesLoc && !matchesSkills) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, selectedStatus, selectedArrangement, searchQuery]);

  const formatSalary = (min?: number, max?: number, hide?: boolean | number) => {
    if (Boolean(hide)) return "Confidential";
    if (!min && !max) return "Not specified";
    const fmt = (n?: number) => (n ? Number(n).toLocaleString() : "");
    if (min && max) return `PHP ${fmt(min)} - ${fmt(max)}`;
    if (min) return `From PHP ${fmt(min)}`;
    if (max) return `Up to PHP ${fmt(max)}`;
    return "Not specified";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="admin-layout admin-job-mgmt">
      <AdminSidebar activePath="/admin-jobs" adminName={adminUser?.email || "Administrator"} />

      <main className="admin-main">
        {/* Topbar */}
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <div>
              <strong>Job Posting Management</strong>
            </div>
          </div>
          <div className="appdash-top-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="admin-role-badge">ADMIN</span>
          </div>
        </header>

        {/* Content */}
        <section className="admin-content">
          {toastMessage && (
            <div className={`admin-toast-msg ${toastMessage.type}`}>
              {toastMessage.text}
            </div>
          )}

          {/* KPI Stats Grid */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Job Postings</span>
              <strong className="admin-stat-value">{isLoading ? "..." : totalCount}</strong>
              <span className="admin-stat-desc">Across all employers</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Active / Open</span>
              <strong className="admin-stat-value" style={{ color: "#16a34a" }}>
                {isLoading ? "..." : openCount}
              </strong>
              <span className="admin-stat-desc">Visible to candidates</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Suspended Posts</span>
              <strong className="admin-stat-value" style={{ color: "#dc2626" }}>
                {isLoading ? "..." : suspendedCount}
              </strong>
              <span className="admin-stat-desc">Hidden from search</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Closed Postings</span>
              <strong className="admin-stat-value" style={{ color: "#64748b" }}>
                {isLoading ? "..." : closedCount}
              </strong>
              <span className="admin-stat-desc">Expired or filled</span>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="admin-filter-bar">
            <div className="admin-search-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search job title, company, email, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="admin-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Suspended">Suspended</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              className="admin-filter-select"
              value={selectedArrangement}
              onChange={(e) => setSelectedArrangement(e.target.value)}
            >
              <option value="All">All Setups</option>
              <option value="On-Site">On-Site</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
              <option value="Flexible">Flexible</option>
            </select>
          </div>

          {/* Data Table */}
          <div className="admin-table-card">
            <div className="admin-table-header-row">
              <h3>Platform Job Postings</h3>
              <span className="admin-table-count">
                Showing {filteredJobs.length} of {totalCount} postings
              </span>
            </div>

            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="col-title">Job Title</th>
                    <th className="col-company">Company</th>
                    <th className="col-applicants">Applicants</th>
                    <th className="col-date">Posted Date</th>
                    <th className="col-status">Status</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="admin-empty-cell">
                        Loading job postings...
                      </td>
                    </tr>
                  ) : filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-empty-cell">
                        No job postings found matching your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => {
                      const isSuspended = job.status === "suspended";
                      const isOpen = job.status === "open";

                      return (
                        <tr key={job.id} className={isSuspended ? "row-suspended" : ""}>
                          {/* Job Title */}
                          <td className="col-title">
                            <div className="job-title-cell">
                              <span className="job-primary-title" title={job.title}>
                                {job.title}
                              </span>
                              {Boolean(job.is_urgent) && (
                                <span className="admin-chip-urgent" title="Marked as Urgent Hiring">
                                  Urgent
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Company */}
                          <td className="col-company">
                            <div className="company-info-cell">
                              <strong className="company-name-text">{job.company_name}</strong>
                              <span className="company-email-text">{job.employer_email}</span>
                            </div>
                          </td>

                          {/* Applicants */}
                          <td className="col-applicants">
                            <span className="applicant-count-pill">
                              {job.applicant_count || 0} applicant{job.applicant_count !== 1 ? "s" : ""}
                            </span>
                          </td>

                          {/* Date Posted */}
                          <td className="col-date">
                            <div className="date-cell">
                              <span>{formatDate(job.created_at)}</span>
                              {job.close_date && (
                                <small className="close-date-text">Closes: {job.close_date}</small>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="col-status">
                            <span
                              className={`admin-status-badge ${
                                isSuspended
                                  ? "badge-suspended"
                                  : isOpen
                                  ? "badge-active"
                                  : "badge-closed"
                              }`}
                            >
                              {isSuspended ? "Suspended" : isOpen ? "Open" : "Closed"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="col-actions">
                            <div className="admin-actions-cell">
                              <button
                                type="button"
                                className="admin-btn-inspect"
                                onClick={() => setViewingJob(job)}
                                title="View full job posting details"
                              >
                                View Details
                              </button>

                              {isSuspended ? (
                                <button
                                  type="button"
                                  className="admin-btn-activate"
                                  onClick={() => handleRequestStatusChange(job, "open")}
                                  disabled={isUpdating}
                                  title="Lift suspension and restore job posting"
                                >
                                  Lift Suspension
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-btn-suspend"
                                  onClick={() => handleRequestStatusChange(job, "suspended")}
                                  disabled={isUpdating}
                                  title="Suspend and disable this job posting"
                                >
                                  Suspend Job
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Confirmation Modal for Suspending / Lifting Suspension */}
      {statusJobTarget && (
        <ConfirmationModal
          isOpen={Boolean(statusJobTarget)}
          type={statusJobTarget.targetStatus === "suspended" ? "warning" : "info"}
          title={
            statusJobTarget.targetStatus === "suspended"
              ? "Suspend Job Posting"
              : "Lift Job Posting Suspension"
          }
          message={
            statusJobTarget.targetStatus === "suspended" ? (
              <div style={{ textAlign: "left" }}>
                <p style={{ margin: "0 0 10px 0" }}>
                  Are you sure you want to suspend <strong>"{statusJobTarget.job.title}"</strong> posted by{" "}
                  <strong>{statusJobTarget.job.company_name}</strong>?
                </p>
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderLeft: "4px solid #f59e0b",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    fontSize: "0.86rem",
                    color: "#92400e",
                  }}
                >
                  <strong>Platform Effects:</strong>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                    <li>The job will be immediately hidden from public job search.</li>
                    <li>The employer will see a notice stating the job was suspended and to email admin@elitecruit.com.</li>
                    <li>Applicants who already applied will see a suspension notice on their application.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "left" }}>
                <p style={{ margin: "0 0 10px 0" }}>
                  Are you sure you want to lift the suspension on{" "}
                  <strong>"{statusJobTarget.job.title}"</strong> posted by{" "}
                  <strong>{statusJobTarget.job.company_name}</strong>?
                </p>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
                  The job post will be restored to active status and will be visible in public search if within its close date.
                </p>
              </div>
            )
          }
          confirmLabel={
            statusJobTarget.targetStatus === "suspended" ? "Suspend Job" : "Lift Suspension"
          }
          cancelLabel="Cancel"
          isConfirming={isUpdating}
          onCancel={() => setStatusJobTarget(null)}
          onConfirm={doConfirmStatusChange}
        />
      )}

      {/* Standardized Job Details Modal */}
      {viewingJob && (
        <JobDetailsModal
          isOpen={Boolean(viewingJob)}
          isApplicantView={false}
          hideEmployerHeader={true}
          onClose={() => setViewingJob(null)}
          job={{
            id: viewingJob.id,
            title: viewingJob.title,
            company: viewingJob.company_name,
            employerUserId: viewingJob.employer_user_id,
            companyLogoPath: viewingJob.company_logo_path,
            companyCoverPath: viewingJob.company_cover_path,
            location: viewingJob.location || "Cavite",
            rating: viewingJob.rating,
            status: viewingJob.status,
            urgent: Boolean(viewingJob.is_urgent),
            setup: viewingJob.work_arrangement || "On-Site",
            work_arrangement: viewingJob.work_arrangement,
            salary_min: viewingJob.salary_min,
            salary_max: viewingJob.salary_max,
            experience_level: viewingJob.experience_level,
            summary: viewingJob.description,
            description: viewingJob.description,
            qualifications: viewingJob.qualifications,
            certifications: viewingJob.certifications,
            required_skills: viewingJob.required_skills,
            close_date: viewingJob.close_date,
            applicant_count: viewingJob.applicant_count,
          }}
        />
      )}
    </div>
  );
}
