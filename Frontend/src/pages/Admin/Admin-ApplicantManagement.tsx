import React, { useEffect, useState, useMemo } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import ConfirmationModal from "../../components/ConfirmationModal";
import "./Admin-ApplicantManagement.css";
import { authFetch, getStoredUser } from "../../utils/auth";

interface ApplicantItem {
  user_id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  address?: string;
  desired_job_title?: string;
  expected_salary?: string;
  work_arrangement?: string;
  years_of_experience?: string;
  skills?: string;
  certifications?: string;
  qualifications?: string;
  profile_picture_path?: string | null;
  total_applications: number;
  rating: string | null;
  total_reviews: number;
}

export default function AdminApplicantManagement() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [inspectingApplicant, setInspectingApplicant] = useState<ApplicantItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || stored.role !== "admin") {
      window.location.href = "/login";
      return;
    }
    setAdminUser(stored);

    loadApplicants();
  }, []);

  const loadApplicants = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch("/api/admin/applicants");
      if (res.ok) {
        const data = await res.json();
        setApplicants(data.applicants || []);
      }
    } catch {
      showToast("Unable to load applicants from server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // DOUBLE VERIFICATION MODAL STATES
  const [statusApplicantTarget, setStatusApplicantTarget] = useState<ApplicantItem | null>(null);
  const [resetApplicantTarget, setResetApplicantTarget] = useState<ApplicantItem | null>(null);

  const handleToggleStatus = (applicant: ApplicantItem) => {
    setStatusApplicantTarget(applicant);
  };

  const doConfirmToggleStatus = async () => {
    if (!statusApplicantTarget) return;
    const applicant = statusApplicantTarget;
    const nextStatus = !applicant.is_active;
    setStatusApplicantTarget(null);

    try {
      setIsUpdating(true);
      const res = await authFetch(`/api/admin/users/${applicant.user_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) =>
            a.user_id === applicant.user_id ? { ...a, is_active: nextStatus } : a
          )
        );
        if (inspectingApplicant?.user_id === applicant.user_id) {
          setInspectingApplicant({ ...inspectingApplicant, is_active: nextStatus });
        }
        showToast(`Account ${nextStatus ? "activated" : "suspended"} successfully.`, "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to update user status.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = (applicant: ApplicantItem) => {
    setResetApplicantTarget(applicant);
  };

  const doConfirmResetPassword = async () => {
    if (!resetApplicantTarget) return;
    const applicant = resetApplicantTarget;
    setResetApplicantTarget(null);

    try {
      setIsUpdating(true);
      const res = await authFetch(`/api/admin/users/${applicant.user_id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "EliteCruit2026!" }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Password for ${applicant.email} has been reset to: ${data.temporaryPassword}`);
        showToast("Password reset successfully.", "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to reset password.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Distinct cities for filter dropdown
  const cities = useMemo(() => {
    const set = new Set<string>();
    applicants.forEach((a) => {
      if (a.city && a.city.trim()) set.add(a.city.trim());
    });
    return Array.from(set).sort();
  }, [applicants]);

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    return applicants.filter((a) => {
      const fullName = `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase();
      const email = (a.email || "").toLowerCase();
      const title = (a.desired_job_title || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || fullName.includes(q) || email.includes(q) || title.includes(q);
      const matchesCity = selectedCity === "All" || (a.city && a.city.toLowerCase() === selectedCity.toLowerCase());
      const matchesStatus =
        selectedStatus === "All" ||
        (selectedStatus === "Active" && a.is_active) ||
        (selectedStatus === "Suspended" && !a.is_active);

      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [applicants, searchQuery, selectedCity, selectedStatus]);

  // Statistics
  const totalCount = applicants.length;
  const activeCount = applicants.filter((a) => a.is_active).length;
  const suspendedCount = applicants.filter((a) => !a.is_active).length;
  const avgRating = useMemo(() => {
    const withRatings = applicants.filter((a) => a.rating !== null && Number(a.rating) > 0);
    if (withRatings.length === 0) return "N/A";
    const sum = withRatings.reduce((acc, a) => acc + Number(a.rating), 0);
    return (sum / withRatings.length).toFixed(1);
  }, [applicants]);

  const adminName = adminUser?.displayName || adminUser?.display_name || "System Administrator";

  const parseTags = (raw?: string) => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  };

  return (
    <div className="admin-applicant-mgmt admin-layout">
      <AdminSidebar activePath="/admin-applicants" adminName={adminName} />

      <main className="admin-main">
        {/* Top Header - Matches Applicant & Employer Topbar */}
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <strong>Applicant Management</strong>
          </div>
          <div className="appdash-top-right">
            <a href="/admin-applicant-analytics" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#103f65", textDecoration: "none", backgroundColor: "#e2e8f0", padding: "0.3rem 0.75rem", borderRadius: "0.375rem" }}>
              View Applicant Analytics
            </a>
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

          {/* KPI Stats */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Applicants</span>
              <strong className="admin-stat-value">{isLoading ? "..." : totalCount}</strong>
              <span className="admin-stat-desc">Registered candidates</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Active Jobseekers</span>
              <strong className="admin-stat-value" style={{ color: "#16a34a" }}>
                {isLoading ? "..." : activeCount}
              </strong>
              <span className="admin-stat-desc">Ready to apply</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Suspended / Inactive</span>
              <strong className="admin-stat-value" style={{ color: "#dc2626" }}>
                {isLoading ? "..." : suspendedCount}
              </strong>
              <span className="admin-stat-desc">Login restricted</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Average Rating</span>
              <strong className="admin-stat-value" style={{ color: "#eab308" }}>
                {isLoading ? "..." : avgRating}
              </strong>
              <span className="admin-stat-desc">From employer evaluations</span>
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
                placeholder="Search applicant name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="admin-filter-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="All">All Cavite Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              className="admin-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Data Table */}
          <div className="admin-table-card">
            <div className="admin-table-header-row">
              <h3>Registered Candidates</h3>
              <span className="admin-table-count">
                Showing {filteredApplicants.length} of {totalCount} applicants
              </span>
            </div>

            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="col-candidate">Candidate</th>
                    <th className="col-role">Target Role</th>
                    <th className="col-location">Location</th>
                    <th className="col-rating">Rating</th>
                    <th className="col-status">Status</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                        Loading applicants from database...
                      </td>
                    </tr>
                  ) : filteredApplicants.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                        No applicants found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredApplicants.map((applicant) => {
                      const fullName = applicant.first_name
                        ? `${applicant.first_name} ${applicant.last_name || ""}`
                        : "Profile Pending";
                      const initials = applicant.first_name
                        ? applicant.first_name.charAt(0).toUpperCase()
                        : applicant.email.charAt(0).toUpperCase();
                      const picUrl = applicant.profile_picture_path
                        ? (applicant.profile_picture_path.startsWith("http") || applicant.profile_picture_path.startsWith("/api")
                            ? applicant.profile_picture_path
                            : `/api/applicants/${applicant.user_id}/profile-picture`)
                        : null;

                      return (
                        <tr key={applicant.user_id}>
                          <td className="col-candidate">
                            <div className="admin-user-cell">
                              <div className="admin-user-avatar" style={{ overflow: "hidden", position: "relative" }}>
                                {picUrl && (
                                  <img
                                    src={picUrl}
                                    alt={fullName}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                      if (e.currentTarget.nextElementSibling) {
                                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                                      }
                                    }}
                                  />
                                )}
                                <span style={{ display: picUrl ? "none" : "inline" }}>
                                  {initials}
                                </span>
                              </div>
                              <div className="admin-user-info">
                                <div className="admin-user-name">{fullName}</div>
                                <div className="admin-user-sub">{applicant.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="col-role">
                            <strong>{applicant.desired_job_title || "Not specified"}</strong>
                          </td>
                          <td className="col-location">
                            <span>{applicant.city || "Cavite"}</span>
                          </td>
                          <td className="col-rating">
                            <div
                              className="rating-score-box"
                              title={applicant.total_reviews ? `${applicant.total_reviews} reviews` : "No reviews yet"}
                            >
                              <span className="star-icon">★</span>
                              <span>{applicant.rating ? Number(applicant.rating).toFixed(1) : "0.0"}</span>
                            </div>
                          </td>
                          <td className="col-status">
                            <span className={`admin-status-badge ${applicant.is_active ? "active" : "suspended"}`}>
                              {applicant.is_active ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td className="col-actions">
                            <div className="admin-actions-cell">
                              <button
                                type="button"
                                className="admin-btn admin-btn-view"
                                onClick={() => setInspectingApplicant(applicant)}
                              >
                                View
                              </button>
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

      {/* Applicant Inspection Drawer */}
      {inspectingApplicant && (
        <div className="admin-drawer-overlay" onClick={() => setInspectingApplicant(null)}>
          <div className="admin-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-head">
              <h2>Candidate Details</h2>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={() => setInspectingApplicant(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-drawer-body">
              {/* Profile Card */}
              {(() => {
                const modalPicUrl = inspectingApplicant.profile_picture_path
                  ? (inspectingApplicant.profile_picture_path.startsWith("http") || inspectingApplicant.profile_picture_path.startsWith("/api")
                      ? inspectingApplicant.profile_picture_path
                      : `/api/applicants/${inspectingApplicant.user_id}/profile-picture`)
                  : null;
                const modalInitials = inspectingApplicant.first_name
                  ? inspectingApplicant.first_name.charAt(0).toUpperCase()
                  : inspectingApplicant.email.charAt(0).toUpperCase();
                return (
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div className="admin-user-avatar" style={{ width: "52px", height: "52px", fontSize: "1.2rem", overflow: "hidden", position: "relative" }}>
                      {modalPicUrl && (
                        <img
                          src={modalPicUrl}
                          alt={inspectingApplicant.first_name || "Applicant"}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                            }
                          }}
                        />
                      )}
                      <span style={{ display: modalPicUrl ? "none" : "inline" }}>
                        {modalInitials}
                      </span>
                    </div>
                    <div>
                      <h3 style={{ margin: "0", color: "#01294a", fontSize: "1.15rem" }}>
                        {inspectingApplicant.first_name
                          ? `${inspectingApplicant.first_name} ${inspectingApplicant.last_name || ""}`
                          : "Candidate Profile"}
                      </h3>
                      <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                        {inspectingApplicant.email}
                      </p>
                      <div style={{ marginTop: "6px" }}>
                        <span className={`admin-status-badge ${inspectingApplicant.is_active ? "active" : "suspended"}`}>
                          {inspectingApplicant.is_active ? "Account Active" : "Account Suspended"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Contact & Location */}
              <div className="admin-drawer-section">
                <h4>Contact & Location</h4>
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", fontSize: "0.85rem", display: "grid", gap: "6px" }}>
                  <div><strong>Phone:</strong> {inspectingApplicant.phone || "Not provided"}</div>
                  <div><strong>City:</strong> {inspectingApplicant.city || "Not provided"}</div>
                  <div><strong>Address:</strong> {inspectingApplicant.address || "Not provided"}</div>
                  <div><strong>Expected Salary:</strong> {inspectingApplicant.expected_salary || "Not specified"}</div>
                  <div><strong>Experience Level:</strong> {inspectingApplicant.years_of_experience || "Not specified"}</div>
                </div>
              </div>

              {/* Skills */}
              <div className="admin-drawer-section">
                <h4>Skills & Competencies</h4>
                <div className="admin-tags-wrap">
                  {parseTags(inspectingApplicant.skills).length > 0 ? (
                    parseTags(inspectingApplicant.skills).map((skill, i) => (
                      <span key={i} className="admin-tag-chip">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No skills listed.</span>
                  )}
                </div>
              </div>

              {/* Qualifications */}
              <div className="admin-drawer-section">
                <h4>Qualifications</h4>
                <div className="admin-tags-wrap">
                  {parseTags(inspectingApplicant.qualifications).length > 0 ? (
                    parseTags(inspectingApplicant.qualifications).map((q, i) => (
                      <span key={i} className="admin-tag-chip">
                        {q}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No qualifications listed.</span>
                  )}
                </div>
              </div>

              {/* Certifications */}
              <div className="admin-drawer-section">
                <h4>Certifications</h4>
                <div className="admin-tags-wrap">
                  {parseTags(inspectingApplicant.certifications).length > 0 ? (
                    parseTags(inspectingApplicant.certifications).map((c, i) => (
                      <span key={i} className="admin-tag-chip">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No certifications listed.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Static Bottom Actions */}
            <div className="admin-drawer-footer">
              <button
                type="button"
                className={`admin-btn ${inspectingApplicant.is_active ? "admin-btn-suspend" : "admin-btn-activate"}`}
                style={{ flex: 1, padding: "11px" }}
                disabled={isUpdating}
                onClick={() => handleToggleStatus(inspectingApplicant)}
              >
                {inspectingApplicant.is_active ? "Suspend Account" : "Activate Account"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-reset"
                style={{ flex: 1, padding: "11px" }}
                disabled={isUpdating}
                onClick={() => handleResetPassword(inspectingApplicant)}
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE VERIFICATION: STATUS TOGGLE MODAL */}
      <ConfirmationModal
        isOpen={!!statusApplicantTarget}
        type={statusApplicantTarget?.is_active ? "danger" : "success"}
        title={statusApplicantTarget?.is_active ? "Suspend Applicant Account" : "Activate Applicant Account"}
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to{" "}
              <strong>{statusApplicantTarget?.is_active ? "suspend" : "activate"}</strong> the account for{" "}
              <strong>{statusApplicantTarget?.email}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              {statusApplicantTarget?.is_active
                ? "This applicant will be immediately barred from logging in or applying for jobs."
                : "This applicant will regain full access to their account and job applications."}
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel={statusApplicantTarget?.is_active ? "Suspend Account" : "Activate Account"}
        isConfirming={isUpdating}
        onCancel={() => setStatusApplicantTarget(null)}
        onConfirm={doConfirmToggleStatus}
      />

      {/* DOUBLE VERIFICATION: RESET PASSWORD MODAL */}
      <ConfirmationModal
        isOpen={!!resetApplicantTarget}
        type="warning"
        title="Reset Applicant Password"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to reset the password for <strong>{resetApplicantTarget?.email}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              A new temporary password will be generated and assigned to this account.
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Reset Password"
        isConfirming={isUpdating}
        onCancel={() => setResetApplicantTarget(null)}
        onConfirm={doConfirmResetPassword}
      />
    </div>
  );
}
